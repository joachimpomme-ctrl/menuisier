import { useState } from 'react';
import type { AppState, MaterialKey, PieceType, Body, PanelDef } from '../types';
import { MATERIALS } from '../data/materials';
import { uid, getBodyInnerWidth } from '../lib/helpers';
import { createPiece, detectPieceType, generateStandardPieces, applySharedBoundary, recalcBodyPieces } from '../lib/domain';
import Tip from './Tip';
import TIPS from '../data/tips';
import NumberInput from './structure/NumberInput';
import Glossary from './structure/Glossary';
import WallSurveyDiagram from './structure/WallSurveyDiagram';
import BodyCard from './structure/BodyCard';
import { inputClass, cardClass, sectionTitle } from './structure/styles';

interface Props {
  state: AppState;
  onChange: (state: AppState) => void;
  allPanelDefs: PanelDef[];
}

export default function StructureTab({ state, onChange, allPanelDefs }: Props) {
  const [editingPiece, setEditingPiece] = useState<string | null>(null);
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
              // thickness: '' → undefined (revert to panel default)
              if (key === 'thickness') {
                const { thickness: _t, ...rest } = p;
                if (value === '' || value === 0) return rest as typeof p;
                return { ...p, thickness: Number(value) };
              }
              // posY/posX: '' → undefined (auto-distribué par le rendu)
              if (key === 'posY') {
                const { posY: _y, ...rest } = p;
                if (value === '') return rest as typeof p;
                return { ...p, posY: Number(value) };
              }
              if (key === 'posX') {
                const { posX: _x, ...rest } = p;
                if (value === '') return rest as typeof p;
                return { ...p, posX: Number(value) };
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

  // Compute total physical width (accounting for shared boundaries)
  const totalPhysical = state.bodies.reduce((s, b) => s + b.width, 0) - shared.filter(Boolean).length * th;

  return (
    <div className="space-y-4">
      <Glossary />

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

      <WallSurveyDiagram state={state} totalPhysical={totalPhysical} />

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

      {state.bodies.map((b, bi) => (
        <BodyCard
          key={b.id}
          body={b}
          bodyIndex={bi}
          state={state}
          allPanelDefs={allPanelDefs}
          editingPiece={editingPiece}
          setEditingPiece={setEditingPiece}
          onChange={onChange}
          updateBody={updateBody}
          duplicateBody={duplicateBody}
          removeBody={removeBody}
          updatePiece={updatePiece}
          addPiece={addPiece}
          autoFillPieces={autoFillPieces}
          removePiece={removePiece}
          toggleSharing={toggleSharing}
        />
      ))}
    </div>
  );
}
