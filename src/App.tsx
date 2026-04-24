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
import HelpGuide from './components/HelpGuide';

const TABS: { key: TabKey; label: string; shortLabel: string }[] = [
  { key: 'structure', label: 'Structure', shortLabel: 'Struct.' },
  { key: 'plans',     label: 'Plans 2D',  shortLabel: 'Plans'   },
  { key: 'debit',     label: 'Débit',     shortLabel: 'Débit'   },
  { key: 'montage',   label: 'Montage',   shortLabel: 'Mont.'   },
  { key: 'notice',    label: 'Notice',    shortLabel: 'Notice'  },
  { key: 'validation',label: 'Contrôle', shortLabel: 'Ctrl'    },
  { key: 'ia',        label: 'Assistant', shortLabel: 'IA'      },
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
  const [showHelp, setShowHelp] = useState(false);
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

  const handleCloudOpen = () => {
    if (!isCloudConfigured()) {
      const url = prompt('Colle l\'URL de ton Google Apps Script :', getCloudUrl() ?? '');
      if (url && url.startsWith('https://')) setCloudUrl(url);
      if (!url) return;
    }
    setShowCloud(true);
  };

  const handlePriceChange = (price: number) => {
    setState((s) => ({ ...s, costConfig: { ...s.costConfig, panelPrice: price } }));
  };

  const hasErrors = validation.errors.length > 0;

  return (
    <div className="min-h-screen min-h-dvh text-[#1c1714] bg-[#f5f1eb]">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 sm:py-6">

        {/* Header — 1 rangée */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            {/* Left: label + project name */}
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-widest text-[#9d9089] leading-none mb-0.5">
                Projet actif
              </p>
              <h1 className="text-base font-semibold text-[#1c1714] truncate leading-tight">
                {state.project.name}
              </h1>
            </div>

            {/* Right: + Nouveau + ··· */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setShowNewWizard(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#6b4c2a] text-white font-semibold hover:bg-[#5a3e22] active:scale-95 transition-all whitespace-nowrap"
              >
                + Nouveau
              </button>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <MoreMenu
                onExport={() => exportToJson(state)}
                onImport={() => importRef.current?.click()}
                onPdf={handleExportPdf}
                pdfLoading={pdfLoading}
                onCloud={handleCloudOpen}
                cloudConfigured={isCloudConfigured()}
                onLibrary={() => setShowPartsLibrary(true)}
                onHelp={() => setShowHelp(true)}
                onProjects={() => setShowProjects(true)}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="bg-[#f2ebe0] text-[#6b4c2a] border border-[#e0d8ce] rounded px-2 py-px font-medium">
              {mat.short} {state.panel.thickness * 10}mm
            </span>
            <span className="bg-[#faf8f4] border border-[#e0d8ce] rounded px-2 py-px font-mono tabular-nums">
              {totalPieces} pcs
            </span>
            <span className="bg-[#faf8f4] border border-[#e0d8ce] rounded px-2 py-px font-mono tabular-nums">
              {totalPanelCount} pan.
            </span>
            {totalCost > 0 && (
              <span className="bg-[#e4f0e8] text-[#2f6144] border border-[#c8ddd0] rounded px-2 py-px font-mono tabular-nums font-medium">
                {totalCost.toFixed(0)} €
              </span>
            )}
            {hasErrors && (
              <span className="bg-[#fae8e8] text-[#7a2424] border border-[#e8c8c8] rounded px-2 py-px font-medium">
                {validation.errors.length} err.
              </span>
            )}
          </div>

          {importError && (
            <div className="mt-2 text-xs text-[#7a2424] bg-[#fae8e8] border border-[#e8c8c8] rounded-lg px-3 py-2">
              {importError}
            </div>
          )}

          {storageError && (
            <div className="mt-2 text-xs text-[#7a2424] bg-[#fae8e8] border border-[#e8c8c8] rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="font-semibold shrink-0">Stockage :</span>
              <span className="flex-1">{storageError}</span>
              <button
                onClick={() => setStorageError(null)}
                className="shrink-0 text-[#7a2424] hover:text-[#5a1a1a] font-bold"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* V3 Wizard */}
        {v3Mode ? (
          <div className="bg-white rounded-xl border border-[#e0d8ce] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-[#9d9089]">Étape {wizardStep}/4</span>
              <button
                onClick={() => setV3Mode(false)}
                className="text-xs text-[#9d9089] hover:text-[#695f56]"
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
            {/* Tab bar — underline style, no emoji */}
            <div className="flex border-b border-[#e0d8ce] mb-5 overflow-x-auto hide-scrollbar">
              {TABS.map((t) => {
                const isValidation = t.key === 'validation';
                const isActive = tab === t.key;

                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap flex-shrink-0 border-b-2 -mb-px transition-colors ${
                      isActive
                        ? 'border-[#6b4c2a] text-[#6b4c2a] font-semibold'
                        : 'border-transparent text-[#695f56] hover:text-[#1c1714]'
                    }`}
                  >
                    {isValidation && (
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          hasErrors ? 'bg-[#7a2424]' : 'bg-[#2f6144]'
                        }`}
                      />
                    )}
                    <span className="sm:hidden">{t.shortLabel}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                    {isValidation && hasErrors && (
                      <span className="text-[#7a2424]">({validation.errors.length})</span>
                    )}
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
        onV3={() => { setV3Mode(true); setWizardStep(1); setV3Result(null); }}
        onBriefIAResult={(intent, result, materialKey) => {
          setV3Intent(intent);
          setV3Result(result);
          setV3MaterialKey(materialKey);
          const converted = pipelineResultToAppState(result, materialKey);
          converted.project.name = intent.furniture_type.replace(/_/g, ' ');
          setState(normalizeProject(converted));
          saveV3(projectId, normalizeProject(converted), {
            intent,
            materialKey,
            furnitureType: intent.furniture_type,
          });
          setWizardStep(4);
          setV3Mode(true);
        }}
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

      <HelpGuide
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
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
