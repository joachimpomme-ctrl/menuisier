import { useMemo, useState } from 'react';
import type { ProjectIntent } from '../../lib/knowledge/types';
import type { PipelineResult } from '../../lib/engine/pipeline';
import { pipelineResultToAppState } from '../../lib/engine/pipeline';
import { aggregateDrillingOps } from '../../lib/engine/drilling';
import { buildFacade2DModel } from '../../lib/engine/facade2d';
import type { MaterialKey } from '../../types';
import Assumptions from './Assumptions';
import ShoppingListView from './ShoppingList';
import HardwareDetail from './HardwareDetail';
import AssemblyGuide from './AssemblyGuide';
import DrillingPlanView from './DrillingPlanView';
import Facade2DView from './Facade2DView';

interface Props {
  intent: ProjectIntent;
  result: PipelineResult;
  materialKey: MaterialKey;
  onModify: () => void;
  onClassicEditor: (appState: ReturnType<typeof pipelineResultToAppState>) => void;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

const NON_FABRICABLE_TYPES: Record<string, { label: string; explanation: string }> = {
  table: {
    label: 'Table',
    explanation:
      'Le moteur V3 génère un caisson rectangulaire avec joues et fond. Une table nécessite un plateau, des pieds (ou tréteaux) et une éventuelle ceinture — structures qui ne sont pas supportées. La liste de pièces affichée n\'est pas fabricable en l\'état.',
  },
  lit_cabane_mezzanine: {
    label: 'Lit cabane / mezzanine',
    explanation:
      'Le moteur V3 génère une bibliothèque (joues, tablettes). Un lit cabane/mezzanine nécessite des poteaux massifs, des longerons, une plateforme de couchage, une échelle et des garde-corps — structures qui ne sont pas supportées. La liste de pièces affichée n\'est pas fabricable en l\'état.',
  },
};

const PART_TYPE_DOT: Record<string, string> = {
  joue:               'bg-[#6b4c2a]',
  tablette_fixe:      'bg-[#9d9089]',
  tablette_reglable:  'bg-[#2f6144]',
  fond:               'bg-[#c8bfb3]',
};

type DashTab = 'pieces' | 'courses' | 'montage' | 'details';

const DASH_TABS: { key: DashTab; label: string }[] = [
  { key: 'pieces',   label: 'Pièces'  },
  { key: 'courses',  label: 'Courses' },
  { key: 'montage',  label: 'Montage' },
  { key: 'details',  label: 'Détails' },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14" fill="none"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Accordion({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border border-[#e0d8ce] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#1c1714] hover:bg-[#faf8f4]"
      >
        {title}
        <span className="text-[#9d9089]"><ChevronIcon open={open} /></span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function Dashboard({ intent, result, materialKey, onModify, onClassicEditor }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dashTab, setDashTab] = useState<DashTab>('pieces');
  const space = intent.space;
  const blockingIssues = result.validation.filter((v) => v.blocking);
  const warnings = result.validation.filter((v) => !v.blocking && v.severity === 'warning');
  const prod = result.production;
  const hasDrillingPlans = result.parts.some((part) => (part.drilling?.length ?? 0) > 0);
  const facade2DModel = useMemo(() => buildFacade2DModel(result), [result]);

  const totalPieces = result.parts.reduce((sum, p) => sum + p.qty, 0);
  const totalPanels = prod?.shopping_list?.panels?.reduce((s: number, p) => s + p.count, 0) ?? 0;
  const totalCost = prod?.shopping_list?.estimated_cost_eur ?? 0;
  const totalSteps = prod?.assembly_guide?.length ?? 0;

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      const appState = pipelineResultToAppState(result, materialKey);
      const { analyzeProject } = await import('../../lib/projectAnalysis');
      const { validate } = await import('../../lib/validation');
      const { generateSteps } = await import('../../lib/steps');
      const analysis = analyzeProject(appState);
      const validation = validate(appState);
      const steps = generateSteps(appState);
      const v3Data = {
        hardware: result.hardware,
        assumptions: result.production?.assumptions ?? [],
        edgeBandingParts: result.parts
          .filter((p) => p.edge_banding && p.edge_banding.length > 0)
          .map((p) => ({
            name: p.name,
            sides: p.edge_banding!.length === 4
              ? '4 cotes'
              : p.edge_banding!
                  .map((s) => (s === 'front' ? 'AV' : s === 'back' ? 'AR' : s === 'left' ? 'G' : 'D'))
                  .join(', '),
          })),
        drillingParts: result.parts
          .filter((p) => p.drilling && p.drilling.length > 0)
          .map((p) => ({
            name: p.name,
            ops: aggregateDrillingOps(p.drilling!),
          })),
      };
      const { generatePdf } = await import('../../lib/pdf');
      await generatePdf(appState, analysis, validation, steps, v3Data);
    } catch (err) {
      console.error('Erreur PDF:', err);
    }
    setPdfLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-px bg-[#e0d8ce] rounded-lg overflow-hidden border border-[#e0d8ce]">
        {[
          { label: 'Pièces',  value: totalPieces,                          unit: '' },
          { label: 'Panneaux',value: totalPanels,                           unit: '' },
          { label: 'Coût',    value: totalCost > 0 ? `${totalCost} €` : '—', unit: '' },
          { label: 'Étapes',  value: totalSteps,                            unit: '' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white px-3 py-3 text-center">
            <p className="text-[9px] uppercase tracking-widest text-[#9d9089] mb-1">{label}</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[#6b4c2a] leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Non-fabricable warning */}
      {NON_FABRICABLE_TYPES[intent.furniture_type] && (
        <div className="rounded-lg bg-[#fae8e8] border-2 border-[#e8c8c8] p-4">
          <h3 className="font-bold text-[#7a2424] text-sm mb-2 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#7a2424] flex-shrink-0" />
            Type non supporté par le moteur V3 — aperçu uniquement
          </h3>
          <p className="text-sm text-[#7a2424] leading-relaxed">
            {NON_FABRICABLE_TYPES[intent.furniture_type].explanation}
          </p>
          <p className="text-xs text-[#7a2424] mt-2 italic">
            Ne pas utiliser cette liste de pièces pour une fabrication réelle.
          </p>
        </div>
      )}

      {/* Internal tab navigation */}
      <div className="flex border-b border-[#e0d8ce] overflow-x-auto hide-scrollbar">
        {DASH_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setDashTab(t.key)}
            className={`px-4 py-2.5 text-xs whitespace-nowrap flex-shrink-0 border-b-2 -mb-px transition-colors ${
              dashTab === t.key
                ? 'border-[#6b4c2a] text-[#6b4c2a] font-semibold'
                : 'border-transparent text-[#695f56] hover:text-[#1c1714]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Pièces */}
      {dashTab === 'pieces' && (
        <div className="space-y-4">
          {/* Facade 2D — hero */}
          <div className="bg-white rounded-lg border border-[#e0d8ce] p-4">
            <p className="text-[11px] uppercase tracking-widest text-[#9d9089] mb-3">Vue façade</p>
            <Facade2DView model={facade2DModel} />
          </div>

          {/* Parts table */}
          <div className="bg-white rounded-lg border border-[#e0d8ce] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e0d8ce] bg-[#faf8f4]">
              <p className="text-[11px] uppercase tracking-widest text-[#9d9089]">
                Tableau de débit — {totalPieces} pièces
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0d8ce] text-left">
                    <th className="py-2 px-3 font-medium text-[#695f56]">Nom</th>
                    <th className="py-2 px-3 font-medium text-[#695f56]">L mm</th>
                    <th className="py-2 px-3 font-medium text-[#695f56]">l mm</th>
                    <th className="py-2 px-3 font-medium text-[#695f56]">Ép.</th>
                    <th className="py-2 px-3 font-medium text-[#695f56]">Qté</th>
                    <th className="py-2 px-3 font-medium text-[#695f56]">Type</th>
                    <th className="py-2 px-3 font-medium text-[#695f56]">Chant</th>
                  </tr>
                </thead>
                <tbody>
                  {result.parts.map((part) => {
                    const dotClass = PART_TYPE_DOT[part.type] ?? 'bg-[#c8bfb3]';
                    return (
                      <tr key={part.id} className="border-b border-[#f0ebe4] hover:bg-[#faf8f4]">
                        <td className="py-2 px-3 text-[#1c1714]">{part.name}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-[#1c1714]">{part.length_mm}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-[#1c1714]">{part.width_mm}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-[#695f56]">{part.thickness_mm}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-[#1c1714]">{part.qty}</td>
                        <td className="py-2 px-3">
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                            <span className="text-[#695f56]">{part.type}</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#9d9089]">
                          {part.edge_banding && part.edge_banding.length > 0
                            ? part.edge_banding.length === 4
                              ? '4 côtés'
                              : part.edge_banding
                                  .map((s) => (s === 'front' ? 'AV' : s === 'back' ? 'AR' : s === 'left' ? 'G' : 'D'))
                                  .join(', ')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Courses */}
      {dashTab === 'courses' && prod && (
        <div className="space-y-4">
          <ShoppingListView list={prod.shopping_list} />
          <HardwareDetail items={result.hardware} />
          {/* Total recap */}
          <div className="bg-[#f2ebe0] rounded-lg border border-[#e0d8ce] px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#695f56] font-medium">Total estimé</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#6b4c2a]">
                {prod.shopping_list.estimated_cost_eur} €
              </span>
            </div>
            {prod.summary.difficulty && (
              <p className="text-xs text-[#9d9089] mt-1">
                Difficulté : {DIFFICULTY_LABELS[prod.summary.difficulty] ?? prod.summary.difficulty}
                {prod.summary.total_weight_kg ? ` · ${prod.summary.total_weight_kg} kg` : ''}
              </p>
            )}
          </div>
        </div>
      )}
      {dashTab === 'courses' && !prod && (
        <p className="text-sm text-[#695f56] py-4">Aucune liste de courses générée.</p>
      )}

      {/* Tab: Montage */}
      {dashTab === 'montage' && prod && (
        <div className="space-y-4">
          <AssemblyGuide steps={prod.assembly_guide} />
          {hasDrillingPlans && (
            <Accordion title="Plans de perçage">
              <DrillingPlanView parts={result.parts} />
            </Accordion>
          )}
        </div>
      )}
      {dashTab === 'montage' && !prod && (
        <p className="text-sm text-[#695f56] py-4">Aucune notice de montage générée.</p>
      )}

      {/* Tab: Détails */}
      {dashTab === 'details' && (
        <div className="space-y-3">
          {/* Validation banner */}
          {blockingIssues.length === 0 && warnings.length === 0 ? (
            <div className="flex items-center gap-2 bg-[#e4f0e8] border border-[#c8ddd0] rounded-lg px-4 py-3">
              <span className="inline-block w-2 h-2 rounded-full bg-[#2f6144] flex-shrink-0" />
              <span className="text-sm text-[#2f6144] font-medium">Validation réussie — aucun problème détecté</span>
            </div>
          ) : (
            <>
              {blockingIssues.length > 0 && (
                <div className="bg-[#fae8e8] border border-[#e8c8c8] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#7a2424] flex-shrink-0" />
                    <h3 className="font-semibold text-[#7a2424] text-sm">Erreurs bloquantes</h3>
                  </div>
                  <ul className="text-sm text-[#7a2424] space-y-1 ml-4">
                    {blockingIssues.map((issue) => (
                      <li key={issue.id}>
                        {issue.message}
                        {issue.suggestion && <span className="text-[#9d9089]"> — {issue.suggestion}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="bg-[#f5ead8] border border-[#e8d8b8] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#7a5020] flex-shrink-0" />
                    <h3 className="font-semibold text-[#7a5020] text-sm">Avertissements</h3>
                  </div>
                  <ul className="text-sm text-[#7a5020] space-y-1 ml-4">
                    {warnings.map((issue) => (
                      <li key={issue.id}>
                        {issue.message}
                        {issue.suggestion && <span className="text-[#9d9089]"> — {issue.suggestion}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Hypothèses */}
          {prod && (
            <Accordion title="Hypothèses de calcul" defaultOpen>
              <Assumptions assumptions={prod.assumptions} />
            </Accordion>
          )}

          {/* Note débit */}
          <p className="text-xs text-[#9d9089] italic">
            Plans de coupe accessibles via l'éditeur classique (onglet Débit).
          </p>

          {/* Dimensions */}
          <div className="bg-[#faf8f4] border border-[#e0d8ce] rounded-lg px-4 py-3">
            <p className="text-[11px] uppercase tracking-widest text-[#9d9089] mb-2">Dimensions nettes</p>
            <p className="font-mono tabular-nums text-sm text-[#1c1714]">
              {space.width_mm} × {space.height_mm} × {space.depth_mm} mm
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e0d8ce]">
        <button
          onClick={onModify}
          className="px-4 py-2 text-sm border border-[#e0d8ce] rounded-lg text-[#695f56] hover:bg-[#faf8f4] hover:text-[#1c1714] transition-colors"
        >
          Modifier
        </button>
        <button
          onClick={() => {
            if (confirm('Basculer vers l\'éditeur classique ? Toutes les pièces, portes et dimensions sont conservées. Seul le détail des opérations de perçage n\'est pas transféré.')) {
              onClassicEditor(pipelineResultToAppState(result, materialKey));
            }
          }}
          className="px-4 py-2 text-sm border border-[#e0d8ce] rounded-lg text-[#695f56] hover:bg-[#faf8f4] hover:text-[#1c1714] transition-colors"
        >
          Éditeur classique
        </button>
        <button
          onClick={handleExportPdf}
          disabled={pdfLoading || Boolean(NON_FABRICABLE_TYPES[intent.furniture_type])}
          title={
            NON_FABRICABLE_TYPES[intent.furniture_type]
              ? 'Export PDF désactivé : la liste de pièces n\'est pas fabricable pour ce type de meuble'
              : undefined
          }
          className="px-4 py-2 text-sm bg-[#6b4c2a] text-white rounded-lg hover:bg-[#5a3e22] disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {pdfLoading ? 'Génération…' : 'Exporter PDF'}
        </button>
      </div>
    </div>
  );
}
