// ---------------------------------------------------------------------------
// Base de connaissances menuiserie — extraite de menuiserie_knowledge_base_v1_verified.json
// Sources : Dunod 2022, Fleurus
// ---------------------------------------------------------------------------

// Propriétés mécaniques (MPa) — pour calcul de flèche
export interface MechanicalProps {
  essenceId: string;
  name: string;
  compression_axiale: number;
  traction_axiale: number;
  flexion_statique: number;
  module_elasticite: number; // MPa
  source: string;
}

export const MECHANICAL_PROPERTIES: MechanicalProps[] = [
  { essenceId: 'chene_pedoncule', name: 'Chêne pédonculé', compression_axiale: 56, traction_axiale: 80, flexion_statique: 102, module_elasticite: 13000, source: 'dunod_2022:p9_tableau_3_2' },
  { essenceId: 'hetre', name: 'Hêtre', compression_axiale: 53, traction_axiale: 78, flexion_statique: 118, module_elasticite: 14000, source: 'dunod_2022:p9_tableau_3_2' },
  { essenceId: 'frene', name: 'Frêne', compression_axiale: 49, traction_axiale: 75, flexion_statique: 110, module_elasticite: 13000, source: 'dunod_2022:p9_tableau_3_2' },
  { essenceId: 'noyer', name: 'Noyer', compression_axiale: 52, traction_axiale: 70, flexion_statique: 110, module_elasticite: 12000, source: 'dunod_2022:p9_tableau_3_2' },
  { essenceId: 'sapin', name: 'Sapin', compression_axiale: 41, traction_axiale: 58, flexion_statique: 68, module_elasticite: 12000, source: 'dunod_2022:p9_tableau_3_2' },
  { essenceId: 'pin_sylvestre', name: 'Pin sylvestre', compression_axiale: 45, traction_axiale: 65, flexion_statique: 79, module_elasticite: 12000, source: 'dunod_2022:p9_tableau_3_2' },
  { essenceId: 'douglas', name: 'Douglas', compression_axiale: 49, traction_axiale: 69, flexion_statique: 85, module_elasticite: 12500, source: 'dunod_2022:p9_tableau_3_2' },
];

// Règles d'orientation de débit des panneaux
export interface OrientationRule {
  materiau: string;
  regle: string;
  impact: string;
  source: string;
}

export const ORIENTATION_RULES: OrientationRule[] = [
  { materiau: 'contreplaqué', regle: 'Tenir compte du sens du fil apparent (dernier pli de surface).', impact: 'Aspect visuel et orientation des pièces.', source: 'dunod_2022:p43_fiche_19' },
  { materiau: 'latté', regle: 'Respecter le sens des lattes (résistance mécanique).', impact: 'Résistance mécanique fortement affectée.', source: 'dunod_2022:p43_fiche_19' },
  { materiau: 'OSB', regle: 'Copeaux orientés dans la longueur pour meilleure résistance.', impact: 'Résistance supérieure dans la longueur.', source: 'dunod_2022:p43_fiche_19' },
  { materiau: 'panneaux à décor', regle: 'Respecter le sens du motif apparent.', impact: 'Esthétique et nombre de pièces calepinables.', source: 'dunod_2022:p43_44_fiche_19' },
  { materiau: 'MDF et panneau de particules', regle: 'Pas de sens de débit structurel.', impact: 'Facilite l\'optimisation de débit.', source: 'dunod_2022:p43_44_fiche_19' },
];

// Système 32 — règles de perçage pour caissons
export interface Systeme32Rule {
  id: string;
  regle: string;
  valeur: string;
  source: string;
}

export const SYSTEME_32_RULES: Systeme32Rule[] = [
  { id: 'entraxe', regle: 'Entraxe de perçages', valeur: '32 mm', source: 'dunod_2022:p119_fiche_55' },
  { id: 'axe_chant', regle: 'Distance axe perçage / chant vertical', valeur: '37 mm', source: 'dunod_2022:p119_fiche_55' },
  { id: 'diam_5', regle: 'Taquets, charnières, coulisses, goujons, vis quincaillerie', valeur: 'Ø 5 mm', source: 'dunod_2022:p119_fiche_55' },
  { id: 'diam_6_8', regle: 'Tourillons', valeur: 'Ø 6 ou 8 mm', source: 'dunod_2022:p119_fiche_55' },
  { id: 'diam_7', regle: 'Collet vis d\'assemblage dans côtés de meuble', valeur: 'Ø 7 mm', source: 'dunod_2022:p119_fiche_55' },
];

// Assemblages de caissons
export interface AssemblageType {
  id: string;
  nom: string;
  famille: string;
  source: string;
}

export const ASSEMBLAGES: AssemblageType[] = [
  { id: 'languette_rapportee', nom: 'Languette rapportée', famille: 'caisson', source: 'dunod_2022:p118_figure_54_1' },
  { id: 'tourillons', nom: 'Tourillons', famille: 'caisson', source: 'dunod_2022:p118_figure_54_1' },
  { id: 'lamelles', nom: 'Lamelles', famille: 'caisson', source: 'dunod_2022:p118_figure_54_1' },
  { id: 'onglet_verrouille', nom: 'À onglet verrouillé', famille: 'caisson', source: 'dunod_2022:p118_figure_54_1' },
];

// Finitions
export interface FinishType {
  id: string;
  nom: string;
  notes: string;
  source: string;
}

export const FINISHES: FinishType[] = [
  { id: 'cire', nom: 'Cire', notes: 'Application manuelle au pinceau, chiffon ou mèche de coton ; brillant obtenu par lustrage après séchage.', source: 'dunod_2022:p78_fiche_39' },
  { id: 'huile', nom: 'Huile', notes: 'Application manuelle facile ; l\'huile de lin peut être fluidifiée au bain-marie à 60 °C pour meilleure pénétration.', source: 'dunod_2022:p78_fiche_39' },
  { id: 'vernis', nom: 'Vernis', notes: 'Application au pinceau, rouleau ou tampon ; dernier passage dans le sens du veinage.', source: 'dunod_2022:p78_fiche_39' },
  { id: 'gomme_laque', nom: 'Vernis gomme-laque', notes: 'Application au tampon avec mèche dans un tissu de coton.', source: 'dunod_2022:p78_fiche_39' },
];

// Règles métier condensées pour validation
export interface TradeRule {
  id: string;
  domaine: string;
  condition: string;
  action: string;
  description: string;
  source: string;
}

export const TRADE_RULES: TradeRule[] = [
  { id: 'R_HUM_001', domaine: 'humidite', condition: "contexte == 'menuiserie_interieure'", action: 'humidite_bois_cible in [10,12]', description: 'En menuiserie intérieure, viser 10 à 12 % d\'humidité.', source: 'dunod_2022:p14_fiche_7' },
  { id: 'R_PAN_001', domaine: 'panneaux', condition: "type_panneau == 'OSB'", action: "sens_resistance_principal = 'longueur'", description: 'Les couches externes de l\'OSB sont orientées parallèlement à la longueur, résistance supérieure dans ce sens.', source: 'dunod_2022:p33_fiche_14' },
  { id: 'R_PAN_002', domaine: 'debit', condition: "type_panneau in ['MDF','panneau de particules']", action: 'pas_de_sens_debit_structurel', description: 'Pour le MDF et le panneau de particules, pas de sens de débit à respecter.', source: 'dunod_2022:p43_fiche_19' },
  { id: 'R_STRAT_001', domaine: 'stratifie', condition: "revetement == 'stratifie'", action: 'coller_sur_support = true', description: 'Le stratifié est cassant et doit être obligatoirement collé sur un support.', source: 'dunod_2022:p38_fiche_17' },
  { id: 'R_STRAT_002', domaine: 'stratifie', condition: "revetement == 'stratifie'", action: 'contrebalancement_recommande', description: 'Coller du stratifié sur les deux faces pour une bonne planéité.', source: 'dunod_2022:p40_fiche_17' },
  { id: 'R_SYS32_001', domaine: 'caisson', condition: "systeme == '32'", action: 'entraxe_percages = 32', description: 'Le système 32 : entraxe de 32 mm.', source: 'dunod_2022:p119_fiche_55' },
  { id: 'R_SYS32_002', domaine: 'caisson', condition: "systeme == '32'", action: 'axe_percage_au_chant = 37', description: 'Axe des perçages à 37 mm du chant vertical.', source: 'dunod_2022:p119_fiche_55' },
];

// Formules de retrait/gonflement
export interface ShrinkageFormula {
  id: string;
  nom: string;
  expression: string;
  description: string;
  source: string;
}

export const SHRINKAGE_FORMULAS: ShrinkageFormula[] = [
  { id: 'F_RET_RADIAL', nom: 'Retrait radial', expression: '(r × L × deltaH) / 100', description: 'r = coeff retrait radial, L = dimension mm, deltaH = variation humidité %', source: 'dunod_2022:p17_fiche_8' },
  { id: 'F_RET_TANGENTIEL', nom: 'Retrait tangentiel', expression: '(t × L × deltaH) / 100', description: 't = coeff retrait tangentiel, L = dimension mm, deltaH = variation humidité %', source: 'dunod_2022:p17_fiche_8' },
];

// Emissions formaldéhyde
export interface FormaldehydeClass {
  classe: string;
  details: string;
  source: string;
}

export const FORMALDEHYDE_CLASSES: FormaldehydeClass[] = [
  { classe: 'E1', details: 'Classe minimale obligatoire en France depuis 2006 (≤ 8 mg/100g, ≤ 0.1 ppm).', source: 'dunod_2022:p41_42_fiche_18' },
  { classe: 'E0.5', details: '≤ 4 mg pour particules/OSB, ≤ 5 mg pour MDF.', source: 'dunod_2022:p41_42_fiche_18' },
];

// ---------------------------------------------------------------------------
// Fonction pour générer un résumé condensé pour l'IA
// ---------------------------------------------------------------------------
export function buildKnowledgeSummary(): string {
  const lines: string[] = [
    '=== BASE DE CONNAISSANCES MENUISERIE (Dunod 2022, vérifié) ===',
    '',
    '--- PROPRIÉTÉS MÉCANIQUES (MPa) ---',
    ...MECHANICAL_PROPERTIES.map(p =>
      `${p.name}: compression ${p.compression_axiale}, traction ${p.traction_axiale}, flexion ${p.flexion_statique}, E=${p.module_elasticite} MPa`
    ),
    '',
    '--- ORIENTATION DÉBIT PANNEAUX ---',
    ...ORIENTATION_RULES.map(r => `• ${r.materiau}: ${r.regle} (${r.impact})`),
    '',
    '--- SYSTÈME 32 (caissons) ---',
    ...SYSTEME_32_RULES.map(r => `• ${r.regle}: ${r.valeur}`),
    '',
    '--- ASSEMBLAGES CAISSONS ---',
    ASSEMBLAGES.map(a => a.nom).join(', '),
    '',
    '--- FINITIONS ---',
    ...FINISHES.map(f => `• ${f.nom}: ${f.notes}`),
    '',
    '--- FORMULES RETRAIT/GONFLEMENT ---',
    ...SHRINKAGE_FORMULAS.map(f => `${f.nom}: ${f.expression} — ${f.description}`),
    '',
    '--- RÈGLES MÉTIER ---',
    ...TRADE_RULES.map(r => `• ${r.description}`),
    '',
    '--- FORMALDÉHYDE ---',
    ...FORMALDEHYDE_CLASSES.map(f => `${f.classe}: ${f.details}`),
    '',
    'Calcul flèche étagère: f = (5·q·L⁴)/(384·E·I), I = b·h³/12',
    'Si f > L/200, risque de flexion visible.',
  ];
  return lines.join('\n');
}
