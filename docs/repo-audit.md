# Audit repo Menuisier - Pipeline V3 et ESLint

Date: 2026-04-19  
Branche auditée: `codex/audit-repo-eslint-cleanup`

## 1. Arbre moteur pertinent de `src/`

UI ignorée, profondeur limitée aux zones utiles au moteur V3.

```text
src/
├── data/
│   ├── knowledge.ts
│   └── materials.ts
└── lib/
    ├── engine/
    │   ├── drilling.ts
    │   ├── edgeBanding.ts
    │   ├── facade2d.ts
    │   ├── geometry.ts
    │   ├── hardware.ts
    │   ├── intent.ts
    │   ├── layout.ts
    │   ├── pipeline.ts
    │   ├── procurement.ts
    │   ├── production.ts
    │   ├── structure.ts
    │   ├── validation.ts
    │   └── __tests__/
    ├── knowledge/
    │   ├── contentAnalyzer.ts
    │   ├── index.ts
    │   ├── modules.ts
    │   ├── types.ts
    │   ├── rules/
    │   └── __tests__/
    └── wizard/
        ├── variantToResult.ts
        └── __tests__/
```

## 2. Inventaire des modules moteur V3

| Module | Chemin | Fichiers principaux | Role |
| --- | --- | --- | --- |
| Pipeline | `src/lib/engine/` | `pipeline.ts` | Orchestre le flux intent -> layout -> structure -> pieces -> hardware -> validation -> production -> procurement. |
| Intent | `src/lib/engine/` | `intent.ts` | Valide et normalise le `ProjectIntent` avant execution du pipeline. |
| Layout | `src/lib/engine/` | `layout.ts` | Decoupe le meuble en corps, construit les zones et produit les issues de disposition. |
| Structure | `src/lib/engine/` | `structure.ts` | Convertit le layout en structure de corps exploitable par la geometrie. |
| Geometry | `src/lib/engine/` | `geometry.ts`, `drilling.ts`, `edgeBanding.ts`, `facade2d.ts` | Genere les pieces, percages, chants et modeles derives. |
| Hardware | `src/lib/engine/` | `hardware.ts` | Selectionne la quincaillerie a partir des pieces, de la structure et de l'intention. |
| Validation | `src/lib/engine/` | `validation.ts`, `intent.ts`, checks locaux de `layout.ts` | Produit les `ValidationIssue` moteur et les controles de faisabilite. |
| Production | `src/lib/engine/` | `production.ts`, `procurement.ts` | Genere les sorties atelier, achats, plans et resume projet. |
| Knowledge | `src/lib/knowledge/` | `index.ts`, `types.ts`, `modules.ts`, `contentAnalyzer.ts` | Charge la KB JSON, expose les types V3, les presets projet et le catalogue modules. |
| Rules | `src/lib/knowledge/rules/` | `thresholds.ts` | Centralise les seuils metier consommes par le moteur. |
| Bridge | `src/lib/engine/pipeline.ts`, `src/lib/knowledge/types.ts` | `pipelineResultToAppState()`, `generatedPartsToLegacy()` | Convertit les sorties V3 vers les structures legacy de l'application. |

## 3. Point d'entree V3

Point d'entree identifie: `runPipeline()` dans `src/lib/engine/pipeline.ts:59`.

Signature TypeScript complete:

```ts
export function runPipeline(rawIntent: ProjectIntent): PipelineResult
```

Type d'entree:

- `ProjectIntent`, defini dans `src/lib/knowledge/types.ts:63`.
- Champs principaux: `furniture_type`, `space`, `material_key`, `variant`, `contents`, `zones`, `site_constraints`, overrides portes/suspension.

Type de sortie:

- `PipelineResult`, defini dans `src/lib/engine/pipeline.ts:38`.
- Champs retournes: `intent`, `layout`, `structure`, `parts`, `hardware`, `validation`, `production`, `procurement`.
- `Layout`, `Structure`, `GeneratedPart`, `HardwareItem`, `ValidationIssue`, `ProductionOutput` et `ProjectStateV3` sont definis dans `src/lib/knowledge/types.ts`.
- `ProcurementView` est defini dans `src/lib/engine/procurement.ts`.

Ce point d'entree recoit un intent et retourne un resultat structure complet incluant layout, issues de validation, pieces, quincaillerie, production et achats.

## 4. Bridge V3 vers legacy

Bridge principal: `pipelineResultToAppState(result: PipelineResult, materialKey: MaterialKey): ProjectStateV3` dans `src/lib/engine/pipeline.ts:138`.

Il transforme un `PipelineResult` V3 en `ProjectStateV3` compatible avec l'editeur historique: conversion des dimensions mm vers cm, conservation des pieces, corps, quincaillerie, issues et assumptions. Ce bridge s'appuie sur `generatedPartsToLegacy(parts: GeneratedPart[], layout: Layout): { bodies: Body[] }` dans `src/lib/knowledge/types.ts:439`, qui reconstruit les `Body[]` legacy a partir des pieces V3.

Statut: hors perimetre de tous les tickets.

## 5. Tests existants

Etat observe apres correction ESLint:

- Commande: `npm run test`
- Resultat global: `43 passed | 1 skipped (44)` fichiers
- Tests: `431 passed | 11 todo (442)`
- Le fichier `src/lib/__tests__/sharedBoundary.todo.test.ts` contient les 11 `it.todo`.

| Fichier | Nombre de tests declares | Etat |
| --- | ---: | --- |
| `src/components/__tests__/Assumptions.test.ts` | 4 | passe |
| `src/components/__tests__/HelpGuide.test.ts` | 5 | passe |
| `src/components/__tests__/MoreMenu.test.tsx` | 5 | passe |
| `src/components/result/__tests__/Facade2DView.test.ts` | 6 | passe |
| `src/lib/__tests__/actions.test.ts` | 28 | passe |
| `src/lib/__tests__/aiPatch.test.ts` | 13 | passe |
| `src/lib/__tests__/bodyWidthAutoFill.test.ts` | 4 | passe |
| `src/lib/__tests__/cost.test.ts` | 4 | passe |
| `src/lib/__tests__/csv.test.ts` | 4 | passe |
| `src/lib/__tests__/domain.test.ts` | 45 | passe |
| `src/lib/__tests__/doorCoverage.test.ts` | 4 | passe |
| `src/lib/__tests__/helpers.test.ts` | 50 | passe |
| `src/lib/__tests__/nesting.test.ts` | 9 | passe |
| `src/lib/__tests__/normalizeProject.test.ts` | 11 | passe |
| `src/lib/__tests__/partsLibrary.test.ts` | 4 | passe |
| `src/lib/__tests__/projectAnalysis.test.ts` | 9 | passe |
| `src/lib/__tests__/sharedBoundary.characterization.test.ts` | 10 | passe |
| `src/lib/__tests__/sharedBoundary.todo.test.ts` | 11 | todo |
| `src/lib/__tests__/steps.test.ts` | 5 | passe |
| `src/lib/__tests__/storageV3.test.ts` | 6 | passe |
| `src/lib/__tests__/validation.test.ts` | 11 | passe |
| `src/lib/actions/__tests__/pieceFromLibrary.test.ts` | 8 | passe |
| `src/lib/drilling/__tests__/formatDrillingPlan.test.ts` | 7 | passe |
| `src/lib/engine/__tests__/assumptions.test.ts` | 9 | passe |
| `src/lib/engine/__tests__/bridge.test.ts` | 8 | passe |
| `src/lib/engine/__tests__/drilling.test.ts` | 19 | passe |
| `src/lib/engine/__tests__/edgeBanding.test.ts` | 7 | passe |
| `src/lib/engine/__tests__/edgeBandingProduction.test.ts` | 4 | passe |
| `src/lib/engine/__tests__/facade2d.test.ts` | 16 | passe |
| `src/lib/engine/__tests__/geometry.test.ts` | 6 | passe |
| `src/lib/engine/__tests__/hardware.test.ts` | 4 | passe |
| `src/lib/engine/__tests__/intent.test.ts` | 4 | passe |
| `src/lib/engine/__tests__/layout.test.ts` | 15 | passe |
| `src/lib/engine/__tests__/newModulesGeometry.test.ts` | 3 | passe |
| `src/lib/engine/__tests__/pipeline.test.ts` | 14 | passe |
| `src/lib/engine/__tests__/procurement.test.ts` | 15 | passe |
| `src/lib/engine/__tests__/structure.test.ts` | 4 | passe |
| `src/lib/engine/__tests__/typeAudit.test.ts` | 1 | passe |
| `src/lib/engine/__tests__/validation.test.ts` | 5 | passe |
| `src/lib/engine/__tests__/validationRules.test.ts` | 8 | passe |
| `src/lib/engine/__tests__/variants.test.ts` | 9 | passe |
| `src/lib/knowledge/__tests__/contentAnalyzer.test.ts` | 5 | passe |
| `src/lib/knowledge/__tests__/index.test.ts` | 9 | passe |
| `src/lib/wizard/__tests__/variantToResult.test.ts` | 18 | passe |

## 6. Fichiers KB

- JSON principal: `public/knowledge/base_v3_normalized.json`.
- Presets projets: champ `projets` dans `public/knowledge/base_v3_normalized.json:4393`.
- Regles transversales: champ `regles_transversales` dans `public/knowledge/base_v3_normalized.json:6091`.
- Loader KB: `src/lib/knowledge/index.ts`, charge `/knowledge/base_v3_normalized.json`.
- Catalogue modules: `src/lib/knowledge/modules.ts:61`, export `MODULE_CATALOG` avec 8 modules. Aucun fichier JSON module separe n'a ete trouve dans `public/knowledge`.
- KB statique complementaire: `src/data/knowledge.ts`, contient notamment proprietes mecaniques, regles systeme 32, charnieres, portes et tiroirs.

## 7. Validation moteur

Fichier de validation principal: `src/lib/engine/validation.ts`.

- Longueur: 370 lignes.
- Penderie / profondeur minimale:
  - Bloc 1 visible dans `validateProject`: lignes 119-138, `VAL_DEPTH_WARDROBE`.
  - Bloc 2 visible plus bas: lignes 310-323, `VAL_ROD_DEPTH`.
- Poids de porte:
  - Bloc 1 visible dans `validateProject`: lignes 140-168, `VAL_DOOR_WEIGHT` et `VAL_DOOR_WEIGHT_MAX`.
  - Bloc 2 visible plus bas: lignes 325-340, `VAL_DOOR_WEIGHT`.
- Anti-basculement:
  - Bloc 1 visible dans `validateProject`: lignes 170-190, `RT_001`.
  - Bloc 2 visible plus bas: lignes 342-353, `VAL_ANTI_TIP`.

Doublons visibles: oui. Les controles penderie, poids de porte et anti-basculement apparaissent dans deux zones distinctes du fichier. L'audit ne modifie pas ces regles.

## 8. Verification des commandes

Commandes executees:

```text
npm run lint       -> passe
npm run typecheck  -> passe
npm run test       -> passe, 431 passed | 11 todo
npm run build      -> passe
```

Notes build: Vite signale des warnings existants de chunk size et d'import dynamique inefficace. Ils ne bloquent pas la compilation.

## 9. Alertes metier potentielles

Aucune alerte metier potentielle issue du lint n'a ete identifiee pendant ce ticket.
