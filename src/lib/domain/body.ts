import type { Body, Piece, PieceType } from '../../types';
import { uid, getBodyInnerWidth, isSharedLeft, calculateDoor, getBodyEffectiveHeight } from '../helpers';

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
  const sl = isSharedLeft(bodyIndex, sharedBoundaries);
  const leftTh = sl ? 0 : thickness;
  const innerWidth = +(newWidth - leftTh - thickness).toFixed(1);
  const oldInnerWidth = +(oldWidth - leftTh - thickness).toFixed(1);

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
