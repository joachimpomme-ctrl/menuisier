import { useMemo } from 'react';
import type { AppState, PanelDef } from '../types';
import { MATERIALS } from '../data/materials';
import { analyzeProject } from '../lib/projectAnalysis';
import { optimizeNesting } from '../lib/nesting';
import { validate } from '../lib/validation';
import { generateSteps } from '../lib/steps';
import { estimateCost } from '../lib/cost';

export function useProjectAnalysis(state: AppState) {
  const mat = MATERIALS[state.materialKey];

  const analysis = useMemo(() => analyzeProject(state), [state]);

  const allPanelDefs = useMemo(() => {
    const defaultPanelDef: PanelDef = {
      id: 'default',
      label: `${mat.short} ${state.panel.thickness * 10}mm`,
      width: state.panel.width,
      height: state.panel.height,
      thickness: state.panel.thickness,
      price: state.costConfig.panelPrice,
    };
    return [defaultPanelDef, ...(state.extraPanels ?? [])];
  }, [mat.short, state.panel, state.costConfig.panelPrice, state.extraPanels]);

  const nesting = analysis.panels.find((p) => p.panelDef.id === 'default')?.nesting
    ?? optimizeNesting([], state.panel.width, state.panel.height, state.kerf);

  const validation = useMemo(() => validate(state), [state]);
  const steps = useMemo(() => generateSteps(state), [state]);
  const cost = useMemo(() => estimateCost(state, nesting), [state, nesting]);

  const nestingByPanel = analysis.panels.map((p) => ({
    panelDef: p.panelDef,
    nesting: p.nesting,
    pieces: p.pieces,
  }));

  return {
    mat,
    analysis,
    allPieces: analysis.allPieces,
    totalPieces: analysis.totalPieces,
    totalPanelCount: analysis.totalPanelCount,
    totalCost: analysis.totalCost,
    allPanelDefs,
    nesting,
    nestingByPanel,
    validation,
    steps,
    cost,
  };
}
