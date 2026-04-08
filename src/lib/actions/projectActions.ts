import type { AppState, MaterialKey } from '../../types';
import { MATERIALS } from '../../data/materials';

export function updateProject(state: AppState, key: string, value: number): AppState {
  return { ...state, project: { ...state.project, [key]: value } };
}

export function updateThickness(state: AppState, value: number): AppState {
  return { ...state, panel: { ...state.panel, thickness: value } };
}

export function changeMaterial(state: AppState, key: MaterialKey): AppState {
  const m = MATERIALS[key];
  const p = m.panels[0];
  return {
    ...state,
    materialKey: key,
    panel: { ...state.panel, width: p.w, height: p.h, thickness: m.defaultThickness / 10 },
    costConfig: { panelPrice: p.defaultPrice },
  };
}
