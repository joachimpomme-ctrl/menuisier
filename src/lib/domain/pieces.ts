import type { Piece, PieceType, PanelDef } from '../../types';
import { uid, getUsableHeight } from '../helpers';

// ---------------------------------------------------------------------------
// Create a new piece with smart defaults based on type
// ---------------------------------------------------------------------------

/**
 * Create a new piece with smart defaults based on type.
 *
 * @param type        - The piece type (joue, tablette-fixe, etc.)
 * @param bodyWidth   - Width of the parent body (cm)
 * @param bodyDepth   - Depth of the parent body (cm)
 * @param innerWidth  - Inner width of the parent body (after deducting joues)
 * @param ceilingHeight - Ceiling height from project (cm)
 * @param plinthHeight  - Plinth height from project (cm)
 * @param allPanelDefs  - All panel definitions (for auto-assigning fond panels)
 */
export function createPiece(
  type: PieceType,
  bodyWidth: number,
  bodyDepth: number,
  innerWidth: number,
  ceilingHeight: number,
  plinthHeight: number,
  allPanelDefs: PanelDef[],
): Piece {
  const usableHeight = getUsableHeight(ceilingHeight, plinthHeight);

  let name = 'Nouvelle pièce';
  let length = 50;
  let width = bodyDepth;
  let qty = 1;
  let panelId: string | undefined;

  switch (type) {
    case 'joue':
      name = 'Joue'; length = ceilingHeight; width = bodyDepth; break;
    case 'tablette-fixe':
      name = 'Tablette fixe'; length = innerWidth; width = bodyDepth; break;
    case 'tablette-reglable':
      name = 'Tablette réglable'; length = innerWidth; width = bodyDepth; break;
    case 'bandeau':
      name = 'Bandeau'; length = bodyWidth; width = 10; break;
    case 'porte':
      name = 'Porte'; length = usableHeight; width = bodyWidth; break;
    case 'fond': {
      name = 'Fond'; length = ceilingHeight; width = bodyWidth;
      // Auto-assign to first extra panel with thickness < 1cm if available
      const thinPanel = allPanelDefs.find((pd) => pd.thickness < 1);
      if (thinPanel) panelId = thinPanel.id;
      break;
    }
    default:
      name = 'Nouvelle pièce'; length = 50; width = bodyDepth; break;
  }

  return {
    id: uid(),
    name,
    length,
    width,
    qty,
    type,
    ...(panelId ? { panelId } : {}),
  };
}

// ---------------------------------------------------------------------------
// Detect piece type from name
// ---------------------------------------------------------------------------

/**
 * Detect piece type from name (only when current type is 'autre').
 * Returns the detected type, or the current type unchanged.
 */
export function detectPieceType(name: string, currentType: PieceType): PieceType {
  if (currentType !== 'autre') return currentType;
  const lower = name.toLowerCase();
  if (/joue/i.test(lower)) return 'joue';
  if (/tablette\s*(fixe|tabl[\.\s]*fixe)/i.test(lower)) return 'tablette-fixe';
  if (/tablette\s*(réglable|reglable|tabl[\.\s]*rég)/i.test(lower)) return 'tablette-reglable';
  if (/bandeau/i.test(lower)) return 'bandeau';
  if (/porte/i.test(lower)) return 'porte';
  if (/tiroir|façade|facade/i.test(lower)) return 'tiroir-facade';
  if (/fond|dos/i.test(lower)) return 'fond';
  return currentType;
}

// ---------------------------------------------------------------------------
// Normalize a piece
// ---------------------------------------------------------------------------

/**
 * Normalize a piece: clamp values, ensure valid state.
 * Cleans orphan panelId references.
 */
export function normalizePiece(piece: Piece, allPanelIds: string[]): Piece {
  const p = { ...piece };
  if (p.qty < 1) p.qty = 1;
  if (p.length <= 0) p.length = 1;
  if (p.width <= 0) p.width = 1;
  // Clean orphan panelId
  if (p.panelId && p.panelId !== 'default' && !allPanelIds.includes(p.panelId)) {
    p.panelId = undefined;
  }
  return p;
}
