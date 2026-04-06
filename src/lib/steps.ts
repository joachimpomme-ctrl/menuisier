import type { AppState, Step } from '../types';
import { MATERIALS } from '../data/materials';
import { SYSTEME_32_RULES, ASSEMBLAGES, FINISHES, ORIENTATION_RULES } from '../data/knowledge';
import { getDoorInfoFromPieces, getUsableHeight } from './helpers';

export function generateSteps(st: AppState): Step[] {
  const { project: pr, panel: pn, bodies: bs, materialKey: mk } = st;
  const mat = MATERIALS[mk];
  const usableHeight = getUsableHeight(pr.ceilingHeight, pr.plinthHeight);
  const sharedBounds = st.sharedBoundaries ?? [];
  const steps: Step[] = [];

  // Règle d'orientation pour le matériau courant
  const matType = mk.startsWith('cp_') ? 'contreplaqué' : mk === 'osb' ? 'OSB' : mk === 'mdf' || mk === 'melamine' ? 'MDF et panneau de particules' : '';
  const orientRule = ORIENTATION_RULES.find((r) => r.materiau === matType);

  // Any bodies with doors?
  const bodiesWithDoors = bs.filter((b) => b.doorConfig);

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
        ...bs.map((b, bi) => {
          const sl = bi > 0 && (sharedBounds[bi - 1] ?? false);
          const sr = bi < bs.length - 1 && (sharedBounds[bi] ?? false);
          // Joues propres : 2 par défaut, -1 si joue commune à gauche, -1 si joue commune à droite
          const ownJoues = 2 - (sl ? 1 : 0) - (sr ? 1 : 0);
          const rainCount = ownJoues * 2; // 2 rainures par joue propre
          const note = rainCount < 4 ? ` (${4 - rainCount} rainures sur joue commune)` : '';
          return `${b.name} : ${rainCount} rainures propres à 5 cm et ${b.depth - 5} cm du bord${note}`;
        }),
        `Marquer haut/bas + int./ext.`,
      ],
    });
  } else {
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
        ...bs.map((b) => {
          const depthMm = b.depth * 10;
          // Distance standard axe/chant = 37 mm (système 32).
          // Pour les corps peu profonds (< 10 cm), une seule rangée centrée.
          if (depthMm < 100) {
            return `${b.name} : 1 rangée/joue centrée à ${Math.round(depthMm / 2)} mm du chant (profondeur < 10 cm)`;
          }
          const backPos = depthMm - 37;
          return `${b.name} : 2 rangées/joue à 37 mm et ${backPos} mm du chant`;
        }),
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

  // Perçage cuvettes portes (avant assemblage !)
  if (bodiesWithDoors.length > 0) {
    const doorItems: string[] = [
      '⚠ Percer les cuvettes AVANT assemblage du caisson',
      `Fraise Forstner Ø35 mm — perceuse à colonne recommandée`,
      `Profondeur cuvette : 12-13 mm`,
      `Centre cuvette : 21-22 mm du chant de la porte`,
    ];

    bodiesWithDoors.forEach((b) => {
      const dims = getDoorInfoFromPieces(b, pn.thickness, mat.density);
      if (!dims) return;
      doorItems.push(
        `${b.name} — ${dims.count} porte${dims.count > 1 ? 's' : ''} (${dims.poseLabel}) :`
      );
      doorItems.push(
        `  → Porte ${dims.doorWidth}×${dims.doorHeight} cm — ${dims.hingeCount} cuvettes/porte`
      );
      doorItems.push(
        `  → Positions depuis le bas : ${dims.hingePositions.map((p) => `${p} mm`).join(', ')}`
      );
    });

    steps.push({
      title: "4b. Perçage cuvettes charnières Ø35",
      items: doorItems,
    });
  }

  // Assemblages disponibles selon la base de connaissances
  const assemblyTypes = ASSEMBLAGES.filter((a) => a.famille === 'caisson');

  bs.forEach((b, i) => {
    const fixedCount = b.pieces
      .filter((p) => p.type === "tablette-fixe")
      .reduce((s, p) => s + p.qty, 0);
    const adjustableCount = b.pieces
      .filter((p) => p.type === "tablette-reglable")
      .reduce((s, p) => s + p.qty, 0);

    const sl = i > 0 && (sharedBounds[i - 1] ?? false);
    const sr = i < bs.length - 1 && (sharedBounds[i] ?? false);
    const sharingNotes: string[] = [];
    if (sl) sharingNotes.push(`⚙ Joue gauche = joue commune avec ${bs[i - 1]?.name} (pas de joue gauche propre)`);
    if (sr) sharingNotes.push(`⚙ Joue droite = joue commune avec ${bs[i + 1]?.name} (profondeur adaptée au max des 2 corps)`);

    const joueInstruction = sl
      ? `Joue droite à plat sur tréteaux (joue gauche commune déjà en place)`
      : `Joues bas à plat sur tréteaux`;

    steps.push({
      title: `5.${i + 1}. Assemblage ${b.name}`,
      items: [
        ...sharingNotes,
        joueInstruction,
        `Techniques caisson possibles : ${assemblyTypes.map((a) => a.nom).join(', ')} [Dunod 2022]`,
        ...mat.assembly,
        `${fixedCount} tablettes fixes : basse ~${usableHeight - 45} cm / haute 180 cm`,
        `Joues hautes — tablette fixe couvre le joint`,
        `Équerrage diagonales (tol. 2 mm)`,
        `Fond 6 mm agrafé`,
        ...(mat.edgeBanding ? ["⚠ Chants thermocollants AVANT assemblage"] : []),
        ...(() => {
          const seps = b.pieces.filter((p) => p.type === 'separateur');
          const sepCount = seps.reduce((s, p) => s + p.qty, 0);
          if (sepCount === 0) return [];
          return [
            `${sepCount} séparateur(s) vertical(aux) : poser sur taquets ou coller/visser entre tablettes`,
            ...seps.map((p) => `  → ${p.name} : ${p.length}×${p.width} cm ×${p.qty}`),
          ];
        })(),
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

  // Pose des portes (après mise en place)
  if (bodiesWithDoors.length > 0) {
    const totalHinges = bodiesWithDoors.reduce((sum, b) => {
      const dims = getDoorInfoFromPieces(b, pn.thickness, mat.density);
      if (!dims) return sum;
      return sum + dims.hingeCount * dims.count;
    }, 0);

    const doorPoseItems: string[] = [
      `${totalHinges} charnières Ø35 + platines de montage`,
      `Visser les platines sur les joues (vis Ø4×16, positions système 32)`,
      `Clipser les charnières sur les platines`,
      `Réglage en 3 axes :`,
      `  1. Latéral : vis de réglage gauche/droite → jeu uniforme entre portes`,
      `  2. Profondeur : vis avant/arrière → aplomb de la porte`,
      `  3. Hauteur : vis de fixation platine → alignement haut/bas`,
      `Vérifier le jeu de 2 mm entre portes adjacentes`,
    ];

    bodiesWithDoors.forEach((b) => {
      const dims = getDoorInfoFromPieces(b, pn.thickness, mat.density);
      if (!dims) return;
      doorPoseItems.push(`${b.name} : ${dims.count}× porte ${dims.doorWidth}×${dims.doorHeight} cm (${dims.poseLabel})`);
    });

    doorPoseItems.push('Ajouter amortisseurs soft-close si non intégrés');

    steps.push({
      title: "6b. Pose des portes",
      items: doorPoseItems,
    });
  }

  // --- Fillers (pièces de remplissage haut/bas) ---
  const bodiesWithFillers = bs.filter((b) =>
    b.pieces.some((p) => /filler|remplissage|tasseau plafond|bandeau haut/i.test(p.name))
  );

  if (bodiesWithFillers.length > 0) {
    const fillerItems: string[] = [
      '⚠ Les fillers comblent l\'espace entre le haut du meuble et le plafond',
      '',
      '— Étape 1 : Tasseau plafond —',
      `Repérer la position du tasseau au plafond (aligner avec les joues)`,
      `Percer le plafond : chevilles Ø6 ou Ø8 selon le support (béton → cheville à frapper, placo → Molly)`,
      `Visser le tasseau au plafond — vis Ø4×40 espacées de 20 cm`,
      `Vérifier le niveau : le tasseau doit être parfaitement horizontal`,
      '',
      '— Étape 2 : Bandeau de finition (face avant) —',
      `Découper le bandeau à la largeur exacte du corps (ajuster au compas à pointe sèche si le plafond n'est pas droit)`,
      `Fixer le bandeau sur le tasseau : colle PVA + pointes sans tête (cloueur pneumatique idéal)`,
      `Le bandeau doit venir en appui sur le dessus des joues`,
      '',
      '— Étape 3 : Plaquettes latérales —',
      `Découper les plaquettes à la hauteur du gap`,
      `Coller + pointes sans tête sur les joues`,
      `Poncer les joints au grain 120 puis 180`,
    ];

    bodiesWithFillers.forEach((b) => {
      const fillers = b.pieces.filter((p) => /filler|remplissage|tasseau plafond|bandeau haut/i.test(p.name));
      fillerItems.push('');
      fillerItems.push(`${b.name} :`);
      fillers.forEach((f) => {
        fillerItems.push(`  → ${f.name} : ${f.length}×${f.width} cm ×${f.qty}`);
      });
    });

    steps.push({
      title: "6c. Pose des fillers (remplissage plafond)",
      items: fillerItems,
    });
  }

  // Finitions enrichies avec la base de connaissances
  const kbFinishes = FINISHES.filter((f) =>
    mat.finish.some((mf) => mf.toLowerCase().includes(f.nom.toLowerCase()))
  );

  steps.push({
    title: "7. Finitions",
    items: [
      ...(bodiesWithFillers.length > 0
        ? [`Fillers plafond déjà posés (étape 6c)`]
        : [`Bandeaux plafond ajustés au compas`, `Tasseau collé-vissé plafond`]),
      `Jonction 2 corps : montant L ou biseau`,
      `Tablettes réglables en place`,
      mat.edgeFinish,
      `Options : ${mat.finish.join(", ")}`,
      ...kbFinishes.map((f) => `  💡 ${f.nom} : ${f.notes}`),
    ],
  });

  return steps;
}
