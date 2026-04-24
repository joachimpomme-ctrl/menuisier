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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#695f56] mb-2">
          <Tip text={TIPS['densite']}><span>{mat.density} kg/m³</span></Tip>
          <Tip text={TIPS['flexMPa']}><span>{mat.flexMPa} MPa</span></Tip>
          <Tip text={TIPS['portee-max']}><span>Portée max {mat.maxSpan18} cm</span></Tip>
          <Tip text={TIPS['vis']}><span>Vis: {mat.screwHolding}</span></Tip>
        </div>
        <p className="text-xs text-[#695f56]">{mat.notes}</p>
        {mat.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {mat.warnings.map((w, i) => (
              <p key={i} className="text-xs text-[#695f56]">⚠ {w}</p>
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
        <p className="text-[10px] text-[#9d9089] mt-2">Plinthe = 0 si votre meuble n'est pas contre un mur avec plinthe</p>
      </div>

      {/* Épaisseur & charge */}
      {(() => {
        const thicknessMm = state.panel.thickness * 10;
        const availableThicknesses = mat.thicknesses;

        type LoadLevel = 'leger' | 'standard' | 'lourd';
        const loadLabels: Record<LoadLevel, { label: string; desc: string }> = {
          leger:    { label: 'Légère',   desc: 'Livres de poche, déco, vaisselle fine'  },
          standard: { label: 'Standard', desc: 'Livres, vêtements, dossiers'            },
          lourd:    { label: 'Lourde',   desc: 'Outillage, vinyles, collections lourdes' },
        };

        const inferLoad = (): LoadLevel => {
          if (thicknessMm >= 22) return 'lourd';
          if (thicknessMm >= 18) return 'standard';
          return 'leger';
        };

        const recommendedMm = (load: LoadLevel): number => {
          switch (load) {
            case 'leger':    return availableThicknesses.includes(15) ? 15 : availableThicknesses.includes(12) ? 12 : 18;
            case 'standard': return availableThicknesses.includes(18) ? 18 : availableThicknesses.includes(19) ? 19 : 16;
            case 'lourd':    return availableThicknesses.includes(22) ? 22 : availableThicknesses.includes(25) ? 25 : 18;
          }
        };

        const maxSpanForThickness = (mm: number): number => {
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

            <div className="flex gap-2 mb-3">
              {(Object.entries(loadLabels) as [LoadLevel, typeof loadLabels[LoadLevel]][]).map(([key, val]) => {
                const rec = recommendedMm(key);
                const isActive = thicknessMm === rec || (key === currentLoad && thicknessMm >= rec);
                return (
                  <button
                    key={key}
                    onClick={() => setLoad(key)}
                    className={`flex-1 text-left px-3 py-2.5 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-[#f2ebe0] border-[#6b4c2a] shadow-sm'
                        : 'bg-white border-[#e0d8ce] hover:border-[#c8bfb3]'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${isActive ? 'text-[#6b4c2a]' : 'text-[#1c1714]'}`}>{val.label}</div>
                    <div className="text-[10px] text-[#9d9089] mt-0.5">{val.desc}</div>
                    <div className={`text-[10px] mt-1 font-mono ${isActive ? 'text-[#6b4c2a] font-semibold' : 'text-[#9d9089]'}`}>{rec} mm</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[#695f56]">Épaisseur :</span>
              <div className="flex gap-1 flex-wrap">
                {availableThicknesses
                  .filter(t => t >= 10)
                  .map((t) => (
                    <button
                      key={t}
                      onClick={() => updateThickness(t / 10)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all font-mono ${
                        thicknessMm === t
                          ? 'bg-[#f2ebe0] border-[#6b4c2a] text-[#6b4c2a] font-bold shadow-sm'
                          : 'bg-white border-[#e0d8ce] text-[#695f56] hover:border-[#c8bfb3] hover:text-[#6b4c2a]'
                      }`}
                    >
                      {t}mm
                    </button>
                  ))}
              </div>
            </div>

            <div className="text-[10px] text-[#695f56] space-y-1 mt-2 bg-[#faf8f4] rounded-lg px-3 py-2">
              <div>
                Épaisseur : <span className="font-semibold text-[#6b4c2a]">{thicknessMm} mm</span>
                {' · '}Portée max tablette : <span className="font-semibold">~{maxSpan} cm</span>
                {' · '}Largeur intérieure : corps − 2×{thicknessMm}mm de joues
              </div>
              {isUnderThick && (
                <div className="text-[#695f56] font-medium">
                  Pour une charge {loadLabels[currentLoad].label.toLowerCase()}, {recMm} mm est recommandé en {mat.short}
                </div>
              )}
              {thicknessMm >= 22 && (
                <div className="text-[#9d9089]">
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
              className="text-xs px-3 py-2 rounded-lg bg-white text-[#6b4c2a] border border-[#e0d8ce] hover:bg-[#f2ebe0] font-medium transition-colors"
            >
              Remplir la largeur
            </button>
          )}
          <button
            onClick={addBody}
            className="text-xs px-4 py-2 rounded-lg bg-[#6b4c2a] text-white font-medium hover:bg-[#5a3e22] transition-colors"
          >
            + Ajouter un corps
          </button>
        </div>
      </div>

      {state.bodies.length > 1 && (
        <div className="text-[10px] text-[#9d9089] -mt-1 mb-2 px-1">
          Largeur physique totale : <span className="font-semibold">{totalPhysical.toFixed(1)} cm</span>
          {' / '}
          cible mur : <span className="font-semibold">{state.project.wallWidth.toFixed(1)} cm</span>
          {Math.abs(totalPhysical - state.project.wallWidth) > 0.05 && (
            <span className="text-[#695f56] ml-1">
              (écart {Math.abs(state.project.wallWidth - totalPhysical).toFixed(1)} cm)
            </span>
          )}
          {shared.some(Boolean) && (
            <span className="text-[#695f56] ml-1">
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
