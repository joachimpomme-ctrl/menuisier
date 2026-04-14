/**
 * Engine — Drilling plan generation.
 *
 * Generates DrillingOp[] for each part type based on standard woodworking rules:
 * - System 32: shelf pin holes in side panels (joues)
 * - Hinge cups: Ø35mm in doors
 * - Confirmat screws: pilot + through-holes for carcass assembly
 * - Drawer slide mounting: in side panels
 *
 * All dimensions in mm. Origin (0,0) = bottom-left of the part's face.
 * x = horizontal (along length), y = vertical (along width).
 */

import type { DrillingOp, GeneratedPart, BodyLayout, BodyStructure } from '../knowledge/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// System 32 (shelf pin holes)
const SYS32_EDGE_SETBACK_MM = 37;   // distance from front/back edge
const SYS32_SPACING_MM = 32;        // vertical spacing between holes
const SYS32_DIAMETER_MM = 5;
const SYS32_DEPTH_MM = 10;
const SYS32_START_Y_MM = 37;        // first hole from bottom edge

// Hinge cups
const HINGE_EDGE_OFFSET_MM = 100;   // from top/bottom of door
const HINGE_CUP_DIAMETER_MM = 35;
const HINGE_CUP_DEPTH_MM = 12;
const HINGE_CUP_SETBACK_MM = 22.5;  // center from door edge (hinge side)

// Confirmat screws
const CONFIRMAT_EDGE_SETBACK_MM = 37;
const CONFIRMAT_PILOT_DIAMETER_MM = 5;
const CONFIRMAT_PILOT_DEPTH_MM = 30;
const CONFIRMAT_THROUGH_DIAMETER_MM = 7;

// Drawer slides
const SLIDE_SETBACK_MM = 37;        // from bottom edge of zone

// ---------------------------------------------------------------------------
// System 32 — shelf pin rows in side panels (joues)
// ---------------------------------------------------------------------------

/**
 * Generate System 32 shelf pin holes for a side panel (joue).
 * Two vertical rows: one near front edge, one near back edge.
 * Holes run from SYS32_START_Y_MM to (panelHeight - SYS32_START_Y_MM).
 */
export function generateSystem32(
  panelHeight_mm: number,
  panelWidth_mm: number,
  backPanelThickness_mm: number,
): DrillingOp[] {
  const ops: DrillingOp[] = [];
  const frontX = SYS32_EDGE_SETBACK_MM;
  const backX = panelWidth_mm - backPanelThickness_mm - SYS32_EDGE_SETBACK_MM;

  const startY = SYS32_START_Y_MM;
  const endY = panelHeight_mm - SYS32_START_Y_MM;

  for (let y = startY; y <= endY; y += SYS32_SPACING_MM) {
    // Front row
    ops.push({
      type: 'system_32',
      x_mm: frontX,
      y_mm: Math.round(y),
      diameter_mm: SYS32_DIAMETER_MM,
      depth_mm: SYS32_DEPTH_MM,
      face: 'front',
    });
    // Back row
    ops.push({
      type: 'system_32',
      x_mm: backX,
      y_mm: Math.round(y),
      diameter_mm: SYS32_DIAMETER_MM,
      depth_mm: SYS32_DEPTH_MM,
      face: 'front',
    });
  }

  return ops;
}

// ---------------------------------------------------------------------------
// Hinge cups — Ø35mm holes in doors
// ---------------------------------------------------------------------------

/**
 * Generate hinge cup holes for a door panel.
 * Hinges at HINGE_EDGE_OFFSET_MM from top/bottom, plus intermediates for tall doors.
 */
export function generateHingeCups(
  doorHeight_mm: number,
  hingeCount: number,
): DrillingOp[] {
  const ops: DrillingOp[] = [];

  // Distribute hinges: first at offset from bottom, last at offset from top
  const positions: number[] = [];
  if (hingeCount === 1) {
    positions.push(doorHeight_mm / 2);
  } else if (hingeCount === 2) {
    positions.push(HINGE_EDGE_OFFSET_MM);
    positions.push(doorHeight_mm - HINGE_EDGE_OFFSET_MM);
  } else {
    positions.push(HINGE_EDGE_OFFSET_MM);
    positions.push(doorHeight_mm - HINGE_EDGE_OFFSET_MM);
    const gap = (doorHeight_mm - 2 * HINGE_EDGE_OFFSET_MM) / (hingeCount - 1);
    for (let i = 1; i < hingeCount - 1; i++) {
      positions.push(Math.round(HINGE_EDGE_OFFSET_MM + i * gap));
    }
  }

  for (const y of positions) {
    ops.push({
      type: 'hinge_cup_35',
      x_mm: HINGE_CUP_SETBACK_MM,
      y_mm: Math.round(y),
      diameter_mm: HINGE_CUP_DIAMETER_MM,
      depth_mm: HINGE_CUP_DEPTH_MM,
      face: 'back', // cups drilled from inner face of door
    });
  }

  return ops;
}

// ---------------------------------------------------------------------------
// Confirmat assembly holes — carcass joints
// ---------------------------------------------------------------------------

/**
 * Confirmat pilot holes in a panel's edge (for the receiving side of the joint).
 * Used on: dessus, dessous, tablette-fixe (edge holes where joue screws in).
 * Returns holes in both left and right edges.
 */
export function generateConfirmatEdgeHoles(
  panelLength_mm: number,
): DrillingOp[] {
  const ops: DrillingOp[] = [];
  const positions = [CONFIRMAT_EDGE_SETBACK_MM, panelLength_mm - CONFIRMAT_EDGE_SETBACK_MM];

  for (const x of positions) {
    // Left edge
    ops.push({
      type: 'cam_15',
      x_mm: Math.round(x),
      y_mm: 0,
      diameter_mm: CONFIRMAT_PILOT_DIAMETER_MM,
      depth_mm: CONFIRMAT_PILOT_DEPTH_MM,
      face: 'edge_left',
    });
    // Right edge
    ops.push({
      type: 'cam_15',
      x_mm: Math.round(x),
      y_mm: 0,
      diameter_mm: CONFIRMAT_PILOT_DIAMETER_MM,
      depth_mm: CONFIRMAT_PILOT_DEPTH_MM,
      face: 'edge_right',
    });
  }

  return ops;
}

/**
 * Confirmat through-holes in side panel (joue) face, for screwing into
 * dessus, dessous, and tablette-fixe edges.
 * One pair of holes (front/back setback) per shelf position.
 */
export function generateConfirmatFaceHoles(
  shelfPositions_y_mm: number[],
  panelWidth_mm: number,
  backPanelThickness_mm: number,
): DrillingOp[] {
  const ops: DrillingOp[] = [];
  const x1 = CONFIRMAT_EDGE_SETBACK_MM;
  const x2 = panelWidth_mm - backPanelThickness_mm - CONFIRMAT_EDGE_SETBACK_MM;

  for (const y of shelfPositions_y_mm) {
    ops.push({
      type: 'cam_15',
      x_mm: x1,
      y_mm: Math.round(y),
      diameter_mm: CONFIRMAT_THROUGH_DIAMETER_MM,
      depth_mm: 0, // through-hole
      face: 'front',
    });
    ops.push({
      type: 'cam_15',
      x_mm: x2,
      y_mm: Math.round(y),
      diameter_mm: CONFIRMAT_THROUGH_DIAMETER_MM,
      depth_mm: 0,
      face: 'front',
    });
  }

  return ops;
}

// ---------------------------------------------------------------------------
// Drawer slide holes in side panels
// ---------------------------------------------------------------------------

/**
 * Drawer slide mounting holes in a side panel.
 * One row of 3 holes per drawer (front, middle, back) at slide height.
 */
export function generateSlideHoles(
  drawerYPositions_mm: number[],
  panelWidth_mm: number,
  backPanelThickness_mm: number,
): DrillingOp[] {
  const ops: DrillingOp[] = [];
  const usableDepth = panelWidth_mm - backPanelThickness_mm;

  for (const y of drawerYPositions_mm) {
    const slideY = y + SLIDE_SETBACK_MM;
    // 3 mounting points: front, middle, rear
    const xPositions = [
      50,                             // front
      Math.round(usableDepth / 2),    // middle
      usableDepth - 50,               // rear
    ];
    for (const x of xPositions) {
      ops.push({
        type: 'shelf_pin_5',
        x_mm: x,
        y_mm: Math.round(slideY),
        diameter_mm: 4,
        depth_mm: 10,
        face: 'front',
      });
    }
  }

  return ops;
}

// ---------------------------------------------------------------------------
// Main: generate drilling ops for a single part
// ---------------------------------------------------------------------------

export interface DrillingContext {
  body: BodyLayout;
  bodyStruct: BodyStructure;
  thickness_mm: number;
}

/**
 * Generate drilling operations for a part based on its type and context.
 */
export function generateDrillingForPart(
  part: GeneratedPart,
  ctx: DrillingContext,
): DrillingOp[] {
  const { body, bodyStruct, thickness_mm } = ctx;
  const backThk = bodyStruct.back_panel.thickness_mm;

  switch (part.type) {
    case 'joue': {
      const ops: DrillingOp[] = [];

      // System 32 rows (only if body has adjustable shelves)
      const hasAdjustable = body.zones.some((z) => z.module_id === 'shelf_adjustable');
      if (hasAdjustable) {
        ops.push(...generateSystem32(body.height_mm, body.depth_mm, backThk));
      }

      // Confirmat through-holes for top/bottom/fixed shelves
      const shelfYs: number[] = [
        thickness_mm / 2,                        // dessous (bottom)
        body.height_mm - thickness_mm / 2,       // dessus (top)
      ];
      // Fixed shelves
      for (const shelf of bodyStruct.fixed_shelves) {
        if (shelf.role !== 'top' && shelf.role !== 'bottom') {
          shelfYs.push(shelf.y_mm);
        }
      }
      ops.push(...generateConfirmatFaceHoles(shelfYs, body.depth_mm, backThk));

      // Drawer slide holes
      const drawerZones = body.zones.filter((z) => z.module_id === 'drawer_stack');
      if (drawerZones.length > 0) {
        const drawerYs: number[] = [];
        let cumulY = thickness_mm; // start above bottom panel
        for (const zone of body.zones) {
          if (zone.module_id === 'drawer_stack') {
            const cfg = zone.config as { count: number };
            const perDrawer = zone.height_mm / cfg.count;
            for (let i = 0; i < cfg.count; i++) {
              drawerYs.push(cumulY + i * perDrawer);
            }
          }
          cumulY += zone.height_mm;
        }
        ops.push(...generateSlideHoles(drawerYs, body.depth_mm, backThk));
      }

      return ops;
    }

    case 'dessus':
    case 'dessous':
    case 'tablette-fixe': {
      // Confirmat pilot holes in left/right edges
      return generateConfirmatEdgeHoles(part.length_mm);
    }

    case 'porte': {
      // Hinge cup holes
      const doorHeight = Math.max(part.length_mm, part.width_mm);
      const hingesPerDoor = Math.max(2, Math.ceil((doorHeight - 800) / 500) + 2);
      return generateHingeCups(doorHeight, hingesPerDoor);
    }

    default:
      return [];
  }
}
