import { describe, expect, it } from 'vitest';
import {
  computeInnerWidth,
  computeShelfDimensions,
  generateParts,
  _resetPartCounter,
} from '../geometry';
import { generateLayout } from '../layout';
import { generateStructure } from '../structure';
import type { ProjectIntent } from '../../knowledge/types';

function runParts(intent: ProjectIntent) {
  _resetPartCounter();
  const { layout } = generateLayout(intent);
  const structure = generateStructure(layout, intent);
  const parts = generateParts(structure, layout, intent);
  return { layout, structure, parts };
}

describe('shoe_rack_inclined geometry', () => {
  it('generates inclined shelves and stop bars for each tier', () => {
    const intent: ProjectIntent = {
      furniture_type: 'meuble_chaussures',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 1200, depth_mm: 320, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'shoe_rack_inclined',
          height_mm: 1200,
          config: { type: 'shoe_rack_inclined', tiers: 4 },
        },
      ],
    };

    const { layout, structure, parts } = runParts(intent);
    const inclined = parts.filter((part) => part.type === 'tablette-inclinee');
    const stopBars = parts.filter((part) => part.type === 'taquet-arret');
    const thickness = 18;
    const innerW = computeInnerWidth(layout.bodies[0].width_mm, thickness);
    const shelfDims = computeShelfDimensions(
      innerW,
      layout.bodies[0].depth_mm,
      structure.bodies[0].back_panel.thickness_mm,
    );

    expect(inclined).toHaveLength(4);
    expect(stopBars).toHaveLength(4);
    expect(inclined.every((part) => part.length_mm === innerW)).toBe(true);
    expect(inclined.every((part) => part.width_mm === shelfDims.width)).toBe(true);
    expect(stopBars.every((part) => part.length_mm === innerW)).toBe(true);
    expect(stopBars.every((part) => part.width_mm === 30)).toBe(true);
  });
});

describe('wine_rack geometry', () => {
  it('generates horizontal and vertical cross-pieces', () => {
    const intent: ProjectIntent = {
      furniture_type: 'cave_vin',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 1600, depth_mm: 350, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'wine_rack',
          height_mm: 1600,
          config: { type: 'wine_rack', columns: 4, rows: 4 },
        },
      ],
    };

    const { parts } = runParts(intent);
    const horizontal = parts.filter((part) => part.type === 'croisillon-h');
    const vertical = parts.filter((part) => part.type === 'croisillon-v');

    expect(horizontal).toHaveLength(3);
    expect(vertical).toHaveLength(3);
  });
});

describe('bench_storage geometry', () => {
  it('generates seat and front panel', () => {
    const intent: ProjectIntent = {
      furniture_type: 'banquette_coffre',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 500, depth_mm: 450, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'bench_storage',
          height_mm: 500,
          config: { type: 'bench_storage', has_backrest: false },
        },
      ],
    };

    const { layout, parts } = runParts(intent);
    const seats = parts.filter((part) => part.type === 'assise');
    const fronts = parts.filter((part) => part.type === 'devant-coffre');

    expect(seats).toHaveLength(1);
    expect(fronts).toHaveLength(1);
    expect(seats[0].width_mm).toBe(layout.bodies[0].depth_mm);
  });
});
