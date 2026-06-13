/**
 * Temporary script — regenerates tests/golden/<case>/expected.json from the
 * current pipeline output, mirroring tests/golden/runner.test.ts:projectResult
 * and preserving each case's `_ignore_paths`. Run: npx tsx scripts/regen-golden.ts
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runPipeline } from '../src/lib/engine/pipeline';
import type { ProjectIntent } from '../src/lib/knowledge/types';

const root = join(process.cwd(), 'tests', 'golden');

function projectResult(intent: ProjectIntent) {
  const result = runPipeline(intent);
  return {
    layout: result.layout,
    issues: result.validation.map((issue) => ({
      code: issue.rule_id ?? null,
      severity: issue.severity,
      blocking: issue.blocking,
    })),
    pieces: result.parts,
    hardware: result.hardware,
  };
}

const dirs = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => join(root, e.name))
  .filter((d) => existsSync(join(d, 'intent.json')) && existsSync(join(d, 'expected.json')));

for (const dir of dirs) {
  const intent = JSON.parse(readFileSync(join(dir, 'intent.json'), 'utf8')) as ProjectIntent;
  const prev = JSON.parse(readFileSync(join(dir, 'expected.json'), 'utf8')) as Record<string, unknown>;
  const regenerated = projectResult(intent);
  // Strip pieceNumber to match the established baseline (it's in _ignore_paths,
  // so it never affects pass/fail, but keeping it out keeps golden diffs clean).
  for (const p of regenerated.pieces as Array<Record<string, unknown>>) {
    delete p.pieceNumber;
  }
  const next: Record<string, unknown> = { ...regenerated };
  if (prev._ignore_paths) next._ignore_paths = prev._ignore_paths;
  writeFileSync(join(dir, 'expected.json'), JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log('regenerated', dir);
}
