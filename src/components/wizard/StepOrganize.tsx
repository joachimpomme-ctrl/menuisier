import { useState, useEffect } from 'react';
import type {
  FurnitureType,
  SpaceDimensions,
  ProjectIntent,
  ModuleType,
  ZoneConfig,
  ModuleConfig,
} from '../../lib/knowledge/types';
import { variantToResult, type PresetVariant, type ZoneRow } from '../../lib/wizard/variantToResult';
import type { MaterialKey } from '../../types';
import { getAllModules } from '../../lib/knowledge/modules';
import { getProjectPreset } from '../../lib/knowledge/index';
import ContentMode from './ContentMode';


const ALL_MODULES = getAllModules();

function defaultConfigForModule(moduleId: ModuleType, count: number): ModuleConfig {
  switch (moduleId) {
    case 'shelf_adjustable':
      return { type: 'shelf_adjustable', count, spacing_mm: 300 };
    case 'drawer_stack':
      return { type: 'drawer_stack', count, distribution: 'progressive' };
    case 'hanging_rod_short':
      return { type: 'hanging_rod_short' };
    case 'hanging_rod_long':
      return { type: 'hanging_rod_long' };
    case 'shoe_rack_inclined':
      return { type: 'shoe_rack_inclined', tiers: count };
    case 'tv_niche':
      return { type: 'tv_niche', ventilation: true };
    case 'wine_rack':
      return { type: 'wine_rack', columns: count, rows: count };
    case 'bench_storage':
      return { type: 'bench_storage', has_backrest: false };
  }
}

interface Props {
  furnitureType: FurnitureType;
  space: SpaceDimensions;
  materialKey: MaterialKey;
  onBack: () => void;
  onGenerate: (intent: ProjectIntent) => void;
}

let _nextKey = 1;

export default function StepOrganize({ furnitureType, space, materialKey, onBack, onGenerate }: Props) {
  const usableHeight = space.height_mm - (space.plinth_mm || 0);

  const [zones, setZones] = useState<ZoneRow[]>([
    { key: _nextKey++, module_id: 'shelf_adjustable', height_mm: usableHeight, count: 4 },
  ]);

  const [showContentMode, setShowContentMode] = useState(false);
  const [selectedVariantName, setSelectedVariantName] = useState<string | null>(null);
  const [doorOverride, setDoorOverride] = useState<boolean | undefined>(undefined);
  const [suspendedOverride, setSuspendedOverride] = useState<boolean | undefined>(undefined);
  const [variantWarnings, setVariantWarnings] = useState<string[]>([]);
  const [suggestedDepthMm, setSuggestedDepthMm] = useState<number | undefined>(undefined);
  const [suggestedWidthMm, setSuggestedWidthMm] = useState<number | undefined>(undefined);
  const [suggestedHeightMm, setSuggestedHeightMm] = useState<number | undefined>(undefined);
  const [suggestedPlinthType, setSuggestedPlinthType] = useState<'legs' | 'none' | undefined>(undefined);

  const applyContentZones = (zoneConfigs: ZoneConfig[]) => {
    clearVariantOverrides();
    const rows: ZoneRow[] = zoneConfigs.map((z) => ({
      key: _nextKey++,
      module_id: z.module_id,
      height_mm: z.height_mm,
      count: (z.config as Record<string, unknown>).count as number ?? 1,
    }));
    setZones(rows);
  };

  // Load preset variants (knowledge base may need async loading)
  const [variants, setVariants] = useState<PresetVariant[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { loadKnowledge } = await import('../../lib/knowledge/index');
      await loadKnowledge();
      if (cancelled) return;
      const preset = getProjectPreset(furnitureType);
      if (preset?.variantes) {
        setVariants(preset.variantes as PresetVariant[]);
      }
    })();
    return () => { cancelled = true; };
  }, [furnitureType]);

  const totalZoneHeight = zones.reduce((s, z) => s + z.height_mm, 0);
  const heightDelta = usableHeight - totalZoneHeight;

  const clearVariantOverrides = () => {
    setSelectedVariantName(null);
    setDoorOverride(undefined);
    setSuspendedOverride(undefined);
    setVariantWarnings([]);
    setSuggestedDepthMm(undefined);
    setSuggestedWidthMm(undefined);
    setSuggestedHeightMm(undefined);
    setSuggestedPlinthType(undefined);
  };

  const addZone = () => {
    clearVariantOverrides();
    setZones((prev) => [
      ...prev,
      { key: _nextKey++, module_id: 'shelf_adjustable', height_mm: 500, count: 3 },
    ]);
  };

  const updateZone = (key: number, field: keyof ZoneRow, value: string | number) => {
    clearVariantOverrides();
    setZones((prev) =>
      prev.map((z) => (z.key === key ? { ...z, [field]: value } : z)),
    );
  };

  const removeZone = (key: number) => {
    clearVariantOverrides();
    setZones((prev) => prev.filter((z) => z.key !== key));
  };

  const applyVariant = (variant: PresetVariant) => {
    const result = variantToResult(variant, usableHeight);
    setZones(result.zones);
    setDoorOverride(result.doorOverride);
    setSuspendedOverride(result.suspendedOverride);
    setVariantWarnings(result.warnings ?? []);
    setSuggestedDepthMm(result.suggestedDepthMm);
    setSuggestedWidthMm(result.suggestedWidthMm);
    setSuggestedHeightMm(result.suggestedHeightMm);
    setSuggestedPlinthType(result.suggestedPlinthType);
    setSelectedVariantName(variant.nom ?? null);
  };

  const handleGenerate = () => {
    const zoneConfigs: ZoneConfig[] = zones.map((z) => ({
      module_id: z.module_id,
      height_mm: z.height_mm,
      config: defaultConfigForModule(z.module_id, z.count),
    }));

    const effectiveSpace = {
      ...space,
      ...(suggestedWidthMm !== undefined && { width_mm: suggestedWidthMm }),
      ...(suggestedDepthMm !== undefined && { depth_mm: suggestedDepthMm }),
      ...(suggestedHeightMm !== undefined && { height_mm: suggestedHeightMm }),
      ...(suggestedPlinthType === 'none' && { plinth_mm: 0 }),
    };

    const intent: ProjectIntent = {
      furniture_type: furnitureType,
      material_key: materialKey,
      space: effectiveSpace,
      zones: zoneConfigs,
      ...(selectedVariantName && { variant: selectedVariantName }),
      ...(doorOverride !== undefined && { door_override: doorOverride }),
      ...(suspendedOverride !== undefined && { suspended_override: suspendedOverride }),
    };

    onGenerate(intent);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Organisation des zones</h3>

      {/* Height indicator */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              heightDelta === 0
                ? 'bg-green-500'
                : heightDelta > 0
                  ? 'bg-amber-400'
                  : 'bg-red-400'
            }`}
            style={{ width: `${Math.min(100, Math.round((totalZoneHeight / usableHeight) * 100))}%` }}
          />
        </div>
        <span className={`text-xs font-medium tabular-nums whitespace-nowrap ${
          heightDelta === 0
            ? 'text-green-600'
            : heightDelta > 0
              ? 'text-amber-600'
              : 'text-red-600'
        }`}>
          {totalZoneHeight} / {usableHeight} mm
          {heightDelta !== 0 && (
            <span> ({heightDelta > 0 ? '+' : ''}{heightDelta})</span>
          )}
        </span>
      </div>

      {/* Quick variant buttons */}
      {variants.length > 0 && (
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Variantes rapides</label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => applyVariant(v)}
                className={`px-3 py-1.5 text-xs border rounded-full transition-colors ${
                  selectedVariantName === v.nom
                    ? 'bg-amber-100 border-amber-400 text-amber-800 font-medium'
                    : 'border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {v.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {(suggestedWidthMm !== undefined || suggestedDepthMm !== undefined || suggestedHeightMm !== undefined || suggestedPlinthType !== undefined) && (
        <div className="mb-4 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 space-y-1">
          {suggestedWidthMm !== undefined && <p>ℹ Largeur suggérée par la variante : {suggestedWidthMm} mm</p>}
          {suggestedDepthMm !== undefined && <p>ℹ Profondeur suggérée par la variante : {suggestedDepthMm} mm</p>}
          {suggestedHeightMm !== undefined && <p>ℹ Hauteur suggérée par la variante : {suggestedHeightMm} mm</p>}
          {suggestedPlinthType === 'legs' && <p>ℹ Piètement suggéré : meuble sur pieds</p>}
        </div>
      )}

      {variantWarnings.length > 0 && (
        <div className="mb-4 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 space-y-1">
          {variantWarnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      {/* Content mode button — discreet */}
      <button
        onClick={() => setShowContentMode(true)}
        className="mb-5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
      >
        Je décris ce que je range
      </button>

      {/* Content mode modal */}
      {showContentMode && (
        <ContentMode
          furnitureType={furnitureType}
          space={space}
          onApply={applyContentZones}
          onClose={() => setShowContentMode(false)}
        />
      )}

      <div className="space-y-3 mb-6">
        {zones.map((z) => (
          <div key={z.key} className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-gray-500 mb-1">Module</label>
              <select
                value={z.module_id}
                onChange={(e) => updateZone(z.key, 'module_id', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                {ALL_MODULES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-1">Hauteur mm</label>
              <input
                type="number"
                value={z.height_mm}
                min={100}
                onChange={(e) => updateZone(z.key, 'height_mm', parseInt(e.target.value, 10) || 0)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div className="w-16">
              <label className="block text-xs text-gray-500 mb-1">Qté</label>
              <input
                type="number"
                value={z.count}
                min={1}
                max={12}
                onChange={(e) => updateZone(z.key, 'count', parseInt(e.target.value, 10) || 1)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>

            <button
              onClick={() => removeZone(z.key)}
              className="text-red-400 hover:text-red-600 text-lg px-1"
              title="Supprimer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addZone}
        className="mb-6 text-sm text-blue-600 hover:text-blue-800"
      >
        + Ajouter une zone
      </button>

      {['placard', 'armoire', 'cuisine', 'meuble_salle_de_bain'].includes(furnitureType) && (
        <p className="mb-6 text-xs text-gray-400 italic">
          Portes calculées automatiquement selon le type de meuble et la largeur.
        </p>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Retour
        </button>
        <button
          onClick={handleGenerate}
          disabled={zones.length === 0}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
        >
          Générer →
        </button>
      </div>
    </div>
  );
}
