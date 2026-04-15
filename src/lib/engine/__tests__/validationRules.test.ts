import { beforeEach, describe, expect, it } from 'vitest';
import { runPipeline } from '../pipeline';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import { _resetPartCounter as resetGeom } from '../geometry';
import { _resetValCounter as resetValidation } from '../validation';
import { generateLayout } from '../layout';
import { generateStructure } from '../structure';
import { generateParts } from '../geometry';
import { selectHardware } from '../hardware';
import { validateProject } from '../validation';
import type { ProjectIntent, ValidationIssue } from '../../knowledge/types';

function makeIntent(overrides: Partial<ProjectIntent> = {}): ProjectIntent {
  return {
    furniture_type: 'bibliotheque',
    material_key: 'melamine',
    space: {
      width_mm: 800,
      height_mm: 1800,
      depth_mm: 300,
      plinth_mm: 0,
      wall_type: 'concrete',
    },
    ...overrides,
  };
}

function hasRule(issues: ValidationIssue[], ruleId: string): boolean {
  return issues.some((issue) => issue.rule_id === ruleId);
}

function buildProject(intent: ProjectIntent) {
  const { layout } = generateLayout(intent);
  const structure = generateStructure(layout, intent);
  const parts = generateParts(structure, layout, intent);
  const hardware = selectHardware(parts, structure, intent);
  return { layout, structure, parts, hardware };
}

beforeEach(() => {
  resetIntent();
  resetLayout();
  resetGeom();
  resetValidation();
});

describe('validation business rules', () => {
  it('adds VAL_SHELF_SPAN for a wide melamine shelf', () => {
    const intent = makeIntent({
      space: { width_mm: 1200, height_mm: 1800, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 1800, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    });
    const { layout, structure, parts, hardware } = buildProject(intent);
    const shelf = parts.find((part) => part.type === 'tablette-reglable');

    expect(layout.bodies.length).toBeGreaterThan(1);
    expect(shelf).toBeDefined();

    const widenedParts = parts.map((part) =>
      part.id === shelf!.id ? { ...part, length_mm: 900 } : part,
    );
    const issues = validateProject(intent, layout, structure, widenedParts, hardware);

    expect(hasRule(issues, 'VAL_SHELF_SPAN')).toBe(true);
  });

  it('does not add VAL_SHELF_SPAN for a short shelf span', () => {
    const result = runPipeline(makeIntent({
      space: { width_mm: 700, height_mm: 1800, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 1800, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
      ],
    }));

    expect(hasRule(result.validation, 'VAL_SHELF_SPAN')).toBe(false);
  });

  it('adds VAL_ROD_DEPTH for a shallow wardrobe with hanging rod', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 400, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 1500, config: { type: 'hanging_rod_short' } },
      ],
    }));

    expect(hasRule(result.validation, 'VAL_ROD_DEPTH')).toBe(true);
  });

  it('does not add VAL_ROD_DEPTH when wardrobe depth is sufficient', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
      zones: [
        { module_id: 'hanging_rod_short', height_mm: 1500, config: { type: 'hanging_rod_short' } },
      ],
    }));

    expect(hasRule(result.validation, 'VAL_ROD_DEPTH')).toBe(false);
  });

  it('adds VAL_DOOR_WEIGHT for heavy birch plywood doors', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'placard',
      material_key: 'cp_bouleau',
      space: { width_mm: 500, height_mm: 2600, depth_mm: 600, plinth_mm: 80, wall_type: 'concrete' },
    }));

    expect(hasRule(result.validation, 'VAL_DOOR_WEIGHT')).toBe(true);
  });

  it('adds VAL_ANTI_TIP for tall furniture without wall fixing', () => {
    const intent = makeIntent({
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 1800, depth_mm: 300, plinth_mm: 80, wall_type: 'concrete' },
    });
    const { layout, structure, parts, hardware } = buildProject(intent);
    const structureWithoutFixing = {
      ...structure,
      bodies: structure.bodies.map((body) => ({ ...body, wall_mounting: undefined })),
    };
    const filteredHardware = hardware.filter(
      (item) => item.reference !== 'anti_tip' && item.reference !== 'rail_suspension',
    );
    const issues = validateProject(intent, layout, structureWithoutFixing, parts, filteredHardware);

    expect(hasRule(issues, 'VAL_ANTI_TIP')).toBe(true);
  });

  it('adds VAL_WALL_TYPE_SUSPENDED for suspended furniture on unknown wall', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'etagere_murale',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 400, depth_mm: 250, plinth_mm: 0, wall_type: 'unknown' },
    }));

    expect(hasRule(result.validation, 'VAL_WALL_TYPE_SUSPENDED')).toBe(true);
  });

  it('does not add VAL_WALL_TYPE_SUSPENDED when suspended furniture wall type is known', () => {
    const result = runPipeline(makeIntent({
      furniture_type: 'etagere_murale',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 400, depth_mm: 250, plinth_mm: 0, wall_type: 'concrete' },
    }));

    expect(hasRule(result.validation, 'VAL_WALL_TYPE_SUSPENDED')).toBe(false);
  });
});
