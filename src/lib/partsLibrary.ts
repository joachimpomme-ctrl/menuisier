/**
 * Parts Library — CRUD for reusable standard parts (commercial products).
 *
 * Persisted in localStorage. Seeded with 10 common Leroy Merlin products
 * on first use.
 */

import type { StandardPart, StandardPartCategory, UserPartsLibrary } from './knowledge/types';
import type { EdgeBandingSide } from './knowledge/types';
import type { MaterialKey } from '../types';

const STORAGE_KEY = 'menuisier_parts_library';

// ---------------------------------------------------------------------------
// Seed data — 10 common LM products
// ---------------------------------------------------------------------------

const SEED_PARTS: StandardPart[] = [
  {
    id: 'lm_tablette_melamine_800',
    name: 'Tablette mélaminé blanc 800×300×18',
    category: 'shelf',
    length_mm: 800,
    width_mm: 300,
    thickness_mm: 18,
    material_key: 'melamine',
    edge_banding: ['front'],
    source: 'template',
  },
  {
    id: 'lm_tablette_melamine_1200',
    name: 'Tablette mélaminé blanc 1200×300×18',
    category: 'shelf',
    length_mm: 1200,
    width_mm: 300,
    thickness_mm: 18,
    material_key: 'melamine',
    edge_banding: ['front'],
    source: 'template',
  },
  {
    id: 'lm_tablette_chene_800',
    name: 'Tablette chêne clair 800×300×18',
    category: 'shelf',
    length_mm: 800,
    width_mm: 300,
    thickness_mm: 18,
    material_key: 'melamine',
    edge_banding: ['front'],
    source: 'template',
  },
  {
    id: 'lm_joue_melamine_2000',
    name: 'Joue mélaminé blanc 2000×300×18',
    category: 'side_panel',
    length_mm: 2000,
    width_mm: 300,
    thickness_mm: 18,
    material_key: 'melamine',
    edge_banding: ['front'],
    source: 'template',
  },
  {
    id: 'lm_joue_melamine_2400',
    name: 'Joue mélaminé blanc 2400×600×18',
    category: 'side_panel',
    length_mm: 2400,
    width_mm: 600,
    thickness_mm: 18,
    material_key: 'melamine',
    edge_banding: ['front'],
    source: 'template',
  },
  {
    id: 'lm_porte_melamine_600',
    name: 'Porte mélaminé blanc 600×400×16',
    category: 'door',
    length_mm: 600,
    width_mm: 400,
    thickness_mm: 16,
    material_key: 'melamine',
    edge_banding: ['front', 'back', 'left', 'right'],
    source: 'template',
  },
  {
    id: 'lm_fond_hdf_3',
    name: 'Fond HDF blanc 2440×1220×3',
    category: 'back_panel',
    length_mm: 2440,
    width_mm: 1220,
    thickness_mm: 3,
    source: 'template',
  },
  {
    id: 'lm_facade_tiroir_600',
    name: 'Façade tiroir mélaminé 596×140×16',
    category: 'drawer_front',
    length_mm: 596,
    width_mm: 140,
    thickness_mm: 16,
    material_key: 'melamine',
    edge_banding: ['front', 'back', 'left', 'right'],
    source: 'template',
  },
  {
    id: 'lm_tablette_pin_900',
    name: 'Tablette pin massif 900×200×18',
    category: 'shelf',
    length_mm: 900,
    width_mm: 200,
    thickness_mm: 18,
    source: 'template',
  },
  {
    id: 'lm_dessus_melamine_1200',
    name: 'Dessus mélaminé blanc 1200×600×18',
    category: 'top_bottom',
    length_mm: 1200,
    width_mm: 600,
    thickness_mm: 18,
    material_key: 'melamine',
    edge_banding: ['front'],
    source: 'template',
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function loadLibrary(): UserPartsLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as UserPartsLibrary;
    }
  } catch {
    // corrupt data — reset
  }
  // First use → seed
  const lib: UserPartsLibrary = {
    parts: [...SEED_PARTS],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLibrary(lib);
  return lib;
}

function saveLibrary(lib: UserPartsLibrary): void {
  lib.updated_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
}

// ---------------------------------------------------------------------------
// Public CRUD API
// ---------------------------------------------------------------------------

/** Get all parts in the library. */
export function getAllParts(): StandardPart[] {
  return loadLibrary().parts;
}

/** Get a single part by ID. */
export function getPart(id: string): StandardPart | null {
  return loadLibrary().parts.find((p) => p.id === id) ?? null;
}

/** Add a new part. Returns the created part with generated ID. */
export function addPart(
  part: Omit<StandardPart, 'id' | 'source'>,
): StandardPart {
  const lib = loadLibrary();
  const newPart: StandardPart = {
    ...part,
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    source: 'user',
  };
  lib.parts.push(newPart);
  saveLibrary(lib);
  return newPart;
}

/** Update an existing part. Returns true if found and updated. */
export function updatePart(id: string, updates: Partial<Omit<StandardPart, 'id'>>): boolean {
  const lib = loadLibrary();
  const idx = lib.parts.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  lib.parts[idx] = { ...lib.parts[idx], ...updates };
  saveLibrary(lib);
  return true;
}

/** Delete a part by ID. Returns true if found and deleted. */
export function deletePart(id: string): boolean {
  const lib = loadLibrary();
  const before = lib.parts.length;
  lib.parts = lib.parts.filter((p) => p.id !== id);
  if (lib.parts.length === before) return false;
  saveLibrary(lib);
  return true;
}

/** Export the full library as JSON string. */
export function exportLibrary(): string {
  return JSON.stringify(loadLibrary(), null, 2);
}

/**
 * Export the full library as CSV (UTF-8 with BOM, semicolon-separated for Excel FR).
 * Colonnes : id, nom, catégorie, L×l×ép (mm), matériau, marchand, ref, URL, prix, devise, lot, dernière MAJ.
 */
export function exportLibraryCsv(): string {
  const lib = loadLibrary();
  const headers = [
    'id', 'nom', 'categorie',
    'longueur_mm', 'largeur_mm', 'epaisseur_mm',
    'materiau', 'marchand', 'reference', 'url',
    'prix', 'devise', 'qte_lot',
    'image_url', 'derniere_maj', 'notes',
  ];
  const escape = (v: unknown): string => {
    if (v === undefined || v === null) return '';
    const s = String(v);
    if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const rows = lib.parts.map((p) => [
    p.id, p.name, p.category,
    p.length_mm ?? '', p.width_mm ?? '', p.thickness_mm ?? '',
    p.material_key ?? '', p.merchant ?? '', p.merchant_ref ?? '', p.url ?? '',
    p.price_eur ?? '', p.currency ?? '', p.pack_qty ?? '',
    p.image_url ?? '', p.last_checked_at ?? '', p.notes ?? '',
  ].map(escape).join(';'));
  // BOM for Excel UTF-8 detection
  return '﻿' + headers.join(';') + '\n' + rows.join('\n') + '\n';
}

/** Import a library from JSON string. Merges with existing (deduplicates by ID). */
export function importLibrary(json: string): number {
  const imported = JSON.parse(json) as UserPartsLibrary;
  if (!imported.parts || !Array.isArray(imported.parts)) {
    throw new Error('Format invalide');
  }
  const lib = loadLibrary();
  const existingIds = new Set(lib.parts.map((p) => p.id));
  let added = 0;
  for (const part of imported.parts) {
    if (!existingIds.has(part.id)) {
      lib.parts.push(part);
      existingIds.add(part.id);
      added++;
    }
  }
  saveLibrary(lib);
  return added;
}

/** Reset library to seed data. */
export function resetLibrary(): void {
  const lib: UserPartsLibrary = {
    parts: [...SEED_PARTS],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  saveLibrary(lib);
}

/** Get the raw library (parts + metadata). Used by cloud sync. */
export function getLibrary(): UserPartsLibrary {
  return loadLibrary();
}

/**
 * Replace the whole library (used after a cloud pull). Preserves nothing local —
 * caller is responsible for merging strategy upstream.
 */
export function replaceLibrary(lib: UserPartsLibrary): void {
  if (!lib || !Array.isArray(lib.parts)) {
    throw new Error('Bibliothèque invalide');
  }
  // updated_at est conservé tel quel pour permettre le « last-write-wins »
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
}

// Re-export types for convenience
export type { StandardPart, StandardPartCategory, EdgeBandingSide, MaterialKey };
