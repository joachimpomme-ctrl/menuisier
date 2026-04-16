/**
 * Dashboard V3 — écran principal du configurateur.
 *
 * Architecture UI : 4 zones fixes (Terminal Métier).
 *   ┌──────────────────────────────────────────────────┐
 *   │ TOOLBAR : projet · métriques · actions (1 primary)│
 *   ├────────┬───────────────────────┬─────────────────┤
 *   │ LEFT   │ CENTER                │ RIGHT           │
 *   │ Vue    │ Pièces / quinc. /     │ Inspecteur      │
 *   │ façade │ courses / montage     │ pièce ou zone   │
 *   ├────────┴───────────────────────┴─────────────────┤
 *   │ BOTTOM : procurement · warnings · infos          │
 *   └──────────────────────────────────────────────────┘
 *
 * Règles respectées :
 *   - aucune import de Tailwind radius/shadow interdits
 *   - accent unique `var(--accent)` sur le bouton primaire + sélection
 *   - tous les composants viennent de `../../ui-system`
 *   - les nombres sont en `tabular-nums font-mono` via DataTable et PropertyGrid
 *   - le procurement est systématiquement visuel via <ProcurementBadge />
 */

import { useMemo, useState } from 'react';
import type { ProjectIntent, GeneratedPart } from '../../lib/knowledge/types';
import type { PipelineResult } from '../../lib/engine/pipeline';
import { pipelineResultToAppState } from '../../lib/engine/pipeline';
import { aggregateDrillingOps } from '../../lib/engine/drilling';
import { buildFacade2DModel } from '../../lib/engine/facade2d';
import type { ProcurementDecision } from '../../lib/engine/procurement';
import type { MaterialKey } from '../../types';
import Facade2DView, { type Facade2DSelection } from './Facade2DView';
import {
  SplitLayout,
  Toolbar,
  ToolbarButton,
  ToolbarMetric,
  ToolbarTabs,
  Panel,
  DataTable,
  type DataTableColumn,
  PropertyGrid,
  type PropertyGroup,
  ProcurementBadge,
  AlertStrip,
  SectionTitle,
} from '../../ui-system';

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

/**
 * Types de meubles que le moteur V3 actuel ne sait pas modéliser correctement.
 */
const NON_FABRICABLE_TYPES: Record<string, { label: string; explanation: string }> = {
  table: {
    label: 'Table',
    explanation:
      "Le moteur V3 génère un caisson rectangulaire avec joues et fond. Une table nécessite un plateau, des pieds (ou tréteaux) et une éventuelle ceinture — structures qui ne sont pas supportées. La liste de pièces affichée n'est pas fabricable en l'état.",
  },
  lit_cabane_mezzanine: {
    label: 'Lit cabane / mezzanine',
    explanation:
      "Le moteur V3 génère une bibliothèque (joues, tablettes). Un lit cabane/mezzanine nécessite des poteaux massifs, des longerons, une plateforme de couchage, une échelle et des garde-corps — structures qui ne sont pas supportées. La liste de pièces affichée n'est pas fabricable en l'état.",
  },
};

type TabKey = 'pieces' | 'hardware' | 'shopping' | 'assembly' | 'assumptions';

export default function Dashboard({ intent, result, materialKey, onModify, onClassicEditor }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [facadeSel, setFacadeSel] = useState<Facade2DSelection | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('pieces');

  const space = intent.space;
  const blockingIssues = result.validation.filter((v) => v.blocking);
  const warnings = result.validation.filter((v) => !v.blocking && v.severity === 'warning');
  const infos = result.validation.filter((v) => !v.blocking && v.severity === 'info');
  const prod = result.production;
  const facade2DModel = useMemo(() => buildFacade2DModel(result), [result]);

  // --- Source UNIQUE de vérité procurement pour toute l'UI -----------------
  //
  // Les trois lieux d'affichage (PartsTable colonne Approvisionnement,
  // Inspector ligne Approvisionnement, bottom bar Procurement) tirent de
  // `result.procurement`. Aucun recalcul depuis `part.standard_part_id` ou
  // `part.drilling` côté UI — toute décision vient du moteur.
  // Demain, `resolveProcurement` interne sera remplacé par le vrai
  // resolver métier, sans qu'une seule ligne du Dashboard ne bouge.
  const procByPartId = result.procurement.byPartId;
  const procSummary = result.procurement.summary;

  const selectedPart = useMemo<GeneratedPart | null>(
    () => result.parts.find((p) => p.id === selectedPartId) ?? null,
    [result.parts, selectedPartId],
  );

  // Parts filtered by current facade selection (body+zone)
  const filteredParts = useMemo(() => {
    if (!facadeSel) return result.parts;
    return result.parts.filter((p) => p.body_id === facadeSel.bodyId);
  }, [result.parts, facadeSel]);

  const totalQty = result.parts.reduce((sum, p) => sum + p.qty, 0);
  const nonFabricable = NON_FABRICABLE_TYPES[intent.furniture_type];

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

  const tabs = useMemo(() => {
    const t: { key: TabKey; label: string }[] = [
      { key: 'pieces', label: `Pièces ${filteredParts.length}/${result.parts.length}` },
      { key: 'hardware', label: `Quinc. ${result.hardware.length}` },
    ];
    if (prod) {
      t.push({ key: 'shopping', label: 'Courses' });
      t.push({ key: 'assembly', label: `Montage ${prod.assembly_guide.length}` });
      t.push({ key: 'assumptions', label: 'Hypothèses' });
    }
    return t;
  }, [filteredParts.length, result.parts.length, result.hardware.length, prod]);

  // -------------------------------------------------------------------------
  // TOOLBAR
  // -------------------------------------------------------------------------
  const toolbar = (
    <Toolbar
      start={
        <div className="flex flex-col px-3">
          <span className="text-[9px] tracking-widest uppercase text-[color:var(--fg-subtle)] font-semibold">
            Projet
          </span>
          <span className="text-[13px] font-semibold uppercase tracking-wide">
            {intent.furniture_type.replace(/_/g, ' ')}
          </span>
        </div>
      }
      end={
        <>
          <ToolbarButton onClick={onModify}>Modifier</ToolbarButton>
          <ToolbarButton
            onClick={() => {
              if (
                confirm(
                  "Basculer vers l'éditeur classique ? Toutes les pièces, portes et dimensions sont conservées. Seul le détail des opérations de perçage n'est pas transféré.",
                )
              ) {
                onClassicEditor(pipelineResultToAppState(result, materialKey));
              }
            }}
          >
            Éditeur classique
          </ToolbarButton>
          <ToolbarButton
            variant="primary"
            onClick={handleExportPdf}
            disabled={pdfLoading || Boolean(nonFabricable)}
            title={
              nonFabricable
                ? "Export PDF désactivé : la liste de pièces n'est pas fabricable pour ce type de meuble"
                : undefined
            }
          >
            {pdfLoading ? '…' : 'Export PDF'}
          </ToolbarButton>
        </>
      }
    >
      <ToolbarMetric label="Larg" value={space.width_mm} unit="mm" />
      <ToolbarMetric label="Haut" value={space.height_mm} unit="mm" />
      <ToolbarMetric label="Prof" value={space.depth_mm} unit="mm" />
      <ToolbarMetric label="Corps" value={result.layout.bodies.length} />
      <ToolbarMetric label="Pièces" value={totalQty} />
      <ToolbarMetric
        label="Quinc."
        value={result.hardware.reduce((s, h) => s + h.quantity, 0)}
      />
      {prod && <ToolbarMetric label="Poids" value={prod.summary.total_weight_kg} unit="kg" />}
      {prod && <ToolbarMetric label="Coût" value={prod.shopping_list.estimated_cost_eur} unit="€" />}
      {prod && (
        <ToolbarMetric
          label="Niveau"
          value={
            <span className="text-[11px] font-sans normal-case">
              {DIFFICULTY_LABELS[prod.summary.difficulty] ?? prod.summary.difficulty}
            </span>
          }
        />
      )}
    </Toolbar>
  );

  // -------------------------------------------------------------------------
  // LEFT — Vue façade 2D monochrome + légende + warnings
  // -------------------------------------------------------------------------
  const left = (
    <>
      <Panel
        title="Vue Façade"
        flush
        borderless
        actions={
          facadeSel && (
            <ToolbarButton
              variant="ghost"
              onClick={() => setFacadeSel(null)}
              className="!h-5 !px-1.5 !text-[10px]"
            >
              Tout
            </ToolbarButton>
          )
        }
      >
        <div className="p-3 bg-[color:var(--bg-panel-alt)] rule-b">
          <Facade2DView
            model={facade2DModel}
            monochrome
            selected={facadeSel}
            onSelect={(sel) => {
              setFacadeSel(sel);
              setSelectedPartId(null);
            }}
          />
        </div>
      </Panel>

      {/* Légende façade */}
      <div className="p-2 text-[10px] flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--fg-muted)] bg-[color:var(--bg-panel)]">
        <span>
          <span
            className="inline-block w-2 h-2 mr-1 align-middle"
            style={{ border: '1px solid #1d1d1b', background: '#ebe8e1' }}
          />
          plinthe
        </span>
        <span>
          <span
            className="inline-block w-2 h-2 mr-1 align-middle"
            style={{ background: '#1d1d1b' }}
          />
          tablette fixe
        </span>
        <span>
          <span
            className="inline-block w-2 h-2 mr-1 align-middle"
            style={{
              outline: '2px solid var(--accent)',
              outlineOffset: -1,
              background: 'transparent',
            }}
          />
          sélection
        </span>
        {facade2DModel.wallMounting && <span>— suspendu</span>}
      </div>

      {facade2DModel.warnings.length > 0 && (
        <div className="p-2 rule-t flex flex-col gap-1 bg-[color:var(--bg-panel)]">
          {facade2DModel.warnings.slice(0, 3).map((w, i) => (
            <div key={i} className="text-[11px] text-[color:var(--fg-muted)] leading-tight">
              <span className="font-mono text-[10px] text-[color:var(--status-rework)] mr-1">
                APPROX
              </span>
              {w}
            </div>
          ))}
        </div>
      )}
    </>
  );

  // -------------------------------------------------------------------------
  // CENTER — Tabs de données métier (pièces, quinc., courses, montage, hypothèses)
  // -------------------------------------------------------------------------
  const center = (
    <>
      {(nonFabricable || blockingIssues.length > 0) && (
        <div className="flex flex-col gap-0 rule-b">
          {nonFabricable && (
            <AlertStrip kind="error" title="Type non supporté par le moteur V3 — aperçu uniquement">
              {nonFabricable.explanation}
            </AlertStrip>
          )}
          {blockingIssues.map((issue) => (
            <AlertStrip key={issue.id} kind="error" title={issue.message}>
              {issue.suggestion ?? null}
            </AlertStrip>
          ))}
        </div>
      )}

      <ToolbarTabs<TabKey>
        tabs={tabs}
        active={activeTab}
        onChange={(k) => setActiveTab(k)}
      />

      <div className="flex-1 min-h-0 scroll-y bg-[color:var(--bg-panel)]">
        {activeTab === 'pieces' && (
          <PartsTable
            parts={filteredParts}
            selectedId={selectedPartId}
            onSelect={(id) => setSelectedPartId(id)}
            procByPartId={procByPartId}
          />
        )}
        {activeTab === 'hardware' && <HardwareTable result={result} />}
        {activeTab === 'shopping' && prod && <ShoppingList prod={prod} />}
        {activeTab === 'assembly' && prod && <AssemblySteps prod={prod} />}
        {activeTab === 'assumptions' && prod && <AssumptionsTable prod={prod} />}
      </div>
    </>
  );

  // -------------------------------------------------------------------------
  // RIGHT — Inspecteur
  // -------------------------------------------------------------------------
  const right = (
    <Inspector
      part={selectedPart}
      result={result}
      procByPartId={procByPartId}
      onClear={() => setSelectedPartId(null)}
      facadeSelection={facadeSel}
      onClearFacade={() => setFacadeSel(null)}
    />
  );

  // -------------------------------------------------------------------------
  // BOTTOM — Procurement summary + warnings + infos
  // -------------------------------------------------------------------------
  const bottom = (
    <div className="grid grid-cols-3 gap-0">
      {/* Procurement */}
      <div className="rule-r p-3">
        <SectionTitle flush>Procurement</SectionTitle>
        <div className="grid grid-cols-3 gap-3 mt-2">
          <div>
            <ProcurementBadge status="buy_exact" />
            <div className="font-mono tabular-nums text-xl mt-0.5">{procSummary.buy_exact}</div>
          </div>
          <div>
            <ProcurementBadge status="buy_and_rework" />
            <div className="font-mono tabular-nums text-xl mt-0.5">
              {procSummary.buy_and_rework}
            </div>
          </div>
          <div>
            <ProcurementBadge status="cut_from_sheet" />
            <div className="font-mono tabular-nums text-xl mt-0.5">
              {procSummary.cut_from_sheet}
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      <div className="rule-r p-3">
        <SectionTitle flush>Avertissements ({warnings.length})</SectionTitle>
        <div className="mt-2 flex flex-col gap-1 max-h-28 scroll-y">
          {warnings.length === 0 ? (
            <div className="text-[11px] text-[color:var(--fg-subtle)] italic">Aucun</div>
          ) : (
            warnings.map((w) => (
              <div key={w.id} className="text-[11px] leading-tight">
                <span className="font-mono text-[10px] text-[color:var(--status-rework)] mr-1">
                  AVIS
                </span>
                {w.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="p-3">
        <SectionTitle flush>Infos ({infos.length})</SectionTitle>
        <div className="mt-2 flex flex-col gap-1 max-h-28 scroll-y">
          {infos.length === 0 ? (
            <div className="text-[11px] text-[color:var(--fg-subtle)] italic">Aucun</div>
          ) : (
            infos.map((w) => (
              <div key={w.id} className="text-[11px] leading-tight">
                <span className="font-mono text-[10px] text-[color:var(--status-cut)] mr-1">INFO</span>
                {w.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <SplitLayout
      toolbar={toolbar}
      left={left}
      center={center}
      right={right}
      bottom={bottom}
      leftWidth="minmax(320px, 1.1fr)"
      rightWidth="minmax(280px, 0.9fr)"
    />
  );
}

// ---------------------------------------------------------------------------
// PartsTable — tableau dense de pièces avec procurement et sélection
// ---------------------------------------------------------------------------

interface PartsTableProps {
  parts: GeneratedPart[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /**
   * Dictionnaire des décisions procurement. L'UI ne recalcule rien —
   * elle lit `procByPartId[row.id]` qui vient du moteur.
   */
  procByPartId: Record<string, ProcurementDecision>;
}

type PartRow = GeneratedPart & { __idx: number };

function PartsTable({ parts, selectedId, onSelect, procByPartId }: PartsTableProps) {
  const rows: PartRow[] = parts.map((p, i) => ({ ...p, __idx: i }));
  const columns: DataTableColumn<PartRow>[] = [
    {
      key: 'idx',
      header: '#',
      width: 34,
      align: 'right',
      render: (row) => <span className="id">{String(row.__idx + 1).padStart(2, '0')}</span>,
    },
    {
      key: 'name',
      header: 'Pièce',
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: 'L', header: 'L', align: 'right', render: (row) => row.length_mm },
    { key: 'l', header: 'l', align: 'right', render: (row) => row.width_mm },
    { key: 'e', header: 'Ép.', align: 'right', render: (row) => row.thickness_mm },
    { key: 'q', header: 'Qté', align: 'right', render: (row) => row.qty },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="text-[color:var(--fg-muted)] text-[11px]">{row.type}</span>
      ),
    },
    {
      key: 'edge',
      header: 'Chant',
      render: (row) => (
        <span className="text-[color:var(--fg-muted)] text-[11px] font-mono">
          {row.edge_banding && row.edge_banding.length > 0
            ? row.edge_banding.length === 4
              ? '4c'
              : row.edge_banding
                  .map((s) =>
                    s === 'front' ? 'AV' : s === 'back' ? 'AR' : s === 'left' ? 'G' : 'D',
                  )
                  .join('·')
            : '—'}
        </span>
      ),
    },
    {
      key: 'proc',
      header: 'Approvisionnement',
      render: (row) => {
        const decision = procByPartId[row.id];
        if (!decision) return <span className="text-[color:var(--fg-subtle)]">—</span>;
        return <ProcurementBadge status={decision.status} title={decision.reason} />;
      },
    },
  ];

  return (
    <DataTable<PartRow>
      columns={columns}
      rows={rows}
      rowId={(r) => r.id}
      selectedId={selectedId}
      onSelect={(r) => onSelect(r.id)}
      emptyLabel="Aucune pièce dans cette sélection"
    />
  );
}

// ---------------------------------------------------------------------------
// HardwareTable
// ---------------------------------------------------------------------------

function HardwareTable({ result }: { result: PipelineResult }) {
  type HRow = PipelineResult['hardware'][number];
  const columns: DataTableColumn<HRow>[] = [
    { key: 'name', header: 'Désignation', render: (r) => r.name },
    {
      key: 'cat',
      header: 'Catégorie',
      render: (r) => <span className="text-[color:var(--fg-muted)]">{r.category}</span>,
    },
    { key: 'q', header: 'Qté', align: 'right', render: (r) => r.quantity },
    {
      key: 'u',
      header: '€ / unit.',
      align: 'right',
      render: (r) => r.unit_price_eur?.toFixed(2) ?? '—',
    },
    {
      key: 't',
      header: 'Total',
      align: 'right',
      render: (r) =>
        r.unit_price_eur !== undefined ? (r.unit_price_eur * r.quantity).toFixed(2) : '—',
    },
  ];
  return <DataTable columns={columns} rows={result.hardware} rowId={(r) => r.id} />;
}

// ---------------------------------------------------------------------------
// ShoppingList — panneaux + quincaillerie + outils
// ---------------------------------------------------------------------------

function ShoppingList({ prod }: { prod: NonNullable<PipelineResult['production']> }) {
  const list = prod.shopping_list;
  type PanelRow = (typeof list.panels)[number] & { __idx: number };
  const panelRows: PanelRow[] = list.panels.map((p, i) => ({ ...p, __idx: i }));
  const panelColumns: DataTableColumn<PanelRow>[] = [
    {
      key: 'name',
      header: 'Panneau',
      render: (r) => (
        <span>
          {r.panel_label}
          {r.standard_part_id && (
            <span className="ml-2 text-[10px] text-[color:var(--fg-subtle)] font-mono">
              {r.standard_part_id}
            </span>
          )}
        </span>
      ),
    },
    { key: 'dim', header: 'Dim (mm)', align: 'right', render: (r) => `${r.width_mm}×${r.height_mm}` },
    { key: 'ep', header: 'Ép.', align: 'right', render: (r) => r.thickness_mm },
    { key: 'q', header: 'Qté', align: 'right', render: (r) => r.count },
    { key: 'u', header: '€ / u.', align: 'right', render: (r) => r.unit_price_eur.toFixed(2) },
    {
      key: 't',
      header: 'Total',
      align: 'right',
      render: (r) => (r.unit_price_eur * r.count).toFixed(2),
    },
  ];
  type HwRow = (typeof list.hardware)[number];
  const hwColumns: DataTableColumn<HwRow>[] = [
    { key: 'name', header: 'Quincaillerie', render: (r) => r.name },
    {
      key: 'cat',
      header: 'Catégorie',
      render: (r) => <span className="text-[color:var(--fg-muted)]">{r.category}</span>,
    },
    { key: 'q', header: 'Qté', align: 'right', render: (r) => r.quantity },
    {
      key: 'u',
      header: '€ / u.',
      align: 'right',
      render: (r) => r.unit_price_eur?.toFixed(2) ?? '—',
    },
    {
      key: 't',
      header: 'Total',
      align: 'right',
      render: (r) =>
        r.unit_price_eur !== undefined ? (r.unit_price_eur * r.quantity).toFixed(2) : '—',
    },
  ];
  return (
    <div className="flex flex-col">
      {list.panels.length > 0 && (
        <>
          <SectionTitle>Panneaux ({list.panels.length})</SectionTitle>
          <DataTable columns={panelColumns} rows={panelRows} rowId={(r) => String(r.__idx)} />
        </>
      )}
      {list.hardware.length > 0 && (
        <>
          <SectionTitle>Quincaillerie ({list.hardware.length})</SectionTitle>
          <DataTable columns={hwColumns} rows={list.hardware} rowId={(r) => r.id} />
        </>
      )}
      {list.tools_needed.length > 0 && (
        <div className="px-3 py-2 rule-t">
          <SectionTitle flush>Outils nécessaires</SectionTitle>
          <ul className="mt-1 text-[12px] text-[color:var(--fg-muted)] flex flex-wrap gap-x-3 gap-y-0.5">
            {list.tools_needed.map((t, i) => (
              <li key={i}>— {t}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="px-3 py-2 rule-t flex justify-between items-center bg-[color:var(--bg-panel-alt)]">
        <span className="text-[11px] uppercase tracking-wider text-[color:var(--fg-muted)] font-semibold">
          Total estimé
        </span>
        <span className="font-mono tabular-nums font-semibold text-sm">
          {list.estimated_cost_eur} €
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssemblySteps
// ---------------------------------------------------------------------------

function AssemblySteps({ prod }: { prod: NonNullable<PipelineResult['production']> }) {
  return (
    <ol className="text-[12px]">
      {prod.assembly_guide.map((step, i) => (
        <li
          key={i}
          className="flex gap-3 px-3 py-2 border-b border-[color:var(--border-hairline)]"
        >
          <span className="font-mono tabular-nums text-[11px] text-[color:var(--fg-muted)] shrink-0 w-6">
            {String(step.step_number ?? i + 1).padStart(2, '0')}
          </span>
          <div className="flex-1">
            <div className="font-semibold">{step.title}</div>
            {step.instructions.length > 0 && (
              <ul className="text-[color:var(--fg-muted)] text-[11px] mt-0.5 leading-tight list-none">
                {step.instructions.map((ins, j) => (
                  <li key={j}>— {ins}</li>
                ))}
              </ul>
            )}
            {(step.parts_involved.length > 0 || step.hardware_involved?.length) && (
              <div className="mt-1 text-[10px] font-mono text-[color:var(--fg-subtle)] flex flex-wrap gap-x-2 gap-y-0.5">
                {step.parts_involved.length > 0 && (
                  <span>pièces: {step.parts_involved.join(', ')}</span>
                )}
                {step.hardware_involved?.length ? (
                  <span>quinc.: {step.hardware_involved.join(', ')}</span>
                ) : null}
              </div>
            )}
            {step.tip && (
              <div className="text-[color:var(--fg-subtle)] text-[11px] mt-1 italic">
                {step.tip}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// AssumptionsTable
// ---------------------------------------------------------------------------

function AssumptionsTable({ prod }: { prod: NonNullable<PipelineResult['production']> }) {
  type A = NonNullable<PipelineResult['production']>['assumptions'][number];
  const columns: DataTableColumn<A>[] = [
    { key: 'key', header: 'Hypothèse', render: (r) => <span className="font-semibold">{r.key}</span> },
    {
      key: 'val',
      header: 'Valeur',
      render: (r) => <span className="font-mono text-[11.5px]">{String(r.value)}</span>,
    },
    {
      key: 'r',
      header: 'Raison',
      render: (r) => <span className="text-[color:var(--fg-muted)]">{r.reason}</span>,
    },
  ];
  return <DataTable columns={columns} rows={prod.assumptions} rowId={(_, i = 0) => String(i)} />;
}

// ---------------------------------------------------------------------------
// Inspector — détail de la pièce sélectionnée
// ---------------------------------------------------------------------------

interface InspectorProps {
  part: GeneratedPart | null;
  result: PipelineResult;
  /** Dictionnaire partagé avec la PartsTable — même donnée, zéro divergence. */
  procByPartId: Record<string, ProcurementDecision>;
  facadeSelection: Facade2DSelection | null;
  onClear: () => void;
  onClearFacade: () => void;
}

function Inspector({
  part,
  result,
  procByPartId,
  facadeSelection,
  onClear,
  onClearFacade,
}: InspectorProps) {
  if (!part) {
    // Si une zone est sélectionnée : info zone
    if (facadeSelection) {
      const body = result.layout.bodies.find((b) => b.body_id === facadeSelection.bodyId);
      const zone =
        body && facadeSelection.zoneIndex !== null ? body.zones[facadeSelection.zoneIndex] : null;

      const groups: PropertyGroup[] = [
        {
          title: 'Zone sélectionnée',
          rows: [
            { label: 'Corps', value: facadeSelection.bodyId },
            ...(body
              ? [
                  { label: 'Largeur', value: `${body.width_mm} mm` },
                  { label: 'Hauteur', value: `${body.height_mm} mm` },
                ]
              : []),
          ],
        },
      ];
      if (zone) {
        groups.push({
          title: 'Module',
          rows: [
            { label: 'Module', value: zone.module_id },
            { label: 'Hauteur zone', value: `${zone.height_mm} mm` },
          ],
        });
      }

      return (
        <Panel
          title="Inspecteur"
          flush
          borderless
          actions={
            <ToolbarButton
              variant="ghost"
              onClick={onClearFacade}
              className="!h-5 !px-1.5 !text-[10px]"
            >
              ×
            </ToolbarButton>
          }
        >
          <div className="p-3">
            <PropertyGrid groups={groups} />
            <div className="mt-3 text-[11px] text-[color:var(--fg-muted)] italic">
              Cliquez sur une ligne du tableau pour inspecter une pièce.
            </div>
          </div>
        </Panel>
      );
    }

    return (
      <Panel title="Inspecteur" flush borderless>
        <div className="p-6 text-center text-[color:var(--fg-subtle)] text-[12px] italic">
          Sélectionnez une pièce dans la liste ou cliquez sur une zone de la façade.
        </div>
      </Panel>
    );
  }

  const decision = procByPartId[part.id];
  const area_m2 = (part.length_mm * part.width_mm) / 1_000_000;
  const body = result.layout.bodies.find((b) => b.body_id === part.body_id);

  const classificationRows: PropertyGroup['rows'] = [
    { label: 'Type', value: part.type },
    {
      label: 'Corps',
      value: body ? `${part.body_id} (${body.width_mm}×${body.height_mm})` : part.body_id,
    },
  ];
  if (decision) {
    classificationRows.push({
      label: 'Approvisionnement',
      value: <ProcurementBadge status={decision.status} title={decision.reason} />,
      mono: false,
    });
    if (decision.standard_part_id) {
      classificationRows.push({ label: 'Réf. standard', value: decision.standard_part_id });
    }
  }

  const groups: PropertyGroup[] = [
    {
      title: 'Dimensions',
      rows: [
        { label: 'Longueur', value: `${part.length_mm} mm` },
        { label: 'Largeur', value: `${part.width_mm} mm` },
        { label: 'Épaisseur', value: `${part.thickness_mm} mm` },
        { label: 'Surface', value: `${area_m2.toFixed(3)} m²` },
        { label: 'Qté', value: part.qty },
      ],
    },
    {
      title: 'Classification',
      rows: classificationRows,
    },
  ];

  if (part.edge_banding && part.edge_banding.length > 0) {
    const label =
      part.edge_banding.length === 4
        ? '4 côtés'
        : part.edge_banding
            .map((s) =>
              s === 'front'
                ? 'AVANT'
                : s === 'back'
                ? 'ARRIÈRE'
                : s === 'left'
                ? 'GAUCHE'
                : 'DROIT',
            )
            .join(' · ');
    groups.push({ title: 'Chants à plaquer', rows: [{ label: 'Faces', value: label }] });
  }

  if (part.position) {
    groups.push({
      title: 'Position',
      rows: [
        { label: 'x', value: `${part.position.x_mm} mm` },
        { label: 'y', value: `${part.position.y_mm} mm` },
      ],
    });
  }

  return (
    <Panel
      title="Inspecteur pièce"
      flush
      borderless
      actions={
        <ToolbarButton
          variant="ghost"
          onClick={onClear}
          className="!h-5 !px-1.5 !text-[10px]"
        >
          ×
        </ToolbarButton>
      }
    >
      <div className="p-3 text-[12px]">
        <div className="font-semibold text-sm mb-0.5">{part.name}</div>
        <div className="font-mono text-[10.5px] text-[color:var(--fg-muted)] mb-3">{part.id}</div>

        <PropertyGrid groups={groups} />

        {decision && (
          <div className="mt-3">
            <SectionTitle flush>Décision procurement</SectionTitle>
            <div className="mt-1 text-[11.5px] text-[color:var(--fg-muted)] leading-snug">
              {decision.reason}
            </div>
            {decision.source === 'heuristic' && (
              <div className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--fg-subtle)] font-mono">
                Source : règle provisoire
              </div>
            )}
          </div>
        )}

        {part.drilling && part.drilling.length > 0 && (
          <div className="mt-3">
            <SectionTitle flush>Perçages ({part.drilling.length})</SectionTitle>
            <div className="text-[11px] text-[color:var(--fg-muted)] mt-1 font-mono tabular-nums leading-tight">
              {aggregateDrillingOps(part.drilling)
                .slice(0, 6)
                .map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
