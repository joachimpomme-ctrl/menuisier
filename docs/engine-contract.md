# Contrat sémantique moteur V3

## 1. Point d'entrée public

### `run`

Source : `src/core/index.ts`

```ts
export { runPipeline as run } from '../lib/engine/pipeline';
```

Signature effective exposée par l'alias :

```ts
run(rawIntent: ProjectIntent): PipelineResult
```

Types :

| Type | Rôle | Fichier source |
| --- | --- | --- |
| `ProjectIntent` | Type d'entrée | `src/lib/knowledge/types.ts` |
| `PipelineResult` | Type de sortie | `src/lib/engine/pipeline.ts` |

### `runPipeline`

Source : `src/lib/engine/pipeline.ts`

```ts
export function runPipeline(rawIntent: ProjectIntent): PipelineResult
```

Types :

| Type | Rôle | Fichier source |
| --- | --- | --- |
| `ProjectIntent` | Type d'entrée | `src/lib/knowledge/types.ts` |
| `PipelineResult` | Type de sortie | `src/lib/engine/pipeline.ts` |

## 2. Étapes du pipeline

| Étape | Fonction appelée | Fichier source | Type d'entrée → type de sortie | Rôle |
| --- | --- | --- | --- | --- |
| `intent` | `validateIntent` | `src/lib/engine/intent.ts` | `ProjectIntent` → `IntentResult` | Valide un `ProjectIntent`, remplit les dimensions manquantes depuis le preset de base de connaissance, et retourne l'intent normalisé avec les issues trouvées. |
| `layout` | `generateLayout` | `src/lib/engine/layout.ts` | `ProjectIntent` → `LayoutResult` | Reçoit un `ProjectIntent` validé et produit un `Layout`. |
| `structure` | `generateStructure` | `src/lib/engine/structure.ts` | `Layout`, `ProjectIntent` → `Structure` | Décide les invariants de fabrication à partir du `Layout` et du `ProjectIntent`. |
| `geometry` | `generateParts` | `src/lib/engine/geometry.ts` | `Structure`, `Layout`, `ProjectIntent`, `GeneratedPart[]?` → `GeneratedPart[]` | Assemble les formules nommées en `GeneratedPart[]`. |
| `hardware` | `selectHardware` | `src/lib/engine/hardware.ts` | `GeneratedPart[]`, `Structure`, `ProjectIntent` → `HardwareItem[]` | Sélectionne charnières, coulisses, taquets, vis, poignées, fixation murale et quincaillerie de plinthe. |
| `validation` | `validateProject` | `src/lib/engine/validation.ts` | `ProjectIntent`, `Layout`, `Structure`, `GeneratedPart[]`, `HardwareItem[]` → `ValidationIssue[]` | Vérifie les règles structurelles, ergonomiques et de sécurité sur le projet complet. |
| `production` | `generateProduction` | `src/lib/engine/production.ts` | `ProjectIntent`, `GeneratedPart[]`, `HardwareItem[]`, `Structure`, `ValidationIssue[]`, `Layout` → `ProductionOutput` | Retourne `assumptions`, `shopping_list`, `cutting_plans`, `drilling_plans`, `assembly_guide` et `summary`. |
| `procurement` | `resolveProcurement` | `src/lib/engine/procurement.ts` | `GeneratedPart[]` → `ProcurementView` | Résout la procurement pour un jeu de pièces. |

## 3. Règles de validation

### Règles impératives de `src/lib/engine/validation.ts`

| Code | Sévérité | Blocking | Condition déclenchante | Source |
| --- | --- | --- | --- | --- |
| `RT_004` | `warning` | `false` | `shelf.length_mm > maxSpanMm`, avec `maxSpanMm = (mat?.maxSpan18 ?? 80) * 10`. | `src/lib/engine/validation.ts` |
| `VAL_ROD_DEPTH` | `warning` | `false` | `rodZones.length > 0 && intent.space.depth_mm < THRESHOLDS.WARDROBE_ROD_MIN_DEPTH_MM`; `THRESHOLDS.WARDROBE_ROD_MIN_DEPTH_MM = 550`. | `src/lib/engine/validation.ts` |
| `VAL_DOOR_WEIGHT` | `warning` | `false` | `weightKg > THRESHOLDS.DOOR_WEIGHT_REINFORCE_KG`; `THRESHOLDS.DOOR_WEIGHT_REINFORCE_KG = 15`. | `src/lib/engine/validation.ts` |
| `VAL_DOOR_WEIGHT_MAX` | `error` | `true` | `weightKg > THRESHOLDS.SUSPENDED_PLACO_WARN_KG`; `THRESHOLDS.SUSPENDED_PLACO_WARN_KG = 25`. | `src/lib/engine/validation.ts` |
| `VAL_ANTI_TIP` | `warning` | `false` | `intent.space.height_mm > THRESHOLDS.ANTI_TIP_HEIGHT_MM && !SUSPENDED.has(intent.furniture_type)` puis aucun `wall_mounting` de type `anti_tip` ou `rail`; `THRESHOLDS.ANTI_TIP_HEIGHT_MM = 1500`. | `src/lib/engine/validation.ts` |
| `RT_006_LOAD` | `warning` | `false` | `SUSPENDED.has(intent.furniture_type)`, `intent.space.wall_type === 'plasterboard'` et `totalWeight > THRESHOLDS.SUSPENDED_PLACO_WARN_KG`; `THRESHOLDS.SUSPENDED_PLACO_WARN_KG = 25`. | `src/lib/engine/validation.ts` |
| `RT_006_LOAD_MAX` | `error` | `true` | `SUSPENDED.has(intent.furniture_type)` et `totalWeight > THRESHOLDS.SUSPENDED_MAX_KG`; `THRESHOLDS.SUSPENDED_MAX_KG = 50`. | `src/lib/engine/validation.ts` |
| `ERGO_ZONE_ACTIVE` | `info` | `false` | `adjShelves.length > 0 && intent.space.height_mm > 1800`; message `Zone active (${THRESHOLDS.ERGO_ZONE_LOW_MM}–${THRESHOLDS.ERGO_ZONE_HIGH_MM}mm)`, avec `THRESHOLDS.ERGO_ZONE_LOW_MM = 400` et `THRESHOLDS.ERGO_ZONE_HIGH_MM = 1400`. | `src/lib/engine/validation.ts` |
| `RT_009` | `warning` | `false` | `ENTRY_TYPES.has(intent.furniture_type) && intent.space.depth_mm > THRESHOLDS.ENTRY_MAX_DEPTH_MM`; `THRESHOLDS.ENTRY_MAX_DEPTH_MM = 400`. | `src/lib/engine/validation.ts` |
| `RT_013` | `warning` | `false` | Pour chaque zone `wine_rack`, `weightKg > THRESHOLDS.WINE_RACK_WARN_KG`, avec `bottles = cfg.columns * cfg.rows`, `weightKg = bottles * 1.3`, et `THRESHOLDS.WINE_RACK_WARN_KG = 30`. | `src/lib/engine/validation.ts` |
| `RT_010` | `suggestion` | `false` | `VENTILATION_TYPES.has(intent.furniture_type)` puis `layout.bodies.some((b) => b.doors && b.doors.type !== 'none')`. | `src/lib/engine/validation.ts` |
| `VAL_WALL_TYPE_SUSPENDED` | `warning` | `false` | `isSuspended && intent.space.wall_type === 'unknown'`, avec `isSuspended = structure.bodies.some((b) => b.wall_mounting?.type === 'rail')`. | `src/lib/engine/validation.ts` |

### Contraintes déclaratives de `src/lib/knowledge/modules.ts`

Ces règles sont évaluées par `validateZones()` dans `src/lib/engine/layout.ts`. Le `rule_id` est construit sous la forme `MOD_${def.id.toUpperCase()}_C${def.constraints.indexOf(constraint)}`.

| Module | Code | Sévérité | Blocking | Condition déclenchante | Message | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `shelf_adjustable` | `MOD_SHELF_ADJUSTABLE_C0` | `warning` | `false` | `zone_width_mm > 800 && (material == 'melamine' || material == 'osb')` | `Portée > 800mm en mélaminé ou OSB : fléchissement probable` | `src/lib/knowledge/modules.ts` |
| `drawer_stack` | `MOD_DRAWER_STACK_C0` | `warning` | `false` | `zone_width_mm > 800` | `Tiroirs > 800mm : coulisses renforcées recommandées` | `src/lib/knowledge/modules.ts` |
| `hanging_rod_short` | `MOD_HANGING_ROD_SHORT_C0` | `error` | `true` | `zone_depth_mm < 550` | `Profondeur insuffisante pour penderie (min 550mm)` | `src/lib/knowledge/modules.ts` |
| `tv_niche` | `MOD_TV_NICHE_C0` | `warning` | `false` | `ventilated_back == false` | `Ventilation arrière désactivée : risque de surchauffe des appareils` | `src/lib/knowledge/modules.ts` |
| `wine_rack` | `MOD_WINE_RACK_C0` | `warning` | `false` | `columns * rows > 30` | `Plus de 30 bouteilles (~40kg) : vérifier la structure porteuse` | `src/lib/knowledge/modules.ts` |
| `bench_storage` | `MOD_BENCH_STORAGE_C0` | `warning` | `false` | `zone_height_mm < 420 || zone_height_mm > 480` | `Hauteur d'assise idéale : 420-480mm` | `src/lib/knowledge/modules.ts` |

## 4. Limites connues

Règles explicitement non couvertes dans ce premier lot :

- `RT_004` dans `src/lib/engine/validation.ts`
- `VAL_SHELF_SPAN` dans `src/lib/engine/validation.ts`

Ces règles impératives de flèche sont une tâche aveugle reconnue. Elles devront être couvertes par un ticket ultérieur avec un cas conçu pour dépasser `maxSpan18` après découpe effective des corps.

## 5. Tâches aveugles golden

Ces règles impératives de flèche sont une tâche aveugle reconnue. Elles devront être couvertes par un ticket ultérieur avec un cas conçu pour dépasser `maxSpan18` après découpe effective des corps.
