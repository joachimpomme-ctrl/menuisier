import { describe, it, expect } from 'vitest';
import { extractPatches, stripPatches, applyPatch } from '../ai/aiPatch';
import { createInitialState } from '../state';

describe('aiPatch — extractPatches', () => {
  it('extracts a single patch from an apply block', () => {
    const msg = 'Voici ma proposition.\n\n```apply\n{"title":"test","project":{"wallWidth":280}}\n```';
    const patches = extractPatches(msg);
    expect(patches).toHaveLength(1);
    expect(patches[0].patch.title).toBe('test');
    expect(patches[0].patch.project?.wallWidth).toBe(280);
  });

  it('extracts multiple patches', () => {
    const msg = '```apply\n{"title":"a","panel":{"thickness":1.9}}\n```\nblah\n```apply\n{"title":"b","panel":{"thickness":2.5}}\n```';
    expect(extractPatches(msg)).toHaveLength(2);
  });

  it('returns empty array on no apply block', () => {
    expect(extractPatches('rien à appliquer ici')).toEqual([]);
  });

  it('skips invalid JSON gracefully', () => {
    const msg = '```apply\n{not valid json\n```';
    expect(extractPatches(msg)).toEqual([]);
  });
});

describe('aiPatch — stripPatches', () => {
  it('removes apply blocks from message', () => {
    const msg = 'Bonjour\n\n```apply\n{"title":"x"}\n```';
    expect(stripPatches(msg)).toBe('Bonjour');
  });
});

describe('aiPatch — applyPatch', () => {
  it('updates project fields', () => {
    const s = createInitialState();
    const next = applyPatch(s, { project: { wallWidth: 280, wallDepth: 35 } });
    expect(next.project.wallWidth).toBe(280);
    expect(next.project.wallDepth).toBe(35);
    // does not mutate
    expect(s.project.wallWidth).not.toBe(280);
  });

  it('clamps out-of-range values', () => {
    const s = createInitialState();
    const next = applyPatch(s, { project: { wallWidth: 99999 } });
    expect(next.project.wallWidth).toBeLessThanOrEqual(2000);
  });

  it('updates panel thickness', () => {
    const s = createInitialState();
    const next = applyPatch(s, { panel: { thickness: 1.9 } });
    expect(next.panel.thickness).toBe(1.9);
  });

  it('updates material if valid', () => {
    const s = createInitialState();
    const next = applyPatch(s, { material: 'mdf' });
    expect(next.materialKey).toBe('mdf');
  });

  it('ignores invalid material', () => {
    const s = createInitialState();
    const orig = s.materialKey;
    // @ts-expect-error invalid material
    const next = applyPatch(s, { material: 'unobtanium' });
    expect(next.materialKey).toBe(orig);
  });

  it('updates all bodies depth', () => {
    const s = createInitialState();
    const next = applyPatch(s, { bodies: { all: { depth: 35 } } });
    next.bodies.forEach(b => expect(b.depth).toBe(35));
  });

  it('updates body by name', () => {
    const s = createInitialState();
    const targetName = s.bodies[0]?.name;
    if (!targetName) return;
    const next = applyPatch(s, { bodies: { byName: [{ name: targetName, width: 123 }] } });
    expect(next.bodies[0].width).toBe(123);
  });

  it('ignores fields not in patch', () => {
    const s = createInitialState();
    const next = applyPatch(s, { project: { wallWidth: 250 } });
    expect(next.project.ceilingHeight).toBe(s.project.ceilingHeight);
    expect(next.panel.thickness).toBe(s.panel.thickness);
  });
});
