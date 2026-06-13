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
import { computeEdgeBandingLength } from './edgeBanding';

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
  // Count carcass corner joints. A box has 4 corners; each top/bottom panel
  // meets the 2 sides, so `topBottom × 2` already covers ALL corner joints of
  // every body. Each fixed shelf adds 2 joints (one per side). We do NOT add a
  // separate term for the sides — that would re-count the same corners a second
  // time from the side's perspective (the old `+ totalSides` bug inflated a
  // 3-body bookcase from 48 to 72 screws).
  const fixedShelves = parts.filter((p) => p.type === 'tablette-fixe');
  const totalFixed = fixedShelves.reduce((sum, p) => sum + p.qty, 0);
  const topBottom = parts.filter((p) => p.type === 'dessus' || p.type === 'dessous');
  const totalTopBottom = topBottom.reduce((sum, p) => sum + p.qty, 0);

  // 4 screws per joint: top/bottom × 2 joints each + fixed shelves × 2 joints
  const confirmatCount = (totalFixed * 2 + totalTopBottom * 2) * 4;
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
      // 4 legs at the corners, +2 per full 600mm of body width beyond the first
      // 600mm. Use the per-body width, NOT the whole wall width — this loop runs
      // once per body, so using the wall width multiplied the legs by body count.
      const bodyWidth = intent.space.width_mm / structure.bodies.length;
      const legCount = 4 + Math.floor(Math.max(0, bodyWidth - 600) / 600) * 2;
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

  // --- Shoe racks ---
  const inclinedShelves = parts.filter((p) => p.type === 'tablette-inclinee');
  const totalInclinedShelves = inclinedShelves.reduce((sum, p) => sum + p.qty, 0);
  if (totalInclinedShelves > 0) {
    items.push(item(
      'Taquet Ø5mm',
      totalInclinedShelves * 4,
      'shelf_support',
      'taquet_5mm',
      0.15,
    ));
  }

  // --- Wine rack ---
  const croisillons = parts.filter((p) => p.type === 'croisillon-h' || p.type === 'croisillon-v');
  if (croisillons.length > 0) {
    items.push(item('Colle à bois PU', 1, 'glue', 'colle_bois_pu', 8.0));
  }

  // --- Bench storage ---
  const seatPanels = parts.filter((p) => p.type === 'assise');
  if (seatPanels.length > 0) {
    items.push(item('Charnière piano 600mm', 1, 'hinge', 'charniere_piano_600', 6.0));
    items.push(item('Compas de retenue', 1, 'hinge', 'compas_retenue', 4.5));
  }

  // --- Edge banding ---
  let totalEdgeMm = 0;
  for (const p of parts) {
    if (p.edge_banding && p.edge_banding.length > 0) {
      totalEdgeMm += computeEdgeBandingLength(p) * p.qty;
    }
  }
  if (totalEdgeMm > 0) {
    const totalM = Math.ceil(totalEdgeMm / 1000);
    items.push(item(
      `Bande de chant ${parts[0]?.thickness_mm ?? 18}mm`,
      totalM,
      'edge_band',
      'bande_chant',
      1.5,
    ));
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
