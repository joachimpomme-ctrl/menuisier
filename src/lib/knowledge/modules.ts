/**
 * Module catalogue — 8 typed modules with structural impact declarations.
 *
 * Source of truth: ARCHITECTURE_V3.1_FINAL.md § 3.
 * Compatible furniture types come from base_v3_normalized.json "projets"
 * (composants_obligatoires + composants_optionnels).
 */

import type { ModuleType, ModuleConfig, FurnitureType, ValidationSeverity } from './types';
import { getProjectPreset, isLoaded } from './index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StructuralImpact {
  requires_fixed_shelf_above: boolean;
  requires_fixed_shelf_below: boolean;
  requires_back_panel: boolean;
  requires_separator: boolean;
  min_depth_mm: number;
  min_height_mm?: number;
  affects_load: boolean;
  incompatible_with: ModuleType[];
  depends_on: string[];
}

export interface ParameterDef {
  type: 'integer' | 'boolean' | 'enum';
  min?: number;
  max?: number;
  default: number | boolean | string;
  values?: string[];
}

export interface ModuleConstraint {
  condition: string;
  severity: ValidationSeverity;
  blocking: boolean;
  message: string;
  suggestion?: string;
}

export interface ModuleDefinition {
  id: ModuleType;
  name: string;
  icon: string;
  parameters: Record<string, ParameterDef>;
  produces: {
    parts: string[];
    hardware: string[];
  };
  structural_impact: StructuralImpact;
  constraints: ModuleConstraint[];
}

// ---------------------------------------------------------------------------
// Catalogue — 8 modules
// ---------------------------------------------------------------------------

export const MODULE_CATALOG: Record<ModuleType, ModuleDefinition> = {
  shelf_adjustable: {
    id: 'shelf_adjustable',
    name: 'Étagères réglables',
    icon: '📚',
    parameters: {
      count: { type: 'integer', min: 1, max: 12, default: 4 },
      spacing_mm: { type: 'integer', min: 150, max: 500, default: 300 },
    },
    produces: {
      parts: ['tablette-reglable'],
      hardware: ['shelf_pin_5mm', 'system_32_holes'],
    },
    structural_impact: {
      requires_fixed_shelf_above: false,
      requires_fixed_shelf_below: false,
      requires_back_panel: false,
      requires_separator: false,
      min_depth_mm: 150,
      affects_load: false,
      incompatible_with: [],
      depends_on: [],
    },
    constraints: [
      {
        condition: "zone_width_mm > 800 && material == 'particleboard_19'",
        severity: 'warning',
        blocking: false,
        message: 'Portée > 800mm en aggloméré : fléchissement probable',
        suggestion: 'Ajouter un séparateur vertical ou passer en CP/MDF',
      },
    ],
  },

  drawer_stack: {
    id: 'drawer_stack',
    name: 'Bloc tiroirs',
    icon: '🗃️',
    parameters: {
      count: { type: 'integer', min: 1, max: 6, default: 3 },
      distribution: { type: 'enum', values: ['equal', 'progressive', 'custom'], default: 'progressive' },
      progressive_step_mm: { type: 'integer', default: 32 },
    },
    produces: {
      parts: ['tiroir-facade', 'tiroir-caisson', 'tiroir-fond'],
      hardware: ['ball_bearing_slide_full', 'handle'],
    },
    structural_impact: {
      requires_fixed_shelf_above: true,
      requires_fixed_shelf_below: true,
      requires_back_panel: true,
      requires_separator: false,
      min_depth_mm: 300,
      affects_load: true,
      incompatible_with: [],
      depends_on: ['lateral_slides_or_undermount'],
    },
    constraints: [
      {
        condition: 'zone_width_mm > 800',
        severity: 'warning',
        blocking: false,
        message: 'Tiroirs > 800mm : coulisses renforcées recommandées',
      },
    ],
  },

  hanging_rod_short: {
    id: 'hanging_rod_short',
    name: 'Penderie courte (chemises/vestes)',
    icon: '👔',
    parameters: {},
    produces: {
      parts: [],
      hardware: ['rod_bracket_25mm', 'chrome_rod_25mm'],
    },
    structural_impact: {
      requires_fixed_shelf_above: true,
      requires_fixed_shelf_below: false,
      requires_back_panel: false,
      requires_separator: false,
      min_depth_mm: 550,
      min_height_mm: 1100,
      affects_load: true,
      incompatible_with: [],
      depends_on: [],
    },
    constraints: [
      {
        condition: 'zone_depth_mm < 550',
        severity: 'error',
        blocking: true,
        message: 'Profondeur insuffisante pour penderie (min 550mm)',
        suggestion: 'Augmenter la profondeur ou utiliser une tringle perpendiculaire',
      },
    ],
  },

  hanging_rod_long: {
    id: 'hanging_rod_long',
    name: 'Penderie longue (manteaux/robes)',
    icon: '🧥',
    parameters: {},
    produces: {
      parts: [],
      hardware: ['rod_bracket_25mm', 'chrome_rod_25mm'],
    },
    structural_impact: {
      requires_fixed_shelf_above: true,
      requires_fixed_shelf_below: false,
      requires_back_panel: false,
      requires_separator: false,
      min_depth_mm: 550,
      min_height_mm: 1600,
      affects_load: true,
      incompatible_with: [],
      depends_on: [],
    },
    constraints: [],
  },

  shoe_rack_inclined: {
    id: 'shoe_rack_inclined',
    name: 'Range-chaussures incliné',
    icon: '👟',
    parameters: {
      tiers: { type: 'integer', min: 2, max: 8, default: 4 },
    },
    produces: {
      parts: ['tablette-inclinee'],
      hardware: ['shelf_pin_5mm'],
    },
    structural_impact: {
      requires_fixed_shelf_above: false,
      requires_fixed_shelf_below: true,
      requires_back_panel: true,
      requires_separator: false,
      min_depth_mm: 250,
      affects_load: false,
      incompatible_with: [],
      depends_on: [],
    },
    constraints: [],
  },

  tv_niche: {
    id: 'tv_niche',
    name: 'Niche multimédia',
    icon: '📺',
    parameters: {
      ventilated_back: { type: 'boolean', default: true },
    },
    produces: {
      parts: [],
      hardware: ['cable_pass_60mm'],
    },
    structural_impact: {
      requires_fixed_shelf_above: true,
      requires_fixed_shelf_below: true,
      requires_back_panel: false,
      requires_separator: false,
      min_depth_mm: 350,
      min_height_mm: 150,
      affects_load: false,
      incompatible_with: [],
      depends_on: [],
    },
    constraints: [
      {
        condition: 'ventilated_back == false',
        severity: 'warning',
        blocking: false,
        message: 'Ventilation arrière désactivée : risque de surchauffe des appareils',
      },
    ],
  },

  wine_rack: {
    id: 'wine_rack',
    name: 'Casier à bouteilles',
    icon: '🍷',
    parameters: {
      columns: { type: 'integer', min: 1, max: 10, default: 4 },
      rows: { type: 'integer', min: 1, max: 10, default: 4 },
    },
    produces: {
      parts: ['croisillon'],
      hardware: [],
    },
    structural_impact: {
      requires_fixed_shelf_above: true,
      requires_fixed_shelf_below: true,
      requires_back_panel: true,
      requires_separator: false,
      min_depth_mm: 340,
      affects_load: true,
      incompatible_with: [],
      depends_on: [],
    },
    constraints: [
      {
        condition: 'columns * rows > 30',
        severity: 'warning',
        blocking: false,
        message: 'Plus de 30 bouteilles (~40kg) : vérifier la structure porteuse',
      },
    ],
  },

  bench_storage: {
    id: 'bench_storage',
    name: 'Banquette coffre',
    icon: '🪑',
    parameters: {
      has_backrest: { type: 'boolean', default: false },
    },
    produces: {
      parts: ['assise', 'coffre-fond', 'coffre-cotes'],
      hardware: ['gas_strut', 'piano_hinge'],
    },
    structural_impact: {
      requires_fixed_shelf_above: false,
      requires_fixed_shelf_below: false,
      requires_back_panel: true,
      requires_separator: false,
      min_depth_mm: 400,
      affects_load: true,
      incompatible_with: ['hanging_rod_short', 'hanging_rod_long'],
      depends_on: [],
    },
    constraints: [
      {
        condition: 'zone_height_mm < 420 || zone_height_mm > 480',
        severity: 'warning',
        blocking: false,
        message: "Hauteur d'assise idéale : 420-480mm",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get a module definition by type. */
export function getModuleDefinition(type: ModuleType): ModuleDefinition | null {
  return MODULE_CATALOG[type] ?? null;
}

/** Get all 8 module definitions. */
export function getAllModules(): ModuleDefinition[] {
  return Object.values(MODULE_CATALOG);
}

/**
 * Get modules available for a given furniture type.
 * Reads composants_obligatoires + composants_optionnels from the knowledge base.
 * Returns { required, optional } arrays of ModuleDefinition.
 *
 * Requires knowledge base to be loaded (loadKnowledge()).
 */
export function getModulesForFurnitureType(
  furnitureType: FurnitureType,
): { required: ModuleDefinition[]; optional: ModuleDefinition[] } {
  const empty = { required: [] as ModuleDefinition[], optional: [] as ModuleDefinition[] };
  if (!isLoaded()) return empty;

  const preset = getProjectPreset(furnitureType);
  if (!preset) return empty;

  const resolve = (ids: string[]): ModuleDefinition[] =>
    ids
      .map((id) => MODULE_CATALOG[id as ModuleType])
      .filter((m): m is ModuleDefinition => m !== undefined);

  return {
    required: resolve(preset.composants_obligatoires),
    optional: resolve(preset.composants_optionnels),
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a ModuleConfig against its definition's parameter constraints.
 * Checks types, min/max bounds, and enum membership.
 */
export function validateModuleConfig(config: ModuleConfig): ConfigValidationResult {
  const def = MODULE_CATALOG[config.type];
  if (!def) {
    return { valid: false, errors: [`Unknown module type: ${config.type}`] };
  }

  const errors: string[] = [];

  for (const [paramName, paramDef] of Object.entries(def.parameters)) {
    const value = (config as Record<string, unknown>)[paramName];

    // Missing parameter — use default (not an error, layout will fill defaults)
    if (value === undefined) continue;

    if (paramDef.type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        errors.push(`${paramName}: expected integer, got ${typeof value}`);
        continue;
      }
      if (paramDef.min !== undefined && value < paramDef.min) {
        errors.push(`${paramName}: ${value} < min ${paramDef.min}`);
      }
      if (paramDef.max !== undefined && value > paramDef.max) {
        errors.push(`${paramName}: ${value} > max ${paramDef.max}`);
      }
    } else if (paramDef.type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push(`${paramName}: expected boolean, got ${typeof value}`);
      }
    } else if (paramDef.type === 'enum') {
      if (paramDef.values && !paramDef.values.includes(value as string)) {
        errors.push(`${paramName}: "${value}" not in [${paramDef.values.join(', ')}]`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
