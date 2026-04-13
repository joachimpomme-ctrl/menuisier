import { describe, it, expect } from 'vitest';
import { generateStructure } from '../structure';
import type { Layout, ProjectIntent } from '../../knowledge/types';

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

describe('generateStructure', () => {
  it('drawer_stack produces fixed shelves above and below', () => {
    const layout: Layout = {
      bodies: [
        {
          body_id: 'body_1',
          width_mm: 800,
          height_mm: 2000,
          depth_mm: 600,
          zones: [
            {
              module_id: 'shelf_adjustable',
              height_mm: 1400,
              config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 },
            },
            {
              module_id: 'drawer_stack',
              height_mm: 600,
              config: { type: 'drawer_stack', count: 3, distribution: 'equal' },
            },
          ],
        },
      ],
    };

    const structure = generateStructure(layout, makeIntent());
    const body = structure.bodies[0];

    // drawer_stack requires fixed shelf above AND below
    // Plus always top + bottom + zone separator at 1400mm
    // Bottom at 0, zone_separator/support at 1400, support at 2000, top at 2000
    const shelfYs = body.fixed_shelves.map((s) => s.y_mm);
    expect(shelfYs).toContain(0);    // bottom
    expect(shelfYs).toContain(1400); // drawer below / zone separator
    expect(shelfYs).toContain(2000); // top / drawer above
    // All unique
    expect(new Set(shelfYs).size).toBe(shelfYs.length);
  });

  it('height 2000mm gets back_panel bracing', () => {
    const layout: Layout = {
      bodies: [
        {
          body_id: 'body_1',
          width_mm: 800,
          height_mm: 2000,
          depth_mm: 300,
          zones: [
            {
              module_id: 'shelf_adjustable',
              height_mm: 2000,
              config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 },
            },
          ],
        },
      ],
    };

    const structure = generateStructure(layout, makeIntent());
    expect(structure.bodies[0].bracing).toBe('back_panel');
  });

  it('suspended (etagere_murale) gets rail mounting and recess back panel', () => {
    const intent = makeIntent({
      furniture_type: 'etagere_murale',
      space: {
        width_mm: 600,
        height_mm: 800,
        depth_mm: 200,
        plinth_mm: 0,
        wall_type: 'plasterboard',
      },
    });

    const layout: Layout = {
      bodies: [
        {
          body_id: 'body_1',
          width_mm: 600,
          height_mm: 800,
          depth_mm: 200,
          zones: [
            {
              module_id: 'shelf_adjustable',
              height_mm: 800,
              config: { type: 'shelf_adjustable', count: 2, spacing_mm: 300 },
            },
          ],
        },
      ],
    };

    const structure = generateStructure(layout, intent);
    const body = structure.bodies[0];

    expect(body.wall_mounting).toBeDefined();
    expect(body.wall_mounting!.type).toBe('rail');
    expect(body.bracing).toBe('wall_mount');
    expect(body.plinth.type).toBe('none');
    expect(body.back_panel.type).toBe('groove');
    expect(body.back_panel.thickness_mm).toBe(5);
  });

  it('height 1800mm gets anti-tip mounting', () => {
    const intent = makeIntent({
      space: {
        width_mm: 800,
        height_mm: 1800,
        depth_mm: 400,
        plinth_mm: 80,
        wall_type: 'concrete',
      },
    });

    const layout: Layout = {
      bodies: [
        {
          body_id: 'body_1',
          width_mm: 800,
          height_mm: 1800,
          depth_mm: 400,
          zones: [
            {
              module_id: 'shelf_adjustable',
              height_mm: 1720,
              config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 },
            },
          ],
        },
      ],
    };

    const structure = generateStructure(layout, intent);
    const body = structure.bodies[0];

    expect(body.wall_mounting).toBeDefined();
    expect(body.wall_mounting!.type).toBe('anti_tip');
    expect(body.wall_mounting!.position_y_mm).toBe(1620); // 1800 * 0.9
    expect(body.plinth.type).toBe('legs');
    expect(body.plinth.height_mm).toBe(80);
  });
});
