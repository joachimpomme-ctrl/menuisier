import { useState, useMemo, useEffect, useRef } from 'react';
import type { AppState, TabKey, PieceWithBody } from './types';
import { MATERIALS } from './data/materials';
import { createInitialState } from './lib/state';
import { packPieces } from './lib/nesting';
import { validate } from './lib/validation';
import { generateSteps } from './lib/steps';
import { saveToLocalStorage, loadFromLocalStorage, clearLocalStorage, exportToJson, importFromJson } from './lib/storage';
import StructureTab from './components/StructureTab';
import DebitTab from './components/DebitTab';
import MontageTab from './components/MontageTab';
import NoticeTab from './components/NoticeTab';
import ValidationTab from './components/ValidationTab';
import AssistantTab from './components/AssistantTab';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'structure', label: 'Structure', icon: '⚙' },
  { key: 'debit', label: 'Débit', icon: '✂' },
  { key: 'montage', label: 'Montage', icon: '📐' },
  { key: 'notice', label: 'Notice', icon: '📋' },
  { key: 'validation', label: 'Contrôle', icon: '●' },
  { key: 'ia', label: 'Assistant IA', icon: '🤖' },
];

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = loadFromLocalStorage();
    return saved ?? createInitialState('cp_bouleau');
  });
  const [tab, setTab] = useState<TabKey>('structure');
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const mat = MATERIALS[state.materialKey];
  const usableHeight = state.project.ceilingHeight - state.project.plinthHeight;

  const allPieces: PieceWithBody[] = useMemo(
    () => state.bodies.flatMap((b) => b.pieces.map((p) => ({ ...p, bodyName: b.name, bodyId: b.id }))),
    [state.bodies]
  );
  const totalPieces = useMemo(() => allPieces.reduce((s, p) => s + p.qty, 0), [allPieces]);
  const bins = useMemo(() => packPieces(allPieces, state.panel.width, state.panel.height, state.kerf), [allPieces, state.panel, state.kerf]);
  const validation = useMemo(() => validate(state), [state]);
  const steps = useMemo(() => generateSteps(state), [state]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => saveToLocalStorage(state), 500);
    return () => clearTimeout(timer);
  }, [state]);

  const handleNewProject = () => {
    if (confirm('Créer un nouveau projet ? Le projet actuel sera perdu si non exporté.')) {
      clearLocalStorage();
      setState(createInitialState('cp_bouleau'));
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importFromJson(file);
      setState(imported);
      setImportError(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur d\'import');
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-amber-400 tracking-wide">{state.project.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                <span>{mat.short} {state.panel.thickness * 10}mm</span>
                <span className="text-zinc-700">·</span>
                <span>{totalPieces} pcs</span>
                <span className="text-zinc-700">·</span>
                <span>{bins.length} panneaux</span>
                <span className="text-zinc-700">·</span>
                <span>{usableHeight} cm utile</span>
                {validation.errors.length > 0 && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="text-red-400 font-medium">{validation.errors.length} erreur{validation.errors.length > 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewProject}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Nouveau
              </button>
              <button
                onClick={() => exportToJson(state)}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Exporter
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Importer
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
        {tab === 'debit' && <DebitTab state={state} allPieces={allPieces} bins={bins} />}
        {tab === 'montage' && <MontageTab state={state} />}
        {tab === 'notice' && <NoticeTab steps={steps} materialName={mat.name} thickness={state.panel.thickness} />}
        {tab === 'validation' && <ValidationTab validation={validation} />}
        {tab === 'ia' && (
          <AssistantTab
            state={state}
            validation={validation}
            allPieces={allPieces}
            totalPieces={totalPieces}
            panelCount={bins.length}
          />
        )}
      </div>
    </div>
  );
}
