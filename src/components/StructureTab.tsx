import { useState } from 'react';
import type { AppState, MaterialKey, PieceType, Body, DoorPoseType, DoorConfig } from '../types';
import { MATERIALS, PIECE_COLORS, BODY_COLORS, PIECE_TYPES } from '../data/materials';
import { uid, parseNumber, clampInt, calculateDoor } from '../lib/helpers';
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

// ---------------------------------------------------------------------------
// Glossaire des types de pièces
// ---------------------------------------------------------------------------
const GLOSSARY: { type: PieceType; label: string; icon: string; desc: string; illustration: string }[] = [
  {
    type: 'joue', label: 'Joue', icon: '📏',
    desc: "Panneau vertical qui forme le côté gauche ou droit du meuble. C'est la pièce structurelle principale : elle porte tout le poids des tablettes et de leur contenu.",
    illustration: "Un meuble a 2 joues (gauche + droite). Leur hauteur = hauteur utile du meuble. Leur largeur = profondeur du meuble.",
  },
  {
    type: 'tablette-fixe', label: 'Tablette fixe', icon: '🔩',
    desc: "Étagère collée et vissée de manière permanente. Elle rigidifie le caisson (comme un cadre). Impossible à déplacer après montage.",
    illustration: "Minimum 2 par corps : une en haut, une en bas. Elles empêchent le meuble de se déformer en losange (équerrage).",
  },
  {
    type: 'tablette-reglable', label: 'Tablette réglable', icon: '↕',
    desc: "Étagère posée sur des taquets amovibles (petites broches métalliques). On peut la repositionner pour adapter la hauteur au contenu.",
    illustration: "Installée en dernier. Les taquets se glissent dans des trous percés tous les 32 mm dans les joues (système 32).",
  },
  {
    type: 'bandeau', label: 'Bandeau', icon: '🎀',
    desc: "Pièce décorative, souvent placée en haut du meuble, qui cache l'espace entre le dessus du meuble et le plafond.",
    illustration: "Donne un aspect fini et intégré au meuble. Sa longueur = largeur totale du corps.",
  },
  {
    type: 'porte', label: 'Porte', icon: '🚪',
    desc: "Panneau mobile fixé par des charnières (type Ø35 mm). Permet de fermer tout ou partie du meuble.",
    illustration: "2 mm de jeu entre portes. Largeur max 60 cm en 18 mm (risque de voile au-delà). 2 à 5 charnières selon la hauteur.",
  },
  {
    type: 'tiroir-facade', label: 'Façade tiroir', icon: '🗄',
    desc: "Face avant visible du tiroir. Fixée par vis depuis l'intérieur du caisson tiroir. Mêmes règles de jeu que les portes.",
    illustration: "Le caisson tiroir (invisible derrière) fait ~25 mm de moins en hauteur. Coulisses : 12.5 mm de jeu latéral de chaque côté.",
  },
  {
    type: 'fond', label: 'Fond (dos)', icon: '📦',
    desc: "Panneau fin (3-6 mm) fixé à l'arrière du meuble. Il rigidifie le caisson et empêche le basculement.",
    illustration: "Généralement en HDF ou CP 3-6 mm, rainuré dans les joues ou agrafé. Indispensable pour l'équerrage.",
  },
];

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

// ---------------------------------------------------------------------------
// Configurateur de portes pour un corps
// ---------------------------------------------------------------------------
function DoorConfigurator({ body, state, onChange }: { body: Body; state: AppState; onChange: (state: AppState) => void }) {
  const usableHeight = state.project.ceilingHeight - state.project.plinthHeight;
  const thickness = state.panel.thickness;
  const joueH = usableHeight; // simplified: door covers full body height

  const config = body.doorConfig;

  const applyDoors = (newConfig: DoorConfig | undefined) => {
    onChange({
      ...state,
      bodies: state.bodies.map((b) => {
        if (b.id !== body.id) return b;
        // Remove existing door pieces
        const piecesWithoutDoors = b.pieces.filter((p) => p.type !== 'porte');

        if (!newConfig) {
          return { ...b, doorConfig: undefined, pieces: piecesWithoutDoors };
        }

        const dims = calculateDoor(b.width, joueH, thickness, newConfig.count, newConfig.poseType);
        const doorPieces = Array.from({ length: newConfig.count }, (_, i) => ({
          id: uid(),
          name: newConfig.count === 1 ? `Porte ${b.name}` : `Porte ${i === 0 ? 'G' : 'D'} ${b.name}`,
          length: dims.doorHeight,
          width: dims.doorWidth,
          qty: 1,
          type: 'porte' as PieceType,
        }));

        return {
          ...b,
          doorConfig: newConfig,
          pieces: [...piecesWithoutDoors, ...doorPieces],
        };
      }),
    });
  };

  const doorInfo = config ? calculateDoor(body.width, joueH, thickness, config.count, config.poseType) : null;

  if (!config) {
    return (
      <div className="mt-3 pt-3 border-t border-stone-100">
        <button
          onClick={() => applyDoors({ count: 1, poseType: 'enveloppante' })}
          className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
        >
          + Ajouter des portes
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-stone-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Portes</span>
        <button
          onClick={() => applyDoors(undefined)}
          className="text-[10px] text-stone-400 hover:text-red-500 transition-colors"
        >
          Retirer les portes
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          onClick={() => applyDoors({ ...config, count: 1 })}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${config.count === 1 ? 'bg-amber-100 border-amber-300 text-amber-800 font-semibold' : 'bg-white border-stone-200 text-stone-500 hover:border-amber-200'}`}
        >
          1 porte
        </button>
        <button
          onClick={() => applyDoors({ ...config, count: 2 })}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${config.count === 2 ? 'bg-amber-100 border-amber-300 text-amber-800 font-semibold' : 'bg-white border-stone-200 text-stone-500 hover:border-amber-200'}`}
        >
          2 portes
        </button>
      </div>

      <div className="mb-2">
        <label className="text-[10px] text-stone-500 mb-1 block">Type de pose</label>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { key: 'enveloppante' as DoorPoseType, label: 'Enveloppante', hint: 'recouvre la joue' },
            { key: 'demi-recouvrement' as DoorPoseType, label: 'Demi-recouv.', hint: '2 portes / 1 joue' },
            { key: 'affleurante' as DoorPoseType, label: 'Affleurante', hint: 'dans le cadre' },
          ]).map((pose) => (
            <Tip key={pose.key} text={TIPS[`porte-pose-${pose.key}`] || `${pose.label} : la porte ${pose.hint}`}>
              <button
                onClick={() => applyDoors({ ...config, poseType: pose.key })}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${config.poseType === pose.key ? 'bg-orange-100 border-orange-300 text-orange-800 font-semibold' : 'bg-white border-stone-200 text-stone-500 hover:border-orange-200'}`}
              >
                {pose.label}
              </button>
            </Tip>
          ))}
        </div>
      </div>

      {/* Résumé automatique */}
      {doorInfo && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800 space-y-1">
          <div className="font-semibold">{config.count} porte{config.count > 1 ? 's' : ''} — {doorInfo.poseLabel}</div>
          <div>Dimensions : <span className="font-mono font-semibold">{doorInfo.doorWidth} × {doorInfo.doorHeight}</span> cm</div>
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

export default function StructureTab({ state, onChange }: Props) {
  const [editingPiece, setEditingPiece] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
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
              piece.width = newDepth;
            } else if (p.type === 'tablette-fixe' || p.type === 'tablette-reglable') {
              piece.length = innerWidth;
              piece.width = newDepth;
            } else if (p.type === 'bandeau') {
              piece.length = newWidth;
            } else if (p.type === 'porte') {
              // Doors will be recalculated via DoorConfigurator
              // For now, adapt depth (width of the door piece)
            } else {
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

          // Re-calculate doors if door config exists
          if (b.doorConfig) {
            const usableH = state.project.ceilingHeight - state.project.plinthHeight;
            const dims = calculateDoor(newWidth, usableH, thickness, b.doorConfig.count, b.doorConfig.poseType);
            updated.pieces = updated.pieces.map((p) => {
              if (p.type === 'porte') {
                return { ...p, length: dims.doorHeight, width: dims.doorWidth };
              }
              return p;
            });
          }
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

  // Piece type label for display
  const pieceTypeLabel = (type: PieceType): string => {
    const entry = GLOSSARY.find((g) => g.type === type);
    return entry?.label ?? type;
  };

  return (
    <div className="space-y-4">
      {/* Glossaire / Lexique */}
      <div className={cardClass}>
        <button
          onClick={() => setShowGlossary(!showGlossary)}
          className="w-full flex items-center justify-between"
        >
          <h3 className={sectionTitle + " mb-0"}>Lexique des pièces</h3>
          <span className="text-xs text-stone-400">{showGlossary ? '▲ Fermer' : '▼ Ouvrir'}</span>
        </button>
        <p className="text-[10px] text-stone-400 mt-1">
          {showGlossary ? "Chaque type de pièce a un rôle précis dans le meuble." : "Que sont les joues, tablettes fixes, etc. ? Cliquez pour comprendre."}
        </p>

        {showGlossary && (
          <div className="mt-3 space-y-3">
            {GLOSSARY.map((g) => (
              <div key={g.type} className="flex gap-3 items-start">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: PIECE_COLORS[g.type] }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-stone-800">{g.icon} {g.label}</span>
                    <span className="text-[10px] text-stone-400 font-mono bg-stone-100 px-1.5 py-0.5 rounded">{g.type}</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{g.desc}</p>
                  <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">💡 {g.illustration}</p>
                </div>
              </div>
            ))}

            {/* Mini-schéma anatomie d'un corps */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mt-3">
              <p className="text-[10px] font-semibold text-stone-600 mb-2">ANATOMIE D'UN CORPS (vue de face)</p>
              <svg viewBox="0 0 200 160" className="w-full max-w-[280px] mx-auto" style={{ height: 160 }}>
                <rect x="10" y="5" width="180" height="150" fill="none" stroke="#d6d3d1" strokeWidth="1" strokeDasharray="4,2" />
                {/* Joues */}
                <rect x="15" y="10" width="12" height="140" fill="#3b82f6" opacity=".3" stroke="#3b82f6" strokeWidth="1" rx="1" />
                <rect x="173" y="10" width="12" height="140" fill="#3b82f6" opacity=".3" stroke="#3b82f6" strokeWidth="1" rx="1" />
                {/* Tablettes fixes */}
                <rect x="27" y="12" width="146" height="8" fill="#10b981" opacity=".4" stroke="#10b981" strokeWidth="1" rx="1" />
                <rect x="27" y="135" width="146" height="8" fill="#10b981" opacity=".4" stroke="#10b981" strokeWidth="1" rx="1" />
                {/* Tablettes réglables */}
                <line x1="30" y1="55" x2="170" y2="55" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
                <line x1="30" y1="90" x2="170" y2="90" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
                {/* Bandeau */}
                <rect x="10" y="0" width="180" height="6" fill="#8b5cf6" opacity=".3" stroke="#8b5cf6" strokeWidth="0.5" rx="1" />
                {/* Labels */}
                <text x="5" y="85" fontSize="7" fill="#3b82f6" fontWeight="600" transform="rotate(-90,5,85)" textAnchor="middle">Joue G</text>
                <text x="195" y="85" fontSize="7" fill="#3b82f6" fontWeight="600" transform="rotate(90,195,85)" textAnchor="middle">Joue D</text>
                <text x="100" y="8" fontSize="7" fill="#8b5cf6" fontWeight="600" textAnchor="middle" dy="-4">Bandeau</text>
                <text x="100" y="18" fontSize="6" fill="#10b981" fontWeight="600" textAnchor="middle">Tabl. fixe haute</text>
                <text x="100" y="133" fontSize="6" fill="#10b981" fontWeight="600" textAnchor="middle">Tabl. fixe basse</text>
                <text x="100" y="52" fontSize="6" fill="#f59e0b" textAnchor="middle">Tabl. réglable</text>
                <text x="100" y="87" fontSize="6" fill="#f59e0b" textAnchor="middle">Tabl. réglable</text>
              </svg>
            </div>
          </div>
        )}
      </div>

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
                  <Tip text={TIPS[`piece-${p.type}`] || ''}>
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 cursor-help"
                      style={{ backgroundColor: PIECE_COLORS[p.type] || PIECE_COLORS.autre }}
                    />
                  </Tip>
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
                            <option key={t} value={t}>{pieceTypeLabel(t)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex-1 min-w-0 flex justify-between cursor-pointer hover:text-amber-700 transition-colors"
                      onClick={() => setEditingPiece(p.id)}
                    >
                      <span className="truncate">
                        {p.name}
                        <span className="text-[10px] text-stone-400 ml-1.5">{pieceTypeLabel(p.type)}</span>
                      </span>
                      <span className="text-stone-500 text-xs font-mono ml-2 flex-shrink-0">
                        {p.length}×{p.width} ×{p.qty}
                      </span>
                    </div>
                  )}
                  {editingPiece === p.id && (
                    <button
                      onClick={() => setEditingPiece(null)}
                      className="text-xs text-emerald-600 hover:text-emerald-800 flex-shrink-0 transition-colors font-bold"
                      title="Valider"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => { removePiece(b.id, p.id); if (editingPiece === p.id) setEditingPiece(null); }}
                    className="text-xs text-stone-400 hover:text-red-500 flex-shrink-0 transition-colors"
                    title="Supprimer cette pièce"
                  >
                    ✕
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

            {/* Door Configurator */}
            <DoorConfigurator body={b} state={state} onChange={onChange} />
          </div>
        );
      })}
    </div>
  );
}
