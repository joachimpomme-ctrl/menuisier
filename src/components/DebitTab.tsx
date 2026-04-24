import type { AppState, PieceWithBody, NestingResult, PanelDef } from '../types';
import type { CostEstimate } from '../lib/cost';
import type { ProjectAnalysis } from '../lib/projectAnalysis';
import { MATERIALS, PIECE_COLORS } from '../data/materials';

const TYPE_SHAPES: Record<string, 'circle' | 'square' | 'diamond' | 'dash'> = {
  joue: 'circle', fixe: 'square', reglable: 'diamond', fond: 'dash', tablette: 'diamond', autre: 'circle',
};

function TypeMarker({ type }: { type: string }) {
  const color = (PIECE_COLORS as Record<string, string>)[type] || PIECE_COLORS.autre;
  const shape = TYPE_SHAPES[type] || 'circle';
  const size = 8;
  if (shape === 'circle')  return <svg width={size} height={size} viewBox="0 0 8 8" className="flex-shrink-0"><circle cx="4" cy="4" r="3.5" fill={color}/></svg>;
  if (shape === 'square')  return <svg width={size} height={size} viewBox="0 0 8 8" className="flex-shrink-0"><rect x="0.5" y="0.5" width="7" height="7" fill={color}/></svg>;
  if (shape === 'diamond') return <svg width={size} height={size} viewBox="0 0 8 8" className="flex-shrink-0"><polygon points="4,0 8,4 4,8 0,4" fill={color}/></svg>;
  if (shape === 'dash')    return <svg width={size} height={size} viewBox="0 0 8 8" className="flex-shrink-0"><rect x="0" y="3" width="8" height="2" fill={color}/></svg>;
  return null;
}
import { generateCutListCsv, downloadCsv } from '../lib/csv';
import { uid, parseNumber } from '../lib/helpers';
import CostPanel from './CostPanel';
import Tip from './Tip';
import TIPS from '../data/tips';

// Presets for common extra panels
const EXTRA_PANEL_PRESETS: { label: string; def: Omit<PanelDef, 'id'> }[] = [
  { label: 'Fond CP 6mm', def: { label: 'CP 6mm', width: 250, height: 122, thickness: 0.6, price: 25 } },
  { label: 'HDF 3mm', def: { label: 'HDF 3mm', width: 244, height: 122, thickness: 0.3, price: 8 } },
  { label: 'CP Peuplier 10mm', def: { label: 'CP 10mm', width: 250, height: 122, thickness: 1.0, price: 35 } },
  { label: 'MDF 12mm', def: { label: 'MDF 12mm', width: 244, height: 122, thickness: 1.2, price: 18 } },
];

interface NestingGroup {
  panelDef: PanelDef;
  nesting: NestingResult;
  pieces: PieceWithBody[];
}

interface Props {
  state: AppState;
  onChange: (state: AppState) => void;
  allPieces: PieceWithBody[];
  nesting: NestingResult;
  nestingByPanel: NestingGroup[];
  allPanelDefs: PanelDef[];
  cost: CostEstimate;
  onPriceChange: (price: number) => void;
  analysis: ProjectAnalysis;
}

const cardClass = "rounded-2xl border border-stone-200 bg-white  p-4 mb-4";

const strategyLabels: Record<string, string> = {
  'shelf-height-desc': 'Étagère (hauteur)',
  'shelf-width-desc': 'Étagère (largeur)',
  'shelf-area-desc': 'Étagère (surface)',
  'shelf-perimeter-desc': 'Étagère (périmètre)',
  'guillotine-area-desc': 'Guillotine (surface)',
  'guillotine-maxdim-desc': 'Guillotine (dimension)',
  'none': 'Aucun',
};

function PanelBinDiagram({ bin, binIndex, panelDef, kerf }: {
  bin: NestingResult['bins'][0]; binIndex: number; panelDef: PanelDef; kerf: number;
}) {
  const SVG_WIDTH = 580;
  const MARGIN = 35;
  const scale = (SVG_WIDTH - 2 * MARGIN) / panelDef.width;
  const svgHeight = MARGIN * 2 + panelDef.height * scale;
  const binUsed = bin.pl.reduce((s, p) => s + (p.pw - kerf) * (p.ph - kerf), 0);
  const binEfficiency = (binUsed / (panelDef.width * panelDef.height)) * 100;

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-400">Panneau {binIndex + 1}</span>
        <span className="text-xs text-stone-500">{binEfficiency.toFixed(0)}% · {bin.pl.length} pièces</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={SVG_WIDTH} height={svgHeight} className="rounded-lg">
          <rect width={SVG_WIDTH} height={svgHeight} fill="#f5f0eb" rx="8" />
          {Array.from({ length: Math.floor(panelDef.width / 10) + 1 }, (_, i) => (
            <line key={`v${i}`} x1={MARGIN + i * 10 * scale} y1={MARGIN} x2={MARGIN + i * 10 * scale} y2={svgHeight - MARGIN} stroke="#d6cfc7" strokeWidth=".5" />
          ))}
          {Array.from({ length: Math.floor(panelDef.height / 10) + 1 }, (_, i) => (
            <line key={`h${i}`} x1={MARGIN} y1={MARGIN + i * 10 * scale} x2={SVG_WIDTH - MARGIN} y2={MARGIN + i * 10 * scale} stroke="#d6cfc7" strokeWidth=".5" />
          ))}
          <rect x={MARGIN} y={MARGIN} width={panelDef.width * scale} height={panelDef.height * scale} fill="none" stroke="#a8a29e" strokeWidth="2" rx="2" />
          {bin.pl.map((p, j) => {
            const px = MARGIN + p.x * scale;
            const py = MARGIN + p.y * scale;
            const pw = p.pw * scale;
            const ph = p.ph * scale;
            const color = PIECE_COLORS[p.type] || PIECE_COLORS.autre;
            return (
              <g key={j}>
                <rect x={px + 1} y={py + 1} width={Math.max(pw - 2, 1)} height={Math.max(ph - 2, 1)} fill={color} opacity=".2" stroke={color} strokeWidth="1.5" rx="3" />
                {pw > 40 && ph > 14 && (
                  <text x={px + pw / 2} y={py + ph / 2 - 3} textAnchor="middle" fill={color} fontSize="7.5" fontWeight="600" fontFamily="system-ui">
                    {p.name?.split(" ").slice(0, 3).join(" ")}
                  </text>
                )}
                {pw > 28 && ph > 10 && (
                  <text x={px + pw / 2} y={py + ph / 2 + 7} textAnchor="middle" fill="#71717a" fontSize="7" fontFamily="system-ui">
                    {p.rotated ? p.width : p.length}×{p.rotated ? p.length : p.width}{p.rotated ? " ↻" : ""}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors";

export default function DebitTab({ state, onChange, allPieces, nesting: _nesting, nestingByPanel, allPanelDefs, cost, onPriceChange, analysis }: Props) {
  const mat = MATERIALS[state.materialKey];

  // ---------- Panel config helpers ----------
  const updatePanel = (key: string, value: number) => {
    onChange({ ...state, panel: { ...state.panel, [key]: value } });
  };

  const addExtraPanel = (preset?: Omit<PanelDef, 'id'>) => {
    const base = preset ?? { label: 'Panneau', width: 250, height: 122, thickness: 0.6, price: 0 };
    const newPanel: PanelDef = { ...base, id: uid() };
    onChange({ ...state, extraPanels: [...(state.extraPanels ?? []), newPanel] });
  };

  const updateExtraPanel = (id: string, key: keyof PanelDef, value: string | number) => {
    onChange({
      ...state,
      extraPanels: (state.extraPanels ?? []).map((p) => p.id === id ? { ...p, [key]: value } : p),
    });
  };

  const removeExtraPanel = (id: string) => {
    const newBodies = state.bodies.map((b) => ({
      ...b,
      pieces: b.pieces.map((p) => p.panelId === id ? { ...p, panelId: undefined } : p),
    }));
    onChange({
      ...state,
      bodies: newBodies,
      extraPanels: (state.extraPanels ?? []).filter((p) => p.id !== id),
    });
  };

  const updateKerf = (value: number) => {
    onChange({ ...state, kerf: value });
  };

  // Aggregate metrics across all panel types
  const totalPanelCount = nestingByPanel.reduce((s, g) => s + g.nesting.metrics.panelCount, 0);
  const totalUsedArea = nestingByPanel.reduce((s, g) => s + g.nesting.metrics.usedArea, 0);
  const totalArea = nestingByPanel.reduce((s, g) => s + g.nesting.metrics.totalArea, 0);
  const totalWasteArea = nestingByPanel.reduce((s, g) => s + g.nesting.metrics.wasteArea, 0);
  const totalEfficiency = totalArea > 0 ? (totalUsedArea / totalArea) * 100 : 0;
  const totalCost = nestingByPanel.reduce((sum, g) => sum + g.panelDef.price * g.nesting.metrics.panelCount, 0);
  const allUnplaced = nestingByPanel.flatMap((g) => g.nesting.unplaced);

  const hasMultiplePanels = nestingByPanel.length > 1;

  return (
    <div>
      {/* Panneaux config */}
      <div className={cardClass}>
        <h4 className="text-amber-700 font-semibold text-xs uppercase tracking-widest mb-3">Panneaux</h4>

        {/* Main panel */}
        <div className="mb-3">
          <div className="text-xs font-medium text-stone-600 mb-1.5">Panneau principal : <span className="text-amber-700 font-semibold">{mat.short} {state.panel.thickness * 10}mm</span></div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] text-stone-400">Format :</label>
            <input
              type="number"
              step="1"
              min={10}
              className={inputClass + " !py-1.5 w-16 text-center"}
              value={state.panel.width}
              onChange={(e) => updatePanel('width', parseNumber(e.target.value, state.panel.width, 10))}
              title="Largeur (cm)"
            />
            <span className="text-[10px] text-stone-400">x</span>
            <input
              type="number"
              step="1"
              min={10}
              className={inputClass + " !py-1.5 w-16 text-center"}
              value={state.panel.height}
              onChange={(e) => updatePanel('height', parseNumber(e.target.value, state.panel.height, 10))}
              title="Hauteur (cm)"
            />
            <span className="text-[10px] text-stone-400">cm</span>
            <label className="text-[10px] text-stone-400 ml-2">Prix :</label>
            <input
              type="number"
              step="1"
              min={0}
              className={inputClass + " !py-1.5 w-16 text-center"}
              value={state.costConfig.panelPrice}
              onChange={(e) => onPriceChange(parseNumber(e.target.value, state.costConfig.panelPrice, 0))}
              title="Prix par panneau (EUR)"
            />
            <span className="text-[10px] text-stone-400">EUR</span>
          </div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {mat.panels.map((p, i) => (
              <button
                key={i}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                  state.panel.width === p.w && state.panel.height === p.h
                    ? 'bg-amber-100 border-amber-300 text-amber-800 font-semibold'
                    : 'bg-white text-stone-500 hover:text-amber-700 hover:bg-amber-50 border-stone-200 hover:border-amber-200'
                }`}
                onClick={() => onChange({
                  ...state,
                  panel: { ...state.panel, width: p.w, height: p.h },
                  costConfig: { panelPrice: p.defaultPrice },
                })}
              >
                {p.w}x{p.h} ({p.defaultPrice} EUR)
              </button>
            ))}
          </div>
        </div>

        {/* Extra panels */}
        {(state.extraPanels ?? []).length > 0 && (
          <div className="border-t border-stone-100 pt-3 mb-3">
            {(state.extraPanels ?? []).map((ep, i) => (
              <div key={ep.id} className="flex items-center gap-2 mb-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 flex-shrink-0">#{i + 1}</span>
                <input
                  className={inputClass + " !py-1.5 w-24"}
                  value={ep.label}
                  onChange={(e) => updateExtraPanel(ep.id, 'label', e.target.value)}
                  placeholder="Nom"
                />
                <input
                  type="number"
                  step="1"
                  min={10}
                  className={inputClass + " !py-1.5 w-16 text-center"}
                  value={ep.width}
                  onChange={(e) => updateExtraPanel(ep.id, 'width', parseNumber(e.target.value, ep.width, 10))}
                  title="Largeur (cm)"
                />
                <span className="text-[10px] text-stone-400">x</span>
                <input
                  type="number"
                  step="1"
                  min={10}
                  className={inputClass + " !py-1.5 w-16 text-center"}
                  value={ep.height}
                  onChange={(e) => updateExtraPanel(ep.id, 'height', parseNumber(e.target.value, ep.height, 10))}
                  title="Hauteur (cm)"
                />
                <span className="text-[10px] text-stone-400">ep.</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  className={inputClass + " !py-1.5 w-14 text-center"}
                  value={ep.thickness}
                  onChange={(e) => updateExtraPanel(ep.id, 'thickness', parseNumber(e.target.value, ep.thickness, 0.1))}
                  title="Epaisseur (cm)"
                />
                <span className="text-[10px] text-stone-400">cm</span>
                <input
                  type="number"
                  step="1"
                  min={0}
                  className={inputClass + " !py-1.5 w-14 text-center"}
                  value={ep.price}
                  onChange={(e) => updateExtraPanel(ep.id, 'price', parseNumber(e.target.value, ep.price, 0))}
                  title="Prix EUR/panneau"
                />
                <span className="text-[10px] text-stone-400">EUR</span>
                <button
                  onClick={() => removeExtraPanel(ep.id)}
                  className="text-xs text-stone-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
                  title="Supprimer ce panneau"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add extra panel presets */}
        <div className="flex flex-wrap gap-1.5">
          {EXTRA_PANEL_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => addExtraPanel(preset.def)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-500 hover:text-amber-700 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 transition-all"
            >
              + {preset.label}
            </button>
          ))}
          <button
            onClick={() => addExtraPanel()}
            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-400 hover:text-stone-600 border border-dashed border-stone-300 hover:border-stone-400 transition-all"
          >
            + Personnalise
          </button>
        </div>

        {/* Kerf */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
          <Tip text={TIPS['trait-scie']}><label className="text-xs text-stone-500 whitespace-nowrap">Trait de scie (kerf) :</label></Tip>
          <input
            type="number"
            step="0.1"
            min={0}
            max={5}
            className={inputClass + " !py-1.5 w-16 text-center"}
            value={state.kerf}
            onChange={(e) => updateKerf(parseNumber(e.target.value, state.kerf, 0, 5))}
          />
          <span className="text-[10px] text-stone-400">mm</span>
        </div>
      </div>

      {/* Summary metrics */}
      <div className={cardClass}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-700">{totalPanelCount}</div>
            <Tip text={TIPS['panneaux-total']}><div className="text-xs text-stone-500">panneaux</div></Tip>
          </div>
          <div>
            <div className={`text-2xl font-bold ${totalEfficiency > 70 ? 'text-emerald-400' : totalEfficiency > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {totalEfficiency.toFixed(1)}%
            </div>
            <Tip text={TIPS['rendement']}><div className="text-xs text-stone-500">rendement</div></Tip>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-400">{(totalUsedArea / 10000).toFixed(2)}</div>
            <Tip text={TIPS['surface-utile']}><div className="text-xs text-stone-500">m² utile</div></Tip>
          </div>
          <div>
            <div className="text-2xl font-bold text-stone-500">{(totalWasteArea / 10000).toFixed(2)}</div>
            <Tip text={TIPS['surface-chute']}><div className="text-xs text-stone-500">m² chute</div></Tip>
          </div>
        </div>
        {totalCost > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-200 text-center">
            <span className="text-lg font-bold text-emerald-600">{totalCost.toFixed(0)} €</span>
            <span className="text-xs text-stone-400 ml-2">coût total panneaux</span>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <Tip text={TIPS['trait-scie']}><span>trait {state.kerf} mm</span></Tip>
          {hasMultiplePanels && (
            <span>{nestingByPanel.length} types de panneaux</span>
          )}
        </div>
      </div>

      {/* Unplaced pieces warning */}
      {allUnplaced.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
          <Tip text={TIPS['piece-non-placable']}><h4 className="text-red-600 font-semibold text-sm mb-2">Pièces non placables</h4></Tip>
          <p className="text-xs text-red-500 mb-2">Ces pièces dépassent les dimensions du panneau :</p>
          {allUnplaced.map((p, i) => (
            <div key={i} className="text-xs text-red-400 py-0.5">
              {p.name} ({p.length}×{p.width} cm) — {p.bodyName}
            </div>
          ))}
        </div>
      )}

      {/* Cost panel (for main panel) */}
      <div className="mb-4">
        <CostPanel
          panelPrice={cost.panelPrice}
          panelCount={cost.panelCount}
          totalCost={cost.totalMaterial}
          wastePercent={cost.wastePercent}
          wasteCost={cost.wasteCost}
          configured={cost.configured}
          onPriceChange={onPriceChange}
        />
      </div>

      {/* Per-panel-group nesting */}
      {nestingByPanel.map((group) => {
        const { panelDef, nesting: groupNesting } = group;
        const isDefault = panelDef.id === 'default';

        return (
          <div key={panelDef.id}>
            {/* Group header (only show if multiple panels) */}
            {hasMultiplePanels && (
              <div className="flex items-center gap-2 mb-3 mt-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                  isDefault
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200'
                }`}>
                  {panelDef.label} — {panelDef.width}×{panelDef.height} cm, ép. {panelDef.thickness * 10}mm
                  {' · '}{groupNesting.metrics.panelCount} pan.
                  {panelDef.price > 0 && ` · ${(panelDef.price * groupNesting.metrics.panelCount).toFixed(0)} €`}
                </span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>
            )}

            {!hasMultiplePanels && (
              <div className="mt-3 mb-2 text-xs text-stone-500 flex justify-between">
                <span>{mat.short} · {panelDef.width}×{panelDef.height} cm</span>
                <span>Stratégie : {strategyLabels[groupNesting.strategy] ?? groupNesting.strategy}</span>
              </div>
            )}

            {/* Bin diagrams */}
            {groupNesting.bins.map((bin, binIndex) => (
              <PanelBinDiagram
                key={binIndex}
                bin={bin}
                binIndex={binIndex}
                panelDef={panelDef}
                kerf={state.kerf}
              />
            ))}
          </div>
        );
      })}

      {/* Cut list */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-amber-700 font-semibold text-xs uppercase tracking-widest">Liste de coupe</h4>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
              onClick={async () => {
                const { generateCutListPdf } = await import('../lib/pdf');
                generateCutListPdf(state, analysis);
              }}
            >
              PDF Atelier
            </button>
            <button
              type="button"
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-stone-300 bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors"
              onClick={() => downloadCsv(generateCutListCsv(allPieces, allPanelDefs, state), `${state.project.name}-debit.csv`)}
            >
              CSV
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {[...allPieces]
            .sort((a, b) => b.length * b.width * b.qty - a.length * a.width * a.qty)
            .map((p, i) => {
              const panelLabel = p.panelId && p.panelId !== 'default'
                ? allPanelDefs.find((pd) => pd.id === p.panelId)?.label
                : null;
              return (
                <div key={i} className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-stone-50">
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <TypeMarker type={p.type} />
                    <span className="text-stone-700 truncate">{p.name}</span>
                    {p.standardPartId && (
                      <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded flex-shrink-0" title="Pièce standard (bibliothèque)">
                        STD
                      </span>
                    )}
                    <span className="text-stone-400 hidden sm:inline flex-shrink-0">{p.bodyName}</span>
                    {panelLabel && (
                      <span className="text-[9px] bg-sky-50 text-sky-600 border border-sky-200 rounded px-1 py-0 flex-shrink-0">{panelLabel}</span>
                    )}
                  </span>
                  <span className="font-mono text-stone-500 flex-shrink-0">{p.length}×{p.width} ×{p.qty}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
