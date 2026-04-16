# Pattern — Affichage du procurement

## Objet

Pour chaque pièce générée par le pipeline V3, l'utilisateur doit savoir **en une fraction de seconde** si la pièce :

- s'achète telle quelle (pas de travail atelier) — `buy_exact`
- s'achète puis se retouche (perçage, plaquage de chant) — `buy_and_rework`
- se débite d'un panneau (usinage complet atelier) — `cut_from_sheet`

Cette information conditionne toute la chaîne métier : temps d'atelier, liste de courses, priorités d'approvisionnement, contrôle qualité.

## ⚠ Contrat de données — règle non-négociable

**L'UI ne calcule jamais le statut procurement.** La décision est produite
par le moteur (`src/lib/engine/procurement.ts`) et attachée au
`PipelineResult` sous forme d'une `ProcurementView` :

```ts
interface ProcurementDecision {
  part_id: string;
  status: 'buy_exact' | 'buy_and_rework' | 'cut_from_sheet';
  standard_part_id?: string;
  rework_ops: ('drilling' | 'edge_banding')[];
  reason: string;              // justification lisible (tooltip)
  source: 'heuristic' | 'resolver';
}

interface ProcurementView {
  decisions: ProcurementDecision[];
  byPartId: Record<string, ProcurementDecision>;  // index O(1) pour l'UI
  summary: { buy_exact: number; buy_and_rework: number;
             cut_from_sheet: number; total: number };
}
```

Les **trois emplacements** qui affichent du procurement (tableau pièces,
inspecteur, bottom summary) tirent tous de `result.procurement` :

```tsx
// Tableau
const decision = result.procurement.byPartId[row.id];
<ProcurementBadge status={decision.status} title={decision.reason} />

// Inspecteur
const decision = result.procurement.byPartId[part.id];

// Summary
const { buy_exact, buy_and_rework, cut_from_sheet } = result.procurement.summary;
```

Conséquence : **impossibilité de divergence d'affichage**. Un seul calcul
par `runPipeline()`, une seule source.

### Pourquoi ce verrou ?

La règle qui décide du statut va évoluer (futur moteur `resolveProcurement`
qui croise pièces × catalogue × compat matière × fournisseurs). En
interdisant à l'UI d'avoir sa propre logique, on garantit qu'un changement
métier ne provoque **aucune** refonte UI.

### Checklist pour l'agent qui touche au procurement

1. [ ] Aucun `import { classifyProcurement }` ou `import { summarizeProcurement }` dans `src/components/` — ce sont des adaptateurs `@deprecated`.
2. [ ] Toute nouvelle lecture de statut passe par `result.procurement.byPartId[partId]`.
3. [ ] Pas de `part.standard_part_id`, `part.drilling?.length`, etc. utilisés côté UI pour déduire un statut.
4. [ ] Si on ajoute un nouveau statut : modifier d'abord le type `ProcurementStatus` dans `lib/engine/procurement.ts`, le TypeScript forcera à compléter `procurementColor` et `procurementLabel` dans `ui-system/tokens.ts`.

## Règles d'affichage

### 1. Toujours via `<ProcurementBadge status=… />`

```tsx
import { ProcurementBadge } from '@/ui-system';

<ProcurementBadge status="buy_exact" />
<ProcurementBadge status="buy_and_rework" />
<ProcurementBadge status="cut_from_sheet" />
```

Jamais de "pill" arrondie colorée. Jamais d'emoji. Le badge a la forme d'une **barre verticale 2×11px** de la couleur du statut, suivie du label en majuscules 11px de la même couleur.

### 2. Un statut = une couleur, UNIQUEMENT

| Statut | Couleur texte | Couleur de fond (utilisée seulement pour les alertes strips, PAS le badge) |
|---|---|---|
| `buy_exact` | `#2d5a3d` (vert forêt) | `#e4eee6` |
| `buy_and_rework` | `#8a5a00` (ambre chaud) | `#f4e9d1` |
| `cut_from_sheet` | `#333c4d` (ardoise) | `#dfe3ea` |

Ces valeurs sont définies dans `tokens.ts` sous `procurementColor`. **Ne jamais les dupliquer** en littéral.

### 3. Emplacement dans l'écran

Il y a trois endroits légitimes où un `ProcurementBadge` apparaît :

1. **Tableau de pièces** — dernière colonne "Approvisionnement", largeur fixe.
2. **Inspecteur** — dans le groupe "Classification", ligne "Approvisionnement".
3. **Summary bottom-bar** — 3 chiffres totaux côte à côte (ACHAT, ACHAT+RETOUCHE, DÉBIT) pour lecture instantanée.

Il N'apparaît PAS dans :
- les toasts
- les modales
- le header ribbon
- les alertes (utiliser `AlertStrip` avec la couleur appropriée à la place)

### 4. Forme compacte pour tableaux très denses

Quand l'espace est inférieur à 60px (tableau mobile, colonne étroite) :

```tsx
<ProcurementBadge status="buy_exact" compact />
```

Le label est réduit à une lettre (`A`, `R`, `D`). Le tooltip HTML (via `title`) reste explicite.

### 5. Heuristique de classification (backend)

Dans `src/lib/engine/procurement.ts` :

```ts
if (!part.standard_part_id)                                return 'cut_from_sheet';
if (part.drilling?.length || part.edge_banding?.length)    return 'buy_and_rework';
return 'buy_exact';
```

Cette classification est **calculée**, jamais saisie par l'utilisateur. Si un jour la règle évolue, elle change à un seul endroit.

## Anti-patterns interdits

- Pill arrondie (`rounded-full`) avec background coloré saturé type Tailwind `bg-emerald-100 text-emerald-700` — c'est du SaaS, pas du métier.
- Icône emoji (🟢 🟡 🔴) à côté du label — réservée aux cards de marketing, pas à un outil de production.
- Couleur sur la ligne entière du tableau pour signifier le statut — casse la lecture tabulaire. Utiliser le badge uniquement dans la colonne dédiée.
- Changement de police ou d'emphasis (italique/gras) sur le label — tous les badges utilisent la même typographie.
