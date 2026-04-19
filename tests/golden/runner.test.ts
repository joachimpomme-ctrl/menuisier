import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { runPipeline } from '../../src/lib/engine/pipeline';
import type { ProjectIntent } from '../../src/lib/knowledge/types';

interface GoldenExpected {
  layout: unknown;
  issues: unknown;
  pieces: unknown;
  hardware: unknown;
  _ignore_paths?: string[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function discoverCases(): string[] {
  const root = new URL('.', import.meta.url).pathname;
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter((dir) => existsSync(join(dir, 'intent.json')) && existsSync(join(dir, 'expected.json')))
    .sort();
}

function stripPath(target: unknown, segments: string[]): void {
  if (target === null || target === undefined || segments.length === 0) return;

  const [head, ...tail] = segments;
  const wildcardMatch = head.match(/^(.+)\[\*\]$/);

  if (wildcardMatch) {
    const key = wildcardMatch[1];
    if (typeof target !== 'object' || !(key in target)) return;
    const value = (target as Record<string, unknown>)[key];
    if (!Array.isArray(value)) return;
    for (const item of value) {
      stripPath(item, tail);
    }
    return;
  }

  if (tail.length === 0) {
    if (typeof target === 'object' && !Array.isArray(target)) {
      delete (target as Record<string, unknown>)[head];
    }
    return;
  }

  if (typeof target !== 'object' || Array.isArray(target) || !(head in target)) return;
  stripPath((target as Record<string, unknown>)[head], tail);
}

function stripIgnored<T>(value: T, ignorePaths: string[]): T {
  const cloned = structuredClone(value);
  for (const path of ignorePaths) {
    stripPath(cloned, path.split('.'));
  }
  return cloned;
}

function projectResult(intent: ProjectIntent): Omit<GoldenExpected, '_ignore_paths'> {
  const result = runPipeline(intent);
  return {
    layout: result.layout,
    issues: result.validation.map((issue) => ({
      code: issue.rule_id ?? null,
      severity: issue.severity,
    })),
    pieces: result.parts,
    hardware: result.hardware,
  };
}

const cases = discoverCases();

describe('golden V3 pipeline cases', () => {
  for (const dir of cases) {
    it(basename(dir), () => {
      const intent = readJson<ProjectIntent>(join(dir, 'intent.json'));
      const expected = readJson<GoldenExpected>(join(dir, 'expected.json'));
      const ignorePaths = expected._ignore_paths ?? [];
      const { _ignore_paths: _ignored, ...expectedComparable } = expected;
      const actual = projectResult(intent);

      expect(stripIgnored(actual, ignorePaths)).toEqual(stripIgnored(expectedComparable, ignorePaths));
    });
  }
});
