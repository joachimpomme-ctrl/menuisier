import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, ProjectMeta, StoredProject } from '../types';
import { LocalProjectRepository, StorageError, importFromJson } from '../lib/storage';
import { normalizeProject } from '../lib/normalizeProject';
import { migrateState, createInitialState } from '../lib/state';

function ensureProject(repo: LocalProjectRepository): { id: string; state: AppState; createdFresh: boolean } {
  let id = repo.getCurrentId();
  if (id) {
    const state = repo.load(id);
    if (state) return { id, state: normalizeProject(migrateState(state)), createdFresh: false };
  }
  const list = repo.list();
  if (list.length > 0) {
    id = list[0].id;
    const state = repo.load(id);
    if (state) {
      repo.setCurrentId(id);
      return { id, state: normalizeProject(migrateState(state)), createdFresh: false };
    }
  }
  const freshId = crypto.randomUUID();
  const freshState = createInitialState('cp_bouleau');
  repo.save(freshId, freshState);
  repo.setCurrentId(freshId);
  return { id: freshId, state: freshState, createdFresh: true };
}

export function useProjectRepository(repo: LocalProjectRepository) {
  const initial = useRef(ensureProject(repo));
  const [projectId, setProjectId] = useState(initial.current.id);
  const [state, setState] = useState<AppState>(initial.current.state);
  const [projects, setProjects] = useState<ProjectMeta[]>(repo.list());
  const [storageError, setStorageError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [freshProjectIds, setFreshProjectIds] = useState<Set<string>>(
    () => new Set(initial.current.createdFresh ? [initial.current.id] : []),
  );

  const safeRepoWrite = useCallback(<T,>(action: () => T): T | undefined => {
    try {
      const result = action();
      setStorageError(null);
      return result;
    } catch (err) {
      if (err instanceof StorageError) {
        setStorageError(err.message);
      } else {
        setStorageError(err instanceof Error ? err.message : 'Erreur de stockage inconnue');
      }
      console.error('Storage write failed:', err);
      return undefined;
    }
  }, []);

  const refreshProjects = useCallback(() => setProjects(repo.list()), [repo]);

  // Auto-save (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      safeRepoWrite(() => {
        repo.save(projectId, state);
        refreshProjects();
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [state, projectId, refreshProjects, safeRepoWrite, repo]);

  const switchProject = useCallback((id: string) => {
    if (safeRepoWrite(() => repo.save(projectId, state)) === undefined) return;
    const loaded = repo.load(id);
    if (loaded) {
      setState(normalizeProject(migrateState(loaded)));
      setProjectId(id);
      safeRepoWrite(() => repo.setCurrentId(id));
      refreshProjects();
    }
  }, [projectId, state, refreshProjects, safeRepoWrite, repo]);

  const createFromWizard = useCallback((newState: AppState) => {
    if (safeRepoWrite(() => repo.save(projectId, state)) === undefined) return;
    const normalized = normalizeProject(migrateState(newState));
    const newId = crypto.randomUUID();
    if (safeRepoWrite(() => {
      repo.save(newId, normalized);
      repo.setCurrentId(newId);
    }) === undefined) return;
    setProjectId(newId);
    setState(normalized);
    setFreshProjectIds((prev) => {
      const next = new Set(prev);
      next.delete(newId);
      return next;
    });
    refreshProjects();
  }, [projectId, state, refreshProjects, safeRepoWrite, repo]);

  const createEmptyProject = useCallback(() => {
    if (safeRepoWrite(() => repo.save(projectId, state)) === undefined) return;
    const newId = crypto.randomUUID();
    const freshState = createInitialState('cp_bouleau');
    if (safeRepoWrite(() => {
      repo.save(newId, freshState);
      repo.setCurrentId(newId);
    }) === undefined) return;
    setProjectId(newId);
    setState(freshState);
    setFreshProjectIds((prev) => {
      const next = new Set(prev);
      next.add(newId);
      return next;
    });
    refreshProjects();
  }, [projectId, state, refreshProjects, safeRepoWrite, repo]);

  const duplicateProject = useCallback((id: string) => {
    const source = projects.find((p) => p.id === id);
    const newId = safeRepoWrite(() => repo.duplicate(id, `${source?.name ?? 'Projet'} (copie)`));
    if (newId) {
      refreshProjects();
      switchProject(newId);
    }
  }, [projects, refreshProjects, switchProject, safeRepoWrite, repo]);

  const renameProject = useCallback((id: string, newName: string) => {
    const loaded = repo.load(id);
    if (loaded) {
      loaded.project.name = newName;
      if (safeRepoWrite(() => repo.save(id, loaded)) === undefined) return;
      if (id === projectId) {
        setState((s) => ({ ...s, project: { ...s.project, name: newName } }));
      }
      refreshProjects();
    }
  }, [projectId, refreshProjects, safeRepoWrite, repo]);

  const deleteProject = useCallback((id: string, onLastDeleted?: () => void) => {
    if (safeRepoWrite(() => repo.delete(id)) === undefined) return;
    if (id === projectId) {
      const remaining = repo.list();
      if (remaining.length > 0) {
        switchProject(remaining[0].id);
      } else if (onLastDeleted) {
        onLastDeleted();
      }
    }
    refreshProjects();
  }, [projectId, switchProject, refreshProjects, safeRepoWrite, repo]);

  const importProject = useCallback(async (file: File) => {
    try {
      const imported = await importFromJson(file);
      const migrated = normalizeProject(migrateState(imported));
      const newId = crypto.randomUUID();
      if (safeRepoWrite(() => {
        repo.save(newId, migrated);
        repo.setCurrentId(newId);
      }) === undefined) return;
      setProjectId(newId);
      setState(migrated);
      refreshProjects();
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erreur d'import");
    }
  }, [refreshProjects, safeRepoWrite, repo]);

  const pullCloud = useCallback((id: string, pulled: AppState) => {
    repo.save(id, pulled);
    setState(pulled);
    setProjectId(id);
    repo.setCurrentId(id);
    refreshProjects();
  }, [refreshProjects, repo]);

  const loadLocal = useCallback((id: string) => repo.load(id), [repo]);
  const loadFull = useCallback((id: string) => repo.loadFull(id), [repo]);
  const saveV3 = useCallback((id: string, nextState: AppState, v3Data: StoredProject['v3']) => {
    return safeRepoWrite(() => {
      repo.saveV3(id, nextState, v3Data);
      setFreshProjectIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      refreshProjects();
    });
  }, [refreshProjects, safeRepoWrite, repo]);

  return {
    projectId,
    state,
    setState,
    projects,
    storageError,
    setStorageError,
    importError,
    switchProject,
    createFromWizard,
    createEmptyProject,
    duplicateProject,
    renameProject,
    deleteProject,
    importProject,
    pullCloud,
    loadLocal,
    loadFull,
    saveV3,
    isCurrentProjectFresh: freshProjectIds.has(projectId),
  };
}
