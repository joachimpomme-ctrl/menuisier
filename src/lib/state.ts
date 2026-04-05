import type { AppState, MaterialKey } from '../types';
import { MATERIALS } from '../data/materials';
import { uid } from './helpers';

export function createInitialState(mk: MaterialKey = 'cp_bouleau'): AppState {
  const m = MATERIALS[mk];
  const p = m.panels[0];
  return {
    materialKey: mk,
    project: {
      name: "Mon meuble",
      wallWidth: 250,
      ceilingHeight: 254,
      plinthHeight: 13,
      plinthDepth: 2,
    },
    panel: {
      width: p.w,
      height: p.h,
      thickness: m.defaultThickness / 10,
    },
    kerf: 0.3,
    costConfig: {
      panelPrice: p.defaultPrice,
    },
    bodies: [
      {
        id: "left",
        name: "Corps gauche",
        width: 100,
        depth: 26,
        pieces: [
          { id: uid(), name: "Joue G — gauche bas", length: 180, width: 26, qty: 1, type: "joue" },
          { id: uid(), name: "Joue G — gauche haut", length: 72, width: 26, qty: 1, type: "joue" },
          { id: uid(), name: "Joue G — droite bas", length: 180, width: 26, qty: 1, type: "joue" },
          { id: uid(), name: "Joue G — droite haut", length: 72, width: 26, qty: 1, type: "joue" },
          { id: uid(), name: "Tablette fixe G", length: 96.4, width: 26, qty: 2, type: "tablette-fixe" },
          { id: uid(), name: "Tablette réglable G", length: 96.4, width: 26, qty: 4, type: "tablette-reglable" },
        ],
      },
      {
        id: "right",
        name: "Corps droit",
        width: 150,
        depth: 36,
        pieces: [
          { id: uid(), name: "Joue D — gauche bas", length: 180, width: 36, qty: 1, type: "joue" },
          { id: uid(), name: "Joue D — gauche haut", length: 72, width: 36, qty: 1, type: "joue" },
          { id: uid(), name: "Joue D — droite bas", length: 180, width: 36, qty: 1, type: "joue" },
          { id: uid(), name: "Joue D — droite haut", length: 72, width: 36, qty: 1, type: "joue" },
          { id: uid(), name: "Tablette fixe D", length: 148.4, width: 36, qty: 2, type: "tablette-fixe" },
          { id: uid(), name: "Tablette réglable D", length: 148.4, width: 36, qty: 5, type: "tablette-reglable" },
        ],
      },
    ],
  };
}

// Normalise un état chargé depuis le stockage (migration v1 → v2)
export function migrateState(state: AppState): AppState {
  if (!state.costConfig) {
    const m = MATERIALS[state.materialKey];
    const panel = m?.panels.find(p => p.w === state.panel.width && p.h === state.panel.height);
    return { ...state, costConfig: { panelPrice: panel?.defaultPrice ?? 0 } };
  }
  return state;
}
