import type { ModuleType } from '../knowledge/types';

export interface PresetVariant {
  nom?: string;
  [key: string]: unknown;
}

export interface ZoneRow {
  key: number;
  module_id: ModuleType;
  height_mm: number;
  count: number;
}

export interface VariantResult {
  zones: ZoneRow[];
  doorOverride?: boolean;
  suspendedOverride?: boolean;
  suggestedDepthMm?: number;
  suggestedWidthMm?: number;
  suggestedHeightMm?: number;
  suggestedPlinthType?: 'legs' | 'none';
  warnings?: string[];
}

const UNSUPPORTED_PROPS: Record<string, string> = {
  vitrage: 'Portes vitrées non supportées — portes pleines générées',
  pateres: 'Patères non modélisées — à ajouter manuellement',
  compact: 'Abattants basculants non supportés — portes classiques générées',
  caisson: 'Position du caisson (gauche/droite) non gérée — tiroirs centrés',
  tabouret_mm: 'Hauteur tabouret indicative, non utilisée dans la génération',
};

function roundToInt(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

export function variantToResult(variant: PresetVariant, usableHeight: number): VariantResult {
  const rows: ZoneRow[] = [];
  let key = Date.now();
  const safeUsableHeight = Math.max(100, roundToInt(usableHeight));
  let remaining = safeUsableHeight;
  const warnings: string[] = [];

  const consumeHeight = (requested: number): number => {
    const safeRequested = Math.max(0, roundToInt(requested));
    const consumed = Math.min(remaining, safeRequested);
    remaining -= consumed;
    return consumed;
  };

  const pushZone = (module_id: ModuleType, requestedHeight: number, count: number) => {
    if (remaining <= 0) return;
    const height_mm = consumeHeight(requestedHeight);
    if (height_mm <= 0) return;
    rows.push({
      key: key++,
      module_id,
      height_mm,
      count: Math.max(1, roundToInt(count)),
    });
  };

  const varH = typeof variant.hauteur_mm === 'number' ? roundToInt(variant.hauteur_mm) : null;
  if (varH && varH > 0 && varH < remaining) {
    remaining = varH;
  }

  if (variant.tringle || variant.tringle_haute) {
    pushZone('hanging_rod_short', roundToInt(remaining * 0.6), 1);
  }

  if (variant.tringle_basse) {
    pushZone('hanging_rod_short', roundToInt(remaining * 0.4), 1);
  }

  const drawerCount = typeof variant.tiroirs === 'number'
    ? roundToInt(variant.tiroirs)
    : Array.isArray(variant.tiroirs)
      ? variant.tiroirs.length
      : (variant.tiroirs === true || variant.tiroirs_profonds || variant.tiroirs_hauts)
        ? 3
        : typeof variant.nb_tiroirs === 'number'
          ? roundToInt(variant.nb_tiroirs)
          : 0;

  if (drawerCount > 0 && remaining > 0) {
    pushZone('drawer_stack', Math.min(remaining, roundToInt(remaining * 0.4)), drawerCount);
  }

  if (variant.etagere_chaussures) {
    pushZone('shoe_rack_inclined', Math.min(remaining, 500), 4);
  }

  if (variant.niche_technique || variant.niches_techniques) {
    pushZone('tv_niche', Math.min(remaining, 500), 1);
  }

  const variantName = typeof variant.nom === 'string' ? variant.nom.toLowerCase() : '';
  if ((variantName.includes('cave à vin') || variantName.includes('vin')) && remaining > 0) {
    pushZone('wine_rack', remaining, 4);
  }

  if (variant.assise || variant.banc) {
    pushZone('bench_storage', Math.min(remaining, 500), 1);
  }

  const shelfCount = typeof variant.tablettes === 'number'
    ? roundToInt(variant.tablettes)
    : variant.tablettes === true
      ? 4
      : variant.tablette_separation
        ? 3
        : typeof variant.nb_tablettes === 'number'
          ? roundToInt(variant.nb_tablettes)
          : 0;

  if (shelfCount > 0 && remaining > 0) {
    pushZone('shelf_adjustable', remaining, shelfCount);
  }

  if (variant.niches_bacs && remaining > 0) {
    pushZone('shelf_adjustable', remaining, 3);
  }

  if (variant.type === 'tiroirs_profonds' && remaining > 0) {
    pushZone('drawer_stack', remaining, 3);
  }

  if (rows.length === 0 && remaining > 0) {
    pushZone('shelf_adjustable', remaining, 4);
  } else if (remaining > 100) {
    pushZone('shelf_adjustable', remaining, 2);
  }

  const missingHeight = safeUsableHeight - rows.reduce((sum, row) => sum + row.height_mm, 0);
  if (missingHeight > 0) {
    rows.push({ key: key++, module_id: 'shelf_adjustable', height_mm: missingHeight, count: 2 });
  }

  const normalizedRows = rows
    .map((row) => ({
      ...row,
      height_mm: Math.max(1, roundToInt(row.height_mm)),
      count: Math.max(1, roundToInt(row.count)),
    }))
    .filter((row) => row.height_mm > 0);

  const normalizedTotal = normalizedRows.reduce((sum, row) => sum + row.height_mm, 0);
  const delta = safeUsableHeight - normalizedTotal;

  if (delta !== 0) {
    const lastShelf = [...normalizedRows].reverse().find((row) => row.module_id === 'shelf_adjustable');
    if (lastShelf) {
      lastShelf.height_mm = Math.max(1, lastShelf.height_mm + delta);
    } else if (normalizedRows.length > 0) {
      normalizedRows[normalizedRows.length - 1].height_mm = Math.max(1, normalizedRows[normalizedRows.length - 1].height_mm + delta);
    } else {
      normalizedRows.push({ key: key++, module_id: 'shelf_adjustable', height_mm: safeUsableHeight, count: 4 });
    }
  }

  let doorOverride: boolean | undefined;
  if (variant.portes === false) doorOverride = false;
  else if (variant.portes === true) doorOverride = true;
  if (variant.portes_position) doorOverride = true;
  if (variant.porte_unique) doorOverride = true;

  let suspendedOverride: boolean | undefined;
  if (variant.fixation_murale === true || variant.fixation === 'rail') {
    suspendedOverride = true;
  }

  let suggestedDepthMm: number | undefined;
  if (typeof variant.profondeur_mm === 'number') {
    suggestedDepthMm = roundToInt(variant.profondeur_mm);
  }

  let suggestedWidthMm: number | undefined;
  if (typeof variant.largeur_mm === 'number') {
    suggestedWidthMm = roundToInt(variant.largeur_mm);
  }

  let suggestedHeightMm: number | undefined;
  if (typeof variant.hauteur_mm === 'number') {
    suggestedHeightMm = roundToInt(variant.hauteur_mm);
  }

  let suggestedPlinthType: 'legs' | 'none' | undefined;
  if (variant.pieds === true) {
    suggestedPlinthType = 'legs';
  }

  for (const [key, message] of Object.entries(UNSUPPORTED_PROPS)) {
    if (variant[key] !== undefined && variant[key] !== false && variant[key] !== 0) {
      warnings.push(message);
    }
  }

  if (Array.isArray(variant.tiroirs) && variant.tiroirs.some((t: unknown) => {
    if (!t || typeof t !== 'object') return false;
    return 'h_facade_mm' in (t as Record<string, unknown>);
  })) {
    warnings.push('Hauteurs de façade par tiroir non supportées — distribution égale appliquée');
  }

  return {
    zones: normalizedRows,
    doorOverride,
    suspendedOverride,
    suggestedDepthMm,
    suggestedWidthMm,
    suggestedHeightMm,
    suggestedPlinthType,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
