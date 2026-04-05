import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { AppState, TabKey, PieceWithBody, ProjectMeta } from './types';
import { MATERIALS } from './data/materials';
import { createInitialState, migrateState } from './lib/state';
import { optimizeNesting } from './lib/nesting';
import { validate } from './lib/validation';
import { generateSteps } from './lib/steps';
import { estimateCost } from './lib/cost';
// PDF lazy-loaded pour code-split (jsPDF est gros)
import { LocalProjectRepository, exportToJson, importFromJson } from './lib/storage';
import StructureTab from './components/StructureTab';
import DebitTab from './components/DebitTab';
import MontageTab from './components/MontageTab';
import NoticeTab from './components/NoticeTab';
import ValidationTab from './components/ValidationTab';
import AssistantTab from './components/AssistantTab';
import ProjectManager from './components/ProjectManager';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'structure', label: 'Structure', icon: '⚙' },
  { key: 'debit', label: 'Débit', icon: '✂' },
  { key: 'montage', label: 'Montage', icon: '📐' },
  { key: 'notice', label: 'Notice', icon: '📋' },
  { key: 'validation', label: 'Contrôle', icon: '●' },
  { key: 'ia', label: 'Assistant IA', icon: '🤖' },
];

// Singleton repository — shared across renders
const repo = new LocalProjectRepository();

function ensureProject(): { id: string; state: AppState } {
  let id = repo.getCurrentId();
  if (id) {
    const state = repo.load(id);
    if (state) return { id, state: migrateState(state) };
  }
  // No current project — check if any exist
  const list = repo.list();
  if (list.length > 0) {
    id = list[0].id;
    const state = repo.load(id);
    if (state) {
      repo.setCurrentId(id);
      return { id, state: migrateState(state) };
    }
  }
  // Create a fresh project
  const freshId = Math.random().toString(36).slice(2, 8);
  const freshState = createInitialState('cp_bouleau');
  repo.save(freshId, freshState);
  repo.setCurrentId(freshId);
  return { id: freshId, state: freshState };
}

export default function App() {
  const initial = useRef(ensureProject());
  const [projectId, setProjectId] = useState(initial.current.id);
  const [state, setState] = useState<AppState>(initial.current.state);
  const [tab, setTab] = useState<TabKey>('structure');
  const [projects, setProjects] = useState<ProjectMeta[]>(repo.list());
  const [showProjects, setShowProjects] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const mat = MATERIALS[state.materialKey];
  const usableHeight = state.project.ceilingHeight - state.project.plinthHeight;

  const allPieces: PieceWithBody[] = useMemo(
    () => state.bodies.flatMap((b) => b.pieces.map((p) => ({ ...p, bodyName: b.name, bodyId: b.id }))),
    [state.bodies]
  );
  const totalPieces = useMemo(() => allPieces.reduce((s, p) => s + p.qty, 0), [allPieces]);
  const nesting = useMemo(() => optimizeNesting(allPieces, state.panel.width, state.panel.height, state.kerf), [allPieces, state.panel, state.kerf]);
  const validation = useMemo(() => validate(state), [state]);
  const steps = useMemo(() => generateSteps(state), [state]);
  const cost = useMemo(() => estimateCost(state, nesting), [state, nesting]);

  const refreshProjects = useCallback(() => setProjects(repo.list()), []);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      repo.save(projectId, state);
      refreshProjects();
    }, 500);
    return () => clearTimeout(timer);
  }, [state, projectId, refreshProjects]);

  const switchProject = useCallback((id: string) => {
    // Save current first
    repo.save(projectId, state);
    const loaded = repo.load(id);
    if (loaded) {
      setState(migrateState(loaded));
      setProjectId(id);
      repo.setCurrentId(id);
      refreshProjects();
      setShowProjects(false);
    }
  }, [projectId, state, refreshProjects]);

  const handleNewProject = useCallback(() => {
    repo.save(projectId, state);
    const newId = Math.random().toString(36).slice(2, 8);
    const newState = createInitialState('cp_bouleau');
    repo.save(newId, newState);
    repo.setCurrentId(newId);
    setProjectId(newId);
    setState(newState);
    refreshProjects();
    setShowProjects(false);
  }, [projectId, state, refreshProjects]);

  const handleDuplicate = useCallback((id: string) => {
    const source = projects.find((p) => p.id === id);
    const newId = repo.duplicate(id, `${source?.name ?? 'Projet'} (copie)`);
    if (newId) {
      refreshProjects();
      switchProject(newId);
    }
  }, [projects, refreshProjects, switchProject]);

  const handleRename = useCallback((id: string, newName: string) => {
    const loaded = repo.load(id);
    if (loaded) {
      loaded.project.name = newName;
      repo.save(id, loaded);
      if (id === projectId) {
        setState((s) => ({ ...s, project: { ...s.project, name: newName } }));
      }
      refreshProjects();
    }
  }, [projectId, refreshProjects]);

  const handleDeleteProject = useCallback((id: string) => {
    repo.delete(id);
    if (id === projectId) {
      const remaining = repo.list();
      if (remaining.length > 0) {
        switchProject(remaining[0].id);
      } else {
        handleNewProject();
      }
    }
    refreshProjects();
  }, [projectId, switchProject, handleNewProject, refreshProjects]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromJson(file);
      const migrated = migrateState(imported);
      const newId = Math.random().toString(36).slice(2, 8);
      repo.save(newId, migrated);
      repo.setCurrentId(newId);
      setProjectId(newId);
      setState(migrated);
      refreshProjects();
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erreur d'import");
    }
    e.target.value = '';
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const { generatePdf } = await import('./lib/pdf');
      await generatePdf(state, nesting, validation, steps, cost);
    } catch (err) {
      console.error('Erreur PDF:', err);
    }
    setPdfLoading(false);
  };

  const handlePriceChange = (price: number) => {
    setState((s) => ({ ...s, costConfig: { ...s.costConfig, panelPrice: price } }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-amber-400 tracking-wide truncate">{state.project.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                <span>{mat.short} {state.panel.thickness * 10}mm</span>
                <span className="text-zinc-700">·</span>
                <span>{totalPieces} pcs</span>
                <span className="text-zinc-700">·</span>
                <span>{nesting.metrics.panelCount} panneaux</span>
                <span className="text-zinc-700">·</span>
                <span>{usableHeight} cm utile</span>
                {cost.configured && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="text-amber-400 font-medium">{cost.totalMaterial.toFixed(0)}€</span>
                  </>
                )}
                {validation.errors.length > 0 && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="text-red-400 font-medium">{validation.errors.length} err.</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              <button
                onClick={() => setShowProjects(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Projets
              </button>
              <button
                onClick={() => exportToJson(state)}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                JSON
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Import
              </button>
              <button
                onClick={handleExportPdf}
                disabled={pdfLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {pdfLoading ? 'PDF...' : 'PDF'}
              </button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            </div>
          </div>
          {importError && (
            <div className="mt-2 text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
              {importError}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map((t) => {
            const isValidation = t.key === 'validation';
            const hasErrors = validation.errors.length > 0;
            const icon = isValidation ? (hasErrors ? '🔴' : '🟢') : t.icon;
            const label = isValidation && hasErrors ? `${t.label} (${validation.errors.length})` : t.label;

            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  tab === t.key
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {icon} {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'structure' && <StructureTab state={state} onChange={setState} />}
        {tab === 'debit' && (
          <DebitTab
            state={state}
            allPieces={allPieces}
            nesting={nesting}
            cost={cost}
            onPriceChange={handlePriceChange}
          />
        )}
        {tab === 'montage' && <MontageTab state={state} />}
        {tab === 'notice' && <NoticeTab steps={steps} materialName={mat.name} thickness={state.panel.thickness} />}
        {tab === 'validation' && <ValidationTab validation={validation} />}
        {tab === 'ia' && (
          <AssistantTab
            state={state}
            validation={validation}
            allPieces={allPieces}
            totalPieces={totalPieces}
            panelCount={nesting.metrics.panelCount}
          />
        )}
      </div>

      {/* Project Manager Modal */}
      <ProjectManager
        isOpen={showProjects}
        onClose={() => setShowProjects(false)}
        projects={projects}
        currentId={projectId}
        onLoad={switchProject}
        onNew={handleNewProject}
        onDuplicate={handleDuplicate}
        onRename={handleRename}
        onDelete={handleDeleteProject}
      />
    </div>
  );
}
