import { useState } from 'react';
import type { AppState, Body, DoorConfig, DoorPoseType, DoorPosition, PieceType } from '../../types';
import { MATERIALS } from '../../data/materials';
import {
  uid,
  calculateDoor,
  getBodyInnerWidth,
  getBodyEffectiveHeight,
  getDoorInfoFromPieces,
} from '../../lib/helpers';
import { resolveDoorCoverage } from '../../lib/domain';
import Tip from '../Tip';
import TIPS from '../../data/tips';

interface Props {
  body: Body;
  bodyIndex: number;
  state: AppState;
  onChange: (state: AppState) => void;
}

const POSITION_LABEL: Record<DoorPosition, string> = {
  pleine: 'pleine hauteur',
  bas: 'en bas',
  haut: 'en haut',
};

export default function DoorConfigurator({ body, bodyIndex, state, onChange }: Props) {
  const { ceilingHeight, plinthHeight } = state.project;
  const thickness = state.panel.thickness;
  const shared = state.sharedBoundaries ?? [];
  const innerW = getBodyInnerWidth(body.width, bodyIndex, state.bodies.length, shared, thickness);

  const config = body.doorConfig;
  const [expanded, setExpanded] = useState(false);

  const applyDoors = (newConfig: DoorConfig | undefined) => {
    onChange({
      ...state,
      bodies: state.bodies.map((b) => {
        if (b.id !== body.id) return b;
        const piecesWithoutDoors = b.pieces.filter((p) => p.type !== 'porte');

        if (!newConfig) {
          return { ...b, doorConfig: undefined, pieces: piecesWithoutDoors };
        }

        const bH = getBodyEffectiveHeight(b, ceilingHeight, plinthHeight);
        const { coverageHeight, splitPosY } = resolveDoorCoverage(b, bH, thickness, newConfig);
        const finalConfig: DoorConfig = { ...newConfig, splitPosY };
        const dims = calculateDoor(b.width, bH, thickness, finalConfig.count, finalConfig.poseType, innerW, coverageHeight);
        const doorPieces = Array.from({ length: finalConfig.count }, (_, i) => ({
          id: uid(),
          name: finalConfig.count === 1 ? `Porte ${b.name}` : `Porte ${i === 0 ? 'G' : 'D'} ${b.name}`,
          length: dims.doorHeight,
          width: dims.doorWidth,
          qty: 1,
          type: 'porte' as PieceType,
        }));

        return {
          ...b,
          doorConfig: finalConfig,
          pieces: [...piecesWithoutDoors, ...doorPieces],
        };
      }),
    });
  };

  // Read REAL door piece dimensions instead of recomputing.
  const mat = MATERIALS[state.materialKey];
  const doorInfo = getDoorInfoFromPieces(body, thickness, mat.density);

  // ---- No doors yet: simple add button ----
  if (!config) {
    return (
      <div className="mt-3 pt-3 border-t border-[#EFE8DD]">
        <button
          onClick={() => { applyDoors({ count: 1, poseType: 'enveloppante', position: 'pleine' }); setExpanded(true); }}
          className="text-xs text-[#3B5FFF] hover:text-[#1E3FCC] font-medium transition-colors"
        >
          + Ajouter des portes
        </button>
      </div>
    );
  }

  const position: DoorPosition = config.position ?? 'pleine';

  // ---- Collapsed view: compact summary ----
  if (!expanded) {
    return (
      <div className="mt-3 pt-3 border-t border-[#EFE8DD]">
        <div className="flex items-center justify-between gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap text-xs text-orange-800 min-w-0">
            <span className="font-semibold">🚪 {config.count} porte{config.count > 1 ? 's' : ''}</span>
            <span className="text-orange-700">{POSITION_LABEL[position]}</span>
            {doorInfo && (
              <span className="font-mono text-orange-700">
                {doorInfo.doorWidth}×{doorInfo.doorHeight} cm
              </span>
            )}
            {doorInfo && (
              <span className="text-[10px] text-orange-600">
                · {doorInfo.hingeCount} charn./porte
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setExpanded(true)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors font-medium"
            >
              Modifier
            </button>
            <button
              onClick={() => applyDoors(undefined)}
              className="text-[10px] text-[#9A968F] hover:text-[#FF6B4A] transition-colors px-1"
              title="Retirer les portes"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Expanded view: full edit ----
  const fixedTablettes = body.pieces
    .filter((p) => p.type === 'tablette-fixe' && typeof p.posY === 'number')
    .sort((a, b) => (a.posY ?? 0) - (b.posY ?? 0));

  return (
    <div className="mt-3 pt-3 border-t border-[#EFE8DD]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#3B5FFF] uppercase tracking-wider">Portes</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(false)}
            className="text-[10px] text-[#54514E] hover:text-[#0E0D0C] transition-colors"
          >
            Replier
          </button>
          <button
            onClick={() => applyDoors(undefined)}
            className="text-[10px] text-[#9A968F] hover:text-[#FF6B4A] transition-colors"
          >
            Retirer les portes
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => applyDoors({ ...config, count: 1 })}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${config.count === 1 ? 'bg-[#E5EAFF] border-[#3B5FFF] text-[#3B5FFF] font-semibold' : 'bg-white border-[#EFE8DD] text-[#54514E] hover:border-[#3B5FFF]'}`}
        >
          1 porte
        </button>
        <button
          onClick={() => applyDoors({ ...config, count: 2 })}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${config.count === 2 ? 'bg-[#E5EAFF] border-[#3B5FFF] text-[#3B5FFF] font-semibold' : 'bg-white border-[#EFE8DD] text-[#54514E] hover:border-[#3B5FFF]'}`}
        >
          2 portes
        </button>
      </div>

      <div className="mb-2">
        <label className="text-[10px] text-[#54514E] mb-1 block">Type de pose</label>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: 'enveloppante' as DoorPoseType, label: 'Enveloppante', hint: 'recouvre la joue' },
            { key: 'demi-recouvrement' as DoorPoseType, label: 'Demi-recouv.', hint: '2 portes / 1 joue' },
            { key: 'affleurante' as DoorPoseType, label: 'Affleurante', hint: 'dans le cadre' },
          ]).map((pose) => (
            <Tip key={pose.key} text={TIPS[`porte-pose-${pose.key}`] || `${pose.label} : la porte ${pose.hint}`}>
              <button
                onClick={() => applyDoors({ ...config, poseType: pose.key })}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${config.poseType === pose.key ? 'bg-orange-100 border-orange-300 text-orange-800 font-semibold' : 'bg-white border-[#EFE8DD] text-[#54514E] hover:border-orange-200'}`}
              >
                {pose.label}
              </button>
            </Tip>
          ))}
        </div>
      </div>

      {/* Couverture verticale */}
      <div className="mb-2">
        <label className="text-[10px] text-[#54514E] mb-1 block">Couverture verticale</label>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: 'pleine' as DoorPosition, label: 'Pleine hauteur', hint: 'toute la hauteur du corps' },
            { key: 'bas' as DoorPosition, label: 'En bas', hint: 'sous une tablette fixe' },
            { key: 'haut' as DoorPosition, label: 'En haut', hint: 'au-dessus d\'une tablette fixe' },
          ]).map((pos) => (
            <Tip key={pos.key} text={`${pos.label} : ${pos.hint}`}>
              <button
                onClick={() => applyDoors({ ...config, position: pos.key })}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${position === pos.key ? 'bg-[#E5EAFF] border-[#3B5FFF] text-[#3B5FFF] font-semibold' : 'bg-white border-[#EFE8DD] text-[#54514E] hover:border-[#3B5FFF]'}`}
              >
                {pos.label}
              </button>
            </Tip>
          ))}
        </div>
        {position !== 'pleine' && (
          <div className="mt-2 text-[11px] bg-[#FFFCF7] border border-[#EFE8DD] rounded-lg px-2.5 py-2">
            {fixedTablettes.length === 0 ? (
              <div className="text-[#3B5FFF]">
                ⚠ Aucune tablette fixe positionnée — la séparation est calée automatiquement sur une hauteur de portes standard.
                Ajoute une tablette fixe avec une hauteur (posY) pour forcer une séparation précise.
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#54514E]">Plan de séparation :</span>
                <select
                  value={config.splitPosY ?? ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    applyDoors({ ...config, splitPosY: isNaN(v) ? undefined : v });
                  }}
                  className="text-[11px] px-2 py-1 rounded border border-[#EFE8DD] bg-white text-[#0E0D0C]"
                >
                  {fixedTablettes.map((t) => (
                    <option key={t.id} value={t.posY}>
                      {t.name} — H = {t.posY} cm
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {doorInfo && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800 space-y-1">
          <div className="font-semibold">{config.count} porte{config.count > 1 ? 's' : ''} — {doorInfo.poseLabel} — {POSITION_LABEL[position]}</div>
          <div>Dimensions : <span className="font-mono font-semibold">{doorInfo.doorWidth} × {doorInfo.doorHeight}</span> cm — <span className="font-mono">{doorInfo.doorWeightKg} kg</span>/porte</div>
          <div>
            <span className="font-semibold">{doorInfo.hingeCount} charnières</span> Ø35 par porte
            {config.count === 2 && <span className="text-orange-600"> ({doorInfo.hingeCount * 2} au total)</span>}
          </div>
          <div className="text-[10px] text-orange-600">
            Positions : {doorInfo.hingePositions.map((p) => `${p} mm`).join(' · ')} depuis le bas
          </div>
          <div className="text-[10px] text-orange-600 mt-1">
            Perçage cuvette Ø35 mm, profondeur 12-13 mm, centre à 21-22 mm du chant
          </div>
        </div>
      )}
    </div>
  );
}
