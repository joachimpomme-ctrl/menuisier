import { useEffect, useState } from 'react';
import type {
  FurnitureType,
  ModuleConfig,
  ModuleType,
  ProjectIntent,
  SpaceDimensions,
  ZoneConfig,
} from '../../lib/knowledge/types';
import { getProjectPreset, loadKnowledge } from '../../lib/knowledge/index';
import { getAllModules } from '../../lib/knowledge/modules';
import { variantToResult, type PresetVariant, type ZoneRow } from '../../lib/wizard/variantToResult';
import type { MaterialKey } from '../../types';
import ContentMode from './ContentMode';
import {
  AlertStrip,
  DataTable,
  KpiBar,
  NumberInput,
  Panel,
  PropertyGrid,
  SectionTitle,
  Select,
  Toolbar,
  ToolbarButton,
} from '../../ui-system';

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

function moduleLabel(moduleId: ModuleType): string {
  return ALL_MODULES.find((module) => module.id === moduleId)?.name ?? moduleId;
}

function variantLabel(variant: PresetVariant, index: number): string {
  return typeof variant.nom === 'string' && variant.nom.trim().length > 0 ? variant.nom : `Variante ${index + 1}`;
}

interface VariantTableRow {
  id: string;
  variant: PresetVariant;
  label: string;
  modules: string;
  width?: number;
  height?: number;
  depth?: number;
}

interface Props {
  furnitureType: FurnitureType;
  space: SpaceDimensions;
  materialKey: MaterialKey;
  onBack: () => void;
  onGenerate: (intent: ProjectIntent) => void;
}

let nextKey = 1;

export default function StepOrganize({ furnitureType, space, materialKey, onBack, onGenerate }: Props) {
  const usableHeight = space.height_mm - (space.plinth_mm || 0);
  const [zones, setZones] = useState<ZoneRow[]>([
    { key: nextKey++, module_id: 'shelf_adjustable', height_mm: usableHeight, count: 4 },
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
  const [variants, setVariants] = useState<PresetVariant[]>([]);

  const applyContentZones = (zoneConfigs: ZoneConfig[]) => {
    const rows: ZoneRow[] = zoneConfigs.map((zone) => ({
      key: nextKey++,
      module_id: zone.module_id,
      height_mm: zone.height_mm,
      count: (zone.config as Record<string, unknown>).count as number ?? 1,
    }));
    setZones(rows);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadKnowledge();
      if (cancelled) {
        return;
      }
      const preset = getProjectPreset(furnitureType);
      if (preset?.variantes) {
        setVariants(preset.variantes as PresetVariant[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [furnitureType]);

  const totalZoneHeight = zones.reduce((sum, zone) => sum + zone.height_mm, 0);
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
      { key: nextKey++, module_id: 'shelf_adjustable', height_mm: 500, count: 3 },
    ]);
  };

  const updateZone = (key: number, field: keyof ZoneRow, value: string | number) => {
    clearVariantOverrides();
    setZones((prev) => prev.map((zone) => (zone.key === key ? { ...zone, [field]: value } : zone)));
  };

  const removeZone = (key: number) => {
    clearVariantOverrides();
    setZones((prev) => prev.filter((zone) => zone.key !== key));
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
    const zoneConfigs: ZoneConfig[] = zones.map((zone) => ({
      module_id: zone.module_id,
      height_mm: zone.height_mm,
      config: defaultConfigForModule(zone.module_id, zone.count),
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

  const variantRows: VariantTableRow[] = variants.map((variant, index) => {
    const result = variantToResult(variant, usableHeight);
    return {
      id: variantLabel(variant, index),
      variant,
      label: variantLabel(variant, index),
      modules: result.zones.map((zone) => moduleLabel(zone.module_id)).join(' · '),
      width: result.suggestedWidthMm,
      height: result.suggestedHeightMm,
      depth: result.suggestedDepthMm,
    };
  });

  const suggestionLines = [
    suggestedWidthMm !== undefined ? `Largeur suggérée : ${suggestedWidthMm} mm` : null,
    suggestedHeightMm !== undefined ? `Hauteur suggérée : ${suggestedHeightMm} mm` : null,
    suggestedDepthMm !== undefined ? `Profondeur suggérée : ${suggestedDepthMm} mm` : null,
    suggestedPlinthType === 'legs' ? 'Piètement suggéré : meuble sur pieds' : null,
    suggestedPlinthType === 'none' ? 'Plinthe suggérée : aucune plinthe' : null,
  ].filter((line): line is string => line !== null);

  const propertyGroups = [
    {
      title: 'Paramètres actifs',
      rows: [
        { label: 'Variante', value: selectedVariantName ?? 'Aucune' },
        {
          label: 'Portes',
          value:
            doorOverride === undefined
              ? 'Auto'
              : doorOverride
                ? 'Forcées'
                : 'Désactivées',
        },
        { label: 'Hauteur portes', value: doorHeightMm !== undefined ? `${doorHeightMm} mm` : 'Auto' },
        {
          label: 'Suspension',
          value:
            suspendedOverride === undefined
              ? 'Auto'
              : suspendedOverride
                ? 'Oui'
                : 'Non',
        },
        {
          label: 'Plinthe',
          value:
            suggestedPlinthType === 'none'
              ? 'Aucune'
              : suggestedPlinthType === 'legs'
                ? 'Sur pieds'
                : `${space.plinth_mm} mm`,
        },
      ],
    },
    {
      title: 'Dimensions de sortie',
      rows: [
        { label: 'Largeur', value: `${suggestedWidthMm ?? space.width_mm} mm` },
        { label: 'Hauteur', value: `${suggestedHeightMm ?? space.height_mm} mm` },
        { label: 'Profondeur', value: `${suggestedDepthMm ?? space.depth_mm} mm` },
      ],
    },
  ];

  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle>Organisation des zones</SectionTitle>
        <div className="pt-3">
          <KpiBar
            items={[
              { key: 'used', label: 'Zone totale', value: totalZoneHeight, unit: 'mm' },
              { key: 'target', label: 'Hauteur utile', value: usableHeight, unit: 'mm' },
              { key: 'delta', label: 'Écart', value: `${heightDelta > 0 ? '+' : ''}${heightDelta}`, unit: 'mm' },
            ]}
          />
        </div>
      </Panel>

      {variants.length > 0 && (
        <Panel title="Configurations types" flush>
          <DataTable
            columns={[
              {
                key: 'variant',
                header: 'Variante',
                render: (row) => row.label,
              },
              {
                key: 'modules',
                header: 'Modules',
                render: (row) => row.modules || 'Organisation standard',
              },
              {
                key: 'depth',
                header: 'Prof.',
                align: 'right',
                render: (row) => (row.depth !== undefined ? `${row.depth} mm` : '—'),
              },
              {
                key: 'apply',
                header: 'Action',
                render: (row) => (
                  <ToolbarButton
                    variant="ghost"
                    onClick={() => applyVariant(row.variant)}
                    className="!h-[22px] !px-2"
                  >
                    Appliquer
                  </ToolbarButton>
                ),
              },
            ]}
            rows={variantRows}
            rowId={(row) => row.id}
            selectedId={selectedVariantName}
            onSelect={(row) => applyVariant(row.variant)}
            emptyLabel="Aucune configuration type"
            maxHeight={208}
          />
        </Panel>
      )}

      {suggestionLines.length > 0 && (
        <AlertStrip kind="info" title="Ajustements proposés">
          <div className="space-y-1">
            {suggestionLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </AlertStrip>
      )}

      {variantWarnings.map((warning) => (
        <AlertStrip key={warning} kind="warning" title="Point d'attention">
          {warning}
        </AlertStrip>
      ))}

      {['placard', 'armoire', 'cuisine', 'meuble_salle_de_bain'].includes(furnitureType) && (
        <AlertStrip kind="info" title="Portes automatiques">
          Les portes sont calculées automatiquement selon le type de meuble et la largeur.
        </AlertStrip>
      )}

      <Panel title="Zones" flush>
        <DataTable
          columns={[
            {
              key: 'module',
              header: 'Module',
              render: (row) => (
                <Select
                  value={row.module_id}
                  onChange={(e) => updateZone(row.key, 'module_id', e.target.value)}
                  aria-label={`Module zone ${row.key}`}
                >
                  {ALL_MODULES.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </Select>
              ),
            },
            {
              key: 'height',
              header: 'Hauteur (mm)',
              align: 'right',
              render: (row) => (
                <NumberInput
                  value={row.height_mm}
                  min={100}
                  onChange={(e) => updateZone(row.key, 'height_mm', parseInt(e.target.value, 10) || 0)}
                  className="w-[92px] text-right"
                  aria-label={`Hauteur zone ${row.key}`}
                />
              ),
            },
            {
              key: 'count',
              header: 'Qté',
              align: 'right',
              render: (row) => (
                <NumberInput
                  value={row.count}
                  min={1}
                  max={12}
                  onChange={(e) => updateZone(row.key, 'count', parseInt(e.target.value, 10) || 1)}
                  className="w-[64px] text-right"
                  aria-label={`Quantité zone ${row.key}`}
                />
              ),
            },
            {
              key: 'actions',
              header: 'Action',
              render: (row) => (
                <ToolbarButton
                  variant="ghost"
                  onClick={() => removeZone(row.key)}
                  className="!h-[22px] !px-2"
                  aria-label={`Supprimer zone ${row.key}`}
                >
                  Supprimer
                </ToolbarButton>
              ),
            },
          ]}
          rows={zones}
          rowId={(row) => String(row.key)}
          emptyLabel="Aucune zone configurée"
          maxHeight={320}
        />
      </Panel>

      <Panel title="Synthèse d'organisation">
        <PropertyGrid groups={propertyGroups} />
      </Panel>

      {showContentMode && (
        <ContentMode
          furnitureType={furnitureType}
          space={space}
          onApply={applyContentZones}
          onClose={() => setShowContentMode(false)}
        />
      )}

      <Toolbar
        start={(
          <>
            <ToolbarButton onClick={addZone}>Ajouter une zone</ToolbarButton>
            <ToolbarButton variant="ghost" onClick={() => setShowContentMode(true)}>
              Je décris ce que je range
            </ToolbarButton>
          </>
        )}
        end={(
          <>
            <ToolbarButton onClick={onBack}>Retour</ToolbarButton>
            <ToolbarButton variant="primary" onClick={handleGenerate} disabled={zones.length === 0}>
              Générer
            </ToolbarButton>
          </>
        )}
      />
    </div>
  );
}
