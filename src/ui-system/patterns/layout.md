# Pattern — Layout 4 zones (Terminal Métier)

## Objectif

Un outil de production se lit en un coup d'œil. Pas de scroll vertical obligatoire pour "trouver" l'info critique. Pas de cascade de cards. Pas de tabs qui cachent la moitié du travail.

On applique donc un **layout 4 zones rigide**, inspiré des terminaux de trading et des ERP industriels.

## Schéma de référence

```
 +----------------------------------------------------------------------+
 |  [start]                [middle: metrics]                [end: CTA]  |   ← Toolbar 40px
 +---------+---------------------------------------+--------------------+
 |         |                                       |                    |
 |  LEFT   |              CENTER                   |      RIGHT         |
 |         |                                       |                    |
 |  280-   |    façade 2D interactive              |    inspecteur      |
 |  360px  |    (sélection body/zone)              |    propriétés      |
 |         |                                       |    pièce           |
 |  wizard |                                       |    280-340px       |
 |         |                                       |                    |
 +---------+---------------------------------------+--------------------+
 |                          BOTTOM                                      |
 |        procurement summary · warnings · infos                        |
 +----------------------------------------------------------------------+
```

## Implémentation

Utiliser **uniquement** le composant canonique `<SplitLayout />` :

```tsx
import {
  SplitLayout,
  Toolbar, ToolbarButton, ToolbarMetric,
} from '@/ui-system';

<SplitLayout
  toolbar={
    <Toolbar
      start={<ProjectCrumb />}
      end={
        <>
          <ToolbarButton onClick={onModify}>Modifier</ToolbarButton>
          <ToolbarButton variant="primary" onClick={onExport}>Export PDF</ToolbarButton>
        </>
      }
    >
      <ToolbarMetric label="Larg" value={1200} unit="mm" />
      <ToolbarMetric label="Haut" value={2000} unit="mm" />
      <ToolbarMetric label="Pièces" value={42} />
    </Toolbar>
  }
  left={<WizardPanel />}
  center={<FacadePanel />}
  right={<InspectorPanel />}
  bottom={<ProcurementAndAlertsPanel />}
/>
```

## Règles de zone

### Toolbar (haut, 40px fixe)

- **start** : identité projet (type + variante courante)
- **middle** : métriques clés (dimensions + compteurs), 8 maximum, séparées par des filets 1px
- **end** : max 3 boutons dont 1 seul `variant="primary"`

Interdit : logos, avatars utilisateur, cloches de notifications, barres de recherche globales.

### LEFT — Wizard / paramètres (280 à 360px)

- Empile l'étape courante du wizard, les boutons de variantes rapides, les champs d'entrée
- Toujours un seul `<Panel>` par étape, `flush` pour les tableaux
- Pas de décor, pas d'illustration

### CENTER — Canvas principal (flex, expansion libre)

- Vue façade 2D interactive en monochrome (`monochrome` prop)
- Le centre est la seule zone qui peut avoir une grande hauteur visuelle
- Légende + warnings façade empilés dessous

Interdit : overlay modal au-dessus du canvas, toolbar flottante, mini-map décorative.

### RIGHT — Inspecteur (280 à 340px)

- Affiche les propriétés de la pièce (ou zone, ou corps) sélectionnée dans le centre
- Uniquement `<PropertyGrid />` + sections `<SectionTitle />`
- Bouton "×" compact en haut à droite pour désélectionner

### BOTTOM — Indicateurs condensés

- Grid 3 colonnes : **Procurement summary** | **Avertissements** | **Infos**
- Séparées par borders 1px verticales
- Hauteur auto mais bornée à ~140px max — au-delà, scroll interne

## Densité

Chiffres à respecter :

| Élément | Valeur |
|---|---|
| Hauteur d'une ligne de tableau | 24px |
| Hauteur d'un bouton toolbar | 26px |
| Hauteur du header de panel | 28px |
| Padding intérieur d'un panel | 10px 12px |
| Gap entre zones | 0 (borders only) |
| Font-size corps | 12px — 13px |
| Font-size headers | 10.5px majuscules |

Toute valeur plus généreuse que ça DOIT être justifiée dans un commentaire. Par défaut, réduire.

## Responsive (< 960px viewport)

Le layout rigide à 3 colonnes ne tient plus. Conventions :

1. **LEFT** se rétracte en tiroir gauche contrôlé par un `ToolbarButton` "Panneau".
2. **RIGHT** se rétracte de la même manière à droite, ou s'affiche comme bottom-sheet quand une pièce est sélectionnée.
3. **CENTER** occupe 100%.
4. **BOTTOM** reste visible mais passe en tabs (Procurement / Alerts) plutôt qu'en colonnes.

`SplitLayout` ne gère PAS encore ce comportement : c'est au parent de détecter `window.innerWidth` et de passer `left={undefined}` ou `right={undefined}`. Le composant s'adapte automatiquement aux zones absentes.

## Anti-patterns interdits

- Zones séparées par des gaps (`gap-4`) ou des marges — on sépare par des borders uniquement.
- Hero section en tête d'écran.
- Illustration vectorielle "friendly" dans une zone vide.
- Cards flottantes qui se superposent au layout.
- Sidebar rétractable avec gros hamburger — remplacer par un simple `ToolbarButton`.
- Modal plein écran pour afficher le détail d'une pièce — utiliser la zone RIGHT.
