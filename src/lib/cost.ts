import type { AppState, NestingResult, PanelDef } from '../types';
import { MATERIALS } from '../data/materials';

export interface CostEstimate {
  panelPrice: number;      // prix unitaire (panneau principal)
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

// ---------------------------------------------------------------------------
// Multi-panel cost estimation
// ---------------------------------------------------------------------------

export interface MultiPanelCostEstimate {
  /** Per-panel breakdown */
  panels: { panelDef: PanelDef; count: number; subtotal: number; wastePercent: number }[];
  /** Total cost across all panel types */
  totalCost: number;
  /** Total number of panels */
  totalPanelCount: number;
  /** Weighted average efficiency (0–100) */
  avgEfficiency: number;
  /** true if at least one panel has a price configured */
  configured: boolean;
}

export function estimateMultiPanelCost(
  nestingByPanel: { panelDef: PanelDef; nesting: NestingResult }[],
): MultiPanelCostEstimate {
  const panels = nestingByPanel.map((g) => {
    const count = g.nesting.metrics.panelCount;
    return {
      panelDef: g.panelDef,
      count,
      subtotal: g.panelDef.price * count,
      wastePercent: 100 - g.nesting.metrics.efficiency,
    };
  });

  const totalCost = panels.reduce((s, p) => s + p.subtotal, 0);
  const totalPanelCount = panels.reduce((s, p) => s + p.count, 0);
  const totalArea = nestingByPanel.reduce((s, g) => s + g.nesting.metrics.totalArea, 0);
  const usedArea = nestingByPanel.reduce((s, g) => s + g.nesting.metrics.usedArea, 0);
  const avgEfficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
  const configured = panels.some((p) => p.panelDef.price > 0);

  return { panels, totalCost, totalPanelCount, avgEfficiency, configured };
}

// Retourne le prix par défaut du panneau correspondant au matériau et format actuels
export function getDefaultPanelPrice(state: AppState): number {
  const mat = MATERIALS[state.materialKey];
  const panel = mat.panels.find(p => p.w === state.panel.width && p.h === state.panel.height);
  return panel?.defaultPrice ?? 0;
}
