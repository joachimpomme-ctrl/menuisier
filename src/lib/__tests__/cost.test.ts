import { describe, it, expect } from 'vitest';
import { estimateCost } from '../cost';
import type { AppState, NestingResult } from '../../types';
import { createInitialState } from '../state';

function makeNesting(panelCount: number, efficiency: number): NestingResult {
  return {
    bins: Array.from({ length: panelCount }, () => ({ shelves: [], pl: [] })),
    unplaced: [],
    metrics: {
      panelCount,
      usedArea: 1000 * efficiency / 100,
      totalArea: 1000,
      wasteArea: 1000 * (1 - efficiency / 100),
      efficiency,
    },
    strategy: 'shelf-area-desc',
  };
}

describe('estimateCost', () => {
  it('calculates total material cost', () => {
    const state: AppState = {
      ...createInitialState(),
      costConfig: { panelPrice: 50 },
    };
    const nesting = makeNesting(3, 75);
    const cost = estimateCost(state, nesting);

    expect(cost.panelPrice).toBe(50);
    expect(cost.panelCount).toBe(3);
    expect(cost.totalMaterial).toBe(150);
    expect(cost.configured).toBe(true);
  });

  it('not configured when price is 0', () => {
    const state: AppState = {
      ...createInitialState(),
      costConfig: { panelPrice: 0 },
    };
    const cost = estimateCost(state, makeNesting(2, 80));

    expect(cost.configured).toBe(false);
    expect(cost.totalMaterial).toBe(0);
  });

  it('calculates waste cost correctly', () => {
    const state: AppState = {
      ...createInitialState(),
      costConfig: { panelPrice: 100 },
    };
    const nesting = makeNesting(2, 60);
    const cost = estimateCost(state, nesting);

    expect(cost.wastePercent).toBe(40);
    expect(cost.wasteCost).toBeCloseTo(200 * 0.4, 1); // 80€ of waste
  });

  it('handles zero panels', () => {
    const state: AppState = {
      ...createInitialState(),
      costConfig: { panelPrice: 50 },
    };
    const cost = estimateCost(state, makeNesting(0, 0));

    expect(cost.totalMaterial).toBe(0);
    expect(cost.panelCount).toBe(0);
  });
});
