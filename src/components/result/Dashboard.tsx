import { useState } from 'react';
import type { ProjectIntent } from '../../lib/knowledge/types';
import type { PipelineResult } from '../../lib/engine/pipeline';
import { pipelineResultToAppState } from '../../lib/engine/pipeline';
import type { MaterialKey } from '../../types';
import Assumptions from './Assumptions';
import ShoppingListView from './ShoppingList';
import HardwareDetail from './HardwareDetail';
import AssemblyGuide from './AssemblyGuide';

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

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export default function Dashboard({ intent, result, materialKey, onModify, onClassicEditor }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const space = intent.space;
  const blockingIssues = result.validation.filter((v) => v.blocking);
  const warnings = result.validation.filter((v) => !v.blocking && v.severity === 'warning');
  const prod = result.production;

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
      const { generatePdf } = await import('../../lib/pdf');
      await generatePdf(appState, analysis, validation, steps);
    } catch (err) {
      console.error('Erreur PDF:', err);
    }
    setPdfLoading(false);
  };

  return (
    <div className="space-y-5">
      {/* Header + summary */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold capitalize">
          {intent.furniture_type.replace(/_/g, ' ')}
        </h2>
        <p className="text-sm text-gray-500">
          {space.width_mm} × {space.height_mm} × {space.depth_mm} mm
          {' — '}
          {result.parts.reduce((sum, p) => sum + p.qty, 0)} pièces
        </p>
      </div>

      {/* Summary badges */}
      {prod && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-stone-100 border border-stone-200 rounded-full px-2.5 py-1">
            {prod.summary.total_weight_kg} kg
          </span>
          <span className="bg-stone-100 border border-stone-200 rounded-full px-2.5 py-1">
            {DIFFICULTY_LABELS[prod.summary.difficulty] ?? prod.summary.difficulty}
          </span>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">
            ~{prod.shopping_list.estimated_cost_eur} €
          </span>
          <span className="bg-stone-100 border border-stone-200 rounded-full px-2.5 py-1">
            {prod.assembly_guide.length} étapes
          </span>
        </div>
      )}

      {/* Alerts */}
      {blockingIssues.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <h3 className="font-semibold text-red-700 text-sm mb-2">Erreurs bloquantes</h3>
          <ul className="text-sm text-red-600 space-y-1">
            {blockingIssues.map((issue) => (
              <li key={issue.id}>
                {issue.message}
                {issue.suggestion && <span className="text-red-400"> — {issue.suggestion}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
          <h3 className="font-semibold text-orange-700 text-sm mb-2">Avertissements</h3>
          <ul className="text-sm text-orange-600 space-y-1">
            {warnings.map((issue) => (
              <li key={issue.id}>
                {issue.message}
                {issue.suggestion && <span className="text-orange-400"> — {issue.suggestion}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Parts table — always open */}
      <Section title={`Pièces (${result.parts.reduce((s, p) => s + p.qty, 0)})`} defaultOpen>
        {result.parts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Nom</th>
                  <th className="py-2 pr-3 font-medium">L (mm)</th>
                  <th className="py-2 pr-3 font-medium">l (mm)</th>
                  <th className="py-2 pr-3 font-medium">Ép.</th>
                  <th className="py-2 pr-3 font-medium">Qté</th>
                  <th className="py-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {result.parts.map((part) => (
                  <tr key={part.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 pr-3">{part.name}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{part.length_mm}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{part.width_mm}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{part.thickness_mm}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{part.qty}</td>
                    <td className="py-1.5 text-gray-500">{part.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Hardware */}
      <Section title={`Quincaillerie (${result.hardware.reduce((s, h) => s + h.quantity, 0)} articles)`}>
        <HardwareDetail items={result.hardware} />
      </Section>

      {/* Shopping list */}
      {prod && (
        <Section title="Liste de courses">
          <ShoppingListView list={prod.shopping_list} />
        </Section>
      )}

      {/* Assembly guide */}
      {prod && (
        <Section title={`Notice de montage (${prod.assembly_guide.length} étapes)`}>
          <AssemblyGuide steps={prod.assembly_guide} />
        </Section>
      )}

      {/* Assumptions */}
      {prod && (
        <Section title="Hypothèses de calcul">
          <Assumptions assumptions={prod.assumptions} />
        </Section>
      )}

      {/* Limitations */}
      <p className="text-xs text-gray-400 italic">
        Plans de perçage non encore disponibles. Plans de coupe accessibles via l'éditeur classique (onglet Débit).
      </p>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={onModify}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Modifier
        </button>
        <button
          onClick={() => {
            if (confirm('Basculer vers l\'éditeur classique ? La quincaillerie et les hypothèses V3 seront conservées mais en lecture seule.')) {
              onClassicEditor(pipelineResultToAppState(result, materialKey));
            }
          }}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ⚙️ Éditeur classique
        </button>
        <button
          onClick={handleExportPdf}
          disabled={pdfLoading}
          className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-semibold"
        >
          {pdfLoading ? '...' : '📄 Exporter PDF'}
        </button>
      </div>
    </div>
  );
}
