import { describe, expect, it } from 'vitest';
import { generateProduction } from '../production';
import { generateLayout } from '../layout';
import { generateStructure } from '../structure';
import { generateParts, _resetPartCounter } from '../geometry';
import { selectHardware, _resetHwCounter } from '../hardware';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import type { GeneratedPart, Layout, ProjectIntent, Structure } from '../../knowledge/types';

function resetAll() {
  _resetPartCounter();
  _resetHwCounter();
  resetIntent();
  resetLayout();
}

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

function fullProduction(intent: ProjectIntent) {
  const { layout } = generateLayout(intent);
  const structure = generateStructure(layout, intent);
  const parts = generateParts(structure, layout, intent);
  const hardware = selectHardware(parts, structure, intent);
  return generateProduction(intent, parts, hardware, structure, [], layout);
}

function minimalLayout(): Layout {
  return {
    bodies: [
      {
        body_id: 'B1',
        width_mm: 800,
        height_mm: 2000,
        depth_mm: 300,
        zones: [],
      },
    ],
  };
}

function minimalStructure(): Structure {
  return {
    bodies: [
      {
        body_id: 'B1',
        fixed_shelves: [],
        back_panel: { type: 'groove', thickness_mm: 5 },
        bracing: 'back_panel',
        plinth: { type: 'none', height_mm: 0 },
      },
    ],
  };
}

function fondOnlyPart(): GeneratedPart {
  return {
    id: 'fond-1',
    name: 'Fond',
    length_mm: 764,
    width_mm: 1964,
    thickness_mm: 5,
    qty: 1,
    type: 'fond',
    body_id: 'B1',
    locked: false,
  };
}

describe('edge banding production output', () => {
  it('includes the edge banding assembly step when parts have edge banding', () => {
    resetAll();
    const production = fullProduction(makeIntent());

    expect(production.assembly_guide.some((step) => step.title === 'Application des bandes de chant')).toBe(true);
  });

  it('does not include the edge banding assembly step when no parts have edge banding', () => {
    const intent = makeIntent();
    const production = generateProduction(
      intent,
      [fondOnlyPart()],
      [],
      minimalStructure(),
      [],
      minimalLayout(),
    );

    expect(production.assembly_guide.some((step) => step.title === 'Application des bandes de chant')).toBe(false);
  });

  it('adds the edge banding tool when there is edge banding', () => {
    resetAll();
    const production = fullProduction(makeIntent());

    expect(production.shopping_list.tools_needed).toContain('Fer à repasser ou plaqueuse de chant');
  });

  it('does not add the edge banding tool when there is no edge banding', () => {
    const intent = makeIntent();
    const production = generateProduction(
      intent,
      [fondOnlyPart()],
      [],
      minimalStructure(),
      [],
      minimalLayout(),
    );

    expect(production.shopping_list.tools_needed).not.toContain('Fer à repasser ou plaqueuse de chant');
  });
});
