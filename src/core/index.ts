/**
 * Public API du moteur V3 — point d'entrée stable.
 *
 * Consommable sans React ni DOM. Seul contrat garanti entre le moteur et
 * tout consommateur externe (UI, tests, scripts, CI).
 *
 * Usage :
 *   import { run, loadKnowledge } from '@/core';
 *   const result = run(intent);
 */

export { runPipeline as run } from '../lib/engine/pipeline';
export { loadKnowledge } from '../lib/knowledge';

// Types d'entrée
export type {
  ProjectIntent,
  FurnitureType,
  SpaceDimensions,
  ZoneConfig,
  ContentItem,
  SiteConstraint,
  WallType,
} from '../lib/knowledge/types';
export type { MaterialKey } from '../types';

// Types de sortie
export type { PipelineResult } from '../lib/engine/pipeline';
export type {
  Layout,
  BodyLayout,
  ZoneLayout,
  Structure,
  BodyStructure,
  GeneratedPart,
  HardwareItem,
  ValidationIssue,
  ValidationSeverity,
  ProductionOutput,
} from '../lib/knowledge/types';
export type { ProcurementView } from '../lib/engine/procurement';
