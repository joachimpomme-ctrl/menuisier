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

/* Small labeled field wrapper — stacks label + input vertically */
function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="block text-[10px] font-medium text-stone-400 mb-0.5">{label}</span>
      {children}
    </div>
  );
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
  const panelThickness = getPanelForPiece(p.panelId, state).thickness;
  const thicknessMm = Math.round((p.thickness ?? panelThickness) * 10);

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <Tip text={TIPS[`piece-${p.type}`] || ''}>
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 cursor-help"
            style={{ backgroundColor: PIECE_COLORS[p.type] || PIECE_COLORS.autre }}
          />
        </Tip>

        {editing ? (
          /* ---- EDIT MODE: mobile-first stacked layout ---- */
          <div className="flex-1 min-w-0">
            {/* Row 1: Name (full width) */}
            <Field label="Nom">
              <input
                className={inputClass + " !py-1.5 !text-sm"}
                value={p.name}
                onChange={(e) => onUpdate('name', e.target.value)}
              />
            </Field>

            {/* Row 2: Dimensions — 2 cols on mobile, 4 on sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              <Field label="Longueur (cm)">
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  className={inputClass + " !py-1.5"}
                  value={p.length}
                  onChange={(e) => onUpdate('length', parseNumber(e.target.value, p.length, 1))}
                />
              </Field>
              <Field label="Largeur (cm)">
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  className={inputClass + " !py-1.5"}
                  value={p.width}
                  onChange={(e) => onUpdate('width', parseNumber(e.target.value, p.width, 1))}
                />
              </Field>
              <Field label="Quantité">
                <input
                  type="number"
                  min={1}
                  max={99}
                  className={inputClass + " !py-1.5"}
                  value={p.qty}
                  onChange={(e) => onUpdate('qty', clampInt(e.target.value, p.qty, 1, 99))}
                />
              </Field>
              <Field label="Épaisseur (mm)">
                <input
                  type="number"
                  step="1"
                  min={1}
                  className={inputClass + " !py-1.5" + (p.thickness !== undefined ? " !border-amber-400 !bg-amber-50" : "")}
                  value={thicknessMm}
                  onChange={(e) => {
                    const mm = parseNumber(e.target.value, thicknessMm, 1);
                    const cm = mm / 10;
                    onUpdate('thickness', Math.abs(cm - panelThickness) < 0.001 ? '' : cm);
                  }}
                />
              </Field>
            </div>

            {/* Row 3: Type + Panel selector */}
            <div className={`grid gap-2 mt-2 ${allPanelDefs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <Field label="Type de pièce">
                <select
                  className={inputClass + " !py-1.5"}
                  value={p.type}
                  onChange={(e) => onUpdate('type', e.target.value)}
                >
                  {PIECE_TYPES.map((t) => (
                    <option key={t} value={t}>{pieceTypeLabel(t)}</option>
                  ))}
                </select>
              </Field>
              {allPanelDefs.length > 1 && (
                <Field label="Panneau">
                  <select
                    className={inputClass + " !py-1.5"}
                    value={p.panelId ?? 'default'}
                    onChange={(e) => onUpdate('panelId', e.target.value === 'default' ? '' : e.target.value)}
                  >
                    {allPanelDefs.map((pd) => (
                      <option key={pd.id} value={pd.id}>{pd.label}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {/* Row 4: Position (only for relevant types) */}
            {(p.type === 'tablette-fixe' || p.type === 'tablette-reglable' || p.type === 'bandeau' || p.type === 'separateur') && (
              <div className={`grid gap-2 mt-2 ${p.type === 'separateur' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Field label="Hauteur depuis le sol int. (cm)">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    className={inputClass + " !py-1.5"}
                    value={p.posY ?? ''}
                    placeholder="auto"
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      if (v === '') {
                        onUpdate('posY', '');
                      } else {
                        onUpdate('posY', parseNumber(v, 0, 0));
                      }
                    }}
                  />
                </Field>
                {p.type === 'separateur' && (
                  <Field label="Position X depuis gauche (cm)">
                    <input
                      type="number"
                      step="0.5"
                      min={0}
                      className={inputClass + " !py-1.5"}
                      value={p.posX ?? ''}
                      placeholder="auto"
                      onChange={(e) => {
                        const v = e.target.value.replace(',', '.');
                        if (v === '') {
                          onUpdate('posX', '');
                        } else {
                          onUpdate('posX', parseNumber(v, 0, 0));
                        }
                      }}
                    />
                  </Field>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ---- READ MODE: compact single line ---- */
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
              <span className={`ml-1 ${p.thickness !== undefined ? 'text-amber-600 font-semibold' : 'text-stone-400'}`}>
                ep.{thicknessMm}
              </span>
              {(p.posY !== undefined || p.posX !== undefined) && (
                <span className="ml-1 text-sky-600">
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
    </div>
  );
}
