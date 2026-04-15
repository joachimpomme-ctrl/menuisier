import { describe, expect, it } from 'vitest';
import type { Facade2DModel } from '../../../lib/engine/facade2d';
import {
  M,
  SVG_W,
  computeFacadeScale,
  computeFacadeSvgHeight,
  facadeYToSvg,
  getFacadeBodyX,
  getOrderedZones,
  hasFacadeWarnings,
} from '../Facade2DView';

function makeModel(overrides: Partial<Facade2DModel> = {}): Facade2DModel {
  return {
    totalWidth_mm: 800,
    totalHeight_mm: 2000,
    plinthHeight_mm: 100,
    suspended: false,
    bodies: [
      {
        bodyId: 'body_1',
        x_mm: 0,
        width_mm: 400,
        height_mm: 2000,
        zones: [
          { moduleId: 'drawer_stack', y_mm: 700, height_mm: 300, visualHint: { type: 'drawers', count: 2 } },
          { moduleId: 'shelf_adjustable', y_mm: 100, height_mm: 600, visualHint: { type: 'shelves', count: 4 } },
        ],
        fixedShelves: [
          { y_mm: 0, role: 'bottom' },
          { y_mm: 2000, role: 'top' },
        ],
      },
      {
        bodyId: 'body_2',
        x_mm: 400,
        width_mm: 400,
        height_mm: 2000,
        zones: [
          { moduleId: 'tv_niche', y_mm: 100, height_mm: 900, visualHint: { type: 'tv_niche' } },
        ],
        fixedShelves: [
          { y_mm: 0, role: 'bottom' },
          { y_mm: 2000, role: 'top' },
        ],
      },
    ],
    approximationFlags: [],
    warnings: [],
    ...overrides,
  };
}

describe('Facade2DView helpers', () => {
  it('computes the expected scale for an 800x2000 model in a 600px canvas', () => {
    const model = makeModel();
    const scale = computeFacadeScale(model);

    expect(scale).toBeCloseTo(0.2, 4);
    expect(scale).toBe(Math.min((SVG_W - M * 2) / 800, 400 / 2000));
  });

  it('inverts Y coordinates from model space to SVG space', () => {
    const model = makeModel();
    const scale = computeFacadeScale(model);
    const svgHeight = computeFacadeSvgHeight(model, scale);

    expect(facadeYToSvg(0, scale, svgHeight)).toBe(svgHeight - M);
    expect(facadeYToSvg(model.totalHeight_mm, scale, svgHeight)).toBe(M);
  });

  it('computes cumulative X positions for adjacent bodies', () => {
    const model = makeModel();
    const scale = computeFacadeScale(model);

    expect(getFacadeBodyX(model.bodies[0], scale)).toBe(M);
    expect(getFacadeBodyX(model.bodies[1], scale)).toBe(M + model.bodies[0].width_mm * scale);
  });

  it('orders zones in ascending vertical order', () => {
    const model = makeModel();

    const ordered = getOrderedZones(model.bodies[0]);

    expect(ordered.map((zone) => zone.y_mm)).toEqual([100, 700]);
  });

  it('reports warnings when the model contains warnings', () => {
    expect(hasFacadeWarnings(makeModel({ warnings: ['Approximation'] }))).toBe(true);
  });

  it('reports no warnings when the model warning list is empty', () => {
    expect(hasFacadeWarnings(makeModel({ warnings: [] }))).toBe(false);
  });
});
