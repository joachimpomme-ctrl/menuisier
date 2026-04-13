import { describe, it, expect } from 'vitest';
import {
  generateParts,
  computeOverlayDoubleDoorWidth,
  computeProgressiveDrawerFronts,
  computeBackPanelDimensions,
  _resetPartCounter,
} from '../geometry';
import { generateLayout } from '../layout';
import { generateStructure } from '../structure';
import type { ProjectIntent, BackPanelSpec } from '../../knowledge/types';

function makeIntent(overrides?: Partial<ProjectIntent>): ProjectIntent {
  return {
    furniture_type: 'bibliotheque',
    material_key: 'cp_bouleau',
    space: {
      width_mm: 800,
      height_mm: 2000,
      depth_mm: 300,
      plinth_mm: 0,
      wall_type: 'concrete',
    },
    ...overrides,
  };
}

function fullPipeline(intent: ProjectIntent) {
  const { layout } = generateLayout(intent);
  const structure = generateStructure(layout, intent);
  const parts = generateParts(structure, layout, intent);
  return { layout, structure, parts };
}

describe('generateParts', () => {
  it('bibliothèque produces correct part count (2 joues + dessus/dessous + fond + 4 tablettes réglables)', () => {
    _resetPartCounter();
    const intent = makeIntent();
    const { parts } = fullPipeline(intent);

    // 2 joues + 1 dessus + 1 dessous + 1 fond + 4 tablettes réglables = 9 parts
    // No doors on bibliothèque, no fixed inner shelves (shelf_adjustable doesn't require them)
    const joues = parts.filter((p) => p.type === 'joue');
    const reglables = parts.filter((p) => p.type === 'tablette-reglable');
    const fond = parts.filter((p) => p.type === 'fond');
    const dessus = parts.filter((p) => p.type === 'dessus');
    const dessous = parts.filter((p) => p.type === 'dessous');

    expect(joues).toHaveLength(2);
    expect(reglables).toHaveLength(4);
    expect(fond).toHaveLength(1);
    expect(dessus).toHaveLength(1);
    expect(dessous).toHaveLength(1);
  });

  it('double door width is ~428mm for 850mm body with 2mm overlay', () => {
    // bodyOuterWidth=850, overlay=2, gapBetween=3
    // (850 + 2*2 - 3) / 2 = 851 / 2 = 425.5
    const w = computeOverlayDoubleDoorWidth(850, 2, 3);
    expect(w).toBeCloseTo(425.5, 1);
  });

  it('progressive drawer fronts are ascending with correct total', () => {
    const heights = computeProgressiveDrawerFronts(600, 3, 2, 2, 3, 20);
    // 3 drawers, step=20: h0=base, h1=base+20, h2=base+40
    // usable = 600 - 2 - 2 - 3*2 = 590
    // stepSum = 20 * 3 * 2 / 2 = 60
    // base = (590 - 60) / 3 = 176.67
    expect(heights).toHaveLength(3);
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    // Total should approximate usable height
    const total = heights.reduce((a, b) => a + b, 0);
    // Rounding may cause ±1mm drift
    expect(Math.abs(total - 590)).toBeLessThanOrEqual(2);
  });

  it('back panel dimensions for groove spec match inner dimensions', () => {
    const spec: BackPanelSpec = { type: 'groove', thickness_mm: 5 };
    const dims = computeBackPanelDimensions(spec, 764, 1964, 8);
    // groove: w = innerW, h = innerH (groove adds back what it subtracts)
    expect(dims.w).toBe(764);
    expect(dims.h).toBe(1964);
  });
});
