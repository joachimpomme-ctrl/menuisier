# Règles UI — Menuisier Terminal Métier

> **Document normatif — source unique de vérité pour toute l'interface.**
>
> Tout agent IA (Claude, Codex, autre humain) qui touche à l'UI du projet **doit**
> lire ces règles **avant** d'écrire une seule ligne de JSX. Une UI qui transgresse
> ces règles est considérée comme défectueuse, **même si elle compile et passe les tests.**
>
> Règle d'or : **en cas de doute, être plus strict, pas plus large.** Préférer
> réutiliser un composant existant plutôt que d'en créer un nouveau. Le design system
> **rétrécit**, il ne s'étale pas.

---

## 1. Objectif produit

L'outil est un **configurateur de meubles à fabriquer** utilisé par des menuisiers,
artisans, bricoleurs avancés. L'UI ressemble à un **outil de production** (CAO, ERP
industriel, terminal métier), **pas** à un SaaS marketing ou à une app consumer.

Si, à n'importe quel moment, l'écran peut être confondu avec :

- un dashboard Linear / Notion / Intercom / Vercel / Supabase
- une page d'onboarding ChatGPT / Claude / Gemini
- une landing page SaaS B2B
- une app iOS de tracking fitness
- un carrousel marketing startup

→ **c'est un échec**, à refactorer immédiatement.

Références visuelles implicites :

- un **terminal de trading**
- une **fiche de débit papier** d'atelier
- un **plan technique CAO 2D**
- une **console ERP industrielle** (SAP 3270, AS/400 modernisé)

---

## 2. Architecture des sources

```
src/ui-system/
├── tokens.ts              # couleurs, spacing, radius, typo, durées
├── index.ts               # UNIQUE point d'import public
├── rules.md               # ce fichier
├── components/            # primitives React
│   ├── Panel.tsx
│   ├── DataTable.tsx
│   ├── PropertyGrid.tsx
│   ├── StatusBadge.tsx    # + ProcurementBadge
│   ├── AlertStrip.tsx
│   ├── Toolbar.tsx        # + ToolbarButton / Metric / Tabs
│   ├── SplitLayout.tsx
│   ├── SectionTitle.tsx
│   ├── Input.tsx          # Field / TextInput / NumberInput / Select
│   ├── KpiBar.tsx
│   └── Legend.tsx
└── patterns/
    ├── layout.md              # 4 zones
    ├── procurement-visual.md  # pattern critique métier
    └── density.md             # valeurs numériques normatives
```

Règle d'import :

- **Toujours** : `import { X } from '../../ui-system'` (ou `'@/ui-system'` si alias).
- **Jamais** : `import { X } from '../../ui-system/components/X'` — l'arbo interne
  peut bouger à tout moment.

---

## 3. Interdictions strictes

Ces patterns sont **interdits partout dans `src/`** (sauf exception justifiée par
commentaire explicite en tête de fichier). Tout diff qui les introduit doit être refusé.

### 3.1 Tailwind — classes bannies

| Classe interdite | Raison |
|---|---|
| `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` | radius max 4px, défaut 2px |
| `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `drop-shadow-*` | aucune ombre — borders 1px séparent |
| `bg-gradient-*`, `from-*`, `to-*`, `via-*` | aucun gradient |
| `bg-blue-*`, `bg-indigo-*`, `bg-violet-*`, `bg-purple-*`, `bg-pink-*`, `bg-fuchsia-*` | palette Tailwind festive interdite |
| `bg-emerald-*`, `bg-teal-*`, `bg-cyan-*`, `bg-sky-*`, `bg-lime-*`, `bg-green-*` | idem — utiliser `procurementColor.buy_exact` via tokens |
| `bg-rose-*`, `bg-red-*`, `bg-orange-*` | rouge signal = `var(--alert)`, ambre = `var(--accent)`, pas la palette Tailwind |
| `bg-amber-*`, `text-amber-*` | l'accent est `--accent` (#a66400), pas amber Tailwind |
| `transition-all`, `transition-transform` | pas d'animation de layout |
| `active:scale-*`, `hover:scale-*`, `group-hover:scale-*` | pas d'effet tactile SaaS |
| `blur-*`, `backdrop-blur-*` | aucun flou |
| `ring-*` (sauf `ring-0`) | focus via `outline` des tokens uniquement |
| `animate-pulse`, `animate-bounce`, `animate-spin` (sauf loader pdf 2s-max) | pas d'animation décorative |

### 3.2 Composants et structures bannis

| Banni | Remplacement |
|---|---|
| `<Card>`, `<div className="rounded-xl shadow-sm">` | `<Panel title="…">` |
| `<table className="…">` avec styles ad-hoc | `<DataTable>` ou classe `.dtable` |
| `<dl><dt><dd>` manuel pour un inspecteur | `<PropertyGrid>` |
| pill `rounded-full bg-emerald-100 text-emerald-700` | `<ProcurementBadge status=…>` |
| `<div className="bg-red-50 border rounded">` pour une erreur | `<AlertStrip kind="error">` |
| header custom `<button class="rounded-xl bg-amber-600">` | `<Toolbar>` + `<ToolbarButton>` |
| `<div className="grid lg:grid-cols-3 gap-4">` avec cards | `<SplitLayout>` |
| `<div className="grid grid-cols-3">` de chiffres totaux | `<KpiBar>` |
| légende avec `<span style={{background:…}}>` inline | `<Legend>` |
| emoji dans un label (📄 ☁️ ⚙️ 🔧 📚 🤖 📐 🟢 🟡 🔴) | aucun emoji en UI |
| hero section, carrousel d'onboarding, "quick tips" | supprimer — on est en outil de production |
| modal plein écran pour un détail | utiliser la zone RIGHT du SplitLayout |

### 3.3 Patterns de code bannis côté UI

- **`style={{…}}` inline avec une couleur** — sauf si la valeur provient d'un token
  (`var(--…)`). Ne jamais hardcoder `#aabbcc` en JSX.
- **`dangerouslySetInnerHTML`** — tout composant qui en a besoin n'appartient pas au DS.
- **Calcul de statut métier côté UI** (ex. `part.drilling?.length ? 'buy_and_rework' : …`) —
  voir `patterns/procurement-visual.md` : l'UI ne calcule jamais un statut.
- **Import depuis `ui-system/components/…` directement** — toujours via `ui-system/index`.
- **Création d'un nouveau composant DS sans issue/justification** — préférer enrichir
  la prop d'un composant existant.

---

## 4. Composants canoniques (besoin → composant)

Quand un besoin UI apparaît, **ne jamais le réimplémenter localement**. Ce tableau est
normatif : si la ligne existe, l'utiliser.

| Besoin produit | Composant canonique | NE PAS écrire à la place |
|---|---|---|
| Bloc de contenu avec cadre | `<Panel title="…">` | `<Card>`, `<div className="rounded-xl shadow">` |
| Bloc sans cadre propre inséré dans `<SplitLayout>` | `<Panel borderless>` | `<div className="p-3">` flottant |
| Titre de sous-section dans un Panel | `<SectionTitle>` | `<h3>`, `<div className="text-sm font-bold">` |
| Tableau dense de données métier | `<DataTable columns rows>` | `<table>` avec styles ad-hoc |
| Liste clé/valeur (inspecteur) | `<PropertyGrid groups>` | `<dl>`, chiffres flottants alignés à la main |
| Statut procurement d'une pièce | `<ProcurementBadge status=…>` | pill de couleur, dot colorée, emoji |
| Statut générique (rare) | `<StatusBadge kind="…">` | idem |
| Erreur / warning / info non bloquant | `<AlertStrip kind="error\|warning\|info">` | `<div className="bg-red-50">`, toast |
| Rail haut d'un écran | `<Toolbar start middle end>` | header custom, navbar |
| Bouton dans une Toolbar | `<ToolbarButton variant="default\|primary\|ghost">` | `<button class="bg-sky-500 rounded-xl">` |
| Métrique en tête (label+valeur+unité) | `<ToolbarMetric label value unit>` | `<div>` + `<span>` mono ad-hoc |
| Onglets primaires d'un écran | `<ToolbarTabs tabs active onChange>` | pills Tailwind |
| Rangée de KPI totaux (bottom bar) | `<KpiBar items>` | `<div className="grid grid-cols-3">` |
| Légende d'un canvas / diagramme | `<Legend items note>` | `<span style={{background}}>` inline |
| Layout principal d'un écran | `<SplitLayout toolbar left center right bottom>` | `<div className="grid lg:grid-cols-3 gap-4">` |
| Champ de formulaire | `<Field label><TextInput/NumberInput/Select/></Field>` | `<input>` nu + `<label>` ad-hoc |

### Règle de création d'un nouveau composant DS

Avant d'ajouter un nouveau fichier dans `components/`, répondre **oui** aux 3 questions :

1. **Le besoin apparaît-il dans au moins 2 écrans distincts ?** (Un usage ponctuel ne
   justifie pas un composant — faire en JSX local.)
2. **Est-il impossible de l'exprimer comme une composition** de composants existants
   (ex. `<Panel><PropertyGrid/></Panel>`) ?
3. **Les règles d'usage tiennent-elles en ≤ 10 lignes de commentaire ?** Sinon, le
   composant est trop flou, le découper.

Sinon → pas de nouveau composant. Soit extension d'un existant, soit JSX local
transitoire.

---

## 5. Densité (normatif)

Les valeurs ci-dessous sont **obligatoires**. Les chiffres viennent de `tokens.ts`.
Voir `patterns/density.md` pour les détails par composant.

### 5.1 Hauteurs

| Élément | Hauteur |
|---|---|
| Bouton / input / select (desktop) | **26px** (`size.control`) |
| Bouton / input / select (mobile `pointer:coarse`) | **36px** (`size.controlCoarse`) |
| Ligne de tableau | **24px** (`size.row`) |
| Header de `<Panel>` | **28px** (`size.panelHead`) |
| Toolbar principale | **40px** (`size.ribbon`) |
| Badge `<StatusBadge>` / `<ProcurementBadge>` | **13px** (auto via classe) |

### 5.2 Paddings

| Contexte | Padding |
|---|---|
| Intérieur d'un `<Panel>` body | `10px 12px` (soit `spacing.2.5 spacing.3`) |
| Intérieur d'un `<Panel flush>` | `0` — pour tables qui s'étirent bord à bord |
| Cellule de tableau | `2px 8px` (via `.dtable td`) |
| Toolbar zones start/end | `8px` latéral |
| Entre deux `<SectionTitle>` dans un `<PropertyGrid>` | `12px` vertical (`gap-3`) |

### 5.3 Typographie

| Rôle | Taille | Poids | Casse | Tracking | Famille |
|---|---|---|---|---|---|
| Titre d'écran (rare, seulement tutoriel) | 16px | 600 | normale | 0 | sans |
| Nom de pièce, titre de Panel head | 11-13px | 600 | MAJUSCULES (panel-head) | 0.04em | sans |
| Corps principal | 12-13px | 400 | normale | 0 | sans |
| Header de tableau | **10.5px** | 600 | **MAJUSCULES** | **0.08em** | sans |
| Section title | **10.5px** | 600 | **MAJUSCULES** | **0.08em** | sans |
| Données numériques de tableau | **11.5px** | 400 | normale | 0 | **mono** tabular-nums |
| Données numériques de KpiBar / valeur principale | 18px | 400 | normale | 0 | **mono** tabular-nums |
| Label de métrique / unité | 9.5-10px | 400 | MAJUSCULES (overline) | 0.08em | sans (muted) |
| Alerte tag (ERR / AVIS / INFO) | 10px | 600 | MAJUSCULES | 0.08em | **mono** |
| Italique | **interdit** sauf notes techniques mineures gris clair | — | — | — | — |

### 5.4 Alignement numérique

- **Tout chiffre métier** (dimensions, quantités, prix, surfaces) s'affiche en
  `font-mono tabular-nums`.
- Dans un `<DataTable>`, une colonne numérique déclare `align: 'right'` — le
  composant applique automatiquement mono + tabular-nums.
- Dans un `<PropertyGrid>`, `value` string/number bascule automatiquement en mono.
- **Jamais** de chiffre métier en sans-serif proportionnel — même "1" et "0" doivent
  s'aligner entre lignes.

### 5.5 Couleurs autorisées

**UNE** couleur d'accent dans toute l'UI : `var(--accent)` = ambre technique `#a66400`.

Usages autorisés de l'accent :

1. Bouton primaire (**au plus 1 par Toolbar**)
2. Bordure / fond de la ligne sélectionnée dans un DataTable
3. `outline` de focus visible
4. `inset 0 -2px 0 var(--accent)` sur l'onglet ToolbarTabs actif
5. Outline de sélection dans le canvas façade 2D

**Jamais** pour :

- décorer un titre, une icône ou un libellé
- souligner un lien de navigation
- un gradient ou un dégradé

Couleurs de statut procurement — définies dans `tokens.ts`, jamais dupliquées :

| Statut | Texte | Fond (alerte strip seulement) |
|---|---|---|
| `buy_exact` | `#2d5a3d` vert forêt | `#e4eee6` |
| `buy_and_rework` | `#8a5a00` ambre | `#f4e9d1` |
| `cut_from_sheet` | `#333c4d` ardoise | `#dfe3ea` |
| `alert` (bloquant) | `#a2231d` rouge signal | `#f5d9d8` |

---

## 6. Règles par famille de composant

### 6.1 Panels (`<Panel>`)

- Un Panel = **un cadre rectangulaire à bordure 1px**, optionnellement avec un
  bandeau de titre sombre MAJUSCULES.
- Un Panel n'a **jamais** de background coloré décoratif, de gradient, d'ombre.
- `className` ne sert qu'à composer `rule-t`, `rule-b`, `scroll-y` — **jamais**
  à introduire `rounded-*`, `shadow-*`, `bg-*`.
- Un Panel n'est **jamais cliquable** au niveau conteneur : pas de `onClick` au
  `<Panel>`, seulement sur un enfant explicite.
- `borderless` = insertion dans un `<SplitLayout>` où les borders viennent du parent.
- `flush` = padding body à 0, pour un `<DataTable>` pleine largeur.
- Actions = max 3 boutons compacts dans la zone droite du head.

### 6.2 Tables (`<DataTable>`)

- Lignes **24px**, zébrage via `panelAlt`, headers MAJUSCULES 10.5px.
- Une colonne numérique déclare `align: 'right'` → mono tabular-nums automatique.
- **Pas de style `style={{…}}`** au niveau td / tr. Tout vient de `.dtable` CSS.
- Pas de tri interactif, pagination ou accordéon natif — si le besoin apparaît,
  il fera l'objet d'une **extension explicite** dans le DS (pas d'ajout local).
- **Pas de colorisation de ligne entière** pour signifier un statut — utiliser
  un badge dans une colonne dédiée.
- Le `render` d'une cellule renvoie du **contenu DS-compatible** : texte, nombre,
  `<ProcurementBadge>`, mini-span mono. Pas de `<div>` avec `bg-*`, `rounded-*`.
- En cas de liste vide : laisser le composant rendre son `emptyLabel` (pas de
  "hero vide" avec illustration).

### 6.3 PropertyGrid (`<PropertyGrid>`)

- 2 colonnes : label `fg-muted` à gauche, valeur à droite (mono si numérique).
- **Pas** de bordure horizontale entre lignes, juste un espacement 2-4px.
- Groupes séparés par un `<SectionTitle>` (géré par la prop `groups[].title`).
- Une valeur en `<ReactElement>` (ex. `<ProcurementBadge>`) n'est **pas**
  rendue en mono — le composant détecte automatiquement.
- Jamais de valeur en couleur libre — uniquement via `<StatusBadge>`.

### 6.4 Badges (`<StatusBadge>`, `<ProcurementBadge>`)

- **Forme** : barre verticale 2×11px de la couleur du statut + label MAJUSCULES
  11px de la même couleur. **Pas** une pill arrondie.
- `compact` = une lettre (A / R / D / ⚠). Utilisé seulement si largeur < 60px.
- `title` HTML = tooltip lisible (la `reason` de la décision procurement).
- **Jamais** d'emoji avant/après un badge.
- Un badge n'apparaît **que** dans : tableau (colonne dédiée), inspecteur, KpiBar.
- Jamais dans : toast, modal, header ribbon, alertes (utiliser `<AlertStrip>`).

### 6.5 Alertes (`<AlertStrip>`)

- Un bloc rectangulaire plein, **pas un toast**.
- Trait 3px coloré à gauche, tag mono MAJUSCULES (ERR / AVIS / INFO), titre +
  corps.
- **Pas d'icône emoji**, pas de bordure arrondie > 2px, pas de shadow, pas
  d'animation d'entrée.
- `kind="error"` seulement pour ce qui empêche d'aller plus loin (blocking=true).
- `kind="warning"` pour approximation / substitution automatique.
- `kind="info"` pour rappel métier neutre.

### 6.6 Toolbar (`<Toolbar>`, `<ToolbarButton>`, `<ToolbarMetric>`)

- Hauteur **40px fixe**, 3 zones : start / middle / end, séparées par `rule-r`/`rule-l`.
- `start` = identité projet (type + variante). Pas de logo, pas d'avatar.
- Middle = métriques compactes (`<ToolbarMetric>`), max 8, scroll horizontal si trop.
- `end` = **1 à 3 boutons** dont **au plus un** `variant="primary"`.
- `ToolbarButton` n'accepte **que** les props déclarées : `variant`, `onClick`,
  `disabled`, `title`, `type`, `className`, `aria-label`, `children`. Pas de
  `style`, pas de `onMouseDown`, pas de `formAction`. Si besoin, pas un ToolbarButton.
- **Jamais** d'emoji ni d'icône décorative dans un label. Une icône technique
  minime (× ↑ ↓) = caractère unicode simple.

### 6.7 Formulaires (`<Field>`, `<TextInput>`, `<NumberInput>`, `<Select>`)

- Label **toujours** via `<Field label>`. Pas de `<label>` manuel.
- Placeholder court (≤ 40 car.) et optionnel — **pas** un substitut de label.
- `NumberInput` force `type="number"`, `inputMode="numeric"` → mono automatique.
- Pas d'icône interne décorative dans le champ.
- Pas d'état "valid/invalid" coloré sur l'input — utiliser un `<AlertStrip>`
  adjacent pour l'erreur.
- `layout="inline"` uniquement dans une liste dense façon property grid.
- Les props acceptées sont **strictement limitées** aux champs listés dans
  `TextInputProps` / `NumberInputProps` / `SelectProps`. Pas de `...rest` de
  `InputHTMLAttributes`. Si l'usage requiert `autoSave`, `list`, `pattern`, etc.,
  c'est que l'input n'appartient pas au DS et doit être écrit en JSX local
  documenté.

### 6.8 KpiBar (`<KpiBar>`)

- Utiliser partout où une rangée de 3 à 6 KPI totaux doit se lire en un coup
  d'œil (bottom bar du Dashboard, résumé de lot).
- Valeur toujours mono tabular-nums (via le composant).
- Badge optionnel au-dessus (typiquement `<ProcurementBadge>`).
- **Jamais** de sparkline, de flèche de tendance colorée, d'animation.

### 6.9 Legend (`<Legend>`)

- Une `Legend` a **au plus 6 entrées**. Au-delà, le composant lance une erreur
  (signal fort : c'est un tableau déguisé, pas une légende).
- 4 styles de swatch seulement : `solid` / `outline` / `selected` / `muted`.
- **Pas** de dot rond coloré. Pas d'emoji.
- Les couleurs viennent des variables CSS du DS — jamais de hex littéral.

### 6.10 SplitLayout (`<SplitLayout>`)

- 4 zones rigides : `toolbar` / `left` / `center` / `right` / `bottom`.
- Zones séparées **uniquement par borders 1px** — jamais `gap-*`, jamais shadow.
- `center` est la seule zone qui s'étire horizontalement.
- `left` et `right` ont des min-widths raisonnables (280px par défaut).
- **Pas de splitter draggable**, pas de zones rétractables animées.

---

## 7. Responsive

### 7.1 Breakpoints implicites

| Viewport | Comportement |
|---|---|
| ≥ 1280px | SplitLayout 4 zones complètes, toutes métriques visibles |
| 960-1279px | SplitLayout 4 zones, métriques Toolbar peuvent scroller horizontalement |
| 720-959px | LEFT **OU** RIGHT peut se rétracter (remplacé par un ToolbarButton) |
| < 720px | LEFT + RIGHT sont des bottom-sheets, CENTER plein écran, BOTTOM en tabs |

### 7.2 Règles tactiles

- Média `@media (pointer: coarse)` → contrôles à **36px** minimum (WCAG touch target).
- Hover effects neutralisés automatiquement.
- **Aucun** menu rétractable hamburger ornemental — si un ToolbarButton suffit
  à rouvrir un panneau, c'est lui qu'on utilise.

---

## 8. Signes de dérive UI (à refuser immédiatement)

Toute PR qui introduit un de ces patterns **doit être refusée** avant revue de logique.
C'est un signal que l'auteur n'a pas lu ce document.

### 8.1 Soft cards

> `className="rounded-2xl border shadow-sm p-6 bg-white/80 backdrop-blur"`

Dérive SaaS. Remplacer par `<Panel>` — cadre franc, pas d'ombre, pas de flou.

### 8.2 Pill colorée pour un statut

> `<span className="rounded-full bg-emerald-100 text-emerald-700 px-3 py-1">Achat</span>`

Dérive consumer. Remplacer par `<ProcurementBadge status="buy_exact" />`.

### 8.3 Hero / onboarding

> Grand titre 32px centré + sous-titre + illustration vectorielle + 2 CTA arrondis.

Dérive marketing. **Un outil de production n'a pas d'onboarding visuel** — il
affiche directement l'écran de travail.

### 8.4 Tableau "aéré"

> Lignes à 40-56px, padding 16-24px, typo 14-16px proportionnelle, zébrage pastel.

Dérive dashboard SaaS. Les vrais chiffres sont tassés : **24px de ligne, 11.5px mono**.

### 8.5 Bouton "marketing"

> `className="rounded-xl px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105"`

Dérive landing page. Remplacer par `<ToolbarButton variant="primary">` — 26px,
accent plat, pas d'ombre, pas de gradient, pas de scale.

### 8.6 Palette colorée

> Plusieurs couleurs vives sur le même écran (vert succès + rose notification +
> bleu info + violet bêta + orange alerte).

Dérive bloat SaaS. La palette utilisable se résume à : `--fg` / `--fg-muted` /
`--fg-subtle` / `--accent` / `--alert` + les 3 couleurs procurement. **Point.**

### 8.7 Styles locaux excessifs

> Un composant applicatif qui déclare 15 `className="text-[12px] …"` + `style={{…}}`
> pour restyler ce qu'un composant DS fait déjà.

Signe d'un composant qui doit **utiliser le DS** au lieu de le contourner. Règle :
si tu réécris trois fois la même tournure de classes utilitaires pour ressembler à
un composant existant, **c'est que tu devrais importer le composant existant**.

### 8.8 Emojis et icônes décoratives

> `📄 Liste de pièces`, `⚠️ Attention`, `🟢 OK`, `🔧 Outils`, `🤖 IA`

Aucun emoji en UI — y compris dans le wizard, y compris dans les alertes, y
compris "juste pour humaniser". L'outil s'adresse à un pro, pas à un utilisateur
consumer.

### 8.9 Animation d'entrée

> `animate-fadeIn`, `initial={{opacity:0}} animate={{opacity:1}}`, spring physics.

Interdit. Le seul mouvement autorisé est le changement de `background-color` en
80ms au hover/focus. Un tableau qui apparaît apparaît **instantanément**.

### 8.10 Modal plein écran décorative

> Un détail de pièce qui ouvre un overlay avec backdrop blur.

Remplacer par l'inspecteur dans la zone RIGHT. Un outil métier n'interrompt pas le
flow de travail pour afficher un détail.

---

## 9. Checklist de review (obligatoire avant merge UI)

Avant de valider **toute PR** qui touche au JSX, vérifier chacun des points.
Un seul "non" = refactor avant merge.

### Structure

- [ ] Tous les imports UI viennent de `ui-system` (pas de chemin interne).
- [ ] Aucun nouveau fichier dans `src/ui-system/components/` sans justification des 3 questions (§4).
- [ ] L'écran principal est dans un `<SplitLayout>` dès qu'il a ≥ 2 zones logiques.

### Classes et styles

- [ ] Aucune classe Tailwind bannie (voir §3.1) dans le diff.
- [ ] Aucune valeur hex en dur en JSX (sauf SVG technique commenté).
- [ ] Aucun `style={{…}}` inline introduisant une couleur hors tokens.

### Composants

- [ ] Tous les blocs de contenu utilisent `<Panel>` (ou descendant direct).
- [ ] Tous les tableaux utilisent `<DataTable>` ou la classe `.dtable`.
- [ ] Toutes les listes clé/valeur utilisent `<PropertyGrid>`.
- [ ] Tous les statuts procurement sont via `<ProcurementBadge>`.
- [ ] Toutes les alertes sont via `<AlertStrip>`, pas de toast décoratif.
- [ ] Toute rangée de KPI totaux est via `<KpiBar>`.
- [ ] Toute légende de canvas / diagramme est via `<Legend>`.

### Densité

- [ ] Boutons 26px (36px coarse), lignes de tableau 24px.
- [ ] Chiffres métier en mono tabular-nums.
- [ ] Headers de colonne et section titles en 10.5px MAJUSCULES 0.08em tracking.

### Contrat métier

- [ ] Aucun calcul de statut procurement côté UI — lecture de `result.procurement.byPartId` uniquement (voir `patterns/procurement-visual.md`).
- [ ] Aucun `part.standard_part_id` / `part.drilling.length` lu pour déduire un statut.
- [ ] Les props des composants DS ne sont **jamais** étendues avec des `{...HTMLAttributes}` contournants.

### Interactions

- [ ] L'accent `var(--accent)` ne dépasse pas : 1 bouton primary + sélection + focus + onglet actif.
- [ ] Aucune animation autre que les 80ms de fond sur hover/focus.
- [ ] Aucune modal plein écran introduite.

### Refus global

- [ ] Si un relecteur externe ouvre l'écran **sans contexte**, il pense "outil de
      production" — pas "SaaS B2B", pas "app Linear", pas "page Vercel".

---

## 10. Règle de dernier recours

> *Si l'interface ressemble encore à un dashboard SaaS moderne générique →
> c'est un échec.*

En cas de doute sur un choix stylistique, revenir à la question :

> *Un menuisier de 55 ans qui utilise SAP toute la journée ouvre cet écran.
> Est-ce qu'il le prend au sérieux comme outil de production ?*

Si non → refactor. Pas d'exception.

---

## 11. Évolution des règles

- Ce document est **source unique**. Aucune autre convention UI ailleurs dans le
  repo (pas de `STYLE_GUIDE.md` parallèle, pas de Figma "source de vérité" qui
  divergerait).
- Modifier ces règles se fait par PR explicite, avec :
  1. Diff des règles
  2. Diff des composants DS impactés (`components/` + `tokens.ts`)
  3. Diff des écrans applicatifs impactés
  4. Justification métier (pas purement stylistique).
- Toute règle marquée "strict" ne s'assouplit **jamais**.
- En cas de conflit entre "ajouter une fonctionnalité" et "respecter une règle",
  la règle gagne. On réécrit la feature pour tenir dans le DS, pas l'inverse.
