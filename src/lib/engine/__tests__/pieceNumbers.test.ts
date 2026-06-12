import { describe, expect, it } from 'vitest';
import { runPipeline } from '../pipeline';
import type { ProjectIntent } from '../../knowledge/types';

const SIMPLE_INTENT: ProjectIntent = {
  furniture_type: 'bibliotheque',
  material_key: 'cp_bouleau',
  space: {
    width_mm: 1200,
    height_mm: 2200,
    depth_mm: 300,
    plinth_mm: 80,
    wall_type: 'concrete',
  },
  zones: [
    {
      module_id: 'shelf_adjustable',
      height_mm: 2120,
      config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 },
    },
  ],
};

const MULTI_BODY_INTENT: ProjectIntent = {
  furniture_type: 'bibliotheque',
  material_key: 'cp_bouleau',
  space: {
    width_mm: 2400,
    height_mm: 2200,
    depth_mm: 300,
    plinth_mm: 80,
    wall_type: 'concrete',
  },
  zones: [
    {
      module_id: 'shelf_adjustable',
      height_mm: 2120,
      config: { type: 'shelf_adjustable', count: 5, spacing_mm: 300 },
    },
  ],
};

describe('numérotation atelier pieceNumber', () => {
  it('attribue un pieceNumber unique et séquentiel 1..N', () => {
    const result = runPipeline(SIMPLE_INTENT);
    expect(result.parts.length).toBeGreaterThan(0);
    const numbers = result.parts.map((p) => p.pieceNumber);
    expect(numbers.every((n) => typeof n === 'number')).toBe(true);
    const sorted = [...numbers].sort((a, b) => (a ?? 0) - (b ?? 0));
    const expected = Array.from({ length: result.parts.length }, (_, i) => i + 1);
    expect(sorted).toEqual(expected);
  });

  it('numérotation stable entre deux runs du même intent', () => {
    const a = runPipeline(SIMPLE_INTENT);
    const b = runPipeline(SIMPLE_INTENT);
    expect(a.parts.length).toBe(b.parts.length);
    const numA = new Map(a.parts.map((p) => [p.id, p.pieceNumber]));
    const numB = new Map(b.parts.map((p) => [p.id, p.pieceNumber]));
    for (const [id, num] of numA) {
      expect(numB.get(id)).toBe(num);
    }
  });

  it('respecte ordre corps (multi-corps) : P1 sur le premier corps', () => {
    const result = runPipeline(MULTI_BODY_INTENT);
    const firstBodyId = result.layout.bodies[0].body_id;
    const byNum = [...result.parts].sort(
      (a, b) => (a.pieceNumber ?? 0) - (b.pieceNumber ?? 0),
    );
    expect(byNum[0].body_id).toBe(firstBodyId);
  });

  it('joue arrive avant tablette-fixe dans la numérotation (ordre fabrication)', () => {
    const result = runPipeline(SIMPLE_INTENT);
    const joues = result.parts.filter((p) => p.type === 'joue');
    const tabFixes = result.parts.filter((p) => p.type === 'tablette-fixe');
    if (joues.length > 0 && tabFixes.length > 0) {
      const maxJoue = Math.max(...joues.map((p) => p.pieceNumber ?? 0));
      const minTab = Math.min(...tabFixes.map((p) => p.pieceNumber ?? Infinity));
      expect(maxJoue).toBeLessThan(minTab);
    }
  });

  it('bridge legacy : la Piece héritée porte le même pieceNumber', async () => {
    const { pipelineResultToAppState } = await import('../pipeline');
    const result = runPipeline(SIMPLE_INTENT);
    const state = pipelineResultToAppState(result, SIMPLE_INTENT.material_key);
    const allPieces = state.bodies.flatMap((b) => b.pieces);
    expect(allPieces.length).toBeGreaterThan(0);
    for (const piece of allPieces) {
      const gp = result.parts.find((p) => p.id === piece.id);
      if (gp) {
        expect(piece.pieceNumber).toBe(gp.pieceNumber);
      }
    }
  });
});
