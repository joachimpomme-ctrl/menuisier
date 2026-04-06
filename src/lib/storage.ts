import type { AppState, ProjectMeta, StoredProject, ProjectRepository } from '../types';
import { migrateState } from './state';
import { MATERIALS } from '../data/materials';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const INDEX_KEY = 'menuisier_index';
const PROJECT_PREFIX = 'menuisier_project_';
const CURRENT_KEY = 'menuisier_current';
const LEGACY_KEY = 'menuisier_project'; // v1 single-project key

const CURRENT_VERSION = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const uid = (): string => crypto.randomUUID();

function readIndex(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectMeta[];
  } catch {
    return [];
  }
}

function writeIndex(index: ProjectMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function buildMeta(id: string, state: AppState, now: string, createdAt?: string): ProjectMeta {
  const mat = MATERIALS[state.materialKey];
  return {
    id,
    name: state.project.name,
    materialShort: mat?.short ?? state.materialKey,
    bodyCount: state.bodies.length,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// V1 migration
// ---------------------------------------------------------------------------
function migrateFromV1(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.state) return;

    const state = migrateState(parsed.state);
    const id = uid();
    const now = new Date().toISOString();

    const stored: StoredProject = { version: CURRENT_VERSION, state, savedAt: now };
    localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(stored));

    const meta = buildMeta(id, state, now);
    writeIndex([meta]);

    localStorage.setItem(CURRENT_KEY, id);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    console.warn('Migration v1 échouée, données ignorées');
  }
}

// ---------------------------------------------------------------------------
// LocalProjectRepository
// ---------------------------------------------------------------------------
export class LocalProjectRepository implements ProjectRepository {
  constructor() {
    migrateFromV1();
  }

  list(): ProjectMeta[] {
    try {
      return readIndex();
    } catch {
      return [];
    }
  }

  load(id: string): AppState | null {
    try {
      const raw = localStorage.getItem(PROJECT_PREFIX + id);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredProject;
      if (!parsed || parsed.version !== CURRENT_VERSION || !parsed.state) return null;
      return parsed.state;
    } catch {
      console.warn(`Impossible de charger le projet ${id}`);
      return null;
    }
  }

  save(id: string, state: AppState): void {
    try {
      const now = new Date().toISOString();

      // Persist project data
      const stored: StoredProject = { version: CURRENT_VERSION, state, savedAt: now };
      localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(stored));

      // Update index
      const index = readIndex();
      const existing = index.find((m) => m.id === id);
      if (existing) {
        existing.name = state.project.name;
        existing.materialShort = MATERIALS[state.materialKey]?.short ?? state.materialKey;
        existing.bodyCount = state.bodies.length;
        existing.updatedAt = now;
      } else {
        index.push(buildMeta(id, state, now));
      }
      writeIndex(index);
    } catch {
      console.warn('Impossible de sauvegarder le projet');
    }
  }

  delete(id: string): void {
    try {
      localStorage.removeItem(PROJECT_PREFIX + id);
      const index = readIndex().filter((m) => m.id !== id);
      writeIndex(index);

      // Clear current pointer if it matched
      if (this.getCurrentId() === id) {
        this.setCurrentId(null);
      }
    } catch {
      console.warn(`Impossible de supprimer le projet ${id}`);
    }
  }

  duplicate(id: string, newName: string): string | null {
    try {
      const state = this.load(id);
      if (!state) return null;

      const newId = uid();
      const cloned: AppState = JSON.parse(JSON.stringify(state));
      cloned.project = { ...cloned.project, name: newName };

      this.save(newId, cloned);
      return newId;
    } catch {
      console.warn(`Impossible de dupliquer le projet ${id}`);
      return null;
    }
  }

  getCurrentId(): string | null {
    try {
      return localStorage.getItem(CURRENT_KEY);
    } catch {
      return null;
    }
  }

  setCurrentId(id: string | null): void {
    try {
      if (id === null) {
        localStorage.removeItem(CURRENT_KEY);
      } else {
        localStorage.setItem(CURRENT_KEY, id);
      }
    } catch {
      console.warn('Impossible de mettre à jour le projet courant');
    }
  }
}

// ---------------------------------------------------------------------------
// JSON export / import (standalone helpers)
// ---------------------------------------------------------------------------
export function exportToJson(state: AppState): void {
  const stored: StoredProject = {
    version: CURRENT_VERSION,
    state,
    savedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(stored, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.project.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJson(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as StoredProject;
        if (!parsed || !parsed.state) {
          reject(new Error('Format de fichier non reconnu'));
          return;
        }
        // Accept both v1 (migrated) and v2
        const state =
          parsed.version === CURRENT_VERSION
            ? parsed.state
            : migrateState(parsed.state);

        if (!state?.materialKey || !state?.project || !Array.isArray(state?.bodies)) {
          reject(new Error('Données de projet invalides'));
          return;
        }
        resolve(state);
      } catch {
        reject(new Error('Fichier JSON invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
}
