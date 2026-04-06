import type { AppState } from '../types';
import { normalizePiece } from './domain/pieces';

/**
 * Normalize a project state: fix orphan panelIds, clamp invalid values,
 * ensure structural consistency. Safe to call multiple times (idempotent).
 *
 * Called: on load, before save, before export.
 */
export function normalizeProject(state: AppState): AppState {
  const allPanelIds = ['default', ...(state.extraPanels ?? []).map(p => p.id)];

  return {
    ...state,
    // Ensure kerf is valid
    kerf: (state.kerf >= 0 && state.kerf <= 5) ? state.kerf : 0.3,
    // Normalize bodies
    bodies: state.bodies.map(b => ({
      ...b,
      width: Math.max(b.width, 1),
      depth: Math.max(b.depth, 1),
      pieces: b.pieces.map(p => normalizePiece(p, allPanelIds)),
    })),
    // Ensure sharedBoundaries has correct length
    sharedBoundaries: (() => {
      const target = Math.max(0, state.bodies.length - 1);
      const sb = state.sharedBoundaries ?? [];
      if (sb.length === target) return sb;
      const fixed = [...sb];
      while (fixed.length < target) fixed.push(false);
      if (fixed.length > target) fixed.length = target;
      return fixed;
    })(),
    // Ensure project dimensions are positive
    project: {
      ...state.project,
      wallWidth: Math.max(state.project.wallWidth, 1),
      wallDepth: Math.max(state.project.wallDepth ?? 60, 1),
      ceilingHeight: Math.max(state.project.ceilingHeight, 1),
      plinthHeight: Math.max(state.project.plinthHeight, 0),
      plinthDepth: Math.max(state.project.plinthDepth, 0),
    },
    // Ensure panel dimensions are valid
    panel: {
      width: Math.max(state.panel.width, 10),
      height: Math.max(state.panel.height, 10),
      thickness: Math.max(state.panel.thickness, 0.1),
    },
  };
}
