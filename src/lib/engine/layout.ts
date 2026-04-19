/**
 * Engine step 2 — Layout generation.
 *
 * Takes a validated ProjectIntent and produces a Layout.
 * - MULTICORPS: splits bodies when width exceeds material maxSpan.
 * - DEFAULT LAYOUT: uses preset data from knowledge base when no zones provided.
 * - DOORS: half_overlay with central stile for double doors.
 */

import type {
  ProjectIntent,
  FurnitureType,
  Layout,
  BodyLayout,
  ZoneLayout,
  ZoneConfig,
  DoorLayout,
  ValidationIssue,
} from '../knowledge/types';
import type { MaterialKey } from '../../types';
import { getModuleDefinition } from '../knowledge/modules';
import { getProjectPreset } from '../knowledge/index';
import { MATERIALS } from '../../data/materials';
import { autoFillBodyWidths } from '../bodyWidthAutoFill';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface LayoutResult {
  layout: Layout;
  issues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Issue helpers
// ---------------------------------------------------------------------------

let _issueCounter = 0;
function nextIssueId(): string {
  return `LAY_${String(++_issueCounter).padStart(3, '0')}`;
}

export function _resetCounter(): void {
  _issueCounter = 0;
}

// ---------------------------------------------------------------------------
// Multi-body splitting
// ---------------------------------------------------------------------------

/**
 * Maximum usable inner width for a body, derived from material maxSpan.
 * maxSpan18 is in cm — we convert to mm and add 2× panel thickness
 * to get the max *outer* body width.
 */
function maxBodyWidth(materialKey: MaterialKey): number {
  const mat = MATERIALS[materialKey];
  const maxSpanMm = (mat?.maxSpan18 ?? 80) * 10;
  const thickness = mat?.defaultThickness ?? 18;
  // Max outer width = inner span + 2 side panels
  return maxSpanMm + 2 * thickness;
}

/**
 * Split total width into N equal bodies so each body ≤ maxWidth.
 * Returns array of body widths using the shared proportional auto-fill helper.
 */
function splitBodies(totalWidth: number, maxWidth: number): number[] {
  if (totalWidth <= maxWidth) return [totalWidth];
  const count = Math.ceil(totalWidth / maxWidth);
  return autoFillBodyWidths(Array(count).fill(1), totalWidth, {
    minWidth: 10,
    maxWidth,
    precision: 1,
  });
}

// ---------------------------------------------------------------------------
// Default layouts per furniture type (intelligent from presets)
// ---------------------------------------------------------------------------

/**
 * Build default zones from the knowledge-base preset when available.
 * Falls back to hardcoded defaults when the KB isn't loaded or the
 * preset doesn't provide enough info.
 */
function defaultZones(
  type: FurnitureType,
  height_mm: number,
): ZoneLayout[] {
  const preset = getProjectPreset(type);

  // Try to derive from preset.dimensions_defaut
  if (preset) {
    const dims = preset.dimensions_defaut as Record<string, unknown>;
    const nbShelves = typeof dims.nb_tablettes_reglables === 'number'
      ? dims.nb_tablettes_reglables
      : undefined;

    // Placard/armoire/vestiaire: check generation for tringle
    const gen = preset.generation as Record<string, unknown>;
    const hasTrigle = gen && ('tringle' in gen || 'penderie' in gen);
    const hasTiroirs = gen && ('tiroirs' in gen);

    if (hasTrigle && (type === 'placard' || type === 'armoire' || type === 'vestiaire_entree')) {
      const rodHeight = Math.round(height_mm * 0.6);
      const drawerHeight = height_mm - rodHeight;
      return [
        {
          module_id: 'hanging_rod_short',
          height_mm: rodHeight,
          config: { type: 'hanging_rod_short' },
        },
        hasTiroirs
          ? {
              module_id: 'drawer_stack',
              height_mm: drawerHeight,
              config: { type: 'drawer_stack', count: 2, distribution: 'equal' },
            }
          : {
              module_id: 'shelf_adjustable',
              height_mm: drawerHeight,
              config: { type: 'shelf_adjustable', count: 2, spacing_mm: 300 },
            },
      ];
    }

    // Commode: drawers from nb_tiroirs
    const nbTiroirs = typeof dims.nb_tiroirs === 'number' ? dims.nb_tiroirs : undefined;
    if (nbTiroirs !== undefined && type === 'commode') {
      return [
        {
          module_id: 'drawer_stack',
          height_mm,
          config: { type: 'drawer_stack', count: nbTiroirs, distribution: 'progressive' },
        },
      ];
    }

    // Bibliothèque / étagère: shelves
    if (nbShelves !== undefined) {
      return [
        {
          module_id: 'shelf_adjustable',
          height_mm,
          config: { type: 'shelf_adjustable', count: nbShelves, spacing_mm: 300 },
        },
      ];
    }
  }

  // Fallback: hardcoded by type
  return hardcodedDefaultZones(type, height_mm);
}

function hardcodedDefaultZones(
  type: FurnitureType,
  height_mm: number,
): ZoneLayout[] {
  switch (type) {
    case 'bibliotheque':
    case 'etagere_murale':
      return [
        {
          module_id: 'shelf_adjustable',
          height_mm,
          config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 },
        },
      ];

    case 'placard':
    case 'armoire':
    case 'vestiaire_entree': {
      const rodHeight = Math.round(height_mm * 0.6);
      const drawerHeight = height_mm - rodHeight;
      return [
        {
          module_id: 'hanging_rod_short',
          height_mm: rodHeight,
          config: { type: 'hanging_rod_short' },
        },
        {
          module_id: 'drawer_stack',
          height_mm: drawerHeight,
          config: { type: 'drawer_stack', count: 2, distribution: 'equal' },
        },
      ];
    }

    case 'commode':
      return [
        {
          module_id: 'drawer_stack',
          height_mm,
          config: { type: 'drawer_stack', count: 4, distribution: 'progressive' },
        },
      ];

    case 'meuble_chaussures':
      return [
        {
          module_id: 'shoe_rack_inclined',
          height_mm,
          config: { type: 'shoe_rack_inclined', tiers: 4 },
        },
      ];

    case 'meuble_tv':
      return [
        {
          module_id: 'tv_niche',
          height_mm,
          config: { type: 'tv_niche', ventilation: true },
        },
      ];

    case 'cave_vin':
      return [
        {
          module_id: 'wine_rack',
          height_mm,
          config: { type: 'wine_rack', columns: 4, rows: 4 },
        },
      ];

    case 'banquette_coffre':
      return [
        {
          module_id: 'bench_storage',
          height_mm,
          config: { type: 'bench_storage', has_backrest: false },
        },
      ];

    default:
      return [
        {
          module_id: 'shelf_adjustable',
          height_mm,
          config: { type: 'shelf_adjustable', count: 4, spacing_mm: 300 },
        },
      ];
  }
}

// ---------------------------------------------------------------------------
// Door logic — improved with half_overlay for double doors
// ---------------------------------------------------------------------------

const DOOR_TYPES: ReadonlySet<FurnitureType> = new Set([
  'placard',
  'armoire',
  'cuisine',
  'meuble_salle_de_bain',
]);

/**
 * Resolve doors for a single body.
 * - Single door (width ≤ 500): full overlay
 * - Double doors: half overlay (montant central implied by overlay type)
 * - door_override: true forces doors, false suppresses them
 */
function resolveDoors(
  type: FurnitureType,
  width_mm: number,
  doorOverride?: boolean,
  doorHeight_mm?: number,
): DoorLayout | undefined {
  // Explicit override from variant
  if (doorOverride === false) return undefined;
  if (doorOverride !== true && !DOOR_TYPES.has(type)) return undefined;

  if (width_mm <= 500) {
    return { type: 'hinged', count: 1, overlay: 'full', height_mm: doorHeight_mm };
  }
  return { type: 'hinged', count: 2, overlay: 'half', height_mm: doorHeight_mm };
}

// ---------------------------------------------------------------------------
// Zone validation
// ---------------------------------------------------------------------------

type ConditionScalar = number | string | boolean;

function evalConditionString(
  condition: string,
  context: Record<string, ConditionScalar>,
): boolean {
  try {
    const keys = Object.keys(context);
    const values = keys.map((key) => context[key]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `return !!(${condition})`);
    return Boolean(fn(...values));
  } catch (e) {
    console.warn('[layout] evalConditionString failed:', condition, e);
    return false;
  }
}

function validateZones(
  zones: ZoneConfig[],
  depth_mm: number,
  material_key: MaterialKey,
  bodyWidth: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const zone of zones) {
    const def = getModuleDefinition(zone.module_id);
    if (!def) {
      issues.push({
        id: nextIssueId(),
        severity: 'error',
        blocking: true,
        message: `Module inconnu : "${zone.module_id}"`,
        rule_id: 'LAY_MODULE_UNKNOWN',
      });
      continue;
    }

    // Min depth
    if (depth_mm < def.structural_impact.min_depth_mm) {
      issues.push({
        id: nextIssueId(),
        severity: 'error',
        blocking: true,
        message: `${def.name} : profondeur ${depth_mm}mm < minimum ${def.structural_impact.min_depth_mm}mm`,
        suggestion: `Augmenter la profondeur à ${def.structural_impact.min_depth_mm}mm minimum`,
        rule_id: 'LAY_DEPTH_MIN',
      });
    }

    // Min height (if defined)
    if (
      def.structural_impact.min_height_mm !== undefined &&
      zone.height_mm < def.structural_impact.min_height_mm
    ) {
      issues.push({
        id: nextIssueId(),
        severity: 'warning',
        blocking: false,
        message: `${def.name} : hauteur zone ${zone.height_mm}mm < recommandé ${def.structural_impact.min_height_mm}mm`,
        suggestion: `Augmenter la hauteur de zone à ${def.structural_impact.min_height_mm}mm`,
        rule_id: 'LAY_HEIGHT_MIN',
      });
    }

    const configScalars = Object.fromEntries(
      Object.entries(zone.config ?? {}).filter(([, value]) =>
        typeof value === 'number' ||
        typeof value === 'string' ||
        typeof value === 'boolean',
      ),
    ) as Record<string, ConditionScalar>;
    const zoneContext: Record<string, ConditionScalar> = {
      ...configScalars,
      zone_width_mm: bodyWidth,
      zone_depth_mm: depth_mm,
      zone_height_mm: zone.height_mm,
      material: material_key,
      ventilated_back: false,
    };

    for (const constraint of def.constraints) {
      if (evalConditionString(constraint.condition, zoneContext)) {
        issues.push({
          id: nextIssueId(),
          severity: constraint.severity,
          blocking: constraint.blocking,
          message: `${def.name} : ${constraint.message}`,
          suggestion: constraint.suggestion,
          rule_id: `MOD_${def.id.toUpperCase()}_CONSTRAINT`,
        });
      }
    }

    // Incompatibilities within the same layout
    for (const other of zones) {
      if (other === zone) continue;
      if (def.structural_impact.incompatible_with.includes(other.module_id)) {
        issues.push({
          id: nextIssueId(),
          severity: 'error',
          blocking: true,
          message: `${def.name} est incompatible avec ${other.module_id}`,
          rule_id: 'LAY_INCOMPATIBLE',
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateLayout(intent: ProjectIntent): LayoutResult {
  const { space, furniture_type, material_key } = intent;
  const issues: ValidationIssue[] = [];

  // Usable height = total height minus plinth
  const usableHeight = space.height_mm - (space.plinth_mm || 0);

  // Build zones
  let zones: ZoneLayout[];
  if (intent.zones && intent.zones.length > 0) {
    zones = intent.zones.map((z) => ({
      module_id: z.module_id,
      height_mm: z.height_mm,
      config: z.config,
    }));
  } else {
    zones = defaultZones(furniture_type, usableHeight);
  }

  // Multi-body splitting based on material maxSpan
  const maxW = maxBodyWidth(material_key);
  const bodyWidths = splitBodies(space.width_mm, maxW);

  // Validate all zones against module constraints
  const zoneIssues = validateZones(
    zones.map((z) => ({ module_id: z.module_id, height_mm: z.height_mm, config: z.config })),
    space.depth_mm,
    material_key,
    Math.max(...bodyWidths),
  );
  issues.push(...zoneIssues);

  if (bodyWidths.length > 1) {
    issues.push({
      id: nextIssueId(),
      severity: 'info',
      blocking: false,
      message: `Largeur ${space.width_mm}mm > portée max ${maxW}mm (${MATERIALS[material_key]?.short ?? material_key}) → ${bodyWidths.length} corps`,
      rule_id: 'LAY_MULTI_BODY',
    });
  }

  const bodies: BodyLayout[] = bodyWidths.map((w, i) => ({
    body_id: `body_${i + 1}`,
    width_mm: w,
    height_mm: space.height_mm,
    depth_mm: space.depth_mm,
    zones,  // each body gets the same zone layout
    doors: resolveDoors(furniture_type, w, intent.door_override, intent.door_height_mm),
  }));

  return {
    layout: { bodies },
    issues,
  };
}
