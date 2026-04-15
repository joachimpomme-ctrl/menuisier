import type { EdgeBandingSide, GeneratedPart } from '../knowledge/types';

const EDGE_BANDING_RULES: Partial<Record<GeneratedPart['type'], EdgeBandingSide[]>> = {
  joue: ['front'],
  dessus: ['front'],
  dessous: ['front'],
  'tablette-fixe': ['front'],
  'tablette-reglable': ['front'],
  'tablette-inclinee': ['front'],
  'taquet-arret': ['front'],
  porte: ['front', 'back', 'left', 'right'],
  'tiroir-facade': ['front', 'back', 'left', 'right'],
  assise: ['front'],
  'devant-coffre': ['front', 'left', 'right'],
  fond: [],
  'croisillon-h': [],
  'croisillon-v': [],
  'tiroir-caisson': [],
  'tiroir-fond': [],
};

export function computeEdgeBanding(part: GeneratedPart): EdgeBandingSide[] {
  return [...(EDGE_BANDING_RULES[part.type] ?? [])];
}

export function computeEdgeBandingLength(part: GeneratedPart): number {
  const sides = part.edge_banding ?? computeEdgeBanding(part);

  return sides.reduce((total, side) => {
    if (side === 'front' || side === 'back') return total + part.length_mm;
    return total + part.width_mm;
  }, 0);
}
