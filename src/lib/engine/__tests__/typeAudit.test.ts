import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadKnowledge, getProjectPreset, getPresetSpaceDefaults } from '../../knowledge/index';
import type { FurnitureType, ProjectIntent } from '../../knowledge/types';
import { runPipeline } from '../pipeline';
import { buildFacade2DModel } from '../facade2d';
import { variantToResult } from '../../wizard/variantToResult';
import { _resetCounter as resetIntent } from '../intent';
import { _resetCounter as resetLayout } from '../layout';
import { _resetPartCounter as resetGeom } from '../geometry';
import { _resetHwCounter as resetHw } from '../hardware';

declare function require(name: string): any;
declare const process: { cwd(): string };

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const ALL_TYPES: FurnitureType[] = [
  'bibliotheque',
  'etagere_murale',
  'placard',
  'armoire',
  'vestiaire_entree',
  'meuble_tv',
  'buffet',
  'bureau',
  'commode',
  'cuisine',
  'meuble_salle_de_bain',
  'meuble_chaussures',
  'cave_vin',
  'banquette_coffre',
  'sous_escalier',
  'lit_cabane_mezzanine',
  'table',
];

const WELL_SUPPORTED: FurnitureType[] = [
  'bibliotheque',
  'placard',
  'armoire',
  'etagere_murale',
  'meuble_tv',
  'meuble_chaussures',
  'cave_vin',
  'cuisine',
];

const PARTIAL_TYPES: FurnitureType[] = [
  'sous_escalier',
  'table',
  'lit_cabane_mezzanine',
];

interface TypeAuditEntry {
  type: FurnitureType;
  variant: string | 'default';
  dimensions: { width: number; height: number; depth: number; plinth: number };
  result: {
    bodyCount: number;
    partCount: number;
    hardwareCount: number;
    blockingErrors: string[];
    warnings: string[];
    hasJoues: boolean;
    hasTop: boolean;
    hasBottom: boolean;
    hasFond: boolean;
    hasDoors: boolean;
    doorCount: number;
    zoneTypes: string[];
    fixedShelfCount: number;
    approximationFlags: string[];
    facade2dWarnings: string[];
  };
  verdict: 'ok' | 'partial' | 'broken';
  notes: string;
}

const auditResults: TypeAuditEntry[] = [];

function resetAll() {
  resetIntent();
  resetLayout();
  resetGeom();
  resetHw();
}

function getDefaultDimensions(type: FurnitureType) {
  const dims = getPresetSpaceDefaults(type);
  return {
    width: dims.width_mm ?? 800,
    height: dims.height_mm ?? 2000,
    depth: dims.depth_mm ?? 400,
    plinth: dims.plinth_mm ?? 0,
  };
}

function makeDefaultIntent(type: FurnitureType): ProjectIntent {
  const dims = getDefaultDimensions(type);
  return {
    furniture_type: type,
    material_key: 'cp_bouleau',
    space: {
      width_mm: dims.width,
      height_mm: dims.height,
      depth_mm: dims.depth,
      plinth_mm: dims.plinth,
      wall_type: 'concrete',
    },
  };
}

function buildVariantIntent(type: FurnitureType, variant: Record<string, unknown>): ProjectIntent {
  const base = makeDefaultIntent(type);
  const usableHeight = base.space.height_mm - (base.space.plinth_mm || 0);
  const variantResult = variantToResult(variant, usableHeight);

  return {
    ...base,
    variant: typeof variant.nom === 'string' ? variant.nom : undefined,
    zones: variantResult.zones.map((zone) => ({
      module_id: zone.module_id,
      height_mm: zone.height_mm,
      config: (() => {
        switch (zone.module_id) {
          case 'shelf_adjustable':
            return { type: 'shelf_adjustable', count: zone.count, spacing_mm: 300 } as const;
          case 'drawer_stack':
            return { type: 'drawer_stack', count: zone.count, distribution: 'progressive' } as const;
          case 'hanging_rod_short':
            return { type: 'hanging_rod_short' } as const;
          case 'hanging_rod_long':
            return { type: 'hanging_rod_long' } as const;
          case 'shoe_rack_inclined':
            return { type: 'shoe_rack_inclined', tiers: zone.count } as const;
          case 'tv_niche':
            return { type: 'tv_niche', ventilation: true } as const;
          case 'wine_rack':
            return { type: 'wine_rack', columns: zone.count, rows: zone.count } as const;
          case 'bench_storage':
            return { type: 'bench_storage', has_backrest: false } as const;
        }
      })(),
    })),
    door_override: variantResult.doorOverride,
    suspended_override: variantResult.suspendedOverride,
    space: {
      ...base.space,
      width_mm: variantResult.suggestedWidthMm ?? base.space.width_mm,
      height_mm: variantResult.suggestedHeightMm ?? base.space.height_mm,
      depth_mm: variantResult.suggestedDepthMm ?? base.space.depth_mm,
      plinth_mm: variantResult.suggestedPlinthType === 'none' ? 0 : base.space.plinth_mm,
    },
  };
}

function summarizeRun(type: FurnitureType, variantName: string | 'default', intent: ProjectIntent): TypeAuditEntry {
  resetAll();
  const result = runPipeline(intent);
  const facade = buildFacade2DModel(result);

  const blockingErrors = result.validation.filter((v) => v.blocking).map((v) => v.message);
  const warnings = result.validation.filter((v) => !v.blocking).map((v) => v.message);
  const zoneTypes = [...new Set(result.layout.bodies.flatMap((body) => body.zones.map((zone) => zone.module_id)))];
  const doorCount = result.parts.filter((part) => part.type === 'porte').reduce((sum, part) => sum + part.qty, 0);

  const hasJoues = result.parts.some((part) => part.type === 'joue');
  const hasTop = result.parts.some((part) => part.name.toLowerCase().includes('dessus') || part.name.toLowerCase().includes('tablette fixe haut'));
  const hasBottom = result.parts.some((part) => part.name.toLowerCase().includes('dessous') || part.name.toLowerCase().includes('tablette fixe bas'));
  const hasFond = result.parts.some((part) => part.type === 'fond');
  const hasDoors = result.layout.bodies.some((body) => body.doors) && doorCount > 0;
  const fixedShelfCount = result.structure.bodies.reduce((sum, body) => sum + body.fixed_shelves.length, 0);

  let verdict: 'ok' | 'partial' | 'broken' = 'ok';
  const notes: string[] = [];

  if (blockingErrors.length > 0 || result.parts.length < 2 || result.layout.bodies.length < 1) {
    verdict = 'broken';
    if (blockingErrors.length > 0) notes.push('Erreurs bloquantes présentes.');
    if (result.parts.length < 2) notes.push('Nombre de pièces trop faible.');
  } else if (facade.approximationFlags.length > 0 || facade.warnings.length > 0) {
    verdict = 'partial';
    if (facade.approximationFlags.length > 0) notes.push(`Approximation: ${facade.approximationFlags.join(', ')}.`);
  }

  return {
    type,
    variant: variantName,
    dimensions: {
      width: intent.space.width_mm,
      height: intent.space.height_mm,
      depth: intent.space.depth_mm,
      plinth: intent.space.plinth_mm,
    },
    result: {
      bodyCount: result.layout.bodies.length,
      partCount: result.parts.length,
      hardwareCount: result.hardware.length,
      blockingErrors,
      warnings,
      hasJoues,
      hasTop,
      hasBottom,
      hasFond,
      hasDoors,
      doorCount,
      zoneTypes,
      fixedShelfCount,
      approximationFlags: facade.approximationFlags,
      facade2dWarnings: facade.warnings,
    },
    verdict,
    notes: notes.join(' ') || 'Résultat cohérent avec les règles actuellement implémentées.',
  };
}

beforeAll(async () => {
  const knowledgePath = resolve(process.cwd(), 'public/knowledge/base_v3_normalized.json');
  const payload = readFileSync(knowledgePath, 'utf8');

  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => JSON.parse(payload),
  })));

  await loadKnowledge();
});

afterAll(() => {
  writeFileSync(
    resolve(process.cwd(), 'src/lib/engine/__tests__/typeAuditReport.json'),
    JSON.stringify(auditResults, null, 2),
  );
  vi.unstubAllGlobals();
});

describe('V3 exhaustive furniture type audit', () => {
  it('audits all 17 default types and all declared variants without crashing', () => {
    for (const type of ALL_TYPES) {
      const defaultIntent = makeDefaultIntent(type);
      const defaultEntry = summarizeRun(type, 'default', defaultIntent);
      auditResults.push(defaultEntry);

      expect(defaultEntry.result.bodyCount).toBeGreaterThan(0);
      expect(defaultEntry.result.partCount).toBeGreaterThanOrEqual(2);
      expect(() => buildFacade2DModel(runPipeline(defaultIntent))).not.toThrow();

      if (WELL_SUPPORTED.includes(type)) {
        expect(defaultEntry.result.blockingErrors).toHaveLength(0);
        expect(defaultEntry.result.hasJoues).toBe(true);
        expect(defaultEntry.result.zoneTypes.length).toBeGreaterThan(0);
      }

      if (PARTIAL_TYPES.includes(type)) {
        expect(defaultEntry.result.approximationFlags.length).toBeGreaterThan(0);
        expect(defaultEntry.result.facade2dWarnings.length).toBeGreaterThan(0);
      }

      const preset = getProjectPreset(type);
      const variants = (preset?.variantes ?? []) as Array<Record<string, unknown>>;

      for (const variant of variants) {
        const variantName = typeof variant.nom === 'string' ? variant.nom : 'variant';
        const variantIntent = buildVariantIntent(type, variant);
        const variantEntry = summarizeRun(type, variantName, variantIntent);
        auditResults.push(variantEntry);

        expect(variantEntry.result.bodyCount).toBeGreaterThan(0);
        expect(variantEntry.result.partCount).toBeGreaterThanOrEqual(2);
        expect(() => buildFacade2DModel(runPipeline(variantIntent))).not.toThrow();

        if (WELL_SUPPORTED.includes(type)) {
          expect(variantEntry.result.hasJoues).toBe(true);
          expect(variantEntry.result.zoneTypes.length).toBeGreaterThan(0);
        }

        if (PARTIAL_TYPES.includes(type)) {
          expect(variantEntry.result.approximationFlags.length).toBeGreaterThan(0);
          expect(variantEntry.result.facade2dWarnings.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
