import type { AppState } from '../types';
import { MATERIALS, BODY_COLORS } from '../data/materials';

interface Props {
  state: AppState;
}

const cardClass = "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4";

export default function MontageTab({ state }: Props) {
  const mat = MATERIALS[state.materialKey];
  const usableHeight = state.project.ceilingHeight - state.project.plinthHeight;
  const thickness = state.panel.thickness;

  const SVG_WIDTH = 580;
  const MARGIN = 50;
  const totalBodyWidth = state.bodies.reduce((s, b) => s + b.width, 0);
  const gapCount = Math.max(state.bodies.length - 1, 0);
  const scale = (SVG_WIDTH - 2 * MARGIN - 20 * gapCount) / Math.max(totalBodyWidth, 1);
  const svgHeight = MARGIN * 2 + usableHeight * scale;

  let offsetX = MARGIN;
  const offsets = state.bodies.map((b) => {
    const x = offsetX;
    offsetX += b.width * scale + 20;
    return x;
  });

  return (
    <div>
      <div className="text-sm text-zinc-400 mb-4">
        Élévation frontale — {mat.short} {thickness * 10} mm
      </div>

      <div className={cardClass}>
        <div className="overflow-x-auto">
          <svg
            width={SVG_WIDTH}
            height={Math.min(svgHeight, 700)}
            viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
            className="rounded-lg"
          >
            <rect width={SVG_WIDTH} height={svgHeight} fill="#18181b" rx="8" />
            {/* Floor line */}
            <line
              x1={MARGIN - 10} y1={MARGIN + usableHeight * scale}
              x2={SVG_WIDTH - MARGIN + 10} y2={MARGIN + usableHeight * scale}
              stroke="#3f3f46" strokeWidth="1" strokeDasharray="6,3"
            />

            {state.bodies.map((b, bi) => {
              const bx = offsets[bi];
              const bw = b.width * scale;
              const bh = usableHeight * scale;
              const tw = thickness * scale;
              const color = BODY_COLORS[bi % BODY_COLORS.length];

              const adjustableCount = b.pieces
                .filter((p) => p.type === "tablette-reglable")
                .reduce((s, p) => s + p.qty, 0);
              const fixedCount = b.pieces
                .filter((p) => p.type === "tablette-fixe")
                .reduce((s, p) => s + p.qty, 0);
              const fixedPositions = [180, usableHeight - 45].slice(0, fixedCount);

              return (
                <g key={b.id}>
                  {/* Body outline */}
                  <rect x={bx} y={MARGIN} width={bw} height={bh} fill="none" stroke={color} strokeWidth="1.5" opacity=".4" rx="2" />
                  {/* Left joue */}
                  <rect x={bx} y={MARGIN} width={tw} height={bh} fill={color} opacity=".25" rx="1" />
                  {/* Right joue */}
                  <rect x={bx + bw - tw} y={MARGIN} width={tw} height={bh} fill={color} opacity=".25" rx="1" />
                  {/* Plinthe cuts */}
                  <rect x={bx} y={MARGIN + bh - state.project.plinthHeight * scale} width={tw} height={state.project.plinthHeight * scale} fill="#18181b" stroke="#3f3f46" strokeWidth=".5" />
                  <rect x={bx + bw - tw} y={MARGIN + bh - state.project.plinthHeight * scale} width={tw} height={state.project.plinthHeight * scale} fill="#18181b" stroke="#3f3f46" strokeWidth=".5" />
                  {/* Fixed shelves */}
                  {fixedPositions.map((h, fi) => (
                    <rect key={fi} x={bx + tw} y={MARGIN + bh - h * scale - tw / 2} width={bw - 2 * tw} height={tw} fill="#10b981" opacity=".45" rx="1" />
                  ))}
                  {/* Joint line */}
                  <line x1={bx} y1={MARGIN + bh - 180 * scale} x2={bx + bw} y2={MARGIN + bh - 180 * scale} stroke="#f59e0b" strokeWidth=".5" strokeDasharray="2,4" opacity=".4" />
                  {/* Adjustable shelves */}
                  {Array.from({ length: adjustableCount }, (_, ri) => {
                    const shelfY = 30 + (ri + 1) * (140 / (adjustableCount + 1));
                    return (
                      <line key={ri} x1={bx + tw + 2} y1={MARGIN + bh - shelfY * scale} x2={bx + bw - tw - 2} y2={MARGIN + bh - shelfY * scale} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" opacity=".5" />
                    );
                  })}
                  {/* Labels */}
                  <text x={bx + bw / 2} y={MARGIN - 14} textAnchor="middle" fill={color} fontSize="10" fontWeight="600" fontFamily="system-ui">{b.name}</text>
                  <text x={bx + bw / 2} y={MARGIN - 3} textAnchor="middle" fill="#71717a" fontSize="8" fontFamily="system-ui">prof. {b.depth} cm</text>
                  <text x={bx + bw / 2} y={svgHeight - 10} textAnchor="middle" fill="#a1a1aa" fontSize="9" fontWeight="600" fontFamily="system-ui">{b.width} cm</text>
                </g>
              );
            })}

            {/* Height label */}
            <text
              x={15}
              y={MARGIN + usableHeight * scale / 2}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize="9"
              fontWeight="600"
              fontFamily="system-ui"
              transform={`rotate(-90,15,${MARGIN + usableHeight * scale / 2})`}
            >
              {usableHeight} cm
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
