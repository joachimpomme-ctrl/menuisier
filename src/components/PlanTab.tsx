import { useState } from 'react';
import type { AppState } from '../types';
import { MATERIALS, BODY_COLORS, PIECE_COLORS } from '../data/materials';
import { getBodyInnerWidth, isSharedLeft, getUsableHeight } from '../lib/helpers';
import Tip from './Tip';

interface Props {
  state: AppState;
}

type ViewMode = 'face' | 'dessus' | 'cote';

const cardClass = "rounded-2xl border border-[#EFE8DD] bg-white p-4 mb-4";

/** Dimension arrow helper */
function DimLine({ x1, y1, x2, y2, label, offset = 14, color = '#9A968F', fontSize = 8 }: {
  x1: number; y1: number; x2: number; y2: number; label: string; offset?: number; color?: string; fontSize?: number;
}) {
  const isH = Math.abs(y1 - y2) < 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const arrowSize = 3;

  if (isH) {
    // Horizontal dimension
    const oy = y1 + offset;
    return (
      <g>
        {/* Extension lines */}
        <line x1={x1} y1={y1} x2={x1} y2={oy + 2} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
        <line x1={x2} y1={y2} x2={x2} y2={oy + 2} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
        {/* Dimension line */}
        <line x1={x1} y1={oy} x2={x2} y2={oy} stroke={color} strokeWidth="0.5" />
        {/* Arrows */}
        <polygon points={`${x1},${oy} ${x1 + arrowSize},${oy - arrowSize / 2} ${x1 + arrowSize},${oy + arrowSize / 2}`} fill={color} />
        <polygon points={`${x2},${oy} ${x2 - arrowSize},${oy - arrowSize / 2} ${x2 - arrowSize},${oy + arrowSize / 2}`} fill={color} />
        {/* Label */}
        <text x={mx} y={oy - 2} textAnchor="middle" fill={color} fontSize={fontSize} fontFamily="system-ui" fontWeight="500">{label}</text>
      </g>
    );
  } else {
    // Vertical dimension
    const ox = x1 + offset;
    return (
      <g>
        <line x1={x1} y1={y1} x2={ox + 2} y2={y1} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
        <line x1={x2} y1={y2} x2={ox + 2} y2={y2} stroke={color} strokeWidth="0.3" strokeDasharray="1,1" />
        <line x1={ox} y1={y1} x2={ox} y2={y2} stroke={color} strokeWidth="0.5" />
        <polygon points={`${ox},${y1} ${ox - arrowSize / 2},${y1 + arrowSize} ${ox + arrowSize / 2},${y1 + arrowSize}`} fill={color} />
        <polygon points={`${ox},${y2} ${ox - arrowSize / 2},${y2 - arrowSize} ${ox + arrowSize / 2},${y2 - arrowSize}`} fill={color} />
        <text x={ox + 3} y={my + 3} textAnchor="start" fill={color} fontSize={fontSize} fontFamily="system-ui" fontWeight="500"
          transform={`rotate(-90,${ox + 3},${my + 3})`}>{label}</text>
      </g>
    );
  }
}

export default function PlanTab({ state }: Props) {
  const [view, setView] = useState<ViewMode>('face');
  const [selectedBody, setSelectedBody] = useState<string | null>(null);
  const mat = MATERIALS[state.materialKey];
  const th = state.panel.thickness;
  const usableHeight = getUsableHeight(state.project.ceilingHeight, state.project.plinthHeight);

  const SVG_W = 600;
  const M = 60; // margin for dimensions

  const bodies = selectedBody ? state.bodies.filter(b => b.id === selectedBody) : state.bodies;
  const totalW = bodies.reduce((s, b) => s + b.width, 0);
  const maxDepth = Math.max(...bodies.map(b => b.depth), 30);
  const maxH = Math.max(usableHeight, ...bodies.flatMap(b => b.pieces.filter(p => p.type === 'joue').map(p => p.length)), 100);

  // --- FACE VIEW ---
  const renderFace = () => {
    const scale = Math.min((SVG_W - M * 2 - 40) / Math.max(totalW, 1), (500 - M * 2) / maxH);
    const svgH = M * 2 + maxH * scale + 30;
    let offX = M;

    return (
      <svg width={SVG_W} height={svgH} viewBox={`0 0 ${SVG_W} ${svgH}`} className="rounded-lg">
        <rect width={SVG_W} height={svgH} fill="#FFFCF7" rx="8" />
        {/* Floor line */}
        <line x1={M - 10} y1={M + maxH * scale} x2={SVG_W - M + 10} y2={M + maxH * scale} stroke="#EFE8DD" strokeWidth="1" strokeDasharray="6,3" />

        {bodies.map((b, bi) => {
          const bx = offX;
          const bw = b.width * scale;
          const bh = maxH * scale;
          const tw = th * scale;
          const color = BODY_COLORS[bi % BODY_COLORS.length];
          offX += bw + 8;

          const fixedTab = b.pieces.filter(p => p.type === 'tablette-fixe');
          const adjustTab = b.pieces.filter(p => p.type === 'tablette-reglable');
          const separateurs = b.pieces.filter(p => p.type === 'separateur');
          const portes = b.pieces.filter(p => p.type === 'porte');
          const bandeaux = b.pieces.filter(p => p.type === 'bandeau');

          // Expand pieces with quantity into individual entries (so a tablette qty=2
          // becomes 2 placements). When posY is set, all clones share the same height.
          const expand = <T extends { qty: number }>(arr: T[]) =>
            arr.flatMap(p => Array.from({ length: p.qty }, () => p));

          const fixedExpanded = expand(fixedTab);
          const adjustExpanded = expand(adjustTab);
          const sepExpanded = expand(separateurs);
          const bandExpanded = expand(bandeaux);

          // Fixed shelf positions (cm depuis sol intérieur). Si posY défini → on l'utilise,
          // sinon on auto-distribue : haut/bas puis intermédiaires équidistants.
          const fixedPositions: number[] = fixedExpanded.map((p, i) => {
            if (typeof p.posY === 'number') return p.posY;
            // fallback
            if (fixedExpanded.length === 1) return maxH - 2;
            if (i === 0) return maxH - 2;
            if (i === 1) return 2;
            return (maxH * (i - 1)) / (fixedExpanded.length - 1);
          });
          // Adjustable shelf positions
          const adjustPositions: number[] = adjustExpanded.map((p, ri) => {
            if (typeof p.posY === 'number') return p.posY;
            return 20 + (ri + 1) * ((maxH - 40) / (adjustExpanded.length + 1));
          });

          return (
            <g key={b.id}>
              {/* Body outline */}
              <rect x={bx} y={M} width={bw} height={bh} fill="none" stroke={color} strokeWidth="1" opacity=".3" rx="1" />
              {/* Left joue (skip if shared) */}
              {!isSharedLeft(state.bodies.findIndex(bb => bb.id === b.id), state.sharedBoundaries ?? []) && (
                <rect x={bx} y={M} width={tw} height={bh} fill={PIECE_COLORS.joue} opacity=".15" stroke={PIECE_COLORS.joue} strokeWidth="0.5" />
              )}
              {/* Right joue */}
              <rect x={bx + bw - tw} y={M} width={tw} height={bh} fill={PIECE_COLORS.joue} opacity=".15" stroke={PIECE_COLORS.joue} strokeWidth="0.5" />

              {/* Plinthe cutouts */}
              {state.project.plinthHeight > 0 && <>
                <rect x={bx} y={M + bh - state.project.plinthHeight * scale} width={tw} height={state.project.plinthHeight * scale} fill="#FFFCF7" stroke="#9A968F" strokeWidth="0.5" strokeDasharray="2,2" />
                <rect x={bx + bw - tw} y={M + bh - state.project.plinthHeight * scale} width={tw} height={state.project.plinthHeight * scale} fill="#FFFCF7" stroke="#9A968F" strokeWidth="0.5" strokeDasharray="2,2" />
              </>}

              {/* Fixed shelves — with H labels when posY is set */}
              {fixedPositions.map((h, fi) => (
                <g key={`f${fi}`}>
                  <rect x={bx + tw} y={M + bh - h * scale - tw / 2}
                    width={bw - 2 * tw} height={tw}
                    fill={PIECE_COLORS['tablette-fixe']} opacity=".35"
                    stroke={PIECE_COLORS['tablette-fixe']} strokeWidth="0.5" />
                  {typeof fixedExpanded[fi].posY === 'number' && (
                    <text x={bx + bw - tw - 4} y={M + bh - h * scale - 1}
                      textAnchor="end" fill={PIECE_COLORS['tablette-fixe']} fontSize="6" fontFamily="system-ui" fontWeight="600">
                      H={h}
                    </text>
                  )}
                </g>
              ))}

              {/* Adjustable shelves (dashed) — use real posY when set */}
              {adjustPositions.map((shelfY, ri) => (
                <g key={`a${ri}`}>
                  <line
                    x1={bx + tw + 2} y1={M + bh - shelfY * scale}
                    x2={bx + bw - tw - 2} y2={M + bh - shelfY * scale}
                    stroke={PIECE_COLORS['tablette-reglable']} strokeWidth="1" strokeDasharray="4,3" opacity=".6" />
                  {typeof adjustExpanded[ri].posY === 'number' && (
                    <text x={bx + bw - tw - 4} y={M + bh - shelfY * scale - 1}
                      textAnchor="end" fill={PIECE_COLORS['tablette-reglable']} fontSize="6" fontFamily="system-ui" opacity=".8">
                      H={shelfY}
                    </text>
                  )}
                </g>
              ))}

              {/* Séparateurs verticaux */}
              {(() => {
                if (sepExpanded.length === 0) return null;
                const innerWcm = b.width - 2 * th;
                return sepExpanded.map((sep, si) => {
                  // posX: cm depuis l'intérieur gauche → fallback distribution équirépartie
                  const sxCm = typeof sep.posX === 'number'
                    ? sep.posX
                    : (innerWcm * (si + 1)) / (sepExpanded.length + 1);
                  const sx = bx + tw + sxCm * scale - tw / 2;
                  // posY : hauteur du bas du séparateur ; length = hauteur réelle
                  const sepLen = sep.length * scale;
                  const sepBaseY = typeof sep.posY === 'number' ? sep.posY : (maxH - sep.length) / 2;
                  const sepY = M + bh - sepBaseY * scale - sepLen;
                  return (
                    <g key={`sep${si}`}>
                      <rect x={sx} y={sepY} width={tw} height={sepLen}
                        fill={PIECE_COLORS.separateur} opacity=".25"
                        stroke={PIECE_COLORS.separateur} strokeWidth="0.5" />
                      {(typeof sep.posX === 'number' || typeof sep.posY === 'number') && (
                        <text x={sx + tw / 2} y={sepY - 2}
                          textAnchor="middle" fill={PIECE_COLORS.separateur} fontSize="6" fontFamily="system-ui" opacity=".9">
                          {typeof sep.posX === 'number' ? `X=${sep.posX}` : ''}
                        </text>
                      )}
                    </g>
                  );
                });
              })()}

              {/* Portes (hatched rectangle) */}
              {portes.map((_p, pi) => {
                const doorW = (bw - 2 * tw) / portes.length;
                const doorX = bx + tw + pi * doorW;
                return (
                  <g key={`p${pi}`}>
                    <rect x={doorX + 2} y={M + 2} width={doorW - 4} height={bh - 4}
                      fill="none" stroke={PIECE_COLORS.porte} strokeWidth="1" strokeDasharray="8,4" opacity=".5" rx="2" />
                    {/* Door handle */}
                    <circle cx={doorX + doorW - 12} cy={M + bh / 2} r="2" fill={PIECE_COLORS.porte} opacity=".4" />
                  </g>
                );
              })}

              {/* Bandeaux — utilisent posY si défini, sinon affichés en haut hors caisson */}
              {bandExpanded.map((bd, bi2) => {
                const bdH = bd.width * scale; // bd.width = hauteur du bandeau
                if (typeof bd.posY === 'number') {
                  // posY = hauteur du bas du bandeau
                  const yTop = M + bh - bd.posY * scale - bdH;
                  return (
                    <rect key={`bd${bi2}`} x={bx} y={yTop} width={bw} height={bdH}
                      fill={PIECE_COLORS.bandeau} opacity=".25"
                      stroke={PIECE_COLORS.bandeau} strokeWidth="0.5" />
                  );
                }
                return (
                  <rect key={`bd${bi2}`} x={bx} y={M - bdH} width={bw} height={bdH}
                    fill={PIECE_COLORS.bandeau} opacity=".15"
                    stroke={PIECE_COLORS.bandeau} strokeWidth="0.5" />
                );
              })}

              {/* Dimensions */}
              {/* Width */}
              <DimLine x1={bx} y1={M + bh} x2={bx + bw} y2={M + bh} label={`${b.width}`} offset={18} />
              {/* Inner width (sharing-aware) */}
              {(() => {
                const realBi = state.bodies.findIndex(bb => bb.id === b.id);
                const shared = state.sharedBoundaries ?? [];
                const sl = isSharedLeft(realBi, shared);
                const iw = getBodyInnerWidth(b.width, realBi, state.bodies.length, shared, th);
                const x1 = sl ? bx : bx + tw;
                return (
                  <DimLine x1={x1} y1={M + bh} x2={bx + bw - tw} y2={M + bh}
                    label={`${iw}`} offset={32} color={sl ? "#3b82f6" : "#9A968F"} fontSize={7} />
                );
              })()}

              {/* Label */}
              <text x={bx + bw / 2} y={M - 8} textAnchor="middle" fill={color} fontSize="9" fontWeight="600" fontFamily="system-ui">{b.name}</text>
            </g>
          );
        })}

        {/* Height dimension (left side) */}
        <DimLine x1={M - 5} y1={M} x2={M - 5} y2={M + maxH * scale} label={`${maxH}`} offset={-30} />

        {/* Thickness annotation */}
        <text x={SVG_W - M + 5} y={M + 15} fill="#9A968F" fontSize="7" fontFamily="system-ui">ép. {th * 10} mm</text>
      </svg>
    );
  };

  // --- TOP VIEW ---
  const renderTop = () => {
    const scale = Math.min((SVG_W - M * 2 - 40) / Math.max(totalW, 1), (300 - M * 2) / maxDepth);
    const svgH = M * 2 + maxDepth * scale + 30;
    let offX = M;

    return (
      <svg width={SVG_W} height={svgH} viewBox={`0 0 ${SVG_W} ${svgH}`} className="rounded-lg">
        <rect width={SVG_W} height={svgH} fill="#FFFCF7" rx="8" />
        {/* Wall line */}
        <line x1={M - 10} y1={M} x2={SVG_W - M + 10} y2={M} stroke="#EFE8DD" strokeWidth="1.5" />
        <text x={M - 10} y={M - 5} fill="#9A968F" fontSize="7" fontFamily="system-ui">MUR</text>

        {bodies.map((b, bi) => {
          const bx = offX;
          const bw = b.width * scale;
          const bd = b.depth * scale;
          const tw = th * scale;
          const color = BODY_COLORS[bi % BODY_COLORS.length];
          offX += bw + 8;

          return (
            <g key={b.id}>
              {/* Body outline */}
              <rect x={bx} y={M} width={bw} height={bd} fill="none" stroke={color} strokeWidth="1" opacity=".4" rx="1" />
              {/* Left joue */}
              <rect x={bx} y={M} width={tw} height={bd} fill={PIECE_COLORS.joue} opacity=".15" stroke={PIECE_COLORS.joue} strokeWidth="0.5" />
              {/* Right joue */}
              <rect x={bx + bw - tw} y={M} width={tw} height={bd} fill={PIECE_COLORS.joue} opacity=".15" stroke={PIECE_COLORS.joue} strokeWidth="0.5" />
              {/* Back panel */}
              <rect x={bx + tw} y={M} width={bw - 2 * tw} height={tw / 3} fill={PIECE_COLORS.fond} opacity=".3" stroke={PIECE_COLORS.fond} strokeWidth="0.3" />

              {/* Width dim */}
              <DimLine x1={bx} y1={M + bd} x2={bx + bw} y2={M + bd} label={`${b.width}`} offset={15} />
              {/* Depth dim */}
              {bi === 0 && (
                <DimLine x1={bx} y1={M} x2={bx} y2={M + bd} label={`${b.depth}`} offset={-25} />
              )}

              <text x={bx + bw / 2} y={M + bd / 2 + 3} textAnchor="middle" fill={color} fontSize="8" fontWeight="500" fontFamily="system-ui">{b.name}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  // --- SIDE VIEW ---
  const renderSide = () => {
    const body = bodies[0];
    if (!body) return <p className="text-[#9A968F] text-sm text-center py-8">Aucun corps à afficher</p>;

    const depth = body.depth;
    const height = maxH;
    const scale = Math.min((SVG_W - M * 2 - 40) / depth, (400 - M * 2) / height);
    const svgH = M * 2 + height * scale + 30;
    const bx = M + 30;
    const bd = depth * scale;
    const bh = height * scale;
    const tw = th * scale;

    const fixedTab = body.pieces.filter(p => p.type === 'tablette-fixe');
    const fixedExpanded = fixedTab.flatMap(p => Array.from({ length: p.qty }, () => p));
    const fixedPositions: number[] = fixedExpanded.map((p, i) => {
      if (typeof p.posY === 'number') return p.posY;
      if (fixedExpanded.length === 1) return height - 2;
      if (i === 0) return height - 2;
      if (i === 1) return 2;
      return (height * (i - 1)) / (fixedExpanded.length - 1);
    });

    return (
      <svg width={SVG_W} height={svgH} viewBox={`0 0 ${SVG_W} ${svgH}`} className="rounded-lg">
        <rect width={SVG_W} height={svgH} fill="#FFFCF7" rx="8" />
        {/* Wall */}
        <line x1={bx} y1={M - 5} x2={bx} y2={M + bh + 5} stroke="#EFE8DD" strokeWidth="1.5" />
        <text x={bx - 5} y={M - 8} textAnchor="end" fill="#9A968F" fontSize="7" fontFamily="system-ui">MUR</text>

        {/* Side joue */}
        <rect x={bx} y={M} width={bd} height={bh} fill={PIECE_COLORS.joue} opacity=".08" stroke={PIECE_COLORS.joue} strokeWidth="1" rx="1" />

        {/* Back panel */}
        <rect x={bx} y={M} width={tw / 3} height={bh} fill={PIECE_COLORS.fond} opacity=".3" stroke={PIECE_COLORS.fond} strokeWidth="0.5" />

        {/* Fixed shelves (side view = lines) */}
        {fixedPositions.map((h, fi) => (
          <rect key={fi} x={bx} y={M + bh - h * scale - tw / 2} width={bd} height={tw}
            fill={PIECE_COLORS['tablette-fixe']} opacity=".2"
            stroke={PIECE_COLORS['tablette-fixe']} strokeWidth="0.5" />
        ))}

        {/* Plinthe cutout */}
        {state.project.plinthHeight > 0 && (
          <rect x={bx} y={M + bh - state.project.plinthHeight * scale}
            width={state.project.plinthDepth * scale} height={state.project.plinthHeight * scale}
            fill="#FFFCF7" stroke="#9A968F" strokeWidth="0.5" strokeDasharray="2,2" />
        )}

        {/* Height dim */}
        <DimLine x1={bx + bd} y1={M} x2={bx + bd} y2={M + bh} label={`${height}`} offset={20} />
        {/* Depth dim */}
        <DimLine x1={bx} y1={M + bh} x2={bx + bd} y2={M + bh} label={`${depth}`} offset={18} />
        {/* Thickness annotation */}
        <text x={bx + bd / 2} y={M - 8} textAnchor="middle" fill="#9A968F" fontSize="8" fontFamily="system-ui" fontWeight="500">{body.name} — vue de côté</text>
      </svg>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Tip text="Plans 2D cotés de votre meuble. Vue de face, vue de dessus et vue de côté avec toutes les dimensions en cm.">
          <span className="text-sm text-[#54514E]">{mat.short} {th * 10} mm — Plans cotés</span>
        </Tip>
        <div className="flex gap-1">
          {(['face', 'dessus', 'cote'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v ? 'bg-[#3B5FFF] text-white' : 'bg-white text-[#54514E] border border-[#EFE8DD] hover:bg-[#FFFCF7]'
              }`}>
              {v === 'face' ? 'Face' : v === 'dessus' ? 'Dessus' : 'Côté'}
            </button>
          ))}
        </div>
      </div>

      {/* Body filter */}
      {state.bodies.length > 1 && (
        <div className="flex gap-1 mb-3 overflow-x-auto hide-scrollbar">
          <button onClick={() => setSelectedBody(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
              !selectedBody ? 'bg-[#E5EAFF] text-[#3B5FFF] border border-[#3B5FFF]' : 'bg-white text-[#9A968F] border border-[#EFE8DD]'
            }`}>Tous</button>
          {state.bodies.map((b, i) => (
            <button key={b.id} onClick={() => setSelectedBody(b.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                selectedBody === b.id ? 'bg-[#E5EAFF] text-[#3B5FFF] border border-[#3B5FFF]' : 'bg-white text-[#9A968F] border border-[#EFE8DD]'
              }`}>
              <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: BODY_COLORS[i % BODY_COLORS.length] }} />
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div className={cardClass}>
        <div className="overflow-x-auto">
          {view === 'face' && renderFace()}
          {view === 'dessus' && renderTop()}
          {view === 'cote' && renderSide()}
        </div>
      </div>

      {/* Legend */}
      <div className={cardClass}>
        <h4 className="text-xs font-semibold text-[#54514E] mb-2">Légende</h4>
        <div className="flex flex-wrap gap-3 text-xs text-[#54514E]">
          {[
            { type: 'joue', label: 'Joue (montant)' },
            { type: 'tablette-fixe', label: 'Tablette fixe' },
            { type: 'tablette-reglable', label: 'Tablette réglable' },
            { type: 'separateur', label: 'Séparateur' },
            { type: 'porte', label: 'Porte' },
            { type: 'bandeau', label: 'Bandeau' },
            { type: 'fond', label: 'Fond/Dos' },
          ].map(({ type, label }) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm border" style={{
                backgroundColor: PIECE_COLORS[type as keyof typeof PIECE_COLORS] + '30',
                borderColor: PIECE_COLORS[type as keyof typeof PIECE_COLORS],
              }} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-3 h-0 border-t border-dashed border-[#9A968F]" />
            Réglable
          </span>
        </div>
        <p className="text-[10px] text-[#9A968F] mt-2">Toutes les dimensions en cm. Plan non contractuel — vérifier sur chantier.</p>
      </div>
    </div>
  );
}
