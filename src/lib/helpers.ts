export const uid = (): string => crypto.randomUUID();

export function getUsableHeight(ceilingHeight: number, plinthHeight: number): number {
  return ceilingHeight - plinthHeight;
}

export function parseNumber(value: string, fallback: number, min?: number, max?: number): number {
  const n = parseFloat(value);
  if (isNaN(n)) return fallback;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

export function clampInt(value: string, fallback: number, min: number, max: number): number {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------------
// Joue commune — calcul de la largeur intérieure effective
// ---------------------------------------------------------------------------

/**
 * Calcule la largeur intérieure effective d'un corps en tenant compte
 * des joues communes avec les corps adjacents.
 *
 * Quand un corps partage sa joue gauche avec le voisin de gauche,
 * il n'a pas sa propre joue gauche → la largeur intérieure augmente.
 */
export function getBodyInnerWidth(
  bodyWidth: number,
  _bodyIndex: number,
  _bodyCount: number,
  _sharedBoundaries: boolean[],
  thickness: number,
): number {
  return +(bodyWidth - thickness - thickness).toFixed(1);
}

/** Renvoie true si ce corps n'a pas de joue gauche propre (partagée avec le voisin) */
export function isSharedLeft(bodyIndex: number, sharedBoundaries: boolean[]): boolean {
  return bodyIndex > 0 && (sharedBoundaries[bodyIndex - 1] ?? false);
}

/** Renvoie true si la joue droite de ce corps est partagée avec le voisin */
export function isSharedRight(bodyIndex: number, bodyCount: number, sharedBoundaries: boolean[]): boolean {
  return bodyIndex < bodyCount - 1 && (sharedBoundaries[bodyIndex] ?? false);
}

// ---------------------------------------------------------------------------
// Hauteur effective d'un corps (pour les portes)
// ---------------------------------------------------------------------------
import type { Body, DoorPoseType, Piece } from '../types';

/**
 * Détermine la hauteur effective d'un corps pour le dimensionnement des portes.
 *
 * - Si les joues atteignent le plafond (floor-to-ceiling), la hauteur utile
 *   exclut la plinthe (ceilingHeight − plinthHeight).
 * - Sinon, la hauteur correspond à la plus grande joue (corps court : meuble TV, buffet…).
 * - Fallback : usableHeight si aucune joue n'est définie.
 */
export function getBodyEffectiveHeight(
  body: Body,
  ceilingHeight: number,
  plinthHeight: number,
): number {
  const joues = body.pieces.filter((p) => p.type === 'joue');
  const usableHeight = getUsableHeight(ceilingHeight, plinthHeight);

  if (joues.length === 0) return usableHeight; // fallback

  const maxJoue = Math.max(...joues.map((p) => p.length));

  // Floor-to-ceiling : single joue ≈ ceilingHeight → door covers usableHeight
  if (maxJoue >= ceilingHeight - 1) {
    return usableHeight;
  }

  // Split joues (haut/bas) : sum of pairs ≈ ceilingHeight → floor-to-ceiling
  // Joues are stored in order: left-bas, left-haut, right-bas, right-haut
  for (let i = 0; i < joues.length - 1; i += 2) {
    const pairSum = joues[i].length + joues[i + 1].length;
    if (Math.abs(pairSum - ceilingHeight) < 1) {
      return usableHeight;
    }
  }

  // Short body — door height = max joue height
  return maxJoue;
}

// ---------------------------------------------------------------------------
// Calculs portes & charnières
// ---------------------------------------------------------------------------

export interface DoorDimensions {
  doorWidth: number;   // cm
  doorHeight: number;  // cm
  hingeCount: number;
  hingePositions: number[]; // mm from bottom of door
  poseLabel: string;
}

/**
 * Calcule le nombre et les positions de charnières Ø35 selon les règles fabricants.
 *
 * Sources : Blum CLIP top 2022, Hettich Sensys, Grass Tiomos
 * Méthode : max(nombre par hauteur, nombre par poids) + bonus largeur > 60cm
 *
 * @param doorHeightCm - Hauteur de la porte (cm)
 * @param doorWidthCm  - Largeur de la porte (cm), optionnel — si > 60cm, +1 charnière
 * @param doorWeightKg - Poids de la porte (kg), optionnel — détermine un minimum de charnières
 */
export function computeHinges(
  doorHeightCm: number,
  doorWidthCm?: number,
  doorWeightKg?: number,
): { count: number; positions: number[] } {
  const hMm = doorHeightCm * 10;

  // --- Nombre par hauteur (seuils Hettich Sensys) ---
  let countByHeight: number;
  if (hMm <= 1000) countByHeight = 2;
  else if (hMm <= 1500) countByHeight = 3;
  else if (hMm <= 2000) countByHeight = 4;
  else if (hMm <= 2400) countByHeight = 5;
  else if (hMm <= 2600) countByHeight = 6;
  else countByHeight = 7;

  // --- Nombre par poids (Blum CLIP top / Hettich, ~4 kg/charnière) ---
  let countByWeight = 2;
  if (doorWeightKg !== undefined && doorWeightKg > 0) {
    // Capacité standard ~4 kg par charnière (Blum/Hettich)
    countByWeight = Math.max(2, Math.ceil(doorWeightKg / 4));
  }

  let count = Math.max(countByHeight, countByWeight);

  // --- Bonus largeur : porte large > 60cm → +1 charnière (Blum) ---
  if (doorWidthCm !== undefined && doorWidthCm > 60) {
    count += 1;
  }

  // --- Positions (75-100mm du bord, intermédiaires équidistantes) ---
  const TOP_OFFSET = 80; // mm depuis le bord supérieur
  const BOT_OFFSET = 80; // mm depuis le bord inférieur
  const totalMm = doorHeightCm * 10;
  const positions: number[] = [BOT_OFFSET, totalMm - TOP_OFFSET];
  if (count > 2) {
    const span = (totalMm - TOP_OFFSET) - BOT_OFFSET;
    for (let i = 1; i < count - 1; i++) {
      positions.push(Math.round(BOT_OFFSET + (span * i) / (count - 1)));
    }
  }
  positions.sort((a, b) => a - b);
  return { count, positions };
}

/**
 * Lit les dimensions réelles des pièces porte d'un corps.
 * Retourne null si le corps n'a pas de doorConfig ou pas de pièces porte.
 * Utilise les dimensions des pièces existantes (pas de recalcul).
 *
 * @param thicknessCm - Épaisseur du panneau (cm), pour le calcul du poids
 * @param densityKgM3 - Densité du matériau (kg/m³), pour le calcul du poids
 */
export function getDoorInfoFromPieces(
  body: Body,
  thicknessCm?: number,
  densityKgM3?: number,
): {
  doorWidth: number;
  doorHeight: number;
  doorWeightKg: number;
  hingeCount: number;
  hingePositions: number[];
  count: number;
  poseType: DoorPoseType;
  poseLabel: string;
} | null {
  if (!body.doorConfig) return null;
  const doorPieces = body.pieces.filter((p) => p.type === 'porte');
  if (doorPieces.length === 0) return null;

  // Prendre la première porte comme référence (toutes ont les mêmes dimensions)
  const ref = doorPieces[0];
  const doorHeight = ref.length;
  const doorWidth = ref.width;

  // Poids estimé de la porte (longueur × largeur × épaisseur × densité)
  const th = thicknessCm ?? 1.8; // fallback 18mm
  const density = densityKgM3 ?? 680; // fallback CP bouleau
  const doorWeightKg = +(doorHeight * doorWidth * th / 1_000_000 * density).toFixed(1);

  const hinges = computeHinges(doorHeight, doorWidth, doorWeightKg);

  const poseLabels: Record<DoorPoseType, string> = {
    enveloppante: 'Enveloppante (recouvrement total)',
    'demi-recouvrement': 'Demi-recouvrement',
    affleurante: 'Affleurante (intérieure)',
  };

  return {
    doorWidth,
    doorHeight,
    doorWeightKg,
    hingeCount: hinges.count,
    hingePositions: hinges.positions,
    count: body.doorConfig.count,
    poseType: body.doorConfig.poseType,
    poseLabel: poseLabels[body.doorConfig.poseType],
  };
}

/**
 * Sélectionne la tablette fixe la plus pertinente pour servir de plan de séparation
 * entre la zone basse et la zone haute d'un corps (configurateur de portes).
 *
 * Stratégie : la tablette dont la posY est la plus proche du milieu de la hauteur
 * effective. Ignore les tablettes sans posY définie.
 *
 * @returns la tablette fixe choisie, ou null si aucune candidate.
 */
export function findSplitterTablette(
  body: Body,
  effectiveHeight: number,
): Piece | null {
  const tablettes = body.pieces.filter(
    (p) => p.type === 'tablette-fixe' && typeof p.posY === 'number'
  );
  if (tablettes.length === 0) return null;
  const mid = effectiveHeight / 2;
  let best: Piece | null = null;
  let bestDist = Infinity;
  for (const t of tablettes) {
    const dist = Math.abs((t.posY ?? 0) - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = t;
    }
  }
  return best;
}

/**
 * Calcule les dimensions d'une porte et les positions de charnières.
 * @param effectiveInnerWidth - Si fourni, utilise cette largeur intérieure au lieu de bodyWidth - 2*thickness.
 *   Nécessaire quand le corps a une joue commune (la largeur intérieure est plus grande).
 * @param coverageHeight - Si fourni, hauteur réelle couverte par les portes (au lieu
 *   de bodyHeight). Utilisé pour les portes partielles ('bas' / 'haut').
 */
export function calculateDoor(
  bodyWidth: number,
  bodyHeight: number,
  thickness: number,
  doorCount: 1 | 2,
  poseType: DoorPoseType,
  effectiveInnerWidth?: number,
  coverageHeight?: number,
): DoorDimensions {
  const innerWidth = effectiveInnerWidth ?? +(bodyWidth - 2 * thickness).toFixed(1);
  // Hauteur effectivement couverte par les portes (peut être inférieure pour les
  // portes partielles « bas » / « haut »).
  const coverH = coverageHeight ?? bodyHeight;

  // ---------------------------------------------------------------------------
  // Jeu (clearance) — espace libre entre la porte et le caisson/porte adjacente
  // 2 mm est la valeur standard pour charnières Ø35 (Blum, Hettich, Grass).
  // - Enveloppante : jeu entre la porte et le bord extérieur du caisson
  // - Demi-recouvrement : jeu entre porte et chant de joue
  // - Affleurante : jeu entre porte et face intérieure de joue/tablette
  // Réf. : Dunod 2022, Blum CLIP top technical manual
  // ---------------------------------------------------------------------------
  const JEU = 0.2; // 2 mm = 0.2 cm — jeu standard charnières Ø35

  let doorWidth: number;
  let doorHeight: number;
  let poseLabel: string;

  switch (poseType) {
    case 'enveloppante':
      poseLabel = 'Enveloppante (recouvrement total)';
      doorHeight = +(coverH - JEU).toFixed(1);
      if (doorCount === 1) {
        doorWidth = +(bodyWidth - JEU).toFixed(1);
      } else {
        doorWidth = +(bodyWidth / 2 - JEU * 0.75).toFixed(1);
      }
      break;
    case 'demi-recouvrement':
      poseLabel = 'Demi-recouvrement';
      doorHeight = +(coverH - JEU).toFixed(1);
      if (doorCount === 1) {
        doorWidth = +(innerWidth + thickness - JEU).toFixed(1);
      } else {
        doorWidth = +(innerWidth / 2 + thickness / 2 - JEU / 2).toFixed(1);
      }
      break;
    case 'affleurante':
      poseLabel = 'Affleurante (intérieure)';
      doorHeight = +(coverH - 2 * thickness - 2 * JEU).toFixed(1);
      if (doorCount === 1) {
        doorWidth = +(innerWidth - 2 * JEU).toFixed(1);
      } else {
        doorWidth = +(innerWidth / 2 - 1.5 * JEU).toFixed(1);
      }
      break;
  }

  const hinges = computeHinges(doorHeight);

  return { doorWidth, doorHeight, hingeCount: hinges.count, hingePositions: hinges.positions, poseLabel };
}
