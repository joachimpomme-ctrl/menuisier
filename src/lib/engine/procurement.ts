/**
 * Procurement classification — décide, pour chaque pièce générée, si elle doit
 * être achetée telle quelle, achetée et retouchée, ou découpée dans un panneau.
 *
 * Règles actuelles :
 * - pièce avec `standard_part_id` sans perçage ni chants ajoutés  → buy_exact
 * - pièce avec `standard_part_id` + perçage/chants spécifiques    → buy_and_rework
 * - toute autre pièce                                             → cut_from_sheet
 *
 * Cette heuristique reste volontairement conservative : elle ne classe une
 * pièce en achat que si un lien explicite vers une référence standard existe.
 */

import type { GeneratedPart } from '../knowledge/types';

export type ProcurementStatus = 'buy_exact' | 'buy_and_rework' | 'cut_from_sheet';

export function classifyProcurement(part: GeneratedPart): ProcurementStatus {
  if (!part.standard_part_id) {
    return 'cut_from_sheet';
  }
  const hasDrilling = (part.drilling?.length ?? 0) > 0;
  const hasEdgeBanding = (part.edge_banding?.length ?? 0) > 0;
  if (hasDrilling || hasEdgeBanding) {
    return 'buy_and_rework';
  }
  return 'buy_exact';
}

export interface ProcurementSummary {
  buy_exact: number;
  buy_and_rework: number;
  cut_from_sheet: number;
  total: number;
}

export function summarizeProcurement(parts: GeneratedPart[]): ProcurementSummary {
  const s: ProcurementSummary = { buy_exact: 0, buy_and_rework: 0, cut_from_sheet: 0, total: 0 };
  for (const p of parts) {
    s[classifyProcurement(p)] += p.qty;
    s.total += p.qty;
  }
  return s;
}
