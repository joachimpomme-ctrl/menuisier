/**
 * Procurement — contrat métier consommé par l'UI.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ ⚠ Source UNIQUE de vérité pour la question « cette pièce est-elle   │
 * │   achetée, retouchée, ou débitée ? ».                              │
 * │                                                                    │
 * │ Aucun composant d'UI ne doit recalculer le statut procurement à    │
 * │ partir d'une `GeneratedPart`. Il lit exclusivement la              │
 * │ `ProcurementDecision` produite ici.                                │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Ce module définit :
 *
 *   1. Le **contrat** (`ProcurementDecision`, `ProcurementView`) — stable,
 *      consommé par le Dashboard, les tests, le PDF et plus tard l'API.
 *
 *   2. Le **point d'extension** `resolveProcurement(parts)` — signature
 *      figée. Aujourd'hui branché sur l'heuristique `decideForPart` ;
 *      demain, il sera remplacé en interne par un moteur dédié (croisement
 *      pièces × catalogue × compat matière × fournisseurs) SANS toucher
 *      l'UI ni les appelants.
 *
 *   3. Des **adaptateurs `@deprecated`** (`classifyProcurement`,
 *      `summarizeProcurement`) pour les rares callers legacy, marqués
 *      pour suppression une fois la migration terminée.
 */

import type { GeneratedPart } from '../knowledge/types';

// ---------------------------------------------------------------------------
// Vocabulaire métier — canonique
// ---------------------------------------------------------------------------

/**
 * Statuts procurement ; source de vérité du vocabulaire.
 *
 * Les mappings UI (couleur, label) vivent dans `ui-system/tokens.ts` et
 * importent ce type pour éviter toute divergence.
 */
export type ProcurementStatus = 'buy_exact' | 'buy_and_rework' | 'cut_from_sheet';

/**
 * Opérations atelier nécessaires après la procurement initiale.
 *
 * Intentionnellement ouvert à l'ajout (`'trim_to_size'`, `'surface_finish'`,
 * `'cutout'`...) : le futur resolver enrichira sans casser l'UI.
 */
export type ReworkOpKind =
  | 'drilling'
  | 'edge_banding';

/**
 * Décision procurement normalisée pour UNE pièce.
 *
 * C'est le seul objet consommé par l'UI. Toute information à afficher
 * (badge, tooltip, inspecteur) doit pouvoir être dérivée de ce contrat.
 */
export interface ProcurementDecision {
  /** id de la pièce — clé de jointure avec `result.parts[*].id`. */
  part_id: string;

  /** Statut consolidé, direct sur le badge. */
  status: ProcurementStatus;

  /**
   * Référence commerciale liée (si la pièce est — même partiellement —
   * issue d'un produit catalogue). Indéfini pour `cut_from_sheet`.
   */
  standard_part_id?: string;

  /**
   * Opérations atelier requises. Non vide pour `buy_and_rework` et
   * `cut_from_sheet`. Vide pour `buy_exact`.
   */
  rework_ops: ReworkOpKind[];

  /**
   * Justification courte lisible par l'utilisateur. Utilisée comme
   * `title` du badge et affichée dans l'inspecteur.
   */
  reason: string;

  /**
   * Provenance de la décision :
   *   - `'heuristic'` : règle simple sur `standard_part_id` + opérations.
   *     L'UI peut signaler "décision provisoire" si besoin.
   *   - `'resolver'`  : issue du futur moteur dédié (croisement catalogue).
   *
   * Ce champ existe pour que l'UI soit prête à afficher une hiérarchie
   * de confiance sans refonte ultérieure.
   */
  source: 'heuristic' | 'resolver';
}

// ---------------------------------------------------------------------------
// View agrégée — format consommé par le Dashboard
// ---------------------------------------------------------------------------

export interface ProcurementSummary {
  buy_exact: number;
  buy_and_rework: number;
  cut_from_sheet: number;
  total: number;
}

/**
 * `ProcurementView` — snapshot attaché à `PipelineResult`.
 *
 * Ce qui est garanti :
 *   - `decisions` et `byPartId` recouvrent exactement `parts` (bijection par id)
 *   - `summary` est agrégé en tenant compte des quantités (`part.qty`)
 *
 * Conséquence : tableau, inspecteur et barre-résumé lisent TOUS le même
 * objet — impossibilité de divergence d'affichage.
 */
export interface ProcurementView {
  /** Liste alignée sur `parts` (même ordre, même cardinalité). */
  decisions: ProcurementDecision[];
  /** Index par `part.id` — accès O(1) depuis l'UI. */
  byPartId: Record<string, ProcurementDecision>;
  /** Compteurs pondérés par `part.qty`. */
  summary: ProcurementSummary;
}

// ---------------------------------------------------------------------------
// Point d'extension — resolveProcurement
// ---------------------------------------------------------------------------

/**
 * Résout la procurement pour un jeu de pièces.
 *
 * **Signature stable.** Le futur moteur dédié (resolver) remplacera
 * l'implémentation de cette fonction sans que les appelants ni l'UI ne
 * bougent. Pour cette raison, ne pas exposer le résultat partiel ni
 * ajouter de paramètre non-optionnel sans revoir l'architecture.
 *
 * Implémentation courante : délègue à `decideForPart` (heuristique),
 * source `'heuristic'`. Le jour où un resolver est branché, cette
 * fonction pourra :
 *   - commencer par appeler `resolver(parts, catalog, context)`
 *   - fallback sur `decideForPart` pour les pièces non couvertes
 *   - marquer la source correspondante sur chaque décision.
 */
export function resolveProcurement(parts: GeneratedPart[]): ProcurementView {
  const decisions: ProcurementDecision[] = parts.map(decideForPart);

  const byPartId: Record<string, ProcurementDecision> = {};
  for (const d of decisions) byPartId[d.part_id] = d;

  const summary: ProcurementSummary = {
    buy_exact: 0,
    buy_and_rework: 0,
    cut_from_sheet: 0,
    total: 0,
  };
  for (let i = 0; i < parts.length; i++) {
    const qty = parts[i].qty;
    summary[decisions[i].status] += qty;
    summary.total += qty;
  }

  return { decisions, byPartId, summary };
}

/**
 * Vue procurement vide — utilisée dans les branches "pipeline avorté"
 * (intent invalide). Garantit que `result.procurement` n'est JAMAIS
 * `undefined`, ce qui simplifie l'UI (pas de null-check au render).
 */
export function emptyProcurementView(): ProcurementView {
  return {
    decisions: [],
    byPartId: {},
    summary: { buy_exact: 0, buy_and_rework: 0, cut_from_sheet: 0, total: 0 },
  };
}

// ---------------------------------------------------------------------------
// Heuristique par défaut — exposée pour tests et fallback interne
// ---------------------------------------------------------------------------

/**
 * Décision heuristique pour une pièce isolée.
 *
 * Règle actuelle, volontairement conservative :
 *   - pas de `standard_part_id`                    → `cut_from_sheet`
 *   - `standard_part_id` + drilling OU chant       → `buy_and_rework`
 *   - `standard_part_id` seul                      → `buy_exact`
 *
 * Exposé pour :
 *   - être testé unitairement
 *   - servir de fallback dans `resolveProcurement` tant que le resolver
 *     métier n'est pas branché.
 */
export function decideForPart(part: GeneratedPart): ProcurementDecision {
  const hasDrilling = (part.drilling?.length ?? 0) > 0;
  const hasEdgeBanding = (part.edge_banding?.length ?? 0) > 0;
  const reworkOps: ReworkOpKind[] = [];
  if (hasDrilling) reworkOps.push('drilling');
  if (hasEdgeBanding) reworkOps.push('edge_banding');

  if (!part.standard_part_id) {
    return {
      part_id: part.id,
      status: 'cut_from_sheet',
      rework_ops: reworkOps,
      reason: 'Pièce sur mesure : à débiter dans un panneau.',
      source: 'heuristic',
    };
  }

  if (reworkOps.length > 0) {
    return {
      part_id: part.id,
      status: 'buy_and_rework',
      standard_part_id: part.standard_part_id,
      rework_ops: reworkOps,
      reason: reasonForRework(reworkOps, part.standard_part_id),
      source: 'heuristic',
    };
  }

  return {
    part_id: part.id,
    status: 'buy_exact',
    standard_part_id: part.standard_part_id,
    rework_ops: [],
    reason: `Produit catalogue « ${part.standard_part_id} » utilisable tel quel.`,
    source: 'heuristic',
  };
}

function reasonForRework(ops: ReworkOpKind[], ref: string): string {
  const labels = ops
    .map((op) => (op === 'drilling' ? 'perçage' : 'plaquage de chant'))
    .join(' + ');
  return `Acheter « ${ref} » puis ${labels} en atelier.`;
}

// ---------------------------------------------------------------------------
// Adaptateurs @deprecated — pour callers legacy, à supprimer
// ---------------------------------------------------------------------------

/**
 * @deprecated Utiliser `resolveProcurement(parts).byPartId[id].status`
 *             ou `decideForPart(part).status`. Ne RIEN ajouter qui dépend
 *             de cette fonction côté UI — elle disparaîtra avec le
 *             branchement du resolver métier.
 */
export function classifyProcurement(part: GeneratedPart): ProcurementStatus {
  return decideForPart(part).status;
}

/**
 * @deprecated Utiliser `resolveProcurement(parts).summary`. Conservé pour
 *             les tests de régression et le PDF tant que ceux-ci n'ont pas
 *             migré.
 */
export function summarizeProcurement(parts: GeneratedPart[]): ProcurementSummary {
  return resolveProcurement(parts).summary;
}
