import type { AppState, ValidationResult } from '../types';
import { MATERIALS } from '../data/materials';

export function validate(st: AppState): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
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

    tablettes.forEach((p) => {
      if (p.length > mat.maxSpan18) {
        warnings.push(
          `[${mat.short}] "${p.name}" portée ${p.length} cm > max ${mat.maxSpan18} cm — flexion`
        );
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

  return { errors, warnings };
}
