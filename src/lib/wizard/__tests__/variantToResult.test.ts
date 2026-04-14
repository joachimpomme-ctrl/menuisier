import { describe, expect, it } from 'vitest';
import { variantToResult } from '../variantToResult';

function totalHeight(result: ReturnType<typeof variantToResult>): number {
  return result.zones.reduce((sum, z) => sum + z.height_mm, 0);
}

describe('variantToResult', () => {
  it('uses shelf fallback for empty variant', () => {
    const result = variantToResult({}, 1900);

    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].module_id).toBe('shelf_adjustable');
    expect(result.zones[0].height_mm).toBe(1900);
    expect(result.zones[0].count).toBe(4);
    expect(totalHeight(result)).toBe(1900);
  });

  it('overrides are undefined for non-variant zones', () => {
    const result = variantToResult({}, 1900);

    expect(result.door_override).toBeUndefined();
    expect(result.suspended_override).toBeUndefined();
  });

  it('keeps a valid full-height split for mixed rods/drawers/shelves', () => {
    const result = variantToResult({ tringle: true, tiroirs: 3, tablettes: 4 }, 1900);

    expect(result.zones.length).toBeGreaterThanOrEqual(3);
    expect(result.zones.every((z) => z.height_mm > 0)).toBe(true);
    expect(result.zones.every((z) => z.count >= 1)).toBe(true);
    expect(totalHeight(result)).toBe(1900);
  });

  it('fills remaining height when variant hauteur_mm is lower than usable height', () => {
    const result = variantToResult({ hauteur_mm: 1200, tablettes: 2 }, 1900);

    expect(result.zones.every((z) => z.height_mm > 0)).toBe(true);
    expect(totalHeight(result)).toBe(1900);
    expect(result.zones.some((z) => z.module_id === 'shelf_adjustable')).toBe(true);
  });

  it('supports deep drawer variant type', () => {
    const result = variantToResult({ type: 'tiroirs_profonds' }, 1600);

    expect(result.zones.some((z) => z.module_id === 'drawer_stack')).toBe(true);
    expect(totalHeight(result)).toBe(1600);
  });

  it('extracts door and suspension overrides', () => {
    const result = variantToResult({ portes: false, fixation: 'rail' }, 1800);

    expect(result.door_override).toBe(false);
    expect(result.suspended_override).toBe(true);
  });

  it("overrides from previous variant don't leak", () => {
    const withOverrides = variantToResult({ portes: false, fixation_murale: true }, 1900);
    const withoutOverrides = variantToResult({}, 1900);

    expect(withOverrides.door_override).toBe(false);
    expect(withOverrides.suspended_override).toBe(true);
    expect(withoutOverrides.door_override).toBeUndefined();
    expect(withoutOverrides.suspended_override).toBeUndefined();
  });

  it('never creates non-positive height zones for aggressive combinations', () => {
    const result = variantToResult(
      {
        tringle: true,
        tringle_basse: true,
        tiroirs: 8,
        niche_technique: true,
        etagere_chaussures: true,
        tablettes: 8,
        hauteur_mm: 300,
      },
      1700,
    );

    expect(result.zones.every((z) => z.height_mm > 0)).toBe(true);
    expect(totalHeight(result)).toBe(1700);
  });
});
