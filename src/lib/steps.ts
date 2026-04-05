import type { AppState, Step } from '../types';
import { MATERIALS } from '../data/materials';
import { SYSTEME_32_RULES, ASSEMBLAGES, FINISHES, ORIENTATION_RULES } from '../data/knowledge';

export function generateSteps(st: AppState): Step[] {
  const { project: pr, panel: pn, bodies: bs, materialKey: mk } = st;
  const mat = MATERIALS[mk];
  const usableHeight = pr.ceilingHeight - pr.plinthHeight;
  const steps: Step[] = [];

  // Règle d'orientation pour le matériau courant
  const matType = mk.startsWith('cp_') ? 'contreplaqué' : mk === 'osb' ? 'OSB' : mk === 'mdf' || mk === 'melamine' ? 'MDF et panneau de particules' : '';
  const orientRule = ORIENTATION_RULES.find((r) => r.materiau === matType);

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
      ...(orientRule ? [`⚡ ${orientRule.regle} (${orientRule.impact})`] : []),
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
    // Perçages système 32 avec cotes exactes de la base de connaissances
    const entraxe = SYSTEME_32_RULES.find((r) => r.id === 'entraxe');
    const axeChant = SYSTEME_32_RULES.find((r) => r.id === 'axe_chant');
    const diam5 = SYSTEME_32_RULES.find((r) => r.id === 'diam_5');
    const diam68 = SYSTEME_32_RULES.find((r) => r.id === 'diam_6_8');

    steps.push({
      title: "3. Perçages taquets — Système 32 [Dunod 2022]",
      items: [
        `Entraxe perçages : ${entraxe?.valeur ?? '32 mm'} (norme système 32)`,
        `Distance axe / chant vertical : ${axeChant?.valeur ?? '37 mm'}`,
        `${diam5?.regle ?? 'Taquets, charnières, coulisses'} : ${diam5?.valeur ?? 'Ø 5 mm'}`,
        `${diam68?.regle ?? 'Tourillons'} : ${diam68?.valeur ?? 'Ø 6 ou 8 mm'}`,
        `Profondeur : 12 mm — gabarit de perçage obligatoire`,
        ...bs.map((b) => `${b.name} : 2 rangées/joue à 37 mm et ${b.depth * 10 - 37} mm du chant`),
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

  // Assemblages disponibles selon la base de connaissances
  const assemblyTypes = ASSEMBLAGES.filter((a) => a.famille === 'caisson');

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
        `Techniques caisson possibles : ${assemblyTypes.map((a) => a.nom).join(', ')} [Dunod 2022]`,
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

  // Finitions enrichies avec la base de connaissances
  const kbFinishes = FINISHES.filter((f) =>
    mat.finish.some((mf) => mf.toLowerCase().includes(f.nom.toLowerCase()))
  );

  steps.push({
    title: "7. Finitions",
    items: [
      `Bandeaux plafond ajustés au compas`,
      `Tasseau collé-vissé plafond`,
      `Jonction 2 corps : montant L ou biseau`,
      `Tablettes réglables en place`,
      mat.edgeFinish,
      `Options : ${mat.finish.join(", ")}`,
      ...kbFinishes.map((f) => `  💡 ${f.nom} : ${f.notes}`),
    ],
  });

  return steps;
}
