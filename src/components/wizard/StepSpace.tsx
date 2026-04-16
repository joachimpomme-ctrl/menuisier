import { useEffect, useState } from 'react';
import type { FurnitureType, WallType, SpaceDimensions } from '../../lib/knowledge/types';
import type { MaterialKey } from '../../types';
import { MATERIALS } from '../../data/materials';
import { getPresetSpaceDefaults } from '../../lib/knowledge/index';
import {
  Field,
  NumberInput,
  Panel,
  SectionTitle,
  Select,
  Toolbar,
  ToolbarButton,
} from '../../ui-system';

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
  return getPresetSpaceDefaults(type);
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
    const nextErrors: Partial<Record<DimKey, string>> = {};
    for (const [key, range] of Object.entries(RANGES) as [DimKey, (typeof RANGES)[DimKey]][]) {
      const value = dims[key];
      if (value < range.min || value > range.max) {
        nextErrors[key] = `${range.min}–${range.max} mm`;
      }
    }
    setErrors(nextErrors);
  }, [dims]);

  const valid = Object.keys(errors).length === 0;

  const handleDim = (key: DimKey, raw: string) => {
    const nextValue = parseInt(raw, 10);
    if (!Number.isNaN(nextValue)) {
      setDims((prev) => ({ ...prev, [key]: nextValue }));
    }
  };

  return (
    <Panel>
      <SectionTitle>Dimensions et matériau</SectionTitle>

      <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
        {(Object.entries(RANGES) as [DimKey, (typeof RANGES)[DimKey]][]).map(([key, range]) => {
          const fieldId = `wizard-space-${key}`;
          return (
            <Field key={key} label={range.label} htmlFor={fieldId}>
              <>
                <NumberInput
                  id={fieldId}
                  value={dims[key]}
                  min={range.min}
                  max={range.max}
                  onChange={(e) => handleDim(key, e.target.value)}
                  aria-describedby={errors[key] ? `${fieldId}-error` : undefined}
                />
                {errors[key] && (
                  <div id={`${fieldId}-error`} className="pt-1 text-[10.5px] text-[color:var(--alert)]">
                    Limite autorisée : {errors[key]}
                  </div>
                )}
              </>
            </Field>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
        <Field label="Mur" htmlFor="wizard-space-wall">
          <Select
            id="wizard-space-wall"
            value={dims.wall_type}
            onChange={(e) => setDims((prev) => ({ ...prev, wall_type: e.target.value as WallType }))}
          >
            {WALL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Matériau" htmlFor="wizard-space-material">
          <Select
            id="wizard-space-material"
            value={materialKey}
            onChange={(e) => setMaterialKey(e.target.value as MaterialKey)}
          >
            {MATERIAL_ENTRIES.map(([key, material]) => (
              <option key={key} value={key}>
                {material.name} — ép. {material.defaultThickness} mm
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="pt-3">
        <Toolbar
          end={(
            <>
              <ToolbarButton onClick={onBack}>Retour</ToolbarButton>
              <ToolbarButton variant="primary" onClick={() => valid && onNext(dims, materialKey)} disabled={!valid}>
                Suivant
              </ToolbarButton>
            </>
          )}
        />
      </div>
    </Panel>
  );
}
