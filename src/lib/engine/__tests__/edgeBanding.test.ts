import { describe, expect, it } from 'vitest';
import { computeEdgeBanding, computeEdgeBandingLength } from '../edgeBanding';
import type { GeneratedPart } from '../../knowledge/types';

function makePart(overrides: Partial<GeneratedPart> = {}): GeneratedPart {
  return {
    id: overrides.id ?? 'part-1',
    name: overrides.name ?? 'Part',
    length_mm: overrides.length_mm ?? 1000,
    width_mm: overrides.width_mm ?? 400,
    thickness_mm: overrides.thickness_mm ?? 18,
    qty: overrides.qty ?? 1,
    type: overrides.type ?? 'joue',
    body_id: overrides.body_id ?? 'body-1',
    locked: overrides.locked ?? false,
    position: overrides.position,
    drilling: overrides.drilling,
    edge_banding: overrides.edge_banding,
    standard_part_id: overrides.standard_part_id,
  };
}

describe('computeEdgeBanding', () => {
  it('returns front only for joue', () => {
    expect(computeEdgeBanding(makePart({ type: 'joue' }))).toEqual(['front']);
  });

  it('returns all four sides for porte', () => {
    expect(computeEdgeBanding(makePart({ type: 'porte' }))).toEqual(['front', 'back', 'left', 'right']);
  });

  it('returns no banding for fond', () => {
    expect(computeEdgeBanding(makePart({ type: 'fond' }))).toEqual([]);
  });

  it('returns no banding for tiroir-caisson', () => {
    expect(computeEdgeBanding(makePart({ type: 'tiroir-caisson' }))).toEqual([]);
  });

  it('returns no banding for a type without rule', () => {
    expect(computeEdgeBanding(makePart({ type: 'traverse' }))).toEqual([]);
  });
});

describe('computeEdgeBandingLength', () => {
  it('returns 2x length + 2x width for a door', () => {
    const door = makePart({
      type: 'porte',
      length_mm: 500,
      width_mm: 2000,
      edge_banding: ['front', 'back', 'left', 'right'],
    });

    expect(computeEdgeBandingLength(door)).toBe(2 * 500 + 2 * 2000);
  });

  it('returns one length for a joue with one front edge', () => {
    const side = makePart({
      type: 'joue',
      length_mm: 1800,
      width_mm: 400,
      edge_banding: ['front'],
    });

    expect(computeEdgeBandingLength(side)).toBe(1800);
  });
});
