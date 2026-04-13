/**
 * Knowledge base loader — fetches and caches base_v3_normalized.json.
 *
 * This module is SEPARATE from src/lib/knowledgeStore.ts which manages
 * user-uploaded knowledge entries. This one loads the read-only reference
 * data (ergonomics, hardware, formulas, project presets, rules).
 */

import type { FurnitureType } from './types';

// ---------------------------------------------------------------------------
// Raw JSON shape (loosely typed — the JSON is large and heterogeneous)
// ---------------------------------------------------------------------------

interface Formula {
  id: string;
  name: string;
  inputs: string[];
  expression: string | Record<string, string>;
  output: string | Record<string, string>;
  parameters?: Record<string, unknown>;
  note?: string;
}

interface TransversalRule {
  id: string;
  regle: string;
  types_concernes?: string[];
  severite: string;
  [key: string]: unknown;
}

interface ProjectPreset {
  id: string;
  nom: string;
  icone: string;
  description: string;
  composants_obligatoires: string[];
  composants_optionnels: string[];
  dimensions_defaut: Record<string, number>;
  generation: Record<string, unknown>;
  quincaillerie_associee: Record<string, unknown>;
  contraintes: Array<{ regle: string; action: string }>;
  variantes: Array<Record<string, unknown>>;
  pieges_courants: string[];
}

interface KnowledgeBase {
  metadata: Record<string, unknown>;
  ergonomie: {
    principes_generaux: Record<string, unknown>;
    types_meubles: Record<string, Record<string, unknown>>;
    objets_reference: Record<string, unknown>;
    [key: string]: unknown;
  };
  quincaillerie: {
    formulas: Formula[];
    [key: string]: unknown;
  };
  conception: {
    formulas: Formula[];
    [key: string]: unknown;
  };
  projets: Record<string, ProjectPreset>;
  regles_transversales: TransversalRule[];
}

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

let _kb: KnowledgeBase | null = null;
let _loading: Promise<void> | null = null;

// All formulas indexed by id (F_CON_* + F_QUI_*)
let _formulaIndex: Map<string, Formula> = new Map();

// Modules catalogue from ARCHITECTURE_V3.1_FINAL (declared in modules.ts,
// but we expose a getter here for convenience once modules.ts exists).
// For now this is a placeholder — getModule() returns from the quincaillerie
// and conception sections.
let _moduleIndex: Map<string, Record<string, unknown>> = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch and cache the knowledge base. Safe to call multiple times —
 * subsequent calls return the same promise.
 */
export async function loadKnowledge(): Promise<void> {
  if (_kb) return;
  if (_loading) return _loading;

  _loading = (async () => {
    try {
      const res = await fetch('/knowledge/base_v3_normalized.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _kb = (await res.json()) as KnowledgeBase;
      _buildIndices();
    } catch (err) {
      console.error('[knowledge] Failed to load base_v3_normalized.json:', err);
      // Leave _kb null — all getters return safe empty values
    } finally {
      _loading = null;
    }
  })();

  return _loading;
}

/** True once the knowledge base has been successfully loaded. */
export function isLoaded(): boolean {
  return _kb !== null;
}

/**
 * Get a project preset by furniture type.
 * Returns the full preset object (dimensions, components, constraints, variants).
 */
export function getProjectPreset(type: FurnitureType): ProjectPreset | null {
  return _kb?.projets[type] ?? null;
}

/**
 * Get a module definition by id.
 * Currently searches conception sections — will be replaced by modules.ts catalogue.
 */
export function getModule(id: string): Record<string, unknown> | null {
  return _moduleIndex.get(id) ?? null;
}

/**
 * Get a formula by id (F_CON_* or F_QUI_*).
 */
export function getFormula(id: string): Formula | null {
  return _formulaIndex.get(id) ?? null;
}

/**
 * Get all transversal rules (RT_001..RT_015).
 */
export function getTransversalRules(): TransversalRule[] {
  return _kb?.regles_transversales ?? [];
}

/**
 * Get object reference dimensions by category (e.g. "livres", "medias", "vetements").
 * Returns the sub-object from ergonomie.objets_reference.
 */
export function getObjectReference(category: string): Record<string, unknown> | null {
  if (!_kb) return null;
  const refs = _kb.ergonomie.objets_reference;
  if (category in refs) {
    return refs[category] as Record<string, unknown>;
  }
  return null;
}

/**
 * Get ergonomic data for a furniture type (e.g. "bibliotheque", "bureau").
 * Returns the sub-object from ergonomie.types_meubles.
 */
export function getErgonomics(furnitureType: string): Record<string, unknown> | null {
  return (_kb?.ergonomie.types_meubles[furnitureType] as Record<string, unknown>) ?? null;
}

// ---------------------------------------------------------------------------
// Internal indexing
// ---------------------------------------------------------------------------

function _buildIndices(): void {
  if (!_kb) return;

  // Index all formulas from both quincaillerie and conception
  _formulaIndex = new Map();
  for (const f of _kb.quincaillerie.formulas ?? []) {
    _formulaIndex.set(f.id, f);
  }
  for (const f of _kb.conception.formulas ?? []) {
    _formulaIndex.set(f.id, f);
  }

  // Index conception sections as pseudo-modules (keyed by section name)
  _moduleIndex = new Map();
  for (const [key, value] of Object.entries(_kb.conception)) {
    if (key === 'formulas') continue;
    if (typeof value === 'object' && value !== null) {
      _moduleIndex.set(key, value as Record<string, unknown>);
    }
  }
  // Also index quincaillerie sections
  for (const [key, value] of Object.entries(_kb.quincaillerie)) {
    if (key === 'formulas') continue;
    if (typeof value === 'object' && value !== null) {
      _moduleIndex.set(key, value as Record<string, unknown>);
    }
  }
}
