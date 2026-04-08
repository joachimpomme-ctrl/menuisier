import type { AppState } from '../../types';
import { BODY_COLORS } from '../../data/materials';
import { isSharedLeft } from '../../lib/helpers';
import { cardClass, sectionTitle } from './styles';

interface Props {
  state: AppState;
  totalPhysical: number;
}

interface DimLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  color?: string;
  fontSize?: number;
}

function DimLine({ x1, y1, x2, y2, label, color = '#78716c', fontSize = 8 }: DimLineProps) {
  const isH = Math.abs(y2 - y1) < 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.8" />
      {isH ? (
        <>
          <line x1={x1} y1={y1 - 3} x2={x1} y2={y1 + 3} stroke={color} strokeWidth="0.8" />
          <line x1={x2} y1={y2 - 3} x2={x2} y2={y2 + 3} stroke={color} strokeWidth="0.8" />
        </>
      ) : (
        <>
          <line x1={x1 - 3} y1={y1} x2={x1 + 3} y2={y1} stroke={color} strokeWidth="0.8" />
          <line x1={x2 - 3} y1={y2} x2={x2 + 3} y2={y2} stroke={color} strokeWidth="0.8" />
        </>
      )}
      <text x={isH ? mx : x1 - 4} y={isH ? my - 4 : my} textAnchor={isH ? 'middle' : 'end'} fill={color} fontSize={fontSize} fontWeight="600" fontFamily="system-ui">
        {label}
      </text>
    </g>
  );
}

export default function WallSurveyDiagram({ state, totalPhysical }: Props) {
  const wallW = state.project.wallWidth;
  const ceilH = state.project.ceilingHeight;
  const plinthH = state.project.plinthHeight;
  const bodies = state.bodies;
  const shared = state.sharedBoundaries ?? [];
  const th = state.panel.thickness;

  const SVG_W = 580;
  const SVG_H = 200;
  const PAD_L = 48;
  const PAD_R = 16;
  const PAD_T = 24;
  const PAD_B = 28;
  const drawW = SVG_W - PAD_L - PAD_R;
  const drawH = SVG_H - PAD_T - PAD_B;

  const scaleX = drawW / wallW;
  const scaleY = drawH / ceilH;
  const sc = Math.min(scaleX, scaleY);

  const wallPx = wallW * sc;
  const ceilPx = ceilH * sc;
  const plinthPx = plinthH * sc;

  const offsetX = PAD_L + (drawW - wallPx) / 2;
  const offsetY = PAD_T + (drawH - ceilPx) / 2;

  let bx = 0;
  const bodyRects: { x: number; w: number; bi: number; name: string }[] = [];
  bodies.forEach((b, bi) => {
    const sharedLeft = isSharedLeft(bi, shared);
    const w = bi === 0 ? b.width : (sharedLeft ? b.width - th / 2 : b.width);
    bodyRects.push({ x: bx, w, bi, name: b.name });
    bx += w;
  });
  const totalBodyW = bx;
  const remaining = wallW - totalPhysical;

  return (
    <div className={cardClass}>
      <h3 className={sectionTitle}>Relevé de cotes</h3>
      <div className="overflow-x-auto">
        <svg width={SVG_W} height={SVG_H} className="rounded-lg">
          <rect width={SVG_W} height={SVG_H} fill="#faf8f5" rx="8" />

          {/* Wall outline */}
          <rect x={offsetX} y={offsetY} width={wallPx} height={ceilPx} fill="none" stroke="#a8a29e" strokeWidth="1.5" strokeDasharray="6,3" rx="2" />

          {/* Floor line */}
          <line x1={offsetX - 4} y1={offsetY + ceilPx} x2={offsetX + wallPx + 4} y2={offsetY + ceilPx} stroke="#78716c" strokeWidth="1.5" />

          {/* Ceiling line */}
          <line x1={offsetX - 4} y1={offsetY} x2={offsetX + wallPx + 4} y2={offsetY} stroke="#78716c" strokeWidth="1" strokeDasharray="3,2" />

          {/* Plinth area */}
          {plinthH > 0 && (
            <rect x={offsetX} y={offsetY + ceilPx - plinthPx} width={wallPx} height={plinthPx} fill="#d6cfc7" opacity="0.4" stroke="#a8a29e" strokeWidth="0.5" />
          )}

          {/* Bodies */}
          {bodyRects.map((br, i) => {
            const bx_px = offsetX + br.x * sc;
            const bw_px = br.w * sc;
            const bodyH_px = ceilPx - plinthPx;
            const color = BODY_COLORS[br.bi % BODY_COLORS.length];

            return (
              <g key={i}>
                <rect
                  x={bx_px + 1}
                  y={offsetY + 1}
                  width={Math.max(bw_px - 2, 2)}
                  height={Math.max(bodyH_px - 2, 2)}
                  fill={color}
                  opacity="0.15"
                  stroke={color}
                  strokeWidth="1.5"
                  rx="2"
                />

                {plinthH > 0 && (
                  <rect
                    x={bx_px + 3}
                    y={offsetY + bodyH_px}
                    width={Math.max(bw_px - 6, 2)}
                    height={plinthPx - 1}
                    fill="#faf8f5"
                    stroke={color}
                    strokeWidth="0.5"
                    strokeDasharray="2,1"
                    rx="1"
                  />
                )}

                {bw_px > 30 && (
                  <text
                    x={bx_px + bw_px / 2}
                    y={offsetY + bodyH_px / 2 - 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="system-ui"
                  >
                    {br.name}
                  </text>
                )}

                {bw_px > 24 && (
                  <text
                    x={bx_px + bw_px / 2}
                    y={offsetY + bodyH_px / 2 + 8}
                    textAnchor="middle"
                    fill={color}
                    fontSize="7"
                    fontFamily="system-ui"
                  >
                    {bodies[br.bi].width} cm
                  </text>
                )}

                {i > 0 && shared[br.bi - 1] && (
                  <circle
                    cx={bx_px}
                    cy={offsetY + bodyH_px / 2}
                    r={4}
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* Remaining space (dashed) */}
          {remaining > 2 && (
            <rect
              x={offsetX + totalBodyW * sc + 2}
              y={offsetY + 2}
              width={Math.max((wallPx - totalBodyW * sc) - 4, 0)}
              height={ceilPx - plinthPx - 4}
              fill="none"
              stroke="#d6cfc7"
              strokeWidth="1"
              strokeDasharray="4,3"
              rx="2"
            />
          )}
          {remaining > 2 && (wallPx - totalBodyW * sc) > 30 && (
            <text
              x={offsetX + totalBodyW * sc + (wallPx - totalBodyW * sc) / 2}
              y={offsetY + (ceilPx - plinthPx) / 2}
              textAnchor="middle"
              fill="#a8a29e"
              fontSize="7"
              fontFamily="system-ui"
            >
              {remaining.toFixed(1)} cm libre
            </text>
          )}

          {/* Dimensions */}
          <DimLine
            x1={offsetX} y1={offsetY - 8}
            x2={offsetX + wallPx} y2={offsetY - 8}
            label={`${wallW} cm`} color="#78716c"
          />

          <DimLine
            x1={offsetX - 8} y1={offsetY}
            x2={offsetX - 8} y2={offsetY + ceilPx}
            label={`${ceilH} cm`} color="#78716c"
          />

          {plinthH > 0 && (
            <DimLine
              x1={offsetX + wallPx + 6} y1={offsetY + ceilPx - plinthPx}
              x2={offsetX + wallPx + 6} y2={offsetY + ceilPx}
              label={`${plinthH}`} color="#a8a29e" fontSize={7}
            />
          )}

          {bodies.length > 0 && (
            <DimLine
              x1={offsetX} y1={offsetY + ceilPx + 10}
              x2={offsetX + totalPhysical * sc} y2={offsetY + ceilPx + 10}
              label={`${totalPhysical.toFixed(1)} cm (meuble)`} color="#92400e" fontSize={7}
            />
          )}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-stone-400">
        <span>Mur : {wallW} cm</span>
        <span>Hauteur : {ceilH} cm</span>
        {plinthH > 0 && <span>Plinthe : {plinthH} cm</span>}
        <span>Meuble : {totalPhysical.toFixed(1)} cm</span>
        {remaining > 0 && <span className={remaining < 0 ? 'text-red-500 font-semibold' : ''}>Reste : {remaining.toFixed(1)} cm</span>}
        {shared.some(Boolean) && <span className="text-blue-600">{shared.filter(Boolean).length} joue(s) commune(s)</span>}
      </div>
    </div>
  );
}
