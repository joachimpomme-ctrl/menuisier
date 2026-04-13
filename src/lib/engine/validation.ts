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
  _structure: Structure,
  parts: GeneratedPart[],
  hardware: HardwareItem[],
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
  // 2. Wardrobe min depth 550mm
  // =========================================================================
  const rodZones = (intent.zones ?? []).filter(
    (z) => z.module_id === 'hanging_rod_short' || z.module_id === 'hanging_rod_long',
  );
  if (rodZones.length > 0 && intent.space.depth_mm < 550) {
    issues.push(issue(
      'error',
      true,
      `Penderie : profondeur ${intent.space.depth_mm}mm < 550mm minimum`,
      'VAL_DEPTH_WARDROBE',
      { suggestion: 'Augmenter la profondeur à 550mm ou utiliser une tringle perpendiculaire' },
    ));
  }

  // =========================================================================
  // 3. Door weight check
  // =========================================================================
  const doors = parts.filter((p) => p.type === 'porte');
  const density = mat?.density ?? 680;
  for (const door of doors) {
    const weightKg = (door.length_mm * door.width_mm * door.thickness_mm * density) / 1e9;
    if (weightKg > 15) {
      issues.push(issue(
        'warning',
        false,
        `${door.name} : poids estimé ${weightKg.toFixed(1)}kg — charnières renforcées nécessaires`,
        'VAL_DOOR_WEIGHT',
        { affected_part: door.id },
      ));
    }
    if (weightKg > 25) {
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
  // 4. Anti-tip (RT_001) — H > 1500mm non intégré
  // =========================================================================
  const SUSPENDED = new Set(['etagere_murale']);
  if (
    intent.space.height_mm > 1500 &&
    !SUSPENDED.has(intent.furniture_type)
  ) {
    const hasAntiTip = hardware.some(
      (h) => h.reference === 'anti_tip' || h.reference === 'rail_suspension',
    );
    if (!hasAntiTip) {
      issues.push(issue(
        'error',
        true,
        'Meuble > 1500mm : anti-basculement obligatoire (RT_001)',
        'RT_001',
        { suggestion: 'Ajouter une fixation murale ou un kit anti-basculement' },
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

    if (intent.space.wall_type === 'plasterboard' && totalWeight > 25) {
      issues.push(issue(
        'warning',
        false,
        `Meuble suspendu ~${totalWeight.toFixed(1)}kg sur placo — fixation renforcée recommandée`,
        'RT_006_LOAD',
        { suggestion: 'Utiliser des chevilles Molly ou fixer dans les montants' },
      ));
    }
    if (totalWeight > 50) {
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
  // Active zone: 400-1400mm — adjustable shelves should be here
  const adjShelves = parts.filter((p) => p.type === 'tablette-reglable');
  if (adjShelves.length > 0 && intent.space.height_mm > 1800) {
    issues.push(issue(
      'info',
      false,
      'Zone active (400–1400mm) : placez les objets fréquents dans cette zone',
      'ERGO_ZONE_ACTIVE',
    ));
  }

  // =========================================================================
  // 7. Entry furniture depth (RT_009)
  // =========================================================================
  const ENTRY_TYPES = new Set(['vestiaire_entree', 'meuble_chaussures', 'banquette_coffre']);
  if (ENTRY_TYPES.has(intent.furniture_type) && intent.space.depth_mm > 400) {
    issues.push(issue(
      'warning',
      false,
      `Meuble d'entrée : profondeur ${intent.space.depth_mm}mm > 400mm — vérifier la circulation (80cm min)`,
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
    if (weightKg > 30) {
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

  return issues;
}
