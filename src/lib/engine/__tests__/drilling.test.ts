import { describe, it, expect } from 'vitest';
import {
  generateSystem32,
  generateHingeCups,
  generateConfirmatEdgeHoles,
  generateConfirmatFaceHoles,
  generateSlideHoles,
  generateDrillingForPart,
} from '../drilling';
import type { DrillingOp, GeneratedPart, BodyLayout, BodyStructure } from '../../knowledge/types';

// ---------------------------------------------------------------------------
// Unit tests — individual drilling generators
// ---------------------------------------------------------------------------

describe('generateSystem32', () => {
  it('creates two rows of holes (front/back)', () => {
    const ops = generateSystem32(2000, 600, 5);
    const frontRow = ops.filter((o) => o.x_mm === 37);
    const backRow = ops.filter((o) => o.x_mm === 600 - 5 - 37);
    expect(frontRow.length).toBeGreaterThan(0);
    expect(backRow.length).toBeGreaterThan(0);
    expect(frontRow.length).toBe(backRow.length);
  });

  it('holes are spaced 32mm apart', () => {
    const ops = generateSystem32(2000, 600, 5);
    const frontRow = ops.filter((o) => o.x_mm === 37).sort((a, b) => a.y_mm - b.y_mm);
    for (let i = 1; i < frontRow.length; i++) {
      expect(frontRow[i].y_mm - frontRow[i - 1].y_mm).toBe(32);
    }
  });

  it('all holes are Ø5mm × 10mm deep, type system_32', () => {
    const ops = generateSystem32(1000, 400, 5);
    for (const op of ops) {
      expect(op.type).toBe('system_32');
      expect(op.diameter_mm).toBe(5);
      expect(op.depth_mm).toBe(10);
    }
  });
});

describe('generateHingeCups', () => {
  it('generates 2 cups for standard door', () => {
    const ops = generateHingeCups(1200, 2);
    expect(ops).toHaveLength(2);
    expect(ops[0].y_mm).toBe(100);
    expect(ops[1].y_mm).toBe(1100);
  });

  it('generates 3 cups for tall door', () => {
    const ops = generateHingeCups(2000, 3);
    expect(ops).toHaveLength(3);
    expect(ops[0].y_mm).toBe(100);
    expect(ops[1].y_mm).toBe(1900);
    // Middle hinge between the two
    expect(ops[2].y_mm).toBe(1000);
  });

  it('all cups are Ø35mm × 12mm, type hinge_cup_35', () => {
    const ops = generateHingeCups(1500, 2);
    for (const op of ops) {
      expect(op.type).toBe('hinge_cup_35');
      expect(op.diameter_mm).toBe(35);
      expect(op.depth_mm).toBe(12);
      expect(op.face).toBe('back');
    }
  });
});

describe('generateConfirmatEdgeHoles', () => {
  it('generates 4 holes (2 positions × 2 edges)', () => {
    const ops = generateConfirmatEdgeHoles(800);
    expect(ops).toHaveLength(4);
    const left = ops.filter((o) => o.face === 'edge_left');
    const right = ops.filter((o) => o.face === 'edge_right');
    expect(left).toHaveLength(2);
    expect(right).toHaveLength(2);
  });

  it('positions are at 37mm from each end', () => {
    const ops = generateConfirmatEdgeHoles(800);
    const xs = [...new Set(ops.map((o) => o.x_mm))].sort((a, b) => a - b);
    expect(xs).toEqual([37, 763]);
  });
});

describe('generateConfirmatFaceHoles', () => {
  it('generates 2 holes per shelf position', () => {
    const ops = generateConfirmatFaceHoles([100, 500, 900], 600, 5);
    expect(ops).toHaveLength(6); // 3 positions × 2 holes each
  });
});

describe('generateSlideHoles', () => {
  it('generates 3 holes per drawer position', () => {
    const ops = generateSlideHoles([100, 400], 600, 5);
    expect(ops).toHaveLength(6); // 2 drawers × 3 mounting points
  });
});

// ---------------------------------------------------------------------------
// Integration test — generateDrillingForPart
// ---------------------------------------------------------------------------

describe('generateDrillingForPart', () => {
  const body: BodyLayout = {
    body_id: 'B1',
    x_mm: 0,
    width_mm: 800,
    height_mm: 2000,
    depth_mm: 600,
    zones: [
      { module_id: 'shelf_adjustable', height_mm: 1500, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      { module_id: 'drawer_stack', height_mm: 500, config: { type: 'drawer_stack', count: 2, distribution: 'progressive' } },
    ],
  };

  const bodyStruct: BodyStructure = {
    body_id: 'B1',
    fixed_shelves: [
      { y_mm: 0, role: 'bottom' },
      { y_mm: 2000, role: 'top' },
    ],
    back_panel: { type: 'groove', thickness_mm: 5 },
    plinth: { type: 'legs', height_mm: 100 },
  };

  const ctx = { body, bodyStruct, thickness_mm: 18 };

  it('joue gets system_32 + confirmat + slide holes', () => {
    const jouePart: GeneratedPart = {
      id: 'J1', name: 'Joue gauche', length_mm: 2000, width_mm: 600,
      thickness_mm: 18, qty: 1, type: 'joue', body_id: 'B1', locked: false,
    };
    const ops = generateDrillingForPart(jouePart, ctx);
    expect(ops.length).toBeGreaterThan(0);

    const sys32 = ops.filter((o) => o.type === 'system_32');
    const confirmats = ops.filter((o) => o.type === 'cam_15');
    const slides = ops.filter((o) => o.type === 'shelf_pin_5');

    expect(sys32.length).toBeGreaterThan(0);
    expect(confirmats.length).toBeGreaterThan(0);
    expect(slides.length).toBeGreaterThan(0);
  });

  it('dessus gets confirmat edge holes', () => {
    const dessusPart: GeneratedPart = {
      id: 'D1', name: 'Dessus', length_mm: 764, width_mm: 600,
      thickness_mm: 18, qty: 1, type: 'dessus', body_id: 'B1', locked: false,
    };
    const ops = generateDrillingForPart(dessusPart, ctx);
    expect(ops.length).toBe(4);
    expect(ops.every((o) => o.face === 'edge_left' || o.face === 'edge_right')).toBe(true);
  });

  it('porte gets hinge cups', () => {
    const portePart: GeneratedPart = {
      id: 'P1', name: 'Porte', length_mm: 400, width_mm: 1996,
      thickness_mm: 18, qty: 1, type: 'porte', body_id: 'B1', locked: false,
    };
    const ops = generateDrillingForPart(portePart, ctx);
    expect(ops.length).toBeGreaterThanOrEqual(2);
    expect(ops.every((o) => o.type === 'hinge_cup_35')).toBe(true);
  });

  it('tiroir-caisson gets no drilling', () => {
    const part: GeneratedPart = {
      id: 'TC1', name: 'Caisson tiroir', length_mm: 500, width_mm: 100,
      thickness_mm: 12, qty: 2, type: 'tiroir-caisson', body_id: 'B1', locked: false,
    };
    const ops = generateDrillingForPart(part, ctx);
    expect(ops).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Pipeline integration — drilling_plans populated
// ---------------------------------------------------------------------------

describe('pipeline drilling integration', () => {
  it('pipeline produces non-empty drilling_plans', async () => {
    const { runPipeline } = await import('../pipeline');
    const result = runPipeline({
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 400, plinth_mm: 100, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 1900, config: { type: 'shelf_adjustable', count: 5, spacing_mm: 300 } },
      ],
    });

    expect(result.production).not.toBeNull();
    expect(result.production!.drilling_plans.length).toBeGreaterThan(0);

    // Verify parts have drilling ops
    const partsWithDrilling = result.parts.filter((p) => p.drilling && p.drilling.length > 0);
    expect(partsWithDrilling.length).toBeGreaterThan(0);

    // Joues should have system_32 holes
    const joues = result.parts.filter((p) => p.type === 'joue');
    for (const joue of joues) {
      expect(joue.drilling).toBeDefined();
      expect(joue.drilling!.some((d) => d.type === 'system_32')).toBe(true);
    }
  });

  it('placard with doors has hinge cups in drilling_plans', async () => {
    const { runPipeline } = await import('../pipeline');
    const result = runPipeline({
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 1200, height_mm: 2400, depth_mm: 600, plinth_mm: 100, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2300, config: { type: 'shelf_adjustable', count: 6, spacing_mm: 300 } },
      ],
    });

    expect(result.production).not.toBeNull();
    const allOps = result.production!.drilling_plans.flat();
    const hingeCups = allOps.filter((o) => o.type === 'hinge_cup_35');
    expect(hingeCups.length).toBeGreaterThan(0);
  });
});
