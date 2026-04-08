import type { AppState, PanelDef, Piece } from '../../types';
import { PIECE_COLORS, PIECE_TYPES } from '../../data/materials';
import { parseNumber, clampInt } from '../../lib/helpers';
import { getPanelForPiece } from '../../lib/domain';
import Tip from '../Tip';
import TIPS from '../../data/tips';
import { pieceTypeLabel } from './Glossary';
import { inputClass } from './styles';

interface Props {
  piece: Piece;
  state: AppState;
  allPanelDefs: PanelDef[];
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (key: string, value: string | number) => void;
  onRemove: () => void;
}

export default function PieceEditor({
  piece: p,
  state,
  allPanelDefs,
  editing,
  onStartEdit,
  onStopEdit,
  onUpdate,
  onRemove,
}: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
      <Tip text={TIPS[`piece-${p.type}`] || ''}>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 cursor-help"
          style={{ backgroundColor: PIECE_COLORS[p.type] || PIECE_COLORS.autre }}
        />
      </Tip>
      {editing ? (
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="grid grid-cols-5 gap-1.5 items-center">
            <input
              className={inputClass + " col-span-2 !py-1"}
              value={p.name}
              onChange={(e) => onUpdate('name', e.target.value)}
            />
            <input
              type="number"
              step="0.1"
              min={1}
              className={inputClass + " !py-1"}
              value={p.length}
              onChange={(e) => onUpdate('length', parseNumber(e.target.value, p.length, 1))}
            />
            <input
              type="number"
              step="0.1"
              min={1}
              className={inputClass + " !py-1"}
              value={p.width}
              onChange={(e) => onUpdate('width', parseNumber(e.target.value, p.width, 1))}
            />
            <div className="flex gap-1 flex-wrap">
              <input
                type="number"
                min={1}
                max={99}
                className={inputClass + " !py-1 w-12"}
                value={p.qty}
                onChange={(e) => onUpdate('qty', clampInt(e.target.value, p.qty, 1, 99))}
              />
              <input
                type="number"
                step="1"
                min={1}
                className={inputClass + " !py-1 w-16" + (p.thickness !== undefined ? " !border-amber-400 !bg-amber-50" : "")}
                value={Math.round((p.thickness ?? getPanelForPiece(p.panelId, state).thickness) * 10)}
                onChange={(e) => {
                  const mm = parseNumber(e.target.value, Math.round((p.thickness ?? getPanelForPiece(p.panelId, state).thickness) * 10), 1);
                  const cm = mm / 10;
                  const panelThickness = getPanelForPiece(p.panelId, state).thickness;
                  // If value matches panel thickness, clear override
                  onUpdate('thickness', Math.abs(cm - panelThickness) < 0.001 ? '' : cm);
                }}
                title="Epaisseur (mm)"
                placeholder="ep."
              />
              <select
                className={inputClass + " !py-1 text-xs"}
                value={p.type}
                onChange={(e) => onUpdate('type', e.target.value)}
              >
                {PIECE_TYPES.map((t) => (
                  <option key={t} value={t}>{pieceTypeLabel(t)}</option>
                ))}
              </select>
              {allPanelDefs.length > 1 && (
                <select
                  className={inputClass + " !py-1 text-[10px]"}
                  value={p.panelId ?? 'default'}
                  onChange={(e) => onUpdate('panelId', e.target.value === 'default' ? '' : e.target.value)}
                  title="Panneau pour cette pièce"
                >
                  {allPanelDefs.map((pd) => (
                    <option key={pd.id} value={pd.id}>{pd.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Position row : displayed only for piece types where it's meaningful */}
          {(p.type === 'tablette-fixe' || p.type === 'tablette-reglable' || p.type === 'bandeau' || p.type === 'separateur') && (
            <div className="flex items-center gap-2 text-[11px] text-stone-500 px-1">
              <Tip text="Hauteur (cm) du dessous de la pièce, mesurée depuis le sol intérieur du corps (haut de la plinthe).">
                <span>Hauteur :</span>
              </Tip>
              <input
                type="number"
                step="0.5"
                min={0}
                className={inputClass + " !py-1 !text-[11px] w-20"}
                value={p.posY ?? ''}
                placeholder="auto"
                onChange={(e) => {
                  const v = e.target.value.replace(',', '.');
                  if (v === '') {
                    onUpdate('posY', '');
                  } else {
                    const n = parseNumber(v, 0, 0);
                    onUpdate('posY', n);
                  }
                }}
                title="Hauteur depuis le sol intérieur (cm)"
              />
              <span className="text-stone-400">cm</span>
              {p.type === 'separateur' && (
                <>
                  <Tip text="Distance horizontale (cm) du bord intérieur gauche du corps au bord gauche du séparateur.">
                    <span className="ml-2">Position X :</span>
                  </Tip>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    className={inputClass + " !py-1 !text-[11px] w-20"}
                    value={p.posX ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '') {
                        onUpdate('posX', '');
                      } else {
                        const n = parseNumber(v, 0, 0);
                        onUpdate('posX', n);
                      }
                    }}
                    title="Position horizontale depuis l'intérieur gauche (cm)"
                  />
                  <span className="text-stone-400">cm</span>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex-1 min-w-0 flex justify-between cursor-pointer hover:text-amber-700 transition-colors"
          onClick={onStartEdit}
        >
          <span className="truncate">
            {p.name}
            <span className="text-[10px] text-stone-400 ml-1.5">{pieceTypeLabel(p.type)}</span>
            {p.panelId && p.panelId !== 'default' && (
              <span className="text-[9px] bg-sky-50 text-sky-600 border border-sky-200 rounded px-1 py-0 ml-1">
                {allPanelDefs.find((pd) => pd.id === p.panelId)?.label ?? p.panelId}
              </span>
            )}
          </span>
          <span className="text-stone-500 text-xs font-mono ml-2 flex-shrink-0">
            {p.length}×{p.width} ×{p.qty}
            <span className={`ml-1 ${p.thickness !== undefined ? 'text-amber-600 font-semibold' : 'text-stone-400'}`} title="Epaisseur">
              ep.{Math.round((p.thickness ?? getPanelForPiece(p.panelId, state).thickness) * 10)}
            </span>
            {(p.posY !== undefined || p.posX !== undefined) && (
              <span className="ml-1 text-sky-600" title="Position depuis le sol intérieur">
                {p.posY !== undefined && `H=${p.posY}`}
                {p.posX !== undefined && (p.posY !== undefined ? ` X=${p.posX}` : `X=${p.posX}`)}
              </span>
            )}
          </span>
        </div>
      )}
      {editing && (
        <button
          onClick={onStopEdit}
          className="text-xs text-emerald-600 hover:text-emerald-800 flex-shrink-0 transition-colors font-bold"
          title="Valider"
        >
          ✓
        </button>
      )}
      <button
        onClick={onRemove}
        className="text-xs text-stone-400 hover:text-red-500 flex-shrink-0 transition-colors"
        title="Supprimer cette pièce"
      >
        ✕
      </button>
    </div>
  );
}
