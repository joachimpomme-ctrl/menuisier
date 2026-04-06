export const uid = (): string => crypto.randomUUID();

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
  bodyIndex: number,
  _bodyCount: number,
  sharedBoundaries: boolean[],
  thickness: number,
): number {
  const sharedLeft = bodyIndex > 0 && (sharedBoundaries[bodyIndex - 1] ?? false);
  const leftTh = sharedLeft ? 0 : thickness;
  return +(bodyWidth - leftTh - thickness).toFixed(1);
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
import type { Body, DoorPoseType } from '../types';

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
  const usableHeight = ceilingHeight - plinthHeight;

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
 * Calcule les dimensions d'une porte et les positions de charnières.
 * @param effectiveInnerWidth - Si fourni, utilise cette largeur intérieure au lieu de bodyWidth - 2*thickness.
 *   Nécessaire quand le corps a une joue commune (la largeur intérieure est plus grande).
 */
export function calculateDoor(
  bodyWidth: number,
  bodyHeight: number,
  thickness: number,
  doorCount: 1 | 2,
  poseType: DoorPoseType,
  effectiveInnerWidth?: number,
): DoorDimensions {
  const innerWidth = effectiveInnerWidth ?? +(bodyWidth - 2 * thickness).toFixed(1);

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
      doorHeight = +(bodyHeight - JEU).toFixed(1);
      if (doorCount === 1) {
        doorWidth = +(bodyWidth - JEU).toFixed(1);
      } else {
        doorWidth = +(bodyWidth / 2 - JEU * 0.75).toFixed(1);
      }
      break;
    case 'demi-recouvrement':
      poseLabel = 'Demi-recouvrement';
      doorHeight = +(bodyHeight - JEU).toFixed(1);
      if (doorCount === 1) {
        doorWidth = +(innerWidth + thickness - JEU).toFixed(1);
      } else {
        doorWidth = +(innerWidth / 2 + thickness / 2 - JEU / 2).toFixed(1);
      }
      break;
    case 'affleurante':
      poseLabel = 'Affleurante (intérieure)';
      doorHeight = +(bodyHeight - 2 * thickness - 2 * JEU).toFixed(1);
      if (doorCount === 1) {
        doorWidth = +(innerWidth - 2 * JEU).toFixed(1);
      } else {
        doorWidth = +(innerWidth / 2 - 1.5 * JEU).toFixed(1);
      }
      break;
  }

  // Nombre de charnières selon hauteur (en cm)
  const hCm = doorHeight;
  let hingeCount: number;
  if (hCm < 60) hingeCount = 2;
  else if (hCm < 120) hingeCount = 3;
  else if (hCm < 180) hingeCount = 4;
  else hingeCount = 5;

  // Positions des charnières (mm depuis le bas de la porte)
  const TOP_OFFSET = 80; // mm
  const BOT_OFFSET = 80; // mm
  const totalMm = hCm * 10;
  const hingePositions: number[] = [];
  hingePositions.push(BOT_OFFSET);
  hingePositions.push(totalMm - TOP_OFFSET);
  if (hingeCount > 2) {
    const span = (totalMm - TOP_OFFSET) - BOT_OFFSET;
    for (let i = 1; i < hingeCount - 1; i++) {
      hingePositions.push(Math.round(BOT_OFFSET + (span * i) / (hingeCount - 1)));
    }
  }
  hingePositions.sort((a, b) => a - b);

  return { doorWidth, doorHeight, hingeCount, hingePositions, poseLabel };
}
