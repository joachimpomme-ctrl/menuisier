/**
 * Contenu du guide utilisateur intégré.
 *
 * Chaque section a un id, un titre, une icône et un tableau de blocs de contenu.
 * Les blocs peuvent être de type 'text', 'steps', 'tip', 'warning', 'glossary'.
 * Le composant HelpGuide.tsx consomme ces données pour le rendu.
 */

export type BlockType = 'text' | 'steps' | 'tip' | 'warning' | 'glossary';

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface StepsBlock {
  type: 'steps';
  items: string[];
}

export interface TipBlock {
  type: 'tip';
  content: string;
}

export interface WarningBlock {
  type: 'warning';
  content: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface GlossaryBlock {
  type: 'glossary';
  entries: GlossaryEntry[];
}

export type ContentBlock = TextBlock | StepsBlock | TipBlock | WarningBlock | GlossaryBlock;

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  blocks: ContentBlock[];
}

const HELP_GUIDE: HelpSection[] = [
  // =========================================================================
  // 1. DÉMARRAGE RAPIDE
  // =========================================================================
  {
    id: 'quick-start',
    title: 'Démarrage rapide',
    icon: '🚀',
    blocks: [
      {
        type: 'text',
        content:
          'Menuisier vous accompagne de l\'idée au plan de fabrication. En 4 étapes, vous obtenez la liste de coupe, la quincaillerie, la notice de montage et un PDF prêt pour l\'atelier.',
      },
      {
        type: 'steps',
        items: [
          'Cliquez sur « + Nouveau projet » en haut de l\'écran.',
          'Choisissez le type de meuble (bibliothèque, placard, meuble TV…).',
          'Entrez les dimensions de l\'espace disponible (largeur, hauteur, profondeur) et le matériau.',
          'Organisez l\'intérieur : choisissez une variante rapide ou composez vos zones manuellement.',
          'Cliquez « Générer le meuble » : le Dashboard affiche toutes les pièces, la quincaillerie et la notice.',
          'Exportez le PDF pour l\'atelier, ou basculez dans l\'éditeur classique pour affiner.',
        ],
      },
      {
        type: 'tip',
        content:
          'Vous pouvez créer autant de projets que vous voulez. Ils sont sauvegardés automatiquement dans votre navigateur. Pensez à exporter un JSON de temps en temps pour sauvegarder vos projets.',
      },
    ],
  },

  // =========================================================================
  // 2. LE WIZARD V3
  // =========================================================================
  {
    id: 'wizard',
    title: 'Créer un meuble (Wizard)',
    icon: '🪄',
    blocks: [
      {
        type: 'text',
        content:
          'Le wizard vous guide en 3 étapes pour définir votre meuble. À chaque étape, des valeurs par défaut intelligentes sont proposées selon le type de meuble choisi.',
      },
      // Étape 1
      {
        type: 'text',
        content:
          '**Étape 1 — Type de meuble** : Choisissez parmi 17 types (bibliothèque, placard, armoire, meuble TV, bureau, commode, cuisine, etc.). Ce choix détermine les dimensions par défaut, les variantes proposées et les règles métier appliquées (portes automatiques, anti-basculement…).',
      },
      // Étape 2
      {
        type: 'text',
        content:
          '**Étape 2 — Dimensions et matériau** : Entrez la largeur, la hauteur et la profondeur de l\'espace disponible en millimètres. Choisissez le type de mur (béton, brique creuse, placo) — c\'est important pour la fixation. Sélectionnez le matériau (contreplaqué bouleau, peuplier, okoumé, MDF, mélaminé, OSB) avec son épaisseur.',
      },
      {
        type: 'tip',
        content:
          'Les dimensions par défaut sont adaptées au type de meuble. Par exemple, une bibliothèque propose 300 mm de profondeur, un placard 600 mm. Vous pouvez toujours les modifier.',
      },
      // Étape 3
      {
        type: 'text',
        content:
          '**Étape 3 — Organisation intérieure** : C\'est ici que vous décidez ce qu\'il y a à l\'intérieur du meuble.',
      },
      {
        type: 'text',
        content:
          '*Variantes rapides* : Des boutons proposent des configurations prêtes à l\'emploi adaptées au type de meuble. Par exemple, pour un placard : « Penderie simple » (tringle + étagère), « Dressing complet » (tringle haute, tringle basse, tiroirs, étagères), « Dressing ouvert sans porte ». Un clic applique la configuration.',
      },
      {
        type: 'text',
        content:
          '*Zones manuelles* : Vous pouvez aussi composer librement l\'intérieur en ajoutant des zones empilées verticalement. Chaque zone a un type (tablettes réglables, bloc tiroirs, tringle, casier à chaussures, niche TV, casier à vin, banquette) et une hauteur. Une barre de progression indique l\'espace restant.',
      },
      {
        type: 'text',
        content:
          '*Mode contenu* : Le lien discret « Je décris ce que je range » vous permet de décrire en texte libre ce que vous stockez. L\'application propose alors une organisation adaptée.',
      },
      {
        type: 'warning',
        content:
          'Certaines variantes peuvent afficher des avertissements (⚠) quand elles utilisent des fonctionnalités pas encore supportées (portes vitrées, patères…). Les pièces sont quand même générées, mais sans ces éléments spécifiques.',
      },
    ],
  },

  // =========================================================================
  // 3. LE DASHBOARD
  // =========================================================================
  {
    id: 'dashboard',
    title: 'Lire le Dashboard',
    icon: '📊',
    blocks: [
      {
        type: 'text',
        content:
          'Après la génération, le Dashboard affiche tout ce qu\'il faut pour fabriquer votre meuble. Il est organisé en sections dépliables.',
      },
      {
        type: 'text',
        content:
          '**Résumé** (en haut) : Quatre badges indiquent le poids total estimé, le niveau de difficulté (Débutant / Intermédiaire / Avancé), le coût estimé en matériaux et le nombre d\'étapes de montage.',
      },
      {
        type: 'text',
        content:
          '**Alertes** : Les erreurs bloquantes (rouge) indiquent un problème structural (portée trop grande, profondeur insuffisante…). Les avertissements (orange) sont des recommandations (anti-basculement, poids de porte élevé…).',
      },
      {
        type: 'text',
        content:
          '**Pièces** : Tableau de toutes les pièces à couper avec nom, dimensions (longueur × largeur × épaisseur), quantité, type et chants à bander. La colonne « Chant » indique quels côtés protéger : AV (avant), AR (arrière), G (gauche), D (droite), ou « 4 côtés ».',
      },
      {
        type: 'text',
        content:
          '**Quincaillerie** : Liste complète de la visserie, tourillons, charnières, coulisses, tringles, bandes de chant… avec les quantités exactes. C\'est votre liste de courses en quincaillerie.',
      },
      {
        type: 'text',
        content:
          '**Plans de perçage** : Pour chaque pièce nécessitant des perçages (joues, tablettes fixes…), le détail des opérations : diamètre, profondeur, nombre. Par exemple : « Perçage Ø5mm prof.12mm ×8 » pour les trous système 32.',
      },
      {
        type: 'text',
        content:
          '**Liste de courses** : Récapitulatif chiffré de tout ce qu\'il faut acheter (panneaux, quincaillerie) avec estimation du coût total.',
      },
      {
        type: 'text',
        content:
          '**Notice de montage** : Guide étape par étape pour assembler le meuble, de la découpe au montage final. Chaque étape liste les pièces concernées et propose un conseil pratique.',
      },
      {
        type: 'text',
        content:
          '**Décisions du moteur** (bloc indigo) : Explique *pourquoi* le meuble a été généré ainsi. Par exemple : « 2 portes battantes ajoutées — Largeur > 500mm → 2 portes avec montant central implicite ». C\'est la section la plus importante pour comprendre les choix automatiques.',
      },
      {
        type: 'text',
        content:
          '**Hypothèses** : Les valeurs par défaut utilisées (épaisseur de vis, type de charnière…) et les points à vérifier (type de mur, équerrage…).',
      },
      {
        type: 'tip',
        content:
          'Le bouton « ← Modifier » vous ramène à l\'étape 3 du wizard pour ajuster l\'organisation intérieure sans tout recommencer.',
      },
    ],
  },

  // =========================================================================
  // 4. L'ÉDITEUR CLASSIQUE
  // =========================================================================
  {
    id: 'classic-editor',
    title: 'L\'éditeur classique',
    icon: '⚙️',
    blocks: [
      {
        type: 'text',
        content:
          'L\'éditeur classique donne un contrôle total sur chaque pièce du meuble. Vous y accédez soit depuis le Dashboard (bouton « Éditeur classique »), soit en créant un projet via le wizard legacy (« Mes dimensions »).',
      },
      {
        type: 'text',
        content:
          '**Onglet Structure** : C\'est le cœur de l\'éditeur. Vous configurez le projet (dimensions mur, matériau, panneau), puis chaque corps de meuble individuellement.',
      },
      {
        type: 'text',
        content:
          'Chaque corps a une largeur et une profondeur. Il contient des pièces : joues (côtés verticaux), tablettes fixes et réglables, bandeaux (haut), portes, façades tiroir, fond, séparateurs. Vous pouvez ajouter des pièces une par une, utiliser « Remplir auto » pour générer un jeu standard, ou utiliser la « 📚 Bibliothèque » pour insérer des pièces du commerce.',
      },
      {
        type: 'text',
        content:
          '**Configuration des portes** : Pour chaque corps, vous pouvez configurer les portes : nombre (1 ou 2), type de pose (enveloppante, demi-recouvrement, affleurante), couverture verticale (pleine hauteur, zone basse, zone haute). L\'application calcule automatiquement les dimensions, le poids, le nombre de charnières et les positions de perçage.',
      },
      {
        type: 'text',
        content:
          '**Joues communes** : Entre deux corps adjacents, un bouton permet d\'activer le partage d\'une joue. Au lieu de 2 panneaux côte à côte, un seul panneau en double épaisseur est utilisé — économie de matière et montage plus propre.',
      },
      {
        type: 'text',
        content:
          '**Onglet Plans 2D** : Visualisation en élévation frontale de chaque corps avec les cotes. Utile pour vérifier visuellement l\'agencement avant de couper.',
      },
      {
        type: 'text',
        content:
          '**Onglet Débit** : Le calepinage (nesting) optimise la disposition des pièces sur les panneaux pour minimiser les chutes. Vous voyez le nombre de panneaux nécessaires, le taux d\'utilisation et le coût matière. Les pièces marquées « STD » (pièces standard de la bibliothèque) sont identifiées visuellement.',
      },
      {
        type: 'text',
        content:
          '**Onglet Montage** : Schéma d\'assemblage en vue frontale avec les pièces colorées par type.',
      },
      {
        type: 'text',
        content:
          '**Onglet Notice** : Guide de montage pas à pas auto-généré. Chaque étape liste les actions et les pièces concernées.',
      },
      {
        type: 'text',
        content:
          '**Onglet Contrôle** : Synthèse des erreurs et avertissements. Un point rouge/vert dans l\'onglet indique s\'il y a des problèmes. Lien rapide vers la Structure pour corriger.',
      },
      {
        type: 'text',
        content:
          '**Onglet Assistant IA** : Un assistant conversationnel qui connaît votre projet en détail. Posez-lui des questions (« Est-ce que mes tablettes sont trop longues ? », « Quel matériau pour une salle de bain ? ») et il peut même modifier le projet directement.',
      },
    ],
  },

  // =========================================================================
  // 5. LA BIBLIOTHÈQUE
  // =========================================================================
  {
    id: 'library',
    title: 'La bibliothèque de pièces',
    icon: '📚',
    blocks: [
      {
        type: 'text',
        content:
          'La bibliothèque contient des pièces standard du commerce (tablettes mélaminées Leroy Merlin, portes, fonds…). Vous pouvez les insérer directement dans un corps de meuble au lieu de tout couper sur mesure.',
      },
      {
        type: 'steps',
        items: [
          'Dans l\'onglet Structure, cliquez sur « 📚 Bibliothèque » dans un corps de meuble.',
          'Parcourez ou recherchez la pièce souhaitée dans le catalogue.',
          'Cliquez « Utiliser » : la pièce est ajoutée au corps avec ses dimensions pré-remplies.',
          'Dans l\'onglet Débit, les pièces standard sont marquées d\'un badge « STD » — pas besoin de les couper.',
        ],
      },
      {
        type: 'text',
        content:
          '**Gérer le catalogue** : Le bouton « 📚 Bibliothèque » dans la barre d\'outils ouvre le gestionnaire complet. Vous pouvez ajouter vos propres pièces, modifier les existantes, exporter/importer le catalogue en JSON, ou réinitialiser aux pièces par défaut.',
      },
      {
        type: 'tip',
        content:
          'Astuce économie : pour les tablettes mélaminées blanches ou les fonds en HDF 3mm, utilisez des pièces standard du commerce. C\'est souvent moins cher et plus rapide que de couper dans un grand panneau.',
      },
    ],
  },

  // =========================================================================
  // 6. L'EXPORT PDF
  // =========================================================================
  {
    id: 'pdf',
    title: 'L\'export PDF',
    icon: '📄',
    blocks: [
      {
        type: 'text',
        content:
          'Le PDF est votre document de référence pour l\'atelier. Il regroupe tout ce qu\'il faut pour fabriquer le meuble sans retourner sur l\'application.',
      },
      {
        type: 'text',
        content:
          '**Ce qu\'il contient** :',
      },
      {
        type: 'steps',
        items: [
          'Résumé du projet : matériau, dimensions, nombre de corps.',
          'Liste de coupe complète : chaque pièce avec longueur, largeur, épaisseur, quantité, type et chants à bander.',
          'Plans de calepinage : disposition des pièces sur les panneaux (optimisation des chutes).',
          'Plans de perçage : diamètre, profondeur et nombre par pièce.',
          'Quincaillerie : liste de tout ce qu\'il faut acheter avec les quantités.',
          'Décisions du moteur : explication des choix automatiques.',
          'Hypothèses : valeurs par défaut utilisées et points à vérifier.',
          'Erreurs et avertissements : problèmes détectés à corriger avant fabrication.',
          'Notice de montage : étapes d\'assemblage.',
        ],
      },
      {
        type: 'tip',
        content:
          'Imprimez le PDF et gardez-le à côté de votre scie. La liste de coupe et les plans de calepinage sont conçus pour être lus directement en atelier.',
      },
      {
        type: 'warning',
        content:
          'Le PDF utilise des caractères sans accent (limitation technique de la génération). « Hypothèses » s\'affiche « Hypotheses », etc. Le contenu reste identique.',
      },
    ],
  },

  // =========================================================================
  // 7. GESTION DES PROJETS
  // =========================================================================
  {
    id: 'projects',
    title: 'Gérer ses projets',
    icon: '💾',
    blocks: [
      {
        type: 'text',
        content:
          'Vos projets sont sauvegardés automatiquement dans le navigateur (localStorage). Chaque modification est enregistrée en temps réel.',
      },
      {
        type: 'text',
        content:
          '**Mes projets** : Cliquez sur « Mes projets » pour voir tous vos projets. Vous pouvez charger, dupliquer, renommer ou supprimer un projet. Les projets sont triés par date de dernière modification.',
      },
      {
        type: 'text',
        content:
          '**Exporter / Importer** : Le menu « ... » dans la barre d\'outils permet d\'exporter le projet en fichier JSON (pour le sauvegarder, le partager ou le transférer sur un autre appareil) et d\'importer un fichier JSON existant.',
      },
      {
        type: 'text',
        content:
          '**Sync Cloud** (optionnel) : Le bouton ☁️ permet de synchroniser vos projets avec Google Sheets via un script Google Apps. C\'est un système de backup : vous poussez vos projets vers le cloud et vous pouvez les récupérer sur un autre appareil. Il faut d\'abord configurer l\'URL du script.',
      },
      {
        type: 'warning',
        content:
          'Les projets sont stockés dans votre navigateur. Si vous videz les données du site ou changez de navigateur, vos projets sont perdus. Pensez à exporter régulièrement en JSON ou à utiliser la sync cloud.',
      },
      {
        type: 'tip',
        content:
          'Dupliquez un projet avant de faire des modifications importantes. C\'est votre « Ctrl+Z » de secours.',
      },
    ],
  },

  // =========================================================================
  // 8. CONSEILS ATELIER
  // =========================================================================
  {
    id: 'workshop-tips',
    title: 'Conseils atelier',
    icon: '🪚',
    blocks: [
      {
        type: 'text',
        content:
          'Quelques conseils pratiques pour passer du plan à la réalisation.',
      },
      {
        type: 'text',
        content:
          '**Avant de couper** : Vérifiez l\'onglet Contrôle (ou les alertes du Dashboard). Corrigez toute erreur bloquante avant de démarrer. Vérifiez les hypothèses marquées « À vérifier » — notamment le type de mur et l\'équerrage.',
      },
      {
        type: 'text',
        content:
          '**Trait de scie (kerf)** : L\'application prend en compte un trait de scie de 3 mm par défaut dans le calepinage. Si votre lame a un trait différent, ajustez dans les paramètres de l\'onglet Débit.',
      },
      {
        type: 'text',
        content:
          '**Bandes de chant** : Appliquez les bandes de chant sur les faces indiquées dans la colonne « Chant » AVANT l\'assemblage. Utilisez un fer à repasser (bandes thermo-collantes) ou une plaqueuse de chant. Testez toujours sur une chute d\'abord.',
      },
      {
        type: 'text',
        content:
          '**Perçage système 32** : Les trous pour tablettes réglables sont espacés de 32 mm. Utilisez un gabarit de perçage (du commerce ou fait maison) pour garantir la régularité. Diamètre 5 mm, profondeur 12 mm.',
      },
      {
        type: 'text',
        content:
          '**Anti-basculement** : Tout meuble de plus de 1m50 de haut doit être fixé au mur (norme sécurité enfants). L\'application le signale automatiquement. Utilisez des équerres anti-basculement ou un tasseau vissé au mur.',
      },
      {
        type: 'text',
        content:
          '**Fond de meuble** : Le fond (dos) en HDF ou contreplaqué fin (3-6 mm) assure l\'équerrage du meuble. Ne le négligez pas — sans fond, le meuble se déforme dans le temps. Rainurez-le dans les joues et tablettes, ou agrafez-le.',
      },
      {
        type: 'tip',
        content:
          'Montez toujours à blanc (sans colle) avant l\'assemblage définitif. Vérifiez l\'équerrage avec une diagonale : les deux diagonales doivent être égales à 1-2 mm près.',
      },
    ],
  },

  // =========================================================================
  // 9. GLOSSAIRE MENUISERIE
  // =========================================================================
  {
    id: 'glossary',
    title: 'Glossaire menuiserie',
    icon: '📖',
    blocks: [
      {
        type: 'text',
        content:
          'Les termes techniques utilisés dans l\'application.',
      },
      {
        type: 'glossary',
        entries: [
          {
            term: 'Joue',
            definition:
              'Panneau vertical latéral d\'un corps de meuble (côté gauche ou droit). C\'est l\'élément structural principal qui porte les tablettes.',
          },
          {
            term: 'Tablette fixe',
            definition:
              'Étagère permanente vissée/tourillonnée dans les joues. Rigidifie le caisson et sépare les zones fonctionnelles (ex : zone penderie / zone étagères).',
          },
          {
            term: 'Tablette réglable',
            definition:
              'Étagère posée sur des taquets (crémaillères ou trous système 32). Peut être repositionnée en hauteur selon les besoins.',
          },
          {
            term: 'Bandeau',
            definition:
              'Pièce horizontale décorative en haut du meuble. Cache l\'espace entre le dessus du meuble et le plafond.',
          },
          {
            term: 'Séparateur',
            definition:
              'Panneau vertical intérieur qui divise un corps en compartiments plus étroits. Utile pour rigidifier les grandes portées.',
          },
          {
            term: 'Fond (dos)',
            definition:
              'Panneau fin (3-6 mm) fixé à l\'arrière du meuble. Assure l\'équerrage (empêche le meuble de se déformer en losange) et cache le mur.',
          },
          {
            term: 'Porte',
            definition:
              'Panneau battant fixé par des charnières (Ø35 mm). Peut être en recouvrement (devant les joues), demi-recouvrement (entre deux corps) ou affleurante (dans le cadre).',
          },
          {
            term: 'Façade tiroir',
            definition:
              'Face visible d\'un tiroir, fixée sur la boîte du tiroir. Les dimensions sont calculées selon le type de coulisse.',
          },
          {
            term: 'Chant',
            definition:
              'Tranche visible d\'un panneau. On la protège avec une bande de chant (thermo-collante ou ABS) pour l\'esthétique et la résistance à l\'humidité.',
          },
          {
            term: 'Calepinage (nesting)',
            definition:
              'Optimisation de la disposition des pièces à découper sur un panneau brut pour minimiser les chutes. L\'onglet Débit le calcule automatiquement.',
          },
          {
            term: 'Système 32',
            definition:
              'Standard d\'entraxe de perçage pour les quincailleries de meuble : rangées de trous espacés de 32 mm, à 37 mm du bord avant et arrière des joues. Permet de positionner tablettes, charnières et coulisses.',
          },
          {
            term: 'Plinthe',
            definition:
              'Socle en retrait sous le meuble. Protège la base de l\'humidité et des coups de balai. Hauteur typique : 80-100 mm.',
          },
          {
            term: 'Trait de scie (kerf)',
            definition:
              'Largeur de matière enlevée par la lame de scie lors de la coupe (typiquement 3 mm). Pris en compte dans le calepinage pour ne pas obtenir des pièces trop petites.',
          },
          {
            term: 'Joue commune',
            definition:
              'Quand deux corps sont côte à côte, au lieu de 2 joues séparées, on utilise un seul panneau en double épaisseur partagé entre les deux corps. Économie de matière.',
          },
          {
            term: 'Portée (span)',
            definition:
              'Distance entre deux appuis verticaux (joues ou séparateurs). Une portée trop grande cause la flexion des tablettes. Dépend du matériau et de l\'épaisseur.',
          },
          {
            term: 'Confirmat',
            definition:
              'Vis d\'assemblage spéciale pour les panneaux de bois. Tête fraisée, filetage large. Nécessite un pré-perçage étagé (Ø5 mm dans le chant, Ø7/8 mm traversant dans la joue).',
          },
          {
            term: 'Tourillon',
            definition:
              'Cheville en bois cylindrique (Ø8 ou Ø10 mm) insérée dans des trous alignés pour assembler deux pièces. Invisible de l\'extérieur, mais nécessite un perçage précis.',
          },
        ],
      },
    ],
  },
];

export default HELP_GUIDE;
