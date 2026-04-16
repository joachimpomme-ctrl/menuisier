# Séquencement Claude Code — Le Menuisier v3.1
# VERSION CORRIGÉE FINALE — Approche vertical slice

## Principes

1. **Vertical slice d'abord** : un pipeline minimal qui TOURNE de bout en bout sur un cas simple avant d'enrichir quoi que ce soit.
2. **L'app existante ne casse jamais** : chaque prompt laisse `npm run dev` fonctionnel.
3. **Chaque prompt = compilable + testable** : on ne passe au suivant que si ça passe.

## Avant de commencer

Placer dans le repo :
- `public/knowledge/base_v3_normalized.json` (184 Ko)
- `ARCHITECTURE_V3.1_FINAL.md` à la racine

## 3 phases

| Phase | Prompts | Objectif |
|-------|---------|----------|
| **A. Fondations** | 0 → 3 | Lire, auditer, types, base, modules |
| **B. Vertical slice** | 4 → 11b | Pipeline minimal bout en bout + UI minimale |
| **C. Enrichissement** | 12 → 18 | Hardware, validation, production, contenu, pièces standard |

**Phase B est la clé.** Si le prompt 11b fonctionne (bibliothèque générée → visible dans l'éditeur existant), la v3 est viable. Phase C enrichit sans risque.

---

# PHASE A — FONDATIONS

## PROMPT 0 — Lecture

```
Tu travailles sur une application EXISTANTE de conception de meubles sur mesure.
Production : https://menuisier-six.vercel.app — Stack : React + Vite + TypeScript + Vercel.

Lis dans cet ordre :
1. ARCHITECTURE_V3.1_FINAL.md
2. public/knowledge/base_v3_normalized.json (184Ko)
3. src/types.ts
4. src/App.tsx
5. src/components/NewProjectWizard.tsx
6. src/data/materials.ts
7. src/data/templates.ts
8. src/lib/validation.ts
9. src/lib/nesting.ts
10. src/lib/domain/
11. src/hooks/
12. src/lib/steps.ts

Ne modifie rien. Résumé attendu :
- Ce qu'on conserve tel quel
- Ce qu'on étend
- Ce qu'on remplace
- Ce qu'on crée

Confirme ta compréhension : pipeline 7 étapes, 4 écrans, 8 modules,
configurateur de zones = mode principal, contenu à ranger = bonus optionnel.
```

## PROMPT 0bis — Audit de compatibilité

```
Analyse base_v3_normalized.json, src/types.ts et src/App.tsx. NE CODE RIEN.

Identifie précisément :

1. MAPPING AppState ↔ Pipeline v3
   - Comment convertir GeneratedPart[] (v3) en Body[] + Piece[] (existant) ?
   - Quels champs de AppState sont conservés ?
   - Quels champs ajoutés ? (intent, hardware_list, validation_issues, assumptions)
   - Est-ce que ProjectStateV3 extends AppState fonctionne sans casser le code existant ?

2. TYPES EXISTANTS vs NOUVEAUX
   - PieceType actuel couvre-t-il tous les types que geometry.ts va générer ?
   - MaterialKey = 6 matériaux — suffisant ?

3. BASE NORMALISÉE
   - Vérifie que les formulas sont évaluables en TypeScript
   - Signale toute incohérence d'unité (tout doit être mm)

4. MATERIALS.TS — UNITÉS
   - defaultThickness : mm ou 1/10mm ?
   - maxSpan18 : cm ou mm ?
   - Lister les conversions nécessaires

5. CONTRAT DE COMPATIBILITÉ
   - Signature de la fonction GeneratedPart[] → Body[]
   - Champs à ajouter à AppState sans casser l'existant
   - Imports croisés nécessaires

Produis un rapport structuré. Pas de code.
```

## PROMPT 1 — Types

```
Crée src/lib/knowledge/types.ts

NE PAS modifier src/types.ts. Importer PieceType, MaterialKey, AppState, Body, Piece depuis '../../types'.

Intégrer les conclusions du prompt 0bis (compatibilité, unités, mapping).

TYPES À CRÉER :

FurnitureType (17 ids), WallType, SpaceDimensions, ContentItem, SiteConstraint,
ProjectIntent,
ModuleConfig (union discriminée, 8 variantes avec champ "type" discriminant),
ZoneConfig, DoorLayout, BodyLayout, Layout,
FixedShelfPlacement, BackPanelSpec, BracingType, WallMounting, PlinthSpec, BodyStructure, Structure,
EdgeBandingSide, DrillingOp, GeneratedPart (avec locked: boolean, standard_part_id?: string),
HardwareCategory, HardwareItem,
ValidationSeverity, ValidationIssue (avec blocking: boolean),
Assumption, AssemblyStep, PanelNeed, ShoppingList, ProjectSummary, ProductionOutput,
OverrideLevel,
ProjectStateV3 extends AppState,
StandardPartCategory, PreDrilling, PartSource, StandardPart, UserPartsLibrary.

FONCTION DE CONVERSION (identifiée au 0bis) :
export function generatedPartsToLegacy(parts: GeneratedPart[], intent: ProjectIntent): { bodies: Body[] }

Vérifier : npx tsc --noEmit
```

## PROMPT 2 — Chargement base

```
Crée src/lib/knowledge/index.ts

NE PAS toucher src/lib/knowledgeStore.ts (gère les uploads user).

1. Fetch /knowledge/base_v3_normalized.json au runtime, cache module-level
2. Exposer :
   - loadKnowledge(): Promise<void>
   - isLoaded(): boolean
   - getProjectPreset(type: FurnitureType)
   - getModule(id: string)
   - getFormula(id: string)
   - getTransversalRules()
   - getObjectReference(category: string)
   - getErgonomics(furnitureType: string)
3. Si fetch échoue → log erreur, valeurs vides

Vérifier : npx tsc --noEmit
```

## PROMPT 3 — Modules

```
Crée src/lib/knowledge/modules.ts

ModuleDefinition avec structural_impact complet :
{ requires_fixed_shelf_above, requires_fixed_shelf_below, requires_back_panel,
  requires_separator, min_depth_mm, min_height_mm?, affects_load,
  incompatible_with[], depends_on[] }

MODULE_CATALOG : 8 modules (shelf_adjustable, drawer_stack, hanging_rod_short,
hanging_rod_long, shoe_rack_inclined, tv_niche, wine_rack, bench_storage)
tel que défini dans ARCHITECTURE_V3.1_FINAL.md section 3.

Fonctions : getModuleDefinition, getAllModules, getModulesForFurnitureType,
validateModuleConfig.

Vérifier : npx tsc --noEmit
```

---

# PHASE B — VERTICAL SLICE MINIMAL

> Pipeline qui TOURNE sur une bibliothèque simple.
> Pas de multicorps, pas de contenu, pas de hardware, pas de validation enrichie.

## PROMPT 4 — Intent

```
Crée src/lib/engine/intent.ts

export function validateIntent(intent: ProjectIntent):
  { valid: boolean, normalized: ProjectIntent, issues: ValidationIssue[] }

- Vérifier furniture_type (17 valides)
- Dimensions : width 200-6000, height 200-3000, depth 100-1000, plinth 0-200 mm
- Si manquantes → remplir depuis getProjectPreset
- wall_type "unknown" → warning non bloquant

Tests src/lib/engine/__tests__/intent.test.ts (4 tests)
npx vitest run src/lib/engine/__tests__/intent.test.ts
```

## PROMPT 5 — Layout SIMPLE

```
Crée src/lib/engine/layout.ts — VERSION SIMPLE mono-corps.

export function generateLayout(intent: ProjectIntent): Layout

1. UN SEUL CORPS aux dimensions de l'espace (pas de multicorps)

2. SI intent.zones → les utiliser, vérifier modules et contraintes

3. SI PAS DE ZONES → layout par défaut minimal :
   bibliothèque → 4× shelf_adjustable
   placard → hanging_rod_short + 2× drawer_stack
   autres → shelf_adjustable

4. PORTES simples :
   placard/armoire/cuisine/sdb → portes, 1 si L≤500mm, 2 sinon, full_overlay

NE PAS implémenter : multicorps, contenu, variantes presets.

Tests (3 tests) : biblio avec zones, placard avec zones, penderie trop peu profonde.
npx vitest run src/lib/engine/__tests__/layout.test.ts
```

## PROMPT 6 — Structure

```
Crée src/lib/engine/structure.ts

export function generateStructure(layout: Layout, intent: ProjectIntent): Structure

Décide les INVARIANTS DE FABRICATION, pas geometry :

1. TABLETTES FIXES — depuis structural_impact des modules
   Dédupliquer aux jonctions. Toujours une en haut et en bas.

2. FOND — défaut groove 5mm. Suspendu → recess 15mm.

3. CONTREVENTEMENT — back_panel / combined / rear_crossbar selon H et L

4. PLINTHE — adjustable_legs si plinth_mm > 0

5. FIXATION — rail si suspendu, anti-basculement si H > 1500mm

Tests (4 tests) : drawer_stack → tablettes fixes, 2000mm → combined,
suspendu → recess, 1800mm → anti-basculement.
npx vitest run src/lib/engine/__tests__/structure.test.ts
```

## PROMPT 7 — Geometry SIMPLE

```
Crée src/lib/engine/geometry.ts

CONTRAINTE CRITIQUE : chaque formule = une fonction helper NOMMÉE et EXPORTÉE.

Créer ces helpers (fonctions pures) :
- computeInnerWidth(bodyWidth_mm, panelThickness_mm)
- computeInnerHeight(bodyHeight_mm, panelThickness_mm)
- computeOverlayDoorWidth(bodyOuterWidth_mm, overlay_mm, gap_mm)
- computeOverlayDoubleDoorWidth(bodyOuterWidth_mm, overlay_mm, gapBetween_mm)
- computeInsetDoorWidth(innerWidth_mm, gap_mm)
- computeDoorHeight(zoneHeight_mm, overlayTop_mm, overlayBot_mm, gapTop_mm, gapBot_mm)
- computeDrawerBoxWidth(innerWidth_mm, slideClearance_mm)
- computeDrawerBoxDepth(innerDepth_mm, rearGap_mm)
- computeProgressiveDrawerFronts(zoneHeight_mm, count, gapTop, gapBot, gapBetween, step_mm): number[]
- computeBackPanelDimensions(spec: BackPanelSpec, bodyW, bodyH, grooveDepth): {w, h}
- computeShelfDimensions(innerW, depth, backThickness): {length, width}

Fonction principale :
export function generateParts(structure, layout, intent): GeneratedPart[]

IMPORTANT — LOCKED : si une pièce existante a locked: true, la conserver.

Attention unités materials.ts : vérifier defaultThickness (c'est en mm ×10 
dans le code actuel — ex: 18 = 18mm en affichage mais stocké comme 18 dans 
thicknesses[], et defaultThickness = 18 aussi. À VÉRIFIER au prompt 0bis.)

Pas de drilling/perçage pour l'instant.

Tests (4 tests) : nb pièces biblio, porte 428mm, tiroirs progressifs, fond réduit.
npx vitest run src/lib/engine/__tests__/geometry.test.ts
```

## PROMPT 8 — Pipeline minimal + 3 tests

```
Crée src/lib/engine/pipeline.ts

Pipeline MINIMAL : intent → layout → structure → geometry.
Hardware, validation enrichie et production = placeholders vides.

export function runPipeline(rawIntent: ProjectIntent): {
  intent: ProjectIntent,
  layout: Layout,
  structure: Structure,
  parts: GeneratedPart[],
  hardware: HardwareItem[],       // [] pour l'instant
  validation: ValidationIssue[],  // issues de validateIntent seulement
  production: ProductionOutput | null  // null pour l'instant
}

Si validateIntent → invalid : retourner avec errors, ne pas continuer.

AUSSI créer :
export function pipelineResultToAppState(
  result: ReturnType<typeof runPipeline>, materialKey: MaterialKey
): AppState
→ Utiliser generatedPartsToLegacy() du prompt 1

3 TESTS pipeline.test.ts :
1. Bibliothèque 2000×800×300 CP18, 5 shelf_adjustable → pièces OK, conversion AppState OK
2. Placard 2400×1200×600 méla, penderie + 3 tiroirs + 2 portes → portes et tiroirs présents
3. Penderie profondeur 400mm → error blocking, pipeline s'arrête

npx vitest run src/lib/engine/__tests__/pipeline.test.ts
```

## PROMPT 9 — Wizard minimal

```
Crée 3 composants. NE PAS toucher NewProjectWizard.tsx.

src/components/wizard/StepType.tsx :
- Grille 17 cartes (icône + nom). Au clic → onSelect(type).
- Tailwind, 2 colonnes mobile.

src/components/wizard/StepSpace.tsx :
- 4 champs mm pré-remplis depuis preset. Radio mur. Dropdown matériau (MATERIALS).
- Validation inline. Boutons Retour/Suivant.

src/components/wizard/StepOrganize.tsx — VERSION SIMPLE :
- Liste zones : dropdown module + count. [+ Ajouter zone].
- Sélecteur portes : Sans / 1 / 2.
- Bouton "Générer →" → onGenerate(intent).
- PAS de variantes, PAS de mode contenu (viendront en Phase C).

Vérifier : npx tsc --noEmit
```

## PROMPT 10 — Dashboard minimal

```
Crée src/components/result/Dashboard.tsx — MINIMAL.

Props : intent, result (de runPipeline), onModify, materialKey.

1. Header : nom + dimensions + nb pièces
2. Alertes si issues (rouge errors, orange warnings)
3. Tableau pièces (nom, dimensions, qty, type)
4. Bouton "← Modifier" → retour écran 3
5. Bouton "⚙️ Éditeur classique" → bascule ancien flux avec AppState converti

PAS de shopping list, notice, quincaillerie, PDF enrichi (Phase C).

Vérifier : npx tsc --noEmit
```

## PROMPT 11a — App.tsx : wizard isolé

```
Modifier src/App.tsx de manière NON DESTRUCTIVE.

AJOUTER :
1. Imports wizard/* et result/Dashboard
2. States : v3Mode (false), wizardStep (1-4), currentIntent, pipelineResult
3. Bouton "🆕 Nouveau projet v3" dans le header → v3Mode = true, step = 1
4. Quand v3Mode : afficher wizard steps au lieu des onglets
5. Quand !v3Mode : tout l'ancien flux intact

L'ancien bouton "Nouveau projet" lance toujours l'ancien wizard.

Vérifier : npm run dev
- L'ancien flux marche
- "Nouveau projet v3" affiche StepType
- Navigation Type → Espace → Organisation fonctionne
```

## PROMPT 11b — Branchement pipeline

```
Modifier src/App.tsx : connecter le pipeline.

Quand StepOrganize appelle onGenerate(intent) :
1. runPipeline(intent)
2. Stocker pipelineResult
3. pipelineResultToAppState() → mettre à jour state
4. wizardStep = 4 → Dashboard

Dashboard → "Éditeur classique" :
→ v3Mode = false, l'AppState converti alimente StructureTab, DebitTab, PlanTab, etc.

VÉRIFIER :
- npm run dev
- Bibliothèque → dimensions → 4 étagères → Générer → Dashboard affiche les pièces
- "Éditeur classique" → StructureTab montre les pièces
- DebitTab fonctionne (calepinage)
- Export PDF fonctionne

C'EST LE VERTICAL SLICE. Si ça marche, la v3 est viable.
```

---

# PHASE C — ENRICHISSEMENT

## PROMPT 12 — Hardware

```
Crée src/lib/engine/hardware.ts

export function selectHardware(parts, structure, intent): HardwareItem[]

Portes → charnières (nb = max(2, ceil((H-800)/500)+2)), poids estimé.
Tiroirs → coulisses (longueur arrondie 250-700mm).
Tablettes réglables → 4 taquets Ø5mm.
Assemblage → vis Confirmat (4 par liaison).
Portes/tiroirs → poignées.
H > 1500mm → anti-basculement.
Plinthe → pieds réglables.
Suspendu → rail + boîtiers.
Agréger quantités.

Modifier pipeline.ts : brancher après generateParts.

Tests (4 tests). npx vitest run
```

## PROMPT 13 — Validation enrichie

```
Crée src/lib/engine/validation.ts (NE PAS supprimer src/lib/validation.ts)

export function validateProject(intent, layout, structure, parts, hardware): ValidationIssue[]

4 niveaux + blocking. Portée tablette, penderie 550mm, poids porte,
anti-basculement, charge mur, ergonomie. Règles transversales depuis base.

Modifier pipeline.ts : brancher.

Tests (5 tests). npx vitest run
```

## PROMPT 14 — Production + Dashboard enrichi

```
Crée src/lib/engine/production.ts

export function generateProduction(intent, parts, hardware, structure, validation): ProductionOutput

1. Hypothèses (mur, jeux, fond, charnières...) avec user_should_verify
2. Shopping list (panneaux groupés, quincaillerie, outils, coût estimé)
3. Notice montage (12 étapes contextualisées au projet)
4. Résumé (dimensions, pièces, poids, difficulté)

Modifier pipeline.ts : brancher.

Enrichir Dashboard.tsx — ajouter sections dépliables :
Créer src/components/result/ShoppingList.tsx
Créer src/components/result/AssemblyGuide.tsx
Créer src/components/result/Assumptions.tsx
Créer src/components/result/HardwareDetail.tsx

Bouton "📄 Exporter PDF" (réutiliser pdf.ts existant).

Vérifier visuellement.
```

## PROMPT 15 — Layout avancé + Wizard enrichi

```
Enrichir src/lib/engine/layout.ts :

1. MULTICORPS : maxSpan depuis MATERIALS → diviser si nécessaire
2. LAYOUT PAR DÉFAUT intelligent depuis presets du furniture_type
3. PORTES améliorées (half_overlay montant central)

Enrichir StepOrganize.tsx :
- Boutons variantes rapides (depuis preset.variants)
- Hauteurs custom par zone
- Indicateur hauteur utilisée vs disponible

Tests : 1600mm particules → 2 corps, placard sans zones → défaut cohérent.

npx vitest run
```

## PROMPT 16 — Content Analyzer

```
Crée src/lib/knowledge/contentAnalyzer.ts

export function contentToZones(contents, space, furnitureType): ZoneConfig[]

Vêtements → hanging_rod, shelf, drawer_stack, shoe_rack selon quantités.
Livres → shelf_adjustable avec spacing adapté au format.
Répartition : fréquent au centre, lourd en bas, saisonnier en haut.

Créer src/components/wizard/ContentMode.tsx :
- Modal accessible depuis StepOrganize via bouton discret "📦 Je décris ce que je range"
- Catégories adaptées au furniture_type
- Génère des zones → pré-remplit le configurateur
- CE N'EST PAS le mode par défaut

Tests (3 tests). npx vitest run
```

## PROMPT 17 — Pièces standard

```
Système de pièces standard (produits du commerce réutilisables).

1. src/lib/partsLibrary.ts : CRUD localStorage, seed 10 produits LM
2. src/components/library/PartsLibraryManager.tsx : liste, CRUD, import/export
3. src/components/library/PartSelector.tsx : modal sélection
4. src/components/library/PartForm.tsx : formulaire saisie
5. Modifier geometry.ts : standard_part_id → locked, dimensions fixes
6. Modifier ShoppingList.tsx : séparer standards vs sur mesure
7. Modifier App.tsx : bouton "📦 Ma bibliothèque"

Tests (4 tests). npx vitest run
```

## PROMPT 18 — Tests complets + nettoyage

```
Étendre pipeline.test.ts à 10 tests d'intégration :

HAPPY PATHS :
1. Bibliothèque 2000×800×300 CP18, 5 étagères
2. Placard 2400×1200×600, penderie + tiroirs + portes
3. Cuisine bas 720×600×560, 3 tiroirs progressifs
4. Meuble TV 400×1600×450, niche + étagères
5. Commode 900×1000×500, 4 tiroirs progressifs

EDGE CASES :
6. Penderie 400mm → error blocking
7. Bibliothèque 1600mm particules → 2 corps
8. Suspendu placo → warning
9. Tiroirs 900mm → warning coulisses
10. Pièce locked → non écrasée

npx vitest run — TOUT passe.
npm run build — OK.
npm run dev — OK.
Vérification visuelle complète.
NE PAS supprimer les anciens composants.
```

---

## Résumé final

| Phase | Prompts | Fichiers | Validation |
|-------|---------|----------|-----------|
| A | 0, 0bis, 1, 2, 3 | types + base + modules | tsc |
| B | 4-11b | pipeline + wizard + dashboard MINIMAL | vitest + npm run dev |
| C | 12-18 | hardware + validation + production + contenu + pièces standard | vitest + visuel |

**La clé : le prompt 11b.** Quand une bibliothèque générée par le pipeline s'affiche dans l'éditeur existant, la v3 est viable. Tout le reste est de l'enrichissement.
