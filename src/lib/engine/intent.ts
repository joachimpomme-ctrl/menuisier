/**
 * Engine step 1 — Intent validation & normalization.
 *
 * Validates a ProjectIntent, fills missing dimensions from the knowledge base
 * preset, and returns normalized intent + any issues found.
 */

import type {
  ProjectIntent,
  FurnitureType,
  ValidationIssue,
  SpaceDimensions,
} from '../knowledge/types';
import { getPresetSpaceDefaults } from '../knowledge/index';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_FURNITURE_TYPES: ReadonlySet<string> = new Set<FurnitureType>([
  'armoire',
  'banquette_coffre',
  'bibliotheque',
  'buffet',
  'bureau',
  'cave_vin',
  'commode',
  'cuisine',
  'etagere_murale',
  'lit_cabane_mezzanine',
  'meuble_chaussures',
  'meuble_salle_de_bain',
  'meuble_tv',
  'placard',
  'sous_escalier',
  'table',
  'vestiaire_entree',
]);

interface DimensionRange {
  min: number;
  max: number;
}

const DIMENSION_RANGES: Record<keyof Pick<SpaceDimensions, 'width_mm' | 'height_mm' | 'depth_mm' | 'plinth_mm'>, DimensionRange> = {
  width_mm:  { min: 200, max: 6000 },
  height_mm: { min: 200, max: 3000 },
  depth_mm:  { min: 100, max: 1000 },
  plinth_mm: { min: 0,   max: 200 },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface IntentResult {
  valid: boolean;
  normalized: ProjectIntent;
  issues: ValidationIssue[];
}

let _issueCounter = 0;
function nextIssueId(): string {
  return `INT_${String(++_issueCounter).padStart(3, '0')}`;
}

/** Reset issue counter (for tests). */
export function _resetCounter(): void {
  _issueCounter = 0;
}

export function validateIntent(intent: ProjectIntent): IntentResult {
  const issues: ValidationIssue[] = [];
  const normalized: ProjectIntent = structuredClone(intent);

  // --- Furniture type ---
  if (!VALID_FURNITURE_TYPES.has(intent.furniture_type)) {
    issues.push({
      id: nextIssueId(),
      severity: 'error',
      blocking: true,
      message: `Type de meuble inconnu : "${intent.furniture_type}"`,
      rule_id: 'INTENT_TYPE',
    });
    return { valid: false, normalized, issues };
  }

  // --- Fill missing dimensions from preset ---
  const presetDefaults = getPresetSpaceDefaults(intent.furniture_type);
  for (const [key, value] of Object.entries(presetDefaults)) {
    const dimKey = key as keyof Pick<SpaceDimensions, 'width_mm' | 'height_mm' | 'depth_mm' | 'plinth_mm'>;
    if ((normalized.space[dimKey] === undefined || normalized.space[dimKey] === 0) && typeof value === 'number') {
      normalized.space[dimKey] = value;
    }
  }

  // --- Validate dimensions ---
  for (const [key, range] of Object.entries(DIMENSION_RANGES)) {
    const dimKey = key as keyof typeof DIMENSION_RANGES;
    const value = normalized.space[dimKey];

    if (value === undefined || value === null) {
      issues.push({
        id: nextIssueId(),
        severity: 'error',
        blocking: true,
        message: `Dimension manquante : ${dimKey}`,
        rule_id: 'INTENT_DIM_MISSING',
      });
      continue;
    }

    if (value < range.min || value > range.max) {
      issues.push({
        id: nextIssueId(),
        severity: 'error',
        blocking: true,
        message: `${dimKey} = ${value}mm hors limites [${range.min}–${range.max}]`,
        suggestion: `Ajuster entre ${range.min} et ${range.max}mm`,
        rule_id: 'INTENT_DIM_RANGE',
      });
    }
  }

  // --- Wall type ---
  if (normalized.space.wall_type === 'unknown') {
    issues.push({
      id: nextIssueId(),
      severity: 'warning',
      blocking: false,
      message: 'Type de mur inconnu — les fixations seront génériques',
      suggestion: 'Préciser le type de mur pour des fixations adaptées',
      rule_id: 'INTENT_WALL_TYPE',
    });
  }

  const hasBlockingIssue = issues.some((i) => i.blocking);
  return { valid: !hasBlockingIssue, normalized, issues };
}
