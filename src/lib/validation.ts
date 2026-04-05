import type { AppState, ValidationResult } from '../types';
import { MATERIALS } from '../data/materials';
import { ORIENTATION_RULES, FORMALDEHYDE_CLASSES } from '../data/knowledge';

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
  const usableHeight = pr.ceilingHeight - pr.plinthHeight;

  const totalWidth = bs.reduce((s, b) => s + b.width, 0);
  if (totalWidth > pr.wallWidth) {
    errors.push(`Largeur totale (${totalWidth} cm) > mur (${pr.wallWidth} cm)`);
  } else if (totalWidth < pr.wallWidth) {
    warnings.push(`Espace résiduel ${pr.wallWidth - totalWidth} cm sur le mur`);
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

  bs.forEach((b) => {
    const expectedTabWidth = +(b.width - 2 * pn.thickness).toFixed(1);
    const joues = b.pieces.filter((p) => p.type === "joue");
    const tablettes = b.pieces.filter((p) => p.type.startsWith("tablette"));

    for (let i = 0; i < joues.length - 1; i += 2) {
      const sum = joues[i].length + (joues[i + 1]?.length || 0);
      if (Math.abs(sum - usableHeight) > 0.5) {
        errors.push(
          `${b.name} : joues "${joues[i].name}" + "${joues[i + 1]?.name}" = ${sum} cm ≠ ${usableHeight} cm`
        );
      }
    }

    tablettes.forEach((p) => {
      if (Math.abs(p.length - expectedTabWidth) > 0.2) {
        warnings.push(`${b.name} : "${p.name}" = ${p.length} cm, attendu ${expectedTabWidth} cm`);
      }
    });

    // --- Calcul de flèche amélioré (base de connaissances) ---
    tablettes.forEach((p) => {
      if (p.length > mat.maxSpan18) {
        const defl = computeDeflection(p.length, p.width, pn.thickness, mat.flexMPa);
        warnings.push(
          `[${mat.short}] "${p.name}" portée ${p.length} cm > max ${mat.maxSpan18} cm — flèche ${defl.deflectionMm} mm (max ${defl.maxDeflectionMm} mm) [Dunod 2022]`
        );
      } else if (p.length > mat.maxSpan18 * 0.85) {
        // Alerte précoce à 85% de la portée max
        const defl = computeDeflection(p.length, p.width, pn.thickness, mat.flexMPa);
        if (!defl.ok) {
          warnings.push(
            `[${mat.short}] "${p.name}" portée ${p.length} cm — flèche ${defl.deflectionMm} mm proche du max ${defl.maxDeflectionMm} mm`
          );
        }
      }
    });

    joues.forEach((p) => {
      if (Math.abs(p.width - b.depth) > 0.2) {
        warnings.push(`${b.name} : "${p.name}" prof. ${p.width} ≠ corps ${b.depth}`);
      }
    });

    tablettes.forEach((p) => {
      if (p.width > b.depth) {
        errors.push(`${b.name} : "${p.name}" prof. ${p.width} > corps ${b.depth}`);
      }
    });

    b.pieces.forEach((p) => {
      const maxDim = Math.max(p.length, p.width);
      const minDim = Math.min(p.length, p.width);
      if (
        maxDim > Math.max(pn.width, pn.height) ||
        minDim > Math.min(pn.width, pn.height)
      ) {
        errors.push(`"${p.name}" (${p.length}×${p.width}) > panneau`);
      }
    });

    const fixedCount = b.pieces
      .filter((p) => p.type === "tablette-fixe")
      .reduce((s, p) => s + p.qty, 0);
    if (fixedCount < 2) {
      warnings.push(`${b.name} : < 2 tablettes fixes`);
    }

    if (
      (mk === "melamine" || mk === "osb") &&
      b.pieces.some((p) => p.type === "tablette-reglable")
    ) {
      warnings.push(`[${mat.short}] ${b.name} : crémaillères déconseillées — taquets métalliques`);
    }
  });

  // Ajouter les tips à la fin des warnings (préfixés pour les différencier)
  tips.forEach((t) => warnings.push(`💡 ${t}`));

  return { errors, warnings };
}
