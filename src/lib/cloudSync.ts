import type { AppState, ProjectMeta, StoredProject } from '../types';
import { MATERIALS } from '../data/materials';
import { normalizeProject } from './normalizeProject';
import { migrateState } from './state';

// ---------------------------------------------------------------------------
// Google Apps Script cloud sync
// ---------------------------------------------------------------------------

const CLOUD_URL_KEY = 'menuisier_cloud_url';
const CURRENT_VERSION = 2;

/** Default URL from Vercel env var (VITE_CLOUD_URL), if any */
function getEnvCloudUrl(): string | null {
  try {
    const envUrl = (import.meta.env?.VITE_CLOUD_URL as string | undefined)?.trim();
    return envUrl && envUrl.startsWith('https://') ? envUrl : null;
  } catch {
    return null;
  }
}

/** Get the configured Google Apps Script URL (localStorage > env var), or null */
export function getCloudUrl(): string | null {
  try {
    const stored = localStorage.getItem(CLOUD_URL_KEY);
    if (stored && stored.trim()) return stored;
  } catch {
    // ignore
  }
  return getEnvCloudUrl();
}

/** True if the cloud URL comes from the env var (read-only default) */
export function isCloudUrlFromEnv(): boolean {
  try {
    const stored = localStorage.getItem(CLOUD_URL_KEY);
    if (stored && stored.trim()) return false;
  } catch {
    // ignore
  }
  return getEnvCloudUrl() !== null;
}

/** Set the Google Apps Script URL */
export function setCloudUrl(url: string | null): void {
  try {
    if (url) {
      localStorage.setItem(CLOUD_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(CLOUD_URL_KEY);
    }
  } catch {
    // ignore
  }
}

/** Check if cloud sync is configured */
export function isCloudConfigured(): boolean {
  const url = getCloudUrl();
  return !!url && url.startsWith('https://');
}

// ---------------------------------------------------------------------------
// Cloud operations
// ---------------------------------------------------------------------------

async function cloudFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/** List all projects in the cloud */
export async function cloudList(): Promise<ProjectMeta[]> {
  const url = getCloudUrl();
  if (!url) throw new Error('Cloud non configuré');

  // Google Apps Script redirects on doGet — must follow
  const res = await cloudFetch(`${url}?action=list`, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Erreur cloud: ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return (data.projects ?? []).map((p: Record<string, unknown>) => ({
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    materialShort: String(p.materialShort ?? ''),
    bodyCount: Number(p.bodyCount ?? 0),
    createdAt: String(p.createdAt ?? ''),
    updatedAt: String(p.updatedAt ?? ''),
  }));
}

/** Load a project from the cloud */
export async function cloudLoad(id: string): Promise<AppState> {
  const url = getCloudUrl();
  if (!url) throw new Error('Cloud non configuré');

  const res = await cloudFetch(`${url}?action=load&id=${encodeURIComponent(id)}`, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Erreur cloud: ${res.status}`);

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const jsonStr = data.json;
  if (!jsonStr) throw new Error('Projet vide dans le cloud');

  const parsed: StoredProject = JSON.parse(jsonStr);
  if (!parsed?.state) throw new Error('Données invalides');

  const state = parsed.version === CURRENT_VERSION
    ? parsed.state
    : migrateState(parsed.state);

  return normalizeProject(state);
}

/** Save a project to the cloud */
export async function cloudSave(id: string, state: AppState): Promise<void> {
  const url = getCloudUrl();
  if (!url) throw new Error('Cloud non configuré');

  const mat = MATERIALS[state.materialKey];
  const stored: StoredProject = {
    version: CURRENT_VERSION,
    state: normalizeProject(state),
    savedAt: new Date().toISOString(),
  };

  const res = await cloudFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script needs text/plain for CORS
    body: JSON.stringify({
      action: 'save',
      id,
      name: state.project.name,
      materialShort: mat?.short ?? state.materialKey,
      bodyCount: state.bodies.length,
      json: JSON.stringify(stored),
    }),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`Erreur cloud: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

/** Delete a project from the cloud */
export async function cloudDelete(id: string): Promise<void> {
  const url = getCloudUrl();
  if (!url) throw new Error('Cloud non configuré');

  const res = await cloudFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'delete', id }),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`Erreur cloud: ${res.status}`);
}

/** Push all local projects to the cloud */
export async function pushAllToCloud(
  projects: ProjectMeta[],
  loadState: (id: string) => AppState | null,
): Promise<{ ok: number; errors: number }> {
  let ok = 0;
  let errors = 0;

  for (const p of projects) {
    const state = loadState(p.id);
    if (!state) { errors++; continue; }
    try {
      await cloudSave(p.id, state);
      ok++;
    } catch {
      errors++;
    }
  }

  return { ok, errors };
}

/** Pull a project from the cloud and return it (caller saves to local) */
export async function pullFromCloud(id: string): Promise<{ id: string; state: AppState }> {
  const state = await cloudLoad(id);
  return { id, state };
}
