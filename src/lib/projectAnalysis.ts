import type { AppState, PanelDef, PieceWithBody, NestingResult } from '../types';
import { MATERIALS } from '../data/materials';
import { optimizeNesting } from './nesting';

export interface PanelUsage {
  panelDef: PanelDef;
  pieces: PieceWithBody[];
  nesting: NestingResult;
  panelCount: number;
  cost: number;
  usedArea: number;   // cm²
  wasteArea: number;  // cm²
  efficiency: number; // 0-100
}

export interface ProjectAnalysis {
  panels: PanelUsage[];
  totalPanelCount: number;
  totalCost: number;
  totalUsedArea: number;
  totalWasteArea: number;
  avgEfficiency: number;
  totalPieces: number;
  weightKg: number;      // based on each piece's actual panel thickness + material density
  allPieces: PieceWithBody[];
  configured: boolean;   // at least one panel has a price
}

export function analyzeProject(state: AppState): ProjectAnalysis {
  const mat = MATERIALS[state.materialKey];

  // Build default panel def
  const defaultPanelDef: PanelDef = {
    id: 'default',
    label: `${mat.short} ${state.panel.thickness * 10}mm`,
    width: state.panel.width,
    height: state.panel.height,
    thickness: state.panel.thickness,
    price: state.costConfig.panelPrice,
  };

  const allPanelDefs = [defaultPanelDef, ...(state.extraPanels ?? [])];

  // Collect all pieces with body info
  const allPieces: PieceWithBody[] = state.bodies.flatMap((b) =>
    b.pieces.map((p) => ({ ...p, bodyName: b.name, bodyId: b.id }))
  );

  // Group by panelId
  const groups = new Map<string, PieceWithBody[]>();
  allPieces.forEach((p) => {
    const pid = p.panelId ?? 'default';
    if (!groups.has(pid)) groups.set(pid, []);
    groups.get(pid)!.push(p);
  });

  // Build panel usages
  const panels: PanelUsage[] = allPanelDefs
    .map((pd) => {
      const pieces = groups.get(pd.id) ?? [];
      if (pieces.length === 0) return null;
      const nesting = optimizeNesting(pieces, pd.width, pd.height, state.kerf);
      return {
        panelDef: pd,
        pieces,
        nesting,
        panelCount: nesting.metrics.panelCount,
        cost: pd.price * nesting.metrics.panelCount,
        usedArea: nesting.metrics.usedArea,
        wasteArea: nesting.metrics.wasteArea,
        efficiency: nesting.metrics.efficiency,
      };
    })
    .filter(Boolean) as PanelUsage[];

  const totalPanelCount = panels.reduce((s, p) => s + p.panelCount, 0);
  const totalCost = panels.reduce((s, p) => s + p.cost, 0);
  const totalUsedArea = panels.reduce((s, p) => s + p.usedArea, 0);
  const totalWasteArea = panels.reduce((s, p) => s + p.wasteArea, 0);
  const totalArea = totalUsedArea + totalWasteArea;
  const avgEfficiency = totalArea > 0 ? (totalUsedArea / totalArea) * 100 : 0;
  const totalPieces = allPieces.reduce((s, p) => s + p.qty, 0);

  // Weight: use each piece's actual panel thickness
  const weightKg = allPieces.reduce((sum, p) => {
    const pd = p.panelId ? allPanelDefs.find(d => d.id === p.panelId) : defaultPanelDef;
    const thCm = pd?.thickness ?? state.panel.thickness;
    const volM3 = (p.length * p.width * p.qty) / 10000 * thCm / 100;
    return sum + volM3 * mat.density;
  }, 0);

  const configured = panels.some(p => p.panelDef.price > 0);

  return {
    panels, totalPanelCount, totalCost, totalUsedArea, totalWasteArea,
    avgEfficiency, totalPieces, weightKg, allPieces, configured,
  };
}
