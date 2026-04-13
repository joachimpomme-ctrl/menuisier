import { describe, it, expect, beforeEach } from 'vitest';
import { validateIntent, _resetCounter } from '../intent';
import type { ProjectIntent } from '../../knowledge/types';

// Knowledge base is not loaded in unit tests → getProjectPreset returns null.
// We test preset-filling indirectly by checking that 0-valued dims stay as-is
// (no preset available), and that dimension validation still works.

function makeIntent(overrides?: Partial<ProjectIntent>): ProjectIntent {
  return {
    furniture_type: 'bibliotheque',
    material_key: 'cp_bouleau',
    space: {
      width_mm: 800,
      height_mm: 2000,
      depth_mm: 300,
      plinth_mm: 0,
      wall_type: 'concrete',
    },
    ...overrides,
  };
}

beforeEach(() => {
  _resetCounter();
});

describe('validateIntent', () => {
  it('accepts a valid intent with no issues', () => {
    const result = validateIntent(makeIntent());
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.normalized.furniture_type).toBe('bibliotheque');
  });

  it('rejects unknown furniture type', () => {
    const result = validateIntent(makeIntent({ furniture_type: 'canape' as never }));
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('error');
    expect(result.issues[0].blocking).toBe(true);
    expect(result.issues[0].message).toContain('canape');
  });

  it('rejects out-of-range dimensions', () => {
    const result = validateIntent(
      makeIntent({
        space: {
          width_mm: 50, // < 200
          height_mm: 5000, // > 3000
          depth_mm: 300,
          plinth_mm: 0,
          wall_type: 'concrete',
        },
      }),
    );
    expect(result.valid).toBe(false);
    const blocking = result.issues.filter((i) => i.blocking);
    expect(blocking.length).toBe(2);
    expect(blocking[0].message).toContain('width_mm');
    expect(blocking[1].message).toContain('height_mm');
  });

  it('warns on unknown wall type (non-blocking)', () => {
    const result = validateIntent(
      makeIntent({
        space: {
          width_mm: 800,
          height_mm: 2000,
          depth_mm: 300,
          plinth_mm: 0,
          wall_type: 'unknown',
        },
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].severity).toBe('warning');
    expect(result.issues[0].blocking).toBe(false);
    expect(result.issues[0].message).toContain('mur inconnu');
  });
});
