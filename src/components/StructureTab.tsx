import { useState } from 'react';
import type { AppState, MaterialKey, PieceType, Body, DoorPoseType, DoorConfig, PanelDef } from '../types';
import { MATERIALS, PIECE_COLORS, BODY_COLORS, PIECE_TYPES } from '../data/materials';
import { uid, parseNumber, clampInt, calculateDoor, getBodyInnerWidth, isSharedLeft } from '../lib/helpers';
import Tip from './Tip';
import TIPS from '../data/tips';

interface Props {
  state: AppState;
  onChange: (state: AppState) => void;
  allPanelDefs: PanelDef[];
}

// Presets for common extra panels
const EXTRA_PANEL_PRESETS: { label: string; def: Omit<PanelDef, 'id'> }[] = [
  { label: 'Fond CP 6mm', def: { label: 'CP 6mm', width: 250, height: 122, thickness: 0.6, price: 25 } },
  { label: 'HDF 3mm', def: { label: 'HDF 3mm', width: 244, height: 122, thickness: 0.3, price: 8 } },
  { label: 'CP Peuplier 10mm', def: { label: 'CP 10mm', width: 250, height: 122, thickness: 1.0, price: 35 } },
  { label: 'MDF 12mm', def: { label: 'MDF 12mm', width: 244, height: 122, thickness: 1.2, price: 18 } },
];

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
// Helpers joue commune
// ---------------------------------------------------------------------------

/** Identifie les joues "gauche" par nom */
function findLeftJoueIds(pieces: Body['pieces']): string[] {
  const byName = pieces.filter(p => p.type === 'joue' && /gauche|\bG\s*[—–-]/i.test(p.name)).map(p => p.id);
  if (byName.length > 0) return byName;
  // Fallback : pas de nom reconnaissable → prendre la première moitié des joues
  const joues = pieces.filter(p => p.type === 'joue');
  if (joues.length <= 1) {
    // Un seul morceau de joue avec qty ≥ 2 → on ne supprime pas la pièce, on réduira la qty
    return [];
  }
  return joues.slice(0, Math.ceil(joues.length / 2)).map(p => p.id);
}

function findRightJoues(pieces: Body['pieces']) {
  const byName = pieces.filter(p => p.type === 'joue' && /droite|\bD\s*[—–-]/i.test(p.name));
  if (byName.length > 0) return byName;
  const joues = pieces.filter(p => p.type === 'joue');
  return joues.slice(Math.floor(joues.length / 2));
}

// ---------------------------------------------------------------------------
// Configurateur de portes pour un corps
// ---------------------------------------------------------------------------
function DoorConfigurator({ body, bodyIndex, state, onChange }: {
  body: Body; bodyIndex: number; state: AppState; onChange: (state: AppState) => void;
}) {
  const usableHeight = state.project.ceilingHeight - state.project.plinthHeight;
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

        const dims = calculateDoor(b.width, usableHeight, thickness, newConfig.count, newConfig.poseType, innerW);
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

  const doorInfo = config ? calculateDoor(body.width, usableHeight, thickness, config.count, config.poseType, innerW) : null;

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
      bodies: state.bodies.map((b, i) => {
        if (b.id !== id) return b;
        const updated = { ...b, [key]: value };

        if (key === 'width' || key === 'depth') {
          const newWidth = key === 'width' ? (value as number) : b.width;
          const newDepth = key === 'depth' ? (value as number) : b.depth;
          const oldWidth = b.width;
          const oldDepth = b.depth;
          const thickness = state.panel.thickness;

          // Sharing-aware inner width
          const sl = isSharedLeft(i, shared);
          const leftTh = sl ? 0 : thickness;
          const innerWidth = +(newWidth - leftTh - thickness).toFixed(1);
          const oldInnerWidth = +(oldWidth - leftTh - thickness).toFixed(1);

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
              // recalculated via door config below
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

          // Recalculate doors
          if (b.doorConfig) {
            const usableH = state.project.ceilingHeight - state.project.plinthHeight;
            const dims = calculateDoor(newWidth, usableH, thickness, b.doorConfig.count, b.doorConfig.poseType, innerWidth);
            updated.pieces = updated.pieces.map((p) => {
              if (p.type === 'porte') return { ...p, length: dims.doorHeight, width: dims.doorWidth };
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
          ? { ...b, pieces: b.pieces.map((p) => {
              if (p.id !== pieceId) return p;
              // panelId: '' or 'default' → undefined (use main panel)
              if (key === 'panelId') {
                const v = value === '' || value === 'default' ? undefined : String(value);
                return { ...p, panelId: v };
              }
              const updated = { ...p, [key]: value };
              // Auto-detect piece type from name (only if current type is 'autre')
              if (key === 'name' && p.type === 'autre') {
                const n = String(value).toLowerCase();
                if (/joue/i.test(n)) updated.type = 'joue';
                else if (/tablette\s*fixe|tabl\.\s*fixe/i.test(n)) updated.type = 'tablette-fixe';
                else if (/tablette\s*r[ée]glable|tabl\.\s*r[ée]g/i.test(n)) updated.type = 'tablette-reglable';
                else if (/bandeau/i.test(n)) updated.type = 'bandeau';
                else if (/porte/i.test(n)) updated.type = 'porte';
                else if (/tiroir|fa[çc]ade/i.test(n)) updated.type = 'tiroir-facade';
                else if (/fond|dos/i.test(n)) updated.type = 'fond';
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
    const usableH = state.project.ceilingHeight - state.project.plinthHeight;
    const cH = state.project.ceilingHeight;
    const type: PieceType = pieceType ?? 'autre';

    let name = 'Nouvelle pièce';
    let length = 50;
    let width = body.depth;
    let qty = 1;
    let panelId: string | undefined;

    switch (type) {
      case 'joue':
        name = 'Joue'; length = cH; width = body.depth; break;
      case 'tablette-fixe':
        name = 'Tablette fixe'; length = iw; width = body.depth; break;
      case 'tablette-reglable':
        name = 'Tablette réglable'; length = iw; width = body.depth; break;
      case 'bandeau':
        name = 'Bandeau'; length = body.width; width = 10; break;
      case 'porte':
        name = 'Porte'; length = usableH; width = body.width; break;
      case 'fond': {
        name = 'Fond'; length = cH; width = body.width;
        // Auto-assign to first extra panel with thickness < 1cm if available
        const thinPanel = allPanelDefs.find((pd) => pd.thickness < 1);
        if (thinPanel) panelId = thinPanel.id;
        break;
      }
      default:
        name = 'Nouvelle pièce'; length = 50; width = body.depth; break;
    }

    const piece: Body['pieces'][number] = { id: uid(), name, length, width, qty, type, ...(panelId ? { panelId } : {}) };
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
    const cH = state.project.ceilingHeight;
    const iw = innerWidthOf(bi);
    const sl = isSharedLeft(bi, shared);
    const basHeight = 180;
    const hautHeight = +(cH - basHeight).toFixed(1);
    const depth = body.depth;

    const pieces: Body['pieces'] = [];

    // Joues gauche (sauf si joue partagée à gauche)
    if (!sl) {
      pieces.push({ id: uid(), name: 'Joue G — bas', length: basHeight, width: depth, qty: 1, type: 'joue' as PieceType });
      pieces.push({ id: uid(), name: 'Joue G — haut', length: hautHeight, width: depth, qty: 1, type: 'joue' as PieceType });
    }

    // Joues droite
    pieces.push({ id: uid(), name: 'Joue D — bas', length: basHeight, width: depth, qty: 1, type: 'joue' as PieceType });
    pieces.push({ id: uid(), name: 'Joue D — haut', length: hautHeight, width: depth, qty: 1, type: 'joue' as PieceType });

    // Tablettes fixes
    pieces.push({ id: uid(), name: 'Tablette fixe basse', length: iw, width: depth, qty: 1, type: 'tablette-fixe' as PieceType });
    pieces.push({ id: uid(), name: 'Tablette fixe haute', length: iw, width: depth, qty: 1, type: 'tablette-fixe' as PieceType });

    // Tablettes réglables
    pieces.push({ id: uid(), name: 'Tablette réglable 1', length: iw, width: depth, qty: 1, type: 'tablette-reglable' as PieceType });
    pieces.push({ id: uid(), name: 'Tablette réglable 2', length: iw, width: depth, qty: 1, type: 'tablette-reglable' as PieceType });
    pieces.push({ id: uid(), name: 'Tablette réglable 3', length: iw, width: depth, qty: 1, type: 'tablette-reglable' as PieceType });

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

  // ---------- EXTRA PANELS ----------
  const addExtraPanel = (preset?: Omit<PanelDef, 'id'>) => {
    const base = preset ?? { label: 'Panneau', width: 250, height: 122, thickness: 0.6, price: 0 };
    const newPanel: PanelDef = { ...base, id: uid() };
    onChange({ ...state, extraPanels: [...(state.extraPanels ?? []), newPanel] });
  };

  const updateExtraPanel = (id: string, key: keyof PanelDef, value: string | number) => {
    onChange({
      ...state,
      extraPanels: (state.extraPanels ?? []).map((p) => p.id === id ? { ...p, [key]: value } : p),
    });
  };

  const removeExtraPanel = (id: string) => {
    // Remove panelId references from pieces that used this panel
    const newBodies = state.bodies.map((b) => ({
      ...b,
      pieces: b.pieces.map((p) => p.panelId === id ? { ...p, panelId: undefined } : p),
    }));
    onChange({
      ...state,
      bodies: newBodies,
      extraPanels: (state.extraPanels ?? []).filter((p) => p.id !== id),
    });
  };

  // ---------- TOGGLE JOUE COMMUNE ----------
  const toggleSharing = (boundaryIdx: number, enabled: boolean) => {
    const wasEnabled = shared[boundaryIdx] ?? false;
    if (wasEnabled === enabled) return;

    const newShared = [...shared];
    while (newShared.length < state.bodies.length - 1) newShared.push(false);
    newShared[boundaryIdx] = enabled;

    const usableH = state.project.ceilingHeight - state.project.plinthHeight;
    const newBodies = state.bodies.map((b) => ({
      ...b,
      pieces: b.pieces.map((p) => ({ ...p })),
    }));

    const leftBody = newBodies[boundaryIdx];
    const rightBody = newBodies[boundaryIdx + 1];

    if (enabled) {
      // ===== ACTIVER LA JOUE COMMUNE =====
      // 1. Élargir les deux corps pour compenser la joue supprimée (maintenir la largeur totale)
      leftBody.width = +(leftBody.width + th / 2).toFixed(1);
      rightBody.width = +(rightBody.width + th / 2).toFixed(1);

      // 2. Supprimer les joues gauche du corps droit
      const leftJoueIds = findLeftJoueIds(rightBody.pieces);
      if (leftJoueIds.length > 0) {
        rightBody.pieces = rightBody.pieces.filter((p) => !leftJoueIds.includes(p.id));
      } else {
        // Fallback : joue unique avec qty ≥ 2 → réduire la qty
        const joues = rightBody.pieces.filter((p) => p.type === 'joue');
        if (joues.length === 1 && joues[0].qty >= 2) {
          joues[0].qty = Math.ceil(joues[0].qty / 2);
        } else if (joues.length >= 2) {
          const half = Math.ceil(joues.length / 2);
          const removeIds = new Set(joues.slice(0, half).map((p) => p.id));
          rightBody.pieces = rightBody.pieces.filter((p) => !removeIds.has(p.id));
        }
      }

      // 3. Joue commune = joue droite du corps gauche → adapter la profondeur au max
      if (leftBody.depth !== rightBody.depth) {
        const maxD = Math.max(leftBody.depth, rightBody.depth);
        const rightJoues = findRightJoues(leftBody.pieces);
        rightJoues.forEach((j) => { j.width = maxD; });
        // Si aucune joue droite identifiable, mettre à jour toutes les joues
        if (rightJoues.length === 0) {
          leftBody.pieces.filter(p => p.type === 'joue').forEach(j => { j.width = maxD; });
        }
      }
    } else {
      // ===== DÉSACTIVER LA JOUE COMMUNE =====
      // 1. Réduire les largeurs
      leftBody.width = +(leftBody.width - th / 2).toFixed(1);
      rightBody.width = +(rightBody.width - th / 2).toFixed(1);

      // 2. Rajouter les joues gauche au corps droit
      const rightJoues = findRightJoues(rightBody.pieces);
      if (rightJoues.length > 0) {
        const newLeftJoues = rightJoues.map((p) => ({
          ...p,
          id: uid(),
          name: p.name.replace(/droite/gi, 'gauche').replace(/D\s*([—–-])/g, 'G $1'),
          width: rightBody.depth,
        }));
        rightBody.pieces = [...newLeftJoues, ...rightBody.pieces];
      } else {
        // Fallback : qty doublée ou ajout standard
        const joues = rightBody.pieces.filter((p) => p.type === 'joue');
        if (joues.length === 1) {
          joues[0].qty *= 2;
        } else if (joues.length === 0) {
          rightBody.pieces.unshift({
            id: uid(), name: 'Joue gauche', length: usableH, width: rightBody.depth, qty: 1, type: 'joue' as PieceType,
          });
        }
      }

      // 3. Réinitialiser la profondeur des joues droite du corps gauche
      findRightJoues(leftBody.pieces).forEach((j) => { j.width = leftBody.depth; });
    }

    // 4. Recalculer tablettes et portes de TOUS les corps
    const finalBodies = newBodies.map((b, i) => {
      const sl = isSharedLeft(i, newShared);
      const leftTh = sl ? 0 : th;
      const iw = +(b.width - leftTh - th).toFixed(1);

      b.pieces = b.pieces.map((p) => {
        if (p.type === 'tablette-fixe' || p.type === 'tablette-reglable') {
          return { ...p, length: iw };
        }
        return p;
      });

      if (b.doorConfig) {
        const dims = calculateDoor(b.width, usableH, th, b.doorConfig.count, b.doorConfig.poseType, iw);
        b.pieces = b.pieces.map((p) => {
          if (p.type === 'porte') return { ...p, length: dims.doorHeight, width: dims.doorWidth };
          return p;
        });
      }

      return b;
    });

    onChange({ ...state, bodies: finalBodies, sharedBoundaries: newShared });
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

      {/* Extra Panels */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-2">
          <Tip text="Panneaux secondaires pour fonds, tiroirs, etc. — épaisseurs différentes du panneau principal.">
            <h3 className={sectionTitle + " mb-0"}>Panneaux secondaires ({(state.extraPanels ?? []).length})</h3>
          </Tip>
        </div>
        <p className="text-[10px] text-stone-400 mb-3">
          Ajoutez des panneaux d'épaisseurs différentes (fonds 6mm, HDF 3mm…). Les pièces assignées seront calepinées séparément.
        </p>

        {(state.extraPanels ?? []).map((ep) => (
          <div key={ep.id} className="flex items-center gap-2 mb-2 p-2 bg-stone-50 rounded-xl border border-stone-200">
            <input
              className={inputClass + " !py-1.5 w-24"}
              value={ep.label}
              onChange={(e) => updateExtraPanel(ep.id, 'label', e.target.value)}
              placeholder="Nom"
            />
            <input
              type="number"
              step="1"
              min={10}
              className={inputClass + " !py-1.5 w-16 text-center"}
              value={ep.width}
              onChange={(e) => updateExtraPanel(ep.id, 'width', parseNumber(e.target.value, ep.width, 10))}
              title="Largeur (cm)"
            />
            <span className="text-[10px] text-stone-400">×</span>
            <input
              type="number"
              step="1"
              min={10}
              className={inputClass + " !py-1.5 w-16 text-center"}
              value={ep.height}
              onChange={(e) => updateExtraPanel(ep.id, 'height', parseNumber(e.target.value, ep.height, 10))}
              title="Hauteur (cm)"
            />
            <span className="text-[10px] text-stone-400">ép.</span>
            <input
              type="number"
              step="0.1"
              min={0.1}
              className={inputClass + " !py-1.5 w-14 text-center"}
              value={ep.thickness}
              onChange={(e) => updateExtraPanel(ep.id, 'thickness', parseNumber(e.target.value, ep.thickness, 0.1))}
              title="Épaisseur (cm)"
            />
            <span className="text-[10px] text-stone-400">cm</span>
            <input
              type="number"
              step="1"
              min={0}
              className={inputClass + " !py-1.5 w-14 text-center"}
              value={ep.price}
              onChange={(e) => updateExtraPanel(ep.id, 'price', parseNumber(e.target.value, ep.price, 0))}
              title="Prix €/panneau"
            />
            <span className="text-[10px] text-stone-400">€</span>
            <button
              onClick={() => removeExtraPanel(ep.id)}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
              title="Supprimer ce panneau"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="flex flex-wrap gap-1.5 mt-2">
          {EXTRA_PANEL_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => addExtraPanel(preset.def)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-500 hover:text-amber-700 hover:bg-amber-50 border border-stone-200 hover:border-amber-200 transition-all"
            >
              + {preset.label}
            </button>
          ))}
          <button
            onClick={() => addExtraPanel()}
            className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-400 hover:text-stone-600 border border-dashed border-stone-300 hover:border-stone-400 transition-all"
          >
            + Personnalisé
          </button>
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
              {(sl || sr) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {sl && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                      ⚙ Joue G commune avec {state.bodies[bi - 1]?.name}
                    </span>
                  )}
                  {sr && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                      ⚙ Joue D commune avec {state.bodies[bi + 1]?.name}
                    </span>
                  )}
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
