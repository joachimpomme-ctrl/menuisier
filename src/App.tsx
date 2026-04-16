import { useState, useEffect, useRef, useCallback } from 'react';
import { exportToJson, LocalProjectRepository } from './lib/storage';
import { normalizeProject } from './lib/normalizeProject';
import { useProjectRepository } from './hooks/useProjectRepository';
import ProjectManager from './components/ProjectManager';
import InstallBanner from './components/InstallBanner';
import StepType from './components/wizard/StepType';
import StepSpace from './components/wizard/StepSpace';
import StepOrganize from './components/wizard/StepOrganize';
import Dashboard from './components/result/Dashboard';
import { AlertStrip, Panel, Toolbar, ToolbarButton } from './ui-system';
import { runPipeline, pipelineResultToAppState } from './lib/engine/pipeline';
import type { PipelineResult } from './lib/engine/pipeline';
import type { FurnitureType, SpaceDimensions, ProjectIntent } from './lib/knowledge/types';
import type { MaterialKey } from './types';
import MoreMenu from './components/MoreMenu';
import HelpGuide from './components/HelpGuide';

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
    createEmptyProject,
    duplicateProject,
    renameProject,
    deleteProject,
    importProject,
    loadFull,
    saveV3,
    isCurrentProjectFresh,
  } = useProjectRepository(repo);

  const [showProjects, setShowProjects] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
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
    if (isCurrentProjectFresh) {
      setV3Mode(true);
      setWizardStep(1);
      setV3Intent(null);
      setV3Result(null);
      return;
    }
    setV3Mode(false);
    setWizardStep(1);
    setV3Intent(null);
    setV3Result(null);
  }, [projectId, loadFull, isCurrentProjectFresh]);

  const handleNewProject = useCallback(() => {
    setShowProjects(false);
    createEmptyProject();
    setV3Mode(true);
    setWizardStep(1);
    setV3Intent(null);
    setV3Result(null);
  }, [createEmptyProject]);

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

  // Dashboard V3 (Terminal Métier) is rendered full-bleed: it has its own
  // SplitLayout + Toolbar and must not be constrained by the legacy
  // max-width / padded shell designed for mobile SaaS views.
  if (v3Mode && wizardStep === 4 && v3Intent && v3Result) {
    return (
      <div className="min-h-screen min-h-dvh text-[color:var(--fg)] bg-[color:var(--bg-canvas)] flex flex-col">
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
        <InstallBanner />
      </div>
    );
  }

  // V3 wizard (steps 1-3) — shell DS isolé du header legacy.
  // Les écrans 1-3 n'ont aucune raison d'afficher "Mes projets / ☁️ / PDF /
  // Bibliothèque / Aide" : ce sont des actions de gestion de projet.
  // Le wizard occupe donc son propre shell Toolbar + Panel, plein cadre,
  // pour garder la cohérence visuelle avec le Dashboard.
  if (v3Mode && wizardStep < 4) {
    return (
      <div className="min-h-screen min-h-dvh text-[color:var(--fg)] bg-[color:var(--bg-canvas)] flex flex-col">
        <Toolbar
          start={
            <div className="px-3 text-[10.5px] uppercase tracking-wider font-semibold text-[color:var(--fg-muted)]">
              Nouveau projet — étape {wizardStep}/4
            </div>
          }
          end={
            <ToolbarButton variant="ghost" onClick={() => setV3Mode(false)}>
              × Fermer
            </ToolbarButton>
          }
        />
        <div className="flex-1 overflow-auto p-3">
          <Panel>
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
          </Panel>
        </div>
        <InstallBanner />
      </div>
    );
  }

  const openWizardForCurrentProject = () => {
    setV3Mode(true);
    setWizardStep(1);
    setV3Intent(null);
    setV3Result(null);
  };

  return (
    <div className="min-h-screen min-h-dvh text-[color:var(--fg)] bg-[color:var(--bg-canvas)] flex flex-col">
      <Toolbar
        start={
          <div className="px-3 text-[10.5px] uppercase tracking-wider font-semibold text-[color:var(--fg-muted)]">
            Projet hérité
          </div>
        }
        end={
          <>
            <ToolbarButton onClick={handleNewProject}>Nouveau projet</ToolbarButton>
            <ToolbarButton onClick={() => setShowProjects(true)}>Mes projets</ToolbarButton>
          </>
        }
      />
      <div className="flex-1 overflow-auto p-3">
        <div className="mx-auto max-w-3xl space-y-3">
          <Panel title={state.project.name}>
            <div className="space-y-3">
              <AlertStrip kind="info" title="Migration requise">
                Ce projet a été créé avec l’éditeur classique. Il doit être recréé via le wizard V3 avant toute modification.
              </AlertStrip>
              <div className="text-[12px] text-[color:var(--fg-muted)]">
                Le parcours canonique est désormais le wizard V3 suivi du Dashboard Terminal Métier. L’éditeur classique a été retiré.
              </div>
              <div className="flex flex-wrap gap-2">
                <ToolbarButton variant="primary" onClick={openWizardForCurrentProject}>
                  Recréer un projet
                </ToolbarButton>
                <ToolbarButton onClick={() => setShowProjects(true)}>
                  Choisir un autre projet
                </ToolbarButton>
              </div>
            </div>
          </Panel>

          <Panel title="Gestion du projet">
            <div className="flex flex-wrap items-center gap-2">
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <MoreMenu
                onExport={() => exportToJson(state)}
                onImport={() => importRef.current?.click()}
              />
              <ToolbarButton onClick={() => setShowHelp(true)}>Guide</ToolbarButton>
              <ToolbarButton onClick={() => setStorageError(null)} disabled={!storageError}>
                Effacer l’alerte stockage
              </ToolbarButton>
            </div>
          </Panel>

          {importError && (
            <AlertStrip kind="error" title="Import impossible">
              {importError}
            </AlertStrip>
          )}

          {storageError && (
            <AlertStrip kind="error" title="Stockage">
              {storageError}
            </AlertStrip>
          )}
        </div>
      </div>
      <InstallBanner />
      <HelpGuide
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
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
