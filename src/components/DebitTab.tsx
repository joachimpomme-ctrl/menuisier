import type { AppState, PieceWithBody, PackingBin } from '../types';
import { MATERIALS, PIECE_COLORS } from '../data/materials';

interface Props {
  state: AppState;
  allPieces: PieceWithBody[];
  bins: PackingBin[];
}

const cardClass = "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4";

export default function DebitTab({ state, allPieces, bins }: Props) {
  const mat = MATERIALS[state.materialKey];
  const usedArea = allPieces.reduce((s, p) => s + p.length * p.width * p.qty, 0);
  const totalArea = state.panel.width * state.panel.height * bins.length;
  const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;

  const SVG_WIDTH = 580;
  const MARGIN = 35;
  const scale = (SVG_WIDTH - 2 * MARGIN) / state.panel.width;
  const svgHeight = MARGIN * 2 + state.panel.height * scale;

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4 text-sm">
        <span className="text-amber-400 font-bold text-lg">{bins.length}</span>
        <span className="text-zinc-400">panneaux {mat.short}</span>
        <span className="text-zinc-600">·</span>
        <span className={efficiency > 70 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
          {efficiency.toFixed(1)}%
        </span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">{(usedArea / 10000).toFixed(2)} m²</span>
      </div>

      {bins.map((bin, binIndex) => {
        const binUsed = bin.pl.reduce((s, p) => s + (p.pw - state.kerf) * (p.ph - state.kerf), 0);
        const binEfficiency = (binUsed / (state.panel.width * state.panel.height)) * 100;

        return (
          <div key={binIndex} className={cardClass}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-300">Panneau {binIndex + 1}</span>
              <span className="text-xs text-zinc-500">{binEfficiency.toFixed(0)}% utilisé</span>
            </div>
            <div className="overflow-x-auto">
              <svg width={SVG_WIDTH} height={svgHeight} className="rounded-lg">
                <rect width={SVG_WIDTH} height={svgHeight} fill="#18181b" rx="8" />
                {/* Grid */}
                {Array.from({ length: Math.floor(state.panel.width / 10) + 1 }, (_, i) => (
                  <line key={`v${i}`} x1={MARGIN + i * 10 * scale} y1={MARGIN} x2={MARGIN + i * 10 * scale} y2={svgHeight - MARGIN} stroke="#27272a" strokeWidth=".5" />
                ))}
                {Array.from({ length: Math.floor(state.panel.height / 10) + 1 }, (_, i) => (
                  <line key={`h${i}`} x1={MARGIN} y1={MARGIN + i * 10 * scale} x2={SVG_WIDTH - MARGIN} y2={MARGIN + i * 10 * scale} stroke="#27272a" strokeWidth=".5" />
                ))}
                {/* Panel border */}
                <rect x={MARGIN} y={MARGIN} width={state.panel.width * scale} height={state.panel.height * scale} fill="none" stroke="#3f3f46" strokeWidth="2" rx="2" />
                {/* Pieces */}
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
                          {p.rotated ? p.width : p.length}x{p.rotated ? p.length : p.width}{p.rotated ? " ↻" : ""}
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
                </span>
                <span className="font-mono text-zinc-500">{p.length} x {p.width} x{p.qty}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
