import type { AppState, StoredProject } from '../types';

const STORAGE_KEY = 'menuisier_project';
const CURRENT_VERSION = 1;

export function saveToLocalStorage(state: AppState): void {
  try {
    const stored: StoredProject = {
      version: CURRENT_VERSION,
      state,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    console.warn('Impossible de sauvegarder dans localStorage');
  }
}

export function loadFromLocalStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredProject;
    if (!parsed || parsed.version !== CURRENT_VERSION || !parsed.state) return null;
    if (!parsed.state.materialKey || !parsed.state.project || !parsed.state.bodies) return null;
    return parsed.state;
  } catch {
    console.warn('Données localStorage corrompues, ignorées');
    return null;
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
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
        if (!parsed || parsed.version !== CURRENT_VERSION) {
          reject(new Error('Format de fichier non reconnu ou version incompatible'));
          return;
        }
        if (!parsed.state?.materialKey || !parsed.state?.project || !Array.isArray(parsed.state?.bodies)) {
          reject(new Error('Données de projet invalides'));
          return;
        }
        resolve(parsed.state);
      } catch {
        reject(new Error('Fichier JSON invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsText(file);
  });
}
