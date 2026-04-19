# Taxonomie déclaratif / calculatoire — Moteur V3

## Principe

Un composant est **déclaratif** si son comportement est entièrement défini par
une structure de données : changer le comportement revient à modifier la donnée,
sans toucher au code. Il est **calculatoire** si le comportement est encodé dans
du code impératif.

Cette taxonomie guide le périmètre du ticket 3.1 (JSON Schema KB) : seuls les
composants déclaratifs sont candidats à une validation par schéma.

---

## Composants déclaratifs

### `MODULE_CATALOG` — `src/lib/knowledge/modules.ts`

Catalogue des 8 modules. Chaque module déclare :

- `structural_impact` : contraintes de fabrication (étagère fixe requise, panneau
  arrière, profondeur min, etc.) — consommées par `generateStructure()`
- `parameters` : bornes et valeurs par défaut des paramètres configurables
- `constraints[]` : règles de validation exprimées comme chaînes de condition
  (`"zone_width_mm > 800 && (material == 'melamine' || material == 'osb')"`),
  avec severity, blocking, message, suggestion

Les contraintes sont évaluées à runtime par `evalConditionString()` dans
`layout.ts` via `new Function()`. **Ajouter ou modifier une règle de module =
modifier uniquement `modules.ts`**, sans toucher à l'évaluateur.

### `THRESHOLDS` — `src/lib/knowledge/rules/thresholds.ts`

Seuils numériques consommés par `validation.ts` :
`ANTI_TIP_HEIGHT_MM`, `WARDROBE_ROD_MIN_DEPTH_MM`, `DOOR_WEIGHT_REINFORCE_KG`,
`SUSPENDED_PLACO_WARN_KG`, `SUSPENDED_MAX_KG`, `WINE_RACK_WARN_KG`,
`ERGO_ZONE_LOW_MM`, `ERGO_ZONE_HIGH_MM`, `ENTRY_MAX_DEPTH_MM`.

Changer un seuil = modifier `thresholds.ts`. La logique de déclenchement dans
`validation.ts` reste inchangée.

### `base_v3_normalized.json` — `public/knowledge/`

Presets par type de meuble : dimensions par défaut, modules obligatoires et
optionnels, contraintes de compatibilité. Chargé optionnellement via
`loadKnowledge()` ; le moteur fonctionne avec des valeurs de secours si absent.

### `MATERIALS` — `src/data/materials.ts`

Propriétés physiques des 6 matériaux : densité, module de flexion (`flexMPa`),
portée max à 18mm (`maxSpan18`), épaisseurs disponibles, prix. Consommées par
`geometry.ts`, `validation.ts` et `production.ts`.

---

## Composants calculatoires

### `layout.ts` — `generateLayout()`

Découpe l'intent en corps (split multi-corps si largeur > `maxSpan18`), alloue
les zones dans chaque corps, émet les issues de layout (`LAY_DEPTH_MIN`,
`LAY_MULTI_BODY`). Contient aussi `evalConditionString()` — l'évaluateur qui
exécute les contraintes déclaratives de `MODULE_CATALOG`.

> `evalConditionString` est du code calculatoire au service de données
> déclaratives. L'évaluateur ne connaît aucune règle métier ; les règles
> sont dans `modules.ts`.

### `validation.ts` — `validateProject()`

Règles impératives : boucles sur pièces, calcul de déflection (`checkDeflection`,
formule L⁴), vérification de quincaillerie, conditions composites. Consomme
`THRESHOLDS` (déclaratif) et `MATERIALS` (déclaratif), mais la logique de
déclenchement est dans le code.

**Zone hybride** : les seuils sont déclaratifs mais les formules et conditions
ne peuvent pas être exprimées comme données sans un langage de règles complet.
Exemple : `RT_004` calcule la flèche réelle (`5·q·L⁴ / 384·E·I`) — cette
formule ne peut pas être stockée dans un JSON utile.

### `structure.ts` — `generateStructure()`

Lit `structural_impact` de chaque module (déclaratif) et décide : étagères
fixes requises, panneau arrière, plinthes, fixation murale. La logique de
décision combinatoire est dans le code.

### `geometry.ts` — `generateParts()`

Formules géométriques pures : calcul des dimensions de chaque pièce en mm à
partir du layout et de la structure. Entièrement calculatoire.

### `hardware.ts` — `selectHardware()`

Sélection de la quincaillerie à partir des pièces et de la structure. Logique
conditionnelle dans le code.

### `production.ts` — `generateProduction()`

Génère hypothèses, liste d'achat, plans de débit, plans de perçage, guide
d'assemblage. Entièrement calculatoire.

### `procurement.ts` — `resolveProcurement()`

Résout la décision achat / débit par pièce. Calculatoire.

---

## Implications pour le ticket 3.1 (JSON Schema KB)

Le périmètre schématisable est celui des composants déclaratifs :

| Composant | Format actuel | Candidat schéma |
|---|---|---|
| `base_v3_normalized.json` | JSON unique | Oui — JSON Schema |
| `MODULE_CATALOG` | TypeScript (`modules.ts`) | Partiel — les `constraints[].condition` sont des chaînes arbitraires, non schématisables sans DSL |
| `THRESHOLDS` | TypeScript (`thresholds.ts`) | Oui — objet simple à typer strictement |
| `MATERIALS` | TypeScript (`data/materials.ts`) | Oui — record typé à valider |

Les composants calculatoires (`validation.ts`, `layout.ts`, etc.) ne sont pas
dans le périmètre du ticket 3.1 : leur comportement est dans le code, pas dans
des données.

**Note sur `constraints[].condition`** : ces chaînes sont évaluées par
`new Function()`. Elles ne peuvent pas être validées par JSON Schema au-delà de
`type: string`. Toute validation de leur contenu nécessiterait un parser dédié —
hors périmètre pour l'instant.
