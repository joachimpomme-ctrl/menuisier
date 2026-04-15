import type { AppState, PanelDef, Piece, PieceType } from '../../types';
import type { StandardPart } from '../knowledge/types';
import { getBodyInnerWidth } from '../helpers';
import { createPiece, detectPieceType, generateStandardPieces, applySharedBoundary } from '../domain';
import { uid } from '../helpers';

const STANDARD_PART_TYPE_MAP: Record<StandardPart['category'], PieceType> = {
  shelf: 'tablette-fixe',
  side_panel: 'joue',
  door: 'porte',
  drawer_front: 'tiroir-facade',
  back_panel: 'fond',
  top_bottom: 'tablette-fixe',
  divider: 'separateur',
  custom: 'autre',
};

export function updatePiece(
  state: AppState,
  bodyId: string,
  pieceId: string,
  key: string,
  value: string | number,
): AppState {
  return {
    ...state,
    bodies: state.bodies.map((b) =>
      b.id === bodyId
        ? {
            ...b,
            pieces: b.pieces.map((p) => {
              if (p.id !== pieceId) return p;
              if (key === 'panelId') {
                const v = value === '' || value === 'default' ? undefined : String(value);
                return { ...p, panelId: v };
              }
              if (key === 'thickness') {
                const { thickness: _t, ...rest } = p;
                if (value === '' || value === 0) return rest as Piece;
                return { ...p, thickness: Number(value) };
              }
              if (key === 'posY') {
                const { posY: _y, ...rest } = p;
                if (value === '') return rest as Piece;
                return { ...p, posY: Number(value) };
              }
              if (key === 'posX') {
                const { posX: _x, ...rest } = p;
                if (value === '') return rest as Piece;
                return { ...p, posX: Number(value) };
              }
              const updated = { ...p, [key]: value };
              if (key === 'name') {
                updated.type = detectPieceType(String(value), p.type);
              }
              return updated;
            }),
          }
        : b
    ),
  };
}

export function addPiece(
  state: AppState,
  bodyId: string,
  pieceType: PieceType | undefined,
  allPanelDefs: PanelDef[],
): AppState {
  const shared = state.sharedBoundaries ?? [];
  const th = state.panel.thickness;
  const bi = state.bodies.findIndex((b) => b.id === bodyId);
  const body = state.bodies[bi];
  if (!body) return state;
  const iw = getBodyInnerWidth(body.width, bi, state.bodies.length, shared, th);
  const type: PieceType = pieceType ?? 'autre';

  const piece = createPiece(
    type,
    body.width,
    body.depth,
    iw,
    state.project.ceilingHeight,
    state.project.plinthHeight,
    allPanelDefs,
  );

  return {
    ...state,
    bodies: state.bodies.map((b) =>
      b.id === bodyId ? { ...b, pieces: [...b.pieces, piece] } : b
    ),
  };
}

export function autoFillPieces(state: AppState, bodyId: string): AppState {
  const shared = state.sharedBoundaries ?? [];
  const th = state.panel.thickness;
  const bi = state.bodies.findIndex((b) => b.id === bodyId);
  const body = state.bodies[bi];
  if (!body) return state;

  const pieces = generateStandardPieces(body, bi, shared, th, state.project.ceilingHeight);

  let nextState: AppState = {
    ...state,
    bodies: state.bodies.map((b) => (b.id === bodyId ? { ...b, pieces } : b)),
  };

  const boundaryCandidates = [bi - 1, bi].filter((boundaryIdx) => boundaryIdx >= 0 && boundaryIdx < shared.length && shared[boundaryIdx]);
  for (const boundaryIdx of boundaryCandidates) {
    const disabled = applySharedBoundary(
      nextState.bodies,
      boundaryIdx,
      false,
      nextState.sharedBoundaries ?? [],
      th,
      state.project.ceilingHeight,
      state.project.plinthHeight,
    );
    const enabled = applySharedBoundary(
      disabled.bodies,
      boundaryIdx,
      true,
      disabled.sharedBoundaries,
      th,
      state.project.ceilingHeight,
      state.project.plinthHeight,
    );
    nextState = { ...nextState, bodies: enabled.bodies, sharedBoundaries: enabled.sharedBoundaries };
  }

  return nextState;
}

export function addPieceFromLibrary(
  state: AppState,
  bodyId: string,
  standardPart: StandardPart,
): AppState {
  const body = state.bodies.find((b) => b.id === bodyId);
  if (!body) return state;

  const piece: Piece = {
    id: uid(),
    name: standardPart.name,
    length: standardPart.length_mm / 10,
    width: standardPart.width_mm / 10,
    qty: 1,
    type: STANDARD_PART_TYPE_MAP[standardPart.category],
    thickness: standardPart.thickness_mm / 10,
    edge_banding: standardPart.edge_banding,
    standardPartId: standardPart.id,
  };

  return {
    ...state,
    bodies: state.bodies.map((b) =>
      b.id === bodyId ? { ...b, pieces: [...b.pieces, piece] } : b,
    ),
  };
}

export function removePiece(state: AppState, bodyId: string, pieceId: string): AppState {
  return {
    ...state,
    bodies: state.bodies.map((b) =>
      b.id === bodyId ? { ...b, pieces: b.pieces.filter((p) => p.id !== pieceId) } : b
    ),
  };
}
