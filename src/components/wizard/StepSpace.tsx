import { useState, useEffect } from 'react';
import type { FurnitureType, WallType, SpaceDimensions } from '../../lib/knowledge/types';
import type { MaterialKey } from '../../types';
import { MATERIALS } from '../../data/materials';
import { getProjectPreset } from '../../lib/knowledge/index';

interface Props {
  furnitureType: FurnitureType;
  initial?: Partial<SpaceDimensions & { material_key: MaterialKey }>;
  onBack: () => void;
  onNext: (space: SpaceDimensions, materialKey: MaterialKey) => void;
}

const WALL_OPTIONS: { value: WallType; label: string }[] = [
  { value: 'concrete', label: 'Béton / Parpaing' },
  { value: 'hollow_brick', label: 'Brique creuse' },
  { value: 'plasterboard', label: 'Placo / BA13' },
  { value: 'unknown', label: 'Je ne sais pas' },
];

const MATERIAL_ENTRIES = Object.entries(MATERIALS) as [MaterialKey, (typeof MATERIALS)[MaterialKey]][];

const RANGES = {
  width_mm: { min: 200, max: 6000, label: 'Largeur (mm)' },
  height_mm: { min: 200, max: 3000, label: 'Hauteur (mm)' },
  depth_mm: { min: 100, max: 1000, label: 'Profondeur (mm)' },
  plinth_mm: { min: 0, max: 200, label: 'Plinthe (mm)' },
} as const;

type DimKey = keyof typeof RANGES;

function loadDefaults(type: FurnitureType): Partial<SpaceDimensions> {
  const preset = getProjectPreset(type);
  if (!preset?.dimensions_defaut) return {};
  const d = preset.dimensions_defaut as Record<string, unknown>;
  const out: Partial<SpaceDimensions> = {};
  if (typeof d.largeur_mm === 'number') out.width_mm = d.largeur_mm;
  if (typeof d.hauteur_mm === 'number') out.height_mm = d.hauteur_mm;
  if (typeof d.profondeur_mm === 'number') out.depth_mm = d.profondeur_mm;
  if (typeof d.plinthe_mm === 'number') out.plinth_mm = d.plinthe_mm;
  return out;
}

export default function StepSpace({ furnitureType, initial, onBack, onNext }: Props) {
  const defaults = loadDefaults(furnitureType);

  const [dims, setDims] = useState<SpaceDimensions>({
    width_mm: initial?.width_mm ?? defaults.width_mm ?? 800,
    height_mm: initial?.height_mm ?? defaults.height_mm ?? 2000,
    depth_mm: initial?.depth_mm ?? defaults.depth_mm ?? 300,
    plinth_mm: initial?.plinth_mm ?? defaults.plinth_mm ?? 0,
    wall_type: initial?.wall_type ?? 'unknown',
  });

  const [materialKey, setMaterialKey] = useState<MaterialKey>(initial?.material_key ?? 'cp_bouleau');
  const [errors, setErrors] = useState<Partial<Record<DimKey, string>>>({});

  useEffect(() => {
    const errs: Partial<Record<DimKey, string>> = {};
    for (const [key, range] of Object.entries(RANGES) as [DimKey, (typeof RANGES)[DimKey]][]) {
      const v = dims[key];
      if (v < range.min || v > range.max) {
        errs[key] = `${range.min}–${range.max} mm`;
      }
    }
    setErrors(errs);
  }, [dims]);

  const valid = Object.keys(errors).length === 0;

  const handleDim = (key: DimKey, raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) setDims((prev) => ({ ...prev, [key]: n }));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Dimensions et matériau</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {(Object.entries(RANGES) as [DimKey, (typeof RANGES)[DimKey]][]).map(([key, range]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{range.label}</label>
            <input
              type="number"
              value={dims[key]}
              min={range.min}
              max={range.max}
              onChange={(e) => handleDim(key, e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${errors[key] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            />
            {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Type de mur</label>
        <div className="flex flex-wrap gap-3">
          {WALL_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="wall_type"
                checked={dims.wall_type === opt.value}
                onChange={() => setDims((prev) => ({ ...prev, wall_type: opt.value }))}
                className="accent-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Matériau</label>
        <select
          value={materialKey}
          onChange={(e) => setMaterialKey(e.target.value as MaterialKey)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
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
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Retour
        </button>
        <button
          onClick={() => valid && onNext(dims, materialKey)}
          disabled={!valid}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
