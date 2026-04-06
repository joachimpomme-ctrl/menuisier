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
          { id: uid(), name: "Tablette fixe D", length: 146.4, width: 36, qty: 2, type: "tablette-fixe" },
          { id: uid(), name: "Tablette réglable D", length: 146.4, width: 36, qty: 5, type: "tablette-reglable" },
        ],
      },
    ],
  };
}

// Normalise un état chargé depuis le stockage (migration v1 → v2+)
export function migrateState(state: AppState): AppState {
  let s = { ...state };

  // costConfig (ajouté en v2)
  if (!s.costConfig) {
    const m = MATERIALS[s.materialKey];
    const panel = m?.panels.find(p => p.w === s.panel.width && p.h === s.panel.height);
    s = { ...s, costConfig: { panelPrice: panel?.defaultPrice ?? 0 } };
  }

  // extraPanels (ajouté pour multi-panneaux)
  if (!s.extraPanels) {
    s = { ...s, extraPanels: [] };
  }

  // sharedBoundaries — doit avoir exactement bodies.length - 1 entrées
  if (!s.sharedBoundaries) {
    s = { ...s, sharedBoundaries: Array(Math.max(0, s.bodies.length - 1)).fill(false) };
  } else if (s.sharedBoundaries.length !== Math.max(0, s.bodies.length - 1)) {
    // Corriger la taille si incohérente (ajout/suppression de corps sans migration)
    const target = Math.max(0, s.bodies.length - 1);
    const fixed = [...s.sharedBoundaries];
    while (fixed.length < target) fixed.push(false);
    if (fixed.length > target) fixed.length = target;
    s = { ...s, sharedBoundaries: fixed };
  }

  // kerf (valeur par défaut si absente — anciens projets)
  if (s.kerf === undefined || s.kerf === null) {
    s = { ...s, kerf: 0.3 };
  }

  return s;
}
