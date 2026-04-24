import { useState, useMemo } from 'react';
import type { FurnitureType, ProjectIntent, SpaceDimensions, WallType } from '../../lib/knowledge/types';
import type { PipelineResult } from '../../lib/engine/pipeline';
import { runPipeline } from '../../lib/engine/pipeline';
import { buildFacade2DModel } from '../../lib/engine/facade2d';
import Facade2DView from '../result/Facade2DView';
import type { MaterialKey } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────────

interface ContentCategory {
  key: string;
  label: string;
  furnitureHint: FurnitureType;
}

type StylePref  = 'minimaliste' | 'classique' | 'artisanal';
type BudgetPref = 'serre' | 'standard' | 'premium';
type NiveauPref = 'debutant' | 'confirme' | 'expert';

interface BriefIAProps {
  onBack: () => void;
  onChoose: (intent: ProjectIntent, result: PipelineResult, materialKey: MaterialKey) => void;
}

interface Variant {
  label: string;
  description: string;
  intent: ProjectIntent;
  result: PipelineResult;
  materialKey: MaterialKey;
}

// ── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES: ContentCategory[] = [
  { key: 'books',        label: 'Livres',       furnitureHint: 'bibliotheque'    },
  { key: 'shirts',       label: 'Chemises',     furnitureHint: 'armoire'         },
  { key: 'coats',        label: 'Manteaux',     furnitureHint: 'armoire'         },
  { key: 'trousers',     label: 'Pantalons',    furnitureHint: 'armoire'         },
  { key: 'shoes',        label: 'Chaussures',   furnitureHint: 'vestiaire_entree'},
  { key: 'dishes',       label: 'Vaisselle',    furnitureHint: 'buffet'          },
  { key: 'deco',         label: 'Objets déco',  furnitureHint: 'bibliotheque'    },
  { key: 'media',        label: 'Multimédia',   furnitureHint: 'meuble_tv'       },
  { key: 'games',        label: 'Jeux',         furnitureHint: 'bibliotheque'    },
  { key: 'linen_folded', label: 'Linge plié',   furnitureHint: 'armoire'         },
];

const WALL_TYPES: { key: WallType; label: string }[] = [
  { key: 'concrete',      label: 'Béton / Parpaing' },
  { key: 'hollow_brick',  label: 'Brique creuse'    },
  { key: 'plasterboard',  label: 'Placo / BA13'     },
  { key: 'unknown',       label: 'Je ne sais pas'   },
];

const MATERIAL_BY_BUDGET: Record<BudgetPref, MaterialKey> = {
  serre:    'melamine',
  standard: 'cp_bouleau',
  premium:  'cp_bouleau',
};

// ── Helpers ───────────────────────────────────────────────────────────────

function dominantFurnitureType(counts: Record<string, number>): FurnitureType {
  const scores: Partial<Record<FurnitureType, number>> = {};
  for (const cat of CATEGORIES) {
    const n = counts[cat.key] ?? 0;
    if (n > 0) {
      scores[cat.furnitureHint] = (scores[cat.furnitureHint] ?? 0) + n;
    }
  }
  let best: FurnitureType = 'bibliotheque';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if ((score ?? 0) > bestScore) { bestScore = score!; best = type as FurnitureType; }
  }
  return best;
}

function buildVariants(
  space: SpaceDimensions,
  furnitureType: FurnitureType,
  budget: BudgetPref,
  counts: Record<string, number>,
): Variant[] {
  const baseMat = MATERIAL_BY_BUDGET[budget];
  const contentItems = CATEGORIES
    .filter(c => (counts[c.key] ?? 0) > 0)
    .map(c => ({ category: c.key, quantity: counts[c.key] }));

  const makeIntent = (depthDelta: number, mat: MaterialKey, variantLabel?: string): ProjectIntent => ({
    furniture_type: furnitureType,
    space: { ...space, depth_mm: Math.max(200, space.depth_mm + depthDelta) },
    material_key: mat,
    contents: contentItems,
    variant: variantLabel,
  });

  const altMat: MaterialKey = budget === 'serre' ? 'cp_peuplier' : budget === 'premium' ? 'cp_okoume' : 'melamine';

  return [
    {
      label: 'Compact',
      description: `Optimisé en profondeur (${Math.max(200, space.depth_mm - 50)} mm). Idéal pour les petits espaces.`,
      intent: makeIntent(-50, budget === 'premium' ? baseMat : altMat, 'compact'),
      result: runPipeline(makeIntent(-50, budget === 'premium' ? baseMat : altMat, 'compact')),
      materialKey: budget === 'premium' ? baseMat : altMat,
    },
    {
      label: 'Standard',
      description: `Dimensions exactes de votre espace (${space.depth_mm} mm de profondeur).`,
      intent: makeIntent(0, baseMat, 'standard'),
      result: runPipeline(makeIntent(0, baseMat, 'standard')),
      materialKey: baseMat,
    },
    {
      label: 'Spacieux',
      description: `Profondeur augmentée (${space.depth_mm + 50} mm) pour plus de capacité.`,
      intent: makeIntent(+50, baseMat, 'spacieux'),
      result: runPipeline(makeIntent(+50, baseMat, 'spacieux')),
      materialKey: baseMat,
    },
  ];
}

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 transition-colors ${
                done
                  ? 'bg-[#2f6144] text-white'
                  : active
                  ? 'bg-[#6b4c2a] text-white'
                  : 'bg-[#e0d8ce] text-[#9d9089]'
              }`}
            >
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : num}
            </div>
            {num < total && (
              <div className={`flex-1 h-px mx-1 ${done ? 'bg-[#2f6144]' : 'bg-[#e0d8ce]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SVG space diagram ─────────────────────────────────────────────────────

function SpaceDiagram() {
  return (
    <svg viewBox="0 0 200 130" className="w-full max-w-[220px] mx-auto" fill="none">
      {/* Furniture body */}
      <rect x="40" y="20" width="100" height="90" rx="2" fill="#f2ebe0" stroke="#6b4c2a" strokeWidth="1.5"/>
      {/* Shelves */}
      <line x1="40" y1="50" x2="140" y2="50" stroke="#6b4c2a" strokeWidth="1" opacity=".5"/>
      <line x1="40" y1="80" x2="140" y2="80" stroke="#6b4c2a" strokeWidth="1" opacity=".5"/>
      {/* Width arrow */}
      <line x1="40" y1="120" x2="140" y2="120" stroke="#9d9089" strokeWidth="1"/>
      <path d="M40 118v4M140 118v4" stroke="#9d9089" strokeWidth="1"/>
      <path d="M45 120l-6-2v4l6-2zM135 120l6-2v4l-6-2z" fill="#9d9089"/>
      <text x="90" y="128" textAnchor="middle" fontSize="9" fill="#695f56" fontFamily="'DM Mono', monospace">Largeur</text>
      {/* Height arrow */}
      <line x1="155" y1="20" x2="155" y2="110" stroke="#9d9089" strokeWidth="1"/>
      <path d="M153 20h4M153 110h4" stroke="#9d9089" strokeWidth="1"/>
      <path d="M155 25l-2-6h4l-2 6zM155 105l-2 6h4l-2-6z" fill="#9d9089"/>
      <text x="170" y="68" textAnchor="middle" fontSize="9" fill="#695f56" fontFamily="'DM Mono', monospace" transform="rotate(90 170 68)">Hauteur</text>
      {/* Depth indicator */}
      <path d="M40 20L20 5" stroke="#9d9089" strokeWidth="1" strokeDasharray="3 2"/>
      <path d="M140 20L120 5" stroke="#9d9089" strokeWidth="1" strokeDasharray="3 2"/>
      <path d="M120 5L20 5" stroke="#9d9089" strokeWidth="1" strokeDasharray="3 2"/>
      <text x="70" y="11" textAnchor="middle" fontSize="9" fill="#695f56" fontFamily="'DM Mono', monospace">Profondeur</text>
    </svg>
  );
}

// ── Chip component ────────────────────────────────────────────────────────

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
        selected
          ? 'border-2 border-[#6b4c2a] bg-[#f2ebe0] text-[#6b4c2a] font-semibold'
          : 'border border-[#e0d8ce] text-[#695f56] hover:border-[#c8bfb3] hover:bg-[#faf8f4]'
      }`}
    >
      {label}
    </button>
  );
}

// ── Variant card ──────────────────────────────────────────────────────────

function VariantCard({
  variant, selected, onSelect,
}: {
  variant: Variant;
  selected: boolean;
  onSelect: () => void;
}) {
  const facade2D = useMemo(() => buildFacade2DModel(variant.result), [variant.result]);
  const prod = variant.result.production;
  const totalPieces = variant.result.parts.reduce((s, p) => s + p.qty, 0);

  return (
    <div
      className={`rounded-lg border transition-colors ${
        selected ? 'border-2 border-[#6b4c2a]' : 'border border-[#e0d8ce] hover:border-[#c8bfb3]'
      }`}
    >
      {/* SVG preview */}
      <div className="bg-[#faf8f4] rounded-t-lg px-4 py-3 border-b border-[#e0d8ce]">
        <div className="h-20 overflow-hidden">
          <Facade2DView model={facade2D} />
        </div>
      </div>
      {/* Info */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-[#1c1714]">{variant.label}</p>
          {prod && (
            <span className="font-mono tabular-nums text-sm font-bold text-[#6b4c2a]">
              {prod.shopping_list.estimated_cost_eur} €
            </span>
          )}
        </div>
        <p className="text-xs text-[#695f56] mb-2">{variant.description}</p>
        <div className="flex items-center gap-3 text-[11px] text-[#9d9089] font-mono tabular-nums">
          <span>{totalPieces} pcs</span>
          {prod && <span>{prod.summary.difficulty}</span>}
          <span>{variant.intent.space.depth_mm} mm</span>
        </div>
      </div>
      {/* Select button */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onSelect}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
            selected
              ? 'bg-[#6b4c2a] text-white'
              : 'border border-[#e0d8ce] text-[#695f56] hover:bg-[#faf8f4]'
          }`}
        >
          {selected ? 'Sélectionné' : 'Choisir'}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function BriefIA({ onBack, onChoose }: BriefIAProps) {
  const [step, setStep] = useState(1);

  // Step 1 — contents
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Step 2 — space
  const [width, setWidth]   = useState(2000);
  const [height, setHeight] = useState(2400);
  const [depth, setDepth]   = useState(350);
  const [plinth, setPlinth] = useState(80);
  const [wallType, setWallType] = useState<WallType>('unknown');

  // Step 3 — preferences
  const [style,  setStyle]  = useState<StylePref>('classique');
  const [budget, setBudget] = useState<BudgetPref>('standard');
  const [niveau, setNiveau] = useState<NiveauPref>('debutant');

  // Step 4 — variants
  const [variants, setVariants]     = useState<Variant[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [genSteps, setGenSteps] = useState<string[]>([]);

  const GEN_STEPS = [
    'Analyse du contenu à ranger…',
    'Optimisation des dimensions…',
    'Calcul des variantes…',
    'Génération des pièces…',
  ];

  const hasContent = Object.values(counts).some(n => n > 0);

  const changeCount = (key: string, delta: number) => {
    setCounts(prev => {
      const next = Math.max(0, (prev[key] ?? 0) + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: next };
    });
  };

  const space: SpaceDimensions = { width_mm: width, height_mm: height, depth_mm: depth, plinth_mm: plinth, wall_type: wallType };

  const generateVariants = async () => {
    setGenerating(true);
    setGenSteps([]);
    setSelectedIdx(null);

    const furnitureType = dominantFurnitureType(counts);

    for (let i = 0; i < GEN_STEPS.length; i++) {
      setGenSteps(prev => [...prev, GEN_STEPS[i]]);
      await new Promise(r => setTimeout(r, 280));
    }

    const generated = buildVariants(space, furnitureType, budget, counts);
    setVariants(generated);
    setGenerating(false);
  };

  const handleNextFromStep3 = () => {
    setStep(4);
    generateVariants();
  };

  const handleConfirm = () => {
    if (selectedIdx === null) return;
    const v = variants[selectedIdx];
    onChoose(v.intent, v.result, v.materialKey);
  };

  const inputClass = "w-full rounded-lg border border-[#e0d8ce] bg-white px-3 py-2 text-sm text-[#1c1714] font-mono tabular-nums focus:border-[#6b4c2a] focus:outline-none transition-colors";

  return (
    <div className="p-5 space-y-5">
      <ProgressBar step={step} total={4} />

      {/* ── Étape 1 : Contenu ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1c1714] mb-1">Qu'est-ce que vous rangez ?</h4>
            <p className="text-xs text-[#695f56]">Sélectionnez les catégories et ajustez les quantités.</p>
          </div>

          <div className="space-y-2">
            {CATEGORIES.map(cat => {
              const count = counts[cat.key] ?? 0;
              const active = count > 0;
              return (
                <div
                  key={cat.key}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                    active ? 'border-[#6b4c2a] bg-[#f2ebe0]' : 'border-[#e0d8ce] bg-white'
                  }`}
                >
                  <span className={`text-sm ${active ? 'text-[#6b4c2a] font-medium' : 'text-[#695f56]'}`}>
                    {cat.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeCount(cat.key, -1)}
                      disabled={count === 0}
                      className={`w-7 h-7 rounded-md border border-[#e0d8ce] text-[#695f56] text-sm font-bold flex items-center justify-center transition-colors ${count === 0 ? 'opacity-40 cursor-default' : 'hover:bg-[#faf8f4]'}`}
                    >−</button>
                    <span className="w-5 text-center font-mono tabular-nums text-sm text-[#1c1714]">
                      {count > 0 ? count : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => changeCount(cat.key, +1)}
                      className="w-7 h-7 rounded-md border border-[#e0d8ce] text-[#695f56] hover:bg-[#faf8f4] text-sm font-bold flex items-center justify-center transition-colors bg-white"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {!hasContent && (
            <p className="text-xs text-[#7a5020] bg-[#f5ead8] border border-[#e8d8b8] rounded-lg px-3 py-2">
              Ajoutez au moins un type de contenu pour continuer.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onBack}
              className="px-4 py-2 text-sm text-[#695f56] border border-[#e0d8ce] rounded-lg hover:bg-[#faf8f4] transition-colors">
              Retour
            </button>
            <button type="button" onClick={() => setStep(2)} disabled={!hasContent}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-[#6b4c2a] text-white rounded-lg hover:bg-[#5a3e22] disabled:opacity-40 transition-colors">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* ── Étape 2 : Espace ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1c1714] mb-1">Dimensions de l'espace</h4>
            <p className="text-xs text-[#695f56]">Mesurez votre mur ou niche en millimètres.</p>
          </div>

          <SpaceDiagram />

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Largeur mm', value: width, set: setWidth },
              { label: 'Hauteur mm', value: height, set: setHeight },
              { label: 'Profondeur mm', value: depth, set: setDepth },
              { label: 'Plinthe mm', value: plinth, set: setPlinth },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-[11px] text-[#9d9089] mb-1 block">{label}</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={value}
                  onChange={e => set(parseInt(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-[#695f56] mb-2">Type de mur</p>
            <div className="flex flex-wrap gap-2">
              {WALL_TYPES.map(wt => (
                <Chip key={wt.key} label={wt.label} selected={wallType === wt.key} onClick={() => setWallType(wt.key)} />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setStep(1)}
              className="px-4 py-2 text-sm text-[#695f56] border border-[#e0d8ce] rounded-lg hover:bg-[#faf8f4] transition-colors">
              Retour
            </button>
            <button type="button" onClick={() => setStep(3)} disabled={width < 100 || height < 100}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-[#6b4c2a] text-white rounded-lg hover:bg-[#5a3e22] disabled:opacity-40 transition-colors">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* ── Étape 3 : Préférences ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-[#1c1714] mb-1">Vos préférences</h4>
            <p className="text-xs text-[#695f56]">Ces choix orientent les matériaux et la complexité.</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-[#9d9089] mb-2">Style</p>
            <div className="grid grid-cols-3 gap-2">
              {(['minimaliste', 'classique', 'artisanal'] as StylePref[]).map(s => (
                <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} selected={style === s} onClick={() => setStyle(s)} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-[#9d9089] mb-2">Budget</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'serre', label: 'Serré' },
                { key: 'standard', label: 'Standard' },
                { key: 'premium', label: 'Premium' },
              ] as { key: BudgetPref; label: string }[]).map(b => (
                <Chip key={b.key} label={b.label} selected={budget === b.key} onClick={() => setBudget(b.key)} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-[#9d9089] mb-2">Niveau</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'debutant', label: 'Débutant' },
                { key: 'confirme', label: 'Confirmé' },
                { key: 'expert', label: 'Expert' },
              ] as { key: NiveauPref; label: string }[]).map(n => (
                <Chip key={n.key} label={n.label} selected={niveau === n.key} onClick={() => setNiveau(n.key)} />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setStep(2)}
              className="px-4 py-2 text-sm text-[#695f56] border border-[#e0d8ce] rounded-lg hover:bg-[#faf8f4] transition-colors">
              Retour
            </button>
            <button type="button" onClick={handleNextFromStep3}
              className="flex-1 px-4 py-2 text-sm font-semibold bg-[#6b4c2a] text-white rounded-lg hover:bg-[#5a3e22] transition-colors">
              Générer les variantes
            </button>
          </div>
        </div>
      )}

      {/* ── Étape 4 : Variantes ── */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1c1714] mb-1">Choisissez une variante</h4>
            <p className="text-xs text-[#695f56]">Basé sur vos réponses — vous pourrez ajuster après.</p>
          </div>

          {/* Loading animation */}
          {generating && (
            <div className="flex flex-col items-center gap-4 py-6">
              <svg viewBox="0 0 40 40" className="w-10 h-10 animate-spin" fill="none">
                <circle cx="20" cy="20" r="16" stroke="#e0d8ce" strokeWidth="4"/>
                <path d="M20 4a16 16 0 0 1 16 16" stroke="#6b4c2a" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              <div className="space-y-1 text-left w-full max-w-xs">
                {GEN_STEPS.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs transition-opacity ${genSteps.length > i ? 'opacity-100' : 'opacity-20'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${genSteps.length > i + 1 ? 'bg-[#2f6144]' : 'bg-[#6b4c2a]'}`} />
                    <span className="text-[#695f56]">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variant cards */}
          {!generating && variants.length > 0 && (
            <>
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <VariantCard
                    key={i}
                    variant={v}
                    selected={selectedIdx === i}
                    onSelect={() => setSelectedIdx(i)}
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setStep(3); setVariants([]); }}
                  className="px-4 py-2 text-sm text-[#695f56] border border-[#e0d8ce] rounded-lg hover:bg-[#faf8f4] transition-colors">
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={selectedIdx === null}
                  className="flex-1 px-4 py-2 text-sm font-semibold bg-[#6b4c2a] text-white rounded-lg hover:bg-[#5a3e22] disabled:opacity-40 transition-colors"
                >
                  Confirmer et voir le projet
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
