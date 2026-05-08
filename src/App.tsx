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
import Logo from './components/Logo';

const TABS: { key: TabKey; label: string; shortLabel: string }[] = [
  { key: 'structure', label: 'Structure', shortLabel: 'Struct.' },
  { key: 'plans',     label: 'Plans 2D',  shortLabel: 'Plans'   },
  { key: 'debit',     label: 'Débit',     shortLabel: 'Débit'   },
  { key: 'montage',   label: 'Montage',   shortLabel: 'Mont.'   },
  { key: 'export',    label: 'Export',    shortLabel: 'Export'  },
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
    setV3Mode(false);
    setWizardStep(1);
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
    <div className="min-h-screen min-h-dvh md:min-h-0 md:h-screen md:h-dvh text-[#0E0D0C] bg-[#FFFCF7] md:flex md:overflow-hidden">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 border-r border-[#EFE8DD] bg-white">
        <div className="px-5 py-5 border-b border-[#EFE8DD] flex items-center gap-2.5">
          <Logo size={32} />
          <div>
            <div className="text-base font-bold text-[#0E0D0C] leading-tight">Menuisier</div>
            <div className="text-xs text-[#9A968F]">Conception de meuble</div>
          </div>
        </div>
        <div className="px-5 py-4 border-b border-[#EFE8DD]">
          <div className="text-[10px] uppercase tracking-widest text-[#9A968F] font-semibold mb-1">Projet actif</div>
          <div className="text-sm font-semibold text-[#0E0D0C] truncate mb-2">{state.project.name}</div>
          <div className="flex flex-wrap gap-1.5">
            {totalCost > 0 && (
              <span className="text-[11px] bg-[#DEF7EC] text-[#0E5A3D] rounded px-2 py-0.5 font-medium font-mono">
                {totalCost.toFixed(0)} €
              </span>
            )}
            <span className="text-[11px] bg-[#FFFCF7] border border-[#EFE8DD] rounded px-2 py-0.5 font-mono">
              {totalPieces} pcs
            </span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                tab === t.key || (t.key === 'export' && ['notice', 'validation', 'ia'].includes(tab))
                  ? 'bg-[#E5EAFF] text-[#3B5FFF] font-semibold'
                  : 'text-[#54514E] hover:bg-[#FFFCF7] hover:text-[#0E0D0C]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-[#EFE8DD]">
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewWizard(true)}
              className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#3B5FFF] text-white font-semibold hover:bg-[#1E3FCC] transition-colors"
            >
              + Nouveau
            </button>
            <MoreMenu
              direction="up"
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
      </aside>

      <main className="md:flex-1 md:overflow-y-auto">
      <div className="max-w-3xl md:max-w-none mx-auto px-4 pt-4 pb-24 sm:py-6 md:px-8 md:pt-8 md:pb-12">

        {/* Header — mobile only */}
        <div className="mb-4 md:hidden">
          <div className="flex items-center justify-between gap-3 mb-2">
            {/* Left: logo + label + project name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size={36} />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-[#9A968F] leading-none mb-0.5">
                  Projet actif
                </p>
                <h1 className="text-base font-semibold text-[#0E0D0C] truncate leading-tight">
                  {state.project.name}
                </h1>
              </div>
            </div>

            {/* Right: + Nouveau + ··· */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setShowNewWizard(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#3B5FFF] text-white font-semibold hover:bg-[#1E3FCC] active:scale-95 transition-all whitespace-nowrap"
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
            <span className="bg-[#E5EAFF] text-[#3B5FFF] border border-[#EFE8DD] rounded px-2 py-px font-medium">
              {mat.short} {state.panel.thickness * 10}mm
            </span>
            <span className="bg-[#FFFCF7] border border-[#EFE8DD] rounded px-2 py-px font-mono tabular-nums">
              {totalPieces} pcs
            </span>
            <span className="bg-[#FFFCF7] border border-[#EFE8DD] rounded px-2 py-px font-mono tabular-nums">
              {totalPanelCount} pan.
            </span>
            {totalCost > 0 && (
              <span className="bg-[#DEF7EC] text-[#0E5A3D] border border-[#5DD4A0] rounded px-2 py-px font-mono tabular-nums font-medium">
                {totalCost.toFixed(0)} €
              </span>
            )}
            {hasErrors && (
              <span className="bg-[#FFE4DC] text-[#A52E16] border border-[#FF6B4A] rounded px-2 py-px font-medium">
                {validation.errors.length} err.
              </span>
            )}
          </div>

          {importError && (
            <div className="mt-2 text-xs text-[#A52E16] bg-[#FFE4DC] border border-[#FF6B4A] rounded-lg px-3 py-2">
              {importError}
            </div>
          )}

          {storageError && (
            <div className="mt-2 text-xs text-[#A52E16] bg-[#FFE4DC] border border-[#FF6B4A] rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="font-semibold shrink-0">Stockage :</span>
              <span className="flex-1">{storageError}</span>
              <button
                onClick={() => setStorageError(null)}
                className="shrink-0 text-[#A52E16] hover:text-[#FF6B4A] font-bold"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* V3 Wizard */}
        {v3Mode ? (
          <div className="bg-white rounded-xl border border-[#EFE8DD] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-[#9A968F]">Étape {wizardStep}/4</span>
              <button
                onClick={() => setV3Mode(false)}
                className="text-xs text-[#9A968F] hover:text-[#54514E]"
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
            {/* Tab bar — mobile only (desktop uses sidebar nav) */}
            <div className="relative mb-5 md:hidden">
              <div className="flex border-b border-[#EFE8DD] overflow-x-auto hide-scrollbar">
                {TABS.map((t) => {
                  const isActive = tab === t.key || (t.key === 'export' && ['notice', 'validation', 'ia'].includes(tab));
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap flex-shrink-0 border-b-2 -mb-px transition-colors ${
                        isActive
                          ? 'border-[#3B5FFF] text-[#3B5FFF] font-semibold'
                          : 'border-transparent text-[#54514E] hover:text-[#0E0D0C]'
                      }`}
                    >
                      <span className="sm:hidden">{t.shortLabel}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FFFCF7] to-transparent pointer-events-none" />
            </div>

            {/* Content — key triggers fade animation on tab change */}
            <div key={tab} className="tab-content-enter">
              {tab === 'structure' && (
                <div className="md:flex md:gap-6">
                  <div className="flex-1 min-w-0">
                    <StructureTab state={state} onChange={setState} allPanelDefs={allPanelDefs} />
                  </div>
                  <aside className="hidden md:block w-72 flex-shrink-0">
                    <div className="sticky top-6 rounded-xl border border-[#EFE8DD] bg-white p-5 space-y-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-[#9A968F] font-semibold mb-1">Projet</div>
                        <div className="text-sm font-semibold text-[#0E0D0C] truncate">{state.project.name}</div>
                        <div className="text-xs text-[#54514E] mt-0.5">{mat.name} — {state.panel.thickness * 10} mm</div>
                      </div>
                      <div className="border-t border-[#EFE8DD] pt-4 space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-[#9A968F] font-semibold mb-2">Dimensions</div>
                        {state.bodies.map((b) => (
                          <div key={b.id} className="text-xs text-[#54514E] flex justify-between">
                            <span className="truncate mr-2">{b.name}</span>
                            <span className="font-mono text-[#0E0D0C] flex-shrink-0">{b.width} × {b.depth} cm</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-[#EFE8DD] pt-4 flex gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-[#3B5FFF] font-mono">{state.bodies.length}</div>
                          <div className="text-[10px] text-[#9A968F]">corps</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-[#3B5FFF] font-mono">{totalPieces}</div>
                          <div className="text-[10px] text-[#9A968F]">pièces</div>
                        </div>
                        {totalCost > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-[#3B5FFF] font-mono">{totalCost.toFixed(0)} €</div>
                            <div className="text-[10px] text-[#9A968F]">estimé</div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleExportPdf}
                        disabled={pdfLoading}
                        className="w-full rounded-lg bg-[#3B5FFF] text-white text-xs font-semibold px-4 py-2.5 hover:bg-[#1E3FCC] transition-colors disabled:opacity-50"
                      >
                        {pdfLoading ? 'Génération…' : 'Générer PDF'}
                      </button>
                    </div>
                  </aside>
                </div>
              )}
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
              {tab === 'export' && (
                <div className="space-y-3">
                  <button
                    onClick={() => setTab('notice' as TabKey)}
                    className="w-full text-left rounded-xl border border-[#EFE8DD] bg-white px-4 py-3 text-sm font-medium text-[#54514E] hover:border-[#3B5FFF] hover:text-[#3B5FFF] transition-colors"
                  >
                    Notice PDF
                  </button>
                  <button
                    onClick={() => setTab('validation' as TabKey)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      hasErrors
                        ? 'border-[#FF6B4A] bg-[#FFE4DC] text-[#A52E16] hover:border-[#A52E16]'
                        : 'border-[#EFE8DD] bg-white text-[#54514E] hover:border-[#0E5A3D] hover:text-[#0E5A3D]'
                    }`}
                  >
                    Contrôle qualité
                    {hasErrors && <span className="ml-2 text-xs">({validation.errors.length} erreur{validation.errors.length > 1 ? 's' : ''})</span>}
                  </button>
                  <button
                    onClick={() => setTab('ia' as TabKey)}
                    className="w-full text-left rounded-xl border border-[#EFE8DD] bg-white px-4 py-3 text-sm font-medium text-[#54514E] hover:border-[#3B5FFF] hover:text-[#3B5FFF] transition-colors"
                  >
                    Assistant IA →
                  </button>
                </div>
              )}
              {tab === 'notice' && <NoticeTab steps={steps} materialName={mat.name} thickness={state.panel.thickness} />}
              {tab === 'validation' && <ValidationTab validation={validation} onGoToStructure={() => setTab('structure')} />}
            </div>
            {/* AssistantTab stays mounted to preserve chat state */}
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
      </main>

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
