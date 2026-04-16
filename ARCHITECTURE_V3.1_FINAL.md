# Le Menuisier v3.1 — Architecture définitive

> **Principe** : le bricoleur décrit ce qu'il veut ranger,
> l'app conçoit le meuble, calcule chaque pièce, et produit la fiche atelier.

---

## 1. Pipeline moteur — 7 étapes

```
intent → layout → structure → geometry → hardware → validation → production
```

| Étape | Responsabilité | Entrée | Sortie |
|-------|---------------|--------|--------|
| **intent** | Normaliser l'intention utilisateur | Saisie brute | `ProjectIntent` validé |
| **layout** | Choisir et disposer les modules dans les caissons | Intent + base | `Layout` (zones empilées) |
| **structure** | Décider la construction (tablettes fixes, fond, contreventement) | Layout | `Structure` (squelette du meuble) |
| **geometry** | Calculer chaque pièce au mm | Structure | `GeneratedPart[]` |
| **hardware** | Sélectionner la quincaillerie | Parts + Structure | `HardwareItem[]` |
| **validation** | Vérifier tout, hiérarchiser | Tout le projet | `ValidationIssue[]` |
| **production** | Générer les livrables | Tout | Shopping + Plans + Notice |

### Pourquoi "structure" est séparé de "geometry"

- **layout** dit : "penderie en haut, tiroirs en bas"
- **structure** dit : "il faut une tablette fixe de séparation entre les deux zones, le fond est en rainure 5mm, le meuble a besoin de contreventement car H > 1800mm"
- **geometry** dit : "cette tablette fait 1164×582mm, cette joue fait 2320×600mm"

Sans "structure", geometry deviendrait un monolithe avec toute la logique métier dedans.

---

## 2. Modèle de données

### ProjectIntent — ce que l'utilisateur veut
```typescript
interface ProjectIntent {
  furniture_type: FurnitureType;
  space: {
    width_mm: number;
    height_mm: number;
    depth_mm: number;
    plinth_mm: number;
    wall_type: "concrete" | "hollow_brick" | "plasterboard" | "unknown";
  };
  variant?: string;
  contents?: ContentItem[];       // mode "contenu à ranger"
  zones?: ZoneConfig[];           // mode configurateur
  site_constraints?: SiteConstraint[];  // Phase 5 — murs pas droits, tuyaux, etc.
}
```

### ContentItem — mode "contenu à ranger"
```typescript
interface ContentItem {
  category: string;    // clé dans objets_reference : "shirts", "books_pocket"...
  quantity: number;
}
```

### Layout — disposition des modules
```typescript
interface Layout {
  bodies: BodyLayout[];
}

interface BodyLayout {
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  zones: ZoneLayout[];
  doors?: DoorLayout;
}

interface ZoneLayout {
  module_id: string;
  height_mm: number;
  config: ModuleConfig;    // TYPÉ par module, pas Record<string, any>
}
```

### ModuleConfig — typé par module
```typescript
// Union discriminée — un type par module
type ModuleConfig =
  | { type: "shelf_adjustable"; count: number; spacing_mm: number }
  | { type: "drawer_stack"; count: number; distribution: "equal" | "progressive" | "custom"; step_mm?: number }
  | { type: "hanging_rod_short" }
  | { type: "hanging_rod_long" }
  | { type: "shoe_rack_inclined"; tiers: number }
  | { type: "tv_niche"; ventilation: boolean }
  | { type: "wine_rack"; columns: number; rows: number }
  | { type: "bench_storage"; has_backrest: boolean };
```

### Structure — squelette du meuble
```typescript
interface Structure {
  bodies: BodyStructure[];
}

interface BodyStructure {
  body_id: string;
  fixed_shelves: FixedShelfPlacement[];   // tablettes fixes structurelles
  back_panel: { type: "groove" | "rebate" | "applied"; thickness_mm: number };
  bracing: BracingType;                    // contreventement
  plinth: { type: "legs" | "integrated" | "none"; height_mm: number };
  wall_mounting?: WallMounting;
}
```

### GeneratedPart — pièce calculée
```typescript
interface GeneratedPart {
  id: string;
  name: string;
  length_mm: number;
  width_mm: number;
  thickness_mm: number;
  qty: number;
  type: PieceType;
  body_id: string;
  position?: { x_mm: number; y_mm: number };
  edge_banding?: EdgeBandingSide[];
  drilling?: DrillingOp[];
  locked: boolean;           // override utilisateur — pièce figée
}
```

### HardwareItem — quincaillerie
```typescript
interface HardwareItem {
  id: string;
  name: string;
  quantity: number;
  category: "hinge" | "slide" | "shelf_support" | "screw" | "connector"
          | "handle" | "wall_mount" | "strut" | "lock" | "other";
  reference?: string;
  unit_price_eur?: number;
}
```

### ValidationIssue — hiérarchisée et qualifiée
```typescript
interface ValidationIssue {
  id: string;
  severity: "error" | "warning" | "suggestion" | "info";
  blocking: boolean;         // empêche l'export si true
  message: string;
  suggestion?: string;
  rule_id?: string;
  affected_part?: string;
}
```

### ProductionOutput — livrables
```typescript
interface ProductionOutput {
  assumptions: Assumption[];    // hypothèses du moteur, transparentes
  shopping_list: {
    panels: PanelNeed[];
    hardware: HardwareItem[];
    tools_needed: string[];
    estimated_cost_eur: number;
  };
  cutting_plans: NestingResult;
  drilling_plans: DrillingPlan[];
  assembly_guide: AssemblyStep[];   // 12 étapes contextualisées
  summary: {
    dimensions_mm: { w: number; h: number; d: number };
    total_parts: number;
    total_weight_kg: number;
    difficulty: "debutant" | "intermediaire" | "avance";
  };
}

interface Assumption {
  key: string;              // "wall_type", "hinge_model", "gap_mm"...
  value: string;
  reason: string;           // "Mur supposé béton (non renseigné)"
  user_should_verify: boolean;
}
```

### Override utilisateur — 3 niveaux
```typescript
// Sur le projet
interface ProjectState {
  intent: ProjectIntent;
  override_level: "none" | "layout" | "manual";
  // none → tout régénère depuis l'intent
  // layout → l'utilisateur a modifié les zones, geometry+ régénère
  // manual → l'utilisateur a modifié des pièces individuelles
}

// Sur chaque pièce
interface GeneratedPart {
  // ...
  locked: boolean;  // true = l'utilisateur a modifié cette pièce, ne pas régénérer
}
```

**Comportement** :
- Modification de l'intent (taille, type) → override_level = "none", tout régénère
- Modification d'une zone → override_level = "layout", structure+ régénère
- Modification d'une pièce → pièce.locked = true, le reste continue de se régénérer
- Modification d'une pièce lockée → on peut la "déverrouiller" pour la remettre en auto

---

## 3. Catalogue de modules — avec impact structurel

Chaque module déclare :
- ce qu'il produit (pièces + quincaillerie)
- ce qu'il exige structurellement
- ce avec quoi il est incompatible

```json
{
  "modules": {
    "shelf_adjustable": {
      "id": "shelf_adjustable",
      "name": "Étagères réglables",
      "icon": "📚",
      "parameters": {
        "count": {"type": "integer", "min": 1, "max": 12, "default": 4},
        "spacing_mm": {"type": "integer", "min": 150, "max": 500, "default": 300}
      },
      "produces": {
        "parts": ["tablette-reglable"],
        "hardware": ["shelf_pin_5mm", "system_32_holes"]
      },
      "structural_impact": {
        "requires_fixed_shelf_above": false,
        "requires_fixed_shelf_below": false,
        "requires_back_panel": false,
        "requires_separator": false,
        "min_depth_mm": 150,
        "affects_load": false,
        "incompatible_with": [],
        "depends_on": []
      },
      "constraints": [
        {
          "condition": "zone_width_mm > 800 && material == 'particleboard_19'",
          "severity": "warning",
          "blocking": false,
          "message": "Portée > 800mm en aggloméré : fléchissement probable",
          "suggestion": "Ajouter un séparateur vertical ou passer en CP/MDF"
        }
      ]
    },

    "drawer_stack": {
      "id": "drawer_stack",
      "name": "Bloc tiroirs",
      "icon": "🗃️",
      "parameters": {
        "count": {"type": "integer", "min": 1, "max": 6, "default": 3},
        "distribution": {"type": "enum", "values": ["equal", "progressive", "custom"], "default": "progressive"},
        "progressive_step_mm": {"type": "integer", "default": 32}
      },
      "produces": {
        "parts": ["tiroir-facade", "tiroir-caisson", "tiroir-fond"],
        "hardware": ["ball_bearing_slide_full", "handle"]
      },
      "structural_impact": {
        "requires_fixed_shelf_above": true,
        "requires_fixed_shelf_below": true,
        "requires_back_panel": true,
        "requires_separator": false,
        "min_depth_mm": 300,
        "affects_load": true,
        "incompatible_with": [],
        "depends_on": ["lateral_slides_or_undermount"]
      },
      "constraints": [
        {
          "condition": "zone_width_mm > 800",
          "severity": "warning",
          "blocking": false,
          "message": "Tiroirs > 800mm : coulisses renforcées recommandées"
        }
      ]
    },

    "hanging_rod_short": {
      "id": "hanging_rod_short",
      "name": "Penderie courte (chemises/vestes)",
      "icon": "👔",
      "parameters": {},
      "produces": {
        "parts": [],
        "hardware": ["rod_bracket_25mm", "chrome_rod_25mm"]
      },
      "structural_impact": {
        "requires_fixed_shelf_above": true,
        "requires_fixed_shelf_below": false,
        "requires_back_panel": false,
        "requires_separator": false,
        "min_depth_mm": 550,
        "min_height_mm": 1100,
        "affects_load": true,
        "incompatible_with": [],
        "depends_on": []
      },
      "constraints": [
        {
          "condition": "zone_depth_mm < 550",
          "severity": "error",
          "blocking": true,
          "message": "Profondeur insuffisante pour penderie (min 550mm)",
          "suggestion": "Augmenter la profondeur ou utiliser une tringle perpendiculaire"
        }
      ]
    },

    "hanging_rod_long": {
      "id": "hanging_rod_long",
      "name": "Penderie longue (manteaux/robes)",
      "icon": "🧥",
      "parameters": {},
      "produces": {
        "parts": [],
        "hardware": ["rod_bracket_25mm", "chrome_rod_25mm"]
      },
      "structural_impact": {
        "requires_fixed_shelf_above": true,
        "requires_fixed_shelf_below": false,
        "requires_back_panel": false,
        "requires_separator": false,
        "min_depth_mm": 550,
        "min_height_mm": 1600,
        "affects_load": true,
        "incompatible_with": [],
        "depends_on": []
      },
      "constraints": []
    },

    "shoe_rack_inclined": {
      "id": "shoe_rack_inclined",
      "name": "Range-chaussures incliné",
      "icon": "👟",
      "parameters": {
        "tiers": {"type": "integer", "min": 2, "max": 8, "default": 4}
      },
      "produces": {
        "parts": ["tablette-inclinee"],
        "hardware": ["shelf_pin_5mm"]
      },
      "structural_impact": {
        "requires_fixed_shelf_above": false,
        "requires_fixed_shelf_below": true,
        "requires_back_panel": true,
        "requires_separator": false,
        "min_depth_mm": 250,
        "affects_load": false,
        "incompatible_with": [],
        "depends_on": []
      },
      "constraints": []
    },

    "tv_niche": {
      "id": "tv_niche",
      "name": "Niche multimédia",
      "icon": "📺",
      "parameters": {
        "ventilated_back": {"type": "boolean", "default": true}
      },
      "produces": {
        "parts": [],
        "hardware": ["cable_pass_60mm"]
      },
      "structural_impact": {
        "requires_fixed_shelf_above": true,
        "requires_fixed_shelf_below": true,
        "requires_back_panel": false,
        "requires_separator": false,
        "min_depth_mm": 350,
        "min_height_mm": 150,
        "affects_load": false,
        "incompatible_with": [],
        "depends_on": []
      },
      "constraints": [
        {
          "condition": "ventilated_back == false",
          "severity": "warning",
          "blocking": false,
          "message": "Ventilation arrière désactivée : risque de surchauffe des appareils"
        }
      ]
    },

    "wine_rack": {
      "id": "wine_rack",
      "name": "Casier à bouteilles",
      "icon": "🍷",
      "parameters": {
        "columns": {"type": "integer", "min": 1, "max": 10, "default": 4},
        "rows": {"type": "integer", "min": 1, "max": 10, "default": 4}
      },
      "produces": {
        "parts": ["croisillon"],
        "hardware": []
      },
      "structural_impact": {
        "requires_fixed_shelf_above": true,
        "requires_fixed_shelf_below": true,
        "requires_back_panel": true,
        "requires_separator": false,
        "min_depth_mm": 340,
        "affects_load": true,
        "incompatible_with": [],
        "depends_on": []
      },
      "constraints": [
        {
          "condition": "columns * rows > 30",
          "severity": "warning",
          "blocking": false,
          "message": "Plus de 30 bouteilles (~40kg) : vérifier la structure porteuse"
        }
      ]
    },

    "bench_storage": {
      "id": "bench_storage",
      "name": "Banquette coffre",
      "icon": "🪑",
      "parameters": {
        "has_backrest": {"type": "boolean", "default": false}
      },
      "produces": {
        "parts": ["assise", "coffre-fond", "coffre-cotes"],
        "hardware": ["gas_strut", "piano_hinge"]
      },
      "structural_impact": {
        "requires_fixed_shelf_above": false,
        "requires_fixed_shelf_below": false,
        "requires_back_panel": true,
        "requires_separator": false,
        "min_depth_mm": 400,
        "affects_load": true,
        "incompatible_with": ["hanging_rod_short", "hanging_rod_long"],
        "depends_on": []
      },
      "constraints": [
        {
          "condition": "zone_height_mm < 420 || zone_height_mm > 480",
          "severity": "warning",
          "blocking": false,
          "message": "Hauteur d'assise idéale : 420-480mm"
        }
      ]
    }
  }
}
```

---

## 4. Les 4 écrans

### Écran 1 — Type
17 cartes visuelles + bouton IA libre.
Source : `projets` (17 types).

### Écran 2 — Espace
4 champs (L, H, P, plinthe) + type de mur + matériau.
Pré-rempli depuis `projets[type].dimensions_defaut`.
Toutes les saisies en mm.

### Écran 3 — Organisation (deux modes)

**Mode principal — "Contenu à ranger"**
L'utilisateur décrit ce qu'il range (quantités par catégorie).
Le layout engine + contentAnalyzer génèrent automatiquement
les zones et modules optimaux.

**Mode avancé — "Configurateur"**
L'utilisateur compose manuellement ses zones (modules empilés).
Variantes rapides en boutons.

Le mode contenu est le mode par défaut pour les non-experts.
Le mode configurateur est accessible via un toggle "Mode avancé".

### Écran 4 — Résultat (dashboard dépliable)
- Résumé visuel (vue de face cotée)
- Alertes hiérarchisées (errors/warnings/suggestions/info)
- Hypothèses du moteur (bloc transparent)
- Sections dépliables : courses, coupe, perçage, quincaillerie, notice
- Modifier le projet (éditeur détaillé)
- Export PDF

---

## 5. Structure du code

```
src/lib/
├── knowledge/
│   ├── index.ts              ← charge base_v3_normalized.json
│   ├── types.ts              ← tous les types ci-dessus
│   ├── modules.ts            ← catalogue des 8 modules typés
│   └── contentAnalyzer.ts    ← contenu → zones optimales
│
├── engine/
│   ├── intent.ts             ← valide et normalise l'intention
│   ├── layout.ts             ← intent → disposition zones/modules  ★ CŒUR PRODUIT
│   ├── structure.ts          ← layout → squelette (tablettes fixes, fond, contreventement)
│   ├── geometry.ts           ← structure → pièces cotées (formules F_CON_*)
│   ├── hardware.ts           ← pièces → quincaillerie (formules F_QUI_*)
│   ├── validation.ts         ← vérification 4 niveaux + blocking
│   └── production.ts         ← tout → livrables + hypothèses
│
├── engine/__tests__/
│   ├── pipeline.test.ts      ← 10 tests (5 happy + 5 edge cases)
│   ├── layout.test.ts        ← tests du layout engine isolé
│   └── geometry.test.ts      ← tests des formules de calcul
│
├── domain/                   ← existant conservé
├── nesting.ts                ← existant conservé
├── pdf.ts                    ← existant enrichi
└── storage.ts                ← existant conservé

src/components/
├── wizard/
│   ├── StepType.tsx
│   ├── StepSpace.tsx
│   ├── StepOrganize.tsx
│   └── ContentMode.tsx       ← mode "contenu à ranger"
│
├── result/
│   ├── Dashboard.tsx
│   ├── ShoppingList.tsx
│   ├── CuttingPlans.tsx
│   ├── DrillingPlans.tsx
│   ├── AssemblyGuide.tsx
│   ├── HardwareDetail.tsx
│   ├── Assumptions.tsx       ← bloc hypothèses du moteur
│   └── ProjectEditor.tsx
│
└── shared/
    ├── ValidationBadge.tsx
    ├── FacadeView.tsx
    └── AIChatButton.tsx
```

---

## 6. Plan d'implémentation révisé

### Phase 1 — Le moteur (3 sessions)
**Priorité : layout engine d'abord, c'est le cœur produit.**
1. Types TypeScript (`types.ts`) — tous les types de ce document
2. `knowledge/index.ts` — chargement base normalisée
3. `knowledge/modules.ts` — catalogue 8 modules avec structural_impact
4. `engine/layout.ts` — LE cœur : intent → zones → modules
5. `engine/structure.ts` — zones → squelette (tablettes fixes, fond, contreventement)
6. `engine/geometry.ts` — squelette → pièces cotées
7. `engine/hardware.ts` — pièces → quincaillerie
8. 10 tests d'intégration (5 happy + 5 edge cases)

### Phase 2 — Le wizard (2 sessions)
1. `StepType.tsx` — 17 cartes
2. `StepSpace.tsx` — dimensions + mur + matériau
3. `StepOrganize.tsx` — configurateur de zones (mode avancé)
4. Connexion wizard → pipeline → résultat

### Phase 3 — Le résultat (2 sessions)
1. `Dashboard.tsx` — résumé + sections dépliables
2. `ShoppingList.tsx` — panneaux + quincaillerie + coût
3. `AssemblyGuide.tsx` — 12 étapes contextualisées
4. `Assumptions.tsx` — hypothèses transparentes
5. `ValidationBadge.tsx` — 4 niveaux + blocking
6. PDF enrichi

### Phase 4 — Mode contenu (1-2 sessions)
1. `ContentMode.tsx` — saisie contenu à ranger
2. `contentAnalyzer.ts` — contenu → zones optimales
3. Connexion au layout engine
4. Presets ("Dressing couple", "Bibliothèque lecteur", "Entrée famille")

### Phase 5 — Polish (continu)
- Contraintes chantier (murs pas droits, tuyaux)
- Plans de perçage interactifs
- Liens d'achat quincaillerie
- Photo du mur → suggestions IA
- PWA offline renforcé

---

## 7. Tests d'intégration — 10 scénarios

### Happy paths
1. Bibliothèque standard 2000×800×300mm CP18, 5 étagères
2. Placard 2 portes 2400×1200×600mm mélaminé, penderie + tiroirs
3. Cuisine bas casserolier 720×600×560mm, 3 tiroirs progressifs
4. Meuble TV suspendu 1600×400×450mm, niche + 2 compartiments
5. Commode 4 tiroirs progressifs 900×1000×500mm

### Edge cases
6. Penderie profondeur 450mm → error blocking "profondeur insuffisante"
7. Bibliothèque 1200mm en particules → warning "portée excessive"
8. Meuble haut suspendu sur placo → warning "vérifier montants"
9. Tiroirs 900mm de large → warning "coulisses renforcées"
10. Override manuel d'une pièce → vérifier que le pipeline ne l'écrase pas

---

## 8. Décisions confirmées

| Sujet | Décision | Raison |
|-------|----------|--------|
| Pipeline | 7 étapes (ajout "structure") | Éviter monolithe geometry |
| ModuleConfig | Union discriminée typée | Sécurité TypeScript |
| Modules | structural_impact obligatoire | Le moteur doit savoir ce que chaque module exige |
| Base moteur | base_v3_normalized.json | Déjà compilée, tout en mm |
| Layout engine | Développé en Phase 1 | C'est le cœur produit |
| Mode contenu | Mode par défaut, configurateur = avancé | Différenciateur produit |
| Override | 3 niveaux (none/layout/manual) + locked par pièce | Simple et suffisant |
| Logique complexe | En TypeScript, pas en JSON | Maintenabilité |
| Validation | 4 niveaux + blocking boolean | Actionnable par l'UI |
| Hypothèses | Bloc transparent dans production | Confiance utilisateur |
| Contraintes chantier | Champ prévu, implémentation Phase 5 | Pragmatisme |
| Tests | 10 (5 happy + 5 edge) | Couverture correcte |

---

## Résumé en une phrase

> **"J'ai 20 chemises, 5 manteaux et 30 paires de chaussettes" 
> → l'app génère un dressing avec double penderie, 3 tiroirs 
> et des étagères, calcule les 16 pièces au mm, sélectionne 
> les 12 charnières et 6 paires de coulisses, vérifie que le 
> placo tiendra le poids, et produit le PDF pour l'atelier.**
