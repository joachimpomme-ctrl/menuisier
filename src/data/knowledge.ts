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

// Portes et charnières
export interface HingeRule {
  id: string;
  type: string;
  ouverture: string;
  details: string;
  source: string;
}

export const HINGE_RULES: HingeRule[] = [
  { id: 'charniere_encastree', type: 'Charnière à encastrer (35mm)', ouverture: '95-110°', details: 'Standard industriel. Cuvette Ø35 mm fraisée dans la porte, platine vissée sur la joue. Réglable en 3 axes (hauteur, profondeur, latéral). Distance axe cuvette / chant de porte : 21-22 mm. Entraxe recommandé entre charnières : 32 mm (système 32).', source: 'norme_industrielle' },
  { id: 'charniere_170', type: 'Charnière grand angle (170°)', ouverture: '170°', details: 'Pour portes devant ouvrir à plat contre la joue adjacente. Même cuvette Ø35 mm. Nécessite un déport plus important. Utilisé pour meubles d\'angle.', source: 'norme_industrielle' },
  { id: 'charniere_piano', type: 'Charnière piano', ouverture: '180°', details: 'Charnière continue sur toute la hauteur de la porte. Fixation par vis tous les 5-8 cm. Aspect visible (décoratif ou industriel). Pas de réglage possible après pose.', source: 'norme_industrielle' },
  { id: 'charniere_pot', type: 'Charnière invisible (pot)', ouverture: '90-110°', details: 'Entièrement invisible porte fermée. Plus complexe à poser : mortaisage dans le chant de la porte ET dans la joue. Nécessite une défonceuse avec gabarit.', source: 'norme_industrielle' },
];

export interface DoorRule {
  id: string;
  type_pose: string;
  description: string;
  jeu: string;
  details: string;
  source: string;
}

export const DOOR_RULES: DoorRule[] = [
  { id: 'porte_enveloppante', type_pose: 'Enveloppante (recouvrement total)', description: 'La porte recouvre entièrement le chant de la joue', jeu: '2 mm entre portes adjacentes', details: 'Largeur porte = largeur intérieure + 2× épaisseur joue - 2 mm de jeu. Hauteur porte = hauteur ouverture + 2× épaisseur tablettes - 2 mm. Charnière avec coudure 0 mm.', source: 'norme_industrielle' },
  { id: 'porte_demi_recouvrement', type_pose: 'Demi-recouvrement', description: 'La porte recouvre la moitié du chant de la joue (pour 2 portes sur même joue)', jeu: '2 mm entre portes', details: 'Largeur porte = largeur intérieure / 2 + épaisseur joue / 2 - 1 mm. Charnière avec coudure de demi-épaisseur de la joue.', source: 'norme_industrielle' },
  { id: 'porte_appliquee', type_pose: 'Appliquée (en applique)', description: 'La porte est posée devant le meuble sans encastrement', jeu: '3-5 mm en périphérie', details: 'Porte plus grande que l\'ouverture de 10-15 mm de chaque côté. Charnières apparentes ou invisibles. Solution simple mais moins de finition.', source: 'norme_industrielle' },
  { id: 'porte_affleurante', type_pose: 'Affleurante (intérieure)', description: 'La porte affleure le chant de la joue, s\'insère dans le cadre', jeu: '2 mm tout autour', details: 'Largeur porte = largeur intérieure - 4 mm. Hauteur porte = hauteur ouverture - 4 mm. Charnière avec coudure complète (= épaisseur joue). Pose la plus précise, visible au moindre défaut d\'équerrage.', source: 'norme_industrielle' },
];

export interface DoorSizingRule {
  id: string;
  regle: string;
  formule: string;
  source: string;
}

export const DOOR_SIZING_RULES: DoorSizingRule[] = [
  { id: 'nb_charnieres', regle: 'Nombre de charnières par porte', formule: 'Porte < 60 cm : 2 charnières. 60-120 cm : 3 charnières. 120-180 cm : 4 charnières. > 180 cm : 5 charnières.', source: 'norme_industrielle' },
  { id: 'poids_max', regle: 'Poids max par charnière Ø35', formule: 'Charnière standard : 5-8 kg. Charnière renforcée : 10-15 kg. Au-delà, prévoir des charnières lourdes spéciales.', source: 'norme_industrielle' },
  { id: 'position_charnieres', regle: 'Position des charnières', formule: 'Charnière haute : 70-100 mm du bord supérieur. Charnière basse : 70-100 mm du bord inférieur. Charnières intermédiaires : réparties régulièrement.', source: 'norme_industrielle' },
  { id: 'amortisseur', regle: 'Amortisseur de fermeture', formule: 'Intégré ou rapporté. Freinage en fin de course. Standard sur charnières modernes (clip-on). Peut être ajouté sur anciennes charnières.', source: 'norme_industrielle' },
  { id: 'percage_cuvette', regle: 'Perçage cuvette Ø35', formule: 'Profondeur : 12-13 mm. Distance centre cuvette / chant porte : 21-22 mm (standard Blum/Hettich/Grass). Fraise à façonner Ø35 mm (mèche Forstner).', source: 'norme_industrielle' },
  { id: 'porte_max_largeur', regle: 'Largeur max porte battante', formule: 'Panneau 18 mm : 60 cm max (au-delà, risque de voile). Panneau 19 mm : 65 cm. Si > 60 cm, renfort avec traverse intermédiaire ou cadre collé au dos.', source: 'norme_industrielle' },
];

// Tiroirs
export interface DrawerRule {
  id: string;
  regle: string;
  details: string;
  source: string;
}

export const DRAWER_RULES: DrawerRule[] = [
  { id: 'coulisses_a_galets', regle: 'Coulisses à galets (économiques)', details: 'Ouverture partielle (~75%). Charge max 15-25 kg. Fixation latérale. Jeu latéral : 12.5 mm de chaque côté. Largeur tiroir = ouverture intérieure - 25 mm.', source: 'norme_industrielle' },
  { id: 'coulisses_billes', regle: 'Coulisses à billes (sortie totale)', details: 'Ouverture totale (100%). Charge max 30-50 kg. Fixation latérale. Jeu latéral : 12.5 mm de chaque côté. Fermeture douce (soft-close) disponible.', source: 'norme_industrielle' },
  { id: 'coulisses_invisible', regle: 'Coulisses invisibles (sous tiroir)', details: 'Fixées sous le fond du tiroir. Pas visibles depuis le côté. Ouverture totale. Charge max 30-40 kg. Jeu latéral : 3 mm de chaque côté seulement. Nécessite un fond de tiroir rigide (≥ 16 mm).', source: 'norme_industrielle' },
  { id: 'facade_tiroir', regle: 'Façade de tiroir', details: 'Hauteur façade = hauteur d\'ouverture - 3 mm (jeu haut/bas). Largeur façade = identique aux portes (recouvrement, demi-recouvrement ou affleurante). Fixation par vis depuis l\'intérieur du tiroir caisson.', source: 'norme_industrielle' },
  { id: 'dim_caisson_tiroir', regle: 'Caisson de tiroir', details: 'Hauteur caisson = hauteur façade - 25 mm (pour jeu coulisse). Profondeur caisson = profondeur intérieure du meuble - 10 mm (recul arrière). Fond en HDF 3 mm rainuré à 8 mm du bas.', source: 'norme_industrielle' },
];

// ---------------------------------------------------------------------------
// Guides d'assemblage détaillés — instructions pas-à-pas
// ---------------------------------------------------------------------------
export interface AssemblyGuide {
  id: string;
  titre: string;
  materiau: string; // 'tous' | 'contreplaqué' | 'mdf' | 'melamine' | 'osb'
  outils: string[];
  etapes: string[];
  erreurs_courantes: string[];
  source: string;
}

export const ASSEMBLY_GUIDES: AssemblyGuide[] = [
  {
    id: 'tourillons',
    titre: 'Assemblage caisson par tourillons',
    materiau: 'tous',
    outils: ['perceuse à colonne ou guide de perçage', 'mèche Ø8 mm', 'tourillons Ø8×40 mm', 'colle vinylique', 'serre-joints dormants', 'pointe à tracer'],
    etapes: [
      'Tracer les centres de perçage sur les deux pièces à assembler (entraxe 10-15 cm, à min 5 cm des bords).',
      'Percer les trous Ø8 mm, profondeur 20 mm, perpendiculairement à la surface. Utiliser un guide de perçage ou une perceuse à colonne pour garantir l\'aplomb.',
      'Réaliser un perçage test sur une chute pour vérifier la profondeur et le diamètre.',
      'Insérer les centreurs à tourillons dans les trous de la première pièce, positionner la seconde pièce et presser pour marquer les centres.',
      'Percer la seconde pièce aux marques obtenues (Ø8 mm, profondeur 20 mm).',
      'Appliquer la colle vinylique dans les trous et sur les tourillons. Ne pas noyer de colle — un film régulier suffit.',
      'Insérer les tourillons, assembler les deux pièces et serrer avec des serre-joints dormants.',
      'Vérifier l\'équerrage (diagonales égales) avant serrage définitif.',
      'Temps de séchage minimum : 30 minutes sous presse, 24 h avant sollicitation.',
    ],
    erreurs_courantes: [
      'Perçage non perpendiculaire → désalignement des pièces.',
      'Profondeur de perçage insuffisante ou excessive → tourillon qui dépasse ou qui ne tient pas.',
      'Trop de colle → le tourillon ne rentre pas (pression hydraulique dans le trou).',
      'Pas de vérification d\'équerrage avant séchage.',
    ],
    source: 'dunod_2022:p118_fiche_54 + pratique atelier',
  },
  {
    id: 'vis',
    titre: 'Assemblage caisson par vis',
    materiau: 'tous',
    outils: ['perceuse-visseuse', 'mèche Ø3 mm (CP) ou Ø2 mm (MDF)', 'fraise à chanfreiner', 'vis 4×40 ou 4×50', 'équerre de traçage', 'serre-joints'],
    etapes: [
      'Tracer la ligne de vissage sur la pièce extérieure, à mi-épaisseur de la pièce réceptrice.',
      'Marquer les positions de vis : première vis à 5 cm du bord, puis espacement régulier de 15-20 cm.',
      'Pré-percer la pièce extérieure (trou de passage) au diamètre du corps de vis (Ø4 mm).',
      'Fraiser l\'entrée du trou pour noyer la tête de vis.',
      'Positionner les deux pièces ensemble avec des serre-joints, vérifier l\'équerrage.',
      'Pré-percer la pièce réceptrice à travers les trous de passage : Ø3 mm pour contreplaqué, Ø2 mm pour MDF (le MDF se fend facilement).',
      'Visser les vis 4×40 (panneau 18 mm) ou 4×50 (panneau 19-22 mm). Ne pas serrer excessivement dans le MDF.',
      'Vérifier l\'équerrage final (diagonales).',
    ],
    erreurs_courantes: [
      'Pas de pré-perçage → fissuration du panneau, surtout en MDF et mélaminé.',
      'Vis trop proche du bord → éclatement du chant.',
      'Vis trop longue → pointe qui traverse la pièce réceptrice.',
      'Serrage excessif dans le MDF → la vis tourne dans le vide (filetage arraché).',
    ],
    source: 'dunod_2022:p118_fiche_54 + pratique atelier',
  },
  {
    id: 'lamelles',
    titre: 'Assemblage par lamelles (Lamello/biscuits)',
    materiau: 'tous',
    outils: ['lamelleuse (fraiseuse à lamelles)', 'lamelles n°0, n°10 ou n°20', 'colle vinylique', 'serre-joints', 'équerre', 'crayon'],
    etapes: [
      'Tracer les axes des lamelles sur les deux pièces (entraxe 10-15 cm, min 5 cm des bords).',
      'Choisir la taille de lamelle : n°0 (47×15 mm) pour panneaux fins, n°10 (53×19 mm) standard, n°20 (56×23 mm) pour panneaux épais.',
      'Régler la profondeur de coupe de la lamelleuse selon la taille de lamelle choisie.',
      'Régler la hauteur de coupe pour centrer la rainure dans l\'épaisseur du panneau.',
      'Fraiser les rainures sur les deux pièces en maintenant fermement la lamelleuse contre la pièce.',
      'Appliquer la colle vinylique dans les rainures et sur les lamelles.',
      'Insérer les lamelles, assembler immédiatement (les lamelles gonflent au contact de la colle).',
      'Serrer avec des serre-joints, vérifier l\'équerrage.',
      'Séchage : 30 min sous presse, 24 h avant sollicitation.',
    ],
    erreurs_courantes: [
      'Rainure décentrée dans l\'épaisseur → décalage des faces.',
      'Attente trop longue après encollage → la lamelle gonfle et ne rentre plus.',
      'Lamelleuse mal plaquée → rainure de travers.',
      'Oubli de vérifier l\'équerrage avant serrage.',
    ],
    source: 'dunod_2022:p118_fiche_54 + pratique atelier',
  },
  {
    id: 'rainure_languette',
    titre: 'Assemblage par rainure et languette',
    materiau: 'contreplaqué',
    outils: ['défonceuse avec fraise droite Ø6 mm', 'guide parallèle ou rail de guidage', 'languettes en contreplaqué 6 mm', 'colle vinylique', 'serre-joints'],
    etapes: [
      'Tracer la position de la rainure sur la pièce réceptrice : centrée dans l\'épaisseur ou décalée selon le design.',
      'Installer la fraise droite Ø6 mm dans la défonceuse. Régler la profondeur de passe à 8 mm.',
      'Fixer le guide parallèle pour que la rainure soit à la distance voulue du chant.',
      'Réaliser la rainure en une ou deux passes (ne pas forcer). Avancer régulièrement.',
      'Découper la languette en contreplaqué de 6 mm d\'épaisseur, largeur = 2× profondeur de rainure - 1 mm (soit 15 mm pour 2 rainures de 8 mm).',
      'Réaliser la rainure correspondante sur la seconde pièce, aux mêmes réglages.',
      'Test à blanc : vérifier que la languette entre sans forcer mais sans jeu excessif.',
      'Encoller les rainures et la languette, assembler, serrer.',
      'Vérifier l\'équerrage. Séchage 24 h.',
    ],
    erreurs_courantes: [
      'Rainure trop large → jeu et assemblage flottant.',
      'Rainure trop étroite → languette qui ne rentre pas, ou contrainte excessive.',
      'Profondeur de rainure irrégulière (défonceuse qui a bougé).',
      'Languette pas parfaitement calibrée en épaisseur.',
    ],
    source: 'dunod_2022:p118_fiche_54 + pratique atelier',
  },
  {
    id: 'confirmats',
    titre: 'Assemblage par confirmats (vis d\'assemblage)',
    materiau: 'melamine',
    outils: ['perceuse-visseuse', 'mèche étagée pour confirmat (Ø7 passage + Ø5 pilote)', 'confirmats 7×50 mm', 'clé Allen ou embout hexagonal', 'équerre', 'serre-joints'],
    etapes: [
      'Tracer la ligne de perçage sur la pièce de passage (à mi-épaisseur de la pièce réceptrice).',
      'Marquer les positions : première vis à 5 cm du bord, espacement 15-20 cm.',
      'Percer avec la mèche étagée spéciale confirmat : elle réalise en une opération le trou de passage Ø7 mm et le trou pilote Ø5 mm.',
      'Maintenir les pièces en position avec des serre-joints, vérifier l\'équerrage.',
      'Visser les confirmats à la clé Allen (6 pans creux) jusqu\'à affleurement de la tête.',
      'Poser les caches en plastique sur les têtes de confirmat (blanc, noir, ou couleur du mélaminé).',
    ],
    erreurs_courantes: [
      'Perçage sans mèche étagée → le confirmat fend le panneau.',
      'Vis trop serrée → le mélaminé éclate autour de la tête.',
      'Perçage trop près du bord → arrachement.',
      'Oubli de pré-percer la pièce réceptrice dans le chant → éclatement du panneau.',
    ],
    source: 'dunod_2022:p118_fiche_54 + pratique atelier mélaminé',
  },
  {
    id: 'collage_chant',
    titre: 'Collage chant à chant (jointing)',
    materiau: 'tous',
    outils: ['dégauchisseuse ou rabot à main n°7', 'colle PVA ou polyuréthane', 'serre-joints dormants (min 3)', 'cales de répartition', 'règle de précision'],
    etapes: [
      'Dresser les chants à assembler à la dégauchisseuse ou au rabot long. Les chants doivent être parfaitement plans et d\'équerre.',
      'Vérifier la planéité avec une règle de précision : aucun jour ne doit être visible.',
      'Disposer les panneaux et vérifier l\'ajustement à blanc. Alterner les cœurs (sens des cernes) pour limiter le tuilage.',
      'Préparer les serre-joints dormants : minimum 3 pour un panneau d\'1 m, alternés dessus/dessous.',
      'Appliquer la colle sur les deux chants : film régulier sur toute la longueur. Colle PVA pour intérieur, polyuréthane pour résistance humidité.',
      'Assembler et serrer progressivement. Pression visée : 3-5 kg/cm². Le cordon de colle doit perler régulièrement sur toute la longueur.',
      'Vérifier la planéité de surface immédiatement (pas de décalage entre les panneaux).',
      'Temps ouvert de la colle : PVA 8-10 min, polyuréthane 15-20 min. Ne pas dépasser.',
      'Séchage sous pression : minimum 1 h pour PVA, 4 h pour polyuréthane. 24 h avant usinage.',
    ],
    erreurs_courantes: [
      'Chants pas parfaitement dressés → joint visible, collage faible.',
      'Temps ouvert dépassé → la colle a commencé à prendre, le joint sera fragile.',
      'Pression insuffisante → joint affamé (starved joint), pas assez de pénétration.',
      'Pression excessive → tout la colle est chassée, joint sec.',
      'Oubli d\'alterner les serre-joints → panneau qui cintre.',
    ],
    source: 'dunod_2022:p78 + pratique atelier',
  },
  {
    id: 'joue_commune',
    titre: 'Assemblage joue commune',
    materiau: 'tous',
    outils: ['perceuse-visseuse', 'niveau à bulle', 'serre-joints', 'vis ou confirmats selon matériau', 'défonceuse (si rainures nécessaires)'],
    etapes: [
      'Déterminer la profondeur de la joue commune : prendre le maximum des profondeurs des deux caissons adjacents.',
      'Si des fonds rainurés sont prévus, réaliser les rainures sur les DEUX faces de la joue commune (une par caisson).',
      'Si des étagères réglables sont prévues, percer les rangées de trous système 32 sur les deux faces (attention aux profondeurs pour ne pas traverser).',
      'Assembler le premier caisson (caisson A) en entier, avec la joue commune comme joue droite (ou gauche selon le cas). Fixer au mur et vérifier l\'aplomb.',
      'Présenter le second caisson (caisson B) contre la joue commune. La joue commune devient sa joue gauche (ou droite).',
      'Fixer les tablettes haute et basse du caisson B à la joue commune par le mode d\'assemblage choisi (vis, tourillons, confirmats).',
      'Vérifier l\'aplomb et le niveau du caisson B indépendamment.',
      'Solidariser les deux caissons entre eux par des vis de liaison (arrière, non visible) si nécessaire.',
    ],
    erreurs_courantes: [
      'Joue commune pas assez profonde → un des caissons dépasse à l\'arrière.',
      'Perçages/rainures trop profonds → traversée de la joue (trous visibles de l\'autre côté).',
      'Joue commune pas d\'aplomb → les deux caissons sont faussés.',
      'Oubli de prévoir les rainures sur les deux faces avant assemblage du premier caisson.',
      'Montage du second caisson sans vérifier l\'équerrage du premier.',
    ],
    source: 'pratique atelier + techniques d\'agencement professionnel',
  },
];

// ---------------------------------------------------------------------------
// Guide d'installation des charnières Ø35
// ---------------------------------------------------------------------------
export interface HingeInstallStep {
  id: string;
  etape: number;
  titre: string;
  details: string;
  conseil: string;
  source: string;
}

export const HINGE_INSTALL_GUIDE: HingeInstallStep[] = [
  {
    id: 'hinge_step_1',
    etape: 1,
    titre: 'Traçage des positions de charnières',
    details: 'Mesurer 80 mm depuis le bord supérieur et 80 mm depuis le bord inférieur de la porte. Tracer un axe horizontal à ces positions. Pour les charnières intermédiaires, répartir régulièrement entre les deux extrêmes. Tracer l\'axe vertical à 21-22 mm du chant côté charnières (distance standard centre cuvette / chant).',
    conseil: 'Utiliser un gabarit de perçage (type Blum, Hettich) pour gagner en précision et en répétabilité. Le gabarit se cale directement sur le chant de la porte.',
    source: 'norme_industrielle + fabricants (Blum, Hettich, Grass)',
  },
  {
    id: 'hinge_step_2',
    etape: 2,
    titre: 'Perçage des cuvettes Ø35 mm',
    details: 'Utiliser une mèche Forstner Ø35 mm. Régler la profondeur de perçage à 12-13 mm (ne JAMAIS traverser la porte). Le centre du trou est à 21-22 mm du chant de la porte. Percer à vitesse modérée (800-1200 tr/min) pour un perçage net sans éclats. Sur mélaminé, coller un adhésif avant perçage pour éviter les éclats.',
    conseil: 'Toujours faire un essai sur une chute du même matériau. Vérifier la profondeur avec un pied à coulisse. Si la porte est en CP, la mèche Forstner donne un résultat net. En MDF, aller doucement pour éviter la surchauffe.',
    source: 'norme_industrielle + fabricants',
  },
  {
    id: 'hinge_step_3',
    etape: 3,
    titre: 'Fixation du boîtier dans la cuvette',
    details: 'Insérer le boîtier de charnière dans la cuvette. Aligner le bras de la charnière perpendiculairement au chant de la porte. Pré-percer les trous de fixation avec une mèche Ø2.5 mm, profondeur 10 mm. Visser les vis de fixation (Ø3.5×16 mm) sans serrer excessivement.',
    conseil: 'Certains boîtiers se clipsent (système clip-on) et se fixent ensuite par vis. Ne pas forcer le boîtier dans la cuvette — s\'il ne rentre pas, vérifier le diamètre du perçage.',
    source: 'norme_industrielle + fabricants',
  },
  {
    id: 'hinge_step_4',
    etape: 4,
    titre: 'Montage de la platine sur la joue',
    details: 'La platine se fixe sur la face intérieure de la joue du caisson. L\'axe de fixation est à 37 mm du chant avant de la joue (système 32). Utiliser les trous du système 32 si disponibles. Sinon, tracer et pré-percer à Ø2.5 mm. Visser la platine avec les vis fournies (Ø3.5×16 mm). La platine doit être parfaitement parallèle au chant.',
    conseil: 'En système 32, les trous sont déjà percés à 37 mm du chant, entraxe 32 mm — la platine se fixe directement. Utiliser un gabarit pour les platines si le caisson n\'est pas pré-percé.',
    source: 'dunod_2022:p119_fiche_55 + fabricants',
  },
  {
    id: 'hinge_step_5',
    etape: 5,
    titre: 'Clipsage de la charnière sur la platine',
    details: 'Présenter la porte devant le caisson. Engager le bras de la charnière dans la platine. Clipser (un clic se fait entendre sur les systèmes clip-on). Vérifier que la charnière est bien enclenchée en tirant légèrement la porte.',
    conseil: 'Se faire aider pour maintenir la porte en position pendant le clipsage, surtout pour les portes lourdes. En cas de meuble au sol, coucher le meuble sur le dos facilite grandement l\'opération.',
    source: 'fabricants (Blum, Hettich)',
  },
  {
    id: 'hinge_step_6',
    etape: 6,
    titre: 'Réglage sur 3 axes',
    details: 'Réglage latéral (vis avant de la charnière) : ajuste le jeu entre la porte et la joue, visé 2 mm. Réglage en profondeur (vis arrière ou excentrique sur la platine) : avance ou recule la porte par rapport au chant de la joue. Réglage en hauteur (vis oblongue de la platine) : monte ou descend la porte. Procéder dans l\'ordre : hauteur → profondeur → latéral.',
    conseil: 'Régler par petites touches (quart de tour). Vérifier le jeu avec une cale de 2 mm. Les deux portes d\'un même meuble doivent avoir un jeu identique et régulier sur toute la hauteur.',
    source: 'fabricants (Blum, Hettich, Grass)',
  },
  {
    id: 'hinge_step_7',
    etape: 7,
    titre: 'Vérification finale',
    details: 'Vérifier le jeu de 2 mm entre portes adjacentes (uniforme sur toute la hauteur). Vérifier l\'aplomb de la porte (niveau à bulle). Vérifier que la porte ne touche pas le caisson à l\'ouverture et à la fermeture. Tester l\'amortisseur de fermeture (soft-close) : la porte doit se fermer doucement sur les derniers centimètres.',
    conseil: 'Si le jeu n\'est pas uniforme, c\'est souvent un problème d\'équerrage du caisson plutôt qu\'un problème de réglage de charnière. Vérifier d\'abord que le caisson est d\'aplomb et d\'équerre.',
    source: 'pratique atelier',
  },
];

// ---------------------------------------------------------------------------
// Guide d'installation des coulisses de tiroir
// ---------------------------------------------------------------------------
export interface DrawerInstallStep {
  id: string;
  etape: number;
  titre: string;
  details: string;
  conseil: string;
  source: string;
}

export const DRAWER_INSTALL_GUIDE: DrawerInstallStep[] = [
  {
    id: 'drawer_step_1',
    etape: 1,
    titre: 'Choix du type de coulisses',
    details: 'Coulisses à galets : économiques, ouverture partielle (~75%), charge 15-25 kg, jeu latéral 12.5 mm/côté. Coulisses à billes : ouverture totale, charge 30-50 kg, jeu latéral 12.5 mm/côté, soft-close disponible. Coulisses invisibles (sous le tiroir) : ouverture totale, charge 30-40 kg, jeu latéral 3 mm/côté seulement, nécessite fond rigide ≥16 mm.',
    conseil: 'Pour un meuble de cuisine, privilégier les coulisses à billes ou invisibles (charge et confort supérieurs). Les coulisses à galets conviennent pour un meuble de rangement léger ou un budget serré.',
    source: 'norme_industrielle + fabricants',
  },
  {
    id: 'drawer_step_2',
    etape: 2,
    titre: 'Calcul du jeu latéral et dimensionnement du tiroir',
    details: 'Coulisses à galets et billes : largeur tiroir = ouverture intérieure - 25 mm (12.5 mm de jeu de chaque côté). Coulisses invisibles : largeur tiroir = ouverture intérieure - 6 mm (3 mm de chaque côté). Profondeur tiroir = profondeur intérieure meuble - 10 mm (recul arrière). Hauteur caisson tiroir = hauteur façade - 25 mm.',
    conseil: 'Toujours vérifier la fiche technique de la coulisse choisie pour le jeu exact. Certaines marques demandent 12.7 mm, d\'autres 12.5 mm. 0.2 mm de différence peut causer un tiroir qui frotte ou qui a trop de jeu.',
    source: 'fabricants (Blum, Hettich, Grass, King Slide)',
  },
  {
    id: 'drawer_step_3',
    etape: 3,
    titre: 'Traçage des lignes de fixation',
    details: 'Mesurer depuis le bas du caisson la hauteur de l\'axe de la coulisse (indiquée dans la notice du fabricant, généralement mi-hauteur du tiroir). Tracer une ligne horizontale sur la face intérieure de chaque joue. Utiliser un niveau pour garantir l\'horizontalité. Les deux lignes (joue gauche et joue droite) doivent être à la même hauteur.',
    conseil: 'Si le meuble a plusieurs tiroirs, tracer toutes les lignes d\'un coup en reportant les mesures depuis la même référence (le bas du caisson). Ne jamais mesurer depuis le tiroir du dessous (erreurs cumulatives).',
    source: 'pratique atelier',
  },
  {
    id: 'drawer_step_4',
    etape: 4,
    titre: 'Montage des rails fixes sur les joues',
    details: 'Séparer le rail fixe du rail mobile (tirer le tiroir intérieur à fond, puis actionner le loquet de déverrouillage). Positionner le rail fixe sur la ligne tracée, chant avant du rail aligné avec le chant avant de la joue. Pré-percer les trous de fixation (Ø2.5 mm). Visser le rail avec les vis fournies (généralement Ø3.5×16). Vérifier l\'horizontalité avec un niveau.',
    conseil: 'Fixer d\'abord avec une seule vis dans le trou oblong (réglable), tester le coulissement, puis fixer définitivement avec toutes les vis dans les trous ronds.',
    source: 'fabricants + pratique atelier',
  },
  {
    id: 'drawer_step_5',
    etape: 5,
    titre: 'Montage des rails mobiles sur le caisson tiroir',
    details: 'Pour coulisses latérales : fixer le rail mobile sur la face extérieure de chaque côté du caisson tiroir. Le rail doit être aligné avec le bas du caisson tiroir. Pour coulisses invisibles : fixer les rails sous le fond du tiroir selon le gabarit du fabricant. Le fond doit être en panneau rigide (≥16 mm, pas du HDF 3 mm). Pré-percer et visser.',
    conseil: 'Le rail mobile doit être parfaitement parallèle au bord du caisson tiroir. Un décalage de 1 mm crée un tiroir qui frotte ou se coince.',
    source: 'fabricants + pratique atelier',
  },
  {
    id: 'drawer_step_6',
    etape: 6,
    titre: 'Réglage frontal et latéral',
    details: 'Insérer le tiroir dans les rails fixes (aligner et pousser, un clic confirme l\'enclenchement). Tester le coulissement : le tiroir doit glisser sans effort et sans jeu latéral excessif. Réglage latéral : vis de réglage sur le rail (si disponible). Réglage frontal (avance/recul) : vis sur la face avant du rail fixe. Réglage hauteur : vis excentrique sur la platine avant.',
    conseil: 'Tester le tiroir avec une charge (poser quelques kilos dedans) pour vérifier le comportement en charge. Un tiroir peut coulisser parfaitement à vide et frotter en charge.',
    source: 'fabricants + pratique atelier',
  },
  {
    id: 'drawer_step_7',
    etape: 7,
    titre: 'Montage de la façade',
    details: 'La façade se fixe depuis l\'intérieur du caisson tiroir, par 4 vis (une dans chaque coin, en retrait de 3 cm). Positionner la façade avec le jeu voulu (2 mm entre façade et caisson, 2 mm entre façades adjacentes). Utiliser du ruban adhésif double face pour maintenir la façade en position pendant le vissage. Percer depuis l\'intérieur du tiroir, à travers la face avant du caisson, dans la façade. Visser avec des vis Ø4×25 (ne pas traverser la façade).',
    conseil: 'Astuce pour un positionnement parfait : fermer le tiroir avec la façade tenue par l\'adhésif, vérifier les jeux, puis ouvrir et visser. Utiliser des cales de 2 mm (rondelles, carton) pour maintenir le jeu pendant le positionnement.',
    source: 'pratique atelier + techniques d\'agencement',
  },
];

// ---------------------------------------------------------------------------
// Guide joue commune — panneau partagé entre deux caissons
// ---------------------------------------------------------------------------
export interface JoueCommuneGuide {
  principe: string;
  avantages: string[];
  inconvenients: string[];
  regles: string[];
  etapes_montage: string[];
  source: string;
}

export const JOUE_COMMUNE_GUIDE: JoueCommuneGuide = {
  principe: 'Un même panneau (joue) sert simultanément de paroi droite du caisson A et de paroi gauche du caisson B. Les deux caissons partagent ce panneau, ce qui supprime un panneau et rapproche les corps de meuble.',
  avantages: [
    'Économie d\'un panneau par jonction (gain matière et coût).',
    'Les caissons sont plus proches → moins de décalage visuel entre les façades.',
    'Gain d\'espace intérieur total (une épaisseur de panneau en moins).',
    'Rigidité accrue de l\'ensemble (les deux caissons sont solidaires).',
  ],
  inconvenients: [
    'Montage plus complexe : le second caisson dépend du premier.',
    'Démontage ou remplacement d\'un seul caisson impossible sans démonter l\'ensemble.',
    'Les rainures, perçages système 32 et fixations doivent être réalisés sur les DEUX faces de la joue avant assemblage.',
    'Si les deux caissons ont des profondeurs différentes, la joue commune est plus profonde que nécessaire pour l\'un des deux.',
    'Toute erreur d\'aplomb sur la joue commune se répercute sur les deux caissons.',
  ],
  regles: [
    'Profondeur de la joue commune = maximum des profondeurs des deux caissons adjacents.',
    'La joue commune doit être parfaitement verticale (aplomb) — toute déviation affecte les deux caissons.',
    'Les rainures de fond (pour le panneau arrière) doivent être usinées sur les DEUX faces de la joue.',
    'Les perçages système 32 doivent être réalisés sur les DEUX faces, en veillant à ne pas percer trop profond (risque de traversée).',
    'Les positions de tablettes peuvent différer d\'un côté à l\'autre (profondeurs et hauteurs différentes).',
    'Épaisseur minimum recommandée : 18 mm (19 mm préférable pour la rigidité et la marge de perçage).',
    'Prévoir un ordre de montage : toujours fixer le premier caisson au mur avant d\'assembler le second.',
  ],
  etapes_montage: [
    'Déterminer la profondeur de la joue commune (max des deux caissons).',
    'Usiner les rainures de fond sur les deux faces de la joue commune.',
    'Percer les rangées système 32 sur les deux faces (profondeur max 12 mm pour ne pas traverser un panneau de 18 mm).',
    'Assembler le caisson A en entier, avec la joue commune comme joue droite.',
    'Fixer le caisson A au mur. Vérifier aplomb et niveau.',
    'Assembler les éléments du caisson B (tablettes haute et basse) sur la face libre de la joue commune.',
    'Fixer le fond du caisson B dans la rainure de la joue commune.',
    'Vérifier l\'aplomb et le niveau du caisson B.',
    'Solidariser éventuellement les deux caissons par des vis de liaison à l\'arrière.',
  ],
  source: 'pratique atelier + techniques d\'agencement professionnel',
};

// ---------------------------------------------------------------------------
// Fonction pour générer un résumé condensé pour l'IA
// ---------------------------------------------------------------------------
/**
 * Version allégée du résumé de connaissances pour le prompt IA.
 * Ne contient que les règles essentielles — les guides détaillés
 * ne sont injectés que si le sujet est abordé dans la conversation.
 */
export function buildKnowledgeSummary(): string {
  const lines: string[] = [
    'Connaissances: Dunod 2022 + normes industrielles.',
    'Système 32: entraxe 32mm, axe à 37mm du chant, Ø5mm (taquets/charnières), Ø8mm (tourillons).',
    'Pose portes: enveloppante (coudure 0mm), demi-recouvrement, affleurante (jeu 2mm).',
    'Charnières Ø35: cuvette 12-13mm prof, axe 21-22mm du chant. Réglage 3 axes.',
    'Flèche tablette: f = (5·q·L⁴)/(384·E·I), I=b·h³/12. Limite L/200.',
    'Formaldéhyde: E1 obligatoire France (≤0.1ppm). E0.5 préférable.',
    'Assemblages caissons: tourillons, vis, lamelles, confirmats (mélaminé), rainure-languette (CP).',
    'Coulisses tiroir: galets (jeu 12.5mm/côté), billes sortie totale (12.5mm), invisibles (3mm).',
  ];
  return lines.join('\n');
}

/**
 * Résumé complet de connaissances pour le prompt IA.
 */
export function buildFullKnowledgeSummary(): string {
  const lines: string[] = [
    '## Propriétés mécaniques des essences (source: Dunod 2022)',
    ...MECHANICAL_PROPERTIES.map(p =>
      `- ${p.name} : flexion ${p.flexion_statique} MPa, module élasticité ${p.module_elasticite.toLocaleString('fr-FR')} MPa`
    ),
    '',
    '## Système 32',
    ...SYSTEME_32_RULES.map(r => `- ${r.regle} : ${r.valeur}`),
    '',
    '## Règles de charnières',
    ...HINGE_RULES.map(r => `- ${r.type} : ouverture ${r.ouverture}. ${r.details}`),
    '',
    '## Types de pose des portes',
    ...DOOR_RULES.map(r => `- ${r.type_pose} : jeu ${r.jeu}. ${r.details}`),
    '',
    '## Dimensionnement portes et tiroirs',
    ...DOOR_SIZING_RULES.map(r => `- ${r.regle} : ${r.formule}`),
    ...DRAWER_RULES.map(r => `- ${r.regle} : ${r.details}`),
    '',
    '## Règles métier',
    ...TRADE_RULES.map(r => `- ${r.description}`),
  ];
  return lines.join('\n');
}
