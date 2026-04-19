# A2 — Bibliothèque avec portes basses en mélaminé

- ID catalogue : A2
- Titre : Bibliothèque avec portes basses
- Famille : A — Mobilier courant
- Objectif : couvrir un warning de fléchissement probable sur tablettes en matériau faible.
- Issue attendue : `MOD_SHELF_ADJUSTABLE_C0`.
- Source issue : contrainte `shelf_adjustable` dans `src/lib/knowledge/modules.ts`.

Source catalogue : dimensions `1600 × 2400 × 320 mm`, plinthe `80 mm`, `door_override=true`. Le matériau `melamine` est choisi pour exercer la contrainte `zone_width_mm > 800 && (material == 'melamine' || material == 'osb')`.
