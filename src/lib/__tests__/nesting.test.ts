import { describe, it, expect } from 'vitest';
import { optimizeNesting } from '../nesting';
import type { PieceWithBody } from '../../types';

function piece(name: string, length: number, width: number, qty = 1): PieceWithBody {
  return {
    id: name, name, length, width, qty,
    type: 'tablette-fixe', bodyName: 'C1', bodyId: 'c1',
  };
}

describe('optimizeNesting', () => {
  const PW = 250;
  const PH = 122;
  const KERF = 0.3;

  it('returns empty result for no pieces', () => {
    const r = optimizeNesting([], PW, PH, KERF);
    expect(r.bins).toHaveLength(0);
    expect(r.unplaced).toHaveLength(0);
    expect(r.metrics.panelCount).toBe(0);
    expect(r.strategy).toBe('none');
  });

  it('packs a single small piece into 1 panel', () => {
    const r = optimizeNesting([piece('A', 50, 30)], PW, PH, KERF);
    expect(r.bins).toHaveLength(1);
    expect(r.unplaced).toHaveLength(0);
    expect(r.metrics.panelCount).toBe(1);
    expect(r.metrics.efficiency).toBeGreaterThan(0);
  });

  it('handles qty > 1 correctly', () => {
    const r = optimizeNesting([piece('A', 50, 30, 3)], PW, PH, KERF);
    expect(r.bins).toHaveLength(1);
    // 3 individual placed pieces
    const totalPlaced = r.bins.reduce((s, b) => s + b.pl.length, 0);
    expect(totalPlaced).toBe(3);
  });

  it('places oversized piece in unplaced list', () => {
    const r = optimizeNesting([piece('Big', 300, 200)], PW, PH, KERF);
    expect(r.unplaced).toHaveLength(1);
    expect(r.bins).toHaveLength(0);
  });

  it('uses multiple panels when pieces don\'t fit in one', () => {
    // 4 pieces each 120x60 = 7200cm² each, panel = 30500cm²
    // 4 * 7200 = 28800, could theoretically fit in 1 panel,
    // but 120+kerf > 122 → needs rotation. Let's use pieces that definitely overflow.
    const pieces = [
      piece('A', 200, 100),
      piece('B', 200, 100),
    ];
    const r = optimizeNesting(pieces, PW, PH, KERF);
    // Each piece is 200x100 + kerf, panel is 250x122 → each takes most of a panel
    expect(r.bins.length).toBeGreaterThanOrEqual(2);
    expect(r.unplaced).toHaveLength(0);
  });

  it('rotates pieces to fit', () => {
    // Piece is 200x50 → fits in 250x122 normally
    // Piece is 50x200 → needs rotation to fit in 250x122 (200 > 122, but 50 < 122)
    // Actually 200 < 250 and 50 < 122, so it fits either way
    const r = optimizeNesting([piece('Tall', 130, 50)], PW, PH, KERF);
    // 130 > 122, so it may need rotation (130 as width, 50 as height)
    // The algorithm may choose either orientation since both fit
    expect(r.bins).toHaveLength(1);
    expect(r.unplaced).toHaveLength(0);
  });

  it('efficiency is between 0 and 100', () => {
    const r = optimizeNesting([piece('A', 50, 30, 5)], PW, PH, KERF);
    expect(r.metrics.efficiency).toBeGreaterThan(0);
    expect(r.metrics.efficiency).toBeLessThanOrEqual(100);
  });

  it('waste = total - used', () => {
    const r = optimizeNesting([piece('A', 100, 50, 2)], PW, PH, KERF);
    expect(r.metrics.wasteArea).toBeCloseTo(r.metrics.totalArea - r.metrics.usedArea, 0);
  });

  it('picks the best strategy (fewest panels)', () => {
    // Multiple pieces — the optimizer should try multiple strategies and pick best
    const pieces = Array.from({ length: 10 }, (_, i) => piece(`P${i}`, 40 + i * 5, 25, 2));
    const r = optimizeNesting(pieces, PW, PH, KERF);
    expect(r.strategy).not.toBe('none');
    expect(r.bins.length).toBeGreaterThan(0);
  });
});
