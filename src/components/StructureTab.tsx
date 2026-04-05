import { useState } from 'react';
import type { AppState, MaterialKey, PieceType, Body } from '../types';
import { MATERIALS, PIECE_COLORS, BODY_COLORS, PIECE_TYPES } from '../data/materials';
import { uid, parseNumber, clampInt } from '../lib/helpers';
import Tip from './Tip';
import TIPS from '../data/tips';

interface Props {
  state: AppState;
  onChange: (state: AppState) => void;
}

const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors";
const labelClass = "block text-xs font-medium text-stone-500 mb-1.5";
const cardClass = "rounded-2xl border border-stone-200 bg-white  p-4 mb-4";
const sectionTitle = "text-amber-700 font-semibold text-xs uppercase tracking-widest mb-3";

function NumberInput({ label, value, onChange, step = 1, min, max, suffix, tip }: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; suffix?: string; tip?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const displayed = focused ? raw : String(value);

  return (
    <div>
      <label className={labelClass}>
        {tip ? (
          <Tip text={tip}><span>{label}{suffix ? ` (${suffix})` : ''}</span></Tip>
        ) : (
          <>{label}{suffix ? ` (${suffix})` : ''}</>
        )}
      </label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        className={inputClass}
        value={displayed}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = parseNumber(e.target.value, value, min, max);
          onChange(n);
        }}
        onFocus={() => { setFocused(true); setRaw(String(value)); }}
        onBlur={() => { setFocused(false); setRaw(String(value)); }}
      />
    </div>
  );
}

export default function StructureTab({ state, onChange }: Props) {
  const [editingPiece, setEditingPiece] = useState<string | null>(null);
  const mat = MATERIALS[state.materialKey];

  const updateProject = (key: string, value: number) => {
    onChange({ ...state, project: { ...state.project, [key]: value } });
  };

  const updatePanel = (key: string, value: number) => {
    onChange({ ...state, panel: { ...state.panel, [key]: value } });
  };

  const changeMaterial = (key: MaterialKey) => {
    const m = MATERIALS[key];
    const p = m.panels[0];
    onChange({
      ...state,
      materialKey: key,
      panel: { ...state.panel, width: p.w, height: p.h, thickness: m.defaultThickness / 10 },
      costConfig: { panelPrice: p.defaultPrice },
    });
  };

  const updateBody = (id: string, key: keyof Body, value: string | number) => {
    onChange({
      ...state,
      bodies: state.bodies.map((b) => {
        if (b.id !== id) return b;
        const updated = { ...b, [key]: value };

        // Auto-update pieces when width or depth changes
        if (key === 'width' || key === 'depth') {
          const newWidth = key === 'width' ? (value as number) : b.width;
          const newDepth = key === 'depth' ? (value as number) : b.depth;
          const oldWidth = b.width;
          const oldDepth = b.depth;
          const thickness = state.panel.thickness;
          const innerWidth = +(newWidth - 2 * thickness).toFixed(1);
          const oldInnerWidth = +(oldWidth - 2 * thickness).toFixed(1);

          updated.pieces = b.pieces.map((p) => {
            const piece = { ...p };
            if (p.type === 'joue') {
              // Joues: profondeur = profondeur du corps
              piece.width = newDepth;
            } else if (p.type === 'tablette-fixe' || p.type === 'tablette-reglable') {
              // Tablettes: longueur = largeur intérieure, profondeur = profondeur du corps
              piece.length = innerWidth;
              piece.width = newDepth;
            } else if (p.type === 'bandeau') {
              // Bandeau: longueur = largeur du corps
              piece.length = newWidth;
            } else {
              // Pièces "autre" : adapter si les dimensions correspondaient au corps
              if (key === 'depth' && Math.abs(p.width - oldDepth) < 0.5) {
                piece.width = newDepth;
              }
              if (key === 'width' && Math.abs(p.length - oldInnerWidth) < 0.5) {
                piece.length = innerWidth;
              }
              if (key === 'width' && Math.abs(p.length - oldWidth) < 0.5) {
                piece.length = newWidth;
              }
            }
            return piece;
          });
        }

        return updated;
      }),
    });
  };

  const updatePiece = (bodyId: string, pieceId: string, key: string, value: string | number) => {
    onChange({
      ...state,
      bodies: state.bodies.map((b) =>
        b.id === bodyId
          ? { ...b, pieces: b.pieces.map((p) => (p.id === pieceId ? { ...p, [key]: value } : p)) }
          : b
      ),
    });
  };

  const addPiece = (bodyId: string) => {
    const body = state.bodies.find((b) => b.id === bodyId);
    onChange({
      ...state,
      bodies: state.bodies.map((b) =>
        b.id === bodyId
          ? { ...b, pieces: [...b.pieces, { id: uid(), name: "Nouvelle pièce", length: 50, width: body?.depth ?? 30, qty: 1, type: "autre" as PieceType }] }
          : b
      ),
    });
  };

  const removePiece = (bodyId: string, pieceId: string) => {
    onChange({
      ...state,
      bodies: state.bodies.map((b) =>
        b.id === bodyId ? { ...b, pieces: b.pieces.filter((p) => p.id !== pieceId) } : b
      ),
    });
  };

  const duplicateBody = (id: string) => {
    const source = state.bodies.find((b) => b.id === id);
    if (!source) return;
    const newBody = {
      ...source,
      id: uid(),
      name: `${source.name} (copie)`,
      pieces: source.pieces.map((p) => ({ ...p, id: uid() })),
    };
    const idx = state.bodies.findIndex((b) => b.id === id);
    const bodies = [...state.bodies];
    bodies.splice(idx + 1, 0, newBody);
    onChange({ ...state, bodies });
  };

  const addBody = () => {
    onChange({
      ...state,
      bodies: [...state.bodies, { id: uid(), name: `Corps ${state.bodies.length + 1}`, width: 80, depth: 30, pieces: [] }],
    });
  };

  const removeBody = (id: string) => {
    onChange({ ...state, bodies: state.bodies.filter((b) => b.id !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Material */}
      <div className={cardClass}>
        <Tip text={TIPS['materiau']}><h3 className={sectionTitle}>Matériau</h3></Tip>
        <select
          className={inputClass + " mb-3"}
          value={state.materialKey}
          onChange={(e) => changeMaterial(e.target.value as MaterialKey)}
        >
          {Object.entries(MATERIALS).map(([k, m]) => (
            <option key={k} value={k}>{m.name}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-500 mb-2">
          <Tip text={TIPS['densite']}><span>{mat.density} kg/m³</span></Tip>
          <Tip text={TIPS['flexMPa']}><span>{mat.flexMPa} MPa</span></Tip>
          <Tip text={TIPS['portee-max']}><span>Portée max {mat.maxSpan18} cm</span></Tip>
          <Tip text={TIPS['vis']}><span>Vis: {mat.screwHolding}</span></Tip>
        </div>
        <p className="text-xs text-stone-500">{mat.notes}</p>
        {mat.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {mat.warnings.map((w, i) => (
              <p key={i} className="text-xs text-yellow-400/80">⚠ {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* Project */}
      <div className={cardClass}>
        <h3 className={sectionTitle}>Emplacement</h3>
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Largeur disponible" suffix="cm" value={state.project.wallWidth} min={10} max={1000} step={0.1} onChange={(v) => updateProject('wallWidth', v)} tip={TIPS['largeur-mur']} />
          <NumberInput label="Hauteur disponible" suffix="cm" value={state.project.ceilingHeight} min={10} max={500} step={0.1} onChange={(v) => updateProject('ceilingHeight', v)} tip={TIPS['hauteur-plafond']} />
          <NumberInput label="Plinthe hauteur" suffix="cm" value={state.project.plinthHeight} min={0} max={50} step={0.1} onChange={(v) => updateProject('plinthHeight', v)} tip={TIPS['hauteur-plinthe']} />
          <NumberInput label="Plinthe profondeur" suffix="cm" value={state.project.plinthDepth} min={0} max={20} step={0.1} onChange={(v) => updateProject('plinthDepth', v)} tip={TIPS['profondeur-plinthe']} />
        </div>
        <p className="text-[10px] text-stone-400 mt-2">Plinthe = 0 si votre meuble n'est pas contre un mur avec plinthe</p>
      </div>

      {/* Panel */}
      <div className={cardClass}>
        <Tip text={TIPS['panneau']}><h3 className={sectionTitle}>Panneau</h3></Tip>
        <div className="grid grid-cols-3 gap-3">
          <NumberInput label="Largeur" suffix="cm" value={state.panel.width} min={10} max={500} onChange={(v) => updatePanel('width', v)} tip={TIPS['panneau-largeur']} />
          <NumberInput label="Hauteur" suffix="cm" value={state.panel.height} min={10} max={500} onChange={(v) => updatePanel('height', v)} tip={TIPS['panneau-hauteur']} />
          <NumberInput label="Épaisseur" suffix="cm" value={state.panel.thickness} min={0.3} max={5} step={0.1} onChange={(v) => updatePanel('thickness', v)} tip={TIPS['panneau-epaisseur']} />
        </div>
        <div className="mt-3 flex gap-2">
          {mat.panels.map((p, i) => (
            <button
              key={i}
              className="text-xs px-3 py-1.5 rounded-lg bg-white text-stone-400 hover:bg-stone-100 hover:text-amber-700 border border-stone-200 transition-colors"
              onClick={() => onChange({
                ...state,
                panel: { ...state.panel, width: p.w, height: p.h },
                costConfig: { panelPrice: p.defaultPrice },
              })}
            >
              {p.w}×{p.h} ({p.defaultPrice}€)
            </button>
          ))}
        </div>
      </div>

      {/* Bodies */}
      <div className="flex items-center justify-between mb-2">
        <Tip text={TIPS['corps']}><h3 className={sectionTitle + " mb-0"}>Corps ({state.bodies.length})</h3></Tip>
        <button
          onClick={addBody}
          className="text-xs px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors"
        >
          + Ajouter un corps
        </button>
      </div>

      {state.bodies.map((b, bi) => {
        const totalWeight = (
          b.pieces.reduce((s, p) => s + p.length * p.width * p.qty, 0) / 10000
        ) * state.panel.thickness / 100 * mat.density;

        return (
          <div
            key={b.id}
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

            <div className="grid grid-cols-2 gap-3 mb-3">
              <NumberInput label="Largeur" suffix="cm" value={b.width} min={10} max={500} step={0.1} onChange={(v) => updateBody(b.id, 'width', v)} tip={TIPS['corps-largeur']} />
              <NumberInput label="Profondeur" suffix="cm" value={b.depth} min={10} max={200} step={0.1} onChange={(v) => updateBody(b.id, 'depth', v)} tip={TIPS['corps-profondeur']} />
            </div>

            <div className="text-xs text-stone-500 mb-3 flex items-center gap-1 flex-wrap">
              <Tip text={TIPS['int-tablette']}><span>Int. tablette : {(b.width - 2 * state.panel.thickness).toFixed(1)} cm</span></Tip>
              <span className="mx-1">·</span>
              <Tip text={TIPS['poids-corps']}><span>~{totalWeight.toFixed(1)} kg</span></Tip>
            </div>

            {/* Pieces */}
            <div className="space-y-1.5">
              {b.pieces.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PIECE_COLORS[p.type] || PIECE_COLORS.autre }}
                  />
                  {editingPiece === p.id ? (
                    <div className="flex-1 grid grid-cols-5 gap-1.5 items-center">
                      <input
                        className={inputClass + " col-span-2 !py-1"}
                        value={p.name}
                        onChange={(e) => updatePiece(b.id, p.id, 'name', e.target.value)}
                      />
                      <input
                        type="number"
                        step="0.1"
                        min={1}
                        className={inputClass + " !py-1"}
                        value={p.length}
                        onChange={(e) => updatePiece(b.id, p.id, 'length', parseNumber(e.target.value, p.length, 1))}
                      />
                      <input
                        type="number"
                        step="0.1"
                        min={1}
                        className={inputClass + " !py-1"}
                        value={p.width}
                        onChange={(e) => updatePiece(b.id, p.id, 'width', parseNumber(e.target.value, p.width, 1))}
                      />
                      <div className="flex gap-1">
                        <input
                          type="number"
                          min={1}
                          max={99}
                          className={inputClass + " !py-1 w-12"}
                          value={p.qty}
                          onChange={(e) => updatePiece(b.id, p.id, 'qty', clampInt(e.target.value, p.qty, 1, 99))}
                        />
                        <select
                          className={inputClass + " !py-1 text-xs"}
                          value={p.type}
                          onChange={(e) => updatePiece(b.id, p.id, 'type', e.target.value)}
                        >
                          {PIECE_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex-1 min-w-0 flex justify-between cursor-pointer hover:text-amber-700 transition-colors"
                      onClick={() => setEditingPiece(p.id)}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-stone-500 text-xs font-mono ml-2 flex-shrink-0">
                        {p.length}×{p.width} ×{p.qty}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => editingPiece === p.id ? setEditingPiece(null) : removePiece(b.id, p.id)}
                    className="text-xs text-stone-500 hover:text-red-400 flex-shrink-0 transition-colors"
                  >
                    {editingPiece === p.id ? "✓" : "×"}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addPiece(b.id)}
              className="mt-3 text-xs text-amber-500 hover:text-amber-700 transition-colors"
            >
              + Ajouter une pièce
            </button>
          </div>
        );
      })}
    </div>
  );
}
