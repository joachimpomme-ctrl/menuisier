import { describe, it, expect, beforeEach } from 'vitest';
import { runPipeline } from '../pipeline';
import type { ProjectIntent } from '../../knowledge/types';
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

/**
 * Helper: builds a standard ProjectIntent with sensible defaults.
 * Callers override only the fields they care about.
 */
function makeIntent(overrides: Partial<ProjectIntent> & Pick<ProjectIntent, 'furniture_type'>): ProjectIntent {
  return {
    material_key: 'cp_bouleau',
    space: { width_mm: 800, height_mm: 2000, depth_mm: 500, plinth_mm: 100, wall_type: 'concrete' },
    ...overrides,
  };
}

describe('variant overrides', () => {
  beforeEach(() => {
    resetAll();
  });

  // =========================================================================
  // 1. door_override=false suppresses doors on placard
  // =========================================================================
  it('door_override=false suppresses doors on placard', () => {
    const intent = makeIntent({
      furniture_type: 'placard',
      door_override: false,
      space: { width_mm: 800, height_mm: 2000, depth_mm: 600, plinth_mm: 100, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'hanging_rod_short',
          height_mm: 1140,
          config: { type: 'hanging_rod_short' },
        },
        {
          module_id: 'shelf_adjustable',
          height_mm: 760,
          config: { type: 'shelf_adjustable', count: 3, spacing_mm: 250 },
        },
      ],
    });

    const result = runPipeline(intent);

    // No blocking issues
    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // No door parts at all
    const porteParts = result.parts.filter((p) => p.type === 'porte');
    expect(porteParts).toHaveLength(0);

    // Layout body should have no doors
    expect(result.layout.bodies[0].doors).toBeUndefined();

    // No hinge hardware either
    expect(result.hardware.find((h) => h.category === 'hinge')).toBeUndefined();
  });

  // =========================================================================
  // 2. door_override=true adds doors on bibliotheque
  // =========================================================================
  it('door_override=true adds doors on bibliotheque', () => {
    const intent = makeIntent({
      furniture_type: 'bibliotheque',
      door_override: true,
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'shelf_adjustable',
          height_mm: 2000,
          config: { type: 'shelf_adjustable', count: 5, spacing_mm: 350 },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // Should now have door parts
    const porteParts = result.parts.filter((p) => p.type === 'porte');
    expect(porteParts.length).toBeGreaterThan(0);

    // Layout body should have doors defined
    expect(result.layout.bodies[0].doors).toBeDefined();
    expect(result.layout.bodies[0].doors!.type).toBe('hinged');

    // Hinge hardware present
    expect(result.hardware.find((h) => h.category === 'hinge')).toBeDefined();
  });

  // =========================================================================
  // 3. suspended_override=true on bibliotheque triggers rail mounting
  // =========================================================================
  it('suspended_override=true on bibliotheque triggers rail mounting', () => {
    const intent = makeIntent({
      furniture_type: 'bibliotheque',
      suspended_override: true,
      space: { width_mm: 800, height_mm: 600, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'shelf_adjustable',
          height_mm: 600,
          config: { type: 'shelf_adjustable', count: 3, spacing_mm: 180 },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // Structure has rail wall mounting
    const bodyStruct = result.structure.bodies[0];
    expect(bodyStruct.wall_mounting).toBeDefined();
    expect(bodyStruct.wall_mounting!.type).toBe('rail');

    // Suspended means no legs
    expect(bodyStruct.plinth.type).not.toBe('legs');
    expect(bodyStruct.plinth.type).toBe('none');

    // Hardware includes suspension rail and boîtiers
    expect(result.hardware.find((h) => h.reference === 'rail_suspension')).toBeDefined();
    expect(result.hardware.find((h) => h.reference === 'boitier_suspension')).toBeDefined();

    // No adjustable legs in hardware
    expect(result.hardware.find((h) => h.reference === 'pied_reglable')).toBeUndefined();
  });

  // =========================================================================
  // 4. Penderie simple variant — placard with hanging rod + shelves
  // =========================================================================
  it('penderie simple: placard with tringle and shelves', () => {
    const usableHeight = 2000 - 100; // height - plinth
    const rodHeight = Math.round(usableHeight * 0.6); // 1140mm
    const shelfHeight = usableHeight - rodHeight;       // 760mm

    const intent = makeIntent({
      furniture_type: 'placard',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 600, plinth_mm: 100, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'hanging_rod_short',
          height_mm: rodHeight,
          config: { type: 'hanging_rod_short' },
        },
        {
          module_id: 'shelf_adjustable',
          height_mm: shelfHeight,
          config: { type: 'shelf_adjustable', count: 1, spacing_mm: shelfHeight },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // Hardware includes rod items
    const rodItems = result.hardware.filter((h) => h.category === 'rod');
    expect(rodItems.length).toBeGreaterThan(0);
    expect(result.hardware.find((h) => h.reference === 'tringle_25mm')).toBeDefined();
    expect(result.hardware.find((h) => h.reference === 'support_tringle_25')).toBeDefined();

    // Placard normally gets doors (door_override not set → defaults to true for placard)
    expect(result.layout.bodies[0].doors).toBeDefined();
  });

  // =========================================================================
  // 5. Dressing complet — placard with 2 tringles + 3 drawers + 4 shelves
  // =========================================================================
  it('dressing complet: placard with 2 tringles, 3 drawers, 4 shelves', () => {
    const intent = makeIntent({
      furniture_type: 'placard',
      space: { width_mm: 800, height_mm: 2400, depth_mm: 600, plinth_mm: 100, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'hanging_rod_short',
          height_mm: 900,
          config: { type: 'hanging_rod_short' },
        },
        {
          module_id: 'hanging_rod_short',
          height_mm: 400,
          config: { type: 'hanging_rod_short' },
        },
        {
          module_id: 'drawer_stack',
          height_mm: 500,
          config: { type: 'drawer_stack', count: 3, distribution: 'equal' },
        },
        {
          module_id: 'shelf_adjustable',
          height_mm: 500,
          config: { type: 'shelf_adjustable', count: 4, spacing_mm: 120 },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // Drawer facade parts
    const facades = result.parts.filter((p) => p.type === 'tiroir-facade');
    expect(facades).toHaveLength(3);

    // Slides in hardware (3 drawers × 2 = 6)
    const slides = result.hardware.find((h) => h.category === 'slide');
    expect(slides).toBeDefined();
    expect(slides!.quantity).toBe(6);

    // Rod hardware for 2 tringles
    const rods = result.hardware.find((h) => h.reference === 'tringle_25mm');
    expect(rods).toBeDefined();
    expect(rods!.quantity).toBe(2);

    // Adjustable shelves
    const adjShelves = result.parts.filter((p) => p.type === 'tablette-reglable');
    expect(adjShelves).toHaveLength(4);
  });

  // =========================================================================
  // 6. Casserolier — cuisine with door_override=false, drawers only
  // =========================================================================
  it('casserolier: cuisine with door_override=false suppresses doors', () => {
    const intent = makeIntent({
      furniture_type: 'cuisine',
      door_override: false,
      space: { width_mm: 580, height_mm: 720, depth_mm: 560, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'drawer_stack',
          height_mm: 640,
          config: { type: 'drawer_stack', count: 3, distribution: 'progressive' },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // No porte parts despite cuisine normally getting doors
    const porteParts = result.parts.filter((p) => p.type === 'porte');
    expect(porteParts).toHaveLength(0);

    // No doors in layout
    expect(result.layout.bodies[0].doors).toBeUndefined();

    // No hinges
    expect(result.hardware.find((h) => h.category === 'hinge')).toBeUndefined();

    // But drawers are present
    const facades = result.parts.filter((p) => p.type === 'tiroir-facade');
    expect(facades).toHaveLength(3);

    // Slides are present
    expect(result.hardware.find((h) => h.category === 'slide')).toBeDefined();
  });

  // =========================================================================
  // 7. Meuble TV suspendu — suspended_override=true
  // =========================================================================
  it('meuble TV suspendu: suspended_override=true triggers rail mounting', () => {
    const intent = makeIntent({
      furniture_type: 'meuble_tv',
      suspended_override: true,
      space: { width_mm: 800, height_mm: 400, depth_mm: 450, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'tv_niche',
          height_mm: 200,
          config: { type: 'tv_niche', ventilation: true },
        },
        {
          module_id: 'shelf_adjustable',
          height_mm: 200,
          config: { type: 'shelf_adjustable', count: 2, spacing_mm: 200 },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // Structure has rail wall mounting
    const bodyStruct = result.structure.bodies[0];
    expect(bodyStruct.wall_mounting).toBeDefined();
    expect(bodyStruct.wall_mounting!.type).toBe('rail');

    // No legs
    expect(bodyStruct.plinth.type).toBe('none');

    // Hardware includes rail
    expect(result.hardware.find((h) => h.reference === 'rail_suspension')).toBeDefined();
    expect(result.hardware.find((h) => h.reference === 'boitier_suspension')).toBeDefined();

    // No adjustable legs
    expect(result.hardware.find((h) => h.reference === 'pied_reglable')).toBeUndefined();

    // Meuble TV normally has no doors — stays that way
    expect(result.layout.bodies[0].doors).toBeUndefined();
  });

  // =========================================================================
  // Combination tests
  // =========================================================================
  it('door_override=true + suspended_override=true combine correctly', () => {
    const intent = makeIntent({
      furniture_type: 'bibliotheque',
      door_override: true,
      suspended_override: true,
      space: { width_mm: 800, height_mm: 600, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'shelf_adjustable',
          height_mm: 600,
          config: { type: 'shelf_adjustable', count: 3, spacing_mm: 180 },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // Has doors (forced via override)
    expect(result.layout.bodies[0].doors).toBeDefined();
    expect(result.parts.filter((p) => p.type === 'porte').length).toBeGreaterThan(0);

    // Is suspended (rail mounting, no legs)
    expect(result.structure.bodies[0].wall_mounting?.type).toBe('rail');
    expect(result.structure.bodies[0].plinth.type).toBe('none');
  });

  it('door_override=false on placard still produces rods and shelves', () => {
    const intent = makeIntent({
      furniture_type: 'placard',
      door_override: false,
      space: { width_mm: 800, height_mm: 2000, depth_mm: 600, plinth_mm: 100, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'hanging_rod_short',
          height_mm: 1140,
          config: { type: 'hanging_rod_short' },
        },
        {
          module_id: 'shelf_adjustable',
          height_mm: 760,
          config: { type: 'shelf_adjustable', count: 2, spacing_mm: 350 },
        },
      ],
    });

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // No doors
    expect(result.parts.filter((p) => p.type === 'porte')).toHaveLength(0);

    // But rods and shelves are still generated
    expect(result.hardware.find((h) => h.reference === 'tringle_25mm')).toBeDefined();
    const adjShelves = result.parts.filter((p) => p.type === 'tablette-reglable');
    expect(adjShelves).toHaveLength(2);

    // Sides, top, bottom, fond still present
    expect(result.parts.filter((p) => p.type === 'joue')).toHaveLength(2);
    expect(result.parts.filter((p) => p.type === 'fond')).toHaveLength(1);
  });
});
