import type { Body, DoorConfig, Piece, PieceType, SharedBoundarySnapshotPiece } from '../../types';
import { uid, getBodyInnerWidth, isSharedLeft, calculateDoor, getBodyEffectiveHeight, findSplitterTablette } from '../helpers';

// ---------------------------------------------------------------------------
// Door geometry helper — résout (coverageHeight, splitPosY) selon la position
// ---------------------------------------------------------------------------

/**
 * Détermine la hauteur effectivement couverte par les portes selon le mode
 * (pleine / bas / haut). Si la position est partielle, tente de se caler sur
 * une tablette fixe existante via findSplitterTablette.
 *
 * @returns objet contenant coverageHeight (cm) et splitPosY résolu (cm).
 */
export function resolveDoorCoverage(
  body: Body,
  effectiveHeight: number,
  thickness: number,
  config: DoorConfig,
): { coverageHeight: number; splitPosY: number } {
  const position = config.position ?? 'pleine';
  if (position === 'pleine') {
    return { coverageHeight: effectiveHeight, splitPosY: effectiveHeight };
  }

  const minSplit = +(thickness * 2).toFixed(1);
  const maxSplit = +(effectiveHeight - thickness * 2).toFixed(1);

  // Hauteur par défaut réaliste pour des portes partielles de bibliothèque:
  // environ 40% de la hauteur utile, bornée à une plage standard.
  const defaultCoverage = +Math.max(70, Math.min(110, effectiveHeight * 0.4)).toFixed(1);

  // Résoudre splitPosY : explicite valable > tablette détectée > hauteur standard
  let splitPosY = config.splitPosY;
  const isUsableSplit =
    typeof splitPosY === 'number'
    && splitPosY > minSplit
    && splitPosY < maxSplit;

  if (!isUsableSplit) {
    const splitter = findSplitterTablette(body, effectiveHeight);
    if (typeof splitter?.posY === 'number') {
      splitPosY = splitter.posY ?? defaultCoverage;
    } else {
      splitPosY = position === 'bas'
        ? defaultCoverage
        : +(effectiveHeight - defaultCoverage).toFixed(1);
    }
  }

  // Clamp dans une plage raisonnable
  const fallbackSplit = position === 'bas'
    ? defaultCoverage
    : +(effectiveHeight - defaultCoverage).toFixed(1);
  splitPosY = Math.max(minSplit, Math.min(maxSplit, splitPosY ?? fallbackSplit));
  const coverageHeight = position === 'bas'
    ? +(splitPosY).toFixed(1)
    : +(effectiveHeight - splitPosY).toFixed(1);
  return { coverageHeight, splitPosY: +splitPosY.toFixed(1) };
}

// ---------------------------------------------------------------------------
// Shared-boundary helpers (moved from StructureTab)
// ---------------------------------------------------------------------------

const LEFT_JOUE_RE = /gauche|\bG\s*[—–-]/i;
const RIGHT_JOUE_RE = /droite|\bD\s*[—–-]/i;

function findLeftJoueIds(pieces: Body['pieces']): string[] {
  const byName = pieces.filter(p => p.type === 'joue' && LEFT_JOUE_RE.test(p.name)).map(p => p.id);
  if (byName.length > 0) return byName;
  const joues = pieces.filter(p => p.type === 'joue');
  if (joues.length <= 1) {
    return [];
  }
  return joues.slice(0, Math.ceil(joues.length / 2)).map(p => p.id);
}

function findRightJoues(pieces: Body['pieces']) {
  const byName = pieces.filter(p => p.type === 'joue' && RIGHT_JOUE_RE.test(p.name));
  if (byName.length > 0) return byName;
  const joues = pieces.filter(p => p.type === 'joue');
  return joues.slice(Math.floor(joues.length / 2));
}

type BoundarySide = 'left' | 'right';

function cloneSnapshotPiece(piece: Piece): SharedBoundarySnapshotPiece {
  return {
    name: piece.name,
    length: piece.length,
    width: piece.width,
    qty: piece.qty,
    type: piece.type,
    panelId: piece.panelId,
    thickness: piece.thickness,
    posY: piece.posY,
    posX: piece.posX,
  };
}

function restoreSnapshotPieces(
  snapshots: SharedBoundarySnapshotPiece[],
  side: BoundarySide,
  depth: number,
): Piece[] {
  return snapshots.map((piece) => ({
    ...piece,
    id: uid(),
    width: depth,
    thickness: piece.thickness,
    name: piece.name
      .replace(/\s*\(commune\)/g, '')
      .replace(side === 'left' ? /droite/gi : /gauche/gi, side === 'left' ? 'gauche' : 'droite')
      .replace(side === 'left' ? /\bD\s*([—–-])/g : /\bG\s*([—–-])/g, side === 'left' ? 'G $1' : 'D $1'),
    sharedBoundaryMeta: undefined,
  }));
}

function getBoundaryJoues(body: Body, side: BoundarySide): Piece[] {
  return side === 'left' ? body.pieces.filter((p) => findLeftJoueIds(body.pieces).includes(p.id)) : findRightJoues(body.pieces);
}

function replaceBoundaryJoues(body: Body, side: BoundarySide, pieces: Piece[]): Body {
  const ids = new Set(getBoundaryJoues(body, side).map((piece) => piece.id));
  const kept = body.pieces.filter((piece) => !ids.has(piece.id));
  const insertAtStart = side === 'left';
  return {
    ...body,
    pieces: insertAtStart ? [...pieces, ...kept] : [...kept, ...pieces],
  };
}

function fallbackBoundaryTemplate(body: Body, side: BoundarySide): Piece[] {
  const direct = getBoundaryJoues(body, side).filter((piece) => !piece.name.includes('(commune)'));
  if (direct.length > 0) return direct;
  return getBoundaryJoues(body, side === 'left' ? 'right' : 'left').filter((piece) => !piece.name.includes('(commune)'));
}

function getBoundaryTotalLength(pieces: Piece[]): number {
  return pieces.reduce((sum, piece) => sum + piece.length, 0);
}

function findSegmentLengthByName(pieces: Piece[], pattern: RegExp): number {
  return pieces
    .filter((piece) => pattern.test(piece.name))
    .reduce((max, piece) => Math.max(max, piece.length), 0);
}

function buildSharedBoundaryPieces(
  leftPieces: Piece[],
  rightPieces: Piece[],
  boundaryIdx: number,
  thickness: number,
  depth: number,
): Piece[] {
  const hasSingle = leftPieces.length === 1 || rightPieces.length === 1;
  if (hasSingle) {
    return [{
      id: uid(),
      name: 'Joue D (commune)',
      length: Math.max(getBoundaryTotalLength(leftPieces), getBoundaryTotalLength(rightPieces)),
      width: depth,
      qty: 1,
      type: 'joue' as PieceType,
      thickness: +(thickness * 2).toFixed(2),
      posY: 0,
      sharedBoundaryMeta: {
        boundaryIdx,
        owner: 'left',
        originalLeftPieces: leftPieces.map(cloneSnapshotPiece),
        originalRightPieces: rightPieces.map(cloneSnapshotPiece),
      },
    }];
  }

  const basLength = Math.max(
    findSegmentLengthByName(leftPieces, /\bbas\b/i),
    findSegmentLengthByName(rightPieces, /\bbas\b/i),
  );
  const hautLength = Math.max(
    findSegmentLengthByName(leftPieces, /\bhaut\b/i),
    findSegmentLengthByName(rightPieces, /\bhaut\b/i),
  );

  const segments = [
    basLength > 0 ? { name: 'Joue D — bas (commune)', length: basLength, posY: 0 } : null,
    hautLength > 0 ? { name: 'Joue D — haut (commune)', length: hautLength, posY: basLength } : null,
  ].filter(Boolean) as { name: string; length: number; posY: number }[];

  const meta = {
    boundaryIdx,
    owner: 'left' as const,
    originalLeftPieces: leftPieces.map(cloneSnapshotPiece),
    originalRightPieces: rightPieces.map(cloneSnapshotPiece),
  };

  if (segments.length > 0) {
    return segments.map((segment) => ({
      id: uid(),
      name: segment.name,
      length: segment.length,
      width: depth,
      qty: 1,
      type: 'joue' as PieceType,
      thickness: +(thickness * 2).toFixed(2),
      posY: segment.posY,
      sharedBoundaryMeta: meta,
    }));
  }

  return [{
    id: uid(),
    name: 'Joue D (commune)',
    length: Math.max(getBoundaryTotalLength(leftPieces), getBoundaryTotalLength(rightPieces)),
    width: depth,
    qty: 1,
    type: 'joue' as PieceType,
    thickness: +(thickness * 2).toFixed(2),
    posY: 0,
    sharedBoundaryMeta: meta,
  }];
}

function getSharedBoundaryMeta(body: Body, boundaryIdx: number) {
  return body.pieces.find(
    (piece) => piece.type === 'joue' && piece.sharedBoundaryMeta?.boundaryIdx === boundaryIdx,
  )?.sharedBoundaryMeta;
}

// ---------------------------------------------------------------------------
// Apply / remove shared boundary between two adjacent bodies
// ---------------------------------------------------------------------------

export function applySharedBoundary(
  bodies: Body[],
  boundaryIdx: number,
  enabled: boolean,
  sharedBoundaries: boolean[],
  thickness: number,
  ceilingHeight: number,
  plinthHeight: number,
): { bodies: Body[]; sharedBoundaries: boolean[] } {
  const wasEnabled = sharedBoundaries[boundaryIdx] ?? false;
  if (wasEnabled === enabled) return { bodies, sharedBoundaries };

  const newShared = [...sharedBoundaries];
  while (newShared.length < bodies.length - 1) newShared.push(false);
  newShared[boundaryIdx] = enabled;

  const th = thickness;
  const newBodies = bodies.map((b) => ({
    ...b,
    pieces: b.pieces.map((p) => ({ ...p })),
  }));

  const leftBody = newBodies[boundaryIdx];
  const rightBody = newBodies[boundaryIdx + 1];

  if (enabled) {
    // ===== ACTIVER LA JOUE COMMUNE =====
    const leftTemplate = fallbackBoundaryTemplate(leftBody, 'right');
    const rightTemplate = fallbackBoundaryTemplate(rightBody, 'left');
    const sharedPieces = buildSharedBoundaryPieces(
      leftTemplate,
      rightTemplate,
      boundaryIdx,
      th,
      Math.max(leftBody.depth, rightBody.depth),
    );

    const leftReplaced = replaceBoundaryJoues(leftBody, 'right', sharedPieces);
    const rightReplaced = replaceBoundaryJoues(rightBody, 'left', []);
    newBodies[boundaryIdx] = leftReplaced;
    newBodies[boundaryIdx + 1] = rightReplaced;
  } else {
    // ===== DESACTIVER LA JOUE COMMUNE =====
    const meta = getSharedBoundaryMeta(leftBody, boundaryIdx);
    const restoredLeft = meta
      ? restoreSnapshotPieces(meta.originalLeftPieces, 'right', leftBody.depth)
      : restoreSnapshotPieces(fallbackBoundaryTemplate(leftBody, 'left').map(cloneSnapshotPiece), 'right', leftBody.depth);
    const restoredRight = meta
      ? restoreSnapshotPieces(meta.originalRightPieces, 'left', rightBody.depth)
      : restoreSnapshotPieces(fallbackBoundaryTemplate(rightBody, 'right').map(cloneSnapshotPiece), 'left', rightBody.depth);

    const leftWithoutShared = {
      ...leftBody,
      pieces: leftBody.pieces.filter((piece) => piece.sharedBoundaryMeta?.boundaryIdx !== boundaryIdx),
    };
    newBodies[boundaryIdx] = replaceBoundaryJoues(leftWithoutShared, 'right', restoredLeft);
    newBodies[boundaryIdx + 1] = replaceBoundaryJoues(rightBody, 'left', restoredRight);
  }

  // 4. Recalculate tablettes and doors for ALL bodies
  const finalBodies = newBodies.map((b, i) => {
    const iw = getBodyInnerWidth(b.width, i, newBodies.length, newShared, th);

    b.pieces = b.pieces.map((p) => {
      if (p.type === 'tablette-fixe' || p.type === 'tablette-reglable') {
        return { ...p, length: iw };
      }
      return p;
    });

    if (b.doorConfig) {
      const bH = getBodyEffectiveHeight(b, ceilingHeight, plinthHeight);
      const { coverageHeight, splitPosY } = resolveDoorCoverage(b, bH, th, b.doorConfig);
      const dims = calculateDoor(b.width, bH, th, b.doorConfig.count, b.doorConfig.poseType, iw, coverageHeight);
      // Sync the splitPosY back into the config (so the UI shows the same value)
      b.doorConfig = { ...b.doorConfig, splitPosY };
      b.pieces = b.pieces.map((p) => {
        if (p.type === 'porte') return { ...p, length: dims.doorHeight, width: dims.doorWidth };
        return p;
      });
    }

    return b;
  });

  return { bodies: finalBodies, sharedBoundaries: newShared };
}

// ---------------------------------------------------------------------------
// Recalculate piece dimensions when body width/depth changes
// ---------------------------------------------------------------------------

/**
 * Recalculate all piece dimensions when body width or depth changes.
 * Returns a new Body with updated pieces.
 */
export function recalcBodyPieces(
  body: Body,
  bodyIndex: number,
  oldWidth: number,
  oldDepth: number,
  newWidth: number,
  newDepth: number,
  thickness: number,
  sharedBoundaries: boolean[],
  ceilingHeight: number,
  plinthHeight: number,
): Body {
  const bodyCount = sharedBoundaries.length + 1;
  const innerWidth = getBodyInnerWidth(newWidth, bodyIndex, bodyCount, sharedBoundaries, thickness);
  const oldInnerWidth = getBodyInnerWidth(oldWidth, bodyIndex, bodyCount, sharedBoundaries, thickness);

  let pieces = body.pieces.map((p) => {
    const piece = { ...p };
    if (p.type === 'joue' || p.type === 'separateur') {
      piece.width = newDepth;
    } else if (p.type === 'tablette-fixe' || p.type === 'tablette-reglable') {
      piece.length = innerWidth;
      piece.width = newDepth;
    } else if (p.type === 'bandeau') {
      piece.length = newWidth;
    } else if (p.type === 'porte') {
      // Recalculated via door config below
    } else {
      // Generic piece: match dimensions if they tracked old values
      if (newDepth !== oldDepth && Math.abs(p.width - oldDepth) < 0.5) {
        piece.width = newDepth;
      }
      if (newWidth !== oldWidth && Math.abs(p.length - oldInnerWidth) < 0.5) {
        piece.length = innerWidth;
      }
      if (newWidth !== oldWidth && Math.abs(p.length - oldWidth) < 0.5) {
        piece.length = newWidth;
      }
    }
    return piece;
  });

  // Recalculate doors if configured
  let doorConfig = body.doorConfig;
  if (doorConfig) {
    const tmpBody = { ...body, width: newWidth, depth: newDepth, pieces };
    const bH = getBodyEffectiveHeight(tmpBody, ceilingHeight, plinthHeight);
    const { coverageHeight, splitPosY } = resolveDoorCoverage(tmpBody, bH, thickness, doorConfig);
    const dims = calculateDoor(newWidth, bH, thickness, doorConfig.count, doorConfig.poseType, innerWidth, coverageHeight);
    doorConfig = { ...doorConfig, splitPosY };
    pieces = pieces.map((p) => {
      if (p.type === 'porte') return { ...p, length: dims.doorHeight, width: dims.doorWidth };
      return p;
    });
  }

  return { ...body, width: newWidth, depth: newDepth, pieces, doorConfig };
}

// ---------------------------------------------------------------------------
// Generate standard pieces for a body (auto-fill)
// ---------------------------------------------------------------------------

/**
 * Generate standard pieces for a body.
 * Includes joues (respecting shared boundaries), tablettes fixes, and
 * tablettes reglables.
 */
export function generateStandardPieces(
  body: Body,
  bodyIndex: number,
  sharedBoundaries: boolean[],
  thickness: number,
  ceilingHeight: number,
): Piece[] {
  const iw = getBodyInnerWidth(body.width, bodyIndex, bodyIndex + 1, sharedBoundaries, thickness);
  const sl = isSharedLeft(bodyIndex, sharedBoundaries);
  const sr = bodyIndex < sharedBoundaries.length && (sharedBoundaries[bodyIndex] ?? false);
  const basHeight = 180;
  const hautHeight = +(ceilingHeight - basHeight).toFixed(1);
  const depth = body.depth;
  // Hauteur intérieure utilisable pour les positions verticales : on prend la
  // hauteur de la joue principale (= basHeight ici, qui est la zone où on place les
  // tablettes — la zone haute est indépendante en pratique).
  const innerH = basHeight;

  const pieces: Piece[] = [];

  // Left joues (skip if shared left)
  if (!sl) {
    pieces.push({ id: uid(), name: 'Joue G — bas', length: basHeight, width: depth, qty: 1, type: 'joue' as PieceType });
    pieces.push({ id: uid(), name: 'Joue G — haut', length: hautHeight, width: depth, qty: 1, type: 'joue' as PieceType });
  }

  // Right joues
  pieces.push({
    id: uid(),
    name: sr ? 'Joue D — bas (commune)' : 'Joue D — bas',
    length: basHeight,
    width: depth,
    qty: 1,
    type: 'joue' as PieceType,
    thickness: sr ? +(thickness * 2).toFixed(2) : undefined,
    posY: 0,
  });
  pieces.push({
    id: uid(),
    name: sr ? 'Joue D — haut (commune)' : 'Joue D — haut',
    length: hautHeight,
    width: depth,
    qty: 1,
    type: 'joue' as PieceType,
    thickness: sr ? +(thickness * 2).toFixed(2) : undefined,
    posY: basHeight,
  });

  // Fixed shelves : basse au sol intérieur, haute en sommet
  pieces.push({ id: uid(), name: 'Tablette fixe basse', length: iw, width: depth, qty: 1, type: 'tablette-fixe' as PieceType, posY: 0 });
  pieces.push({ id: uid(), name: 'Tablette fixe haute', length: iw, width: depth, qty: 1, type: 'tablette-fixe' as PieceType, posY: +(innerH - thickness).toFixed(1) });

  // Adjustable shelves : équiréparties entre les deux tablettes fixes
  // N tablettes → N+1 intervalles entre 0 et innerH
  const N = 3;
  for (let i = 1; i <= N; i++) {
    const posY = +(innerH * i / (N + 1)).toFixed(1);
    pieces.push({ id: uid(), name: `Tablette réglable ${i}`, length: iw, width: depth, qty: 1, type: 'tablette-reglable' as PieceType, posY });
  }

  return pieces;
}
