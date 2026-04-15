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

    expect(result.doorOverride).toBeUndefined();
    expect(result.suspendedOverride).toBeUndefined();
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

    expect(result.doorOverride).toBe(false);
    expect(result.suspendedOverride).toBe(true);
  });

  it("overrides from previous variant don't leak", () => {
    const withOverrides = variantToResult({ portes: false, fixation_murale: true }, 1900);
    const withoutOverrides = variantToResult({}, 1900);

    expect(withOverrides.doorOverride).toBe(false);
    expect(withOverrides.suspendedOverride).toBe(true);
    expect(withoutOverrides.doorOverride).toBeUndefined();
    expect(withoutOverrides.suspendedOverride).toBeUndefined();
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

  it('returns suggestedDepthMm when profondeur_mm is present', () => {
    const result = variantToResult({ profondeur_mm: 400 }, 1900);

    expect(result.suggestedDepthMm).toBe(400);
  });

  it('returns suggestedWidthMm when largeur_mm is present', () => {
    const result = variantToResult({ largeur_mm: 600 }, 1900);

    expect(result.suggestedWidthMm).toBe(600);
  });

  it('forces doorOverride when porte_unique is true', () => {
    const result = variantToResult({ porte_unique: true }, 1900);

    expect(result.doorOverride).toBe(true);
  });

  it('returns suggestedPlinthType legs when pieds is true', () => {
    const result = variantToResult({ pieds: true }, 1900);

    expect(result.suggestedPlinthType).toBe('legs');
  });

  it('returns a vitrage warning when vitrage is true', () => {
    const result = variantToResult({ vitrage: true }, 1900);

    expect(result.warnings?.some((warning) => warning.includes('vitrées'))).toBe(true);
  });

  it('returns a pateres warning when pateres is true', () => {
    const result = variantToResult({ pateres: true }, 1900);

    expect(result.warnings?.some((warning) => warning.includes('Patères'))).toBe(true);
  });

  it('returns a facade warning when tiroirs contain h_facade_mm', () => {
    const result = variantToResult({
      tiroirs: [
        { h_facade_mm: 140 },
        { h_facade_mm: 280 },
      ],
    }, 1900);

    expect(result.warnings?.some((warning) => warning.includes('façade'))).toBe(true);
  });

  it('returns no warnings for a clean supported variant', () => {
    const result = variantToResult({ portes: true, tablettes: 4 }, 1900);

    expect(result.warnings === undefined || result.warnings.length === 0).toBe(true);
  });

  it('combines hanging rod zones with depth suggestions', () => {
    const result = variantToResult({ tringle: true, profondeur_mm: 600 }, 1900);

    expect(result.zones.some((z) => z.module_id === 'hanging_rod_short')).toBe(true);
    expect(result.suggestedDepthMm).toBe(600);
  });
});
