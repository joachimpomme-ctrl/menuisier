import { useState } from 'react';
import type { AppState, MaterialKey } from '../types';
import type { ProjectIntent } from '../lib/knowledge/types';
import type { PipelineResult } from '../lib/engine/pipeline';
import { MATERIALS } from '../data/materials';
import { TEMPLATES } from '../data/templates';
import BriefIA from './wizard/BriefIA';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (state: AppState) => void;
  onV3?: () => void;
  onBriefIAResult?: (intent: ProjectIntent, result: PipelineResult, materialKey: MaterialKey) => void;
}

export default function NewProjectWizard({ isOpen, onClose, onCreate, onV3, onBriefIAResult }: Props) {
  const [view, setView] = useState<'choice' | 'brief-ia' | 'modeles'>('choice');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialKey>('cp_bouleau');

  if (!isOpen) return null;

  const handleTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    onCreate(tpl.create(selectedMaterial));
  };

  const handleBlank = () => {
    const m = MATERIALS[selectedMaterial];
    const p = m.panels[0];
    onCreate({
      materialKey: selectedMaterial,
      project: { name: 'Mon meuble', wallWidth: 200, wallDepth: 60, ceilingHeight: 250, plinthHeight: 0, plinthDepth: 0 },
      panel: { width: p.w, height: p.h, thickness: m.defaultThickness / 10 },
      kerf: 0.3,
      costConfig: { panelPrice: p.defaultPrice },
      bodies: [],
    });
  };

  const inputClass = "w-full rounded-lg border border-[#e0d8ce] bg-white px-3 py-2 text-sm text-[#1c1714] focus:border-[#6b4c2a] focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1714]/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-[#e0d8ce] bg-white shadow-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0d8ce]">
          <div className="flex items-center gap-2">
            {view !== 'choice' && (
              <button
                onClick={() => setView('choice')}
                className="text-[#9d9089] hover:text-[#695f56] mr-1"
                aria-label="Retour"
              >
                ←
              </button>
            )}
            <h3 className="text-[#1c1714] font-semibold text-sm">
              {view === 'choice' ? 'Nouveau projet' : view === 'brief-ia' ? 'Brief IA' : 'Partir d\'un modèle'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#9d9089] hover:text-[#695f56] w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#faf8f4] transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">

        {/* ===== CHOICE VIEW ===== */}
        {view === 'choice' && (
          <div className="p-5 space-y-3">

            {/* Card 1 — Brief IA (recommended) */}
            <button
              onClick={() => setView('brief-ia')}
              className="w-full text-left rounded-lg border-2 border-[#6b4c2a] hover:bg-[#faf8f4] transition-colors overflow-hidden"
            >
              {/* Illustration header */}
              <div className="bg-[#f2ebe0] px-5 py-4 flex items-center gap-4">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="6" y="8" width="36" height="26" rx="6" fill="#6b4c2a" opacity=".15"/>
                  <rect x="6" y="8" width="36" height="26" rx="6" stroke="#6b4c2a" strokeWidth="1.5"/>
                  <path d="M14 20h20M14 26h14" stroke="#6b4c2a" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M18 34l-4 6h8l-4-6z" fill="#6b4c2a" opacity=".4"/>
                  <circle cx="36" cy="10" r="7" fill="#2f6144"/>
                  <path d="M33 10l2 2 4-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-[#6b4c2a]">Recommandé</span>
                  <p className="text-[15px] font-bold text-[#1c1714] mt-0.5">Je décris ce que je range</p>
                </div>
              </div>
              {/* Body */}
              <div className="px-5 py-3">
                <p className="text-xs text-[#695f56] mb-2">Décrivez votre besoin en quelques mots, l'IA propose 2–3 variantes adaptées.</p>
                <div className="flex gap-2">
                  <span className="text-[11px] bg-[#f2ebe0] text-[#6b4c2a] rounded px-2 py-0.5 font-medium">Sans expertise</span>
                  <span className="text-[11px] bg-[#f2ebe0] text-[#6b4c2a] rounded px-2 py-0.5 font-medium">Variantes IA</span>
                </div>
              </div>
            </button>

            {/* Card 2 — Wizard classique */}
            {onV3 && (
              <button
                onClick={() => { onClose(); onV3(); }}
                className="w-full text-left rounded-lg border border-[#e0d8ce] hover:border-[#c8bfb3] hover:bg-[#faf8f4] transition-colors overflow-hidden"
              >
                <div className="bg-[#faf8f4] px-5 py-4 flex items-center gap-4">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="8" y="20" width="32" height="16" rx="3" fill="#e0d8ce"/>
                    <rect x="8" y="20" width="32" height="16" rx="3" stroke="#6b4c2a" strokeWidth="1.5"/>
                    <path d="M8 28h32" stroke="#6b4c2a" strokeWidth="1" opacity=".4"/>
                    <path d="M16 20v-4M24 20v-6M32 20v-4" stroke="#6b4c2a" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 38h6M20 38h8M34 38h4" stroke="#6b4c2a" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M13 36v4M24 35v6M36 36v4" stroke="#6b4c2a" strokeWidth="1" strokeLinecap="round" opacity=".5"/>
                  </svg>
                  <div>
                    <p className="text-[15px] font-bold text-[#1c1714]">Je connais mes cotes</p>
                  </div>
                </div>
                <div className="px-5 py-3 flex items-center justify-between">
                  <p className="text-xs text-[#695f56]">Wizard guidé : type → dimensions → organisation → résultat.</p>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 ml-3 text-[#9d9089]">
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            )}

            {/* Tertiary — Partir d'un modèle */}
            <button
              onClick={() => setView('modeles')}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#695f56] hover:text-[#1c1714] hover:bg-[#faf8f4] rounded-lg transition-colors"
            >
              <span>Partir d'un modèle ou d'un projet vierge</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* ===== BRIEF IA VIEW ===== */}
        {view === 'brief-ia' && (
          <BriefIA
            onBack={() => setView('choice')}
            onChoose={(intent, result, materialKey) => {
              onClose();
              onBriefIAResult?.(intent, result, materialKey);
            }}
          />
        )}

        {/* ===== MODÈLES VIEW ===== */}
        {view === 'modeles' && (
          <div className="p-5 space-y-3">
            <div>
              <label className="text-xs font-medium text-[#695f56] mb-1.5 block">Matériau</label>
              <select
                className={inputClass}
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value as MaterialKey)}
              >
                {Object.entries(MATERIALS).map(([k, m]) => (
                  <option key={k} value={k}>{m.name} — portée max {m.maxSpan18}cm</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleBlank}
              className="w-full text-left rounded-lg border-2 border-dashed border-[#e0d8ce] hover:border-[#6b4c2a] p-4 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="4" width="24" height="24" rx="4" stroke="#9d9089" strokeWidth="1.5" strokeDasharray="3 2"/>
                  <path d="M16 11v10M11 16h10" stroke="#9d9089" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <div className="font-semibold text-sm text-[#1c1714] group-hover:text-[#6b4c2a] transition-colors">Projet vierge</div>
                  <div className="text-xs text-[#695f56]">Partez de zéro et construisez votre meuble pièce par pièce</div>
                </div>
              </div>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleTemplate(tpl.id)}
                  className="text-left rounded-lg border border-[#e0d8ce] hover:border-[#6b4c2a] hover:bg-[#f2ebe0] p-3 transition-all group"
                >
                  <div className="font-semibold text-sm text-[#1c1714] group-hover:text-[#6b4c2a] transition-colors">{tpl.name}</div>
                  <div className="text-xs text-[#695f56] mt-0.5">{tpl.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
