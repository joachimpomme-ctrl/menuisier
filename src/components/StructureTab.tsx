import { useState } from 'react';
import type { AppState, MaterialKey, PieceType, Body, PanelDef } from '../types';
import { MATERIALS } from '../data/materials';
import { projectActions, bodyActions, pieceActions } from '../lib/actions';
import Tip from './Tip';
import TIPS from '../data/tips';
import NumberInput from './structure/NumberInput';
import Glossary from './structure/Glossary';
import WallSurveyDiagram from './structure/WallSurveyDiagram';
import BodyCard from './structure/BodyCard';
import PartsPicker from './library/PartsPicker';
import { inputClass, cardClass, sectionTitle } from './structure/styles';

interface Props {
  state: AppState;
  onChange: (state: AppState) => void;
  allPanelDefs: PanelDef[];
}

export default function StructureTab({ state, onChange, allPanelDefs }: Props) {
  const [editingPiece, setEditingPiece] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerBodyId, setPickerBodyId] = useState<string | null>(null);
  const mat = MATERIALS[state.materialKey];
  const shared = state.sharedBoundaries ?? [];

  // ---------- thin shells over actions layer ----------
  const updateProject = (key: string, value: number) =>
    onChange(projectActions.updateProject(state, key, value));

  const updateThickness = (value: number) =>
    onChange(projectActions.updateThickness(state, value));

  const changeMaterial = (key: MaterialKey) =>
    onChange(projectActions.changeMaterial(state, key));

  const updateBody = (id: string, key: keyof Body, value: string | number) =>
    onChange(bodyActions.updateBody(state, id, key, value));

  const updatePiece = (bodyId: string, pieceId: string, key: string, value: string | number) =>
    onChange(pieceActions.updatePiece(state, bodyId, pieceId, key, value));

  const addPiece = (bodyId: string, pieceType?: PieceType) =>
    onChange(pieceActions.addPiece(state, bodyId, pieceType, allPanelDefs));

  const openLibraryPicker = (bodyId: string) => {
    setPickerBodyId(bodyId);
    setShowPicker(true);
  };

  const autoFillPieces = (bodyId: string) => {
    const body = state.bodies.find((b) => b.id === bodyId);
    if (!body) return;
    if (body.pieces.length > 0) {
      if (!confirm('Ce corps contient déjà des pièces. Voulez-vous les remplacer par les pièces standard ?')) return;
    }
    onChange(pieceActions.autoFillPieces(state, bodyId));
  };

  const removePiece = (bodyId: string, pieceId: string) =>
    onChange(pieceActions.removePiece(state, bodyId, pieceId));

  const duplicateBody = (id: string) => onChange(bodyActions.duplicateBody(state, id));

  const addBody = () => onChange(bodyActions.addBody(state));

  const autoFillBodyWidths = () => onChange(bodyActions.autoFillBodyWidths(state));

  const removeBody = (id: string) => onChange(bodyActions.removeBody(state, id));

  const toggleSharing = (boundaryIdx: number, enabled: boolean) =>
    onChange(bodyActions.toggleSharing(state, boundaryIdx, enabled));

  // Shared sides are fused into a thicker common panel, so total physical width stays unchanged.
  const totalPhysical = state.bodies.reduce((s, b) => s + b.width, 0);

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
        <div className="flex items-center gap-2">
          {state.bodies.length > 1 && (
            <button
              onClick={autoFillBodyWidths}
              className="text-xs px-3 py-2 rounded-lg bg-white text-amber-700 border border-amber-200 hover:bg-amber-50 font-medium transition-colors"
            >
              Remplir la largeur
            </button>
          )}
          <button
            onClick={addBody}
            className="text-xs px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors"
          >
            + Ajouter un corps
          </button>
        </div>
      </div>

      {/* Total width info */}
      {state.bodies.length > 1 && (
        <div className="text-[10px] text-stone-400 -mt-1 mb-2 px-1">
          Largeur physique totale : <span className="font-semibold">{totalPhysical.toFixed(1)} cm</span>
          {' / '}
          cible mur : <span className="font-semibold">{state.project.wallWidth.toFixed(1)} cm</span>
          {Math.abs(totalPhysical - state.project.wallWidth) > 0.05 && (
            <span className="text-amber-600 ml-1">
              (écart {Math.abs(state.project.wallWidth - totalPhysical).toFixed(1)} cm)
            </span>
          )}
          {shared.some(Boolean) && (
            <span className="text-amber-600 ml-1">
              (joues communes fusionnées en épaisseur double aux jonctions)
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
          openLibraryPicker={openLibraryPicker}
          autoFillPieces={autoFillPieces}
          removePiece={removePiece}
          toggleSharing={toggleSharing}
        />
      ))}

      <PartsPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(part) => {
          if (pickerBodyId) {
            onChange(pieceActions.addPieceFromLibrary(state, pickerBodyId, part));
          }
          setShowPicker(false);
        }}
      />
    </div>
  );
}
