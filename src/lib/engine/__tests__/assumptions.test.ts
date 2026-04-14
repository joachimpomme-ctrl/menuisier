import { beforeEach, describe, expect, it } from 'vitest';
import { generateProduction } from '../production';
import { generateLayout } from '../layout';
import { generateStructure } from '../structure';
import { generateParts, _resetPartCounter } from '../geometry';
import { selectHardware, _resetHwCounter } from '../hardware';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import type { Assumption, ProjectIntent } from '../../knowledge/types';

function fullProduction(intent: ProjectIntent) {
  const { layout } = generateLayout(intent);
  const structure = generateStructure(layout, intent);
  const parts = generateParts(structure, layout, intent);
  const hardware = selectHardware(parts, structure, intent);
  return generateProduction(intent, parts, hardware, structure, [], layout);
}

function findAssumption(assumptions: Assumption[], key: string) {
  return assumptions.find((item) => item.key === key);
}

beforeEach(() => {
  _resetPartCounter();
  _resetHwCounter();
  resetIntent();
  resetLayout();
});

describe('buildAssumptions', () => {
  it('includes doors_decision with the correct door count when doors are present', () => {
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 550, height_mm: 2400, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 1400, config: { type: 'hanging_rod_short' } },
        { module_id: 'drawer_stack', height_mm: 920, config: { type: 'drawer_stack', count: 3, distribution: 'progressive' } },
      ],
    };

    const assumptions = fullProduction(intent).assumptions;
    const doorsDecision = findAssumption(assumptions, 'doors_decision');

    expect(doorsDecision).toBeDefined();
    expect(doorsDecision!.value).toContain('2 portes');
  });

  it('includes a no-doors decision when door_override is false', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      door_override: false,
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    };

    const assumptions = fullProduction(intent).assumptions;
    const doorsDecision = findAssumption(assumptions, 'doors_decision');

    expect(doorsDecision).toBeDefined();
    expect(doorsDecision!.value).toBe('Sans portes (choix utilisateur)');
  });

  it('includes a rail mounting decision for suspended furniture', () => {
    const intent: ProjectIntent = {
      furniture_type: 'etagere_murale',
      material_key: 'cp_bouleau',
      space: { width_mm: 600, height_mm: 800, depth_mm: 200, plinth_mm: 0, wall_type: 'plasterboard' },
    };

    const assumptions = fullProduction(intent).assumptions;
    const mountingDecision = findAssumption(assumptions, 'mounting_decision');

    expect(mountingDecision).toBeDefined();
    expect(mountingDecision!.value).toContain('rail');
  });

  it('includes an anti-tip decision for tall furniture', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 1800, depth_mm: 300, plinth_mm: 80, wall_type: 'concrete' },
    };

    const assumptions = fullProduction(intent).assumptions;

    expect(findAssumption(assumptions, 'anti_tip_decision')).toBeDefined();
  });

  it('marks rod depth for verification when wardrobe depth is below 550mm', () => {
    const intent: ProjectIntent = {
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 400, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 1500, config: { type: 'hanging_rod_short' } },
      ],
    };

    const assumptions = fullProduction(intent).assumptions;
    const rodDepth = findAssumption(assumptions, 'rod_depth');

    expect(rodDepth).toBeDefined();
    expect(rodDepth!.user_should_verify).toBe(true);
  });

  it('includes a multi_body assumption for multi-body furniture', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'melamine',
      space: { width_mm: 1600, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    };

    const assumptions = fullProduction(intent).assumptions;
    const multiBody = findAssumption(assumptions, 'multi_body');

    expect(multiBody).toBeDefined();
    expect(multiBody!.value).toContain('corps');
  });

  it('does not add doors or drawers decisions for a basic shelf-only meuble', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    };

    const assumptions = fullProduction(intent).assumptions;

    expect(findAssumption(assumptions, 'doors_decision')).toBeUndefined();
    expect(findAssumption(assumptions, 'drawers_decision')).toBeUndefined();
  });

  it('keeps the existing generic assumptions', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
    };

    const assumptions = fullProduction(intent).assumptions;

    expect(findAssumption(assumptions, 'wall_type')).toBeDefined();
    expect(findAssumption(assumptions, 'panel_gap')).toBeDefined();
    expect(findAssumption(assumptions, 'back_panel')).toBeDefined();
    expect(findAssumption(assumptions, 'hinge_overlay')).toBeDefined();
    expect(findAssumption(assumptions, 'square_check')).toBeDefined();
    expect(findAssumption(assumptions, 'material')).toBeDefined();
  });
});
