import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getPresetSpaceDefaults, loadKnowledge } from '../index';

declare function require(name: string): any;
declare const process: { cwd(): string };

const { readFileSync } = require('fs');
const { resolve } = require('path');

beforeAll(async () => {
  const knowledgePath = resolve(process.cwd(), 'public/knowledge/base_v3_normalized.json');
  const payload = readFileSync(knowledgePath, 'utf8');

  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => JSON.parse(payload),
  })));

  await loadKnowledge();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getPresetSpaceDefaults', () => {
  it('maps direct dimensions for standard presets', () => {
    expect(getPresetSpaceDefaults('bibliotheque')).toMatchObject({
      width_mm: 800,
      height_mm: 2000,
      depth_mm: 300,
    });
  });

  it('maps sous-escalier hauteur_max_mm to height_mm', () => {
    expect(getPresetSpaceDefaults('sous_escalier')).toMatchObject({
      height_mm: 2200,
      depth_mm: 800,
    });
  });
});
