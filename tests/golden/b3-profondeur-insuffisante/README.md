# B3 — Meuble très peu profond

- ID catalogue : B3
- Titre : Meuble très peu profond
- Famille : B — Cas limites
- Objectif : déclencher une issue bloquante de profondeur insuffisante pour penderie.
- Issues attendues : `LAY_DEPTH_MIN`, `MOD_HANGING_ROD_SHORT_C0`, `VAL_DEPTH_WARDROBE`, `VAL_ROD_DEPTH`.
- Source issues : `src/lib/engine/layout.ts` pour le minimum module, `src/lib/knowledge/modules.ts` pour la contrainte déclarative penderie et `src/lib/engine/validation.ts` pour les validations penderie.

Source catalogue : armoire `1000 × 2200 × 350 mm`. La profondeur `350 mm` est volontairement inférieure au minimum penderie.
