import { useMemo, useState } from 'react';
import type { FurnitureType, WallType, SpaceDimensions } from '../../lib/knowledge/types';
import type { MaterialKey } from '../../types';
import { MATERIALS } from '../../data/materials';
import { getPresetSpaceDefaults } from '../../lib/knowledge/index';

interface Props {
  furnitureType: FurnitureType;
  initial?: Partial<SpaceDimensions & { material_key: MaterialKey }>;
  onBack: () => void;
  onNext: (space: SpaceDimensions, materialKey: MaterialKey) => void;
}

const WALL_OPTIONS: { value: WallType; label: string }[] = [
  { value: 'concrete',     label: 'Béton / Parpaing' },
  { value: 'hollow_brick', label: 'Brique creuse'    },
  { value: 'plasterboard', label: 'Placo / BA13'     },
  { value: 'unknown',      label: 'Je ne sais pas'   },
];

const MATERIAL_ENTRIES = Object.entries(MATERIALS) as [MaterialKey, (typeof MATERIALS)[MaterialKey]][];

const RANGES = {
  width_mm:  { min: 200, max: 6000, label: 'Largeur (mm)'    },
  height_mm: { min: 200, max: 3000, label: 'Hauteur (mm)'    },
  depth_mm:  { min: 100, max: 1000, label: 'Profondeur (mm)' },
  plinth_mm: { min: 0,   max: 200,  label: 'Plinthe (mm)'    },
} as const;

type DimKey = keyof typeof RANGES;

function loadDefaults(type: FurnitureType): Partial<SpaceDimensions> {
  return getPresetSpaceDefaults(type);
}

function validateDimensions(dims: SpaceDimensions): Partial<Record<DimKey, string>> {
  const errs: Partial<Record<DimKey, string>> = {};
  for (const [key, range] of Object.entries(RANGES) as [DimKey, (typeof RANGES)[DimKey]][]) {
    const v = dims[key];
    if (v < range.min || v > range.max) {
      errs[key] = `${range.min}–${range.max} mm`;
    }
  }
  return errs;
}

export default function StepSpace({ furnitureType, initial, onBack, onNext }: Props) {
  const defaults = loadDefaults(furnitureType);

  const [dims, setDims] = useState<SpaceDimensions>({
    width_mm:  initial?.width_mm  ?? defaults.width_mm  ?? 800,
    height_mm: initial?.height_mm ?? defaults.height_mm ?? 2000,
    depth_mm:  initial?.depth_mm  ?? defaults.depth_mm  ?? 300,
    plinth_mm: initial?.plinth_mm ?? defaults.plinth_mm ?? 0,
    wall_type: initial?.wall_type ?? 'unknown',
  });

  const [materialKey, setMaterialKey] = useState<MaterialKey>(initial?.material_key ?? 'cp_bouleau');
  const errors = useMemo(() => validateDimensions(dims), [dims]);
  const valid = Object.keys(errors).length === 0;

  const handleDim = (key: DimKey, raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) setDims((prev) => ({ ...prev, [key]: n }));
  };

  return (
    <div>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-widest text-[#9d9089] mb-1">Étape 2 / 3</p>
        <h3 className="text-base font-semibold text-[#1c1714]">Dimensions et matériau</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {(Object.entries(RANGES) as [DimKey, (typeof RANGES)[DimKey]][]).map(([key, range]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-[#695f56] mb-1">{range.label}</label>
            <input
              type="number"
              value={dims[key]}
              min={range.min}
              max={range.max}
              onChange={(e) => handleDim(key, e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm font-mono tabular-nums focus:outline-none transition-colors ${
                errors[key]
                  ? 'border-[#e8c8c8] bg-[#fae8e8] focus:border-[#7a2424]'
                  : 'border-[#e0d8ce] bg-white focus:border-[#6b4c2a]'
              }`}
            />
            {errors[key] && <p className="text-xs text-[#7a2424] mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="block text-xs font-medium text-[#695f56] mb-2">Type de mur</label>
        <div className="flex flex-wrap gap-2">
          {WALL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDims((prev) => ({ ...prev, wall_type: opt.value }))}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                dims.wall_type === opt.value
                  ? 'border-2 border-[#6b4c2a] bg-[#f2ebe0] text-[#6b4c2a] font-medium'
                  : 'border-[#e0d8ce] bg-white text-[#695f56] hover:border-[#c8bfb3]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-medium text-[#695f56] mb-1">Matériau</label>
        <select
          value={materialKey}
          onChange={(e) => setMaterialKey(e.target.value as MaterialKey)}
          className="w-full border border-[#e0d8ce] rounded-lg px-3 py-2 text-sm text-[#1c1714] focus:border-[#6b4c2a] focus:outline-none transition-colors"
        >
          {MATERIAL_ENTRIES.map(([key, mat]) => (
            <option key={key} value={key}>
              {mat.name} — ép. {mat.defaultThickness}mm
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm border border-[#e0d8ce] rounded-lg text-[#695f56] hover:bg-[#faf8f4] transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => valid && onNext(dims, materialKey)}
          disabled={!valid}
          className="px-4 py-2 text-sm bg-[#6b4c2a] text-white rounded-lg hover:bg-[#5a3e22] disabled:opacity-40 transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
