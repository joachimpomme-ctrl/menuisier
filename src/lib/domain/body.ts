import type { Body, Piece, PieceType } from '../../types';
import { uid, getBodyInnerWidth, isSharedLeft, calculateDoor, getBodyEffectiveHeight } from '../helpers';

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

    // 1. Width adjustments: compensate for shared joue
    leftBody.width = +(leftBody.width + th / 2).toFixed(1);
    rightBody.width = +(rightBody.width + th / 2).toFixed(1);

    // 2. Remove ALL left joues from right body
    const leftJoueIds = findLeftJoueIds(rightBody.pieces);
    if (leftJoueIds.length > 0) {
      rightBody.pieces = rightBody.pieces.filter((p) => !leftJoueIds.includes(p.id));
    } else {
      const joues = rightBody.pieces.filter((p) => p.type === 'joue');
      if (joues.length === 1 && joues[0].qty >= 2) {
        joues[0].qty = Math.ceil(joues[0].qty / 2);
      } else if (joues.length >= 2) {
        const half = Math.ceil(joues.length / 2);
        const removeIds = new Set(joues.slice(0, half).map((p) => p.id));
        rightBody.pieces = rightBody.pieces.filter((p) => !removeIds.has(p.id));
      }
    }

    // 3. Mark the commune joues: right joues of left body
    const maxD = Math.max(leftBody.depth, rightBody.depth);
    const rightJouesOfLeft = findRightJoues(leftBody.pieces);
    if (rightJouesOfLeft.length > 0) {
      rightJouesOfLeft.forEach((j) => {
        j.width = maxD;
        if (!j.name.includes('(commune)')) {
          j.name = j.name + ' (commune)';
        }
      });
    } else {
      leftBody.pieces.filter(p => p.type === 'joue').forEach(j => {
        j.width = maxD;
      });
    }

  } else {
    // ===== DESACTIVER LA JOUE COMMUNE =====

    // 1. Width adjustments
    leftBody.width = +(leftBody.width - th / 2).toFixed(1);
    rightBody.width = +(rightBody.width - th / 2).toFixed(1);

    // 2. Re-create left joues for right body
    const communeJoues = leftBody.pieces.filter(
      p => p.type === 'joue' && p.name.includes('(commune)')
    );
    const sourceJoues = communeJoues.length > 0
      ? communeJoues
      : findRightJoues(rightBody.pieces);

    if (sourceJoues.length > 0) {
      const newLeftJoues = sourceJoues.map((p) => ({
        ...p,
        id: uid(),
        name: p.name
          .replace(/\s*\(commune\)/g, '')
          .replace(/droite/gi, 'gauche')
          .replace(/\bD\s*([—–-])/g, 'G $1'),
        width: rightBody.depth,
      }));
      rightBody.pieces = [...newLeftJoues, ...rightBody.pieces];
    } else {
      const joues = rightBody.pieces.filter((p) => p.type === 'joue');
      if (joues.length === 1) {
        joues[0].qty *= 2;
      } else if (joues.length === 0) {
        const basHeight = 180;
        const hautHeight = +(ceilingHeight - basHeight).toFixed(1);
        rightBody.pieces.unshift(
          { id: uid(), name: 'Joue G — bas', length: basHeight, width: rightBody.depth, qty: 1, type: 'joue' as PieceType },
          { id: uid(), name: 'Joue G — haut', length: hautHeight, width: rightBody.depth, qty: 1, type: 'joue' as PieceType },
        );
      }
    }

    // 3. Clean up commune joues in left body
    leftBody.pieces.forEach((p) => {
      if (p.type === 'joue' && p.name.includes('(commune)')) {
        p.name = p.name.replace(/\s*\(commune\)/g, '');
        p.width = leftBody.depth;
      }
    });
    findRightJoues(leftBody.pieces).forEach((j) => { j.width = leftBody.depth; });
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
      const dims = calculateDoor(b.width, bH, th, b.doorConfig.count, b.doorConfig.poseType, iw);
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
    if (p.type === 'joue') {
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
  if (body.doorConfig) {
    const bH = getBodyEffectiveHeight({ ...body, width: newWidth, depth: newDepth, pieces }, ceilingHeight, plinthHeight);
    const dims = calculateDoor(newWidth, bH, thickness, body.doorConfig.count, body.doorConfig.poseType, innerWidth);
    pieces = pieces.map((p) => {
      if (p.type === 'porte') return { ...p, length: dims.doorHeight, width: dims.doorWidth };
      return p;
    });
  }

  return { ...body, width: newWidth, depth: newDepth, pieces };
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
  const basHeight = 180;
  const hautHeight = +(ceilingHeight - basHeight).toFixed(1);
  const depth = body.depth;

  const pieces: Piece[] = [];

  // Left joues (skip if shared left)
  if (!sl) {
    pieces.push({ id: uid(), name: 'Joue G — bas', length: basHeight, width: depth, qty: 1, type: 'joue' as PieceType });
    pieces.push({ id: uid(), name: 'Joue G — haut', length: hautHeight, width: depth, qty: 1, type: 'joue' as PieceType });
  }

  // Right joues
  pieces.push({ id: uid(), name: 'Joue D — bas', length: basHeight, width: depth, qty: 1, type: 'joue' as PieceType });
  pieces.push({ id: uid(), name: 'Joue D — haut', length: hautHeight, width: depth, qty: 1, type: 'joue' as PieceType });

  // Fixed shelves
  pieces.push({ id: uid(), name: 'Tablette fixe basse', length: iw, width: depth, qty: 1, type: 'tablette-fixe' as PieceType });
  pieces.push({ id: uid(), name: 'Tablette fixe haute', length: iw, width: depth, qty: 1, type: 'tablette-fixe' as PieceType });

  // Adjustable shelves
  pieces.push({ id: uid(), name: 'Tablette réglable 1', length: iw, width: depth, qty: 1, type: 'tablette-reglable' as PieceType });
  pieces.push({ id: uid(), name: 'Tablette réglable 2', length: iw, width: depth, qty: 1, type: 'tablette-reglable' as PieceType });
  pieces.push({ id: uid(), name: 'Tablette réglable 3', length: iw, width: depth, qty: 1, type: 'tablette-reglable' as PieceType });

  return pieces;
}
