import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// /api/scrape-product
// Reçoit { url } → fetch HTML → Claude Haiku extrait nom/ref/prix/etc → renvoie
// un Partial<StandardPart> que le client préremplit dans le PartForm.
// =============================================================================

interface ScrapeRequestBody {
  url: string;
}

interface ScrapedPart {
  name?: string;
  category?:
    | 'shelf' | 'side_panel' | 'door' | 'drawer_front' | 'back_panel'
    | 'top_bottom' | 'divider' | 'custom'
    | 'hinge' | 'slide' | 'screw' | 'dowel' | 'handle' | 'bracket' | 'edge_band' | 'foot';
  length_mm?: number;
  width_mm?: number;
  thickness_mm?: number;
  merchant?: string;
  merchant_ref?: string;
  url?: string;
  price_eur?: number;
  currency?: string;
  pack_qty?: number;
  image_url?: string;
  notes?: string;
  last_checked_at?: string;
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_500_000; // 1.5 Mo
const MAX_HTML_FOR_CLAUDE = 180_000; // ~45K tokens — Haiku gère sans problème
const ANTHROPIC_MODEL = process.env.SCRAPE_MODEL ?? 'claude-haiku-4-5';

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
  if (allowed.length === 0) return '*';
  if (!requestOrigin) return allowed[0];
  if (allowed.includes(requestOrigin)) return requestOrigin;
  if (requestOrigin.endsWith('.vercel.app')) return requestOrigin;
  return null;
}

function setCors(req: VercelRequest, res: VercelResponse): boolean {
  const requestOrigin = (req.headers.origin as string | undefined) ?? undefined;
  const allowOrigin = resolveAllowedOrigin(requestOrigin);
  if (allowOrigin === null) return false;
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return true;
}

function isHttpsUrl(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  try {
    const u = new URL(input);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Réduit du HTML brut en gardant le JSON-LD et les zones fiches produit (head + main). */
function trimHtmlForClaude(html: string): string {
  if (html.length <= MAX_HTML_FOR_CLAUDE) return html;
  // Stratégie naïve : garder le head (souvent JSON-LD product) + premier 100K chars du body
  const headMatch = html.match(/<head[^>]*>[\s\S]*?<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const head = headMatch?.[0] ?? '';
  const bodyContent = bodyMatch?.[1] ?? html;
  const remaining = MAX_HTML_FOR_CLAUDE - head.length;
  const body = bodyContent.slice(0, Math.max(0, remaining));
  return head + '\n<body>\n' + body + '\n</body>';
}

const EXTRACTION_PROMPT = `Tu extrais les informations d'une fiche produit (quincaillerie, panneau bois, tablette, etc.) destinée à un menuisier.

Renvoie UNIQUEMENT un objet JSON conforme à ce schéma (pas de texte autour, pas de markdown) :

{
  "name": string,                    // nom court du produit (max ~80 chars)
  "category": "shelf"|"side_panel"|"door"|"drawer_front"|"back_panel"|"top_bottom"|"divider"|"custom"|"hinge"|"slide"|"screw"|"dowel"|"handle"|"bracket"|"edge_band"|"foot",
  "length_mm": number | null,        // dimensions en mm (longueur la plus grande)
  "width_mm": number | null,         // largeur (deuxième dimension)
  "thickness_mm": number | null,     // épaisseur en mm (panneaux) ou diamètre (vis/tourillons)
  "merchant": string,                // nom enseigne (ex: "Leroy Merlin", "Castorama", "Manomano")
  "merchant_ref": string | null,     // référence article / SKU / EAN
  "price_eur": number | null,        // prix unitaire en euros (point décimal)
  "currency": "EUR",
  "pack_qty": number | null,         // quantité par lot (boîte de 100 vis = 100). null si vendu à l'unité
  "image_url": string | null,        // URL absolue de l'image principale (https://...)
  "notes": string | null             // 1 phrase max si infos pertinentes (ex: "Ouverture 110°", "Charge max 25kg")
}

Règles :
- Convertis toutes les dimensions en MILLIMÈTRES (1 cm = 10 mm, 1 m = 1000 mm).
- Si le prix est affiché barré + promo, prends le prix promo.
- Si plusieurs déclinaisons (couleurs, tailles), prends celle qui semble par défaut sur la page.
- Pour la catégorie : choisis la plus précise. Une "tablette mélaminé" → "shelf". Une "charnière invisible" → "hinge". Une "glissière tiroir" → "slide". Une "poignée de meuble" → "handle". Une "vis" → "screw". Un "tourillon" → "dowel". Un "pied de meuble" → "foot". Un "chant" / "chant mélaminé" → "edge_band". Si aucune ne convient et c'est un panneau découpable → "custom".
- Champs inconnus : null (sauf merchant et currency qui doivent toujours être remplis).
- Pas de commentaire, pas de \`\`\`json, juste l'objet.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const corsOk = setCors(req, res);
  if (!corsOk) return res.status(403).json({ error: 'Origine non autorisée' });

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY non configurée');
    return res.status(500).json({ error: 'Scraper non configuré côté serveur (ANTHROPIC_API_KEY manquante).' });
  }

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Corps de requête invalide' });
  }

  const { url } = req.body as ScrapeRequestBody;
  if (!isHttpsUrl(url)) {
    return res.status(400).json({ error: 'URL invalide (http/https requis).' });
  }

  // ------- 1. Fetch the product page -------
  const fetchController = new AbortController();
  const fetchTimeout = setTimeout(() => fetchController.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const pageRes = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: fetchController.signal,
    });

    if (!pageRes.ok) {
      return res.status(502).json({ error: `Le marchand a renvoyé ${pageRes.status}. Le site bloque peut-être les bots — saisie manuelle recommandée.` });
    }

    const reader = pageRes.body?.getReader();
    if (!reader) {
      return res.status(502).json({ error: 'Réponse marchand vide.' });
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.length;
      if (total > MAX_HTML_BYTES) {
        try { await reader.cancel(); } catch { /* ignore */ }
        break;
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    html = new TextDecoder('utf-8', { fatal: false }).decode(merged);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout du marchand après 12s.' });
    }
    const msg = err instanceof Error ? err.message : 'fetch failed';
    return res.status(502).json({ error: `Impossible de récupérer la page : ${msg}` });
  } finally {
    clearTimeout(fetchTimeout);
  }

  if (!html || html.length < 200) {
    return res.status(502).json({ error: 'Page vide ou trop courte — saisie manuelle recommandée.' });
  }

  const trimmed = trimHtmlForClaude(html);

  // ------- 2. Claude extracts structured data -------
  const claudeController = new AbortController();
  const claudeTimeout = setTimeout(() => claudeController.abort(), 30_000);
  let extracted: ScrapedPart;
  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `URL : ${url}\n\nHTML :\n${trimmed}`,
          },
        ],
      }),
      signal: claudeController.signal,
    });

    if (!claudeRes.ok) {
      const errData = await claudeRes.json().catch(() => ({}));
      console.error('Erreur Anthropic scrape:', claudeRes.status, errData);
      if (claudeRes.status === 429) {
        return res.status(429).json({ error: 'Limite API atteinte. Réessayez dans quelques instants.' });
      }
      return res.status(502).json({ error: `Erreur extraction (${claudeRes.status}).` });
    }

    const data = await claudeRes.json();
    const content = data.content;
    if (!Array.isArray(content) || content.length === 0) {
      return res.status(502).json({ error: 'Réponse Claude vide.' });
    }
    const text = content.map((c: { text?: string }) => c.text || '').join('').trim();

    // Tolérance : on retire un éventuel ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      extracted = JSON.parse(cleaned) as ScrapedPart;
    } catch {
      console.error('Parsing JSON Claude échoué:', cleaned.slice(0, 300));
      return res.status(502).json({ error: 'Format de réponse inattendu — saisie manuelle recommandée.' });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout extraction Claude après 30s.' });
    }
    const msg = err instanceof Error ? err.message : 'erreur inconnue';
    console.error('Scrape error:', msg);
    return res.status(500).json({ error: `Erreur extraction : ${msg}` });
  } finally {
    clearTimeout(claudeTimeout);
  }

  // ------- 3. Normalize + return -------
  const result: ScrapedPart = {
    ...extracted,
    url,
    currency: extracted.currency ?? 'EUR',
    last_checked_at: new Date().toISOString(),
  };

  // Nettoyage : null → undefined
  for (const k of Object.keys(result) as (keyof ScrapedPart)[]) {
    if (result[k] === null) {
      delete result[k];
    }
  }

  return res.status(200).json({ part: result });
}
