/**
 * Engine step 4 — Geometry computation.
 *
 * Every formula is a named, exported pure function.
 * generateParts() assembles them into GeneratedPart[].
 *
 * All units: mm. Materials store thicknesses in mm (e.g. 18 = 18mm).
 */

import type {
  Layout,
  BodyLayout,
  Structure,
  BodyStructure,
  ProjectIntent,
  GeneratedPart,
  BackPanelSpec,
} from '../knowledge/types';
import { MATERIALS } from '../../data/materials';
import { generateDrillingForPart, type DrillingContext } from './drilling';
import { computeEdgeBanding } from './edgeBanding';

// ---------------------------------------------------------------------------
// Geometry helpers — all exported, all pure
// ---------------------------------------------------------------------------

/** Inner width = body outer width minus two side panels. */
export function computeInnerWidth(bodyWidth_mm: number, panelThickness_mm: number): number {
  return bodyWidth_mm - 2 * panelThickness_mm;
}

/** Inner height = body outer height minus top and bottom panels. */
export function computeInnerHeight(bodyHeight_mm: number, panelThickness_mm: number): number {
  return bodyHeight_mm - 2 * panelThickness_mm;
}

/** Single overlay door width. Overlay on both sides of the body. */
export function computeOverlayDoorWidth(
  bodyOuterWidth_mm: number,
  overlay_mm: number,
  gap_mm: number,
): number {
  return bodyOuterWidth_mm + 2 * overlay_mm - 2 * gap_mm;
}

/** Double overlay door — each door covers half the body + overlay. */
export function computeOverlayDoubleDoorWidth(
  bodyOuterWidth_mm: number,
  overlay_mm: number,
  gapBetween_mm: number,
): number {
  return (bodyOuterWidth_mm + 2 * overlay_mm - gapBetween_mm) / 2;
}

/**
 * Half-overlay double door width — for doors meeting at a central stile.
 * Each door = innerWidth/2 + half overlay on the outer side, minus gap.
 * The half overlay covers half the side panel on the hinge side.
 */
export function computeHalfOverlayDoubleDoorWidth(
  innerWidth_mm: number,
  halfOverlay_mm: number,
  gapBetween_mm: number,
): number {
  return (innerWidth_mm - gapBetween_mm) / 2 + halfOverlay_mm;
}

/** Inset door width = inner width minus gaps. */
export function computeInsetDoorWidth(innerWidth_mm: number, gap_mm: number): number {
  return innerWidth_mm - 2 * gap_mm;
}

/** Door height with overlay and gap on top/bottom. */
export function computeDoorHeight(
  zoneHeight_mm: number,
  overlayTop_mm: number,
  overlayBot_mm: number,
  gapTop_mm: number,
  gapBot_mm: number,
): number {
  return zoneHeight_mm + overlayTop_mm + overlayBot_mm - gapTop_mm - gapBot_mm;
}

/** Drawer box width = inner width minus slide clearance on each side. */
export function computeDrawerBoxWidth(innerWidth_mm: number, slideClearance_mm: number): number {
  return innerWidth_mm - 2 * slideClearance_mm;
}

/** Drawer box depth = inner depth minus rear gap for cables/wiring. */
export function computeDrawerBoxDepth(innerDepth_mm: number, rearGap_mm: number): number {
  return innerDepth_mm - rearGap_mm;
}

/**
 * Progressive drawer front heights.
 * Smallest at top, each drawer taller by step_mm.
 * Returns array of heights from top to bottom.
 */
export function computeProgressiveDrawerFronts(
  zoneHeight_mm: number,
  count: number,
  gapTop: number,
  gapBot: number,
  gapBetween: number,
  step_mm: number,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [zoneHeight_mm - gapTop - gapBot];

  const totalGaps = gapTop + gapBot + gapBetween * (count - 1);
  const usableHeight = zoneHeight_mm - totalGaps;

  // Progressive: h_i = base + i * step
  // Sum = count * base + step * (0+1+...+(count-1)) = count * base + step * count*(count-1)/2
  // base = (usableHeight - step * count*(count-1)/2) / count
  const stepSum = (step_mm * count * (count - 1)) / 2;
  const base = (usableHeight - stepSum) / count;

  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    heights.push(Math.round(base + i * step_mm));
  }

  return heights;
}

/** Back panel dimensions accounting for groove depth. */
export function computeBackPanelDimensions(
  spec: BackPanelSpec,
  bodyW_mm: number,
  bodyH_mm: number,
  grooveDepth_mm: number,
): { w: number; h: number } {
  if (spec.type === 'groove') {
    // Panel sits in grooves — add groove depth on each side
    return {
      w: bodyW_mm - 2 * grooveDepth_mm + 2 * grooveDepth_mm, // = bodyW for groove fit
      h: bodyH_mm - 2 * grooveDepth_mm + 2 * grooveDepth_mm,
    };
  }
  if (spec.type === 'rebate') {
    // Rebated: panel covers inner area, overlaps into rebate
    return { w: bodyW_mm, h: bodyH_mm };
  }
  // Applied: screwed/nailed to the back
  return { w: bodyW_mm, h: bodyH_mm };
}

/** Shelf dimensions: length fills inner width, width = depth minus back panel. */
export function computeShelfDimensions(
  innerW_mm: number,
  depth_mm: number,
  backThickness_mm: number,
): { length: number; width: number } {
  return {
    length: innerW_mm,
    width: depth_mm - backThickness_mm,
  };
}

// ---------------------------------------------------------------------------
// Part ID generation
// ---------------------------------------------------------------------------

let _partCounter = 0;
function nextPartId(prefix: string): string {
  return `${prefix}_${String(++_partCounter).padStart(3, '0')}`;
}

export function _resetPartCounter(): void {
  _partCounter = 0;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_OVERLAY_MM = 2;
const DEFAULT_GAP_MM = 2;
const DEFAULT_GAP_BETWEEN_MM = 3;
const DEFAULT_SLIDE_CLEARANCE_MM = 13; // 12.7mm standard, rounded
const DEFAULT_REAR_GAP_MM = 20;
const DEFAULT_GROOVE_DEPTH_MM = 8;
const DEFAULT_DRAWER_SIDE_THICKNESS_MM = 12;
const DEFAULT_DRAWER_FRONT_GAP_TOP = 2;
const DEFAULT_DRAWER_FRONT_GAP_BOT = 2;
const DEFAULT_DRAWER_FRONT_GAP_BETWEEN = 3;
const DEFAULT_PROGRESSIVE_STEP_MM = 20;
const DRAWER_BOX_HEIGHT_RATIO = 0.75; // box = 75% of front height

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------

function makePart(
  overrides: Partial<GeneratedPart> & Pick<GeneratedPart, 'name' | 'length_mm' | 'width_mm' | 'thickness_mm' | 'type' | 'body_id'>,
): GeneratedPart {
  return {
    id: nextPartId(overrides.type),
    qty: 1,
    locked: false,
    ...overrides,
  };
}

function generateBodyParts(
  body: BodyLayout,
  bodyStruct: BodyStructure,
  thickness: number,
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const bid = body.body_id;
  const innerW = computeInnerWidth(body.width_mm, thickness);
  const innerH = computeInnerHeight(body.height_mm, thickness);
  const shelfDims = computeShelfDimensions(innerW, body.depth_mm, bodyStruct.back_panel.thickness_mm);

  // --- Side panels (joues) ---
  parts.push(makePart({
    name: 'Joue gauche',
    length_mm: body.height_mm,
    width_mm: body.depth_mm,
    thickness_mm: thickness,
    type: 'joue',
    body_id: bid,
    qty: 1,
  }));
  parts.push(makePart({
    name: 'Joue droite',
    length_mm: body.height_mm,
    width_mm: body.depth_mm,
    thickness_mm: thickness,
    type: 'joue',
    body_id: bid,
    qty: 1,
  }));

  // --- Fixed shelves (tablette-fixe) ---
  // Exclude top and bottom (they are the dessus/dessous panels)
  const innerShelves = bodyStruct.fixed_shelves.filter(
    (s) => s.role !== 'top' && s.role !== 'bottom',
  );
  for (const shelf of innerShelves) {
    parts.push(makePart({
      name: `Tablette fixe y=${shelf.y_mm}`,
      length_mm: shelfDims.length,
      width_mm: shelfDims.width,
      thickness_mm: thickness,
      type: 'tablette-fixe',
      body_id: bid,
      position: { x_mm: 0, y_mm: shelf.y_mm },
    }));
  }

  // --- Top and bottom panels ---
  parts.push(makePart({
    name: 'Dessus',
    length_mm: innerW,
    width_mm: body.depth_mm,
    thickness_mm: thickness,
    type: 'dessus',
    body_id: bid,
  }));
  parts.push(makePart({
    name: 'Dessous',
    length_mm: innerW,
    width_mm: body.depth_mm,
    thickness_mm: thickness,
    type: 'dessous',
    body_id: bid,
  }));

  // --- Back panel (fond) ---
  const backDims = computeBackPanelDimensions(
    bodyStruct.back_panel,
    innerW,
    innerH,
    DEFAULT_GROOVE_DEPTH_MM,
  );
  parts.push(makePart({
    name: 'Fond',
    length_mm: backDims.w,
    width_mm: backDims.h,
    thickness_mm: bodyStruct.back_panel.thickness_mm,
    type: 'fond',
    body_id: bid,
  }));

  // --- Zones: adjustable shelves, drawers, etc. ---
  for (const zone of body.zones) {
    switch (zone.module_id) {
      case 'shelf_adjustable': {
        const cfg = zone.config as { type: 'shelf_adjustable'; count: number; spacing_mm: number };
        for (let i = 0; i < cfg.count; i++) {
          parts.push(makePart({
            name: `Tablette réglable ${i + 1}`,
            length_mm: shelfDims.length,
            width_mm: shelfDims.width,
            thickness_mm: thickness,
            type: 'tablette-reglable',
            body_id: bid,
          }));
        }
        break;
      }

      case 'drawer_stack': {
        const cfg = zone.config as {
          type: 'drawer_stack';
          count: number;
          distribution: 'equal' | 'progressive' | 'custom';
          step_mm?: number;
        };
        const step = cfg.step_mm ?? DEFAULT_PROGRESSIVE_STEP_MM;
        const frontHeights =
          cfg.distribution === 'progressive'
            ? computeProgressiveDrawerFronts(
                zone.height_mm,
                cfg.count,
                DEFAULT_DRAWER_FRONT_GAP_TOP,
                DEFAULT_DRAWER_FRONT_GAP_BOT,
                DEFAULT_DRAWER_FRONT_GAP_BETWEEN,
                step,
              )
            : computeProgressiveDrawerFronts(
                zone.height_mm,
                cfg.count,
                DEFAULT_DRAWER_FRONT_GAP_TOP,
                DEFAULT_DRAWER_FRONT_GAP_BOT,
                DEFAULT_DRAWER_FRONT_GAP_BETWEEN,
                0, // equal distribution
              );

        const boxW = computeDrawerBoxWidth(innerW, DEFAULT_SLIDE_CLEARANCE_MM);
        const boxD = computeDrawerBoxDepth(body.depth_mm - bodyStruct.back_panel.thickness_mm, DEFAULT_REAR_GAP_MM);

        for (let i = 0; i < cfg.count; i++) {
          const fh = frontHeights[i] ?? frontHeights[frontHeights.length - 1] ?? 150;
          const boxH = Math.round(fh * DRAWER_BOX_HEIGHT_RATIO);

          // Facade
          parts.push(makePart({
            name: `Façade tiroir ${i + 1}`,
            length_mm: innerW,
            width_mm: fh,
            thickness_mm: thickness,
            type: 'tiroir-facade',
            body_id: bid,
          }));

          // Caisson sides (2) + front/back (2)
          parts.push(makePart({
            name: `Caisson tiroir ${i + 1} (côtés)`,
            length_mm: boxD,
            width_mm: boxH,
            thickness_mm: DEFAULT_DRAWER_SIDE_THICKNESS_MM,
            type: 'tiroir-caisson',
            body_id: bid,
            qty: 2,
          }));
          parts.push(makePart({
            name: `Caisson tiroir ${i + 1} (AV/AR)`,
            length_mm: boxW - 2 * DEFAULT_DRAWER_SIDE_THICKNESS_MM,
            width_mm: boxH,
            thickness_mm: DEFAULT_DRAWER_SIDE_THICKNESS_MM,
            type: 'tiroir-caisson',
            body_id: bid,
            qty: 2,
          }));

          // Fond tiroir
          parts.push(makePart({
            name: `Fond tiroir ${i + 1}`,
            length_mm: boxW,
            width_mm: boxD,
            thickness_mm: 5,
            type: 'tiroir-fond',
            body_id: bid,
          }));
        }
        break;
      }

      case 'shoe_rack_inclined': {
        const cfg = zone.config as { type: 'shoe_rack_inclined'; tiers: number };
        for (let i = 0; i < cfg.tiers; i++) {
          parts.push(makePart({
            name: `Tablette inclinée ${i + 1}`,
            length_mm: innerW,
            width_mm: shelfDims.width,
            thickness_mm: thickness,
            type: 'tablette-inclinee',
            body_id: bid,
          }));
          parts.push(makePart({
            name: `Taquet d'arrêt ${i + 1}`,
            length_mm: innerW,
            width_mm: 30,
            thickness_mm: thickness,
            type: 'taquet-arret',
            body_id: bid,
          }));
        }
        break;
      }

      case 'wine_rack': {
        const cfg = zone.config as { type: 'wine_rack'; columns: number; rows: number };
        for (let i = 0; i < Math.max(0, cfg.rows - 1); i++) {
          parts.push(makePart({
            name: `Croisillon horizontal ${i + 1}`,
            length_mm: innerW,
            width_mm: shelfDims.width,
            thickness_mm: thickness,
            type: 'croisillon-h',
            body_id: bid,
          }));
        }
        for (let i = 0; i < Math.max(0, cfg.columns - 1); i++) {
          parts.push(makePart({
            name: `Croisillon vertical ${i + 1}`,
            length_mm: zone.height_mm,
            width_mm: shelfDims.width,
            thickness_mm: thickness,
            type: 'croisillon-v',
            body_id: bid,
          }));
        }
        break;
      }

      case 'bench_storage': {
        parts.push(makePart({
          name: 'Assise',
          length_mm: innerW,
          width_mm: body.depth_mm,
          thickness_mm: thickness,
          type: 'assise',
          body_id: bid,
        }));
        parts.push(makePart({
          name: 'Devant coffre',
          length_mm: innerW,
          width_mm: Math.max(1, zone.height_mm - thickness),
          thickness_mm: thickness,
          type: 'devant-coffre',
          body_id: bid,
        }));
        break;
      }

      // Other modules don't produce wood parts (hardware only)
      // or will be extended in later phases
      default:
        break;
    }
  }

  // --- Doors ---
  if (body.doors && body.doors.type !== 'none') {
    const door = body.doors;
    const doorZoneHeight = door.height_mm ?? body.height_mm;
    const doorH = computeDoorHeight(
      doorZoneHeight,
      DEFAULT_OVERLAY_MM,
      DEFAULT_OVERLAY_MM,
      DEFAULT_GAP_MM,
      DEFAULT_GAP_MM,
    );
    let doorW: number;
    if (door.count === 1) {
      doorW = door.overlay === 'full'
        ? computeOverlayDoorWidth(body.width_mm, DEFAULT_OVERLAY_MM, DEFAULT_GAP_MM)
        : door.overlay === 'inset'
          ? computeInsetDoorWidth(innerW, DEFAULT_GAP_MM)
          : computeOverlayDoorWidth(body.width_mm, DEFAULT_OVERLAY_MM / 2, DEFAULT_GAP_MM); // half overlay single
    } else {
      doorW = door.overlay === 'full'
        ? computeOverlayDoubleDoorWidth(body.width_mm, DEFAULT_OVERLAY_MM, DEFAULT_GAP_BETWEEN_MM)
        : door.overlay === 'half'
          ? computeHalfOverlayDoubleDoorWidth(innerW, DEFAULT_OVERLAY_MM / 2, DEFAULT_GAP_BETWEEN_MM)
          : computeInsetDoorWidth(innerW / door.count, DEFAULT_GAP_MM); // inset
    }

    parts.push(makePart({
      name: door.count === 1 ? 'Porte' : 'Porte (×' + door.count + ')',
      length_mm: Math.round(doorW),
      width_mm: Math.round(doorH),
      thickness_mm: thickness,
      type: 'porte',
      body_id: bid,
      qty: door.count,
    }));
  }

  // --- Generate drilling ops for each part ---
  const drillingCtx: DrillingContext = { body, bodyStruct, thickness_mm: thickness };
  for (const part of parts) {
    const ops = generateDrillingForPart(part, drillingCtx);
    if (ops.length > 0) {
      part.drilling = ops;
    }
  }

  for (const part of parts) {
    const sides = computeEdgeBanding(part);
    if (sides.length > 0) {
      part.edge_banding = sides;
    }
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateParts(
  structure: Structure,
  layout: Layout,
  intent: ProjectIntent,
  existingParts?: GeneratedPart[],
): GeneratedPart[] {
  _resetPartCounter();

  const mat = MATERIALS[intent.material_key];
  const thickness = mat?.defaultThickness ?? 18;

  // Index locked parts and standard-part-linked parts by id
  const lockedById = new Map<string, GeneratedPart>();
  if (existingParts) {
    for (const p of existingParts) {
      if (p.locked || p.standard_part_id) lockedById.set(p.id, p);
    }
  }

  const allParts: GeneratedPart[] = [];

  for (const body of layout.bodies) {
    const bodyStruct = structure.bodies.find((b) => b.body_id === body.body_id);
    if (!bodyStruct) continue;

    const generated = generateBodyParts(body, bodyStruct, thickness);

    for (const part of generated) {
      // Preserve locked parts or parts linked to standard parts
      const existing = lockedById.get(part.id);
      if (existing) {
        // Standard-part-linked: keep fixed dimensions, mark locked
        if (existing.standard_part_id) {
          allParts.push({
            ...existing,
            locked: true,
          });
        } else {
          allParts.push(existing);
        }
      } else {
        allParts.push(part);
      }
    }
  }

  return allParts;
}
