import { beforeEach, describe, expect, it } from 'vitest';
import { LocalProjectRepository } from '../storage';
import { createInitialState } from '../state';
import type { ProjectIntent, FurnitureType } from '../knowledge/types';
import type { MaterialKey, StoredProject } from '../../types';

const store: Record<string, string> = {};

function makeV3Data(overrides: Partial<NonNullable<StoredProject['v3']>> = {}): NonNullable<StoredProject['v3']> {
  const intent: ProjectIntent = {
    furniture_type: 'bibliotheque',
    material_key: 'cp_bouleau',
    space: {
      width_mm: 800,
      height_mm: 1800,
      depth_mm: 300,
      plinth_mm: 0,
      wall_type: 'concrete',
    },
    zones: [
      { module_id: 'shelf_adjustable', height_mm: 1800, config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 } },
    ],
  };

  return {
    intent,
    materialKey: 'cp_bouleau' as MaterialKey,
    furnitureType: 'bibliotheque' as FurnitureType,
    ...overrides,
  };
}

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    },
    writable: true,
    configurable: true,
  });
});

describe('LocalProjectRepository V3 persistence', () => {
  it('saveV3 persists V3 wizard data and loadFull returns it', () => {
    const repo = new LocalProjectRepository();
    const state = createInitialState('cp_bouleau');
    const v3Data = makeV3Data();

    repo.saveV3('project-v3', state, v3Data);

    const full = repo.loadFull('project-v3');
    expect(full).not.toBeNull();
    expect(full?.v3).toEqual(v3Data);
  });

  it('load stays backward-compatible and still returns AppState only', () => {
    const repo = new LocalProjectRepository();
    const state = createInitialState('cp_bouleau');

    repo.saveV3('project-v3', state, makeV3Data());

    const loaded = repo.load('project-v3');
    expect(loaded?.project.name).toBe(state.project.name);
    expect((loaded as { v3?: unknown } | null)?.v3).toBeUndefined();
  });

  it('loadFull returns null for a missing project', () => {
    const repo = new LocalProjectRepository();

    expect(repo.loadFull('missing')).toBeNull();
  });

  it('legacy project without v3 remains readable through loadFull', () => {
    const repo = new LocalProjectRepository();
    const state = createInitialState('melamine');

    repo.save('legacy-project', state);

    const full = repo.loadFull('legacy-project');
    expect(full).not.toBeNull();
    expect(full?.state.project.name).toBe(state.project.name);
    expect(full?.v3).toBeUndefined();
  });

  it('round-trips serialized V3 intent data unchanged', () => {
    const repo = new LocalProjectRepository();
    const state = createInitialState('cp_bouleau');
    const v3Data = makeV3Data({
      furnitureType: 'placard',
      materialKey: 'melamine',
      intent: {
        furniture_type: 'placard',
        material_key: 'melamine',
        space: {
          width_mm: 600,
          height_mm: 2000,
          depth_mm: 600,
          plinth_mm: 80,
          wall_type: 'concrete',
        },
        door_override: false,
      },
    });

    repo.saveV3('round-trip', state, v3Data);

    const full = repo.loadFull('round-trip');
    expect(full?.v3?.intent.furniture_type).toBe('placard');
    expect(full?.v3?.materialKey).toBe('melamine');
  });

  it('save preserves existing V3 metadata during later legacy autosaves', () => {
    const repo = new LocalProjectRepository();
    const state = createInitialState('cp_bouleau');
    const v3Data = makeV3Data();

    repo.saveV3('project-v3', state, v3Data);
    repo.save('project-v3', { ...state, project: { ...state.project, name: 'Renamed' } });

    const full = repo.loadFull('project-v3');
    expect(full?.state.project.name).toBe('Renamed');
    expect(full?.v3).toEqual(v3Data);
  });
});
