import type { StandardPart } from './knowledge/types';

/**
 * Appelle /api/scrape-product avec une URL fiche produit, renvoie un Partial<StandardPart>
 * que l'UI peut préremplir dans le PartForm. Lance une erreur métier (string) en cas d'échec.
 */
export async function scrapeProductFromUrl(url: string): Promise<Partial<StandardPart>> {
  const res = await fetch('/api/scrape-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`Réponse serveur invalide (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const msg = (payload as { error?: string } | undefined)?.error;
    throw new Error(msg ?? `Erreur ${res.status} pendant le scrape.`);
  }

  const part = (payload as { part?: Partial<StandardPart> }).part;
  if (!part || typeof part !== 'object') {
    throw new Error('Réponse vide du scraper.');
  }
  return part;
}
