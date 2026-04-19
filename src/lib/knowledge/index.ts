/**
 * Knowledge base loader — fetches and caches base_v3_normalized.json.
 *
 * This module is SEPARATE from src/lib/knowledgeStore.ts which manages
 * user-uploaded knowledge entries. This one loads the read-only reference
 * data (project presets: dimensions, components, constraints, variants).
 *
 * Limitations actuelles :
 * - Seul getProjectPreset() est réellement utilisé par le moteur.
 * - Les formules JSON (F_CON_*, F_QUI_*) ne sont PAS évaluées dynamiquement ;
 *   les calculs sont implémentés en TypeScript dans engine/*.ts.
 * - Les règles transversales (RT_*) sont exposées pour le contexte IA ;
 *   leur connexion au moteur de validation reste implémentée en TypeScript.
 */

import type { FurnitureType, SpaceDimensions } from './types';
import {
  DOOR_SIZING_RULES,
  DRAWER_RULES,
  HINGE_RULES,
  MECHANICAL_PROPERTIES,
  ORIENTATION_RULES,
  SYSTEME_32_RULES,
} from '../../data/knowledge';
import { MODULE_CATALOG } from './modules';

// ---------------------------------------------------------------------------
// Raw JSON shape (loosely typed — the JSON is large and heterogeneous)
// ---------------------------------------------------------------------------

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

/**
 * Structure observée dans base_v3_normalized.json/regles_transversales :
 * {
 *   id: "RT_001",
 *   regle: "Tout meuble > 150cm...",
 *   severite: "critique" | "importante" | "recommandation",
 *   types_concernes?: string[],
 *   materiaux_autorises?: string[],
 *   seuils?: Record<string, number>,
 *   unite?: string
 * }
 */
export interface TransversalRule {
  id: string;
  regle: string;
  severite: 'critique' | 'importante' | 'recommandation';
  types_concernes?: string[];
  materiaux_autorises?: string[];
  seuils?: Record<string, number>;
  unite?: string;
}

interface KnowledgeBase {
  metadata: Record<string, unknown>;
  ergonomie: Record<string, unknown>;
  quincaillerie: Record<string, unknown>;
  conception: Record<string, unknown>;
  projets: Record<string, ProjectPreset>;
  regles_transversales: TransversalRule[];
}

export interface KnowledgeSnapshot {
  /** Presets projets — null si KB async non chargée */
  projectPresets: Record<string, ProjectPreset> | null;
  /** Règles transversales disponibles après loadKnowledge() */
  transversalRules: TransversalRule[];
  /** Catalogue des 8 modules avec contraintes */
  modules: typeof MODULE_CATALOG;
  mechanicalProperties: typeof MECHANICAL_PROPERTIES;
  orientationRules: typeof ORIENTATION_RULES;
  systeme32Rules: typeof SYSTEME_32_RULES;
  hingeRules: typeof HINGE_RULES;
  doorSizingRules: typeof DOOR_SIZING_RULES;
  drawerRules: typeof DRAWER_RULES;
}

// ---------------------------------------------------------------------------
// Module-level cache
// ---------------------------------------------------------------------------

let _kb: KnowledgeBase | null = null;
let _loading: Promise<void> | null = null;

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
    } catch (err) {
      console.error('[knowledge] Failed to load base_v3_normalized.json:', err);
      // Leave _kb null — getters return safe empty values
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

/** Get transversal business rules from the loaded knowledge base. */
export function getTransversalRules(): TransversalRule[] {
  return _kb?.regles_transversales ?? [];
}

/**
 * Point d'entrée unifié de la base de connaissance.
 * Les imports directs depuis data/knowledge.ts et knowledge/modules.ts
 * restent valides — cette façade est additive.
 */
export function getKnowledge(): KnowledgeSnapshot {
  return {
    projectPresets: _kb?.projets ?? null,
    transversalRules: getTransversalRules(),
    modules: MODULE_CATALOG,
    mechanicalProperties: MECHANICAL_PROPERTIES,
    orientationRules: ORIENTATION_RULES,
    systeme32Rules: SYSTEME_32_RULES,
    hingeRules: HINGE_RULES,
    doorSizingRules: DOOR_SIZING_RULES,
    drawerRules: DRAWER_RULES,
  };
}

/**
 * Normalize heterogeneous preset dimension keys into wizard/engine space dimensions.
 *
 * Some presets use direct defaults (`hauteur_mm`), while others only expose a
 * maximum or domain-specific measure (`hauteur_max_mm` for sous-escalier).
 */
export function getPresetSpaceDefaults(type: FurnitureType): Partial<SpaceDimensions> {
  const preset = getProjectPreset(type);
  if (!preset?.dimensions_defaut) return {};

  const dims = preset.dimensions_defaut as Record<string, unknown>;
  const defaults: Partial<SpaceDimensions> = {};

  if (typeof dims.largeur_mm === 'number') {
    defaults.width_mm = dims.largeur_mm;
  }

  if (typeof dims.hauteur_mm === 'number') {
    defaults.height_mm = dims.hauteur_mm;
  } else if (typeof dims.hauteur_max_mm === 'number') {
    defaults.height_mm = dims.hauteur_max_mm;
  }

  if (typeof dims.profondeur_mm === 'number') {
    defaults.depth_mm = dims.profondeur_mm;
  }

  if (typeof dims.plinthe_mm === 'number') {
    defaults.plinth_mm = dims.plinthe_mm;
  }

  return defaults;
}
