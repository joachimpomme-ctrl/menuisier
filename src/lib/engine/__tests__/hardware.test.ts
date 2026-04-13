import { describe, it, expect, beforeEach } from 'vitest';
import { selectHardware, _resetHwCounter } from '../hardware';
import { generateLayout } from '../layout';
import { generateStructure } from '../structure';
import { generateParts, _resetPartCounter } from '../geometry';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import type { ProjectIntent } from '../../knowledge/types';

function fullParts(intent: ProjectIntent) {
  const { layout } = generateLayout(intent);
  const structure = generateStructure(layout, intent);
  const parts = generateParts(structure, layout, intent);
  return { parts, structure };
}

beforeEach(() => {
  _resetHwCounter();
  _resetPartCounter();
  resetIntent();
  resetLayout();
});

describe('selectHardware', () => {
  it('bibliothèque with 4 adjustable shelves gets 16 shelf pins + confirmat screws', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    };
    const { parts, structure } = fullParts(intent);
    const hw = selectHardware(parts, structure, intent);

    const pins = hw.find((h) => h.reference === 'taquet_5mm');
    expect(pins).toBeDefined();
    expect(pins!.quantity).toBe(16); // 4 shelves × 4 pins

    const screws = hw.find((h) => h.reference === 'confirmat_7x50');
    expect(screws).toBeDefined();
    expect(screws!.quantity).toBeGreaterThan(0);
  });

  it('placard with doors gets hinges and handles', () => {
    // 550mm cp_bouleau → single body (maxBody 836mm)
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 550, height_mm: 2400, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 1400, config: { type: 'hanging_rod_short' } },
        { module_id: 'drawer_stack', height_mm: 920, config: { type: 'drawer_stack', count: 3, distribution: 'progressive' } },
      ],
    };
    const { parts, structure } = fullParts(intent);
    const hw = selectHardware(parts, structure, intent);

    const hinges = hw.find((h) => h.category === 'hinge');
    expect(hinges).toBeDefined();
    expect(hinges!.quantity).toBeGreaterThanOrEqual(4); // 2 doors × min 2 hinges

    const handles = hw.filter((h) => h.category === 'handle');
    expect(handles.length).toBeGreaterThan(0);

    // Slides for 3 drawers
    const slides = hw.find((h) => h.category === 'slide');
    expect(slides).toBeDefined();
    expect(slides!.quantity).toBe(6); // 3 drawers × 2 slides
  });

  it('tall furniture (1800mm) gets anti-tip hardware', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 1800, depth_mm: 300, plinth_mm: 80, wall_type: 'concrete' },
    };
    const { parts, structure } = fullParts(intent);
    const hw = selectHardware(parts, structure, intent);

    const antiTip = hw.find((h) => h.reference === 'anti_tip');
    expect(antiTip).toBeDefined();
    expect(antiTip!.quantity).toBe(1);

    // Also has adjustable legs
    const legs = hw.find((h) => h.reference === 'pied_reglable');
    expect(legs).toBeDefined();
    expect(legs!.quantity).toBeGreaterThanOrEqual(4);
  });

  it('suspended (etagere_murale) gets rail + boîtiers', () => {
    const intent: ProjectIntent = {
      furniture_type: 'etagere_murale',
      material_key: 'cp_bouleau',
      space: { width_mm: 600, height_mm: 800, depth_mm: 200, plinth_mm: 0, wall_type: 'plasterboard' },
    };
    const { parts, structure } = fullParts(intent);
    const hw = selectHardware(parts, structure, intent);

    const rail = hw.find((h) => h.reference === 'rail_suspension');
    expect(rail).toBeDefined();
    expect(rail!.quantity).toBe(1);

    const boitiers = hw.find((h) => h.reference === 'boitier_suspension');
    expect(boitiers).toBeDefined();
    expect(boitiers!.quantity).toBe(2);

    // No legs for suspended
    const legs = hw.find((h) => h.reference === 'pied_reglable');
    expect(legs).toBeUndefined();
  });
});
