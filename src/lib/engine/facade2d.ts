import type { PipelineResult } from './pipeline';
import type { ModuleConfig, ModuleType } from '../knowledge/types';

export type ApproximationFlag =
  | 'non_orthogonal_geometry'
  | 'unsupported_variant_props'
  | 'simplified_drawers'
  | 'simplified_doors'
  | 'generic_module'
  | 'partial_preset';

export interface Zone2D {
  moduleId: ModuleType;
  y_mm: number;
  height_mm: number;
  visualHint: VisualHint;
}

export type VisualHint =
  | { type: 'shelves'; count: number }
  | { type: 'drawers'; count: number }
  | { type: 'hanging_rod'; variant: 'short' | 'long' }
  | { type: 'tv_niche' }
  | { type: 'wine_rack'; columns: number; rows: number }
  | { type: 'shoe_rack'; tiers: number }
  | { type: 'bench' }
  | { type: 'generic'; label: string };

export interface Shelf2D {
  y_mm: number;
  role: 'top' | 'bottom' | 'zone_separator' | 'support';
}

export interface Door2D {
  count: 1 | 2;
  overlay: 'full' | 'half' | 'inset';
}

export interface Body2D {
  bodyId: string;
  x_mm: number;
  width_mm: number;
  height_mm: number;
  zones: Zone2D[];
  fixedShelves: Shelf2D[];
  doors?: Door2D;
}

export interface Facade2DModel {
  totalWidth_mm: number;
  totalHeight_mm: number;
  plinthHeight_mm: number;
  suspended: boolean;
  wallMounting?: { type: string; positionY_mm: number };
  bodies: Body2D[];
  approximationFlags: ApproximationFlag[];
  warnings: string[];
}

export function moduleIdToVisualHint(moduleId: ModuleType, config: ModuleConfig): VisualHint {
  switch (moduleId) {
    case 'shelf_adjustable':
      return { type: 'shelves', count: config.type === 'shelf_adjustable' ? config.count : 4 };
    case 'drawer_stack':
      return { type: 'drawers', count: config.type === 'drawer_stack' ? config.count : 2 };
    case 'hanging_rod_short':
      return { type: 'hanging_rod', variant: 'short' };
    case 'hanging_rod_long':
      return { type: 'hanging_rod', variant: 'long' };
    case 'tv_niche':
      return { type: 'tv_niche' };
    case 'wine_rack':
      return {
        type: 'wine_rack',
        columns: config.type === 'wine_rack' ? config.columns : 4,
        rows: config.type === 'wine_rack' ? config.rows : 4,
      };
    case 'shoe_rack_inclined':
      return { type: 'shoe_rack', tiers: config.type === 'shoe_rack_inclined' ? config.tiers : 4 };
    case 'bench_storage':
      return { type: 'bench' };
    default:
      return { type: 'generic', label: moduleId };
  }
}

function hasUnsupportedVariantHints(result: PipelineResult): boolean {
  if (!result.intent.variant || !result.production?.assumptions) return false;

  return result.production.assumptions.some((assumption) => {
    const haystack = `${assumption.value} ${assumption.reason}`.toLowerCase();
    return haystack.includes('non support')
      || haystack.includes('non modélis')
      || haystack.includes('non utilisée')
      || haystack.includes('à ajouter manuellement')
      || haystack.includes('distribution égale');
  });
}

export function buildFacade2DModel(result: PipelineResult): Facade2DModel {
  const totalWidth_mm = result.layout.bodies.reduce((sum, body) => sum + body.width_mm, 0);
  const totalHeight_mm = result.intent.space.height_mm;
  const plinthHeight_mm = result.structure.bodies[0]?.plinth.height_mm ?? result.intent.space.plinth_mm ?? 0;
  const wallMounting = result.structure.bodies[0]?.wall_mounting
    ? {
        type: result.structure.bodies[0].wall_mounting.type,
        positionY_mm: result.structure.bodies[0].wall_mounting.position_y_mm,
      }
    : undefined;
  const suspended = result.intent.suspended_override === true || wallMounting?.type === 'rail';

  const approximationFlags = new Set<ApproximationFlag>();
  const warnings: string[] = [];

  if (result.intent.furniture_type === 'sous_escalier') {
    approximationFlags.add('non_orthogonal_geometry');
    warnings.push('Sous-escalier : la vue façade reste rectangulaire et simplifie la géométrie non orthogonale.');
  }

  if (result.intent.furniture_type === 'table' || result.intent.furniture_type === 'lit_cabane_mezzanine') {
    approximationFlags.add('partial_preset');
    warnings.push(`Type "${result.intent.furniture_type}" : représentation façade partielle basée sur un preset simplifié.`);
  }

  if (hasUnsupportedVariantHints(result)) {
    approximationFlags.add('unsupported_variant_props');
    warnings.push('Certaines propriétés de variante ne sont pas représentées en façade 2D et restent signalées comme approximations.');
  }

  const bodies: Body2D[] = [];
  let x_mm = 0;

  result.layout.bodies.forEach((body, index) => {
    let zoneY = plinthHeight_mm;
    const zones: Zone2D[] = body.zones.map((zone) => {
      const visualHint = moduleIdToVisualHint(zone.module_id, zone.config);
      if (visualHint.type === 'generic') {
        approximationFlags.add('generic_module');
      }
      if (visualHint.type === 'drawers') {
        approximationFlags.add('simplified_drawers');
      }

      const zone2D: Zone2D = {
        moduleId: zone.module_id,
        y_mm: zoneY,
        height_mm: zone.height_mm,
        visualHint,
      };
      zoneY += zone.height_mm;
      return zone2D;
    });

    if (body.doors) {
      approximationFlags.add('simplified_doors');
    }

    const fixedShelves = (result.structure.bodies[index]?.fixed_shelves ?? []).map((shelf) => ({
      y_mm: shelf.y_mm,
      role: shelf.role,
    }));

    bodies.push({
      bodyId: body.body_id,
      x_mm,
      width_mm: body.width_mm,
      height_mm: body.height_mm,
      zones,
      fixedShelves,
      doors: body.doors
        ? {
            count: body.doors.count as 1 | 2,
            overlay: body.doors.overlay,
          }
        : undefined,
    });

    x_mm += body.width_mm;
  });

  if (approximationFlags.has('generic_module')) {
    warnings.push('Au moins un module est affiché sous forme générique dans la façade 2D.');
  }

  if (approximationFlags.has('simplified_drawers')) {
    warnings.push('Les tiroirs sont représentés en pile simple, sans détail individuel de façades.');
  }

  if (approximationFlags.has('simplified_doors')) {
    warnings.push('Les portes sont représentées de manière simplifiée, sans détail de charnières ni de recouvrement fin.');
  }

  return {
    totalWidth_mm,
    totalHeight_mm,
    plinthHeight_mm,
    suspended,
    wallMounting,
    bodies,
    approximationFlags: [...approximationFlags],
    warnings,
  };
}
