# Règles UI — Menuisier Terminal Métier

> Document normatif. Tout agent IA (Claude, Codex, autre) qui touche à l'UI du projet **doit** lire ces règles avant d'écrire une seule ligne de JSX, et les respecter strictement. Une UI qui transgresse ces règles est considérée comme défectueuse, même si le code compile.

---

## 🎯 Objectif produit

L'outil est un **configurateur de meubles à fabriquer** utilisé par des menuisiers, artisans, bricoleurs avancés. L'UI ressemble à un **outil de production** (CAD, ERP industriel, terminal métier), **pas** à un SaaS marketing.

Si, à n'importe quel moment, l'écran peut être confondu avec un dashboard Linear / Notion / Intercom / Vercel / page d'onboarding ChatGPT / app marketing startup → **c'est un échec**, à refactorer immédiatement.

---

## 🚫 Interdictions strictes

| Code interdit | Raison |
|---|---|
| `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` | radius max 4px, par défaut 2px |
| `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `drop-shadow-*` | aucune ombre, les séparations se font par borders 1px |
| `bg-gradient-*`, `from-*`, `to-*`, `via-*` | aucun gradient |
| `bg-blue-*`, `bg-indigo-*`, `bg-violet-*`, `bg-purple-*`, `bg-pink-*`, `bg-emerald-*`, `bg-teal-*`, `bg-sky-*`, `bg-rose-*` | palette Tailwind interdite ; utiliser les variables CSS (`--bg-panel`, `--accent`, etc.) |
| `bg-amber-*`, `text-amber-*` | l'accent est `--accent` (#a66400), jamais la palette amber Tailwind |
| `transition-all`, `active:scale-*`, `hover:scale-*` | pas d'effet tactile SaaS ; les transitions sont limitées au changement de background en 80ms |
| `class Card`, `<Card>`, `rounded-2xl border p-4 shadow-sm` | remplacer par `<Panel>` |
| emojis décoratifs dans les labels (📄, ☁️, ⚙️, 🔧, 📚, 🤖, 📐, …) | aucun emoji en UI, sauf ceux déjà présents dans les catalogues métier de la base de connaissances (icônes de types de meubles) — et encore, uniquement en wizard `StepType` |
| animations d'entrée (`animate-fadeIn`, spring, framer-motion) | une UI métier n'anime pas son contenu |
| hero section, onboarding carrousel, cards de "quick tips" décoratives | jamais dans un outil de production |
| pill status `rounded-full bg-emerald-100 text-emerald-700` | utiliser `<StatusBadge />` |

---

## ✅ Obligations

### Imports
- Tout composant d'UI vient de `@/ui-system` (index centralisé).
- Tout token de couleur / spacing / radius vient de `@/ui-system/tokens` OU des variables CSS `var(--bg-panel)`, `var(--border)`, `var(--accent)`, etc.
- Jamais de valeur hex en dur dans le JSX (sauf SVG techniques avec commentaire justifiant).

### Composants canoniques
Ces composants existent et doivent être utilisés :

| Besoin | Composant | Ne pas créer de |
|---|---|---|
| Bloc de contenu avec cadre | `<Panel title="…">` | `<Card>`, `<div className="rounded-xl shadow">` |
| Tableau dense | `<DataTable>` | `<table className="…">` avec styles ad-hoc |
| Liste clé/valeur d'inspecteur | `<PropertyGrid>` | `<dl>`, chiffres flottants alignés à la main |
| Statut procurement | `<ProcurementBadge status=…>` | pill de couleur avec emoji |
| Erreur / warning / info non bloquant | `<AlertStrip kind="…">` | `<div className="bg-red-50 border rounded">` |
| Rail de boutons et métriques | `<Toolbar>` + `<ToolbarButton>` + `<ToolbarMetric>` | header custom avec `<button class="rounded-xl bg-amber-600">` |
| Layout principal d'un écran | `<SplitLayout>` | `<div className="grid lg:grid-cols-3 gap-4">` avec cards |

### Densité
- Hauteur des boutons : 26px (36px mobile).
- Hauteur des lignes de tableau : 24px.
- Padding intérieur d'un Panel : `10px 12px`.
- Font-size corps : 12-13px.
- Font-size headers : **10.5px majuscules tracking 0.08em**, via la classe `.section-title` ou via `<SectionTitle>`.
- Les colonnes numériques utilisent **toujours** `font-mono` + `tabular-nums`.

### Accent
- **UNE** couleur d'accent dans toute l'UI : `var(--accent)` = ambre technique `#a66400`.
- Elle s'utilise uniquement pour :
  1. bouton primaire (au plus 1 par Toolbar)
  2. bordure / fond de sélection active
  3. focus-visible outline
  4. shadow inline sur l'onglet actif (`inset 0 -2px 0 var(--accent)`)
- Jamais pour décorer un titre ou une icône isolée.

---

## 📐 Règles de cohérence

### Texte
- Titre de panel : toujours en `panel-head` (MAJUSCULES, 11px, fond overlay sombre).
- Sous-section : toujours `<SectionTitle>`.
- Jamais de texte en italique orné (ex. "*Bienvenue*"). Italique réservé aux notes techniques mineures gris clair.

### Séparation visuelle
- Deux éléments adjacents se distinguent **par une border 1px** (`rule-t`, `rule-b`, `rule-l`, `rule-r`) ou **par une alternance de fond** (`--bg-panel` vs `--bg-panel-alt`).
- Jamais par un gap + shadow.

### Boutons
- `variant="primary"` : fond accent, blanc texte. **Au plus un** par groupe d'actions.
- `variant="default"` : fond panel, border noire 1px.
- `variant="ghost"` : pas de bordure, fond transparent, hover border weak.
- Pas d'icône décorative. Si une icône est nécessaire (ex. ×, ↑, ↓), la dessiner en texte ou mini-SVG neutre.

### Statuts et couleurs
- **buy_exact** → vert forêt `#2d5a3d`
- **buy_and_rework** → ambre `#8a5a00`
- **cut_from_sheet** → ardoise `#333c4d`
- **erreur / bloquant** → rouge `#a2231d` (`AlertStrip kind="error"`)
- **avertissement** → même ambre que rework (`AlertStrip kind="warning"`)
- **info** → même ardoise que débit (`AlertStrip kind="info"`)

Aucune autre couleur n'est autorisée en hors-canvas. (Le canvas SVG de la façade peut utiliser du noir sur des gris chauds, et un liseré accent pour la sélection — c'est tout.)

### Mobile (`pointer: coarse`)
- Les contrôles passent à 36px de hauteur minimum.
- La zone LEFT ou RIGHT du SplitLayout se rétracte plutôt que de s'empiler en scroll.

---

## 🔍 Checklist de revue pour un agent IA

Avant de valider un écran, vérifier chaque point :

1. [ ] Aucune classe Tailwind interdite (`rounded-xl`, `shadow-*`, `bg-*-500`, etc.) dans le diff.
2. [ ] Aucun emoji décoratif dans les labels.
3. [ ] Tous les blocs de contenu utilisent `<Panel>` ou un descendant direct.
4. [ ] Les tableaux utilisent `<DataTable>` ou la classe `.dtable`.
5. [ ] Les statuts de procurement sont rendus via `<ProcurementBadge>`.
6. [ ] L'écran tient dans un `<SplitLayout>` dès qu'il a plus d'une zone logique.
7. [ ] L'accent ne dépasse pas : 1 bouton primary + sélection + focus.
8. [ ] Les métriques utilisent `tabular-nums` et `font-mono`.
9. [ ] Aucune animation autre que les 80ms de fond sur hover.
10. [ ] La densité correspond (ligne 24px, bouton 26px).

Si **un seul** des points ci-dessus échoue : refactor avant de livrer.

---

## 🛑 Règle de dernier recours

> *Si l'interface ressemble encore à un dashboard SaaS moderne générique → c'est un échec. L'outil doit ressembler à un logiciel de production, pas à une startup AI.*

En cas de doute, la référence visuelle implicite est :
- un **terminal de trading** ou un **ERP industriel**
- une **fiche de débit papier** d'atelier
- un **plan technique CAO**

Pas :
- un dashboard Vercel / Supabase / Linear
- une app iOS de tracking de fitness
- une landing page SaaS
- une UI de modèle OpenAI / Anthropic sortie des mains du produit marketing
