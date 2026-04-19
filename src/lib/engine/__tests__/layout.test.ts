import { describe, it, expect, beforeEach } from 'vitest';
import { generateLayout, _resetCounter } from '../layout';
import type { ProjectIntent } from '../../knowledge/types';

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

beforeEach(() => {
  _resetCounter();
});

describe('generateLayout', () => {
  it('bibliothèque with user-provided zones uses them as-is', () => {
    const intent = makeIntent({
      zones: [
        {
          module_id: 'shelf_adjustable',
          height_mm: 1000,
          config: { type: 'shelf_adjustable', count: 3, spacing_mm: 300 },
        },
        {
          module_id: 'shelf_adjustable',
          height_mm: 1000,
          config: { type: 'shelf_adjustable', count: 2, spacing_mm: 400 },
        },
      ],
    });

    const { layout, issues } = generateLayout(intent);

    expect(layout.bodies).toHaveLength(1);
    expect(layout.bodies[0].body_id).toBe('body_1');
    expect(layout.bodies[0].zones).toHaveLength(2);
    expect(layout.bodies[0].zones[0].config.type).toBe('shelf_adjustable');
    expect(layout.bodies[0].zones[1].config.type).toBe('shelf_adjustable');
    // No doors on bibliothèque
    expect(layout.bodies[0].doors).toBeUndefined();
    // No issues for valid shelves at 300mm depth
    expect(issues.filter((i) => i.blocking)).toHaveLength(0);
  });

  it('placard without zones gets default layout + doors', () => {
    const intent = makeIntent({
      furniture_type: 'placard',
      space: {
        width_mm: 1200,
        height_mm: 2400,
        depth_mm: 600,
        plinth_mm: 80,
        wall_type: 'plasterboard',
      },
    });

    const { layout, issues } = generateLayout(intent);
    const body = layout.bodies[0];

    // Default: hanging_rod_short + drawer_stack (from preset or hardcoded)
    expect(body.zones).toHaveLength(2);
    expect(body.zones[0].module_id).toBe('hanging_rod_short');
    // Second zone is drawer or shelf
    expect(['drawer_stack', 'shelf_adjustable']).toContain(body.zones[1].module_id);

    // Doors: 2 (width > 500), half overlay for double doors
    expect(body.doors).toBeDefined();
    expect(body.doors!.count).toBe(2);
    expect(body.doors!.overlay).toBe('half');

    // No blocking issues at 600mm depth
    expect(issues.filter((i) => i.blocking)).toHaveLength(0);
  });

  it('penderie in shallow depth produces blocking depth error', () => {
    const intent = makeIntent({
      furniture_type: 'bibliotheque',
      zones: [
        {
          module_id: 'hanging_rod_short',
          height_mm: 1500,
          config: { type: 'hanging_rod_short' },
        },
      ],
      space: {
        width_mm: 800,
        height_mm: 2000,
        depth_mm: 300, // min for hanging_rod_short is 550
        plinth_mm: 0,
        wall_type: 'concrete',
      },
    });

    const { issues } = generateLayout(intent);
    const depthError = issues.find((i) => i.rule_id === 'LAY_DEPTH_MIN');

    expect(depthError).toBeDefined();
    expect(depthError!.blocking).toBe(true);
    expect(depthError!.message).toContain('550');
  });

  it('wine rack over 30 bottles produces declarative module warning', () => {
    const intent = makeIntent({
      furniture_type: 'cave_vin',
      zones: [
        {
          module_id: 'wine_rack',
          height_mm: 1000,
          config: { type: 'wine_rack', columns: 6, rows: 6 },
        },
      ],
      space: {
        width_mm: 800,
        height_mm: 1200,
        depth_mm: 400,
        plinth_mm: 0,
        wall_type: 'concrete',
      },
    });

    const { issues } = generateLayout(intent);
    const wineRackWarning = issues.find((issue) =>
      issue.rule_id?.includes('WINE_RACK') &&
      issue.severity === 'warning',
    );

    expect(wineRackWarning).toBeDefined();
    expect(wineRackWarning!.message).toContain('Plus de 30 bouteilles');
  });

  it('shelf adjustable below min depth does not duplicate structural depth issue', () => {
    const intent = makeIntent({
      zones: [
        {
          module_id: 'shelf_adjustable',
          height_mm: 1000,
          config: { type: 'shelf_adjustable', count: 3, spacing_mm: 300 },
        },
      ],
      space: {
        width_mm: 800,
        height_mm: 2000,
        depth_mm: 100,
        plinth_mm: 0,
        wall_type: 'concrete',
      },
    });

    const { issues } = generateLayout(intent);

    expect(issues.filter((issue) => issue.rule_id === 'LAY_DEPTH_MIN')).toHaveLength(1);
    expect(issues.find((issue) => issue.rule_id === 'MOD_SHELF_ADJUSTABLE_CONSTRAINT')).toBeUndefined();
  });

  // ---------- NEW: multicorps tests ----------

  it('1600mm mélaminé (maxSpan 55cm) → 2 corps', () => {
    const intent = makeIntent({
      furniture_type: 'bibliotheque',
      material_key: 'melamine',
      space: {
        width_mm: 1600,
        height_mm: 2000,
        depth_mm: 300,
        plinth_mm: 0,
        wall_type: 'concrete',
      },
    });

    const { layout, issues } = generateLayout(intent);

    // maxSpan18 = 55cm = 550mm → max body width = 550 + 2×18 = 586mm
    // 1600 / 586 = 2.73 → 3 bodies
    expect(layout.bodies.length).toBeGreaterThanOrEqual(2);
    // All bodies should have valid widths
    for (const body of layout.bodies) {
      expect(body.width_mm).toBeLessThanOrEqual(586);
      expect(body.width_mm).toBeGreaterThan(0);
    }
    // Sum of widths = total
    const totalW = layout.bodies.reduce((s, b) => s + b.width_mm, 0);
    expect(totalW).toBe(1600);

    // Info issue about multicorps
    const multiInfo = issues.find((i) => i.rule_id === 'LAY_MULTI_BODY');
    expect(multiInfo).toBeDefined();
  });

  it('800mm CP bouleau (maxSpan 80cm) → 1 corps', () => {
    const intent = makeIntent({
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: {
        width_mm: 800,
        height_mm: 2000,
        depth_mm: 300,
        plinth_mm: 0,
        wall_type: 'concrete',
      },
    });

    const { layout, issues } = generateLayout(intent);

    // maxSpan18 = 80cm = 800mm → max body width = 800 + 2×18 = 836mm
    // 800 ≤ 836 → 1 body
    expect(layout.bodies).toHaveLength(1);
    expect(layout.bodies[0].width_mm).toBe(800);
    // No multicorps info
    expect(issues.find((i) => i.rule_id === 'LAY_MULTI_BODY')).toBeUndefined();
  });

  it('placard without zones gets coherent default (zones fill usable height)', () => {
    const intent = makeIntent({
      furniture_type: 'placard',
      space: {
        width_mm: 1000,
        height_mm: 2400,
        depth_mm: 600,
        plinth_mm: 80,
        wall_type: 'concrete',
      },
    });

    const { layout } = generateLayout(intent);
    const body = layout.bodies[0];

    // Usable height = 2400 - 80 = 2320
    const usableH = 2400 - 80;
    const totalZoneH = body.zones.reduce((s, z) => s + z.height_mm, 0);
    expect(totalZoneH).toBe(usableH);
  });

  it('double doors use half overlay', () => {
    // 800mm with cp_bouleau → maxBody 836mm → 1 body, 800 > 500 → 2 doors
    const intent = makeIntent({
      furniture_type: 'armoire',
      material_key: 'cp_bouleau',
      space: {
        width_mm: 800,
        height_mm: 2000,
        depth_mm: 550,
        plinth_mm: 0,
        wall_type: 'concrete',
      },
    });

    const { layout } = generateLayout(intent);
    expect(layout.bodies).toHaveLength(1);
    const body = layout.bodies[0];

    expect(body.doors).toBeDefined();
    expect(body.doors!.count).toBe(2);
    expect(body.doors!.overlay).toBe('half');
  });

  it('single door (narrow body) uses full overlay', () => {
    const intent = makeIntent({
      furniture_type: 'armoire',
      space: {
        width_mm: 450,
        height_mm: 2000,
        depth_mm: 550,
        plinth_mm: 0,
        wall_type: 'concrete',
      },
    });

    const { layout } = generateLayout(intent);
    const body = layout.bodies[0];

    expect(body.doors).toBeDefined();
    expect(body.doors!.count).toBe(1);
    expect(body.doors!.overlay).toBe('full');
  });
});
