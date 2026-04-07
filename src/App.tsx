import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { AppState, TabKey, ProjectMeta, PanelDef } from './types';
import { MATERIALS } from './data/materials';
import { createInitialState, migrateState } from './lib/state';
import { normalizeProject } from './lib/normalizeProject';
import { optimizeNesting } from './lib/nesting';
import { validate } from './lib/validation';
import { generateSteps } from './lib/steps';
import { estimateCost } from './lib/cost';
import { analyzeProject } from './lib/projectAnalysis';
// PDF lazy-loaded pour code-split (jsPDF est gros)
import { LocalProjectRepository, exportToJson, syncToJson, importFromJson } from './lib/storage';
import { seedBaseKnowledge } from './lib/knowledgeStore';
import { isCloudConfigured, getCloudUrl, setCloudUrl } from './lib/cloudSync';
import StructureTab from './components/StructureTab';
import DebitTab from './components/DebitTab';
import MontageTab from './components/MontageTab';
import NoticeTab from './components/NoticeTab';
import ValidationTab from './components/ValidationTab';
import AssistantTab from './components/AssistantTab';
import PlanTab from './components/PlanTab';
import ProjectManager from './components/ProjectManager';
import KnowledgeManager from './components/KnowledgeManager';
import CloudSync from './components/CloudSync';
import InstallBanner from './components/InstallBanner';
import NewProjectWizard from './components/NewProjectWizard';
import Tip from './components/Tip';
import TIPS from './data/tips';

const TABS: { key: TabKey; label: string; shortLabel: string; icon: string }[] = [
  { key: 'structure', label: 'Structure', shortLabel: 'Struct.', icon: '⚙' },
  { key: 'plans', label: 'Plans 2D', shortLabel: 'Plans', icon: '📏' },
  { key: 'debit', label: 'Débit', shortLabel: 'Débit', icon: '✂' },
  { key: 'montage', label: 'Montage', shortLabel: 'Mont.', icon: '📐' },
  { key: 'notice', label: 'Notice', shortLabel: 'Notice', icon: '📋' },
  { key: 'validation', label: 'Contrôle', shortLabel: 'Ctrl', icon: '●' },
  { key: 'ia', label: 'Assistant IA', shortLabel: 'IA', icon: '🤖' },
];

// Singleton repository — shared across renders
const repo = new LocalProjectRepository();

function ensureProject(): { id: string; state: AppState } {
  let id = repo.getCurrentId();
  if (id) {
    const state = repo.load(id);
    if (state) return { id, state: normalizeProject(migrateState(state)) };
  }
  // No current project — check if any exist
  const list = repo.list();
  if (list.length > 0) {
    id = list[0].id;
    const state = repo.load(id);
    if (state) {
      repo.setCurrentId(id);
      return { id, state: normalizeProject(migrateState(state)) };
    }
  }
  // Create a fresh project
  const freshId = crypto.randomUUID();
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
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [showCloud, setShowCloud] = useState(false);
  const [showNewWizard, setShowNewWizard] = useState(false);
  const [, setKnowledgeVersion] = useState(0); // trigger re-render on knowledge update
  const [importError, setImportError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const mat = MATERIALS[state.materialKey];

  // Single source of truth for all project metrics
  const analysis = useMemo(() => analyzeProject(state), [state]);

  // Backward-compat aliases used by child components
  const allPieces = analysis.allPieces;
  const totalPieces = analysis.totalPieces;
  const nestingByPanel = analysis.panels.map(p => ({ panelDef: p.panelDef, nesting: p.nesting, pieces: p.pieces }));
  const allPanelDefs = useMemo(() => {
    const defaultPanelDef: PanelDef = {
      id: 'default',
      label: `${mat.short} ${state.panel.thickness * 10}mm`,
      width: state.panel.width,
      height: state.panel.height,
      thickness: state.panel.thickness,
      price: state.costConfig.panelPrice,
    };
    return [defaultPanelDef, ...(state.extraPanels ?? [])];
  }, [mat.short, state.panel, state.costConfig.panelPrice, state.extraPanels]);
  const nesting = analysis.panels.find(p => p.panelDef.id === 'default')?.nesting
    ?? optimizeNesting([], state.panel.width, state.panel.height, state.kerf);
  const totalPanelCount = analysis.totalPanelCount;
  const totalCost = analysis.totalCost;

  const validation = useMemo(() => validate(state), [state]);
  const steps = useMemo(() => generateSteps(state), [state]);
  const cost = useMemo(() => estimateCost(state, nesting), [state, nesting]);

  const refreshProjects = useCallback(() => setProjects(repo.list()), []);

  // Seed base knowledge on first launch
  useEffect(() => { seedBaseKnowledge(); }, []);

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
      setState(normalizeProject(migrateState(loaded)));
      setProjectId(id);
      repo.setCurrentId(id);
      refreshProjects();
      setShowProjects(false);
    }
  }, [projectId, state, refreshProjects]);

  const handleNewProject = useCallback(() => {
    setShowProjects(false);
    setShowNewWizard(true);
  }, []);

  const handleCreateFromWizard = useCallback((newState: AppState) => {
    repo.save(projectId, state);
    const newId = crypto.randomUUID();
    repo.save(newId, newState);
    repo.setCurrentId(newId);
    setProjectId(newId);
    setState(newState);
    refreshProjects();
    setShowNewWizard(false);
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
      const migrated = normalizeProject(migrateState(imported));
      const newId = crypto.randomUUID();
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
      await generatePdf(state, analysis, validation, steps);
    } catch (err) {
      console.error('Erreur PDF:', err);
    }
    setPdfLoading(false);
  };

  const handlePriceChange = (price: number) => {
    setState((s) => ({ ...s, costConfig: { ...s.costConfig, panelPrice: price } }));
  };

  return (
    <div className="min-h-screen min-h-dvh text-stone-800 bg-[#faf8f5]">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 sm:py-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold text-amber-800 truncate">{state.project.name}</h1>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500 flex-wrap">
                <span className="bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-medium">{mat.short} {state.panel.thickness * 10}mm</span>
                <span className="bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5">{totalPieces} pcs</span>
                <span className="bg-stone-100 border border-stone-200 rounded-full px-2 py-0.5">{totalPanelCount} pan.</span>
                {totalCost > 0 && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">{totalCost.toFixed(0)} €</span>
                )}
                {validation.errors.length > 0 && (
                  <span className="bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5 font-medium">{validation.errors.length} err.</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setShowProjects(true)}
                className="text-xs px-3 py-2 rounded-xl bg-white text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-amber-300 hover:bg-amber-50 active:scale-95 transition-all shadow-sm"
              >
                Projets
              </button>
              <button
                onClick={() => {
                  if (!isCloudConfigured()) {
                    const url = prompt('Colle l\'URL de ton Google Apps Script :', getCloudUrl() ?? '');
                    if (url && url.startsWith('https://')) {
                      setCloudUrl(url);
                    }
                    if (!url) return;
                  }
                  setShowCloud(true);
                }}
                className={`text-xs px-3 py-2 rounded-xl active:scale-95 transition-all shadow-sm ${
                  isCloudConfigured()
                    ? 'bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100'
                    : 'bg-white text-stone-400 border border-stone-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600'
                }`}
                title="Sync cloud Google Sheets"
              >
                ☁️
              </button>
              <Tip text={TIPS['export-pdf']} side="bottom">
                <button
                  onClick={handleExportPdf}
                  disabled={pdfLoading}
                  className="text-xs px-3 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-amber-200"
                >
                  {pdfLoading ? '...' : 'PDF'}
                </button>
              </Tip>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            <Tip text={TIPS['savoirs']} side="bottom">
              <button
                onClick={() => setShowKnowledge(true)}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-500 hover:text-stone-700 border border-stone-200 whitespace-nowrap transition-colors"
              >
                Savoirs
              </button>
            </Tip>
            <Tip text={TIPS['export-json']} side="bottom">
              <button
                onClick={() => exportToJson(state)}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-500 hover:text-stone-700 border border-stone-200 whitespace-nowrap transition-colors"
              >
                JSON
              </button>
            </Tip>
            <button
              onClick={() => syncToJson(state)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-500 hover:text-stone-700 border border-stone-200 whitespace-nowrap transition-colors"
              title="Télécharge avec un nom fixe pour sync Drive"
            >
              Sync
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-500 hover:text-stone-700 border border-stone-200 whitespace-nowrap transition-colors"
            >
              Import
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>

          {importError && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {importError}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-5 overflow-x-auto hide-scrollbar pb-0.5 -mx-1 px-1">
          {TABS.map((t) => {
            const isValidation = t.key === 'validation';
            const hasErrors = validation.errors.length > 0;
            const icon = isValidation ? (hasErrors ? '🔴' : '🟢') : t.icon;
            const errSuffix = isValidation && hasErrors ? ` (${validation.errors.length})` : '';

            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-2.5 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap active:scale-95 transition-all flex-shrink-0 ${
                  tab === t.key
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                    : 'bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700 border border-stone-200'
                }`}
              >
                {icon} <span className="sm:hidden">{t.shortLabel}{errSuffix}</span><span className="hidden sm:inline">{t.label}{errSuffix}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'structure' && <StructureTab state={state} onChange={setState} allPanelDefs={allPanelDefs} />}
        {tab === 'plans' && <PlanTab state={state} />}
        {tab === 'debit' && (
          <DebitTab
            state={state}
            onChange={setState}
            allPieces={allPieces}
            nesting={nesting}
            nestingByPanel={nestingByPanel}
            allPanelDefs={allPanelDefs}
            cost={cost}
            onPriceChange={handlePriceChange}
            analysis={analysis}
          />
        )}
        {tab === 'montage' && <MontageTab state={state} />}
        {tab === 'notice' && <NoticeTab steps={steps} materialName={mat.name} thickness={state.panel.thickness} />}
        {tab === 'validation' && <ValidationTab validation={validation} onGoToStructure={() => setTab('structure')} />}
        {/* AssistantTab is always mounted (hidden when inactive) to preserve chat history */}
        <div style={{ display: tab === 'ia' ? 'block' : 'none' }}>
          <AssistantTab
            state={state}
            validation={validation}
            allPieces={allPieces}
            totalPieces={totalPieces}
            panelCount={nesting.metrics.panelCount}
            projectId={projectId}
          />
        </div>
      </div>

      {/* PWA Install Banner */}
      <InstallBanner />

      {/* New Project Wizard */}
      <NewProjectWizard
        isOpen={showNewWizard}
        onClose={() => setShowNewWizard(false)}
        onCreate={handleCreateFromWizard}
      />

      {/* Knowledge Manager Modal */}
      <KnowledgeManager
        isOpen={showKnowledge}
        onClose={() => setShowKnowledge(false)}
        onUpdate={() => setKnowledgeVersion((v) => v + 1)}
      />

      {/* Cloud Sync Modal */}
      <CloudSync
        isOpen={showCloud}
        onClose={() => setShowCloud(false)}
        projectId={projectId}
        state={state}
        localProjects={projects}
        loadLocal={(id) => repo.load(id)}
        onPull={(id, pulled) => {
          repo.save(id, pulled);
          setState(pulled);
          setProjectId(id);
          repo.setCurrentId(id);
          refreshProjects();
          setShowCloud(false);
        }}
      />

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
