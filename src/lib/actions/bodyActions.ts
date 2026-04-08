import type { AppState, Body } from '../../types';
import { uid } from '../helpers';
import { recalcBodyPieces, applySharedBoundary } from '../domain';

export function updateBody(state: AppState, id: string, key: keyof Body, value: string | number): AppState {
  const shared = state.sharedBoundaries ?? [];
  return {
    ...state,
    bodies: state.bodies.map((b, i) => {
      if (b.id !== id) return b;
      const updated = { ...b, [key]: value };

      if (key === 'width' || key === 'depth') {
        const newWidth = key === 'width' ? (value as number) : b.width;
        const newDepth = key === 'depth' ? (value as number) : b.depth;
        return recalcBodyPieces(
          b, i, b.width, b.depth, newWidth, newDepth,
          state.panel.thickness, shared,
          state.project.ceilingHeight, state.project.plinthHeight,
        );
      }

      return updated;
    }),
  };
}

export function addBody(state: AppState): AppState {
  const shared = state.sharedBoundaries ?? [];
  return {
    ...state,
    bodies: [...state.bodies, { id: uid(), name: `Corps ${state.bodies.length + 1}`, width: 80, depth: 30, pieces: [] }],
    sharedBoundaries: [...shared, false],
  };
}

export function removeBody(state: AppState, id: string): AppState {
  const shared = state.sharedBoundaries ?? [];
  const idx = state.bodies.findIndex((b) => b.id === id);
  const newBodies = state.bodies.filter((b) => b.id !== id);
  const newShared = [...shared];
  if (idx > 0) {
    newShared.splice(idx - 1, 1);
  } else if (newShared.length > 0) {
    newShared.splice(0, 1);
  }
  return { ...state, bodies: newBodies, sharedBoundaries: newShared };
}

export function duplicateBody(state: AppState, id: string): AppState {
  const shared = state.sharedBoundaries ?? [];
  const source = state.bodies.find((b) => b.id === id);
  if (!source) return state;
  const idx = state.bodies.findIndex((b) => b.id === id);
  const newBody: Body = {
    ...source,
    id: uid(),
    name: `${source.name} (copie)`,
    pieces: source.pieces.map((p) => ({ ...p, id: uid() })),
  };
  const bodies = [...state.bodies];
  bodies.splice(idx + 1, 0, newBody);
  const newShared = [...shared];
  newShared.splice(idx, 0, false);
  return { ...state, bodies, sharedBoundaries: newShared };
}

export function toggleSharing(state: AppState, boundaryIdx: number, enabled: boolean): AppState {
  const shared = state.sharedBoundaries ?? [];
  const th = state.panel.thickness;
  const result = applySharedBoundary(
    state.bodies, boundaryIdx, enabled, shared, th,
    state.project.ceilingHeight, state.project.plinthHeight,
  );
  return { ...state, bodies: result.bodies, sharedBoundaries: result.sharedBoundaries };
}
