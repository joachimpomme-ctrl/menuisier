// ---------------------------------------------------------------------------
// Explications didactiques pour chaque élément de l'interface
// Rédigées pour un menuisier débutant
// ---------------------------------------------------------------------------

const TIPS: Record<string, string> = {

  // ===== STRUCTURE TAB — Matériau =====
  'materiau': "Le choix du matériau conditionne tout : solidité, esthétique, prix et méthodes d'assemblage. Le contreplaqué bouleau est le plus polyvalent pour un meuble sur mesure.",
  'densite': "La densité (kg/m³) indique le poids du matériau. Plus c'est dense, plus c'est lourd mais souvent plus résistant. Le MDF (750) est plus lourd que l'OSB (600).",
  'flexMPa': "La résistance en flexion (MPa = MégaPascal) mesure la charge que supporte une tablette avant de plier. Plus c'est élevé, plus vous pouvez faire des portées longues.",
  'portee-max': "La portée max est la longueur maximale d'une tablette sans support intermédiaire, pour 18 mm d'épaisseur. Au-delà, elle va fléchir sous la charge (~8 kg/mètre pour des livres).",
  'vis': "La tenue des vis dans le matériau. « Excellent » = vis directe possible. « Faible » = il faut des excentriques ou tourillons, jamais de vis dans les chants.",

  // ===== STRUCTURE TAB — Projet =====
  'largeur-mur': "Mesurez la largeur du mur à 4 hauteurs différentes (sol, 50 cm, 120 cm, plafond) et prenez la plus petite valeur. Les murs ne sont jamais parfaitement droits.",
  'hauteur-plafond': "Mesurez la hauteur sol-plafond à 4 points différents le long du mur. Les plafonds varient souvent de 1-2 cm. Prenez la plus petite valeur pour éviter les mauvaises surprises.",
  'hauteur-plinthe': "La plinthe existante au pied du mur. On entaille le bas des joues (montants verticaux) pour que le meuble se plaque contre le mur. Typiquement 7-10 cm.",
  'profondeur-plinthe': "L'épaisseur de la plinthe murale. L'entaille en bas des joues doit être au moins aussi profonde pour que le meuble touche le mur.",

  // ===== STRUCTURE TAB — Panneau =====
  'panneau': "Le panneau est la plaque de bois brute dans laquelle on va découper toutes les pièces. Les formats standards en France : 250×125 cm (courant) ou 305×152 cm (grand format).",
  'panneau-largeur': "Largeur du panneau brut en cm. Format courant : 250 cm. C'est dans ce panneau qu'on va optimiser le placement de toutes vos pièces à découper.",
  'panneau-hauteur': "Hauteur du panneau brut en cm. Format courant : 125 cm. Attention : un panneau de 250×125 pèse environ 30 kg en CP bouleau 18 mm.",
  'panneau-epaisseur': "L'épaisseur du panneau en cm (1.8 = 18 mm). L'épaisseur standard pour un meuble est 18 mm. Pour des fonds de meuble, on utilise 6 mm.",

  // ===== STRUCTURE TAB — Corps =====
  'corps': "Un « corps » est un module indépendant du meuble. On assemble chaque corps séparément puis on les fixe côte à côte (au mur ou entre eux). Cela facilite le transport et le montage.",
  'corps-largeur': "La largeur extérieure du corps. La largeur intérieure (pour les tablettes) sera automatiquement réduite de 2× l'épaisseur du panneau (pour les joues gauche et droite).",
  'corps-profondeur': "La profondeur du corps, de l'arrière vers l'avant. 25-30 cm pour des livres, 35-40 cm pour un dressing ou un buffet, 50-60 cm pour un plan de travail.",
  'int-tablette': "Largeur intérieure utile = largeur du corps - 2× l'épaisseur des joues. C'est la longueur que doivent faire vos tablettes.",
  'poids-corps': "Poids estimé de toutes les pièces du corps, basé sur la densité du matériau. Utile pour anticiper le transport et la fixation au mur.",

  // ===== STRUCTURE TAB — Pièces =====
  'piece-joue': "La joue est un montant vertical (côté gauche ou droit du corps). Elle fait toute la hauteur utile et porte le meuble. C'est la pièce structurelle principale.",
  'piece-tablette-fixe': "Une tablette fixe est collée et vissée définitivement. Elle rigidifie le corps (comme un cadre). Il en faut au minimum 2 : une en haut et une en bas.",
  'piece-tablette-reglable': "Une tablette posée sur des taquets amovibles, qu'on peut repositionner pour s'adapter à la hauteur des livres. On les installe en dernier.",
  'piece-bandeau': "Le bandeau est une pièce décorative (souvent en haut) qui cache l'espace entre le meuble et le plafond. Il donne un aspect fini et intégré.",
  'piece-porte': "La porte est une pièce mobile fixée par charnières. Prévoir 2 mm de jeu. Largeur max recommandée : 60 cm en 18 mm (risque de voile au-delà).",
  'piece-tiroir-facade': "La façade de tiroir recouvre l'ouverture. Mêmes règles de jeu que les portes. Fixée par vis depuis l'intérieur du caisson tiroir.",
  'piece-fond': "Le fond (ou dos) rigidifie le caisson. Généralement en HDF/CP 3-6 mm, rainuré ou agrafé. Indispensable pour l'équerrage.",
  'piece-longueur': "La plus grande dimension de la pièce en cm. Pour une joue, c'est sa hauteur. Pour une tablette, c'est sa portée (longueur d'un côté à l'autre).",
  'piece-largeur': "La plus petite dimension de la pièce en cm. Pour une joue, c'est la profondeur du meuble. Pour une tablette, c'est aussi la profondeur.",
  'piece-qty': "Le nombre d'exemplaires identiques à découper. Exemple : 2 joues par corps, 3 tablettes réglables identiques.",

  // ===== DEBIT TAB =====
  'panneaux-total': "Le nombre de panneaux bruts nécessaires après optimisation du placement. L'algorithme teste 6 stratégies différentes et garde la meilleure.",
  'rendement': "Le pourcentage de matière réellement utilisée. Au-dessus de 70% c'est bon. En-dessous de 50%, envisagez de réorganiser vos pièces ou de changer de format de panneau.",
  'surface-utile': "La surface totale de bois qui deviendra des pièces de votre meuble. C'est ce que vous « payez utile ».",
  'surface-chute': "La surface perdue en chutes. Gardez les grandes chutes pour de futurs projets (petits rangements, boîtes, prototypes).",
  'strategie': "L'algorithme qui a donné le meilleur résultat. « Étagère » place les pièces ligne par ligne. « Guillotine » fait des coupes droites successives comme une scie à panneaux.",
  'trait-scie': "L'épaisseur du trait de scie (kerf) en mm. Une scie circulaire fait environ 3 mm de trait. Ce matériau est perdu à chaque coupe.",
  'piece-non-placable': "Ces pièces sont trop grandes pour tenir dans un seul panneau, même en les tournant. Il faut soit réduire la pièce, soit choisir un format de panneau plus grand.",
  'rotation': "Le symbole ↻ indique que la pièce a été tournée de 90° pour mieux s'insérer dans l'espace disponible sur le panneau.",

  // ===== DEBIT TAB — Coût =====
  'prix-panneau': "Le prix d'achat d'un panneau brut chez votre fournisseur (HT). Varie selon le négoce, la quantité et la qualité. Le prix affiché par défaut est indicatif.",
  'cout-total': "Le coût total en panneaux bruts, sans compter la quincaillerie (vis, tourillons, colle, taquets, charnières) ni les finitions (vernis, huile, peinture).",
  'cout-chutes': "La part du coût qui finit en chutes. Une indication pour juger si le calepinage est économique.",

  // ===== MONTAGE TAB =====
  'elevation': "Vue de face (élévation frontale) de votre meuble. Les rectangles colorés représentent les joues et tablettes. Les pointillés indiquent les tablettes réglables.",
  'joint-corps': "La ligne pointillée jaune indique la hauteur de joint entre joues basses et joues hautes (à 180 cm). La tablette fixe à ce niveau renforce et cache le joint.",

  // ===== NOTICE TAB =====
  'releve-cotes': "Avant toute découpe, vérifiez les dimensions réelles sur place. Les murs, sols et plafonds ne sont jamais parfaits. Mesurez toujours en au moins 4 points.",
  'debit-notice': "L'étape de découpe. Faites couper les grandes pièces en magasin (gratuit ou 1-2€/coupe) puis affinez à la scie circulaire sur rail pour la précision.",
  'rainures': "Les rainures accueillent les crémaillères métalliques qui permettent de repositionner les tablettes. On les fait à la défonceuse avec un guide parallèle.",
  'percages-sys32': "Le système 32 est le standard industriel pour le positionnement des taquets. Tous les 32 mm, à 37 mm du bord. Un gabarit de perçage est indispensable pour la régularité.",
  'decoupe-plinthe': "On entaille le bas de chaque joue pour enjamber la plinthe murale. Le meuble se plaque ainsi contre le mur tout en restant posé au sol.",
  'assemblage': "Le montage se fait corps par corps, à plat sur des tréteaux. On colle + visse les tablettes fixes, puis on vérifie l'équerrage (diagonales égales à 2 mm près).",
  'equerrage': "L'équerrage vérifie que votre corps est bien rectangle (pas en losange). Mesurez les 2 diagonales : si elles sont égales à 2 mm près, c'est bon.",
  'mise-en-place': "On pose le premier corps contre le mur, on vérifie la verticalité au niveau à bulle (2 axes), on cale si besoin, puis on fixe au mur avec 2-3 vis + chevilles.",
  'finitions': "Les bandeaux de plafond, les jonctions entre corps et les finitions de surface (vernis, huile, peinture) sont posés en dernier pour un résultat propre.",

  // ===== VALIDATION TAB =====
  'erreur': "Les erreurs sont bloquantes : elles indiquent un problème dimensionnel concret (pièce plus grande que le panneau, joues qui ne font pas la bonne hauteur, etc.).",
  'avertissement': "Les avertissements signalent un risque potentiel. Vous pouvez continuer, mais vérifiez et corrigez si nécessaire.",
  'flexion': "La flèche est la courbure d'une tablette sous charge. Au-delà de L/200 (longueur divisée par 200), la déformation est visible à l'œil nu. Réduisez la portée ou augmentez l'épaisseur.",
  'formaldehyde': "Le formaldéhyde est un composé volatil irritant émis par les colles des panneaux. En France, la classe E1 est obligatoire depuis 2006. Préférez E0.5 pour un usage intérieur.",
  'orientation-debit': "Certains panneaux (CP, OSB) ont un sens de fil qui affecte la résistance et l'esthétique. Le MDF et le mélaminé n'ont pas de sens, ce qui facilite le calepinage.",

  // ===== PORTES & TIROIRS =====
  'charniere': "La charnière standard (Ø35 mm, type Blum/Hettich) s'encastre dans une cuvette fraisée dans la porte. Réglable en 3 axes après pose. Prévoir 2 charnières pour une porte < 60 cm, 3 au-delà.",
  'porte-pose': "Trois poses possibles : enveloppante (recouvre la joue), demi-recouvrement (2 portes sur même joue), affleurante (porte dans le cadre). Chaque pose demande une charnière avec une coudure différente.",
  'porte-jeu': "Toujours prévoir 2 mm de jeu entre portes adjacentes et 2 mm en haut/bas. Sans jeu, les portes frottent et s'abîment. Trop de jeu = aspect négligé.",
  'tiroir-coulisse': "Coulisses à galets (économiques, ouverture 75%) ou à billes (sortie totale, plus robuste). Prévoir 12.5 mm de jeu latéral de chaque côté pour les coulisses standard.",
  'tiroir-dim': "Hauteur caisson tiroir = hauteur façade - 25 mm. Profondeur = profondeur intérieure - 10 mm. Fond en HDF 3 mm rainuré à 8 mm du bas.",

  // ===== ASSISTANT IA =====
  'assistant-ia': "L'assistant connaît votre projet en détail (dimensions, matériau, pièces, erreurs). Il s'appuie sur une base de connaissances menuiserie professionnelle (Dunod 2022).",

  // ===== HEADER =====
  'savoirs': "La base de connaissances contient des règles métier, propriétés de matériaux et normes issues de manuels professionnels. Vous pouvez ajouter vos propres documents JSON pour enrichir l'IA.",
  'export-json': "Exporte votre projet en fichier JSON pour le sauvegarder, le partager ou le réimporter plus tard sur un autre appareil.",
  'export-pdf': "Génère un PDF complet avec la liste de coupe, les plans de calepinage, la notice de montage et la validation. À imprimer pour l'atelier.",
};

export default TIPS;
