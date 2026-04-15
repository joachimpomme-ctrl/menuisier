import { beforeEach, describe, expect, it } from 'vitest';
import { runPipeline } from '../pipeline';
import { buildFacade2DModel, moduleIdToVisualHint } from '../facade2d';
import type { ModuleConfig, ProjectIntent } from '../../knowledge/types';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import { _resetPartCounter as resetGeom } from '../geometry';
import { _resetHwCounter as resetHw } from '../hardware';

function resetAll() {
  resetIntent();
  resetLayout();
  resetGeom();
  resetHw();
}

function makeIntent(overrides: Partial<ProjectIntent> & Pick<ProjectIntent, 'furniture_type'>): ProjectIntent {
  return {
    material_key: 'cp_bouleau',
    space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
    ...overrides,
  };
}

describe('moduleIdToVisualHint', () => {
  it('maps shelf_adjustable with count', () => {
    expect(
      moduleIdToVisualHint('shelf_adjustable', { type: 'shelf_adjustable', count: 5, spacing_mm: 300 }),
    ).toEqual({ type: 'shelves', count: 5 });
  });

  it('maps drawer_stack with count', () => {
    expect(
      moduleIdToVisualHint('drawer_stack', { type: 'drawer_stack', count: 3, distribution: 'equal' }),
    ).toEqual({ type: 'drawers', count: 3 });
  });

  it('maps hanging_rod_short', () => {
    expect(
      moduleIdToVisualHint('hanging_rod_short', { type: 'hanging_rod_short' }),
    ).toEqual({ type: 'hanging_rod', variant: 'short' });
  });

  it('maps tv_niche', () => {
    expect(
      moduleIdToVisualHint('tv_niche', { type: 'tv_niche', ventilation: true }),
    ).toEqual({ type: 'tv_niche' });
  });

  it('maps wine_rack with columns and rows', () => {
    expect(
      moduleIdToVisualHint('wine_rack', { type: 'wine_rack', columns: 3, rows: 5 }),
    ).toEqual({ type: 'wine_rack', columns: 3, rows: 5 });
  });

  it('maps unknown module to generic', () => {
    expect(
      moduleIdToVisualHint('future_module' as never, { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } as ModuleConfig),
    ).toEqual({ type: 'generic', label: 'future_module' });
  });
});

describe('buildFacade2DModel', () => {
  beforeEach(() => {
    resetAll();
  });

  it('builds a simple bibliothèque façade without doors or flags', () => {
    const result = runPipeline(makeIntent({ furniture_type: 'bibliotheque' }));
    const model = buildFacade2DModel(result);

    expect(model.bodies).toHaveLength(1);
    expect(model.bodies[0].zones[0].visualHint).toEqual({ type: 'shelves', count: 4 });
    expect(model.bodies[0].doors).toBeUndefined();
    expect(model.approximationFlags).not.toContain('generic_module');
  });

  it('marks a suspended meuble and keeps plinth at zero', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'etagere_murale',
      suspended_override: true,
      space: { width_mm: 800, height_mm: 400, depth_mm: 250, plinth_mm: 0, wall_type: 'concrete' },
    }));
    const model = buildFacade2DModel(result);

    expect(model.suspended).toBe(true);
    expect(model.plinthHeight_mm).toBe(0);
  });

  it('computes cumulative x_mm for multi-body layouts', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'bibliotheque',
      material_key: 'melamine',
      space: { width_mm: 1600, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
    }));
    const model = buildFacade2DModel(result);

    expect(model.bodies.length).toBeGreaterThan(1);
    expect(model.bodies[1].x_mm).toBe(model.bodies[0].width_mm);
  });

  it('copies doors from the layout when present', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'placard',
      space: { width_mm: 600, height_mm: 2000, depth_mm: 600, plinth_mm: 100, wall_type: 'concrete' },
    }));
    const model = buildFacade2DModel(result);

    expect(model.bodies[0].doors).toBeDefined();
    expect(model.bodies[0].doors?.count).toBe(2);
    expect(model.bodies[0].doors?.overlay).toBe('half');
  });

  it('maps drawer stack zones to drawered visual hints', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'commode',
      zones: [
        {
          module_id: 'drawer_stack',
          height_mm: 1200,
          config: { type: 'drawer_stack', count: 3, distribution: 'equal' },
        },
      ],
    }));
    const model = buildFacade2DModel(result);

    expect(model.bodies[0].zones[0].visualHint).toEqual({ type: 'drawers', count: 3 });
  });

  it('maps meuble tv niches to tv_niche visual hints', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'meuble_tv',
      space: { width_mm: 800, height_mm: 400, depth_mm: 450, plinth_mm: 0, wall_type: 'concrete' },
    }));
    const model = buildFacade2DModel(result);

    expect(model.bodies[0].zones[0].visualHint).toEqual({ type: 'tv_niche' });
  });

  it('adds non_orthogonal_geometry for sous_escalier', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'sous_escalier',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 400, plinth_mm: 0, wall_type: 'concrete' },
    }));
    const model = buildFacade2DModel(result);

    expect(model.approximationFlags).toContain('non_orthogonal_geometry');
  });

  it('adds partial_preset for table', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'table',
      space: { width_mm: 1200, height_mm: 750, depth_mm: 700, plinth_mm: 0, wall_type: 'concrete' },
    }));
    const model = buildFacade2DModel(result);

    expect(model.approximationFlags).toContain('partial_preset');
  });

  it('copies fixed shelves from the structure with top and bottom roles', () => {
    const result = runPipeline(makeIntent({ furniture_type: 'bibliotheque' }));
    const model = buildFacade2DModel(result);
    const roles = model.bodies[0].fixedShelves.map((shelf) => shelf.role);

    expect(roles).toContain('top');
    expect(roles).toContain('bottom');
  });

  it('stacks zone y positions cumulatively from the plinth height', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'bibliotheque',
      zones: [
        {
          module_id: 'shelf_adjustable',
          height_mm: 700,
          config: { type: 'shelf_adjustable', count: 2, spacing_mm: 300 },
        },
        {
          module_id: 'drawer_stack',
          height_mm: 500,
          config: { type: 'drawer_stack', count: 2, distribution: 'equal' },
        },
      ],
      space: { width_mm: 800, height_mm: 1400, depth_mm: 300, plinth_mm: 100, wall_type: 'concrete' },
    }));
    const model = buildFacade2DModel(result);

    expect(model.bodies[0].zones[0].y_mm).toBe(100);
    expect(model.bodies[0].zones[1].y_mm).toBe(
      model.bodies[0].zones[0].y_mm + model.bodies[0].zones[0].height_mm,
    );
  });
});
