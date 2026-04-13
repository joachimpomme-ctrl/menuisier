/**
 * Engine step 3 — Structure generation.
 *
 * Decides fabrication invariants (fixed shelves, back panel, bracing,
 * plinth, wall mounting) based on the Layout and ProjectIntent.
 * Does NOT compute geometry (dimensions) — that's step 4.
 */

import type {
  Layout,
  BodyLayout,
  ProjectIntent,
  FurnitureType,
  Structure,
  BodyStructure,
  FixedShelfPlacement,
  BackPanelSpec,
  BracingType,
  PlinthSpec,
  WallMounting,
} from '../knowledge/types';
import { getModuleDefinition } from '../knowledge/modules';

// ---------------------------------------------------------------------------
// Suspended furniture detection
// ---------------------------------------------------------------------------

const SUSPENDED_TYPES: ReadonlySet<FurnitureType> = new Set([
  'etagere_murale',
]);

function isSuspended(type: FurnitureType): boolean {
  return SUSPENDED_TYPES.has(type);
}

// ---------------------------------------------------------------------------
// Fixed shelves
// ---------------------------------------------------------------------------

function resolveFixedShelves(body: BodyLayout, plinthHeight: number): FixedShelfPlacement[] {
  const shelves: FixedShelfPlacement[] = [];

  // Always a bottom shelf at y=plinth
  shelves.push({ y_mm: plinthHeight, role: 'bottom' });

  // Always a top shelf
  shelves.push({ y_mm: body.height_mm, role: 'top' });

  // Walk zones and insert shelves required by structural_impact
  let cursor_y = plinthHeight;
  for (let i = 0; i < body.zones.length; i++) {
    const zone = body.zones[i];
    const def = getModuleDefinition(zone.module_id);
    const nextY = cursor_y + zone.height_mm;

    if (def) {
      // Shelf below this zone
      if (def.structural_impact.requires_fixed_shelf_below) {
        shelves.push({ y_mm: cursor_y, role: 'support' });
      }
      // Shelf above this zone
      if (def.structural_impact.requires_fixed_shelf_above) {
        shelves.push({ y_mm: nextY, role: 'support' });
      }
    }

    // Zone separator between consecutive zones (not at top/bottom)
    if (i < body.zones.length - 1) {
      shelves.push({ y_mm: nextY, role: 'zone_separator' });
    }

    cursor_y = nextY;
  }

  // Deduplicate by y_mm — keep highest-priority role
  const byY = new Map<number, FixedShelfPlacement>();
  const rolePriority: Record<string, number> = {
    top: 4,
    bottom: 3,
    support: 2,
    zone_separator: 1,
  };

  for (const shelf of shelves) {
    const existing = byY.get(shelf.y_mm);
    if (!existing || (rolePriority[shelf.role] ?? 0) > (rolePriority[existing.role] ?? 0)) {
      byY.set(shelf.y_mm, shelf);
    }
  }

  return Array.from(byY.values()).sort((a, b) => a.y_mm - b.y_mm);
}

// ---------------------------------------------------------------------------
// Back panel
// ---------------------------------------------------------------------------

function resolveBackPanel(suspended: boolean): BackPanelSpec {
  return {
    type: 'groove',
    thickness_mm: 5,
    ...(suspended ? { recess_mm: 15 } : {}),
  } as BackPanelSpec;
}

// ---------------------------------------------------------------------------
// Bracing
// ---------------------------------------------------------------------------

/**
 * Bracing strategy:
 * - Small furniture (H ≤ 1200 and W ≤ 800): back_panel alone suffices
 * - Large furniture (H > 1200 or W > 800): combined (back_panel + structural)
 * - Wall-mounted: wall_mount
 */
function resolveBracing(
  height_mm: number,
  width_mm: number,
  suspended: boolean,
): BracingType {
  if (suspended) return 'wall_mount';
  if (height_mm > 1200 || width_mm > 800) return 'back_panel';
  return 'back_panel';
}

// ---------------------------------------------------------------------------
// Plinth
// ---------------------------------------------------------------------------

function resolvePlinth(plinth_mm: number, suspended: boolean): PlinthSpec {
  if (suspended) return { type: 'none', height_mm: 0 };
  if (plinth_mm > 0) return { type: 'legs', height_mm: plinth_mm };
  return { type: 'none', height_mm: 0 };
}

// ---------------------------------------------------------------------------
// Wall mounting / anti-tip
// ---------------------------------------------------------------------------

function resolveWallMounting(
  height_mm: number,
  suspended: boolean,
): WallMounting | undefined {
  if (suspended) {
    // Rail at 2/3 height
    return { type: 'rail', position_y_mm: Math.round(height_mm * 2 / 3) };
  }
  if (height_mm > 1500) {
    // Anti-tip strap near the top
    return { type: 'anti_tip', position_y_mm: Math.round(height_mm * 0.9) };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateStructure(layout: Layout, intent: ProjectIntent): Structure {
  const suspended = isSuspended(intent.furniture_type);
  const plinthHeight = intent.space.plinth_mm || 0;

  const bodies: BodyStructure[] = layout.bodies.map((body) => ({
    body_id: body.body_id,
    fixed_shelves: resolveFixedShelves(body, plinthHeight),
    back_panel: resolveBackPanel(suspended),
    bracing: resolveBracing(body.height_mm, body.width_mm, suspended),
    plinth: resolvePlinth(plinthHeight, suspended),
    wall_mounting: resolveWallMounting(body.height_mm, suspended),
  }));

  return { bodies };
}
