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

  it('adds a piece to a body via byName.pieces.add', () => {
    const s = createInitialState();
    const target = s.bodies[0];
    if (!target) return;
    const before = target.pieces.length;
    const next = applyPatch(s, {
      bodies: {
        byName: [{
          name: target.name,
          pieces: {
            add: [{ name: 'Tablette test', type: 'tablette-fixe', length: 38, width: 25, qty: 2, thickness: 1.9 }],
          },
        }],
      },
    });
    const updated = next.bodies.find(b => b.name === target.name)!;
    expect(updated.pieces.length).toBe(before + 1);
    const added = updated.pieces[updated.pieces.length - 1];
    expect(added.name).toBe('Tablette test');
    expect(added.type).toBe('tablette-fixe');
    expect(added.length).toBe(38);
    expect(added.width).toBe(25);
    expect(added.qty).toBe(2);
    expect(added.thickness).toBe(1.9);
    expect(typeof added.id).toBe('string');
  });

  it('ignores add with invalid piece type', () => {
    const s = createInitialState();
    const target = s.bodies[0];
    if (!target) return;
    const before = target.pieces.length;
    const next = applyPatch(s, {
      bodies: {
        byName: [{
          name: target.name,
          pieces: {
            // @ts-expect-error invalid type
            add: [{ name: 'Bidon', type: 'separation', length: 30, width: 25 }],
          },
        }],
      },
    });
    const updated = next.bodies.find(b => b.name === target.name)!;
    expect(updated.pieces.length).toBe(before);
  });

  it('removes pieces by name (case-insensitive)', () => {
    const s = createInitialState();
    const target = s.bodies[0];
    if (!target || target.pieces.length === 0) return;
    const victim = target.pieces[0].name;
    const next = applyPatch(s, {
      bodies: {
        byName: [{ name: target.name, pieces: { remove: [victim.toUpperCase()] } }],
      },
    });
    const updated = next.bodies.find(b => b.name === target.name)!;
    expect(updated.pieces.find(p => p.name === victim)).toBeUndefined();
  });

  it('updates first matching piece via byName.pieces.update', () => {
    const s = createInitialState();
    const target = s.bodies[0];
    if (!target || target.pieces.length === 0) return;
    const matchName = target.pieces[0].name;
    const next = applyPatch(s, {
      bodies: {
        byName: [{
          name: target.name,
          pieces: {
            update: [{ match: matchName, length: 123, qty: 4 }],
          },
        }],
      },
    });
    const updated = next.bodies.find(b => b.name === target.name)!;
    const p = updated.pieces.find(p => p.name === matchName);
    expect(p?.length).toBe(123);
    expect(p?.qty).toBe(4);
  });

  it('matches body names case-insensitively', () => {
    const s = createInitialState();
    const target = s.bodies[0];
    if (!target) return;
    const next = applyPatch(s, {
      bodies: { byName: [{ name: target.name.toUpperCase(), depth: 42 }] },
    });
    const updated = next.bodies.find(b => b.name === target.name)!;
    expect(updated.depth).toBe(42);
  });

  it('does not mutate input state when modifying pieces', () => {
    const s = createInitialState();
    const target = s.bodies[0];
    if (!target) return;
    const snapshot = target.pieces.length;
    applyPatch(s, {
      bodies: {
        byName: [{
          name: target.name,
          pieces: { add: [{ name: 'X', type: 'autre', length: 10, width: 10 }] },
        }],
      },
    });
    expect(s.bodies[0].pieces.length).toBe(snapshot);
  });
});
