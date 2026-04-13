import { describe, it, expect } from 'vitest';
import { contentToZones, getCategoriesForType } from '../contentAnalyzer';
import type { SpaceDimensions, ContentItem } from '../types';

const PLACARD_SPACE: SpaceDimensions = {
  width_mm: 1200,
  height_mm: 2400,
  depth_mm: 600,
  plinth_mm: 80,
  wall_type: 'concrete',
};

const BIBLIO_SPACE: SpaceDimensions = {
  width_mm: 800,
  height_mm: 2000,
  depth_mm: 300,
  plinth_mm: 0,
  wall_type: 'concrete',
};

describe('contentToZones', () => {
  it('wardrobe contents → hanging rod + drawers + shoe rack, ordered bottom→active→top', () => {
    const contents: ContentItem[] = [
      { category: 'shirts', quantity: 20 },
      { category: 'pants', quantity: 15 },
      { category: 'shoes', quantity: 10 },
      { category: 'seasonal_clothes', quantity: 5 },
    ];

    const zones = contentToZones(contents, PLACARD_SPACE, 'placard');

    expect(zones.length).toBeGreaterThanOrEqual(3);

    // Zones fill usable height (2400 - 80 = 2320)
    const totalH = zones.reduce((s, z) => s + z.height_mm, 0);
    expect(totalH).toBe(2320);

    // Bottom zones come first (shoes), then active (shirts/pants), then top (seasonal)
    const moduleIds = zones.map((z) => z.module_id);

    // Shoes should be before shirts (bottom before active)
    const shoeIdx = moduleIds.findIndex((m) => m === 'shoe_rack_inclined');
    const shirtIdx = moduleIds.findIndex((m) => m === 'hanging_rod_short');
    if (shoeIdx >= 0 && shirtIdx >= 0) {
      expect(shoeIdx).toBeLessThan(shirtIdx);
    }

    // Seasonal should be last (top)
    const seasonalIdx = moduleIds.lastIndexOf('shelf_adjustable');
    expect(seasonalIdx).toBe(moduleIds.length - 1);
  });

  it('books → shelf_adjustable with adapted spacing per format', () => {
    const contents: ContentItem[] = [
      { category: 'books_pocket', quantity: 50 },
      { category: 'books_large', quantity: 10 },
    ];

    const zones = contentToZones(contents, BIBLIO_SPACE, 'bibliotheque');

    expect(zones.length).toBeGreaterThanOrEqual(1);

    // All zones should be shelf_adjustable for books
    for (const z of zones) {
      expect(z.module_id).toBe('shelf_adjustable');
    }

    // Total height fills usable (2000mm, no plinth)
    const totalH = zones.reduce((s, z) => s + z.height_mm, 0);
    expect(totalH).toBe(2000);

    // Large books (bottom priority) should come before pocket (active)
    if (zones.length >= 2) {
      const configs = zones.map((z) => z.config as { type: string; spacing_mm?: number });
      // First zone (bottom) should have larger spacing (350mm for large books)
      expect(configs[0].spacing_mm).toBeGreaterThanOrEqual(300);
    }
  });

  it('empty contents → empty zones', () => {
    const zones = contentToZones([], PLACARD_SPACE, 'placard');
    expect(zones).toHaveLength(0);
  });
});

describe('getCategoriesForType', () => {
  it('placard includes clothing categories', () => {
    const cats = getCategoriesForType('placard');
    const ids = cats.map((c) => c.id);
    expect(ids).toContain('shirts');
    expect(ids).toContain('shoes');
    expect(ids).toContain('seasonal_clothes');
  });

  it('bibliotheque includes book categories but not clothing', () => {
    const cats = getCategoriesForType('bibliotheque');
    const ids = cats.map((c) => c.id);
    expect(ids).toContain('books_pocket');
    expect(ids).toContain('books_large');
    expect(ids).not.toContain('shirts');
    expect(ids).not.toContain('shoes');
  });
});
