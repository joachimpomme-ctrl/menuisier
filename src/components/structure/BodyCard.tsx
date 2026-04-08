import type { AppState, Body, PanelDef, Piece, PieceType } from '../../types';
import { MATERIALS, BODY_COLORS } from '../../data/materials';
import { uid, isSharedLeft, getBodyInnerWidth } from '../../lib/helpers';
import Tip from '../Tip';
import TIPS from '../../data/tips';
import NumberInput from './NumberInput';
import PieceEditor from './PieceEditor';
import DoorConfigurator from './DoorConfigurator';
import { cardClass } from './styles';

interface Props {
  body: Body;
  bodyIndex: number;
  state: AppState;
  allPanelDefs: PanelDef[];
  editingPiece: string | null;
  setEditingPiece: (id: string | null) => void;
  onChange: (state: AppState) => void;
  updateBody: (id: string, key: keyof Body, value: string | number) => void;
  duplicateBody: (id: string) => void;
  removeBody: (id: string) => void;
  updatePiece: (bodyId: string, pieceId: string, key: string, value: string | number) => void;
  addPiece: (bodyId: string, pieceType?: PieceType) => void;
  autoFillPieces: (bodyId: string) => void;
  removePiece: (bodyId: string, pieceId: string) => void;
  toggleSharing: (boundaryIdx: number, enabled: boolean) => void;
}

export default function BodyCard({
  body: b,
  bodyIndex: bi,
  state,
  allPanelDefs,
  editingPiece,
  setEditingPiece,
  onChange,
  updateBody,
  duplicateBody,
  removeBody,
  updatePiece,
  addPiece,
  autoFillPieces,
  removePiece,
  toggleSharing,
}: Props) {
  const mat = MATERIALS[state.materialKey];
  const shared = state.sharedBoundaries ?? [];
  const th = state.panel.thickness;

  const totalWeight = (
    b.pieces.reduce((s, p) => s + p.length * p.width * p.qty, 0) / 10000
  ) * th / 100 * mat.density;

  const sl = isSharedLeft(bi, shared);
  const sr = bi < state.bodies.length - 1 && (shared[bi] ?? false);
  const iw = getBodyInnerWidth(b.width, bi, state.bodies.length, shared, th);

  return (
    <div>
      {/* Sharing toggle BEFORE this body (between bi-1 and bi) */}
      {bi > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 -mt-2 mb-2">
          <div className="flex-1 h-px bg-stone-200" />
          <button
            onClick={() => toggleSharing(bi - 1, !(shared[bi - 1] ?? false))}
            className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
              shared[bi - 1]
                ? 'bg-blue-100 border-blue-300 text-blue-800 font-semibold shadow-sm'
                : 'bg-white border-stone-200 text-stone-400 hover:border-blue-200 hover:text-blue-600'
            }`}
          >
            {shared[bi - 1] ? '⚙ Joue commune ✓' : '⊕ Joue commune ?'}
          </button>
          <div className="flex-1 h-px bg-stone-200" />
        </div>
      )}

      <div
        className={cardClass}
        style={{ borderLeftWidth: '3px', borderLeftColor: BODY_COLORS[bi % BODY_COLORS.length] }}
      >
        <div className="flex items-center justify-between mb-3">
          <input
            className="bg-transparent text-sm font-semibold text-stone-800 border-b border-transparent hover:border-stone-300 focus:border-amber-500 focus:outline-none transition-colors"
            value={b.name}
            onChange={(e) => updateBody(b.id, 'name', e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => duplicateBody(b.id)}
              className="text-xs text-stone-500 hover:text-amber-600 transition-colors"
            >
              Dupliquer
            </button>
            <button
              onClick={() => removeBody(b.id)}
              className="text-xs text-stone-500 hover:text-red-400 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>

        {/* Sharing indicators */}
        {sl && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 text-xs text-blue-800">
            <div className="font-semibold mb-1">Joue gauche commune</div>
            <p className="text-blue-700 leading-relaxed">
              Cette joue est physiquement la joue droite du corps
              &laquo;&thinsp;{state.bodies[bi - 1]?.name}&thinsp;&raquo;.
              Elle n'apparait pas dans la liste ci-dessous — c'est normal.
            </p>
            <p className="text-blue-600 mt-1 font-mono text-[10px]">
              Profondeur : max({state.bodies[bi - 1]?.depth}, {b.depth}) = {Math.max(state.bodies[bi - 1]?.depth ?? 0, b.depth)} cm
            </p>
          </div>
        )}
        {sr && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
              Joue D commune avec {state.bodies[bi + 1]?.name}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <NumberInput label="Largeur" suffix="cm" value={b.width} min={10} max={500} step={0.1} onChange={(v) => updateBody(b.id, 'width', v)} tip={TIPS['corps-largeur']} />
          <NumberInput label="Profondeur" suffix="cm" value={b.depth} min={10} max={200} step={0.1} onChange={(v) => updateBody(b.id, 'depth', v)} tip={TIPS['corps-profondeur']} />
        </div>

        <div className="text-xs text-stone-500 mb-3 flex items-center gap-1 flex-wrap">
          <Tip text={sl
            ? "Largeur intérieure augmentée : la joue gauche est commune avec le corps voisin. Pas de double épaisseur à la jonction."
            : TIPS['int-tablette']
          }>
            <span>
              Int. tablette : <span className={`font-semibold ${sl ? 'text-blue-700' : ''}`}>{iw} cm</span>
              {sl && <span className="text-[10px] text-blue-500 ml-1">(joue commune)</span>}
            </span>
          </Tip>
          <span className="mx-1">·</span>
          <Tip text={TIPS['poids-corps']}><span>~{totalWeight.toFixed(1)} kg</span></Tip>
        </div>

        {/* Pieces */}
        <div className="space-y-1.5">
          {b.pieces.map((p) => (
            <PieceEditor
              key={p.id}
              piece={p}
              state={state}
              allPanelDefs={allPanelDefs}
              editing={editingPiece === p.id}
              onStartEdit={() => setEditingPiece(p.id)}
              onStopEdit={() => setEditingPiece(null)}
              onUpdate={(key, value) => updatePiece(b.id, p.id, key, value)}
              onRemove={() => {
                removePiece(b.id, p.id);
                if (editingPiece === p.id) setEditingPiece(null);
              }}
            />
          ))}
        </div>

        {sl && (
          <div className="text-[10px] text-blue-600 mt-1.5 px-1">
            Joues dans ce corps : {b.pieces.filter(p => p.type === 'joue').length} (+ 1 joue commune fournie par {state.bodies[bi - 1]?.name})
          </div>
        )}

        {/* Filler suggestion */}
        <FillerSuggestion body={b} bodyIndex={bi} state={state} sl={sl} iw={iw} onChange={onChange} />

        <div className="mt-3 flex flex-wrap gap-1 items-center">
          <button
            onClick={() => autoFillPieces(b.id)}
            className="text-[11px] px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-semibold transition-colors"
          >
            ⚡ Remplir auto
          </button>
          <button onClick={() => addPiece(b.id, 'joue')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Joue</button>
          <button onClick={() => addPiece(b.id, 'tablette-fixe')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Tab. fixe</button>
          <button onClick={() => addPiece(b.id, 'tablette-reglable')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Tab. réglable</button>
          <button onClick={() => addPiece(b.id, 'separateur')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors">+ Séparateur</button>
          <button onClick={() => addPiece(b.id, 'bandeau')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Bandeau</button>
          <button onClick={() => addPiece(b.id, 'fond')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Fond</button>
          <button onClick={() => addPiece(b.id, 'autre')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Autre</button>
        </div>

        {/* Door Configurator */}
        <DoorConfigurator body={b} bodyIndex={bi} state={state} onChange={onChange} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filler suggestion (top-of-body gap → tasseau plafond + bandeau)
// ---------------------------------------------------------------------------
interface FillerProps {
  body: Body;
  bodyIndex: number;
  state: AppState;
  sl: boolean;
  iw: number;
  onChange: (state: AppState) => void;
}

function FillerSuggestion({ body: b, state, sl, iw, onChange }: FillerProps) {
  const cH = state.project.ceilingHeight;
  const joues = b.pieces.filter((p) => p.type === 'joue');
  const maxJoueH = joues.length > 0 ? Math.max(...joues.map((j) => j.length)) : 0;

  const jouePairs = Math.floor(joues.length / 2);
  let totalJoueH = maxJoueH;
  if (jouePairs >= 1 && joues.length >= 2) {
    const sorted = [...joues].sort((a, c) => c.length - a.length);
    const sums: number[] = [];
    for (let k = 0; k < sorted.length - 1; k += 2) {
      sums.push(sorted[k].length + sorted[k + 1].length);
    }
    totalJoueH = Math.max(...sums, maxJoueH);
  }

  const gapTop = +(cH - totalJoueH).toFixed(1);
  const hasTopGap = gapTop > 1 && totalJoueH > 0 && totalJoueH < cH;
  const hasFiller = b.pieces.some((p) => /filler|remplissage|tasseau plafond/i.test(p.name));

  if (!hasTopGap || hasFiller) return null;

  const fillerPieces = (): Piece[] => {
    const pieces: Piece[] = [
      { id: uid(), name: `Tasseau plafond ${b.name}`, length: iw, width: 4, qty: 1, type: 'tablette-fixe' },
      { id: uid(), name: `Bandeau haut ${b.name}`, length: b.width, width: gapTop, qty: 1, type: 'bandeau' },
    ];
    if (b.depth > 8) {
      pieces.push({
        id: uid(), name: `Remplissage latéral ${b.name}`, length: gapTop, width: b.depth, qty: sl ? 1 : 2, type: 'autre',
      });
    }
    return pieces;
  };

  const addFillers = () => {
    onChange({
      ...state,
      bodies: state.bodies.map((body) =>
        body.id === b.id ? { ...body, pieces: [...body.pieces, ...fillerPieces()] } : body
      ),
    });
  };

  return (
    <div className="mt-3 bg-violet-50 border border-violet-200 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-violet-800 mb-1">
            Espace résiduel en haut : {gapTop} cm
          </div>
          <p className="text-[10px] text-violet-600 leading-relaxed">
            Les joues ({totalJoueH} cm) n'atteignent pas le plafond ({cH} cm).
            Ajoutez des fillers pour un rendu fini :
          </p>
          <ul className="text-[10px] text-violet-700 mt-1 space-y-0.5 list-disc list-inside">
            <li><b>Tasseau plafond</b> ({iw}×4 cm) — vissé au plafond, sert d'accroche</li>
            <li><b>Bandeau haut</b> ({b.width}×{gapTop} cm) — cache le gap de face</li>
            {b.depth > 8 && (
              <li><b>Plaquettes latérales</b> ({gapTop}×{b.depth} cm ×{sl ? 1 : 2}) — comblent les côtés</li>
            )}
          </ul>
          <p className="text-[10px] text-violet-500 mt-1.5">
            Montage : visser le tasseau au plafond → fixer le bandeau sur le tasseau →
            ajuster les plaquettes latérales avec colle + pointes.
          </p>
        </div>
        <button
          onClick={addFillers}
          className="text-[11px] px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors flex-shrink-0 shadow-sm"
        >
          + Ajouter fillers
        </button>
      </div>
    </div>
  );
}
