import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  role: string;
  content: string | Array<Record<string, unknown>>;
}

interface ChatRequestBody {
  messages: Array<ChatMessage>;
  system: string;
}

const MAX_MESSAGES = 50;
const MAX_SYSTEM_LENGTH = 20_000;
const MAX_BODY_SIZE = 512_000; // ~500KB
const MAX_CONTENT_ITEMS = 10;
const FETCH_TIMEOUT_MS = 60_000;
const VALID_ROLES = new Set(['user', 'assistant']);
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';

/**
 * Allowed origins for CORS. Configured via ALLOWED_ORIGINS env var
 * (comma-separated list). When unset, falls back to the Vercel-provided
 * deployment URL, then to '*' as a last resort for local dev.
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw && raw.trim().length > 0) {
    return raw.split(',').map((o) => o.trim()).filter(Boolean);
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return [`https://${vercelUrl}`];
  return [];
}

function resolveAllowedOrigin(requestOrigin: string | undefined): string | null {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return '*'; // dev fallback
  if (!requestOrigin) return allowed[0];
  if (allowed.includes(requestOrigin)) return requestOrigin;
  // Accept any Vercel preview/production URL for this project
  if (requestOrigin.endsWith('.vercel.app')) return requestOrigin;
  return null;
}

function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const requestOrigin = (req.headers.origin as string | undefined) ?? undefined;
  const allowOrigin = resolveAllowedOrigin(requestOrigin);
  if (allowOrigin === null) {
    return false;
  }
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return true;
}

function validateMessages(messages: unknown): messages is Array<ChatMessage> {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  if (messages.length > MAX_MESSAGES) return false;

  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) return false;
    const { role, content } = msg as Record<string, unknown>;

    if (typeof role !== 'string' || !VALID_ROLES.has(role)) return false;

    if (typeof content === 'string') {
      if (content.length === 0) return false;
    } else if (Array.isArray(content)) {
      if (content.length === 0 || content.length > MAX_CONTENT_ITEMS) return false;
    } else {
      return false;
    }
  }

  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCors(req, res);
  if (!corsOk) {
    return res.status(403).json({ error: 'Origine non autorisée' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY non configurée');
    return res.status(500).json({ error: 'Assistant IA non configuré. Ajoutez ANTHROPIC_API_KEY dans les variables d\'environnement.' });
  }

  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Corps de requête invalide' });
    }

    // Body size check
    const bodySize = JSON.stringify(req.body).length;
    if (bodySize > MAX_BODY_SIZE) {
      return res.status(413).json({ error: 'Requête trop volumineuse. Réduisez la taille des messages ou du contexte.' });
    }

    const { messages, system } = req.body as ChatRequestBody;

    if (!validateMessages(messages)) {
      return res.status(400).json({ error: 'Messages invalides : vérifiez le format, les rôles (user/assistant) et la limite de 50 messages.' });
    }

    if (!system || typeof system !== 'string') {
      return res.status(400).json({ error: 'Contexte système requis' });
    }

    if (system.length > MAX_SYSTEM_LENGTH) {
      return res.status(400).json({ error: `Contexte système trop long (max ${MAX_SYSTEM_LENGTH} caractères).` });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 4096,
          system,
          messages,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;

      console.error('Erreur Anthropic:', status, errorData, {
        messageCount: messages.length,
        systemLength: system.length,
      });

      if (status === 401) {
        return res.status(500).json({ error: 'Clé API invalide. Vérifiez ANTHROPIC_API_KEY.' });
      }
      if (status === 429) {
        return res.status(429).json({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' });
      }
      if (status === 413) {
        return res.status(413).json({ error: 'Message trop volumineux. Réduisez la taille des PDF ou du contexte.' });
      }

      return res.status(502).json({ error: `Erreur du service IA (${status}). Réessayez.` });
    }

    const data = await response.json();
    const content = data.content;

    if (!content || !Array.isArray(content) || content.length === 0) {
      return res.status(502).json({ error: 'Réponse vide du modèle. Réessayez.' });
    }

    const reply = content
      .map((c: { text?: string }) => c.text || '')
      .filter(Boolean)
      .join('\n');

    return res.status(200).json({ reply });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Timeout Anthropic API après 60s');
      return res.status(504).json({ error: 'Le service IA n\'a pas répondu à temps. Réessayez.' });
    }

    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: 'Corps de requête invalide' });
    }

    const message = error instanceof Error ? error.message : 'Erreur inconnue';

    if (message.includes('fetch') || message.includes('network') || message.includes('ECONNREFUSED')) {
      return res.status(503).json({ error: 'Service IA temporairement indisponible. Réessayez.' });
    }

    console.error('Erreur serveur chat:', message);
    return res.status(500).json({ error: 'Erreur serveur interne. Réessayez.' });
  }
}
