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
  const [doorHeightMm, setDoorHeightMm] = useState<number | undefined>(undefined);
  const [suspendedOverride, setSuspendedOverride] = useState<boolean | undefined>(undefined);
  const [variantWarnings, setVariantWarnings] = useState<string[]>([]);
  const [suggestedDepthMm, setSuggestedDepthMm] = useState<number | undefined>(undefined);
  const [suggestedWidthMm, setSuggestedWidthMm] = useState<number | undefined>(undefined);
  const [suggestedHeightMm, setSuggestedHeightMm] = useState<number | undefined>(undefined);
  const [suggestedPlinthType, setSuggestedPlinthType] = useState<'legs' | 'none' | undefined>(undefined);

  const applyContentZones = (zoneConfigs: ZoneConfig[]) => {
    const rows: ZoneRow[] = zoneConfigs.map((z) => ({
      key: _nextKey++,
      module_id: z.module_id,
      height_mm: z.height_mm,
      count: (z.config as Record<string, unknown>).count as number ?? 1,
    }));
    setZones(rows);
  };

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
    setDoorHeightMm(undefined);
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
    setDoorHeightMm(result.doorHeightMm);
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
      ...(doorHeightMm !== undefined && { door_height_mm: doorHeightMm }),
      ...(suspendedOverride !== undefined && { suspended_override: suspendedOverride }),
    };

    onGenerate(intent);
  };

  return (
    <div>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-widest text-[#9A968F] mb-1">Étape 3 / 3</p>
        <h3 className="text-base font-semibold text-[#0E0D0C]">Organisation des zones</h3>
      </div>

      {/* Height indicator */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 bg-[#FFFCF7] rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              heightDelta === 0
                ? 'bg-[#0E5A3D]'
                : heightDelta > 0
                  ? 'bg-[#3B5FFF]'
                  : 'bg-[#A52E16]'
            }`}
            style={{ width: `${Math.min(100, Math.round((totalZoneHeight / usableHeight) * 100))}%` }}
          />
        </div>
        <span className={`text-xs font-mono tabular-nums whitespace-nowrap ${
          heightDelta === 0
            ? 'text-[#0E5A3D]'
            : heightDelta > 0
              ? 'text-[#54514E]'
              : 'text-[#A52E16]'
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
          <label className="block text-[10px] font-medium text-[#9A968F] uppercase tracking-widest mb-2">Variantes rapides</label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => applyVariant(v)}
                className={`px-3 py-1.5 text-xs border rounded-full transition-colors ${
                  selectedVariantName === v.nom
                    ? 'bg-[#E5EAFF] border-[#3B5FFF] text-[#3B5FFF] font-medium'
                    : 'border-[#EFE8DD] text-[#54514E] hover:bg-[#FFFCF7] hover:border-[#9A968F]'
                }`}
              >
                {v.nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {(suggestedWidthMm !== undefined || suggestedDepthMm !== undefined || suggestedHeightMm !== undefined || suggestedPlinthType !== undefined) && (
        <div className="mb-4 text-xs text-[#3a4a5c] bg-[#e5eaf0] border border-[#c8d4e0] rounded-lg px-3 py-2 space-y-1">
          {suggestedWidthMm !== undefined && <p>Largeur suggérée par la variante : {suggestedWidthMm} mm</p>}
          {suggestedDepthMm !== undefined && <p>Profondeur suggérée par la variante : {suggestedDepthMm} mm</p>}
          {suggestedHeightMm !== undefined && <p>Hauteur suggérée par la variante : {suggestedHeightMm} mm</p>}
          {suggestedPlinthType === 'legs' && <p>Piètement suggéré : meuble sur pieds</p>}
        </div>
      )}

      {variantWarnings.length > 0 && (
        <div className="mb-4 text-xs text-[#54514E] bg-[#FFFCF7] border border-[#EFE8DD] rounded-lg px-3 py-2 space-y-1">
          {variantWarnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {/* Content mode button */}
      <button
        onClick={() => setShowContentMode(true)}
        className="mb-5 w-full flex items-center gap-3 px-4 py-3 border border-dashed border-[#9A968F] bg-[#FFFCF7] hover:bg-[#E5EAFF] hover:border-[#3B5FFF] rounded-lg text-left transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0 text-[#3B5FFF]">
          <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 8h16" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 4V2M13 4V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-[#0E0D0C]">
            Je décris ce que je range
          </span>
          <span className="block text-xs text-[#54514E] mt-0.5">
            Proposer l'organisation des zones à partir de ton contenu (vêtements, livres…)
          </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#9A968F]">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
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
          <div key={z.key} className="flex flex-wrap items-end gap-2 p-3 bg-[#FFFCF7] border border-[#EFE8DD] rounded-lg">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] text-[#9A968F] mb-1">Module</label>
              <select
                value={z.module_id}
                onChange={(e) => updateZone(z.key, 'module_id', e.target.value)}
                className="w-full border border-[#EFE8DD] rounded px-2 py-1.5 text-sm text-[#0E0D0C] focus:border-[#3B5FFF] focus:outline-none transition-colors"
              >
                {ALL_MODULES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon} {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <label className="block text-[10px] text-[#9A968F] mb-1">Hauteur mm</label>
              <input
                type="number"
                value={z.height_mm}
                min={100}
                onChange={(e) => updateZone(z.key, 'height_mm', parseInt(e.target.value, 10) || 0)}
                className="w-full border border-[#EFE8DD] rounded px-2 py-1.5 text-sm font-mono tabular-nums focus:border-[#3B5FFF] focus:outline-none transition-colors"
              />
            </div>

            <div className="w-16">
              <label className="block text-[10px] text-[#9A968F] mb-1">Qté</label>
              <input
                type="number"
                value={z.count}
                min={1}
                max={12}
                onChange={(e) => updateZone(z.key, 'count', parseInt(e.target.value, 10) || 1)}
                className="w-full border border-[#EFE8DD] rounded px-2 py-1.5 text-sm font-mono tabular-nums focus:border-[#3B5FFF] focus:outline-none transition-colors"
              />
            </div>

            <button
              onClick={() => removeZone(z.key)}
              className="text-[#9A968F] hover:text-[#A52E16] text-lg px-1 transition-colors"
              title="Supprimer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addZone}
        className="mb-6 text-sm text-[#3B5FFF] hover:text-[#1E3FCC] transition-colors"
      >
        + Ajouter une zone
      </button>

      {['placard', 'armoire', 'cuisine', 'meuble_salle_de_bain'].includes(furnitureType) && (
        <p className="mb-6 text-xs text-[#9A968F] italic">
          Portes calculées automatiquement selon le type de meuble et la largeur.
        </p>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm border border-[#EFE8DD] rounded-lg text-[#54514E] hover:bg-[#FFFCF7] transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={handleGenerate}
          disabled={zones.length === 0}
          className="px-4 py-2 text-sm bg-[#3B5FFF] text-white rounded-lg hover:bg-[#1E3FCC] disabled:opacity-40 transition-colors"
        >
          Générer →
        </button>
      </div>
    </div>
  );
}
