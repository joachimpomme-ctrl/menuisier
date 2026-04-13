import { describe, it, expect, beforeEach } from 'vitest';
import type { ProjectIntent } from '../knowledge/types';
import {
  getAllParts,
  getPart,
  addPart,
  updatePart,
  deletePart,
  exportLibrary,
  importLibrary,
  resetLibrary,
} from '../partsLibrary';

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
    writable: true,
    configurable: true,
  });
});

describe('partsLibrary', () => {
  it('seeds 10 parts on first load', () => {
    const parts = getAllParts();
    expect(parts).toHaveLength(10);
    expect(parts[0].source).toBe('template');
    // All have IDs starting with 'lm_'
    for (const p of parts) {
      expect(p.id).toMatch(/^lm_/);
    }
  });

  it('CRUD: add, update, delete', () => {
    // Start with seed
    resetLibrary();
    const initial = getAllParts().length;

    // Add
    const created = addPart({
      name: 'Ma tablette custom',
      category: 'shelf',
      length_mm: 600,
      width_mm: 250,
      thickness_mm: 18,
    });
    expect(created.id).toMatch(/^user_/);
    expect(created.source).toBe('user');
    expect(getAllParts()).toHaveLength(initial + 1);

    // Read
    const found = getPart(created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe('Ma tablette custom');

    // Update
    const ok = updatePart(created.id, { name: 'Tablette modifiée' });
    expect(ok).toBe(true);
    expect(getPart(created.id)!.name).toBe('Tablette modifiée');

    // Delete
    const deleted = deletePart(created.id);
    expect(deleted).toBe(true);
    expect(getAllParts()).toHaveLength(initial);
    expect(getPart(created.id)).toBeNull();
  });

  it('export/import round-trip', () => {
    resetLibrary();
    addPart({
      name: 'Export test',
      category: 'custom',
      length_mm: 100,
      width_mm: 100,
      thickness_mm: 10,
    });
    const json = exportLibrary();
    const parsed = JSON.parse(json);
    expect(parsed.parts.length).toBe(11); // 10 seed + 1

    // Reset and import
    resetLibrary();
    expect(getAllParts()).toHaveLength(10);
    const imported = importLibrary(json);
    expect(imported).toBe(1); // 1 new part (seed parts already exist)
    expect(getAllParts()).toHaveLength(11);
  });

  it('standard_part_id links correctly in geometry', async () => {
    // Verify that a GeneratedPart with standard_part_id is preserved
    const { generateParts, _resetPartCounter } = await import('../engine/geometry');
    const { generateLayout, _resetCounter: resetLayout } = await import('../engine/layout');
    const { generateStructure } = await import('../engine/structure');
    const { _resetCounter: resetIntent } = await import('../engine/intent');

    resetLayout();
    resetIntent();
    _resetPartCounter();

    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        { module_id: 'shelf_adjustable', height_mm: 2000, config: { type: 'shelf_adjustable', count: 2, spacing_mm: 300 } },
      ],
    };

    const { layout } = generateLayout(intent);
    const structure = generateStructure(layout, intent);
    const baseParts = generateParts(structure, layout, intent);

    // Find a shelf and link it to a standard part
    const shelf = baseParts.find((p) => p.type === 'tablette-reglable');
    expect(shelf).toBeDefined();

    const linkedParts = baseParts.map((p) =>
      p.id === shelf!.id
        ? { ...p, standard_part_id: 'lm_tablette_melamine_800', length_mm: 800, width_mm: 300, thickness_mm: 18 }
        : p,
    );

    // Regenerate with linked parts as existingParts
    _resetPartCounter();
    resetLayout();
    const regen = generateParts(structure, layout, intent, linkedParts);
    const regenShelf = regen.find((p) => p.id === shelf!.id);

    expect(regenShelf).toBeDefined();
    expect(regenShelf!.standard_part_id).toBe('lm_tablette_melamine_800');
    expect(regenShelf!.locked).toBe(true);
    // Dimensions come from the linked standard part, not regenerated
    expect(regenShelf!.length_mm).toBe(800);
  });
});
