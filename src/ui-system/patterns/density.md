# Pattern — Densité

## Objectif

L'utilisateur cible est un professionnel qui travaille toute la journée sur
l'outil. Il doit voir **le plus d'information utile possible sans scroller**.
La densité est une contrainte de **métier**, pas un choix stylistique.

Référentiel implicite : une page de fiche de débit A4 tient facilement 40 pièces
lisibles. L'UI doit viser la même densité.

## Matrice normative

Toutes les valeurs viennent de `src/ui-system/tokens.ts`. Ne **jamais** les
dupliquer en littéral dans un composant applicatif.

### Hauteurs

| Élément | Token | Valeur desktop | Valeur `pointer: coarse` |
|---|---|---|---|
| Bouton / input / select | `size.control` / `size.controlCoarse` | 26px | 36px |
| Ligne de `<DataTable>` | `size.row` | 24px | 28px (recommandé via media) |
| Bandeau `panel-head` | `size.panelHead` | 28px | 32px |
| Toolbar principale | `size.ribbon` | 40px | 44px |
| Hauteur d'un `<Legend>` | — | 24px auto | idem |
| Hauteur d'un `<KpiBar>` item | — | ~52px (auto) | idem |

### Paddings

| Contexte | Padding | Tokens |
|---|---|---|
| `<Panel>` body non-flush | `10px 12px` | `spacing.2.5 spacing.3` |
| `<Panel flush>` body | `0` | — |
| `.dtable td` | `2px 8px` | — |
| `.dtable th` | `4px 8px` | — |
| `<Toolbar>` zone start / end | `0 8px` | `spacing.2` |
| `<KpiBar>` cellule | `8px 12px` | `spacing.2 spacing.3` |
| `<Legend>` | `8px` | `spacing.2` |
| `<AlertStrip>` | `6px 10px 6px 14px` (trait à gauche compris) | — |

### Typographie — tailles

| Rôle | px | `font` token | Cas d'usage |
|---|---|---|---|
| Micro (unit de metric) | 9.5 | `font.size.micro` | mm / € / kg à côté d'un chiffre |
| Overline / section-title | 10.5 | `font.size.overline` | headers de colonne, SectionTitle, labels MAJUSCULES |
| Numérique dense | 11 | `font.size.xs` | cellules mono de DataTable (desktop) |
| Numérique DataTable aligné | 11.5 | *(littéral)* | cellules `.dtable td.num` |
| Corps technique | 12 | `font.size.sm` | texte de Panel body, AlertStrip body |
| Corps par défaut | 13 | `font.size.base` | paragraphe inspector |
| Metric value | 14 | `font.size.md` | valeur d'une ToolbarMetric |
| Titre d'écran | 16 | `font.size.lg` | uniquement tutoriel / wizard step hero |
| KpiBar valeur principale | 18 | *(littéral)* | chiffre gros lisible (bottom bar) |

### Typographie — poids & casse

| Rôle | Weight | Casse | Tracking | Famille |
|---|---|---|---|---|
| Corps | 400 | normale | 0 | sans (Inter) |
| Label de Field (stacked) | 600 | MAJUSCULES | 0.08em | sans |
| Label de Field (inline) | 400 | normale | 0 | sans |
| Nom de pièce, titre Panel | 600 | MAJUSCULES (panel-head) | 0.04em | sans |
| Header DataTable | 600 | MAJUSCULES | 0.08em | sans |
| Chiffre métier | 400 | — | 0 | **mono** tabular-nums |
| Tag d'AlertStrip (ERR/AVIS/INFO) | 600 | MAJUSCULES | 0.08em | **mono** |
| Italique | **jamais** sauf notes techniques mineures gris clair | — | — | — |

### Numeric features

Tous les chiffres métier (dimensions, quantités, prix, surfaces) utilisent :

```css
font-family: var(--font-mono);
font-feature-settings: "tnum" 1, "ss01" 1;
font-variant-numeric: tabular-nums;
```

Exposé via :
- `<DataTable>` colonne `align: 'right'` → classe `.num` automatique
- `<PropertyGrid>` avec `value: string | number` → mono automatique
- `<KpiBar>` valeur → mono automatique
- `<ToolbarMetric>` valeur → mono automatique (via classe `.metric-value`)

**Ne jamais mélanger** chiffres en sans-serif proportionnel et chiffres mono
sur le même écran : même "1" et "0" doivent s'aligner verticalement entre deux
lignes.

## Écarts interdits

| Anti-pattern | Écart | Pourquoi c'est interdit |
|---|---|---|
| Bouton 40px, padding 16px 24px | +53% hauteur / +100% padding | dérive SaaS, perte de densité |
| Ligne de tableau 48px | +100% | dashboard marketing, pas outil pro |
| Titre d'écran en 32-40px | +100-150% | hero section, interdit en §8.3 de rules.md |
| Corps en 15-16px | +25-33% | typo "confort lecture" — on n'est pas un blog |
| Chiffres en sans-serif proportionnel | — | casse l'alignement vertical des colonnes |
| Zébrage pastel coloré (bleu 50/rose 50) | palette festive | 8.4 de rules.md |

## Justifier un écart

Un écart volontaire à cette matrice requiert **tous** les éléments suivants dans
le commit/PR :

1. **Commentaire inline** en tête du composant JSX : `// DS-ÉCART : [raison]`
2. **Justification métier** (pas "pour faire joli") — ex. bouton "Modifier" d'un
   wizard tutoriel qui doit être 36px sur desktop pour marquer la fin d'étape.
3. **Tickets associés** : issue qui autorise formellement l'écart.

Toute PR avec un écart non marqué doit être rejetée en revue.

## Référence croisée

- Règles globales et classes bannies → `../rules.md`
- Layout 4 zones → `./layout.md`
- Procurement visuel → `./procurement-visual.md`
