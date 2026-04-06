import type { AppState, ValidationResult } from '../types';
import { MATERIALS } from '../data/materials';
import { ORIENTATION_RULES, FORMALDEHYDE_CLASSES } from '../data/knowledge';
import { getBodyInnerWidth, isSharedLeft } from './helpers';

// ---------------------------------------------------------------------------
// Calcul de flèche (Dunod 2022) : f = (5·q·L⁴) / (384·E·I), I = b·h³/12
// q en N/mm, L en mm, E en MPa, b et h en mm
// Flèche admissible : L/200
// ---------------------------------------------------------------------------
function computeDeflection(
  spanCm: number,
  depthCm: number,
  thicknessCm: number,
  flexMPa: number,
  loadKgPerM: number = 8 // ~8 kg/m de livres standard
): { deflectionMm: number; maxDeflectionMm: number; ok: boolean } {
  const L = spanCm * 10; // mm
  const b = depthCm * 10; // mm
  const h = thicknessCm * 10; // mm
  // Module d'élasticité approximé depuis flexMPa (E ≈ 300 × flexMPa pour panneaux dérivés)
  const E = flexMPa * 300;
  const I = (b * Math.pow(h, 3)) / 12; // mm⁴
  const q = (loadKgPerM * 9.81) / 1000; // N/mm (charge répartie)

  const f = (5 * q * Math.pow(L, 4)) / (384 * E * I);
  const fMax = L / 200;
  return { deflectionMm: Math.round(f * 10) / 10, maxDeflectionMm: Math.round(fMax * 10) / 10, ok: f <= fMax };
}

export function validate(st: AppState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tips: string[] = []; // Conseils issus de la base de connaissances
  const { project: pr, panel: pn, bodies: bs, materialKey: mk } = st;
  const mat = MATERIALS[mk];

  // ===== CONTRÔLES GLOBAUX =====

  // Vérifier que le projet a des corps
  if (bs.length === 0) {
    warnings.push('Aucun corps défini — ajoutez au moins un corps pour commencer');
  }

  const sharedCount = (st.sharedBoundaries ?? []).filter(Boolean).length;
  const totalWidth = bs.reduce((s, b) => s + b.width, 0) - sharedCount * pn.thickness;
  if (totalWidth > pr.wallWidth && pr.wallWidth > 0) {
    errors.push(`Largeur physique totale (${totalWidth.toFixed(1)} cm) > mur (${pr.wallWidth} cm)`);
  } else if (totalWidth > 0 && pr.wallWidth > 0 && totalWidth < pr.wallWidth) {
    warnings.push(`Espace résiduel ${(pr.wallWidth - totalWidth).toFixed(1)} cm sur le mur`);
  }

  // Épaisseur de panneau cohérente
  if (pn.thickness < 0.3 || pn.thickness > 5) {
    errors.push(`Épaisseur panneau ${pn.thickness} cm hors limites (0.3–5 cm)`);
  }

  // Dimensions du panneau brut
  if (pn.width <= 0 || pn.height <= 0) {
    errors.push('Dimensions du panneau brut invalides');
  }

  mat.warnings.forEach((x) => warnings.push(`[${mat.short}] ${x}`));

  // --- Règles d'orientation de débit (base de connaissances) ---
  const matType = mk.startsWith('cp_') ? 'contreplaqué' : mk === 'osb' ? 'OSB' : mk === 'mdf' || mk === 'melamine' ? 'MDF et panneau de particules' : '';
  const orientRule = ORIENTATION_RULES.find((r) => r.materiau === matType);
  if (orientRule && matType !== 'MDF et panneau de particules') {
    tips.push(`[Débit] ${orientRule.regle} (${orientRule.impact})`);
  }

  // --- Formaldéhyde : rappel pour panneaux dérivés ---
  if (['mdf', 'melamine', 'osb'].includes(mk)) {
    const e1 = FORMALDEHYDE_CLASSES.find((f) => f.classe === 'E1');
    if (e1) tips.push(`[Santé] Exiger au minimum classe ${e1.classe}: ${e1.details}`);
  }

  // ===== CONTRÔLES PAR CORPS =====
  const shared = st.sharedBoundaries ?? [];
  bs.forEach((b, bi) => {
    const sl = isSharedLeft(bi, shared);
    const expectedTabWidth = getBodyInnerWidth(b.width, bi, bs.length, shared, pn.thickness);
    // minJoues : sl ? 1 : 2 — corps avec joue commune = 1 joue propre minimum

    // Cohérence dimensionnelle du corps
    if (b.width <= 0) errors.push(`${b.name} : largeur invalide (${b.width} cm)`);
    if (b.depth <= 0) errors.push(`${b.name} : profondeur invalide (${b.depth} cm)`);
    if (!sl && b.width < 2 * pn.thickness + 1) {
      errors.push(`${b.name} : largeur ${b.width} cm trop petite pour 2 joues de ${pn.thickness} cm`);
    }
    if (sl && b.width < pn.thickness + 1) {
      errors.push(`${b.name} : largeur ${b.width} cm trop petite (joue commune + 1 joue propre)`);
    }
    if (expectedTabWidth <= 0) {
      errors.push(`${b.name} : largeur intérieure négative ou nulle (${expectedTabWidth} cm)`);
    }

    // Vérifier qu'il y a des pièces
    if (b.pieces.length === 0) {
      warnings.push(`${b.name} : aucune pièce — corps vide`);
    }

    const joues = b.pieces.filter((p) => p.type === 'joue');
    const tablettes = b.pieces.filter((p) => p.type.startsWith('tablette'));
    const fixedTab = b.pieces.filter((p) => p.type === 'tablette-fixe');
    const bandeaux = b.pieces.filter((p) => p.type === 'bandeau');

    // --- Joues : contrôle hauteur ---
    // Vérification souple : si la somme des paires de joues doit correspondre à la hauteur utile,
    // on vérifie aussi les joues individuelles
    if (joues.length > 0) {
      // Vérifier que la profondeur des joues correspond à la profondeur du corps
      // Exception : joue commune peut être plus profonde (= max des 2 corps)
      const sr = bi < bs.length - 1 && (shared[bi] ?? false);
      joues.forEach((p) => {
        const isSharedJoue = sr && p.width > b.depth && /droite|\bD\s*[—–-]|commune/i.test(p.name);
        if (!isSharedJoue && Math.abs(p.width - b.depth) > 0.2) {
          errors.push(`${b.name} : "${p.name}" profondeur ${p.width} cm ≠ profondeur corps ${b.depth} cm`);
        }
      });

      // Les joues font la HAUTEUR TOTALE (ceilingHeight), pas la hauteur utile.
      // Elles sont entaillées à l'arrière pour enjamber la plinthe, mais leur longueur = hauteur plafond.
      const joueMaxHeight = pr.ceilingHeight;
      joues.forEach((p) => {
        if (p.length > joueMaxHeight + 0.5 && joueMaxHeight > 0) {
          errors.push(`${b.name} : "${p.name}" hauteur ${p.length} cm > hauteur disponible ${joueMaxHeight} cm`);
        }
      });

      // Si joues par paires (haut/bas), vérifier la somme = hauteur totale
      for (let i = 0; i < joues.length - 1; i += 2) {
        const sum = joues[i].length + (joues[i + 1]?.length || 0);
        if (joues[i + 1] && Math.abs(sum - joueMaxHeight) > 0.5 && joueMaxHeight > 0) {
          warnings.push(
            `${b.name} : joues "${joues[i].name}" + "${joues[i + 1]?.name}" = ${sum} cm (hauteur dispo = ${joueMaxHeight} cm)`
          );
        }
      }
    }

    // --- Tablettes : contrôle largeur intérieure ---
    tablettes.forEach((p) => {
      if (Math.abs(p.length - expectedTabWidth) > 0.5 && expectedTabWidth > 0) {
        errors.push(`${b.name} : "${p.name}" longueur ${p.length} cm ≠ largeur intérieure ${expectedTabWidth} cm`);
      } else if (Math.abs(p.length - expectedTabWidth) > 0.2 && expectedTabWidth > 0) {
        warnings.push(`${b.name} : "${p.name}" = ${p.length} cm, attendu ${expectedTabWidth} cm (écart ${Math.abs(p.length - expectedTabWidth).toFixed(1)} cm)`);
      }
    });

    // --- Tablettes : contrôle profondeur ---
    tablettes.forEach((p) => {
      if (p.width > b.depth + 0.2) {
        errors.push(`${b.name} : "${p.name}" prof. ${p.width} cm > corps ${b.depth} cm`);
      }
      if (Math.abs(p.width - b.depth) > 0.5 && p.width < b.depth) {
        warnings.push(`${b.name} : "${p.name}" prof. ${p.width} cm < corps ${b.depth} cm (retrait de ${(b.depth - p.width).toFixed(1)} cm)`);
      }
    });

    // --- Bandeaux : contrôle largeur ---
    bandeaux.forEach((p) => {
      if (Math.abs(p.length - b.width) > 0.5) {
        warnings.push(`${b.name} : "${p.name}" longueur ${p.length} cm ≠ largeur corps ${b.width} cm`);
      }
    });

    // --- Calcul de flèche amélioré (base de connaissances) ---
    tablettes.forEach((p) => {
      // Utiliser l'épaisseur du panneau assigné (extraPanel) ou le panneau principal
      const extraPanel = p.panelId ? (st.extraPanels ?? []).find((ep) => ep.id === p.panelId) : null;
      const pieceThickness = extraPanel ? extraPanel.thickness : pn.thickness;

      const defl = computeDeflection(p.length, p.width, pieceThickness, mat.flexMPa);
      if (p.length > mat.maxSpan18) {
        errors.push(
          `[${mat.short}] "${p.name}" portée ${p.length} cm > max ${mat.maxSpan18} cm — flèche ${defl.deflectionMm} mm (max ${defl.maxDeflectionMm} mm) [Dunod 2022]`
        );
      } else if (p.length > mat.maxSpan18 * 0.85) {
        // Alerte précoce à 85% de la portée max
        if (!defl.ok) {
          warnings.push(
            `[${mat.short}] "${p.name}" portée ${p.length} cm — flèche ${defl.deflectionMm} mm proche du max ${defl.maxDeflectionMm} mm`
          );
        }
      }
    });

    // --- Pièces trop grandes pour le panneau ---
    b.pieces.forEach((p) => {
      // Determine which panel this piece uses
      const extraPanel = p.panelId ? (st.extraPanels ?? []).find((ep) => ep.id === p.panelId) : null;
      // panelId orphelin : le panneau secondaire a été supprimé
      if (p.panelId && !extraPanel && p.panelId !== 'default') {
        warnings.push(`${b.name} : "${p.name}" référence un panneau supprimé — sera découpée dans le panneau principal`);
      }
      const panW = extraPanel ? extraPanel.width : pn.width;
      const panH = extraPanel ? extraPanel.height : pn.height;
      const panLabel = extraPanel ? extraPanel.label : `${pn.width}×${pn.height}`;

      const maxDim = Math.max(p.length, p.width);
      const minDim = Math.min(p.length, p.width);
      if (
        maxDim > Math.max(panW, panH) ||
        minDim > Math.min(panW, panH)
      ) {
        errors.push(`"${p.name}" (${p.length}×${p.width}) ne rentre pas dans le panneau ${panLabel} (${panW}×${panH})`);
      }
    });

    // --- Dimensions nulles ou négatives ---
    b.pieces.forEach((p) => {
      if (p.length <= 0 || p.width <= 0) {
        errors.push(`${b.name} : "${p.name}" dimensions invalides (${p.length}×${p.width})`);
      }
      if (p.qty <= 0) {
        errors.push(`${b.name} : "${p.name}" quantité invalide (${p.qty})`);
      }
    });

    // --- Minimum de tablettes fixes pour la rigidité ---
    const fixedCount = fixedTab.reduce((s, p) => s + p.qty, 0);
    if (fixedCount < 2 && b.pieces.length > 0) {
      warnings.push(`${b.name} : ${fixedCount} tablette(s) fixe(s) — minimum 2 recommandé pour la rigidité structurelle`);
    }

    // --- Crémaillères déconseillées pour certains matériaux ---
    if (
      (mk === 'melamine' || mk === 'osb') &&
      b.pieces.some((p) => p.type === 'tablette-reglable')
    ) {
      warnings.push(`[${mat.short}] ${b.name} : crémaillères déconseillées — utiliser des taquets métalliques`);
    }

    // --- Poids estimé pour fixation murale ---
    const totalVol = b.pieces.reduce((s, p) => s + (p.length * p.width * p.qty) / 10000 * pn.thickness / 100, 0);
    const weight = totalVol * mat.density;
    if (weight > 50) {
      warnings.push(`${b.name} : poids estimé ~${weight.toFixed(0)} kg — prévoir fixation murale renforcée (chevilles chimiques)`);
    }
  });

  // Ajouter les tips à la fin des warnings (préfixés pour les différencier)
  tips.forEach((t) => warnings.push(`💡 ${t}`));

  return { errors, warnings };
}
