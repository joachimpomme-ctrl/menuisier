# E1 — Bibliothèque orientée livres

- ID catalogue : E1
- Titre : Bibliothèque orientée livres
- Famille : E — Contenu à ranger
- Objectif : figer la sortie `runPipeline()` pour un intent contenant `contents`.
- Issue attendue : `LAY_MULTI_BODY`.
- Source issue : `src/lib/engine/layout.ts`.

Source catalogue : bibliothèque `1400 × 2200 × 320 mm`, contenu livres de poche, grands livres et BD.

Limite connue : `runPipeline()` ne consomme pas directement `contentToZones()` actuellement. Ce golden capture donc le comportement V3 actuel pour un intent avec `contents`, mais ne prouve pas encore la pertinence de génération de zones depuis le contenu.
