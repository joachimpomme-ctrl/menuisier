import { describe, it, expect } from 'vitest';
import { projectActions, bodyActions, pieceActions } from '../actions';
import { createInitialState } from '../state';
import type { AppState, PanelDef } from '../../types';

// Helper: state with N bodies, no shared boundaries, predictable ids.
function makeState(): AppState {
  const s = createInitialState();
  // Make ids predictable
  s.bodies[0].id = 'A';
  s.bodies[1].id = 'B';
  s.sharedBoundaries = [false];
  return s;
}

// ---------------------------------------------------------------------------
// projectActions
// ---------------------------------------------------------------------------
describe('projectActions', () => {
  it('updateProject sets a single project field', () => {
    const s = makeState();
    const next = projectActions.updateProject(s, 'wallWidth', 300);
    expect(next.project.wallWidth).toBe(300);
    expect(next.project.ceilingHeight).toBe(s.project.ceilingHeight);
    expect(next).not.toBe(s);
  });

  it('updateThickness updates panel thickness only', () => {
    const s = makeState();
    const next = projectActions.updateThickness(s, 2.2);
    expect(next.panel.thickness).toBe(2.2);
    expect(next.panel.width).toBe(s.panel.width);
  });

  it('changeMaterial swaps material + panel + price', () => {
    const s = makeState();
    const next = projectActions.changeMaterial(s, 'mdf');
    expect(next.materialKey).toBe('mdf');
    expect(next.panel.thickness).toBeGreaterThan(0);
    expect(next.costConfig.panelPrice).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// bodyActions
// ---------------------------------------------------------------------------
describe('bodyActions.addBody', () => {
  it('appends a body and extends sharedBoundaries with false', () => {
    const s = makeState();
    const next = bodyActions.addBody(s);
    expect(next.bodies.length).toBe(s.bodies.length + 1);
    expect(next.sharedBoundaries).toEqual([false, false]);
  });
});

describe('bodyActions.removeBody', () => {
  it('removes the body and shrinks sharedBoundaries', () => {
    const s = makeState();
    const next = bodyActions.removeBody(s, 'B');
    expect(next.bodies.map((b) => b.id)).toEqual(['A']);
    expect(next.sharedBoundaries).toEqual([]);
  });

  it('removing the leftmost body shifts boundary list correctly', () => {
    const s = makeState();
    s.sharedBoundaries = [true]; // boundary between A and B is shared
    const next = bodyActions.removeBody(s, 'A');
    expect(next.bodies.map((b) => b.id)).toEqual(['B']);
    expect(next.sharedBoundaries).toEqual([]);
  });

  it('removing a middle body removes the right boundary entry', () => {
    const s = makeState();
    // Add a third body
    const withThree = bodyActions.addBody(s);
    withThree.bodies[2].id = 'C';
    withThree.sharedBoundaries = [true, false]; // A-B shared, B-C not
    const next = bodyActions.removeBody(withThree, 'B');
    expect(next.bodies.map((b) => b.id)).toEqual(['A', 'C']);
    // After removing B, only one boundary remains. The implementation
    // splices at idx-1 = 0, so the surviving entry is the right boundary (false).
    expect(next.sharedBoundaries).toEqual([false]);
  });
});

describe('bodyActions.duplicateBody', () => {
  it('inserts the clone right after the source with new uids', () => {
    const s = makeState();
    const next = bodyActions.duplicateBody(s, 'A');
    expect(next.bodies.length).toBe(3);
    expect(next.bodies[0].id).toBe('A');
    expect(next.bodies[1].id).not.toBe('A');
    expect(next.bodies[1].name).toContain('(copie)');
    expect(next.bodies[2].id).toBe('B');
    // sharedBoundaries gets a `false` inserted at the source's index
    expect(next.sharedBoundaries).toEqual([false, false]);
  });

  it('clones piece ids', () => {
    const s = makeState();
    const next = bodyActions.duplicateBody(s, 'A');
    const sourcePieceIds = s.bodies[0].pieces.map((p) => p.id);
    const clonePieceIds = next.bodies[1].pieces.map((p) => p.id);
    expect(clonePieceIds).toHaveLength(sourcePieceIds.length);
    sourcePieceIds.forEach((id, i) => expect(clonePieceIds[i]).not.toBe(id));
  });

  it('returns state unchanged for unknown id', () => {
    const s = makeState();
    const next = bodyActions.duplicateBody(s, 'ghost');
    expect(next).toBe(s);
  });
});

describe('bodyActions.toggleSharing', () => {
  it('marks the boundary as shared', () => {
    const s = makeState();
    const next = bodyActions.toggleSharing(s, 0, true);
    expect(next.sharedBoundaries?.[0]).toBe(true);
  });

  it('round-trip: enable then disable returns to false', () => {
    const s = makeState();
    const enabled = bodyActions.toggleSharing(s, 0, true);
    const disabled = bodyActions.toggleSharing(enabled, 0, false);
    expect(disabled.sharedBoundaries?.[0]).toBe(false);
  });
});

describe('bodyActions.updateBody', () => {
  it('updates a non-dimension field without recalculating pieces', () => {
    const s = makeState();
    const before = s.bodies[0].pieces;
    const next = bodyActions.updateBody(s, 'A', 'name', 'Renommé');
    expect(next.bodies[0].name).toBe('Renommé');
    // Pieces array should be the same reference (no recalc)
    expect(next.bodies[0].pieces).toBe(before);
  });

  it('updates width and triggers piece recalculation', () => {
    const s = makeState();
    const next = bodyActions.updateBody(s, 'A', 'width', 120);
    expect(next.bodies[0].width).toBe(120);
    // recalcBodyPieces should produce a fresh array
    expect(next.bodies[0].pieces).not.toBe(s.bodies[0].pieces);
  });
});

// ---------------------------------------------------------------------------
// pieceActions
// ---------------------------------------------------------------------------
describe('pieceActions.updatePiece', () => {
  it('updates a simple field (length)', () => {
    const s = makeState();
    const pieceId = s.bodies[0].pieces[0].id;
    const next = pieceActions.updatePiece(s, 'A', pieceId, 'length', 200);
    expect(next.bodies[0].pieces[0].length).toBe(200);
  });

  it("clears thickness override when value is empty string", () => {
    const s = makeState();
    s.bodies[0].pieces[0].thickness = 2.5;
    const pieceId = s.bodies[0].pieces[0].id;
    const next = pieceActions.updatePiece(s, 'A', pieceId, 'thickness', '');
    expect(next.bodies[0].pieces[0].thickness).toBeUndefined();
  });

  it('sets thickness override from numeric value', () => {
    const s = makeState();
    const pieceId = s.bodies[0].pieces[0].id;
    const next = pieceActions.updatePiece(s, 'A', pieceId, 'thickness', 2.2);
    expect(next.bodies[0].pieces[0].thickness).toBe(2.2);
  });

  it("clears panelId when value is 'default'", () => {
    const s = makeState();
    s.bodies[0].pieces[0].panelId = 'extra1';
    const pieceId = s.bodies[0].pieces[0].id;
    const next = pieceActions.updatePiece(s, 'A', pieceId, 'panelId', 'default');
    expect(next.bodies[0].pieces[0].panelId).toBeUndefined();
  });

  it('clears posY when value is empty string', () => {
    const s = makeState();
    s.bodies[0].pieces[0].posY = 50;
    const pieceId = s.bodies[0].pieces[0].id;
    const next = pieceActions.updatePiece(s, 'A', pieceId, 'posY', '');
    expect(next.bodies[0].pieces[0].posY).toBeUndefined();
  });

  it('sets posX from numeric value', () => {
    const s = makeState();
    const pieceId = s.bodies[0].pieces[0].id;
    const next = pieceActions.updatePiece(s, 'A', pieceId, 'posX', 12);
    expect(next.bodies[0].pieces[0].posX).toBe(12);
  });

  it('auto-detects piece type when name changes', () => {
    const s = makeState();
    // Use a piece that starts as 'autre' so detectPieceType actually fires
    const pid = 'auto-detect-piece';
    s.bodies[0].pieces.push({ id: pid, name: 'placeholder', length: 50, width: 30, qty: 1, type: 'autre' });
    const next = pieceActions.updatePiece(s, 'A', pid, 'name', 'Tablette fixe haute');
    const updated = next.bodies[0].pieces.find((p) => p.id === pid)!;
    expect(updated.name).toBe('Tablette fixe haute');
    expect(updated.type).toBe('tablette-fixe');
  });
});

describe('pieceActions.removePiece', () => {
  it('removes the piece by id', () => {
    const s = makeState();
    const pid = s.bodies[0].pieces[0].id;
    const next = pieceActions.removePiece(s, 'A', pid);
    expect(next.bodies[0].pieces.find((p) => p.id === pid)).toBeUndefined();
    expect(next.bodies[0].pieces.length).toBe(s.bodies[0].pieces.length - 1);
  });
});

describe('pieceActions.addPiece', () => {
  const panels: PanelDef[] = [];
  it('appends a new piece of the requested type', () => {
    const s = makeState();
    const before = s.bodies[0].pieces.length;
    const next = pieceActions.addPiece(s, 'A', 'tablette-fixe', panels);
    expect(next.bodies[0].pieces.length).toBe(before + 1);
    expect(next.bodies[0].pieces[before].type).toBe('tablette-fixe');
  });

  it('returns state unchanged for unknown body id', () => {
    const s = makeState();
    const next = pieceActions.addPiece(s, 'ghost', 'joue', panels);
    expect(next).toBe(s);
  });
});

describe('pieceActions.autoFillPieces', () => {
  it('replaces pieces with generated standards', () => {
    const s = makeState();
    const next = pieceActions.autoFillPieces(s, 'A');
    expect(next.bodies[0].pieces.length).toBeGreaterThan(0);
    // Should differ from the initial pieces
    expect(next.bodies[0].pieces).not.toBe(s.bodies[0].pieces);
  });
});
