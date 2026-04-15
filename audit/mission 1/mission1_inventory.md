# Mission étude #1 — Inventaire presets & variantes

Source: `public/knowledge/base_v3_normalized.json` + logique wizard `src/lib/wizard/variantToResult.ts`.

Types détectés: **17**.

## bibliotheque — Bibliothèque (5 variantes)
- 1. **Bibliothèque ouverte**
  - clés: portes, tiroirs
  - clés prises en charge (variantToResult): portes, tiroirs
  - clés non prises en charge: aucune
- 2. **Bibliothèque avec portes basses**
  - clés: portes_position, tablette_separation
  - clés prises en charge (variantToResult): portes_position, tablette_separation
  - clés non prises en charge: aucune
- 3. **Bibliothèque vitrée**
  - clés: portes, vitrage
  - clés prises en charge (variantToResult): portes
  - clés non prises en charge: vitrage
  - ⚠️ avertissement explicite prévu: vitrage
- 4. **Bibliothèque enfant**
  - clés: hauteur_mm, profondeur_mm, niches_bacs
  - clés prises en charge (variantToResult): hauteur_mm, profondeur_mm, niches_bacs
  - clés non prises en charge: aucune
- 5. **Bibliothèque suspendue**
  - clés: fixation_murale
  - clés prises en charge (variantToResult): fixation_murale
  - clés non prises en charge: aucune

## placard — Placard / Dressing (4 variantes)
- 1. **Penderie simple**
  - clés: tringle, tablettes, tiroirs
  - clés prises en charge (variantToResult): tringle, tablettes, tiroirs
  - clés non prises en charge: aucune
- 2. **Dressing complet**
  - clés: tringle_haute, tringle_basse, tiroirs, tablettes
  - clés prises en charge (variantToResult): tringle_haute, tringle_basse, tiroirs, tablettes
  - clés non prises en charge: aucune
- 3. **Placard d'entrée**
  - clés: profondeur_mm, pateres, etagere_chaussures
  - clés prises en charge (variantToResult): profondeur_mm, etagere_chaussures
  - clés non prises en charge: pateres
  - ⚠️ avertissement explicite prévu: pateres
- 4. **Dressing ouvert sans porte**
  - clés: portes
  - clés prises en charge (variantToResult): portes
  - clés non prises en charge: aucune

## cuisine — Cuisine (3 variantes)
- 1. **Casserolier (tiroirs uniquement)**
  - clés: portes, tiroirs
  - clés prises en charge (variantToResult): portes, tiroirs
  - clés non prises en charge: aucune
- 2. **Caisson avec casserolier**
  - clés: tiroirs_profonds
  - clés prises en charge (variantToResult): tiroirs_profonds
  - clés non prises en charge: aucune
- 3. **Colonne four + micro-ondes**
  - clés: niches_techniques
  - clés prises en charge (variantToResult): niches_techniques
  - clés non prises en charge: aucune

## bureau — Bureau (2 variantes)
- 1. **Bureau avec caisson tiroirs**
  - clés: caisson, tiroirs
  - clés prises en charge (variantToResult): tiroirs
  - clés non prises en charge: caisson
  - ⚠️ avertissement explicite prévu: caisson
- 2. **Bureau niche imprimante**
  - clés: niche_technique
  - clés prises en charge (variantToResult): niche_technique
  - clés non prises en charge: aucune

## meuble_tv — Meuble TV (2 variantes)
- 1. **Meuble TV bas posé**
  - clés: hauteur_mm, pieds
  - clés prises en charge (variantToResult): hauteur_mm, pieds
  - clés non prises en charge: aucune
- 2. **Meuble TV suspendu**
  - clés: hauteur_mm, fixation
  - clés prises en charge (variantToResult): hauteur_mm, fixation
  - clés non prises en charge: aucune

## armoire — Armoire (2 variantes)
- 1. **Armoire lingère**
  - clés: tablettes, tringle
  - clés prises en charge (variantToResult): tablettes, tringle
  - clés non prises en charge: aucune
- 2. **Armoire bonnetière**
  - clés: porte_unique, largeur_etroite
  - clés prises en charge (variantToResult): porte_unique
  - clés non prises en charge: largeur_etroite

## buffet — Buffet / Enfilade (1 variante)
- 1. **Enfilade portes + tiroirs hauts**
  - clés: tiroirs_hauts
  - clés prises en charge (variantToResult): tiroirs_hauts
  - clés non prises en charge: aucune

## etagere_murale — Étagère murale (0 variante)
- Aucune variante rapide définie.

## meuble_salle_de_bain — Meuble salle de bain (0 variante)
- Aucune variante rapide définie.

## commode — Commode / Chiffonnier (1 variante)
- 1. **Chiffonnier étroit**
  - clés: largeur_mm, nb_tiroirs
  - clés prises en charge (variantToResult): largeur_mm, nb_tiroirs
  - clés non prises en charge: aucune

## table — Table sur mesure (3 variantes)
- 1. **Table de repas**
  - clés: hauteur_mm
  - clés prises en charge (variantToResult): hauteur_mm
  - clés non prises en charge: aucune
- 2. **Table basse**
  - clés: hauteur_mm, profondeur_mm
  - clés prises en charge (variantToResult): hauteur_mm, profondeur_mm
  - clés non prises en charge: aucune
- 3. **Table haute / bar**
  - clés: hauteur_mm, tabouret_mm
  - clés prises en charge (variantToResult): hauteur_mm
  - clés non prises en charge: tabouret_mm
  - ⚠️ avertissement explicite prévu: tabouret_mm

## sous_escalier — Meuble sous-escalier (2 variantes)
- 1. **Tiroirs extractibles (zone basse)**
  - clés: type
  - clés prises en charge (variantToResult): type
  - clés non prises en charge: aucune
- 2. **Vestiaire d'entrée**
  - clés: pateres, banc
  - clés prises en charge (variantToResult): banc
  - clés non prises en charge: pateres
  - ⚠️ avertissement explicite prévu: pateres

## banquette_coffre — Banquette / Coffre d'entrée (0 variante)
- Aucune variante rapide définie.

## meuble_chaussures — Meuble à chaussures (4 variantes)
- 1. **Meuble fermé avec portes**
  - clés: profondeur_mm, portes
  - clés prises en charge (variantToResult): profondeur_mm, portes
  - clés non prises en charge: aucune
- 2. **Tablettes inclinées ouvertes**
  - clés: profondeur_mm, portes
  - clés prises en charge (variantToResult): profondeur_mm, portes
  - clés non prises en charge: aucune
- 3. **Abattants basculants**
  - clés: profondeur_mm, compact
  - clés prises en charge (variantToResult): profondeur_mm
  - clés non prises en charge: compact
  - ⚠️ avertissement explicite prévu: compact
- 4. **Banc à chaussures**
  - clés: assise, hauteur_mm
  - clés prises en charge (variantToResult): assise, hauteur_mm
  - clés non prises en charge: aucune

## lit_cabane_mezzanine — Lit cabane / Mezzanine enfant (0 variante)
- Aucune variante rapide définie.

## vestiaire_entree — Vestiaire d'entrée (0 variante)
- Aucune variante rapide définie.

## cave_vin — Cave à vin / Casier bouteilles (0 variante)
- Aucune variante rapide définie.

