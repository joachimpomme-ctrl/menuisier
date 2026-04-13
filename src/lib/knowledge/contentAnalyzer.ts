/**
 * Content-based zone generator.
 *
 * Converts a list of "things to store" into ZoneConfig[].
 * Uses ergonomic principles:
 * - Frequent items → active zone (400–1400mm)
 * - Heavy items → bottom (0–400mm)
 * - Seasonal / rare → top (1800mm+)
 */

import type {
  ContentItem,
  FurnitureType,
  SpaceDimensions,
  ZoneConfig,
  ModuleConfig,
} from './types';

// ---------------------------------------------------------------------------
// Content categories with storage metadata
// ---------------------------------------------------------------------------

export type ContentCategory =
  | 'shirts'
  | 'coats'
  | 'pants'
  | 'dresses'
  | 'sweaters_folded'
  | 'shoes'
  | 'boots'
  | 'books_pocket'
  | 'books_large'
  | 'books_bd'
  | 'vinyl'
  | 'board_games'
  | 'seasonal_clothes'
  | 'linen'
  | 'bags'
  | 'misc';

interface CategoryMeta {
  label: string;
  /** Placement priority: lower = bottom, higher = top. 2 = active zone. */
  zonePriority: 'bottom' | 'active' | 'top';
  /** Which module handles this category. */
  module: 'hanging_rod_short' | 'hanging_rod_long' | 'shelf_adjustable' | 'drawer_stack' | 'shoe_rack_inclined';
  /** Height per unit (mm) — used to compute zone height. */
  unitHeight_mm: number;
  /** Ideal spacing for shelves (mm), if module is shelf_adjustable. */
  shelfSpacing_mm?: number;
  /** Furniture types where this category makes sense. */
  relevantFor: FurnitureType[];
}

const CATEGORY_META: Record<ContentCategory, CategoryMeta> = {
  shirts: {
    label: 'Chemises / vestes (cintres)',
    zonePriority: 'active',
    module: 'hanging_rod_short',
    unitHeight_mm: 50, // ~20 shirts per 1000mm
    relevantFor: ['placard', 'armoire', 'vestiaire_entree'],
  },
  coats: {
    label: 'Manteaux / robes longues',
    zonePriority: 'active',
    module: 'hanging_rod_long',
    unitHeight_mm: 80,
    relevantFor: ['placard', 'armoire', 'vestiaire_entree'],
  },
  pants: {
    label: 'Pantalons / jupes (pliés)',
    zonePriority: 'active',
    module: 'drawer_stack',
    unitHeight_mm: 40,
    relevantFor: ['placard', 'armoire', 'commode', 'vestiaire_entree'],
  },
  dresses: {
    label: 'Robes / combinaisons (cintres)',
    zonePriority: 'active',
    module: 'hanging_rod_long',
    unitHeight_mm: 80,
    relevantFor: ['placard', 'armoire'],
  },
  sweaters_folded: {
    label: 'Pulls / t-shirts (pliés)',
    zonePriority: 'active',
    module: 'shelf_adjustable',
    unitHeight_mm: 35,
    shelfSpacing_mm: 280,
    relevantFor: ['placard', 'armoire', 'commode', 'vestiaire_entree'],
  },
  shoes: {
    label: 'Chaussures (paires)',
    zonePriority: 'bottom',
    module: 'shoe_rack_inclined',
    unitHeight_mm: 40, // ~5 pairs per tier
    relevantFor: ['placard', 'armoire', 'vestiaire_entree', 'meuble_chaussures'],
  },
  boots: {
    label: 'Bottes',
    zonePriority: 'bottom',
    module: 'shelf_adjustable',
    unitHeight_mm: 120,
    shelfSpacing_mm: 450,
    relevantFor: ['placard', 'armoire', 'vestiaire_entree', 'meuble_chaussures'],
  },
  books_pocket: {
    label: 'Livres de poche / romans',
    zonePriority: 'active',
    module: 'shelf_adjustable',
    unitHeight_mm: 8,
    shelfSpacing_mm: 220,
    relevantFor: ['bibliotheque', 'etagere_murale', 'buffet'],
  },
  books_large: {
    label: 'Grands livres / encyclopédies',
    zonePriority: 'bottom',
    module: 'shelf_adjustable',
    unitHeight_mm: 15,
    shelfSpacing_mm: 350,
    relevantFor: ['bibliotheque', 'etagere_murale', 'buffet'],
  },
  books_bd: {
    label: 'BD / albums',
    zonePriority: 'active',
    module: 'shelf_adjustable',
    unitHeight_mm: 12,
    shelfSpacing_mm: 340,
    relevantFor: ['bibliotheque', 'etagere_murale'],
  },
  vinyl: {
    label: 'Vinyles',
    zonePriority: 'bottom',
    module: 'shelf_adjustable',
    unitHeight_mm: 4,
    shelfSpacing_mm: 340,
    relevantFor: ['bibliotheque', 'meuble_tv', 'buffet'],
  },
  board_games: {
    label: 'Jeux de société',
    zonePriority: 'bottom',
    module: 'shelf_adjustable',
    unitHeight_mm: 70,
    shelfSpacing_mm: 350,
    relevantFor: ['bibliotheque', 'etagere_murale', 'buffet'],
  },
  seasonal_clothes: {
    label: 'Vêtements hors saison',
    zonePriority: 'top',
    module: 'shelf_adjustable',
    unitHeight_mm: 60,
    shelfSpacing_mm: 300,
    relevantFor: ['placard', 'armoire'],
  },
  linen: {
    label: 'Draps / serviettes',
    zonePriority: 'top',
    module: 'shelf_adjustable',
    unitHeight_mm: 50,
    shelfSpacing_mm: 300,
    relevantFor: ['placard', 'armoire', 'meuble_salle_de_bain'],
  },
  bags: {
    label: 'Sacs / accessoires',
    zonePriority: 'top',
    module: 'shelf_adjustable',
    unitHeight_mm: 100,
    shelfSpacing_mm: 350,
    relevantFor: ['placard', 'armoire', 'vestiaire_entree'],
  },
  misc: {
    label: 'Divers',
    zonePriority: 'active',
    module: 'shelf_adjustable',
    unitHeight_mm: 50,
    shelfSpacing_mm: 300,
    relevantFor: ['bibliotheque', 'etagere_murale', 'buffet', 'placard', 'armoire', 'commode', 'meuble_tv', 'meuble_salle_de_bain', 'vestiaire_entree', 'cuisine', 'bureau', 'meuble_chaussures', 'banquette_coffre', 'cave_vin', 'sous_escalier', 'table', 'lit_cabane_mezzanine'],
  },
};

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Get content categories relevant for a given furniture type.
 */
export function getCategoriesForType(furnitureType: FurnitureType): { id: ContentCategory; label: string }[] {
  return (Object.entries(CATEGORY_META) as [ContentCategory, CategoryMeta][])
    .filter(([, meta]) => meta.relevantFor.includes(furnitureType))
    .map(([id, meta]) => ({ id, label: meta.label }));
}

// ---------------------------------------------------------------------------
// Zone generation
// ---------------------------------------------------------------------------

interface ZoneSeed {
  module: CategoryMeta['module'];
  priority: 'bottom' | 'active' | 'top';
  neededHeight_mm: number;
  spacing_mm?: number;
  count: number; // items count (for drawer/shelf)
}

function mergeSeeds(seeds: ZoneSeed[]): ZoneSeed[] {
  const merged = new Map<string, ZoneSeed>();
  for (const seed of seeds) {
    const key = `${seed.module}__${seed.priority}__${seed.spacing_mm ?? 0}`;
    const existing = merged.get(key);
    if (existing) {
      existing.neededHeight_mm += seed.neededHeight_mm;
      existing.count += seed.count;
    } else {
      merged.set(key, { ...seed });
    }
  }
  return Array.from(merged.values());
}

function buildConfig(seed: ZoneSeed): ModuleConfig {
  switch (seed.module) {
    case 'hanging_rod_short':
      return { type: 'hanging_rod_short' };
    case 'hanging_rod_long':
      return { type: 'hanging_rod_long' };
    case 'drawer_stack': {
      const count = Math.max(1, Math.min(6, Math.ceil(seed.count / 8)));
      return { type: 'drawer_stack', count, distribution: 'progressive' };
    }
    case 'shoe_rack_inclined': {
      const tiers = Math.max(2, Math.min(8, Math.ceil(seed.count / 5)));
      return { type: 'shoe_rack_inclined', tiers };
    }
    case 'shelf_adjustable': {
      const count = Math.max(1, Math.min(12, Math.ceil(seed.neededHeight_mm / (seed.spacing_mm ?? 300))));
      return { type: 'shelf_adjustable', count, spacing_mm: seed.spacing_mm ?? 300 };
    }
  }
}

const PRIORITY_ORDER: Record<string, number> = { bottom: 0, active: 1, top: 2 };

// Minimum zone heights per module
const MIN_ZONE_HEIGHT: Record<string, number> = {
  hanging_rod_short: 1100,
  hanging_rod_long: 1600,
  drawer_stack: 300,
  shoe_rack_inclined: 400,
  shelf_adjustable: 200,
};

/**
 * Convert a list of content items into zone configurations.
 *
 * Placement rules (from ergonomie.principes_generaux):
 * - bottom (0–400mm): heavy items, shoes, drawers
 * - active (400–1400mm): frequent items, hanging rods, main shelves
 * - top (1800mm+): seasonal, rare, light items
 *
 * Zones are ordered bottom → active → top for natural stacking.
 */
export function contentToZones(
  contents: ContentItem[],
  space: SpaceDimensions,
  _furnitureType: FurnitureType,
): ZoneConfig[] {
  if (contents.length === 0) return [];

  const usableHeight = space.height_mm - (space.plinth_mm || 0);

  // Build seeds from content items
  const seeds: ZoneSeed[] = [];
  for (const item of contents) {
    const meta = CATEGORY_META[item.category as ContentCategory];
    if (!meta || item.quantity <= 0) continue;

    seeds.push({
      module: meta.module,
      priority: meta.zonePriority,
      neededHeight_mm: item.quantity * meta.unitHeight_mm,
      spacing_mm: meta.shelfSpacing_mm,
      count: item.quantity,
    });
  }

  if (seeds.length === 0) return [];

  // Merge seeds by (module, priority, spacing)
  const merged = mergeSeeds(seeds);

  // Sort: bottom → active → top
  merged.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  // Apply minimum heights and enforce constraints
  for (const seed of merged) {
    const minH = MIN_ZONE_HEIGHT[seed.module] ?? 200;
    seed.neededHeight_mm = Math.max(seed.neededHeight_mm, minH);
  }

  // Scale to fit usable height
  const totalNeeded = merged.reduce((s, z) => s + z.neededHeight_mm, 0);
  const scale = totalNeeded > 0 ? usableHeight / totalNeeded : 1;

  const zones: ZoneConfig[] = merged.map((seed) => {
    const height = Math.round(seed.neededHeight_mm * scale);
    return {
      module_id: seed.module,
      height_mm: Math.max(height, MIN_ZONE_HEIGHT[seed.module] ?? 200),
      config: buildConfig(seed),
    };
  });

  // Adjust last zone to exactly fill usable height
  const totalAllocated = zones.reduce((s, z) => s + z.height_mm, 0);
  const delta = usableHeight - totalAllocated;
  if (zones.length > 0 && delta !== 0) {
    zones[zones.length - 1].height_mm += delta;
  }

  return zones;
}
