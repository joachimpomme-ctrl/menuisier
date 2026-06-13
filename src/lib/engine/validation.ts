/**
 * Engine step 6 — Project validation.
 *
 * Checks structural, ergonomic, and safety rules across the full project.
 * 4 severity levels: error (blocking), warning, suggestion, info.
 *
 * Does NOT replace src/lib/validation.ts (legacy AppState validator).
 */

import type {
  ProjectIntent,
  Layout,
  Structure,
  GeneratedPart,
  HardwareItem,
  ValidationIssue,
  ValidationSeverity,
} from '../knowledge/types';
import { THRESHOLDS } from '../knowledge/rules/thresholds';
import { MATERIALS } from '../../data/materials';

// ---------------------------------------------------------------------------
// Issue helpers
// ---------------------------------------------------------------------------

let _issueCounter = 0;
function nextId(): string {
  return `VAL_${String(++_issueCounter).padStart(3, '0')}`;
}

export function _resetValCounter(): void {
  _issueCounter = 0;
}

function issue(
  severity: ValidationSeverity,
  blocking: boolean,
  message: string,
  rule_id: string,
  opts?: { suggestion?: string; affected_part?: string },
): ValidationIssue {
  return {
    id: nextId(),
    severity,
    blocking,
    message,
    rule_id,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// Deflection calculation (same formula as legacy validation.ts)
// f = (5·q·L⁴) / (384·E·I), I = b·h³/12
// Admissible: L/200
// ---------------------------------------------------------------------------

function checkDeflection(
  spanMm: number,
  depthMm: number,
  thicknessMm: number,
  flexMPa: number,
  loadKgPerM: number = 8,
): { deflectionMm: number; maxMm: number; ok: boolean } {
  const L = spanMm;
  const b = depthMm;
  const h = thicknessMm;
  const E = flexMPa * 300;
  const I = (b * Math.pow(h, 3)) / 12;
  const q = (loadKgPerM * 9.81) / 1000; // N/mm
  const f = (5 * q * Math.pow(L, 4)) / (384 * E * I);
  const fMax = L / 200;
  return {
    deflectionMm: Math.round(f * 10) / 10,
    maxMm: Math.round(fMax * 10) / 10,
    ok: f <= fMax,
  };
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

export function validateProject(
  intent: ProjectIntent,
  layout: Layout,
  structure: Structure,
  parts: GeneratedPart[],
  _hardware: HardwareItem[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const mat = MATERIALS[intent.material_key];
  const thickness = mat?.defaultThickness ?? 18;
  const flexMPa = mat?.flexMPa ?? 30;

  // =========================================================================
  // 1. Shelf span check (RT_004)
  // =========================================================================
  const maxSpanMm = (mat?.maxSpan18 ?? 80) * 10; // maxSpan18 is in cm
  const shelves = parts.filter(
    (p) => p.type === 'tablette-reglable' || p.type === 'tablette-fixe',
  );
  for (const shelf of shelves) {
    if (shelf.length_mm > maxSpanMm) {
      const defl = checkDeflection(shelf.length_mm, shelf.width_mm, thickness, flexMPa);
      issues.push(issue(
        'warning',
        false,
        `${shelf.name} : portée ${shelf.length_mm}mm > max recommandé ${maxSpanMm}mm (flèche ${defl.deflectionMm}mm, max ${defl.maxMm}mm)`,
        'RT_004',
        {
          suggestion: 'Ajouter un séparateur vertical ou réduire la portée',
          affected_part: shelf.id,
        },
      ));
    }
  }

  // =========================================================================
  // 2. Wardrobe min depth (VAL_ROD_DEPTH)
  // =========================================================================
  const rodZones = (intent.zones ?? []).filter(
    (z) => z.module_id === 'hanging_rod_short' || z.module_id === 'hanging_rod_long',
  );
  if (
    rodZones.length > 0 &&
    intent.space.depth_mm < THRESHOLDS.WARDROBE_ROD_MIN_DEPTH_MM
  ) {
    issues.push(issue(
      'warning',
      false,
      `Profondeur ${intent.space.depth_mm}mm insuffisante pour une penderie (${THRESHOLDS.WARDROBE_ROD_MIN_DEPTH_MM}mm min pour cintres standard)`,
      'VAL_ROD_DEPTH',
      {
        suggestion: `Augmenter la profondeur à ${THRESHOLDS.WARDROBE_ROD_MIN_DEPTH_MM}mm ou utiliser une tringle perpendiculaire (pull-out)`,
      },
    ));
  }

  // =========================================================================
  // 3. Door weight check
  // =========================================================================
  const doors = parts.filter((p) => p.type === 'porte');
  const density = mat?.density ?? 680;
  for (const door of doors) {
    const weightKg = (door.length_mm * door.width_mm * door.thickness_mm * density) / 1e9;
    if (weightKg > THRESHOLDS.DOOR_WEIGHT_REINFORCE_KG) {
      issues.push(issue(
        'warning',
        false,
        `${door.name} : poids estimé ${weightKg.toFixed(1)}kg — charnières renforcées nécessaires`,
        'VAL_DOOR_WEIGHT',
        { affected_part: door.id },
      ));
    }
    if (weightKg > THRESHOLDS.SUSPENDED_PLACO_WARN_KG) {
      issues.push(issue(
        'error',
        true,
        `${door.name} : poids estimé ${weightKg.toFixed(1)}kg — trop lourd pour des charnières standard`,
        'VAL_DOOR_WEIGHT_MAX',
        {
          suggestion: 'Diviser en 2 portes ou réduire les dimensions',
          affected_part: door.id,
        },
      ));
    }
  }

  // =========================================================================
  // 4. Anti-tip (VAL_ANTI_TIP)
  // =========================================================================
  const SUSPENDED = new Set(['etagere_murale']);
  if (
    intent.space.height_mm > THRESHOLDS.ANTI_TIP_HEIGHT_MM &&
    !SUSPENDED.has(intent.furniture_type)
  ) {
    const hasAntiTip = structure.bodies.some(
      (b) => b.wall_mounting?.type === 'anti_tip' || b.wall_mounting?.type === 'rail',
    );
    if (!hasAntiTip) {
      issues.push(issue(
        'warning',
        false,
        `Meuble de ${intent.space.height_mm}mm sans fixation murale — risque de basculement`,
        'VAL_ANTI_TIP',
        { suggestion: 'Ajouter une équerre anti-basculement ou fixer au mur (obligatoire si enfants)' },
      ));
    }
  }

  // =========================================================================
  // 5. Wall load for suspended furniture (RT_006)
  // =========================================================================
  if (SUSPENDED.has(intent.furniture_type)) {
    // Estimate total weight
    const totalWeight = parts.reduce((sum, p) => {
      return sum + (p.length_mm * p.width_mm * p.thickness_mm * density * p.qty) / 1e9;
    }, 0);

    if (
      intent.space.wall_type === 'plasterboard' &&
      totalWeight > THRESHOLDS.SUSPENDED_PLACO_WARN_KG
    ) {
      issues.push(issue(
        'warning',
        false,
        `Meuble suspendu ~${totalWeight.toFixed(1)}kg sur placo — fixation renforcée recommandée`,
        'RT_006_LOAD',
        { suggestion: 'Utiliser des chevilles Molly ou fixer dans les montants' },
      ));
    }
    if (totalWeight > THRESHOLDS.SUSPENDED_MAX_KG) {
      issues.push(issue(
        'error',
        true,
        `Meuble suspendu ~${totalWeight.toFixed(1)}kg — trop lourd pour une fixation murale standard`,
        'RT_006_LOAD_MAX',
        { suggestion: 'Ajouter des pieds ou réduire les dimensions' },
      ));
    }
  }

  // =========================================================================
  // 6. Ergonomic zones
  // =========================================================================
  // Active zone: adjustable shelves should be here
  const adjShelves = parts.filter((p) => p.type === 'tablette-reglable');
  if (adjShelves.length > 0 && intent.space.height_mm > 1800) {
    issues.push(issue(
      'info',
      false,
      `Zone active (${THRESHOLDS.ERGO_ZONE_LOW_MM}–${THRESHOLDS.ERGO_ZONE_HIGH_MM}mm) : placez les objets fréquents dans cette zone`,
      'ERGO_ZONE_ACTIVE',
    ));
  }

  // =========================================================================
  // 7. Entry furniture depth (RT_009)
  // =========================================================================
  const ENTRY_TYPES = new Set(['vestiaire_entree', 'meuble_chaussures', 'banquette_coffre']);
  if (
    ENTRY_TYPES.has(intent.furniture_type) &&
    intent.space.depth_mm > THRESHOLDS.ENTRY_MAX_DEPTH_MM
  ) {
    issues.push(issue(
      'warning',
      false,
      `Meuble d'entrée : profondeur ${intent.space.depth_mm}mm > ${THRESHOLDS.ENTRY_MAX_DEPTH_MM}mm — vérifier la circulation (80cm min)`,
      'RT_009',
    ));
  }

  // =========================================================================
  // 8. Wine rack load (RT_013)
  // =========================================================================
  const wineZones = (intent.zones ?? []).filter((z) => z.module_id === 'wine_rack');
  for (const wz of wineZones) {
    const cfg = wz.config as { type: 'wine_rack'; columns: number; rows: number };
    const bottles = cfg.columns * cfg.rows;
    const weightKg = bottles * 1.3;
    if (weightKg > THRESHOLDS.WINE_RACK_WARN_KG) {
      issues.push(issue(
        'warning',
        false,
        `Cave à vin : ${bottles} bouteilles (~${weightKg.toFixed(0)}kg) — vérifier la structure porteuse`,
        'RT_013',
      ));
    }
  }

  // =========================================================================
  // 9. Ventilation for shoe/textile storage (RT_010)
  // =========================================================================
  const VENTILATION_TYPES = new Set(['meuble_chaussures', 'banquette_coffre']);
  if (VENTILATION_TYPES.has(intent.furniture_type)) {
    const hasDoors = layout.bodies.some((b) => b.doors && b.doors.type !== 'none');
    if (hasDoors) {
      issues.push(issue(
        'suggestion',
        false,
        'Stockage chaussures/textiles fermé — prévoir des aérations',
        'RT_010',
        { suggestion: 'Ajouter des grilles de ventilation ou des perforations dans le fond' },
      ));
    }
  }

  // =========================================================================
  // 10. Suspended furniture on unknown wall (VAL_WALL_TYPE_SUSPENDED)
  // =========================================================================
  const isSuspended = structure.bodies.some((b) => b.wall_mounting?.type === 'rail');
  if (isSuspended && intent.space.wall_type === 'unknown') {
    issues.push(issue(
      'warning',
      false,
      'Meuble suspendu sur type de mur inconnu — fixation potentiellement inadaptée',
      'VAL_WALL_TYPE_SUSPENDED',
      { suggestion: 'Identifier le type de mur (béton, placo, brique) pour choisir les chevilles adaptées. Placo creux nécessite des chevilles Molly ou à expansion' },
    ));
  }

  // =========================================================================
  // 11. Tilt-up clearance (VAL_TILT_CLEARANCE)
  // A carcass assembled flat on the floor must be tilted upright in place. Its
  // diagonal √(height² + depth²) always exceeds its height, so a floor-to-ceiling
  // unit cannot be raised once built lying down. The engine has no separate
  // ceiling field (space.height_mm is both furniture height and the ceiling for
  // such pieces), so we warn for tall, non-suspended carcasses where this bites.
  // =========================================================================
  const TILT_MIN_HEIGHT_MM = 2000; // ~floor-to-ceiling: below this the room almost always has headroom
  if (
    intent.space.height_mm >= TILT_MIN_HEIGHT_MM &&
    !SUSPENDED.has(intent.furniture_type)
  ) {
    const h = intent.space.height_mm;
    const d = intent.space.depth_mm;
    const diagonal = Math.round(Math.sqrt(h * h + d * d));
    const maxJoue = Math.floor(Math.sqrt(Math.max(0, h * h - d * d)));
    issues.push(issue(
      'warning',
      false,
      `Caisson ${h}mm de haut × ${d}mm de profondeur : diagonale ${diagonal}mm. Assemblé à plat puis redressé, il ne passe pas si le plafond est à ~${h}mm.`,
      'VAL_TILT_CLEARANCE',
      {
        suggestion: `Assembler le caisson debout (joues à la verticale) directement en place — ou, si le plafond fait ${h}mm, réduire la hauteur de joue à ${maxJoue}mm (= √(plafond²−profondeur²)) pour pouvoir le relever couché.`,
      },
    ));
  }

  return issues;
}
