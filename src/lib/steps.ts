import type { AppState, Step } from '../types';
import { MATERIALS } from '../data/materials';

export function generateSteps(st: AppState): Step[] {
  const { project: pr, panel: pn, bodies: bs, materialKey: mk } = st;
  const mat = MATERIALS[mk];
  const usableHeight = pr.ceilingHeight - pr.plinthHeight;
  const steps: Step[] = [];

  steps.push({
    title: "1. Relevé de cotes terrain",
    items: [
      `Largeur mur 4 pts — projet : ${pr.wallWidth} cm`,
      `Hauteur 4 pts — projet : ${pr.ceilingHeight} cm`,
      `Aplomb pilier au niveau laser`,
      `Planéité sol — marquer points hauts`,
      `Hauteur utile : ${pr.ceilingHeight} − ${pr.plinthHeight} = ${usableHeight} cm`,
    ],
  });

  steps.push({
    title: `2. Débit — ${mat.name} ${pn.thickness * 10} mm`,
    items: [
      `Panneau ${pn.width}×${pn.height} cm`,
      `Découpe grands panneaux en magasin`,
      `Finitions scie circulaire sur rail`,
      ...(mk === "melamine" ? ["⚠ Lame trapézoïdale anti-éclats"] : []),
      ...(mk === "mdf" ? ["⚠ Masque FFP2 obligatoire"] : []),
      ...bs.flatMap((b) =>
        b.pieces.map((p) => `  → ${p.name} : ${p.length}×${p.width} cm ×${p.qty}`)
      ),
    ],
  });

  if (mk !== "melamine" && mk !== "osb") {
    steps.push({
      title: "3. Rainures crémaillères",
      items: [
        mat.routing,
        `Fraise Ø12, prof 8 mm, 2-3 passes de 4 mm`,
        `Guide parallèle obligatoire`,
        ...bs.map((b) => `${b.name} : 4 rainures à 5 cm et ${b.depth - 5} cm du bord`),
        `Marquer haut/bas + int./ext.`,
      ],
    });
  } else {
    steps.push({
      title: "3. Perçages taquets",
      items: [
        `Perçages Ø5, entraxe 32 mm, prof 12 mm`,
        `Gabarit de perçage obligatoire`,
        ...bs.map((b) => `${b.name} : 2 rangées/joue à 5 cm et ${b.depth - 5} cm`),
      ],
    });
  }

  steps.push({
    title: "4. Découpe plinthe",
    items: [
      `Entaille ${pr.plinthHeight}×${pr.plinthDepth} cm bas de chaque joue`,
      `Scie sauteuse lame fine + ponçage`,
    ],
  });

  bs.forEach((b, i) => {
    const fixedCount = b.pieces
      .filter((p) => p.type === "tablette-fixe")
      .reduce((s, p) => s + p.qty, 0);
    const adjustableCount = b.pieces
      .filter((p) => p.type === "tablette-reglable")
      .reduce((s, p) => s + p.qty, 0);

    steps.push({
      title: `5.${i + 1}. Assemblage ${b.name}`,
      items: [
        `Joues bas à plat sur tréteaux`,
        ...mat.assembly,
        `${fixedCount} tablettes fixes : basse ~${usableHeight - 45} cm / haute 180 cm`,
        `Joues hautes — tablette fixe couvre le joint`,
        `Équerrage diagonales (tol. 2 mm)`,
        `Fond 6 mm agrafé`,
        ...(mat.edgeBanding ? ["⚠ Chants thermocollants AVANT assemblage"] : []),
        `${adjustableCount} tablettes réglables : ne pas monter`,
      ],
    });
  });

  steps.push({
    title: "6. Mise en place",
    items: [
      `Corps gauche contre le pilier`,
      `Verticalité niveau 2 axes — caler`,
      `2-3 vis/corps (chevilles béton Ø8)`,
      `Corps droit accolé — verticalité — fixation`,
      `Décalage prof. ${bs.length >= 2 ? bs[1].depth - bs[0].depth : "?"} cm intentionnel`,
    ],
  });

  steps.push({
    title: "7. Finitions",
    items: [
      `Bandeaux plafond ajustés au compas`,
      `Tasseau collé-vissé plafond`,
      `Jonction 2 corps : montant L ou biseau`,
      `Tablettes réglables en place`,
      mat.edgeFinish,
      `Options : ${mat.finish.join(", ")}`,
    ],
  });

  return steps;
}
