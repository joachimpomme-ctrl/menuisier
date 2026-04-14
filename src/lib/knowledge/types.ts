/**
 * V3.1 Pipeline Types
 *
 * All dimensions in this module are in mm unless suffixed otherwise.
 * The existing AppState (src/types.ts) works in cm — the conversion
 * boundary is generatedPartsToLegacy() at the bottom of this file.
 */

import type { MaterialKey, AppState, Body, Piece, PieceType, DoorConfig, DoorPoseType } from '../../types';

// ---------------------------------------------------------------------------
// Furniture catalogue — 17 types from base_v3_normalized.json "projets"
// ---------------------------------------------------------------------------

export type FurnitureType =
  | 'armoire'
  | 'banquette_coffre'
  | 'bibliotheque'
  | 'buffet'
  | 'bureau'
  | 'cave_vin'
  | 'commode'
  | 'cuisine'
  | 'etagere_murale'
  | 'lit_cabane_mezzanine'
  | 'meuble_chaussures'
  | 'meuble_salle_de_bain'
  | 'meuble_tv'
  | 'placard'
  | 'sous_escalier'
  | 'table'
  | 'vestiaire_entree';

// ---------------------------------------------------------------------------
// Intent — what the user wants (step 1)
// ---------------------------------------------------------------------------

export type WallType = 'concrete' | 'hollow_brick' | 'plasterboard' | 'unknown';

export interface SpaceDimensions {
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  plinth_mm: number;
  wall_type: WallType;
}

export interface ContentItem {
  /** Key from ergonomie.objets_reference (e.g. "shirts", "books_pocket") */
  category: string;
  quantity: number;
}

export interface SiteConstraint {
  type: 'pipe' | 'socket' | 'beam' | 'sloped_ceiling' | 'uneven_wall' | 'other';
  x_mm?: number;
  y_mm?: number;
  width_mm?: number;
  height_mm?: number;
  description?: string;
}

export interface ProjectIntent {
  furniture_type: FurnitureType;
  space: SpaceDimensions;
  material_key: MaterialKey;
  variant?: string;
  /** "contenu à ranger" mode — auto-generates zones */
  contents?: ContentItem[];
  /** "configurateur" mode — manual zone composition */
  zones?: ZoneConfig[];
  site_constraints?: SiteConstraint[];
  /** Override automatic door generation: true = force doors, false = suppress doors */
  door_override?: boolean;
  /** Override suspended detection: true = force rail mounting */
  suspended_override?: boolean;
}

// ---------------------------------------------------------------------------
// Modules — union discriminée, 8 variantes
// ---------------------------------------------------------------------------

export type ModuleConfig =
  | { type: 'shelf_adjustable'; count: number; spacing_mm: number }
  | { type: 'drawer_stack'; count: number; distribution: 'equal' | 'progressive' | 'custom'; step_mm?: number }
  | { type: 'hanging_rod_short' }
  | { type: 'hanging_rod_long' }
  | { type: 'shoe_rack_inclined'; tiers: number }
  | { type: 'tv_niche'; ventilation: boolean }
  | { type: 'wine_rack'; columns: number; rows: number }
  | { type: 'bench_storage'; has_backrest: boolean };

export type ModuleType = ModuleConfig['type'];

// ---------------------------------------------------------------------------
// Layout — disposition des zones dans les caissons (step 2)
// ---------------------------------------------------------------------------

export interface ZoneConfig {
  module_id: ModuleType;
  height_mm: number;
  config: ModuleConfig;
}

export interface DoorLayout {
  type: 'hinged' | 'sliding' | 'lift_up' | 'none';
  count: number;
  overlay: 'full' | 'half' | 'inset';
}

export interface ZoneLayout {
  module_id: ModuleType;
  height_mm: number;
  config: ModuleConfig;
}

export interface BodyLayout {
  body_id: string;
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  zones: ZoneLayout[];
  doors?: DoorLayout;
}

export interface Layout {
  bodies: BodyLayout[];
}

// ---------------------------------------------------------------------------
// Structure — squelette du meuble (step 3)
// ---------------------------------------------------------------------------

export interface FixedShelfPlacement {
  y_mm: number;
  /** Purpose: is this a structural shelf or a zone separator? */
  role: 'top' | 'bottom' | 'zone_separator' | 'support';
}

export interface BackPanelSpec {
  type: 'groove' | 'rebate' | 'applied';
  thickness_mm: number;
}

export type BracingType = 'back_panel' | 'diagonal_strut' | 'wall_mount' | 'none';

export interface WallMounting {
  type: 'bracket' | 'french_cleat' | 'rail' | 'anti_tip';
  position_y_mm: number;
}

export interface PlinthSpec {
  type: 'legs' | 'integrated' | 'none';
  height_mm: number;
}

export interface BodyStructure {
  body_id: string;
  fixed_shelves: FixedShelfPlacement[];
  back_panel: BackPanelSpec;
  bracing: BracingType;
  plinth: PlinthSpec;
  wall_mounting?: WallMounting;
}

export interface Structure {
  bodies: BodyStructure[];
}

// ---------------------------------------------------------------------------
// Geometry — pièces calculées (step 4)
// ---------------------------------------------------------------------------

export type EdgeBandingSide = 'front' | 'back' | 'left' | 'right';

export interface DrillingOp {
  type: 'system_32' | 'hinge_cup_35' | 'dowel_8' | 'shelf_pin_5' | 'cam_15' | 'other';
  x_mm: number;
  y_mm: number;
  diameter_mm: number;
  depth_mm: number;
  face: 'front' | 'back' | 'edge_top' | 'edge_bottom' | 'edge_left' | 'edge_right';
}

/**
 * Extended piece type for V3 — superset of the existing PieceType.
 * Includes new types generated by modules (drawers, shoe rack, wine rack, bench).
 */
export type GeneratedPartType =
  | PieceType
  | 'tiroir-caisson'
  | 'tiroir-fond'
  | 'tablette-inclinee'
  | 'croisillon'
  | 'assise'
  | 'coffre'
  | 'traverse'
  | 'plinthe'
  | 'dessus'
  | 'dessous';

export interface GeneratedPart {
  id: string;
  name: string;
  length_mm: number;
  width_mm: number;
  thickness_mm: number;
  qty: number;
  type: GeneratedPartType;
  body_id: string;
  position?: { x_mm: number; y_mm: number };
  edge_banding?: EdgeBandingSide[];
  drilling?: DrillingOp[];
  /** true = user has manually modified this part — skip regeneration */
  locked: boolean;
  /** Links to a StandardPart definition for the user's parts library */
  standard_part_id?: string;
}

// ---------------------------------------------------------------------------
// Hardware — quincaillerie (step 5)
// ---------------------------------------------------------------------------

export type HardwareCategory =
  | 'hinge'
  | 'slide'
  | 'shelf_support'
  | 'screw'
  | 'connector'
  | 'handle'
  | 'wall_mount'
  | 'strut'
  | 'lock'
  | 'rod'
  | 'cable_pass'
  | 'gas_strut'
  | 'edge_band'
  | 'other';

export interface HardwareItem {
  id: string;
  name: string;
  quantity: number;
  category: HardwareCategory;
  reference?: string;
  unit_price_eur?: number;
}

// ---------------------------------------------------------------------------
// Validation — 4 niveaux hiérarchisés (step 6)
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'suggestion' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  /** true = blocks export / production */
  blocking: boolean;
  message: string;
  suggestion?: string;
  rule_id?: string;
  affected_part?: string;
}

// ---------------------------------------------------------------------------
// Production — livrables (step 7)
// ---------------------------------------------------------------------------

export interface Assumption {
  key: string;
  value: string;
  reason: string;
  user_should_verify: boolean;
}

export interface AssemblyStep {
  step_number: number;
  title: string;
  instructions: string[];
  parts_involved: string[];
  hardware_involved?: string[];
  tip?: string;
}

export interface PanelNeed {
  panel_label: string;
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  count: number;
  unit_price_eur: number;
  /** If set, this panel comes from a standard part (commercial product). */
  standard_part_id?: string;
}

export interface ShoppingList {
  panels: PanelNeed[];
  hardware: HardwareItem[];
  tools_needed: string[];
  estimated_cost_eur: number;
}

export type DifficultyLevel = 'debutant' | 'intermediaire' | 'avance';

export interface ProjectSummary {
  dimensions_mm: { w: number; h: number; d: number };
  total_parts: number;
  total_weight_kg: number;
  difficulty: DifficultyLevel;
}

export interface ProductionOutput {
  assumptions: Assumption[];
  shopping_list: ShoppingList;
  cutting_plans: unknown; // NestingResult from nesting.ts — imported at call site
  drilling_plans: DrillingOp[][];
  assembly_guide: AssemblyStep[];
  summary: ProjectSummary;
}

// ---------------------------------------------------------------------------
// Override levels
// ---------------------------------------------------------------------------

export type OverrideLevel = 'none' | 'layout' | 'manual';

// ---------------------------------------------------------------------------
// ProjectStateV3 — extends AppState with optional V3 fields
// ---------------------------------------------------------------------------

/**
 * V3 project state. All new fields are optional so that V2 projects
 * loaded from storage continue to work without migration.
 */
export interface ProjectStateV3 extends AppState {
  intent?: ProjectIntent;
  overrideLevel?: OverrideLevel;
  hardwareList?: HardwareItem[];
  validationIssues?: ValidationIssue[];
  assumptions?: Assumption[];
}

// ---------------------------------------------------------------------------
// Standard Parts Library — user's reusable part definitions
// ---------------------------------------------------------------------------

export type StandardPartCategory =
  | 'shelf'
  | 'side_panel'
  | 'door'
  | 'drawer_front'
  | 'back_panel'
  | 'top_bottom'
  | 'divider'
  | 'custom';

export interface PreDrilling {
  type: DrillingOp['type'];
  pattern: 'system_32' | 'single' | 'pair' | 'custom';
  count?: number;
}

export type PartSource = 'generated' | 'user' | 'template';

export interface StandardPart {
  id: string;
  name: string;
  category: StandardPartCategory;
  length_mm: number;
  width_mm: number;
  thickness_mm: number;
  material_key?: MaterialKey;
  edge_banding?: EdgeBandingSide[];
  pre_drilling?: PreDrilling[];
  source: PartSource;
}

export interface UserPartsLibrary {
  parts: StandardPart[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Conversion: GeneratedPart[] → legacy Body[] (identified in 0bis analysis)
// ---------------------------------------------------------------------------

/**
 * Maps V3 GeneratedPartType to the closest existing PieceType.
 * New types that don't exist in the legacy union fall back to 'autre'.
 */
const PART_TYPE_TO_PIECE_TYPE: Record<GeneratedPartType, PieceType> = {
  'joue': 'joue',
  'tablette-fixe': 'tablette-fixe',
  'tablette-reglable': 'tablette-reglable',
  'separateur': 'separateur',
  'bandeau': 'bandeau',
  'porte': 'porte',
  'tiroir-facade': 'tiroir-facade',
  'fond': 'fond',
  'autre': 'autre',
  // New V3 types → best legacy match
  'tiroir-caisson': 'autre',
  'tiroir-fond': 'fond',
  'tablette-inclinee': 'tablette-fixe',
  'croisillon': 'autre',
  'assise': 'tablette-fixe',
  'coffre': 'autre',
  'traverse': 'autre',
  'plinthe': 'bandeau',
  'dessus': 'tablette-fixe',
  'dessous': 'tablette-fixe',
};

/**
 * Convert V3 pipeline output (GeneratedPart[], flat list with body_id) into
 * the legacy Body[] structure consumed by the existing UI (StructureTab,
 * DebitTab, PlanTab, etc.) and by nesting/validation/cost/steps modules.
 *
 * All dimensions are converted from mm (pipeline) to cm (AppState).
 *
 * The intent provides body-level metadata (width, depth) that GeneratedPart
 * alone does not carry.
 */
export function generatedPartsToLegacy(
  parts: GeneratedPart[],
  layout: Layout,
): { bodies: Body[] } {
  // Index layout bodies by id for O(1) lookup
  const layoutIndex = new Map<string, BodyLayout>();
  for (const bl of layout.bodies) {
    layoutIndex.set(bl.body_id, bl);
  }

  // Collect unique body_ids preserving insertion order from layout
  const bodyIds = layout.bodies.map((bl) => bl.body_id);

  const OVERLAY_TO_POSE: Record<string, DoorPoseType> = {
    full: 'enveloppante',
    half: 'demi-recouvrement',
    inset: 'affleurante',
  };

  const bodies: Body[] = bodyIds.map((bodyId) => {
    const bl = layoutIndex.get(bodyId);
    const bodyParts = parts.filter((p) => p.body_id === bodyId);

    const pieces: Piece[] = bodyParts.map((gp) => {
      const piece: Piece = {
        id: gp.id,
        name: gp.name,
        length: +(gp.length_mm / 10).toFixed(1),
        width: +(gp.width_mm / 10).toFixed(1),
        qty: gp.qty,
        type: PART_TYPE_TO_PIECE_TYPE[gp.type],
      };

      // Thickness override: only set if different from what will be the panel default
      // (the caller sets panel.thickness on AppState — we can't know it here, so we
      // always include the thickness and let normalizeProject clean it up)
      piece.thickness = +(gp.thickness_mm / 10).toFixed(2);

      // Position (mm → cm)
      if (gp.position) {
        if (gp.position.y_mm !== undefined) {
          piece.posY = +(gp.position.y_mm / 10).toFixed(1);
        }
        if (gp.position.x_mm !== undefined) {
          piece.posX = +(gp.position.x_mm / 10).toFixed(1);
        }
      }

      // Preserve edge banding info for display in legacy tabs
      if (gp.edge_banding && gp.edge_banding.length > 0) {
        piece.edge_banding = gp.edge_banding;
      }

      // Preserve drilling count for display
      if (gp.drilling && gp.drilling.length > 0) {
        piece.drilling_count = gp.drilling.length;
      }

      return piece;
    });

    // Map V3 DoorLayout → legacy DoorConfig
    let doorConfig: DoorConfig | undefined;
    if (bl?.doors) {
      doorConfig = {
        count: bl.doors.count as 1 | 2,
        poseType: OVERLAY_TO_POSE[bl.doors.overlay] ?? 'enveloppante',
      };
    }

    return {
      id: bodyId,
      name: bl ? `Corps ${bodyIds.indexOf(bodyId) + 1}` : bodyId,
      width: bl ? +(bl.width_mm / 10).toFixed(1) : 0,
      depth: bl ? +(bl.depth_mm / 10).toFixed(1) : 0,
      pieces,
      doorConfig,
    };
  });

  return { bodies };
}
