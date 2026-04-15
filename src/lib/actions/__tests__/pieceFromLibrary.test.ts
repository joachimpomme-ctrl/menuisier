import { describe, expect, it } from 'vitest';
import type { AppState } from '../../../types';
import type { StandardPart } from '../../knowledge/types';
import { addPieceFromLibrary } from '../pieceActions';

function makeState(): AppState {
  return {
    materialKey: 'cp_bouleau',
    project: {
      name: 'Test',
      wallWidth: 200,
      wallDepth: 60,
      ceilingHeight: 250,
      plinthHeight: 10,
      plinthDepth: 2,
    },
    panel: { width: 250, height: 122, thickness: 1.8 },
    kerf: 0.3,
    costConfig: { panelPrice: 70 },
    bodies: [
      { id: 'body-a', name: 'Corps A', width: 80, depth: 30, pieces: [] },
      { id: 'body-b', name: 'Corps B', width: 60, depth: 25, pieces: [] },
    ],
    sharedBoundaries: [false],
    extraPanels: [],
  };
}

function makeStandardPart(overrides: Partial<StandardPart> = {}): StandardPart {
  return {
    id: 'std-1',
    name: 'Tablette LM 800',
    category: 'shelf',
    length_mm: 800,
    width_mm: 300,
    thickness_mm: 18,
    edge_banding: ['front'],
    source: 'template',
    ...overrides,
  };
}

describe('addPieceFromLibrary', () => {
  it('adds a piece to the requested body', () => {
    const state = makeState();
    const next = addPieceFromLibrary(state, 'body-b', makeStandardPart());

    expect(next.bodies[1].pieces).toHaveLength(1);
    expect(next.bodies[0].pieces).toHaveLength(0);
  });

  it('converts dimensions from mm to cm', () => {
    const state = makeState();
    const next = addPieceFromLibrary(state, 'body-a', makeStandardPart());
    const piece = next.bodies[0].pieces[0];

    expect(piece.length).toBe(80);
    expect(piece.width).toBe(30);
    expect(piece.thickness).toBe(1.8);
  });

  it('assigns standardPartId', () => {
    const state = makeState();
    const next = addPieceFromLibrary(state, 'body-a', makeStandardPart({ id: 'lm_tablette_melamine_800' }));

    expect(next.bodies[0].pieces[0].standardPartId).toBe('lm_tablette_melamine_800');
  });

  it('maps shelf category to tablette-fixe', () => {
    const state = makeState();
    const next = addPieceFromLibrary(state, 'body-a', makeStandardPart({ category: 'shelf' }));

    expect(next.bodies[0].pieces[0].type).toBe('tablette-fixe');
  });

  it('uses the standard part name', () => {
    const state = makeState();
    const next = addPieceFromLibrary(state, 'body-a', makeStandardPart({ name: 'Joue mélaminé blanc 2000×300×18' }));

    expect(next.bodies[0].pieces[0].name).toBe('Joue mélaminé blanc 2000×300×18');
  });

  it('copies edge_banding when present', () => {
    const state = makeState();
    const next = addPieceFromLibrary(
      state,
      'body-a',
      makeStandardPart({ edge_banding: ['front', 'left', 'right'] }),
    );

    expect(next.bodies[0].pieces[0].edge_banding).toEqual(['front', 'left', 'right']);
  });

  it('sets qty to 1 by default', () => {
    const state = makeState();
    const next = addPieceFromLibrary(state, 'body-a', makeStandardPart());

    expect(next.bodies[0].pieces[0].qty).toBe(1);
  });

  it('returns the original state when the body does not exist', () => {
    const state = makeState();
    const next = addPieceFromLibrary(state, 'ghost', makeStandardPart());

    expect(next).toBe(state);
  });
});
