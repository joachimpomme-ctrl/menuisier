# Golden tests métier V3

## Objectif

Ce harnais fige des sorties de référence du moteur V3 pour détecter toute modification silencieuse de `runPipeline(rawIntent: ProjectIntent): PipelineResult`.

Les golden tests appellent uniquement `runPipeline()`. Ils n'appellent pas `pipelineResultToAppState()`, `generatedPartsToLegacy()` ni les flux legacy/UI.

## Ajouter un nouveau cas

1. Créer un dossier `tests/golden/<slug>/`.
2. Ajouter `intent.json` avec un `ProjectIntent` valide.
3. Générer `expected.json` depuis la sortie courante de `runPipeline(intent)`.
4. Ne conserver dans `expected.json` que `layout`, `issues`, `pieces`, `hardware` et `_ignore_paths`.
5. Ajouter un `README.md` de cas indiquant l'ID catalogue, le titre, la famille et les codes d'issues attendus.
6. Lancer `npm run test:golden`.
7. Committer le nouveau cas avec une justification métier claire.

## Régénérer un `expected.json`

La régénération d'un golden est une modification de contrat moteur. Elle doit être faite uniquement avec une justification métier explicite, dans un commit séparé :

```text
golden: update <cas> — <raison>
```

Procédure :

1. Exécuter localement `runPipeline()` sur le `intent.json` du cas.
2. Remplacer `expected.json` par la nouvelle sortie projetée.
3. Conserver les `_ignore_paths` strictement nécessaires.
4. Expliquer dans le commit pourquoi le nouveau comportement est souhaité.

## Règles d'assertion

Le runner compare uniquement :

- `layout`
- `issues`, réduites à `{ code, severity, blocking }`
- `pieces`
- `hardware`

Le premier lot n'asserte pas `production` ni `procurement`.

`_ignore_paths` accepte des chemins dot-path avec wildcard tableau :

```json
{
  "_ignore_paths": [
    "pieces[*].id",
    "hardware[*].id"
  ]
}
```

Ces chemins sont supprimés de l'attendu et de la sortie réelle avant comparaison.

**Limitation :** les chemins `_ignore_paths` ne supportent pas les clés contenant un point littéral. Un chemin comme `a.b[*].id` est interprété comme deux segments (`a` puis `b[*].id`), pas comme une clé `a.b`.

## Couverture et limites connues

| Code d'issue | Cas couvrant | Source |
| --- | --- | --- |
| Aucun code bloquant attendu | `a1-bibliotheque-simple` | Cas nominal A1 |
| `MOD_SHELF_ADJUSTABLE_C0` | `a2-bibliotheque-melamine-flechi` | `src/lib/knowledge/modules.ts` |
| `LAY_DEPTH_MIN`, `VAL_DEPTH_WARDROBE`, `VAL_ROD_DEPTH` | `b3-profondeur-insuffisante` | `src/lib/engine/layout.ts`, `src/lib/engine/validation.ts` |
| `LAY_MULTI_BODY` | `b1-multi-corps-split` | `src/lib/engine/layout.ts` |
| Sortie contents via `runPipeline()` | `e1-bibliotheque-livres` | `ProjectIntent.contents` |

Règles explicitement non couvertes dans ce premier lot :

- `RT_004` dans `src/lib/engine/validation.ts`
- `VAL_SHELF_SPAN` dans `src/lib/engine/validation.ts`

Ces règles impératives de flèche sont une tâche aveugle reconnue. Elles devront être couvertes par un ticket ultérieur avec un cas conçu pour dépasser `maxSpan18` après découpe effective des corps.
