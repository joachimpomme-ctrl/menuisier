import { useState } from 'react';
import type { AppState, MaterialKey, PieceType, Body, DoorPoseType, DoorConfig, DoorPosition, PanelDef } from '../types';
import { MATERIALS, PIECE_COLORS, BODY_COLORS, PIECE_TYPES } from '../data/materials';
import { uid, parseNumber, clampInt, calculateDoor, getBodyInnerWidth, isSharedLeft, getBodyEffectiveHeight, getDoorInfoFromPieces } from '../lib/helpers';
import { createPiece, detectPieceType, generateStandardPieces, applySharedBoundary, recalcBodyPieces } from '../lib/domain';
import Tip from './Tip';
import TIPS from '../data/tips';

interface Props {
  state: AppState;
  onChange: (state: AppState) => void;
  allPanelDefs: PanelDef[];
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
    illustration: "Un meuble a 2 joues (gauche + droite). Quand 2 corps sont collés, on peut partager une seule joue entre les deux (joue commune).",
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
function DoorConfigurator({ body, bodyIndex, state, onChange }: {
  body: Body; bodyIndex: number; state: AppState; onChange: (state: AppState) => void;
}) {
  const { ceilingHeight, plinthHeight } = state.project;
  const thickness = state.panel.thickness;
  const shared = state.sharedBoundaries ?? [];
  const innerW = getBodyInnerWidth(body.width, bodyIndex, state.bodies.length, shared, thickness);

  const config = body.doorConfig;

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
        const dims = calculateDoor(b.width, bH, thickness, newConfig.count, newConfig.poseType, innerW);
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

  // Lire les dimensions RÉELLES des pièces porte (pas recalculer)
  const doorInfo = getDoorInfoFromPieces(body);

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

      {/* Position haut/bas (utile quand la porte ne couvre pas tout le corps) */}
      <div className="flex gap-2 mb-2">
        <span className="text-[11px] text-stone-500 self-center mr-1">Position :</span>
        {([
          { key: 'bas' as DoorPosition, label: 'En bas' },
          { key: 'haut' as DoorPosition, label: 'En haut' },
        ]).map((pos) => (
          <button
            key={pos.key}
            onClick={() => applyDoors({ ...config, position: pos.key })}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${(config.position ?? 'bas') === pos.key ? 'bg-amber-100 border-amber-300 text-amber-800 font-semibold' : 'bg-white border-stone-200 text-stone-500 hover:border-amber-200'}`}
          >
            {pos.label}
          </button>
        ))}
      </div>

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function StructureTab({ state, onChange, allPanelDefs }: Props) {
  const [editingPiece, setEditingPiece] = useState<string | null>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const mat = MATERIALS[state.materialKey];
  const shared = state.sharedBoundaries ?? [];
  const th = state.panel.thickness;

  // ---------- helpers for sharing-aware inner width ----------
  const innerWidthOf = (bi: number) =>
    getBodyInnerWidth(state.bodies[bi].width, bi, state.bodies.length, shared, th);

  // ---------- state updaters ----------
  const updateProject = (key: string, value: number) => {
    onChange({ ...state, project: { ...state.project, [key]: value } });
  };

  const updateThickness = (value: number) => {
    onChange({ ...state, panel: { ...state.panel, thickness: value } });
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
      bodies: state.bodies.map((b, i) => {
        if (b.id !== id) return b;
        const updated = { ...b, [key]: value };

        if (key === 'width' || key === 'depth') {
          const newWidth = key === 'width' ? (value as number) : b.width;
          const newDepth = key === 'depth' ? (value as number) : b.depth;
          return recalcBodyPieces(
            b, i, b.width, b.depth, newWidth, newDepth,
            state.panel.thickness, shared,
            state.project.ceilingHeight, state.project.plinthHeight,
          );
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
          ? { ...b, pieces: b.pieces.map((p) => {
              if (p.id !== pieceId) return p;
              // panelId: '' or 'default' → undefined (use main panel)
              if (key === 'panelId') {
                const v = value === '' || value === 'default' ? undefined : String(value);
                return { ...p, panelId: v };
              }
              const updated = { ...p, [key]: value };
              // Auto-detect piece type from name (only if current type is 'autre')
              if (key === 'name') {
                updated.type = detectPieceType(String(value), p.type);
              }
              return updated;
            }) }
          : b
      ),
    });
  };

  const addPiece = (bodyId: string, pieceType?: PieceType) => {
    const bi = state.bodies.findIndex((b) => b.id === bodyId);
    const body = state.bodies[bi];
    if (!body) return;
    const iw = innerWidthOf(bi);
    const type: PieceType = pieceType ?? 'autre';

    const piece = createPiece(
      type,
      body.width,
      body.depth,
      iw,
      state.project.ceilingHeight,
      state.project.plinthHeight,
      allPanelDefs,
    );

    onChange({
      ...state,
      bodies: state.bodies.map((b) =>
        b.id === bodyId
          ? { ...b, pieces: [...b.pieces, piece] }
          : b
      ),
    });
  };

  const autoFillPieces = (bodyId: string) => {
    const bi = state.bodies.findIndex((b) => b.id === bodyId);
    const body = state.bodies[bi];
    if (!body) return;
    // Only auto-fill if body has no pieces
    if (body.pieces.length > 0) {
      if (!confirm('Ce corps contient déjà des pièces. Voulez-vous les remplacer par les pièces standard ?')) return;
    }

    const pieces = generateStandardPieces(body, bi, shared, th, state.project.ceilingHeight);

    onChange({
      ...state,
      bodies: state.bodies.map((b) =>
        b.id === bodyId ? { ...b, pieces } : b
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
    const idx = state.bodies.findIndex((b) => b.id === id);
    const newBody = {
      ...source,
      id: uid(),
      name: `${source.name} (copie)`,
      pieces: source.pieces.map((p) => ({ ...p, id: uid() })),
    };
    const bodies = [...state.bodies];
    bodies.splice(idx + 1, 0, newBody);
    // Insert a false entry in sharedBoundaries at the insertion point
    const newShared = [...shared];
    newShared.splice(idx, 0, false);
    onChange({ ...state, bodies, sharedBoundaries: newShared });
  };

  const addBody = () => {
    const newShared = [...shared, false];
    onChange({
      ...state,
      bodies: [...state.bodies, { id: uid(), name: `Corps ${state.bodies.length + 1}`, width: 80, depth: 30, pieces: [] }],
      sharedBoundaries: newShared,
    });
  };

  const removeBody = (id: string) => {
    const idx = state.bodies.findIndex((b) => b.id === id);
    const newBodies = state.bodies.filter((b) => b.id !== id);
    const newShared = [...shared];
    // Remove the boundary entry for this body
    if (idx > 0) {
      newShared.splice(idx - 1, 1);
    } else if (newShared.length > 0) {
      newShared.splice(0, 1);
    }
    onChange({ ...state, bodies: newBodies, sharedBoundaries: newShared });
  };

  // ---------- TOGGLE JOUE COMMUNE ----------
  const toggleSharing = (boundaryIdx: number, enabled: boolean) => {
    const result = applySharedBoundary(
      state.bodies, boundaryIdx, enabled, shared, th,
      state.project.ceilingHeight, state.project.plinthHeight,
    );
    onChange({ ...state, bodies: result.bodies, sharedBoundaries: result.sharedBoundaries });
  };

  // ---------- display helpers ----------
  const pieceTypeLabel = (type: PieceType): string => {
    const entry = GLOSSARY.find((g) => g.type === type);
    return entry?.label ?? type;
  };

  // Compute total physical width (accounting for shared boundaries)
  const totalPhysical = state.bodies.reduce((s, b) => s + b.width, 0) - shared.filter(Boolean).length * th;

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

            {/* Mini-schéma anatomie */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mt-3">
              <p className="text-[10px] font-semibold text-stone-600 mb-2">ANATOMIE D'UN CORPS (vue de face)</p>
              <svg viewBox="0 0 200 160" className="w-full max-w-[280px] mx-auto" style={{ height: 160 }}>
                <rect x="10" y="5" width="180" height="150" fill="none" stroke="#d6d3d1" strokeWidth="1" strokeDasharray="4,2" />
                <rect x="15" y="10" width="12" height="140" fill="#3b82f6" opacity=".3" stroke="#3b82f6" strokeWidth="1" rx="1" />
                <rect x="173" y="10" width="12" height="140" fill="#3b82f6" opacity=".3" stroke="#3b82f6" strokeWidth="1" rx="1" />
                <rect x="27" y="12" width="146" height="8" fill="#10b981" opacity=".4" stroke="#10b981" strokeWidth="1" rx="1" />
                <rect x="27" y="135" width="146" height="8" fill="#10b981" opacity=".4" stroke="#10b981" strokeWidth="1" rx="1" />
                <line x1="30" y1="55" x2="170" y2="55" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
                <line x1="30" y1="90" x2="170" y2="90" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
                <rect x="10" y="0" width="180" height="6" fill="#8b5cf6" opacity=".3" stroke="#8b5cf6" strokeWidth="0.5" rx="1" />
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
        <div className="grid grid-cols-3 gap-3">
          <NumberInput label="Largeur" suffix="cm" value={state.project.wallWidth} min={10} max={1000} step={0.1} onChange={(v) => updateProject('wallWidth', v)} tip={TIPS['largeur-mur']} />
          <NumberInput label="Profondeur" suffix="cm" value={state.project.wallDepth} min={10} max={200} step={0.1} onChange={(v) => updateProject('wallDepth', v)} tip="Profondeur max disponible pour le meuble (de la face du mur au premier obstacle : radiateur, porte, passage). Les corps ne devraient pas dépasser cette valeur." />
          <NumberInput label="Hauteur" suffix="cm" value={state.project.ceilingHeight} min={10} max={500} step={0.1} onChange={(v) => updateProject('ceilingHeight', v)} tip={TIPS['hauteur-plafond']} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <NumberInput label="Plinthe hauteur" suffix="cm" value={state.project.plinthHeight} min={0} max={50} step={0.1} onChange={(v) => updateProject('plinthHeight', v)} tip={TIPS['hauteur-plinthe']} />
          <NumberInput label="Plinthe profondeur" suffix="cm" value={state.project.plinthDepth} min={0} max={20} step={0.1} onChange={(v) => updateProject('plinthDepth', v)} tip={TIPS['profondeur-plinthe']} />
        </div>
        <p className="text-[10px] text-stone-400 mt-2">Plinthe = 0 si votre meuble n'est pas contre un mur avec plinthe</p>
      </div>

      {/* Epaisseur & charge */}
      {(() => {
        const thicknessMm = state.panel.thickness * 10;
        const availableThicknesses = mat.thicknesses; // [6, 10, 12, 15, 18, 22, 25] etc.

        // Load classification based on max body depth and span
        type LoadLevel = 'leger' | 'standard' | 'lourd';
        const loadLabels: Record<LoadLevel, { label: string; desc: string; icon: string }> = {
          leger: { label: 'Légère', desc: 'Livres de poche, déco, vaisselle fine', icon: '🪶' },
          standard: { label: 'Standard', desc: 'Livres, vêtements, dossiers', icon: '📚' },
          lourd: { label: 'Lourde', desc: 'Outillage, vinyles, collections lourdes', icon: '🏋️' },
        };

        // Determine current load level from thickness
        const inferLoad = (): LoadLevel => {
          if (thicknessMm >= 22) return 'lourd';
          if (thicknessMm >= 18) return 'standard';
          return 'leger';
        };

        // Recommended thickness per load level
        const recommendedMm = (load: LoadLevel): number => {
          switch (load) {
            case 'leger': return availableThicknesses.includes(15) ? 15 : availableThicknesses.includes(12) ? 12 : 18;
            case 'standard': return availableThicknesses.includes(18) ? 18 : availableThicknesses.includes(19) ? 19 : 16;
            case 'lourd': return availableThicknesses.includes(22) ? 22 : availableThicknesses.includes(25) ? 25 : 18;
          }
        };

        // Max recommended span for given thickness (rule of thumb: span ≤ thickness_mm × 3.5 for standard load)
        const maxSpanForThickness = (mm: number): number => {
          // Adjusted by material flex strength
          const factor = mat.flexMPa >= 35 ? 4.5 : mat.flexMPa >= 25 ? 3.8 : mat.flexMPa >= 18 ? 3.2 : 2.8;
          return Math.round(mm * factor);
        };

        const currentLoad = inferLoad();
        const recMm = recommendedMm(currentLoad);
        const maxSpan = maxSpanForThickness(thicknessMm);
        const isUnderThick = thicknessMm < recMm;

        const setLoad = (load: LoadLevel) => {
          const mm = recommendedMm(load);
          updateThickness(mm / 10);
        };

        return (
          <div className={cardClass}>
            <h3 className={sectionTitle}>Épaisseur & charge</h3>

            {/* Load selector */}
            <div className="flex gap-2 mb-3">
              {(Object.entries(loadLabels) as [LoadLevel, typeof loadLabels[LoadLevel]][]).map(([key, val]) => {
                const rec = recommendedMm(key);
                const isActive = thicknessMm === rec || (key === currentLoad && thicknessMm >= rec);
                return (
                  <button
                    key={key}
                    onClick={() => setLoad(key)}
                    className={`flex-1 text-left px-3 py-2.5 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-amber-50 border-amber-300 shadow-sm'
                        : 'bg-white border-stone-200 hover:border-amber-200'
                    }`}
                  >
                    <div className="text-sm">{val.icon} <span className={`font-semibold ${isActive ? 'text-amber-800' : 'text-stone-700'}`}>{val.label}</span></div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{val.desc}</div>
                    <div className={`text-[10px] mt-1 font-mono ${isActive ? 'text-amber-600 font-semibold' : 'text-stone-400'}`}>{rec} mm</div>
                  </button>
                );
              })}
            </div>

            {/* Thickness selector — buttons for available thicknesses */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-stone-500">Épaisseur :</span>
              <div className="flex gap-1 flex-wrap">
                {availableThicknesses
                  .filter(t => t >= 10) // don't show very thin panels as structure
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => updateThickness(t / 10)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all font-mono ${
                        thicknessMm === t
                          ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold shadow-sm'
                          : 'bg-white border-stone-200 text-stone-500 hover:border-amber-200 hover:text-amber-700'
                      }`}
                    >
                      {t}mm
                    </button>
                  ))}
              </div>
            </div>

            {/* Info line */}
            <div className="text-[10px] text-stone-500 space-y-1 mt-2 bg-stone-50 rounded-lg px-3 py-2">
              <div>
                Épaisseur : <span className="font-semibold text-amber-800">{thicknessMm} mm</span>
                {' · '}Portée max tablette : <span className="font-semibold">~{maxSpan} cm</span>
                {' · '}Largeur intérieure : corps − {thicknessMm < 18 ? '2' : '2'}×{thicknessMm}mm de joues
              </div>
              {isUnderThick && (
                <div className="text-yellow-700 font-medium">
                  ⚠ Pour une charge {loadLabels[currentLoad].label.toLowerCase()}, {recMm} mm est recommandé en {mat.short}
                </div>
              )}
              {thicknessMm >= 22 && (
                <div className="text-stone-400">
                  Épaisseur renforcée — poids plus élevé, prévoir fixation murale solide
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Relevé de cotes — visual survey diagram */}
      {(() => {
        const wallW = state.project.wallWidth;
        const ceilH = state.project.ceilingHeight;
        const plinthH = state.project.plinthHeight;
        const bodies = state.bodies;

        // SVG layout constants
        const SVG_W = 580;
        const SVG_H = 200;
        const PAD_L = 48; // left padding for ceiling height label
        const PAD_R = 16;
        const PAD_T = 24; // top padding for wall width label
        const PAD_B = 28; // bottom for plinth height label
        const drawW = SVG_W - PAD_L - PAD_R;
        const drawH = SVG_H - PAD_T - PAD_B;

        // Scale: fit wall into draw area
        const scaleX = drawW / wallW;
        const scaleY = drawH / ceilH;
        const sc = Math.min(scaleX, scaleY);

        const wallPx = wallW * sc;
        const ceilPx = ceilH * sc;
        const plinthPx = plinthH * sc;

        // Center horizontally
        const offsetX = PAD_L + (drawW - wallPx) / 2;
        const offsetY = PAD_T + (drawH - ceilPx) / 2;

        // Bodies placement
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

        // DimLine helper (arrow + label)
        const DimLine = ({ x1, y1, x2, y2, label, color = '#78716c', fontSize = 8 }: {
          x1: number; y1: number; x2: number; y2: number; label: string; color?: string; fontSize?: number;
        }) => {
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
        };

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
                      {/* Body rectangle */}
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

                      {/* Plinth cutout at bottom */}
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

                      {/* Body label */}
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

                      {/* Body width dimension */}
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

                      {/* Shared joue indicator (blue dot between adjacent bodies) */}
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

                {/* Dimension: wall width (top) */}
                <DimLine
                  x1={offsetX} y1={offsetY - 8}
                  x2={offsetX + wallPx} y2={offsetY - 8}
                  label={`${wallW} cm`} color="#78716c"
                />

                {/* Dimension: ceiling height (left) */}
                <DimLine
                  x1={offsetX - 8} y1={offsetY}
                  x2={offsetX - 8} y2={offsetY + ceilPx}
                  label={`${ceilH} cm`} color="#78716c"
                />

                {/* Dimension: plinth height (right side) */}
                {plinthH > 0 && (
                  <DimLine
                    x1={offsetX + wallPx + 6} y1={offsetY + ceilPx - plinthPx}
                    x2={offsetX + wallPx + 6} y2={offsetY + ceilPx}
                    label={`${plinthH}`} color="#a8a29e" fontSize={7}
                  />
                )}

                {/* Dimension: total physical width (bottom) */}
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
      })()}

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

      {/* Total width info */}
      {state.bodies.length > 1 && (
        <div className="text-[10px] text-stone-400 -mt-1 mb-2 px-1">
          Largeur physique totale : <span className="font-semibold">{totalPhysical.toFixed(1)} cm</span>
          {shared.some(Boolean) && (
            <span className="text-amber-600 ml-1">
              (économie de {(shared.filter(Boolean).length * th).toFixed(1)} cm grâce aux joues communes)
            </span>
          )}
        </div>
      )}

      {state.bodies.map((b, bi) => {
        const totalWeight = (
          b.pieces.reduce((s, p) => s + p.length * p.width * p.qty, 0) / 10000
        ) * state.panel.thickness / 100 * mat.density;

        const sl = isSharedLeft(bi, shared);
        const sr = bi < state.bodies.length - 1 && (shared[bi] ?? false);
        const iw = innerWidthOf(bi);

        return (
          <div key={b.id}>
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
                        <div className="flex gap-1 flex-wrap">
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
                          {allPanelDefs.length > 1 && (
                            <select
                              className={inputClass + " !py-1 text-[10px]"}
                              value={p.panelId ?? 'default'}
                              onChange={(e) => updatePiece(b.id, p.id, 'panelId', e.target.value === 'default' ? '' : e.target.value)}
                              title="Panneau pour cette pièce"
                            >
                              {allPanelDefs.map((pd) => (
                                <option key={pd.id} value={pd.id}>{pd.label}</option>
                              ))}
                            </select>
                          )}
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
                          {p.panelId && p.panelId !== 'default' && (
                            <span className="text-[9px] bg-sky-50 text-sky-600 border border-sky-200 rounded px-1 py-0 ml-1">
                              {allPanelDefs.find((pd) => pd.id === p.panelId)?.label ?? p.panelId}
                            </span>
                          )}
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

              {sl && (
                <div className="text-[10px] text-blue-600 mt-1.5 px-1">
                  Joues dans ce corps : {b.pieces.filter(p => p.type === 'joue').length} (+ 1 joue commune fournie par {state.bodies[bi - 1]?.name})
                </div>
              )}

              {/* Filler suggestion */}
              {(() => {
                const cH = state.project.ceilingHeight;
                // Max joue height in this body (sum of haut+bas pairs, or single joue)
                const joues = b.pieces.filter(p => p.type === 'joue');
                const maxJoueH = joues.length > 0
                  ? Math.max(...joues.map(j => j.length))
                  : 0;
                // Total joue height: if pairs (haut+bas), sum them. Otherwise use max.
                const jouePairs = Math.floor(joues.length / 2);
                let totalJoueH = maxJoueH;
                if (jouePairs >= 1 && joues.length >= 2) {
                  // Assume pairs: sort by length desc, take first two as pair
                  const sorted = [...joues].sort((a, b2) => b2.length - a.length);
                  // Sum the highest pair (typically haut + bas)
                  const sums: number[] = [];
                  for (let k = 0; k < sorted.length - 1; k += 2) {
                    sums.push(sorted[k].length + sorted[k + 1].length);
                  }
                  totalJoueH = Math.max(...sums, maxJoueH);
                }
                const gapTop = +(cH - totalJoueH).toFixed(1);
                const hasTopGap = gapTop > 1 && totalJoueH > 0 && totalJoueH < cH;
                // Only show fillers when joues exist and don't reach the ceiling
                const hasFiller = b.pieces.some(p => /filler|remplissage|tasseau plafond/i.test(p.name));

                if (!hasTopGap || hasFiller) return null;

                const fillerPieces = () => {
                  const pieces = [
                    // Tasseau de fixation au plafond : vissé au plafond, sert d'accroche
                    { id: uid(), name: `Tasseau plafond ${b.name}`, length: iw, width: 4, qty: 1, type: 'tablette-fixe' as PieceType },
                    // Bandeau de finition : couvre le gap visible de face
                    { id: uid(), name: `Bandeau haut ${b.name}`, length: b.width, width: gapTop, qty: 1, type: 'bandeau' as PieceType },
                    // Plaquettes latérales : comblent le gap sur les côtés
                  ];
                  // If the body has depth > 8cm, add side fillers
                  if (b.depth > 8) {
                    pieces.push({
                      id: uid(), name: `Remplissage latéral ${b.name}`, length: gapTop, width: b.depth, qty: sl ? 1 : 2, type: 'autre' as PieceType
                    });
                  }
                  return pieces;
                };

                const addFillers = () => {
                  onChange({
                    ...state,
                    bodies: state.bodies.map((body) =>
                      body.id === b.id
                        ? { ...body, pieces: [...body.pieces, ...fillerPieces()] }
                        : body
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
              })()}

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
                <button onClick={() => addPiece(b.id, 'bandeau')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Bandeau</button>
                <button onClick={() => addPiece(b.id, 'fond')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Fond</button>
                <button onClick={() => addPiece(b.id, 'autre')} className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors">+ Autre</button>
              </div>

              {/* Door Configurator */}
              <DoorConfigurator body={b} bodyIndex={bi} state={state} onChange={onChange} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
