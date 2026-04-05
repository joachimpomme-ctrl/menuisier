import type { AppState, PieceWithBody, NestingResult } from '../types';
import type { CostEstimate } from '../lib/cost';
import { MATERIALS, PIECE_COLORS } from '../data/materials';
import CostPanel from './CostPanel';

interface Props {
  state: AppState;
  allPieces: PieceWithBody[];
  nesting: NestingResult;
  cost: CostEstimate;
  onPriceChange: (price: number) => void;
}

const cardClass = "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4";

export default function DebitTab({ state, allPieces, nesting, cost, onPriceChange }: Props) {
  const mat = MATERIALS[state.materialKey];
  const { bins, unplaced, metrics, strategy } = nesting;

  const SVG_WIDTH = 580;
  const MARGIN = 35;
  const scale = (SVG_WIDTH - 2 * MARGIN) / state.panel.width;
  const svgHeight = MARGIN * 2 + state.panel.height * scale;

  const strategyLabels: Record<string, string> = {
    'shelf-height-desc': 'Étagère (hauteur)',
    'shelf-width-desc': 'Étagère (largeur)',
    'shelf-area-desc': 'Étagère (surface)',
    'shelf-perimeter-desc': 'Étagère (périmètre)',
    'guillotine-area-desc': 'Guillotine (surface)',
    'guillotine-maxdim-desc': 'Guillotine (dimension)',
    'none': 'Aucun',
  };

  return (
    <div>
      {/* Summary metrics */}
      <div className={cardClass}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-400">{metrics.panelCount}</div>
            <div className="text-xs text-zinc-500">panneaux</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${metrics.efficiency > 70 ? 'text-emerald-400' : metrics.efficiency > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {metrics.efficiency.toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-500">rendement</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-300">{(metrics.usedArea / 10000).toFixed(2)}</div>
            <div className="text-xs text-zinc-500">m² utile</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-500">{(metrics.wasteArea / 10000).toFixed(2)}</div>
            <div className="text-xs text-zinc-500">m² chute</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>{mat.short} · {state.panel.width}×{state.panel.height} cm · trait {state.kerf} mm</span>
          <span>Stratégie : {strategyLabels[strategy] ?? strategy}</span>
        </div>
      </div>

      {/* Unplaced pieces warning */}
      {unplaced.length > 0 && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 mb-4">
          <h4 className="text-red-400 font-semibold text-sm mb-2">Pièces non plaçables</h4>
          <p className="text-xs text-red-300/70 mb-2">Ces pièces dépassent les dimensions du panneau :</p>
          {unplaced.map((p, i) => (
            <div key={i} className="text-xs text-red-300/60 py-0.5">
              {p.name} ({p.length}×{p.width} cm) — {p.bodyName}
            </div>
          ))}
        </div>
      )}

      {/* Cost panel */}
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

      {/* Panel diagrams */}
      {bins.map((bin, binIndex) => {
        const binUsed = bin.pl.reduce((s, p) => s + (p.pw - state.kerf) * (p.ph - state.kerf), 0);
        const binEfficiency = (binUsed / (state.panel.width * state.panel.height)) * 100;

        return (
          <div key={binIndex} className={cardClass}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-300">Panneau {binIndex + 1}</span>
              <span className="text-xs text-zinc-500">{binEfficiency.toFixed(0)}% · {bin.pl.length} pièces</span>
            </div>
            <div className="overflow-x-auto">
              <svg width={SVG_WIDTH} height={svgHeight} className="rounded-lg">
                <rect width={SVG_WIDTH} height={svgHeight} fill="#18181b" rx="8" />
                {Array.from({ length: Math.floor(state.panel.width / 10) + 1 }, (_, i) => (
                  <line key={`v${i}`} x1={MARGIN + i * 10 * scale} y1={MARGIN} x2={MARGIN + i * 10 * scale} y2={svgHeight - MARGIN} stroke="#27272a" strokeWidth=".5" />
                ))}
                {Array.from({ length: Math.floor(state.panel.height / 10) + 1 }, (_, i) => (
                  <line key={`h${i}`} x1={MARGIN} y1={MARGIN + i * 10 * scale} x2={SVG_WIDTH - MARGIN} y2={MARGIN + i * 10 * scale} stroke="#27272a" strokeWidth=".5" />
                ))}
                <rect x={MARGIN} y={MARGIN} width={state.panel.width * scale} height={state.panel.height * scale} fill="none" stroke="#3f3f46" strokeWidth="2" rx="2" />
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
      })}

      {/* Cut list */}
      <div className={cardClass}>
        <h4 className="text-amber-400 font-semibold text-xs uppercase tracking-widest mb-3">Liste de coupe</h4>
        <div className="space-y-1">
          {[...allPieces]
            .sort((a, b) => b.length * b.width * b.qty - a.length * a.width * a.qty)
            .map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-zinc-800/50">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIECE_COLORS[p.type] }} />
                  <span className="text-zinc-300">{p.name}</span>
                  <span className="text-zinc-600">{p.bodyName}</span>
                </span>
                <span className="font-mono text-zinc-500">{p.length}×{p.width} ×{p.qty}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
