/**
 * Engine step 7 — Production output generation.
 *
 * Generates assumptions, shopping list, assembly guide, and project summary.
 */

import type {
  ProjectIntent,
  GeneratedPart,
  HardwareItem,
  Structure,
  ValidationIssue,
  ProductionOutput,
  Assumption,
  AssemblyStep,
  PanelNeed,
  ShoppingList,
  ProjectSummary,
  DifficultyLevel,
  DrillingOp,
  Layout,
} from '../knowledge/types';
import type { PieceWithBody, NestingResult } from '../../types';
import { MATERIALS } from '../../data/materials';
import { optimizeNesting } from '../nesting';

// ---------------------------------------------------------------------------
// 1. Assumptions
// ---------------------------------------------------------------------------

function buildAssumptions(intent: ProjectIntent, structure: Structure): Assumption[] {
  const assumptions: Assumption[] = [];

  assumptions.push({
    key: 'wall_type',
    value: intent.space.wall_type,
    reason: intent.space.wall_type === 'unknown'
      ? 'Type de mur non précisé — fixations génériques prévues'
      : `Fixations adaptées pour mur ${intent.space.wall_type}`,
    user_should_verify: intent.space.wall_type === 'unknown',
  });

  assumptions.push({
    key: 'panel_gap',
    value: '2mm',
    reason: 'Jeu standard entre pièces pour dilatation et assemblage',
    user_should_verify: false,
  });

  for (const body of structure.bodies) {
    if (body.back_panel.type === 'groove') {
      assumptions.push({
        key: 'back_panel',
        value: `Fond en rainure ${body.back_panel.thickness_mm}mm`,
        reason: 'Rainure usinée dans les joues — nécessite défonceuse ou scie circulaire avec guide',
        user_should_verify: false,
      });
      break;
    }
  }

  assumptions.push({
    key: 'hinge_overlay',
    value: '2mm',
    reason: 'Recouvrement standard pour charnières à clapet 35mm',
    user_should_verify: false,
  });

  assumptions.push({
    key: 'square_check',
    value: 'Vérifier équerrage avant collage',
    reason: 'Les diagonales doivent être égales à ±1mm pour un meuble d\'aplomb',
    user_should_verify: true,
  });

  const mat = MATERIALS[intent.material_key];
  if (mat) {
    assumptions.push({
      key: 'material',
      value: `${mat.name} ép. ${mat.defaultThickness}mm`,
      reason: `Densité ${mat.density} kg/m³, flexion ${mat.flexMPa} MPa`,
      user_should_verify: false,
    });
  }

  return assumptions;
}

// ---------------------------------------------------------------------------
// 2. Shopping list
// ---------------------------------------------------------------------------

function buildShoppingList(
  intent: ProjectIntent,
  parts: GeneratedPart[],
  hardware: HardwareItem[],
): ShoppingList {
  const mat = MATERIALS[intent.material_key];
  const panel = mat?.panels[0];

  // Group panels by thickness
  const thicknessMap = new Map<number, { area: number; count: number }>();
  for (const p of parts) {
    const area = (p.length_mm * p.width_mm * p.qty) / 1e6; // m²
    const existing = thicknessMap.get(p.thickness_mm) ?? { area: 0, count: 0 };
    existing.area += area;
    existing.count += p.qty;
    thicknessMap.set(p.thickness_mm, existing);
  }

  const panels: PanelNeed[] = [];
  for (const [thickness, data] of thicknessMap) {
    if (!panel) continue;
    const panelAreaReal = (panel.w * panel.h) / 1e4; // m² (w and h in cm)
    const neededPanels = Math.ceil(data.area / panelAreaReal);

    panels.push({
      panel_label: `${mat?.short ?? 'Panneau'} ${thickness}mm`,
      width_mm: panel.w * 10,
      height_mm: panel.h * 10,
      thickness_mm: thickness,
      count: Math.max(1, neededPanels),
      unit_price_eur: panel.defaultPrice,
    });
  }

  const panelCost = panels.reduce((s, p) => s + p.count * p.unit_price_eur, 0);
  const hwCost = hardware.reduce((s, h) => s + (h.unit_price_eur ?? 0) * h.quantity, 0);

  const tools: string[] = [
    'Scie circulaire sur rail ou scie sur table',
    'Perceuse-visseuse',
    'Mèche Ø5mm (taquets) + Ø8mm (tourillons)',
    'Serre-joints (min. 4)',
    'Équerre de menuisier',
    'Mètre + crayon',
  ];

  // Add tool for grooves if needed
  if (parts.some((p) => p.type === 'fond')) {
    tools.push('Défonceuse ou scie circulaire avec guide (rainure fond)');
  }

  // Add tool for hinges
  if (parts.some((p) => p.type === 'porte')) {
    tools.push('Fraise Forstner Ø35mm (charnières)');
  }

  // Add tool for edge banding
  if (parts.some((p) => p.edge_banding && p.edge_banding.length > 0)) {
    tools.push('Fer à repasser ou plaqueuse de chant');
  }

  return {
    panels,
    hardware,
    tools_needed: tools,
    estimated_cost_eur: Math.round(panelCost + hwCost),
  };
}

// ---------------------------------------------------------------------------
// 3. Assembly guide
// ---------------------------------------------------------------------------

function buildAssemblyGuide(
  intent: ProjectIntent,
  parts: GeneratedPart[],
  hardware: HardwareItem[],
  structure: Structure,
): AssemblyStep[] {
  const steps: AssemblyStep[] = [];
  let n = 1;

  const hasDoors = parts.some((p) => p.type === 'porte');
  const hasDrawers = parts.some((p) => p.type === 'tiroir-facade');
  const hasFond = parts.some((p) => p.type === 'fond');
  const hasAdjShelves = parts.some((p) => p.type === 'tablette-reglable');
  const hasPlinth = structure.bodies.some((b) => b.plinth.type === 'legs');
  const isSuspended = structure.bodies.some((b) => b.wall_mounting?.type === 'rail');
  const hasAntiTip = structure.bodies.some((b) => b.wall_mounting?.type === 'anti_tip');
  const hasRod = (intent.zones ?? []).some(
    (z) => z.module_id === 'hanging_rod_short' || z.module_id === 'hanging_rod_long',
  );
  const hasEdgeBanding = parts.some((p) => p.edge_banding && p.edge_banding.length > 0);

  // Step 1: Preparation
  steps.push({
    step_number: n++,
    title: 'Préparation et débit',
    instructions: [
      'Vérifier toutes les cotes sur le plan de débit',
      'Découper toutes les pièces selon la fiche de débit',
      'Poncer les chants à la cale (grain 120 puis 180)',
      'Repérer et numéroter chaque pièce au crayon',
    ],
    parts_involved: parts.map((p) => p.id),
    tip: 'Couper les pièces les plus grandes en premier pour optimiser les chutes',
  });

  if (hasEdgeBanding) {
    const edgeParts = parts.filter((p) => p.edge_banding && p.edge_banding.length > 0);
    steps.push({
      step_number: n++,
      title: 'Application des bandes de chant',
      instructions: [
        'Découper les bandes de chant à longueur (prévoir 5mm de surplus)',
        'Appliquer au fer à repasser (160°C, sans vapeur) ou à la plaqueuse',
        'Presser fermement avec une cale en liège pendant le refroidissement',
        'Araser les surplus au cutter ou à l\'affleureur',
      ],
      parts_involved: edgeParts.map((p) => p.id),
      tip: 'Tester la température du fer sur une chute — la colle doit fondre sans brûler le mélaminé',
    });
  }

  // Step 2: Groove for back panel
  if (hasFond) {
    const fondSpec = structure.bodies[0]?.back_panel;
    steps.push({
      step_number: n++,
      title: 'Rainure pour le fond',
      instructions: [
        `Usiner une rainure de ${fondSpec?.thickness_mm ?? 5}mm × 8mm de profondeur`,
        'À 8mm du bord arrière sur les joues, dessus et dessous',
        'Vérifier que le fond coulisse librement dans la rainure',
      ],
      parts_involved: parts.filter((p) => p.type === 'joue' || p.type === 'dessus' || p.type === 'dessous').map((p) => p.id),
      tip: 'Faire un test sur une chute avant d\'usiner les pièces définitives',
    });
  }

  // Step 3: Drilling
  steps.push({
    step_number: n++,
    title: 'Perçages d\'assemblage',
    instructions: [
      'Tracer les emplacements des vis Confirmat (repère à 37mm des bords)',
      'Percer les avant-trous Ø5mm dans les chants',
      'Percer les traversées Ø7mm dans les faces',
    ],
    parts_involved: parts.filter((p) => ['joue', 'dessus', 'dessous', 'tablette-fixe'].includes(p.type)).map((p) => p.id),
    hardware_involved: hardware.filter((h) => h.category === 'screw').map((h) => h.id),
  });

  // Step 4: Shelf pin holes
  if (hasAdjShelves) {
    steps.push({
      step_number: n++,
      title: 'Perçage taquets (système 32)',
      instructions: [
        'Tracer les lignes de perçage à 37mm et (profondeur - 37)mm du bord avant',
        'Percer des trous Ø5mm × 10mm de profondeur, espacés de 32mm',
        'Utiliser un gabarit pour garantir l\'alignement',
      ],
      parts_involved: parts.filter((p) => p.type === 'joue').map((p) => p.id),
      hardware_involved: hardware.filter((h) => h.category === 'shelf_support').map((h) => h.id),
      tip: 'Un taquet de profondeur sur le foret évite de percer trop profond',
    });
  }

  // Step 5: Hinge cups
  if (hasDoors) {
    steps.push({
      step_number: n++,
      title: 'Perçage charnières',
      instructions: [
        'Tracer les emplacements à 100mm des bords haut/bas de la porte',
        'Percer les cups Ø35mm × 12mm de profondeur (fraise Forstner)',
        'Visser les platines de fixation sur les joues',
      ],
      parts_involved: parts.filter((p) => p.type === 'porte' || p.type === 'joue').map((p) => p.id),
      hardware_involved: hardware.filter((h) => h.category === 'hinge').map((h) => h.id),
    });
  }

  // Step 6: Assemble carcass
  steps.push({
    step_number: n++,
    title: 'Assemblage du caisson',
    instructions: [
      'Assembler dessous + joues avec vis Confirmat',
      'Glisser le fond dans sa rainure',
      'Poser le dessus et visser',
      'Vérifier l\'équerrage (diagonales égales à ±1mm)',
      'Serrer tous les vis à fond',
    ],
    parts_involved: parts.filter((p) =>
      ['joue', 'dessus', 'dessous', 'fond'].includes(p.type),
    ).map((p) => p.id),
    hardware_involved: hardware.filter((h) => h.category === 'screw').map((h) => h.id),
    tip: 'Assembler à plat sur le sol, caisson couché sur le dos',
  });

  // Step 7: Fixed shelves
  const fixedShelves = parts.filter((p) => p.type === 'tablette-fixe');
  if (fixedShelves.length > 0) {
    steps.push({
      step_number: n++,
      title: 'Tablettes fixes',
      instructions: [
        'Visser les tablettes fixes aux emplacements marqués',
        'Vérifier l\'horizontalité au niveau à bulle',
      ],
      parts_involved: fixedShelves.map((p) => p.id),
    });
  }

  // Step 8: Plinth / Legs
  if (hasPlinth) {
    steps.push({
      step_number: n++,
      title: 'Pieds réglables',
      instructions: [
        'Visser les pieds sous le dessous du caisson',
        'Régler la hauteur pour compenser les irrégularités du sol',
        'Vérifier l\'horizontalité avec un niveau',
      ],
      parts_involved: [],
      hardware_involved: hardware.filter((h) => h.category === 'strut').map((h) => h.id),
    });
  }

  // Step 9: Wall mounting
  if (isSuspended) {
    steps.push({
      step_number: n++,
      title: 'Fixation murale (rail)',
      instructions: [
        'Fixer le rail de suspension au mur (chevilles adaptées au type de mur)',
        'Visser les boîtiers de suspension à l\'intérieur du caisson',
        'Accrocher le meuble et régler l\'aplomb',
      ],
      parts_involved: [],
      hardware_involved: hardware.filter((h) => h.category === 'wall_mount').map((h) => h.id),
      tip: `Type de mur : ${intent.space.wall_type} — adapter les chevilles`,
    });
  }

  // Step 10: Drawers
  if (hasDrawers) {
    steps.push({
      step_number: n++,
      title: 'Montage des tiroirs',
      instructions: [
        'Assembler les caissons de tiroir (côtés + AV/AR + fond)',
        'Fixer les coulisses dans le caisson (repère à 37mm du bord)',
        'Clipser les tiroirs sur les coulisses',
        'Fixer les façades avec un jeu de 2-3mm',
      ],
      parts_involved: parts.filter((p) =>
        ['tiroir-facade', 'tiroir-caisson', 'tiroir-fond'].includes(p.type),
      ).map((p) => p.id),
      hardware_involved: hardware.filter((h) => h.category === 'slide' || h.category === 'handle').map((h) => h.id),
    });
  }

  // Step 11: Doors
  if (hasDoors) {
    steps.push({
      step_number: n++,
      title: 'Pose des portes',
      instructions: [
        'Clipser les charnières dans les cups Ø35mm',
        'Régler en 3 axes : hauteur, profondeur, latéral',
        'Vérifier le jeu uniforme entre les portes (2-3mm)',
        'Poser les poignées',
      ],
      parts_involved: parts.filter((p) => p.type === 'porte').map((p) => p.id),
      hardware_involved: hardware.filter((h) => h.category === 'hinge' || h.category === 'handle').map((h) => h.id),
    });
  }

  // Step 12: Hanging rod
  if (hasRod) {
    steps.push({
      step_number: n++,
      title: 'Tringle de penderie',
      instructions: [
        'Fixer les supports de tringle à la hauteur prévue',
        'Couper la tringle à la longueur (largeur intérieure - 2mm)',
        'Poser la tringle sur les supports',
      ],
      parts_involved: [],
      hardware_involved: hardware.filter((h) => h.category === 'rod').map((h) => h.id),
    });
  }

  // Step 13: Adjustable shelves
  if (hasAdjShelves) {
    steps.push({
      step_number: n++,
      title: 'Tablettes réglables + finitions',
      instructions: [
        'Insérer les taquets aux hauteurs souhaitées',
        'Poser les tablettes réglables',
        'Vérifier la stabilité globale du meuble',
      ],
      parts_involved: parts.filter((p) => p.type === 'tablette-reglable').map((p) => p.id),
      hardware_involved: hardware.filter((h) => h.category === 'shelf_support').map((h) => h.id),
    });
  }

  // Anti-tip
  if (hasAntiTip) {
    steps.push({
      step_number: n++,
      title: 'Anti-basculement',
      instructions: [
        'Fixer l\'équerre anti-basculement au mur et au meuble',
        'Tester la stabilité en tirant légèrement le haut du meuble',
      ],
      parts_involved: [],
      hardware_involved: hardware.filter((h) => h.reference === 'anti_tip').map((h) => h.id),
      tip: 'Obligatoire pour les meubles > 1.5m — sécurité enfants',
    });
  }

  return steps;
}

// ---------------------------------------------------------------------------
// 4. Summary
// ---------------------------------------------------------------------------

function buildSummary(
  intent: ProjectIntent,
  parts: GeneratedPart[],
  _hardware: HardwareItem[],
): ProjectSummary {
  const mat = MATERIALS[intent.material_key];
  const density = mat?.density ?? 680;

  const totalWeight = parts.reduce((sum, p) => {
    return sum + (p.length_mm * p.width_mm * p.thickness_mm * density * p.qty) / 1e9;
  }, 0);

  const totalParts = parts.reduce((sum, p) => sum + p.qty, 0);
  const hasDrawers = parts.some((p) => p.type === 'tiroir-facade');
  const hasDoors = parts.some((p) => p.type === 'porte');
  const hasRods = (intent.zones ?? []).some(
    (z) => z.module_id === 'hanging_rod_short' || z.module_id === 'hanging_rod_long',
  );

  let difficulty: DifficultyLevel = 'debutant';
  if (hasDrawers || hasDoors) difficulty = 'intermediaire';
  if (hasDrawers && hasDoors && hasRods) difficulty = 'avance';
  if (totalParts > 30) difficulty = 'avance';

  return {
    dimensions_mm: {
      w: intent.space.width_mm,
      h: intent.space.height_mm,
      d: intent.space.depth_mm,
    },
    total_parts: totalParts,
    total_weight_kg: Math.round(totalWeight * 10) / 10,
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// 5. Cutting plans (nesting integration)
// ---------------------------------------------------------------------------

/**
 * Convert V3 GeneratedPart[] (mm) to legacy PieceWithBody[] (cm)
 * for the nesting algorithm.
 */
function partsToNestingInput(parts: GeneratedPart[], layout: Layout): PieceWithBody[] {
  return parts.map((gp) => ({
    id: gp.id,
    name: gp.name,
    length: +(gp.length_mm / 10).toFixed(1),
    width: +(gp.width_mm / 10).toFixed(1),
    qty: gp.qty,
    type: 'autre' as const,
    bodyName: `Corps ${layout.bodies.findIndex((b) => b.body_id === gp.body_id) + 1}`,
    bodyId: gp.body_id,
  }));
}

function buildCuttingPlans(
  intent: ProjectIntent,
  parts: GeneratedPart[],
  layout: Layout,
): NestingResult | null {
  const mat = MATERIALS[intent.material_key];
  const panel = mat?.panels[0];
  if (!panel || parts.length === 0) return null;

  const piecesForNesting = partsToNestingInput(parts, layout);
  // panel.w and panel.h are in cm, kerf in cm
  return optimizeNesting(piecesForNesting, panel.w, panel.h, 0.3);
}

// ---------------------------------------------------------------------------
// 6. Drilling plans
// ---------------------------------------------------------------------------

/**
 * Collect drilling ops from all parts into per-part arrays.
 * Only includes parts that have drilling operations.
 */
function buildDrillingPlans(parts: GeneratedPart[]): DrillingOp[][] {
  const plans: DrillingOp[][] = [];
  for (const part of parts) {
    if (part.drilling && part.drilling.length > 0) {
      // One entry per physical piece (expand qty)
      for (let i = 0; i < part.qty; i++) {
        plans.push(part.drilling);
      }
    }
  }
  return plans;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateProduction(
  intent: ProjectIntent,
  parts: GeneratedPart[],
  hardware: HardwareItem[],
  structure: Structure,
  _validation: ValidationIssue[],
  layout: Layout,
): ProductionOutput {
  return {
    assumptions: buildAssumptions(intent, structure),
    shopping_list: buildShoppingList(intent, parts, hardware),
    cutting_plans: buildCuttingPlans(intent, parts, layout),
    drilling_plans: buildDrillingPlans(parts),
    assembly_guide: buildAssemblyGuide(intent, parts, hardware, structure),
    summary: buildSummary(intent, parts, hardware),
  };
}
