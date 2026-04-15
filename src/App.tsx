import { useState, useEffect, useRef, useCallback } from 'react';
import type { TabKey } from './types';
import { exportToJson, LocalProjectRepository } from './lib/storage';
import { isCloudConfigured, getCloudUrl, setCloudUrl } from './lib/cloudSync';
import { normalizeProject } from './lib/normalizeProject';
import { useProjectRepository } from './hooks/useProjectRepository';
import { useProjectAnalysis } from './hooks/useProjectAnalysis';
import StructureTab from './components/StructureTab';
import DebitTab from './components/DebitTab';
import MontageTab from './components/MontageTab';
import NoticeTab from './components/NoticeTab';
import ValidationTab from './components/ValidationTab';
import AssistantTab from './components/AssistantTab';
import PlanTab from './components/PlanTab';
import ProjectManager from './components/ProjectManager';
import CloudSync from './components/CloudSync';
import InstallBanner from './components/InstallBanner';
import NewProjectWizard from './components/NewProjectWizard';
import StepType from './components/wizard/StepType';
import StepSpace from './components/wizard/StepSpace';
import StepOrganize from './components/wizard/StepOrganize';
import Dashboard from './components/result/Dashboard';
import { runPipeline, pipelineResultToAppState } from './lib/engine/pipeline';
import type { PipelineResult } from './lib/engine/pipeline';
import type { FurnitureType, SpaceDimensions, ProjectIntent } from './lib/knowledge/types';
import type { MaterialKey } from './types';
import PartsLibraryManager from './components/library/PartsLibraryManager';
import MoreMenu from './components/MoreMenu';
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

export default function App() {
  const {
    projectId,
    state,
    setState,
    projects,
    storageError,
    setStorageError,
    importError,
    switchProject,
    createFromWizard,
    duplicateProject,
    renameProject,
    deleteProject,
    importProject,
    pullCloud,
    loadLocal,
    loadFull,
    saveV3,
  } = useProjectRepository(repo);

  const {
    mat,
    analysis,
    allPieces,
    totalPieces,
    totalPanelCount,
    totalCost,
    allPanelDefs,
    nesting,
    nestingByPanel,
    validation,
    steps,
    cost,
  } = useProjectAnalysis(state);

  const [tab, setTab] = useState<TabKey>('structure');
  const [showProjects, setShowProjects] = useState(false);
  const [showCloud, setShowCloud] = useState(false);
  const [showNewWizard, setShowNewWizard] = useState(false);
  const [showPartsLibrary, setShowPartsLibrary] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // --- V3 wizard state ---
  const [v3Mode, setV3Mode] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [v3FurnitureType, setV3FurnitureType] = useState<FurnitureType>('bibliotheque');
  const [v3Space, setV3Space] = useState<SpaceDimensions | null>(null);
  const [v3MaterialKey, setV3MaterialKey] = useState<MaterialKey>('cp_bouleau');
  const [v3Intent, setV3Intent] = useState<ProjectIntent | null>(null);
  const [v3Result, setV3Result] = useState<PipelineResult | null>(null);

  useEffect(() => {
    const full = loadFull(projectId);
    if (full?.v3) {
      const intent = full.v3.intent;
      setV3Mode(true);
      setWizardStep(4);
      setV3FurnitureType(full.v3.furnitureType);
      setV3MaterialKey(full.v3.materialKey);
      setV3Intent(intent);
      setV3Result(runPipeline(intent));
      return;
    }
    setV3Mode(false);
    setWizardStep(1);
    setV3Intent(null);
    setV3Result(null);
  }, [projectId, loadFull]);

  const handleNewProject = useCallback(() => {
    setShowProjects(false);
    setShowNewWizard(true);
  }, []);

  const handleCreateFromWizard = useCallback((newState: Parameters<typeof createFromWizard>[0]) => {
    createFromWizard(newState);
    setShowNewWizard(false);
  }, [createFromWizard]);

  const handleDuplicate = useCallback((id: string) => {
    duplicateProject(id);
  }, [duplicateProject]);

  const handleDeleteProject = useCallback((id: string) => {
    deleteProject(id, handleNewProject);
  }, [deleteProject, handleNewProject]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importProject(file);
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
          <div className="flex flex-col gap-3">
            <div className="min-w-0">
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
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => { setV3Mode(true); setWizardStep(1); setV3Result(null); }}
                className="text-xs px-3.5 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-200 font-semibold whitespace-nowrap flex-shrink-0"
              >
                + Nouveau projet
              </button>
              <button
                onClick={() => setShowProjects(true)}
                className="text-xs px-3 py-2 rounded-xl bg-white text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-amber-300 hover:bg-amber-50 active:scale-95 transition-all shadow-sm whitespace-nowrap flex-shrink-0"
              >
                Mes projets
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

          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 -mx-1 px-1">
            <button
              onClick={() => setShowPartsLibrary(true)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:text-amber-800 border border-amber-200 hover:bg-amber-100 whitespace-nowrap transition-colors"
              title="Bibliothèque de pièces standard"
            >
              📚 Bibliothèque
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <MoreMenu
              onExport={() => exportToJson(state)}
              onImport={() => importRef.current?.click()}
            />
          </div>

          {importError && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {importError}
            </div>
          )}

          {storageError && (
            <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-300 rounded-xl px-3 py-2 flex items-start gap-2">
              <span className="font-semibold shrink-0">⚠ Stockage :</span>
              <span className="flex-1">{storageError}</span>
              <button
                onClick={() => setStorageError(null)}
                className="shrink-0 text-red-500 hover:text-red-700 font-bold"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* V3 Wizard */}
        {v3Mode ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-stone-400">Étape {wizardStep}/4</span>
              <button
                onClick={() => setV3Mode(false)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                ✕ Fermer
              </button>
            </div>

            {wizardStep === 1 && (
              <StepType
                onSelect={(type) => {
                  setV3FurnitureType(type);
                  setWizardStep(2);
                }}
              />
            )}

            {wizardStep === 2 && (
              <StepSpace
                furnitureType={v3FurnitureType}
                onBack={() => setWizardStep(1)}
                onNext={(space, matKey) => {
                  setV3Space(space);
                  setV3MaterialKey(matKey);
                  setWizardStep(3);
                }}
              />
            )}

            {wizardStep === 3 && v3Space && (
              <StepOrganize
                furnitureType={v3FurnitureType}
                space={v3Space}
                materialKey={v3MaterialKey}
                onBack={() => setWizardStep(2)}
                onGenerate={(intent) => {
                  setV3Intent(intent);
                  const result = runPipeline(intent);
                  setV3Result(result);
                  // Pre-convert to AppState so header stats update immediately
                  const converted = pipelineResultToAppState(result, intent.material_key);
                  converted.project.name = intent.furniture_type.replace(/_/g, ' ');
                  setState(normalizeProject(converted));
                  setWizardStep(4);
                  saveV3(projectId, normalizeProject(converted), {
                    intent,
                    materialKey: intent.material_key,
                    furnitureType: intent.furniture_type,
                  });
                }}
              />
            )}

            {wizardStep === 4 && v3Intent && v3Result && (
              <Dashboard
                intent={v3Intent}
                result={v3Result}
                materialKey={v3MaterialKey}
                onModify={() => setWizardStep(3)}
                onClassicEditor={(appState) => {
                  setState(normalizeProject(appState));
                  setV3Mode(false);
                }}
              />
            )}
          </div>
        ) : (
          <>
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
                onApplyState={(next) => setState(normalizeProject(next))}
              />
            </div>
          </>
        )}
      </div>

      {/* PWA Install Banner */}
      <InstallBanner />

      {/* New Project Wizard */}
      <NewProjectWizard
        isOpen={showNewWizard}
        onClose={() => setShowNewWizard(false)}
        onCreate={handleCreateFromWizard}
      />
      {/* Cloud Sync Modal */}
      <CloudSync
        isOpen={showCloud}
        onClose={() => setShowCloud(false)}
        projectId={projectId}
        state={state}
        localProjects={projects}
        loadLocal={loadLocal}
        onPull={(id, pulled) => {
          pullCloud(id, pulled);
          setShowCloud(false);
        }}
      />

      {/* Parts Library Manager */}
      <PartsLibraryManager
        isOpen={showPartsLibrary}
        onClose={() => setShowPartsLibrary(false)}
      />

      {/* Project Manager Modal */}
      <ProjectManager
        isOpen={showProjects}
        onClose={() => setShowProjects(false)}
        projects={projects}
        currentId={projectId}
        onLoad={(id) => {
          switchProject(id);
          setShowProjects(false);
        }}
        onNew={handleNewProject}
        onDuplicate={handleDuplicate}
        onRename={renameProject}
        onDelete={handleDeleteProject}
      />
    </div>
  );
}
