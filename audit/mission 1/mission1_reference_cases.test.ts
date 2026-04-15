import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadKnowledge } from '../src/lib/knowledge/index';
import { runPipeline } from '../src/lib/engine/pipeline';
import type { FurnitureType, ProjectIntent } from '../src/lib/knowledge/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const kbPath = path.join(repoRoot, 'public/knowledge/base_v3_normalized.json');

interface RefCase {
  type: FurnitureType;
  presetName: string;
  intent: ProjectIntent;
  validationBlocking: number;
  validationWarnings: number;
  layout: {
    bodyCount: number;
    zones: Array<{ body_id: string; modules: string[]; zoneCount: number }>;
    doors: Array<{ body_id: string; type: string; count: number }>;
  };
  structure: {
    bodies: Array<{ body_id: string; fixedShelfCount: number; plinth: string; wallMounting?: string }>;
  };
  parts: {
    total: number;
    byType: Record<string, number>;
  };
  production: {
    available: boolean;
    sheetCount: number;
    hardwareCount: number;
    assumptionsCount: number;
  };
}

function inferSpace(type: FurnitureType, dims: Record<string, unknown>) {
  const width = typeof dims.largeur_mm === 'number'
    ? dims.largeur_mm
    : typeof dims.longueur_mm === 'number'
      ? dims.longueur_mm
      : type === 'sous_escalier'
        ? 1200
        : type === 'lit_cabane_mezzanine'
          ? 1900
          : 800;

  const height = typeof dims.hauteur_mm === 'number'
    ? dims.hauteur_mm
    : typeof dims.hauteur_max_mm === 'number'
      ? dims.hauteur_max_mm
      : type === 'etagere_murale'
        ? 900
        : type === 'lit_cabane_mezzanine'
          ? 1800
          : 900;

  const depth = typeof dims.profondeur_mm === 'number'
    ? dims.profondeur_mm
    : typeof dims.largeur_mm === 'number' && type === 'table'
      ? dims.largeur_mm
      : type === 'lit_cabane_mezzanine'
        ? 900
        : 450;

  const plinth = typeof dims.plinthe_mm === 'number' ? dims.plinthe_mm : 0;

  return {
    width_mm: width,
    height_mm: height,
    depth_mm: depth,
    plinth_mm: plinth,
    wall_type: 'concrete' as const,
  };
}

function makeBaseIntent(type: FurnitureType, dims: Record<string, unknown>): ProjectIntent {
  return {
    furniture_type: type,
    material_key: 'melamine',
    space: inferSpace(type, dims),
  };
}

function summarize(result: ReturnType<typeof runPipeline>, type: FurnitureType, presetName: string): RefCase {
  const byType: Record<string, number> = {};
  for (const p of result.parts) {
    byType[p.type] = (byType[p.type] ?? 0) + p.qty;
  }

  return {
    type,
    presetName,
    intent: result.intent,
    validationBlocking: result.validation.filter((v) => v.blocking).length,
    validationWarnings: result.validation.filter((v) => !v.blocking).length,
    layout: {
      bodyCount: result.layout.bodies.length,
      zones: result.layout.bodies.map((b) => ({
        body_id: b.body_id,
        modules: b.zones.map((z) => z.module_id),
        zoneCount: b.zones.length,
      })),
      doors: result.layout.bodies
        .filter((b) => b.doors && b.doors.type !== 'none' && b.doors.count > 0)
        .map((b) => ({ body_id: b.body_id, type: b.doors!.type, count: b.doors!.count })),
    },
    structure: {
      bodies: result.structure.bodies.map((b) => ({
        body_id: b.body_id,
        fixedShelfCount: b.fixed_shelves.length,
        plinth: b.plinth.type,
        wallMounting: b.wall_mounting?.type,
      })),
    },
    parts: {
      total: Object.values(byType).reduce((s, n) => s + n, 0),
      byType,
    },
    production: {
      available: !!result.production,
      sheetCount: (result.production?.shopping_list.panels.length ?? 0),
      hardwareCount: (result.production?.shopping_list.hardware.length ?? 0),
      assumptionsCount: (result.production?.assumptions.length ?? 0),
    },
  };
}

describe('Mission 1-bis reference cases', () => {
  beforeAll(async () => {
    const raw = fs.readFileSync(kbPath, 'utf8');
    const payload = JSON.parse(raw);
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
      if (url.endsWith('/knowledge/base_v3_normalized.json')) {
        return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;
    await loadKnowledge();
  });

  it('generates one base reference case per furniture type and exports audit artifacts', () => {
    const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8')) as {
      projets: Record<FurnitureType, { nom: string; dimensions_defaut: Record<string, unknown> }>;
    };

    const rows: RefCase[] = [];

    for (const [type, preset] of Object.entries(kb.projets) as Array<[FurnitureType, { nom: string; dimensions_defaut: Record<string, unknown> }]>) {
      const intent = makeBaseIntent(type, preset.dimensions_defaut);
      const result = runPipeline(intent);
      rows.push(summarize(result, type, preset.nom));
    }

    rows.sort((a, b) => a.type.localeCompare(b.type));

    const artifact = {
      generated_at: new Date().toISOString(),
      source: {
        knowledge: 'public/knowledge/base_v3_normalized.json',
        pipeline: 'src/lib/engine/pipeline.ts',
      },
      total_types: rows.length,
      cases: rows,
    };

    const outJson = path.join(repoRoot, 'audits/mission1_reference_cases.json');
    fs.writeFileSync(outJson, JSON.stringify(artifact, null, 2));

    let md = '# Mission 1-bis — Cas de référence (base sans variante)\n\n';
    md += 'Génération reproductible via pipeline réel (`runPipeline`).\n\n';
    md += `Types couverts: **${rows.length}**.\n\n`;
    md += '| type | preset | intent (L×H×P mm / plinthe) | bodies | zones | portes | pièces totales | top pièces | production |\n';
    md += '|---|---|---:|---:|---:|---|---:|---|---|\n';

    for (const r of rows) {
      const top = Object.entries(r.parts.byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      const doors = r.layout.doors.length > 0
        ? r.layout.doors.map((d) => `${d.type}×${d.count}`).join(' / ')
        : 'aucune';
      const zones = r.layout.zones.map((z) => `${z.body_id}:${z.zoneCount}`).join(', ');
      const i = r.intent.space;
      md += `| ${r.type} | ${r.presetName} | ${i.width_mm}×${i.height_mm}×${i.depth_mm} / ${i.plinth_mm} | ${r.layout.bodyCount} | ${zones} | ${doors} | ${r.parts.total} | ${top} | ${r.production.available ? `ok (${r.production.sheetCount} panneaux)` : 'bloquée'} |\n`;
    }

    fs.writeFileSync(path.join(repoRoot, 'audits/mission1_reference_cases.md'), md);

    expect(rows).toHaveLength(17);
    expect(rows.every((r) => Number.isFinite(r.parts.total))).toBe(true);
  });
});
