import type { Material, MaterialKey, PieceType } from '../types';

export const MATERIALS: Record<MaterialKey, Material> = {
  cp_bouleau: {
    name: "Contreplaqué bouleau", short: "CP bouleau", density: 680, flexMPa: 40,
    thicknesses: [6, 10, 12, 15, 18, 22, 25], defaultThickness: 18,
    panels: [{ w: 250, h: 125 }, { w: 305, h: 152 }],
    maxSpan18: 80, screwHolding: "excellent", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage 120→180, vernis ou huile",
    assembly: ["Tourillons Ø8 + colle vinylique D3", "Vis 4×40 en renfort", "Fond agrafé CP peuplier 6 mm"],
    routing: "Excellent — fraise droite Ø12, passes de 4 mm max",
    finish: ["Vernis PU mat", "Huile dure", "Peinture (après sous-couche)", "Teinte + vernis"],
    warnings: [],
    notes: "Référence meuble sur mesure. Chant esthétique sans placage.",
  },
  cp_peuplier: {
    name: "Contreplaqué peuplier", short: "CP peuplier", density: 450, flexMPa: 25,
    thicknesses: [3, 5, 6, 8, 10, 12, 15, 18], defaultThickness: 18,
    panels: [{ w: 250, h: 122 }],
    maxSpan18: 65, screwHolding: "bon", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage 120→180, vernis ou peinture",
    assembly: ["Tourillons Ø8 + colle", "Vis 4×40", "Fond agrafé"],
    routing: "Bon — contre-plaque en sortie pour éviter éclats",
    finish: ["Peinture", "Vernis", "Huile"],
    warnings: ["Résistance flexion inférieure au bouleau — réduire la portée libre"],
    notes: "Plus léger, moins résistant. Bon pour fonds et étagères peu chargées.",
  },
  cp_okoume: {
    name: "Contreplaqué okoumé", short: "CP okoumé", density: 500, flexMPa: 30,
    thicknesses: [4, 5, 6, 8, 10, 12, 15, 18, 22, 25], defaultThickness: 18,
    panels: [{ w: 250, h: 122 }, { w: 310, h: 153 }],
    maxSpan18: 70, screwHolding: "bon", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage 120→180, vernis marin ou huile",
    assembly: ["Tourillons Ø8 + colle D3", "Vis 4×40", "Fond agrafé"],
    routing: "Bon — bois tendre, avance régulière",
    finish: ["Vernis marin", "Huile dure", "Lasure", "Peinture"],
    warnings: [],
    notes: "Bel aspect chaud. Résistance humidité (avec traitement).",
  },
  mdf: {
    name: "MDF (Medium)", short: "MDF", density: 750, flexMPa: 30,
    thicknesses: [3, 6, 10, 12, 16, 18, 19, 22, 25], defaultThickness: 18,
    panels: [{ w: 280, h: 207 }, { w: 244, h: 122 }],
    maxSpan18: 60, screwHolding: "moyen", dowels: true, edgeBanding: false,
    edgeFinish: "Ponçage fin + apprêt obligatoire avant peinture",
    assembly: ["Vis + colle obligatoire (vis seules = arrachement)", "Pré-perçage systématique", "Tourillons Ø8 + colle", "Excentriques recommandés", "Fond cloué ou agrafé"],
    routing: "Très bon — finition nette, masque FFP2 obligatoire (poussière fine)",
    finish: ["Peinture (idéal)", "Laque", "Placage + vernis"],
    warnings: ["Vis dans les chants : tenue médiocre, pré-perçage + colle obligatoire", "Ne supporte pas l'humidité", "Poids élevé (~750 kg/m³)"],
    notes: "Homogène, facile à usiner. Surface idéale pour peinture laquée.",
  },
  melamine: {
    name: "Mélaminé (particules)", short: "Mélaminé", density: 650, flexMPa: 14,
    thicknesses: [8, 16, 18, 22, 25], defaultThickness: 18,
    panels: [{ w: 280, h: 207 }, { w: 244, h: 122 }],
    maxSpan18: 55, screwHolding: "faible", dowels: false, edgeBanding: true,
    edgeFinish: "Chant mélaminé thermocollant obligatoire (fer à repasser)",
    assembly: ["Excentriques + tourillons (JAMAIS de vis dans le chant)", "Pré-perçage 3 mm face", "Colle contact en renfort", "Fond HDF 3 mm en rainure"],
    routing: "Médiocre — éclats fréquents, fraise spéciale stratifié",
    finish: ["Aucune (fini d'usine)", "Chant thermocollant assorti"],
    warnings: ["INTERDIT : vis dans les chants (arrachement garanti)", "Flexion importante au-delà de 60 cm sans renfort", "Chant thermocollant obligatoire sur tranches visibles"],
    notes: "Économique, fini d'usine. Assemblage par excentriques uniquement.",
  },
  osb: {
    name: "OSB3", short: "OSB", density: 600, flexMPa: 20,
    thicknesses: [9, 12, 15, 18, 22], defaultThickness: 18,
    panels: [{ w: 250, h: 125 }],
    maxSpan18: 60, screwHolding: "moyen", dowels: false, edgeBanding: false,
    edgeFinish: "Chant brut — ponçage grossier, pas de finition fine",
    assembly: ["Vis à bois 4×50", "Colle PU pour joints", "Pas de tourillons (structure hétérogène)"],
    routing: "Médiocre — copeaux arrachés, finition grossière",
    finish: ["Vernis mat (industriel)", "Peinture (ponçage + apprêt)", "Brut"],
    warnings: ["Esthétique industrielle uniquement", "Chants grossiers non plaquables"],
    notes: "Style industriel assumé. Économique.",
  },
};

export const PIECE_COLORS: Record<PieceType, string> = {
  joue: "#3b82f6",
  "tablette-fixe": "#10b981",
  "tablette-reglable": "#f59e0b",
  bandeau: "#8b5cf6",
  autre: "#ec4899",
};

export const BODY_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#a78bfa", "#f472b6"];

export const PIECE_TYPES: PieceType[] = ['joue', 'tablette-fixe', 'tablette-reglable', 'bandeau', 'autre'];
