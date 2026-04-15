import { describe, it, expect } from 'vitest';
import { createPiece, detectPieceType, normalizePiece } from '../domain/pieces';
import { generateStandardPieces, recalcBodyPieces } from '../domain/body';
import { getPanelForPiece } from '../domain/panels';
import type { Piece, Body, PanelDef, AppState } from '../../types';
import { createInitialState } from '../state';

// ---------------------------------------------------------------------------
// createPiece
// ---------------------------------------------------------------------------
describe('createPiece', () => {
  const bodyW = 80;
  const bodyD = 30;
  const innerW = 76.4; // 80 - 2*1.8
  const cH = 254;
  const pH = 13;
  const panels: PanelDef[] = [];

  it('creates a joue with ceiling height and body depth', () => {
    const p = createPiece('joue', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('joue');
    expect(p.name).toBe('Joue');
    expect(p.length).toBe(cH);
    expect(p.width).toBe(bodyD);
    expect(p.qty).toBe(1);
  });

  it('creates a tablette-fixe with inner width and body depth', () => {
    const p = createPiece('tablette-fixe', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('tablette-fixe');
    expect(p.length).toBe(innerW);
    expect(p.width).toBe(bodyD);
  });

  it('creates a tablette-reglable with inner width and body depth', () => {
    const p = createPiece('tablette-reglable', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('tablette-reglable');
    expect(p.length).toBe(innerW);
    expect(p.width).toBe(bodyD);
  });

  it('creates a bandeau with body width and 10cm width', () => {
    const p = createPiece('bandeau', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('bandeau');
    expect(p.length).toBe(bodyW);
    expect(p.width).toBe(10);
  });

  it('creates a porte with usable height and body width', () => {
    const p = createPiece('porte', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('porte');
    expect(p.length).toBe(cH - pH); // usableHeight
    expect(p.width).toBe(bodyW);
  });

  it('creates a fond with ceiling height and body width', () => {
    const p = createPiece('fond', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('fond');
    expect(p.length).toBe(cH);
    expect(p.width).toBe(bodyW);
  });

  it('fond auto-assigns to thin panel when available', () => {
    const thinPanels: PanelDef[] = [
      { id: 'hdf3', label: 'HDF 3mm', width: 250, height: 122, thickness: 0.3, price: 5 },
    ];
    const p = createPiece('fond', bodyW, bodyD, innerW, cH, pH, thinPanels);
    expect(p.panelId).toBe('hdf3');
  });

  it('fond has no panelId when no thin panel available', () => {
    const thickPanels: PanelDef[] = [
      { id: 'cp18', label: 'CP 18mm', width: 250, height: 122, thickness: 1.8, price: 50 },
    ];
    const p = createPiece('fond', bodyW, bodyD, innerW, cH, pH, thickPanels);
    expect(p.panelId).toBeUndefined();
  });

  it('creates an "autre" piece with default dimensions', () => {
    const p = createPiece('autre', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('autre');
    expect(p.name).toBe('Nouvelle pièce');
    expect(p.length).toBe(50);
    expect(p.width).toBe(bodyD);
  });

  it('creates a tiroir-facade with default dimensions', () => {
    const p = createPiece('tiroir-facade', bodyW, bodyD, innerW, cH, pH, panels);
    expect(p.type).toBe('tiroir-facade');
    expect(p.name).toBe('Nouvelle pièce');
    expect(p.length).toBe(50);
  });

  it('always generates a unique id', () => {
    const ids = new Set(
      Array.from({ length: 20 }, () => createPiece('joue', bodyW, bodyD, innerW, cH, pH, panels).id)
    );
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// detectPieceType
// ---------------------------------------------------------------------------
describe('detectPieceType', () => {
  it('detects joue', () => {
    expect(detectPieceType('Joue gauche', 'autre')).toBe('joue');
  });

  it('detects tablette fixe', () => {
    expect(detectPieceType('Tablette fixe haute', 'autre')).toBe('tablette-fixe');
  });

  it('detects tablette reglable (with accent)', () => {
    expect(detectPieceType('Tablette réglable 1', 'autre')).toBe('tablette-reglable');
  });

  it('detects tablette reglable (without accent)', () => {
    expect(detectPieceType('Tablette reglable', 'autre')).toBe('tablette-reglable');
  });

  it('detects bandeau', () => {
    expect(detectPieceType('Bandeau supérieur', 'autre')).toBe('bandeau');
  });

  it('detects porte', () => {
    expect(detectPieceType('Porte gauche', 'autre')).toBe('porte');
  });

  it('detects tiroir-facade from tiroir', () => {
    expect(detectPieceType('Tiroir bas', 'autre')).toBe('tiroir-facade');
  });

  it('detects tiroir-facade from facade', () => {
    expect(detectPieceType('Façade tiroir', 'autre')).toBe('tiroir-facade');
  });

  it('detects tiroir-facade from facade without cedilla', () => {
    expect(detectPieceType('facade haute', 'autre')).toBe('tiroir-facade');
  });

  it('detects fond', () => {
    expect(detectPieceType('Fond arrière', 'autre')).toBe('fond');
  });

  it('detects fond from "dos"', () => {
    expect(detectPieceType('Dos du meuble', 'autre')).toBe('fond');
  });

  it('does NOT override non-autre type', () => {
    expect(detectPieceType('Joue gauche', 'tablette-fixe')).toBe('tablette-fixe');
    expect(detectPieceType('Porte', 'joue')).toBe('joue');
    expect(detectPieceType('Fond', 'bandeau')).toBe('bandeau');
  });

  it('returns "autre" when name does not match any pattern', () => {
    expect(detectPieceType('Pièce mystère', 'autre')).toBe('autre');
    expect(detectPieceType('', 'autre')).toBe('autre');
  });
});

// ---------------------------------------------------------------------------
// normalizePiece
// ---------------------------------------------------------------------------
describe('normalizePiece', () => {
  const basePiece: Piece = {
    id: 'p1', name: 'Test', length: 50, width: 30, qty: 2, type: 'tablette-fixe',
  };

  it('returns piece unchanged when valid', () => {
    const result = normalizePiece(basePiece, []);
    expect(result).toEqual(basePiece);
  });

  it('clamps qty to minimum 1', () => {
    const result = normalizePiece({ ...basePiece, qty: 0 }, []);
    expect(result.qty).toBe(1);
    const result2 = normalizePiece({ ...basePiece, qty: -5 }, []);
    expect(result2.qty).toBe(1);
  });

  it('clamps length to minimum 1', () => {
    const result = normalizePiece({ ...basePiece, length: 0 }, []);
    expect(result.length).toBe(1);
    const result2 = normalizePiece({ ...basePiece, length: -10 }, []);
    expect(result2.length).toBe(1);
  });

  it('clamps width to minimum 1', () => {
    const result = normalizePiece({ ...basePiece, width: 0 }, []);
    expect(result.width).toBe(1);
  });

  it('preserves valid panelId', () => {
    const p = { ...basePiece, panelId: 'hdf3' };
    const result = normalizePiece(p, ['hdf3', 'cp18']);
    expect(result.panelId).toBe('hdf3');
  });

  it('preserves "default" panelId', () => {
    const p = { ...basePiece, panelId: 'default' };
    const result = normalizePiece(p, []);
    expect(result.panelId).toBe('default');
  });

  it('cleans orphan panelId not in allPanelIds', () => {
    const p = { ...basePiece, panelId: 'deleted-panel' };
    const result = normalizePiece(p, ['hdf3']);
    expect(result.panelId).toBeUndefined();
  });

  it('preserves undefined panelId', () => {
    const result = normalizePiece(basePiece, ['hdf3']);
    expect(result.panelId).toBeUndefined();
  });

  it('does not mutate the original piece', () => {
    const original = { ...basePiece, qty: 0 };
    normalizePiece(original, []);
    expect(original.qty).toBe(0); // unchanged
  });
});

// ---------------------------------------------------------------------------
// generateStandardPieces
// ---------------------------------------------------------------------------
describe('generateStandardPieces', () => {
  const th = 1.8;
  const cH = 254;

  const body: Body = {
    id: 'b1', name: 'Corps 1', width: 80, depth: 30, pieces: [],
  };

  it('generates correct pieces for a normal body (no sharing)', () => {
    const pieces = generateStandardPieces(body, 0, [], th, cH);

    // Should have: 2 left joues + 2 right joues + 2 tablettes fixes + 3 tablettes reglables = 9
    expect(pieces).toHaveLength(9);

    const joues = pieces.filter(p => p.type === 'joue');
    const tabFixes = pieces.filter(p => p.type === 'tablette-fixe');
    const tabReglables = pieces.filter(p => p.type === 'tablette-reglable');

    expect(joues).toHaveLength(4);
    expect(tabFixes).toHaveLength(2);
    expect(tabReglables).toHaveLength(3);

    // Check joue dimensions
    const basHeight = 180;
    const hautHeight = +(cH - basHeight).toFixed(1);
    expect(joues.some(j => j.length === basHeight)).toBe(true);
    expect(joues.some(j => j.length === hautHeight)).toBe(true);
    expect(joues.every(j => j.width === 30)).toBe(true);

    // Check inner width for tablettes: 80 - 1.8 - 1.8 = 76.4
    expect(tabFixes.every(t => t.length === 76.4)).toBe(true);
    expect(tabReglables.every(t => t.length === 76.4)).toBe(true);
  });

  it('skips left joues for a shared-left body', () => {
    // Body at index 1 with shared boundary at index 0
    const pieces = generateStandardPieces(body, 1, [true], th, cH);

    // Should have: 0 left joues + 2 right joues + 2 tablettes fixes + 3 tablettes reglables = 7
    expect(pieces).toHaveLength(7);

    const joues = pieces.filter(p => p.type === 'joue');
    expect(joues).toHaveLength(2);

    // All joues should be "D" (right)
    expect(joues.every(j => j.name.includes('D'))).toBe(true);
  });

  it('keeps the same inner width for a shared-left body with a fused common side', () => {
    // Shared side is modeled as a fused double-thickness panel, so the usable width
    // stays aligned with the standard formula.
    const pieces = generateStandardPieces(body, 1, [true], th, cH);
    const tabFixes = pieces.filter(p => p.type === 'tablette-fixe');
    expect(tabFixes[0].length).toBeCloseTo(76.4, 1);
  });

  it('all pieces have unique ids', () => {
    const pieces = generateStandardPieces(body, 0, [], th, cH);
    const ids = pieces.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all pieces have qty = 1', () => {
    const pieces = generateStandardPieces(body, 0, [], th, cH);
    expect(pieces.every(p => p.qty === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// recalcBodyPieces
// ---------------------------------------------------------------------------
describe('recalcBodyPieces', () => {
  const th = 1.8;
  const cH = 254;
  const pH = 13;

  it('updates joue width when depth changes', () => {
    const body: Body = {
      id: 'b1', name: 'C1', width: 80, depth: 30, pieces: [
        { id: 'j1', name: 'Joue G', length: cH, width: 30, qty: 1, type: 'joue' },
      ],
    };
    const result = recalcBodyPieces(body, 0, 80, 30, 80, 35, th, [], cH, pH);
    expect(result.pieces[0].width).toBe(35);
    expect(result.depth).toBe(35);
  });

  it('updates tablette dimensions when width changes', () => {
    const innerOld = +(80 - 2 * th).toFixed(1); // 76.4
    const innerNew = +(90 - 2 * th).toFixed(1); // 86.4
    const body: Body = {
      id: 'b1', name: 'C1', width: 80, depth: 30, pieces: [
        { id: 't1', name: 'Tablette fixe', length: innerOld, width: 30, qty: 1, type: 'tablette-fixe' },
      ],
    };
    const result = recalcBodyPieces(body, 0, 80, 30, 90, 30, th, [], cH, pH);
    expect(result.pieces[0].length).toBeCloseTo(innerNew, 1);
  });

  it('updates bandeau length to new body width', () => {
    const body: Body = {
      id: 'b1', name: 'C1', width: 80, depth: 30, pieces: [
        { id: 'b1p', name: 'Bandeau', length: 80, width: 10, qty: 1, type: 'bandeau' },
      ],
    };
    const result = recalcBodyPieces(body, 0, 80, 30, 100, 30, th, [], cH, pH);
    expect(result.pieces[0].length).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// getPanelForPiece
// ---------------------------------------------------------------------------
describe('getPanelForPiece', () => {
  const state = createInitialState();

  it('returns default panel for undefined panelId', () => {
    const panel = getPanelForPiece(undefined, state);
    expect(panel.id).toBe('default');
    expect(panel.thickness).toBe(state.panel.thickness);
  });

  it('returns default panel for "default" panelId', () => {
    const panel = getPanelForPiece('default', state);
    expect(panel.id).toBe('default');
  });

  it('returns extra panel when panelId matches', () => {
    const stateWithExtra: AppState = {
      ...state,
      extraPanels: [{ id: 'hdf3', label: 'HDF 3mm', width: 250, height: 122, thickness: 0.3, price: 5 }],
    };
    const panel = getPanelForPiece('hdf3', stateWithExtra);
    expect(panel.id).toBe('hdf3');
    expect(panel.thickness).toBe(0.3);
  });

  it('falls back to default panel for unknown panelId', () => {
    const panel = getPanelForPiece('nonexistent', state);
    expect(panel.id).toBe('default');
  });
});
