/**
 * Engine step 5 — Hardware selection.
 *
 * Selects hinges, slides, shelf pins, screws, handles, wall mounting,
 * and plinth hardware based on generated parts, structure, and intent.
 */

import type {
  GeneratedPart,
  Structure,
  ProjectIntent,
  HardwareItem,
  HardwareCategory,
} from '../knowledge/types';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _hwCounter = 0;
function nextHwId(): string {
  return `HW_${String(++_hwCounter).padStart(3, '0')}`;
}

export function _resetHwCounter(): void {
  _hwCounter = 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function item(
  name: string,
  quantity: number,
  category: HardwareCategory,
  reference?: string,
  unit_price_eur?: number,
): HardwareItem {
  return { id: nextHwId(), name, quantity, category, reference, unit_price_eur };
}

/** Estimate door weight in kg from dimensions (mm) and density. */
function estimatePanelWeight(length_mm: number, width_mm: number, thickness_mm: number, density: number): number {
  return (length_mm * width_mm * thickness_mm * density) / 1e9;
}

/** Round slide length to nearest standard (250, 300, 350, 400, 450, 500, 550, 600, 650, 700). */
function roundSlideLength(depth_mm: number): number {
  const standards = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700];
  // Pick the largest standard ≤ depth
  let best = standards[0];
  for (const s of standards) {
    if (s <= depth_mm) best = s;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function selectHardware(
  parts: GeneratedPart[],
  structure: Structure,
  intent: ProjectIntent,
): HardwareItem[] {
  const items: HardwareItem[] = [];
  const density = 680; // approximate, CP bouleau default

  // --- Doors: hinges + handles ---
  const doorParts = parts.filter((p) => p.type === 'porte');
  for (const door of doorParts) {
    const doorHeight = Math.max(door.length_mm, door.width_mm);
    const weight = estimatePanelWeight(door.length_mm, door.width_mm, door.thickness_mm, density);
    // Hinge count: max(2, ceil((H - 800) / 500) + 2) per door
    const hingesPerDoor = Math.max(2, Math.ceil((doorHeight - 800) / 500) + 2);
    const totalHinges = hingesPerDoor * door.qty;
    items.push(item(
      `Charnière 35mm ${weight > 8 ? 'renforcée' : 'standard'}`,
      totalHinges,
      'hinge',
      'charniere_35mm',
      weight > 8 ? 4.5 : 2.8,
    ));
    // Handle per door
    items.push(item('Poignée porte', door.qty, 'handle', 'poignee_128mm', 5.0));
  }

  // --- Drawers: slides + handles ---
  const drawerFacades = parts.filter((p) => p.type === 'tiroir-facade');
  if (drawerFacades.length > 0) {
    // Find body depth from structure for slide length
    const bodyDepth = intent.space.depth_mm;
    const slideLen = roundSlideLength(bodyDepth - 50); // 50mm clearance for back panel + gap
    const totalDrawers = drawerFacades.reduce((sum, p) => sum + p.qty, 0);
    // 2 slides per drawer (left + right)
    items.push(item(
      `Coulisse à billes ${slideLen}mm`,
      totalDrawers * 2,
      'slide',
      `coulisse_${slideLen}`,
      8.5,
    ));
    // Handle per drawer
    items.push(item('Poignée tiroir', totalDrawers, 'handle', 'poignee_128mm', 5.0));
  }

  // --- Adjustable shelves: 4 shelf pins each ---
  const adjShelves = parts.filter((p) => p.type === 'tablette-reglable');
  const totalAdjShelves = adjShelves.reduce((sum, p) => sum + p.qty, 0);
  if (totalAdjShelves > 0) {
    items.push(item(
      'Taquet Ø5mm',
      totalAdjShelves * 4,
      'shelf_support',
      'taquet_5mm',
      0.15,
    ));
  }

  // --- Assembly screws: Confirmat screws ---
  // Count joints: each fixed shelf = 2, each side panel to top/bottom = 2, back panel = 4 corners
  const fixedShelves = parts.filter((p) => p.type === 'tablette-fixe');
  const totalFixed = fixedShelves.reduce((sum, p) => sum + p.qty, 0);
  const sides = parts.filter((p) => p.type === 'joue');
  const totalSides = sides.reduce((sum, p) => sum + p.qty, 0);
  const topBottom = parts.filter((p) => p.type === 'dessus' || p.type === 'dessous');
  const totalTopBottom = topBottom.reduce((sum, p) => sum + p.qty, 0);

  // 4 screws per joint: fixed shelves × 2 joints + top/bottom × 2 joints each
  const confirmatCount = (totalFixed * 2 + totalTopBottom * 2 + totalSides) * 4;
  if (confirmatCount > 0) {
    items.push(item(
      'Vis Confirmat 7×50mm',
      confirmatCount,
      'screw',
      'confirmat_7x50',
      0.08,
    ));
  }

  // --- Wall mounting ---
  for (const body of structure.bodies) {
    // Anti-tip for tall furniture
    if (body.wall_mounting?.type === 'anti_tip') {
      items.push(item('Équerre anti-basculement', 1, 'wall_mount', 'anti_tip', 3.5));
    }

    // Suspended: rail + boîtiers
    if (body.wall_mounting?.type === 'rail') {
      const widthMm = intent.space.width_mm;
      items.push(item(
        `Rail de suspension ${widthMm}mm`,
        1,
        'wall_mount',
        'rail_suspension',
        12.0,
      ));
      items.push(item('Boîtier de suspension', 2, 'wall_mount', 'boitier_suspension', 4.0));
    }

    // Plinth: adjustable legs
    if (body.plinth.type === 'legs') {
      // 4 legs minimum, +2 for each 600mm beyond 600mm
      const width = intent.space.width_mm;
      const legCount = Math.max(4, 4 + Math.floor(width / 600) * 2);
      items.push(item(
        `Pied réglable h=${body.plinth.height_mm}mm`,
        legCount,
        'strut',
        'pied_reglable',
        1.5,
      ));
    }
  }

  // --- Hanging rods ---
  const rodZones = (intent.zones ?? []).filter(
    (z) => z.module_id === 'hanging_rod_short' || z.module_id === 'hanging_rod_long',
  );
  if (rodZones.length > 0) {
    const rodWidth = intent.space.width_mm - 40; // 20mm clearance each side
    items.push(item(
      `Tringle chromée Ø25mm ~${rodWidth}mm`,
      rodZones.length,
      'rod',
      'tringle_25mm',
      8.0,
    ));
    items.push(item('Support tringle Ø25mm', rodZones.length * 2, 'rod', 'support_tringle_25', 2.0));
  }

  // --- Aggregate duplicates by reference ---
  return aggregateItems(items);
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

function aggregateItems(items: HardwareItem[]): HardwareItem[] {
  const map = new Map<string, HardwareItem>();
  for (const it of items) {
    const key = it.reference ?? it.name;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += it.quantity;
    } else {
      map.set(key, { ...it });
    }
  }
  return Array.from(map.values());
}
