import type { AppState, Body, DoorConfig, PieceType } from '../../types';
import { uid } from '../helpers';
import { recalcBodyPieces, applySharedBoundary } from '../domain';
import { calculateDoor, getBodyEffectiveHeight, getBodyInnerWidth } from '../helpers';
import { resolveDoorCoverage } from '../domain';
import { autoFillBodyWidths as computeAutoFillBodyWidths } from '../bodyWidthAutoFill';

function refreshBoundary(
  bodies: Body[],
  sharedBoundaries: boolean[],
  boundaryIdx: number,
  thickness: number,
  ceilingHeight: number,
  plinthHeight: number,
): { bodies: Body[]; sharedBoundaries: boolean[] } {
  const disabled = applySharedBoundary(
    bodies,
    boundaryIdx,
    false,
    sharedBoundaries,
    thickness,
    ceilingHeight,
    plinthHeight,
  );
  return applySharedBoundary(
    disabled.bodies,
    boundaryIdx,
    true,
    disabled.sharedBoundaries,
    thickness,
    ceilingHeight,
    plinthHeight,
  );
}

function syncDoorConfigForWidth(config: DoorConfig, width: number): DoorConfig {
  const count: 1 | 2 = width > 50 ? 2 : 1;
  let poseType = config.poseType;

  if (count === 2 && poseType === 'enveloppante') {
    poseType = 'demi-recouvrement';
  }

  if (count === 1 && poseType === 'demi-recouvrement') {
    poseType = 'enveloppante';
  }

  return { ...config, count, poseType };
}

function rebuildDoors(
  body: Body,
  bodyIndex: number,
  state: AppState,
  doorConfig: DoorConfig | undefined,
): Body {
  const piecesWithoutDoors = body.pieces.filter((piece) => piece.type !== 'porte');

  if (!doorConfig) {
    return { ...body, doorConfig: undefined, pieces: piecesWithoutDoors };
  }

  const shared = state.sharedBoundaries ?? [];
  const bH = getBodyEffectiveHeight(body, state.project.ceilingHeight, state.project.plinthHeight);
  const innerW = getBodyInnerWidth(body.width, bodyIndex, state.bodies.length, shared, state.panel.thickness);
  const { coverageHeight, splitPosY } = resolveDoorCoverage(body, bH, state.panel.thickness, doorConfig);
  const finalConfig: DoorConfig = { ...doorConfig, splitPosY };
  const dims = calculateDoor(
    body.width,
    bH,
    state.panel.thickness,
    finalConfig.count,
    finalConfig.poseType,
    innerW,
    coverageHeight,
  );

  const doorPieces = Array.from({ length: finalConfig.count }, (_, index) => ({
    id: uid(),
    name: finalConfig.count === 1 ? `Porte ${body.name}` : `Porte ${index === 0 ? 'G' : 'D'} ${body.name}`,
    length: dims.doorHeight,
    width: dims.doorWidth,
    qty: 1,
    type: 'porte' as PieceType,
  }));

  return {
    ...body,
    doorConfig: finalConfig,
    pieces: [...piecesWithoutDoors, ...doorPieces],
  };
}

export function updateBody(state: AppState, id: string, key: keyof Body, value: string | number): AppState {
  const shared = state.sharedBoundaries ?? [];
  let bodies = state.bodies.map((b, i) => {
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
    });

  let nextShared = [...shared];
  const idx = state.bodies.findIndex((b) => b.id === id);
  if (key === 'depth') {
    const boundaryCandidates = [idx - 1, idx].filter((boundaryIdx) => boundaryIdx >= 0 && boundaryIdx < nextShared.length && nextShared[boundaryIdx]);
    for (const boundaryIdx of boundaryCandidates) {
      const refreshed = refreshBoundary(
        bodies,
        nextShared,
        boundaryIdx,
        state.panel.thickness,
        state.project.ceilingHeight,
        state.project.plinthHeight,
      );
      bodies = refreshed.bodies;
      nextShared = refreshed.sharedBoundaries;
    }
  }

  return {
    ...state,
    bodies,
    sharedBoundaries: nextShared,
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
  let bodies = state.bodies;
  let shared = [...(state.sharedBoundaries ?? [])];
  const idx = bodies.findIndex((b) => b.id === id);
  if (idx < 0) return state;

  const boundaryCandidates = [idx, idx - 1].filter((boundaryIdx) => boundaryIdx >= 0 && boundaryIdx < shared.length && shared[boundaryIdx]);
  for (const boundaryIdx of boundaryCandidates) {
    const disabled = applySharedBoundary(
      bodies,
      boundaryIdx,
      false,
      shared,
      state.panel.thickness,
      state.project.ceilingHeight,
      state.project.plinthHeight,
    );
    bodies = disabled.bodies;
    shared = disabled.sharedBoundaries;
  }

  const newBodies = bodies.filter((b) => b.id !== id);
  const newShared = [...shared];
  if (idx > 0) {
    newShared.splice(idx - 1, 1);
  } else if (newShared.length > 0) {
    newShared.splice(0, 1);
  }
  return { ...state, bodies: newBodies, sharedBoundaries: newShared };
}

export function duplicateBody(state: AppState, id: string): AppState {
  let bodiesSource = state.bodies;
  let shared = [...(state.sharedBoundaries ?? [])];
  const sourceIdx = bodiesSource.findIndex((b) => b.id === id);
  const boundaryCandidates = [sourceIdx, sourceIdx - 1].filter((boundaryIdx) => boundaryIdx >= 0 && boundaryIdx < shared.length && shared[boundaryIdx]);
  for (const boundaryIdx of boundaryCandidates) {
    const disabled = applySharedBoundary(
      bodiesSource,
      boundaryIdx,
      false,
      shared,
      state.panel.thickness,
      state.project.ceilingHeight,
      state.project.plinthHeight,
    );
    bodiesSource = disabled.bodies;
    shared = disabled.sharedBoundaries;
  }

  const source = bodiesSource.find((b) => b.id === id);
  if (!source) return state;
  const idx = bodiesSource.findIndex((b) => b.id === id);
  const newBody: Body = {
    ...source,
    id: uid(),
    name: `${source.name} (copie)`,
    pieces: source.pieces.map((p) => ({ ...p, id: uid(), sharedBoundaryMeta: undefined })),
  };
  const bodies = [...bodiesSource];
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

export function autoFillBodyWidths(state: AppState): AppState {
  if (state.bodies.length === 0) return state;

  const widths = state.bodies.map((body) => body.width);
  const nextWidths = computeAutoFillBodyWidths(widths, state.project.wallWidth, { minWidth: 10, precision: 10 });

  let bodies = state.bodies.map((body, index) => {
    const width = nextWidths[index];
    const syncedDoorConfig = body.doorConfig ? syncDoorConfigForWidth(body.doorConfig, width) : undefined;
    const recalculated = recalcBodyPieces(
      { ...body, doorConfig: syncedDoorConfig },
      index,
      body.width,
      body.depth,
      width,
      body.depth,
      state.panel.thickness,
      state.sharedBoundaries ?? [],
      state.project.ceilingHeight,
      state.project.plinthHeight,
    );
    return rebuildDoors(recalculated, index, state, syncedDoorConfig);
  });

  let shared = [...(state.sharedBoundaries ?? [])];
  for (let boundaryIdx = 0; boundaryIdx < shared.length; boundaryIdx += 1) {
    if (!shared[boundaryIdx]) continue;
    const refreshed = refreshBoundary(
      bodies,
      shared,
      boundaryIdx,
      state.panel.thickness,
      state.project.ceilingHeight,
      state.project.plinthHeight,
    );
    bodies = refreshed.bodies;
    shared = refreshed.sharedBoundaries;
  }

  return { ...state, bodies, sharedBoundaries: shared };
}
