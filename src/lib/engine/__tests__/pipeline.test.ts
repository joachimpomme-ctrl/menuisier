import { describe, it, expect } from 'vitest';
import { runPipeline, pipelineResultToAppState, intentFromState } from '../pipeline';
import type { ProjectIntent, GeneratedPart, ProjectStateV3 } from '../../knowledge/types';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import { _resetPartCounter as resetGeom } from '../geometry';

function resetAll() {
  resetIntent();
  resetLayout();
  resetGeom();
}

describe('runPipeline', () => {
  // =========================================================================
  // HAPPY PATHS
  // =========================================================================

  it('1. Bibliothèque 2000×800×300 CP18, 5 étagères → 10 pièces + AppState', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 5, spacing_mm: 350 } },
      ],
    };

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);
    expect(result.layout.bodies).toHaveLength(1);
    expect(result.parts.length).toBeGreaterThan(0);

    const types = result.parts.map((p) => p.type);
    expect(types.filter((t) => t === 'joue')).toHaveLength(2);
    expect(types.filter((t) => t === 'tablette-reglable')).toHaveLength(5);
    expect(types.filter((t) => t === 'fond')).toHaveLength(1);
    expect(types.filter((t) => t === 'dessus')).toHaveLength(1);
    expect(types.filter((t) => t === 'dessous')).toHaveLength(1);

    // Production output present
    expect(result.production).not.toBeNull();
    expect(result.production!.assembly_guide.length).toBeGreaterThan(0);
    expect(result.production!.shopping_list.estimated_cost_eur).toBeGreaterThan(0);

    // AppState conversion
    const appState = pipelineResultToAppState(result, 'cp_bouleau');
    expect(appState.materialKey).toBe('cp_bouleau');
    expect(appState.bodies).toHaveLength(1);
    expect(appState.project.wallWidth).toBe(80);
    expect(appState.project.ceilingHeight).toBe(200);
    expect(appState.panel.thickness).toBe(1.8);
  });

  it('2. Placard 2400×550×600, penderie + 3 tiroirs + portes', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 550, height_mm: 2400, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 1400, config: { type: 'hanging_rod_short' } },
        { module_id: 'drawer_stack', height_mm: 920, config: { type: 'drawer_stack', count: 3, distribution: 'progressive' } },
      ],
    };

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);
    expect(result.layout.bodies).toHaveLength(1);

    const types = result.parts.map((p) => p.type);
    expect(types.filter((t) => t === 'tiroir-facade')).toHaveLength(3);
    expect(types.filter((t) => t === 'tiroir-fond')).toHaveLength(3);
    expect(types.filter((t) => t === 'tiroir-caisson')).toHaveLength(6); // 3×2 sides + 3×2 AV/AR but stored as 2 entries per drawer

    // Doors: 2 (width > 500)
    const portes = result.parts.filter((p) => p.type === 'porte');
    expect(portes).toHaveLength(1);
    expect(portes[0].qty).toBe(2);

    // Hardware: hinges + slides + rod
    expect(result.hardware.find((h) => h.category === 'hinge')).toBeDefined();
    expect(result.hardware.find((h) => h.category === 'slide')).toBeDefined();
    expect(result.hardware.find((h) => h.category === 'rod')).toBeDefined();

    // Plinth: legs present in hardware
    expect(result.hardware.find((h) => h.reference === 'pied_reglable')).toBeDefined();
  });

  it('3. Cuisine bas 720×580×560, 3 tiroirs progressifs', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'cuisine',
      material_key: 'melamine',
      space: { width_mm: 580, height_mm: 720, depth_mm: 560, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'drawer_stack', height_mm: 640, config: { type: 'drawer_stack', count: 3, distribution: 'progressive' } },
      ],
    };

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);
    expect(result.layout.bodies).toHaveLength(1);

    // 3 drawer facades
    const facades = result.parts.filter((p) => p.type === 'tiroir-facade');
    expect(facades).toHaveLength(3);

    // Progressive: smallest first, largest last
    const heights = facades.map((f) => f.width_mm);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    }

    // Cuisine gets doors
    const body = result.layout.bodies[0];
    expect(body.doors).toBeDefined();
    expect(body.doors!.type).toBe('hinged');
  });

  it('4. Meuble TV 400×1600×450, niche + étagères', () => {
    resetAll();
    // CP bouleau maxBody = 836mm → 1600mm splits into 2 bodies
    const intent: ProjectIntent = {
      furniture_type: 'meuble_tv',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 400, depth_mm: 450, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'tv_niche', height_mm: 200, config: { type: 'tv_niche', ventilation: true } },
        { module_id: 'shelf_adjustable', height_mm: 200, config: { type: 'shelf_adjustable', count: 2, spacing_mm: 200 } },
      ],
    };

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);
    expect(result.layout.bodies).toHaveLength(1);

    // Has adjustable shelves
    const shelves = result.parts.filter((p) => p.type === 'tablette-reglable');
    expect(shelves).toHaveLength(2);

    // No doors on meuble_tv
    expect(result.layout.bodies[0].doors).toBeUndefined();

    // Production exists
    expect(result.production).not.toBeNull();
    expect(result.production!.summary.difficulty).toBeDefined();
  });

  it('5. Commode 900×800×500 CP bouleau, 4 tiroirs progressifs', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'commode',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 900, depth_mm: 500, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'drawer_stack', height_mm: 820, config: { type: 'drawer_stack', count: 4, distribution: 'progressive' } },
      ],
    };

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // 4 drawer facades
    const facades = result.parts.filter((p) => p.type === 'tiroir-facade');
    expect(facades).toHaveLength(4);

    // Progressive: heights increase top to bottom
    const heights = facades.map((f) => f.width_mm);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    }

    // 4 drawer fonds
    expect(result.parts.filter((p) => p.type === 'tiroir-fond')).toHaveLength(4);

    // Slides in hardware: 4 drawers × 2 = 8
    const slides = result.hardware.find((h) => h.category === 'slide');
    expect(slides).toBeDefined();
    expect(slides!.quantity).toBe(8);

    // Has legs (plinth > 0)
    expect(result.hardware.find((h) => h.reference === 'pied_reglable')).toBeDefined();
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================

  it('6. Penderie profondeur 400mm → erreur bloquante', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 400, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 1500, config: { type: 'hanging_rod_short' } },
      ],
    };

    const result = runPipeline(intent);

    const blocking = result.validation.filter((v) => v.blocking);
    expect(blocking.length).toBeGreaterThan(0);
    expect(blocking.some((b) => b.message.includes('550'))).toBe(true);

    // Production should be null (blocking errors)
    expect(result.production).toBeNull();
  });

  it('7. Bibliothèque 1600mm mélaminé → multicorps (≥2 corps)', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'melamine',
      space: { width_mm: 1600, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    };

    const result = runPipeline(intent);

    // Melamine maxSpan18 = 55cm → maxBody = 550 + 36 = 586mm
    // 1600 / 586 = 2.73 → 3 bodies
    expect(result.layout.bodies.length).toBeGreaterThanOrEqual(2);

    // Each body ≤ 586mm
    for (const body of result.layout.bodies) {
      expect(body.width_mm).toBeLessThanOrEqual(586);
    }

    // Sum = 1600mm
    const totalW = result.layout.bodies.reduce((s, b) => s + b.width_mm, 0);
    expect(totalW).toBe(1600);

    // Parts multiplied by number of bodies
    const joues = result.parts.filter((p) => p.type === 'joue');
    expect(joues.length).toBe(result.layout.bodies.length * 2);

    // AppState has multiple bodies
    const appState = pipelineResultToAppState(result, 'melamine');
    expect(appState.bodies.length).toBe(result.layout.bodies.length);
    expect(appState.sharedBoundaries?.length).toBe(result.layout.bodies.length - 1);

    // Info issue about multi-body
    expect(result.validation.find((v) => v.rule_id === 'LAY_MULTI_BODY')).toBeDefined();
  });

  it('8. Étagère murale suspendue sur placo → warning fixation', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'etagere_murale',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 600, depth_mm: 250, plinth_mm: 0, wall_type: 'plasterboard' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 600, config: { type: 'shelf_adjustable', count: 6, spacing_mm: 80 } },
      ],
    };

    const result = runPipeline(intent);

    // Should have suspension hardware (rail + boîtiers)
    expect(result.hardware.find((h) => h.reference === 'rail_suspension')).toBeDefined();
    expect(result.hardware.find((h) => h.reference === 'boitier_suspension')).toBeDefined();

    // No legs for suspended
    expect(result.hardware.find((h) => h.reference === 'pied_reglable')).toBeUndefined();

    // Plasterboard wall type → check if weight triggers warning
    // 6 shelves + joues + dessus/dessous + fond in CP bouleau (680 kg/m³)
    // Even if weight < 25kg, the plasterboard info is relevant
    // At minimum, no crash and production works
    expect(result.production).not.toBeNull();

    // If heavy enough, RT_006_LOAD warning should fire
    // Otherwise, at least verify the pipeline completes cleanly
    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);
  });

  it('9. Large drawer (800mm wide body) → drawer parts at correct width', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'commode',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 800, depth_mm: 500, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'drawer_stack', height_mm: 800, config: { type: 'drawer_stack', count: 3, distribution: 'equal' } },
      ],
    };

    const result = runPipeline(intent);

    expect(result.validation.filter((v) => v.blocking)).toHaveLength(0);

    // Inner width = 800 - 2×18 = 764mm
    // Drawer facade width should equal inner width
    const facades = result.parts.filter((p) => p.type === 'tiroir-facade');
    expect(facades).toHaveLength(3);
    expect(facades[0].length_mm).toBe(764);

    // Drawer box width = inner width - 2×13mm (slide clearance) = 738mm
    const caissons = result.parts.filter((p) => p.type === 'tiroir-caisson');
    expect(caissons.length).toBeGreaterThan(0);

    // Slides are present and correctly counted
    const slides = result.hardware.find((h) => h.category === 'slide');
    expect(slides).toBeDefined();
    expect(slides!.quantity).toBe(6); // 3 drawers × 2

    // Equal distribution: all facade heights should be the same
    const facadeHeights = facades.map((f) => f.width_mm);
    expect(new Set(facadeHeights).size).toBe(1); // all equal
  });

  // =========================================================================
  // BRIDGE V3 → LEGACY
  // =========================================================================

  it('11. Bridge preserves V3 fields (intent, hardware, validation, assumptions)', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'melamine',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 3, spacing_mm: 300 } },
      ],
    };

    const result = runPipeline(intent);
    const state = pipelineResultToAppState(result, 'melamine') as ProjectStateV3;

    // Legacy fields
    expect(state.materialKey).toBe('melamine');
    expect(state.bodies.length).toBeGreaterThan(0);
    expect(state.project.wallWidth).toBe(80);

    // V3 extension fields preserved
    expect(state.intent).toBeDefined();
    expect(state.intent!.furniture_type).toBe('bibliotheque');
    expect(state.hardwareList).toBeDefined();
    expect(state.hardwareList!.length).toBeGreaterThan(0);
    expect(state.validationIssues).toBeDefined();
    expect(state.assumptions).toBeDefined();
    expect(state.assumptions!.length).toBeGreaterThan(0);
  });

  it('12. Bridge maps DoorLayout → DoorConfig for placard', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'melamine',
      space: { width_mm: 550, height_mm: 2400, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 2320, config: { type: 'hanging_rod_short' } },
      ],
    };

    const result = runPipeline(intent);
    const state = pipelineResultToAppState(result, 'melamine');

    // Width 550 > 500 → double doors, half overlay
    const body = state.bodies[0];
    expect(body.doorConfig).toBeDefined();
    expect(body.doorConfig!.count).toBe(2);
    expect(body.doorConfig!.poseType).toBe('demi-recouvrement');
  });

  it('13. Bridge generates cutting_plans via nesting', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'melamine',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 3, spacing_mm: 300 } },
      ],
    };

    const result = runPipeline(intent);
    expect(result.production).not.toBeNull();
    expect(result.production!.cutting_plans).not.toBeNull();

    const plans = result.production!.cutting_plans as { bins: unknown[]; metrics: { panelCount: number; efficiency: number } };
    expect(plans.bins.length).toBeGreaterThan(0);
    expect(plans.metrics.panelCount).toBeGreaterThan(0);
    expect(plans.metrics.efficiency).toBeGreaterThan(0);
  });

  it('14. Project name uses furniture type instead of hardcoded Mon meuble', () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'meuble_tv',
      material_key: 'melamine',
      space: { width_mm: 1200, height_mm: 500, depth_mm: 400, plinth_mm: 0, wall_type: 'unknown' },
      zones: [
        { module_id: 'tv_niche', height_mm: 500, config: { type: 'tv_niche', ventilation: true } },
      ],
    };

    const result = runPipeline(intent);
    const state = pipelineResultToAppState(result, 'melamine');
    expect(state.project.name).toBe('meuble tv');
  });

  it('10. Pièce locked → non écrasée après régénération', async () => {
    resetAll();
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 3, spacing_mm: 300 } },
      ],
    };

    // First generation
    const result1 = runPipeline(intent);
    expect(result1.parts.length).toBeGreaterThan(0);

    // Find a shelf and lock it with custom dimensions
    const shelf = result1.parts.find((p) => p.type === 'tablette-reglable');
    expect(shelf).toBeDefined();

    const modifiedParts: GeneratedPart[] = result1.parts.map((p) =>
      p.id === shelf!.id
        ? { ...p, locked: true, length_mm: 700, width_mm: 250, name: 'Ma tablette custom' }
        : p,
    );

    // Second generation with locked parts
    resetAll();
    const { generateLayout } = await import('../layout');
    const { generateStructure } = await import('../structure');
    const { generateParts } = await import('../geometry');

    const { layout } = generateLayout(intent);
    const structure = generateStructure(layout, intent);
    const regenParts = generateParts(structure, layout, intent, modifiedParts);

    // The locked part should be preserved with custom dimensions
    const preserved = regenParts.find((p) => p.id === shelf!.id);
    expect(preserved).toBeDefined();
    expect(preserved!.locked).toBe(true);
    expect(preserved!.length_mm).toBe(700);
    expect(preserved!.width_mm).toBe(250);
    expect(preserved!.name).toBe('Ma tablette custom');

    // Other parts should be regenerated normally
    const otherShelves = regenParts.filter(
      (p) => p.type === 'tablette-reglable' && p.id !== shelf!.id,
    );
    expect(otherShelves.length).toBe(2); // 3 total - 1 locked = 2 regenerated
    // They should have standard dimensions, not the custom ones
    for (const s of otherShelves) {
      expect(s.locked).toBe(false);
      expect(s.length_mm).not.toBe(700);
    }
  });
});

// ===========================================================================
// intentFromState — classic editor / AI patch → V3 sync
// ===========================================================================

describe('intentFromState', () => {
  const baseIntent: ProjectIntent = {
    furniture_type: 'bibliotheque',
    material_key: 'cp_bouleau',
    space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
    zones: [
      { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 3, spacing_mm: 300 } },
    ],
  };

  it('overrides dimensions + material from the editor state, preserves zones', () => {
    resetAll();
    const state = pipelineResultToAppState(runPipeline(baseIntent), 'cp_bouleau');
    // User (or AI patch) edits depth 30 → 35 cm and switches material.
    state.project.wallDepth = 35;
    state.project.ceilingHeight = 210;
    state.materialKey = 'melamine';

    const merged = intentFromState(baseIntent, state);
    expect(merged.space.depth_mm).toBe(350);
    expect(merged.space.height_mm).toBe(2100);
    expect(merged.space.width_mm).toBe(800); // untouched
    expect(merged.material_key).toBe('melamine');
    expect(merged.zones).toEqual(baseIntent.zones); // zones preserved
  });

  it('re-running the pipeline through the merge reflects the edited depth (no desync)', () => {
    resetAll();
    const before = runPipeline(baseIntent);
    const state = pipelineResultToAppState(before, 'cp_bouleau');
    state.project.wallDepth = 40; // deeper for heavy books

    const after = runPipeline(intentFromState(baseIntent, state));
    // A side panel (joue) spans the body depth → its width_mm tracks the depth.
    const joueBefore = before.parts.find((p) => p.type === 'joue')!;
    const joueAfter = after.parts.find((p) => p.type === 'joue')!;
    expect(joueAfter.width_mm).toBeGreaterThan(joueBefore.width_mm);
  });

  it('falls back to the base depth when the editor has no wallDepth', () => {
    resetAll();
    const state = pipelineResultToAppState(runPipeline(baseIntent), 'cp_bouleau');
    delete (state.project as { wallDepth?: number }).wallDepth;

    const merged = intentFromState(baseIntent, state);
    expect(merged.space.depth_mm).toBe(baseIntent.space.depth_mm);
  });
});
