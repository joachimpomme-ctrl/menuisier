import type { AppState } from '../types';
import { MATERIALS, BODY_COLORS } from '../data/materials';
import { isSharedLeft, getDoorInfoFromPieces, getUsableHeight } from '../lib/helpers';
import Tip from './Tip';
import TIPS from '../data/tips';

interface Props {
  state: AppState;
}

const cardClass = "rounded-2xl border border-stone-200 bg-white  p-4 mb-4";

export default function MontageTab({ state }: Props) {
  const mat = MATERIALS[state.materialKey];
  const usableHeight = getUsableHeight(state.project.ceilingHeight, state.project.plinthHeight);
  const thickness = state.panel.thickness;
  const shared = state.sharedBoundaries ?? [];

  const SVG_WIDTH = 580;
  const MARGIN = 50;
  const totalBodyWidth = state.bodies.reduce((s, b) => s + b.width, 0);
  const gapCount = Math.max(state.bodies.length - 1, 0);
  const scale = (SVG_WIDTH - 2 * MARGIN - 20 * gapCount) / Math.max(totalBodyWidth, 1);
  const svgHeight = MARGIN * 2 + usableHeight * scale;

  let offsetX = MARGIN;
  const offsets = state.bodies.map((b) => {
    const x = offsetX;
    // eslint-disable-next-line react-hooks/immutability -- accumulateur local modifié dans .map, remplacer par reduce nuit à la lisibilité
    offsetX += b.width * scale + 20;
    return x;
  });

  // Hinge total — basé sur les pièces porte réelles
  const hingeTotal = state.bodies.reduce((sum, b) => {
    const info = getDoorInfoFromPieces(b, thickness, mat.density);
    if (!info) return sum;
    return sum + info.hingeCount * info.count;
  }, 0);

  return (
    <div>
      <div className="text-sm text-stone-500 mb-4">
        <Tip text={TIPS['elevation']}>
          <span>Élévation frontale — {mat.short} {thickness * 10} mm</span>
        </Tip>
      </div>

      <div className={cardClass}>
        <div className="overflow-x-auto">
          <svg
            width={SVG_WIDTH}
            height={Math.min(svgHeight, 700)}
            viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
            className="rounded-lg"
          >
            <rect width={SVG_WIDTH} height={svgHeight} fill="#f5f0eb" rx="8" />
            {/* Floor line */}
            <line
              x1={MARGIN - 10} y1={MARGIN + usableHeight * scale}
              x2={SVG_WIDTH - MARGIN + 10} y2={MARGIN + usableHeight * scale}
              stroke="#a8a29e" strokeWidth="1" strokeDasharray="6,3"
            />

            {state.bodies.map((b, bi) => {
              const bx = offsets[bi];
              const bw = b.width * scale;
              const bh = usableHeight * scale;
              const tw = thickness * scale;
              const color = BODY_COLORS[bi % BODY_COLORS.length];

              const sl = isSharedLeft(bi, shared);
              const sr = bi < state.bodies.length - 1 && (shared[bi] ?? false);

              const adjustableCount = b.pieces
                .filter((p) => p.type === "tablette-reglable")
                .reduce((s, p) => s + p.qty, 0);
              const fixedCount = b.pieces
                .filter((p) => p.type === "tablette-fixe")
                .reduce((s, p) => s + p.qty, 0);
              const fixedPositions = [180, usableHeight - 45].slice(0, fixedCount);

              // Door info — lire les pièces porte réelles
              const doorInfo = getDoorInfoFromPieces(b, thickness, mat.density);

              return (
                <g key={b.id}>
                  {/* Body outline */}
                  <rect x={bx} y={MARGIN} width={bw} height={bh} fill="none" stroke={color} strokeWidth="1.5" opacity=".4" rx="2" />

                  {/* Left joue — only if NOT shared */}
                  {!sl && (
                    <rect x={bx} y={MARGIN} width={tw} height={bh} fill={color} opacity=".25" rx="1" />
                  )}

                  {/* Right joue */}
                  <rect x={bx + bw - tw} y={MARGIN} width={tw} height={bh} fill={color} opacity={sr ? '.4' : '.25'} rx="1" />

                  {/* Shared joue marker */}
                  {sr && (
                    <g>
                      <rect x={bx + bw - tw} y={MARGIN} width={tw} height={bh} fill="#3b82f6" opacity=".15" rx="1" />
                      <text
                        x={bx + bw - tw / 2}
                        y={MARGIN + bh / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#3b82f6"
                        fontSize="7"
                        fontWeight="600"
                        opacity=".6"
                        transform={`rotate(-90,${bx + bw - tw / 2},${MARGIN + bh / 2})`}
                      >
                        COMMUNE
                      </text>
                    </g>
                  )}

                  {/* Plinthe cuts */}
                  {!sl && (
                    <rect x={bx} y={MARGIN + bh - state.project.plinthHeight * scale} width={tw} height={state.project.plinthHeight * scale} fill="#f5f0eb" stroke="#a8a29e" strokeWidth=".5" />
                  )}
                  <rect x={bx + bw - tw} y={MARGIN + bh - state.project.plinthHeight * scale} width={tw} height={state.project.plinthHeight * scale} fill="#f5f0eb" stroke="#a8a29e" strokeWidth=".5" />

                  {/* Fixed shelves */}
                  {fixedPositions.map((h, fi) => {
                    const shelfX = sl ? bx : bx + tw;
                    const shelfW = bw - tw - (sl ? 0 : tw);
                    return (
                      <rect key={fi} x={shelfX} y={MARGIN + bh - h * scale - tw / 2} width={shelfW} height={tw} fill="#10b981" opacity=".45" rx="1" />
                    );
                  })}

                  {/* Joint line */}
                  <line x1={bx} y1={MARGIN + bh - 180 * scale} x2={bx + bw} y2={MARGIN + bh - 180 * scale} stroke="#f59e0b" strokeWidth=".5" strokeDasharray="2,4" opacity=".4" />

                  {/* Adjustable shelves */}
                  {Array.from({ length: adjustableCount }, (_, ri) => {
                    const shelfY = 30 + (ri + 1) * (140 / (adjustableCount + 1));
                    const sx = sl ? bx + 2 : bx + tw + 2;
                    const ex = bx + bw - tw - 2;
                    return (
                      <line key={ri} x1={sx} y1={MARGIN + bh - shelfY * scale} x2={ex} y2={MARGIN + bh - shelfY * scale} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4,3" opacity=".5" />
                    );
                  })}

                  {/* ===== DOORS ===== */}
                  {doorInfo && (() => {
                    const dh = doorInfo.doorHeight * scale;
                    const pos = b.doorConfig?.position ?? 'bas';
                    const doorTopY = pos === 'haut' ? MARGIN : MARGIN + bh - dh;
                    const DOOR_INSET = 3;

                    if (doorInfo.count === 1) {
                      const dx = bx + DOOR_INSET;
                      const dw = bw - DOOR_INSET * 2;
                      return (
                        <g>
                          <rect x={dx} y={doorTopY} width={dw} height={dh} fill="#f97316" opacity=".12" stroke="#f97316" strokeWidth="1.5" rx="2" strokeDasharray="6,3" />
                          {doorInfo.hingePositions.map((posMm, hi) => {
                            const hingeY = doorTopY + dh - (posMm / 10) * scale;
                            return (
                              <g key={hi}>
                                <circle cx={dx + 8} cy={hingeY} r={3} fill="#f97316" opacity=".7" />
                                <line x1={dx} y1={hingeY} x2={dx + 16} y2={hingeY} stroke="#f97316" strokeWidth="1" opacity=".5" />
                              </g>
                            );
                          })}
                          <text x={dx + dw / 2} y={doorTopY + dh / 2} textAnchor="middle" dominantBaseline="central" fill="#ea580c" fontSize="8" fontWeight="600" opacity=".7">PORTE</text>
                        </g>
                      );
                    } else {
                      const gap = 2 * scale / 10;
                      const dw = (bw - DOOR_INSET * 2 - gap) / 2;
                      return (
                        <g>
                          <rect x={bx + DOOR_INSET} y={doorTopY} width={dw} height={dh} fill="#f97316" opacity=".12" stroke="#f97316" strokeWidth="1.5" rx="2" strokeDasharray="6,3" />
                          {doorInfo.hingePositions.map((posMm, hi) => {
                            const hingeY = doorTopY + dh - (posMm / 10) * scale;
                            return <circle key={hi} cx={bx + DOOR_INSET + 8} cy={hingeY} r={3} fill="#f97316" opacity=".7" />;
                          })}
                          <text x={bx + DOOR_INSET + dw / 2} y={doorTopY + dh / 2} textAnchor="middle" dominantBaseline="central" fill="#ea580c" fontSize="7" fontWeight="600" opacity=".7">PORTE G</text>

                          <rect x={bx + DOOR_INSET + dw + gap} y={doorTopY} width={dw} height={dh} fill="#f97316" opacity=".12" stroke="#f97316" strokeWidth="1.5" rx="2" strokeDasharray="6,3" />
                          {doorInfo.hingePositions.map((posMm, hi) => {
                            const hingeY = doorTopY + dh - (posMm / 10) * scale;
                            return <circle key={hi} cx={bx + DOOR_INSET + dw + gap + dw - 8} cy={hingeY} r={3} fill="#f97316" opacity=".7" />;
                          })}
                          <text x={bx + DOOR_INSET + dw + gap + dw / 2} y={doorTopY + dh / 2} textAnchor="middle" dominantBaseline="central" fill="#ea580c" fontSize="7" fontWeight="600" opacity=".7">PORTE D</text>
                        </g>
                      );
                    }
                  })()}

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

      {/* ===== Quincaillerie summary ===== */}
      {(() => {
        const mk = state.materialKey;
        const bodyCount = state.bodies.length;

        // Vis: 8 per fixed shelf + 3 per body (wall fixation)
        const totalFixedShelves = state.bodies.reduce(
          (s, b) => s + b.pieces.filter((p) => p.type === 'tablette-fixe').reduce((acc, p) => acc + p.qty, 0),
          0,
        );
        const visCount = totalFixedShelves * 8 + bodyCount * 3;

        // Taquets: 4 per adjustable shelf (2 per side x 2 sides)
        const totalAdjustableShelves = state.bodies.reduce(
          (s, b) => s + b.pieces.filter((p) => p.type === 'tablette-reglable').reduce((acc, p) => acc + p.qty, 0),
          0,
        );
        const taquetCount = totalAdjustableShelves * 4;

        // Hinges
        const hingesTotal = hingeTotal;

        // Shelf support system
        const useSysteme32 = mk === 'melamine' || mk === 'osb';

        // Chevilles wall fixation: 2 per body
        const chevilleCount = bodyCount * 2;

        // Fond agrafes: perimeter of each body / 15cm
        const agrafeCount = state.bodies.reduce((s, b) => {
          const perimetre = 2 * (b.width + usableHeight);
          return s + Math.ceil(perimetre / 15);
        }, 0);

        const items: { label: string; count: number; unit: string }[] = [
          { label: 'Vis (assemblage + fixation murale)', count: visCount, unit: 'pcs' },
          { label: 'Taquets tablettes réglables', count: taquetCount, unit: 'pcs' },
        ];
        if (hingesTotal > 0) {
          items.push({ label: 'Charnières Ø35 + platines', count: hingesTotal, unit: 'pcs' });
        }
        if (useSysteme32) {
          items.push({ label: 'Perçages système 32 (taquets Ø5)', count: taquetCount > 0 ? taquetCount : 0, unit: 'rangées' });
        } else {
          const cremoCount = state.bodies.reduce((s, _b, i) => {
            const sl = i > 0 && (shared[i - 1] ?? false);
            const sr = i < state.bodies.length - 1 && (shared[i] ?? false);
            const ownJoues = 2 - (sl ? 1 : 0) - (sr ? 1 : 0);
            return s + ownJoues * 2;
          }, 0);
          items.push({ label: 'Crémaillères', count: cremoCount, unit: 'pcs' });
        }
        items.push({ label: 'Chevilles Ø8 (fixation murale)', count: chevilleCount, unit: 'pcs' });
        items.push({ label: 'Agrafes fond', count: agrafeCount, unit: 'pcs' });

        // Filler hardware: detect bodies with filler pieces
        const bodiesWithFillers = state.bodies.filter((b) =>
          b.pieces.some((p) => /filler|remplissage|tasseau plafond|bandeau haut/i.test(p.name))
        );
        if (bodiesWithFillers.length > 0) {
          // Vis plafond for tasseaux: 1 every 20cm per tasseau
          const tasseauVis = bodiesWithFillers.reduce((s, b) => {
            const tasseaux = b.pieces.filter(p => /tasseau plafond/i.test(p.name));
            return s + tasseaux.reduce((acc, t) => acc + Math.ceil(t.length / 20) * t.qty, 0);
          }, 0);
          const chevillePlafond = tasseauVis; // 1 cheville per vis
          const pointesSansTete = bodiesWithFillers.length * 12; // ~12 pointes per body for bandeau + plaquettes
          items.push({ label: 'Vis Ø4×40 (tasseaux plafond)', count: tasseauVis, unit: 'pcs' });
          items.push({ label: 'Chevilles plafond (Ø6 béton ou Molly placo)', count: chevillePlafond, unit: 'pcs' });
          items.push({ label: 'Pointes sans tête (bandeaux + plaquettes)', count: pointesSansTete, unit: 'pcs' });
        }

        return (
          <div className={cardClass}>
            <h3 className="text-amber-700 font-semibold text-xs uppercase tracking-widest mb-3">Quincaillerie - Liste d'achats</h3>
            <div className="space-y-1.5">
              {items.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-stone-50">
                  <span className="text-stone-700">{item.label}</span>
                  <span className="font-mono font-semibold text-amber-700">{item.count} <span className="text-stone-400 font-normal">{item.unit}</span></span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mt-3">Quantités estimées — prévoir 10-15 % de marge.</p>
          </div>
        );
      })()}

      {/* Hinge summary */}
      {hingeTotal > 0 && (
        <div className={cardClass}>
          <h3 className="text-amber-700 font-semibold text-xs uppercase tracking-widest mb-3">Quincaillerie portes</h3>
          <div className="space-y-2">
            {state.bodies.filter((b) => b.doorConfig).map((b) => {
              const dims = getDoorInfoFromPieces(b, thickness, mat.density);
              if (!dims) return null;
              return (
                <div key={b.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
                  <div className="font-semibold">{b.name} — {dims.count} porte{dims.count > 1 ? 's' : ''} ({dims.poseLabel})</div>
                  <div className="mt-1 space-y-0.5 text-[11px]">
                    <div>Porte : {dims.doorWidth} × {dims.doorHeight} cm</div>
                    <div>{dims.hingeCount} charnières Ø35 par porte — {dims.hingeCount * dims.count} au total</div>
                    <div>Positions (depuis le bas) : {dims.hingePositions.map((p) => `${p} mm`).join(', ')}</div>
                    <div className="text-orange-600">Perçage cuvette : Ø35 mm, prof. 12-13 mm, centre à 21-22 mm du chant</div>
                    <div className="text-orange-600">Platine sur joue : vis Ø4×16 mm, entraxe sys. 32</div>
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-stone-500 mt-2">
              Total : <span className="font-semibold text-orange-700">{hingeTotal} charnières Ø35</span> + platines de montage
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-stone-500 mt-2 px-1">
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400/30 border border-blue-400 rounded-sm inline-block"></span> Joues</span>
        {shared.some(Boolean) && (
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500/20 border border-blue-500 rounded-sm inline-block"></span> Joue commune</span>
        )}
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500/40 border border-emerald-500 rounded-sm inline-block"></span> Tabl. fixes</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-amber-500 border-dashed inline-block"></span> Tabl. réglables</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-orange-400/20 border border-orange-400 rounded-sm inline-block" style={{ borderStyle: 'dashed' }}></span> Portes</span>
        {hingeTotal > 0 && (
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full inline-block" style={{ opacity: 0.7 }}></span> Charnières</span>
        )}
      </div>
    </div>
  );
}
