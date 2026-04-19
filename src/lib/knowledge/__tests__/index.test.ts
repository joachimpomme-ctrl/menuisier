import { afterEach, describe, expect, it, vi } from 'vitest';

declare function require(name: 'fs'): {
  readFileSync(path: string, encoding: string): string;
};
declare function require(name: 'path'): {
  resolve(...paths: string[]): string;
};
declare const process: { cwd(): string };

const { readFileSync } = require('fs');
const { resolve } = require('path');

async function loadRealKnowledge() {
  const knowledgePath = resolve(process.cwd(), 'public/knowledge/base_v3_normalized.json');
  const payload = readFileSync(knowledgePath, 'utf8');
  const knowledge = await import('../index');

  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => JSON.parse(payload),
  })));

  await knowledge.loadKnowledge();
  return knowledge;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('getPresetSpaceDefaults', () => {
  it('maps direct dimensions for standard presets', async () => {
    const { getPresetSpaceDefaults } = await loadRealKnowledge();

    expect(getPresetSpaceDefaults('bibliotheque')).toMatchObject({
      width_mm: 800,
      height_mm: 2000,
      depth_mm: 300,
    });
  });

  it('maps sous-escalier hauteur_max_mm to height_mm', async () => {
    const { getPresetSpaceDefaults } = await loadRealKnowledge();

    expect(getPresetSpaceDefaults('sous_escalier')).toMatchObject({
      height_mm: 2200,
      depth_mm: 800,
    });
  });
});

describe('getTransversalRules', () => {
  it('returns an empty array before loadKnowledge()', async () => {
    const { getTransversalRules } = await import('../index');

    expect(getTransversalRules()).toEqual([]);
  });

  it('returns typed transversal rules after loadKnowledge()', async () => {
    const payload = {
      metadata: {},
      ergonomie: {},
      quincaillerie: {},
      conception: {},
      projets: {},
      regles_transversales: [
        {
          id: 'RT_001',
          regle: 'Tout meuble > 150cm = anti-basculement obligatoire',
          types_concernes: ['bibliotheque'],
          severite: 'critique',
        },
      ],
    };
    const knowledge = await import('../index');

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => payload,
    })));

    await knowledge.loadKnowledge();

    expect(knowledge.getTransversalRules()).toEqual(payload.regles_transversales);
  });
});

describe('getKnowledge', () => {
  it('returns all KnowledgeSnapshot keys', async () => {
    const { getKnowledge } = await import('../index');

    expect(getKnowledge()).toMatchObject({
      projectPresets: null,
      transversalRules: [],
      modules: expect.any(Object),
      mechanicalProperties: expect.any(Array),
      orientationRules: expect.any(Array),
      systeme32Rules: expect.any(Array),
      hingeRules: expect.any(Array),
      doorSizingRules: expect.any(Array),
      drawerRules: expect.any(Array),
    });
  });

  it('returns exactly 8 module catalog entries', async () => {
    const { getKnowledge } = await import('../index');

    expect(Object.keys(getKnowledge().modules)).toHaveLength(8);
  });

  it('returns non-empty mechanical properties', async () => {
    const { getKnowledge } = await import('../index');

    expect(getKnowledge().mechanicalProperties.length).toBeGreaterThan(0);
  });

  it('returns null projectPresets before loadKnowledge()', async () => {
    const { getKnowledge } = await import('../index');

    expect(getKnowledge().projectPresets).toBeNull();
  });

  it('returns empty transversalRules before loadKnowledge()', async () => {
    const { getKnowledge } = await import('../index');

    expect(getKnowledge().transversalRules).toEqual([]);
  });
});
