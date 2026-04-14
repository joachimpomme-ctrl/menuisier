/**
 * Engine pipeline — intent → layout → structure → geometry → hardware → validation → production.
 *
 * Limitations actuelles :
 * - drilling_plans : non implémenté (toujours [])
 * - Portes : calculées automatiquement par layout.ts selon le type et la largeur
 */

import type {
  ProjectIntent,
  Layout,
  Structure,
  GeneratedPart,
  HardwareItem,
  ValidationIssue,
  ProductionOutput,
  ProjectStateV3,
} from '../knowledge/types';
import type { MaterialKey } from '../../types';
import { validateIntent } from './intent';
import { generateLayout } from './layout';
import { generateStructure } from './structure';
import { generateParts } from './geometry';
import { selectHardware } from './hardware';
import { validateProject } from './validation';
import { generateProduction } from './production';
import { generatedPartsToLegacy } from '../knowledge/types';
import { MATERIALS } from '../../data/materials';

// ---------------------------------------------------------------------------
// Pipeline result
// ---------------------------------------------------------------------------

export interface PipelineResult {
  intent: ProjectIntent;
  layout: Layout;
  structure: Structure;
  parts: GeneratedPart[];
  hardware: HardwareItem[];
  validation: ValidationIssue[];
  production: ProductionOutput | null;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

export function runPipeline(rawIntent: ProjectIntent): PipelineResult {
  // Step 1 — Intent validation & normalization
  const intentResult = validateIntent(rawIntent);

  if (!intentResult.valid) {
    // Return early with empty downstream data
    return {
      intent: intentResult.normalized,
      layout: { bodies: [] },
      structure: { bodies: [] },
      parts: [],
      hardware: [],
      validation: intentResult.issues,
      production: null,
    };
  }

  const intent = intentResult.normalized;

  // Step 2 — Layout
  const layoutResult = generateLayout(intent);

  // Step 3 — Structure
  const structure = generateStructure(layoutResult.layout, intent);

  // Step 4 — Geometry
  const parts = generateParts(structure, layoutResult.layout, intent);

  // Step 5 — Hardware
  const hardware = selectHardware(parts, structure, intent);

  // Step 6 — Validation
  const projectIssues = validateProject(intent, layoutResult.layout, structure, parts, hardware);

  // Collect all issues
  const validation: ValidationIssue[] = [
    ...intentResult.issues,
    ...layoutResult.issues,
    ...projectIssues,
  ];

  // Step 7 — Production
  const hasBlocking = validation.some((v) => v.blocking);
  const production = hasBlocking
    ? null
    : generateProduction(intent, parts, hardware, structure, validation, layoutResult.layout);

  return {
    intent,
    layout: layoutResult.layout,
    structure,
    parts,
    hardware,
    validation,
    production,
  };
}

// ---------------------------------------------------------------------------
// Pipeline result → AppState conversion
// ---------------------------------------------------------------------------

/**
 * Convert a PipelineResult to a ProjectStateV3 for the classic editor.
 *
 * ProjectStateV3 extends AppState with optional V3 fields, so all legacy
 * code (tabs, validation, nesting, PDF) continues to work unchanged.
 *
 * Conserved in AppState: pieces, body dimensions, doorConfig, material, panel.
 * Conserved in V3 extension: intent, hardware, validation issues, assumptions.
 * Approximated: plinthDepth (2 cm), kerf (0.3 cm), sharedBoundaries (false).
 * Not preserved: edge_banding, drilling ops, locked state, standard_part_id.
 */
export function pipelineResultToAppState(
  result: PipelineResult,
  materialKey: MaterialKey,
): ProjectStateV3 {
  const mat = MATERIALS[materialKey];
  const panel = mat.panels[0];
  const { bodies } = generatedPartsToLegacy(result.parts, result.layout);

  const space = result.intent.space;

  return {
    // --- Legacy AppState fields ---
    materialKey,
    project: {
      name: result.intent.furniture_type.replace(/_/g, ' '),
      wallWidth: +(space.width_mm / 10).toFixed(1),
      wallDepth: +(space.depth_mm / 10).toFixed(1),
      ceilingHeight: +(space.height_mm / 10).toFixed(1),
      plinthHeight: +(space.plinth_mm / 10).toFixed(1),
      plinthDepth: 2,
    },
    panel: {
      width: panel.w,
      height: panel.h,
      thickness: mat.defaultThickness / 10,
    },
    kerf: 0.3,
    costConfig: {
      panelPrice: panel.defaultPrice,
    },
    bodies,
    sharedBoundaries: Array(Math.max(0, bodies.length - 1)).fill(false),
    extraPanels: [],
    // --- V3 extension fields (preserved for display & future use) ---
    intent: result.intent,
    hardwareList: result.hardware,
    validationIssues: result.validation,
    assumptions: result.production?.assumptions,
  };
}
