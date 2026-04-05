import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatRequestBody {
  messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>;
  system: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY non configurée');
    return res.status(500).json({ error: 'Assistant IA non configuré. Ajoutez ANTHROPIC_API_KEY dans les variables d\'environnement.' });
  }

  try {
    const { messages, system } = req.body as ChatRequestBody;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages requis' });
    }

    if (!system || typeof system !== 'string') {
      return res.status(400).json({ error: 'Contexte système requis' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;

      if (status === 401) {
        return res.status(500).json({ error: 'Clé API invalide. Vérifiez ANTHROPIC_API_KEY.' });
      }
      if (status === 429) {
        return res.status(429).json({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' });
      }
      if (status === 413) {
        return res.status(413).json({ error: 'Message trop volumineux. Réduisez la taille des PDF ou du contexte.' });
      }

      console.error('Erreur Anthropic:', status, errorData);
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
