import type { AppState, NestingResult } from '../types';
import { MATERIALS } from '../data/materials';

export interface CostEstimate {
  panelPrice: number;      // prix unitaire
  panelCount: number;
  totalMaterial: number;    // panelPrice × panelCount
  wastePercent: number;     // % de chute
  wasteCost: number;        // part du coût perdue en chutes
  configured: boolean;      // true si prix renseigné
}

export function estimateCost(state: AppState, nesting: NestingResult): CostEstimate {
  const price = state.costConfig.panelPrice;
  const count = nesting.metrics.panelCount;
  const eff = nesting.metrics.efficiency;
  const wastePercent = 100 - eff;

  return {
    panelPrice: price,
    panelCount: count,
    totalMaterial: price * count,
    wastePercent,
    wasteCost: price * count * (wastePercent / 100),
    configured: price > 0,
  };
}

// Retourne le prix par défaut du panneau correspondant au matériau et format actuels
export function getDefaultPanelPrice(state: AppState): number {
  const mat = MATERIALS[state.materialKey];
  const panel = mat.panels.find(p => p.w === state.panel.width && p.h === state.panel.height);
  return panel?.defaultPrice ?? 0;
}
