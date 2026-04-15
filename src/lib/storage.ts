import type { AppState, ProjectMeta, StoredProject, ProjectRepository } from '../types';
import { migrateState } from './state';
import { normalizeProject } from './normalizeProject';
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

/**
 * Storage error with a user-facing message. Thrown by write operations so the
 * UI layer can surface the problem instead of silently losing data.
 */
export class StorageError extends Error {
  readonly code: 'quota' | 'unavailable' | 'unknown';
  constructor(message: string, code: 'quota' | 'unavailable' | 'unknown', cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

function isQuotaError(err: unknown): boolean {
  if (err instanceof DOMException) {
    // Firefox: NS_ERROR_DOM_QUOTA_REACHED (1014). Others: QuotaExceededError (22).
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  return false;
}

function wrapStorageError(err: unknown, action: string): StorageError {
  if (isQuotaError(err)) {
    return new StorageError(
      `Espace de stockage saturé pendant ${action}. Supprimez des projets anciens ou exportez-les avant de continuer.`,
      'quota',
      err,
    );
  }
  const msg = err instanceof Error ? err.message : String(err);
  return new StorageError(`Échec ${action} : ${msg}`, 'unknown', err);
}

function readIndex(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProjectMeta[]) : [];
  } catch (err) {
    console.error('storage: index illisible, réinitialisation', err);
    return [];
  }
}

function writeIndex(index: ProjectMeta[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    throw wrapStorageError(err, "de la mise à jour de l'index des projets");
  }
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
    return readIndex();
  }

  load(id: string): AppState | null {
    return this.loadFull(id)?.state ?? null;
  }

  loadFull(id: string): StoredProject | null {
    try {
      const raw = localStorage.getItem(PROJECT_PREFIX + id);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredProject;
      if (!parsed || parsed.version !== CURRENT_VERSION || !parsed.state) return null;
      return parsed;
    } catch (err) {
      console.error(`storage: projet ${id} illisible`, err);
      return null;
    }
  }

  /**
   * Persist a project. Throws {@link StorageError} on failure (quota,
   * unavailable localStorage, etc.). Callers must surface the error to the
   * user so data loss is not silent.
   */
  save(id: string, state: AppState): void {
    const now = new Date().toISOString();
    const normalized = normalizeProject(state);
    const existingStored = this.loadFull(id);

    const stored: StoredProject = {
      version: CURRENT_VERSION,
      state: normalized,
      savedAt: now,
      v3: existingStored?.v3,
    };
    try {
      localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(stored));
    } catch (err) {
      throw wrapStorageError(err, `de la sauvegarde du projet "${normalized.project.name}"`);
    }

    // Index update is best-effort w.r.t. atomicity but must also throw on quota
    const index = readIndex();
    const existing = index.find((m) => m.id === id);
    if (existing) {
      existing.name = normalized.project.name;
      existing.materialShort = MATERIALS[normalized.materialKey]?.short ?? normalized.materialKey;
      existing.bodyCount = normalized.bodies.length;
      existing.updatedAt = now;
    } else {
      index.push(buildMeta(id, normalized, now));
    }
    writeIndex(index);
  }

  saveV3(id: string, state: AppState, v3Data: StoredProject['v3']): void {
    const now = new Date().toISOString();
    const normalized = normalizeProject(state);
    const stored: StoredProject = {
      version: CURRENT_VERSION,
      state: normalized,
      savedAt: now,
      v3: v3Data,
    };
    try {
      localStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(stored));
    } catch (err) {
      throw wrapStorageError(err, `de la sauvegarde V3 du projet "${normalized.project.name}"`);
    }
    const index = readIndex();
    const existing = index.find((m) => m.id === id);
    if (existing) {
      existing.name = normalized.project.name;
      existing.materialShort = MATERIALS[normalized.materialKey]?.short ?? normalized.materialKey;
      existing.bodyCount = normalized.bodies.length;
      existing.updatedAt = now;
    } else {
      index.push(buildMeta(id, normalized, now));
    }
    writeIndex(index);
  }

  /**
   * Delete a project. Throws {@link StorageError} on failure.
   */
  delete(id: string): void {
    try {
      localStorage.removeItem(PROJECT_PREFIX + id);
    } catch (err) {
      throw wrapStorageError(err, `de la suppression du projet ${id}`);
    }
    const index = readIndex().filter((m) => m.id !== id);
    writeIndex(index);

    if (this.getCurrentId() === id) {
      this.setCurrentId(null);
    }
  }

  /**
   * Duplicate a project. Throws {@link StorageError} on failure.
   * Returns `null` only when the source id does not exist.
   */
  duplicate(id: string, newName: string): string | null {
    const state = this.load(id);
    if (!state) return null;

    const newId = uid();
    const cloned: AppState = JSON.parse(JSON.stringify(state));
    cloned.project = { ...cloned.project, name: newName };

    this.save(newId, cloned);
    return newId;
  }

  getCurrentId(): string | null {
    try {
      return localStorage.getItem(CURRENT_KEY);
    } catch (err) {
      console.error('storage: lecture du projet courant impossible', err);
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
    } catch (err) {
      throw wrapStorageError(err, 'de la mise à jour du projet courant');
    }
  }
}

// ---------------------------------------------------------------------------
// JSON export / import (standalone helpers)
// ---------------------------------------------------------------------------
export function syncToJson(state: AppState): void {
  const stored: StoredProject = {
    version: CURRENT_VERSION,
    state,
    savedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(stored, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `menuisier_${state.project.name.replace(/\s+/g, '_').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

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
        const migrated =
          parsed.version === CURRENT_VERSION
            ? parsed.state
            : migrateState(parsed.state);

        if (!migrated?.materialKey || !migrated?.project || !Array.isArray(migrated?.bodies)) {
          reject(new Error('Données de projet invalides'));
          return;
        }
        resolve(normalizeProject(migrated));
      } catch {
        reject(new Error('Fichier JSON invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
}
