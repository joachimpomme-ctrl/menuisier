# Menuisier

Outil de conception paramétrique de meubles sur mesure. Génère les plans de débit, la liste de quincaillerie et le guide d'assemblage à partir d'un intent structuré.

Production : [menuisier-six.vercel.app](https://menuisier-six.vercel.app)

---

## Architecture

```
ProjectIntent  →  runPipeline()  →  PipelineResult
                  src/core/index.ts
```

Le moteur V3 est une fonction pure sans dépendance React. L'UI consomme le résultat via un bridge (`pipelineResultToAppState`).

### Couches

| Dossier | Rôle |
|---|---|
| `src/core/` | Point d'entrée public du moteur — API stable |
| `src/lib/engine/` | 8 étapes du pipeline (intent → layout → structure → geometry → hardware → validation → production → procurement) |
| `src/lib/knowledge/` | Types, catalogue de modules, chargement KB |
| `src/lib/knowledge/rules/` | Seuils métier (`THRESHOLDS`) |
| `src/data/` | Propriétés physiques des matériaux |
| `src/schemas/` | JSON Schemas des sources déclaratives |
| `public/knowledge/` | Base de connaissance JSON (`base_v3_normalized.json`) |
| `tests/golden/` | Tests golden — fixent le contrat de sortie du moteur |
| `docs/` | Documentation technique (contrat moteur, taxonomie, CI) |

---

## Commandes

```bash
npm run dev           # serveur de développement
npm run build         # build production
npm run typecheck     # vérification TypeScript
npm run lint          # ESLint
npm run test          # tests unitaires (431 tests)
npm run test:golden   # tests golden V3 (5 cas de référence)
npm run validate:kb   # validation JSON Schema des sources déclaratives
```

---

## Moteur V3

```ts
import { run } from './src/core';

const result = run({
  furniture_type: 'bibliotheque',
  material_key: 'cp_bouleau',
  space: { width_mm: 1200, height_mm: 2200, depth_mm: 300, plinth_mm: 80, wall_type: 'concrete' },
});
// result.parts, result.validation, result.production...
```

Consommable sans React. La KB est optionnelle (`loadKnowledge()`) — le moteur fonctionne avec des valeurs de secours si elle n'est pas chargée.

Contrat complet : [`docs/engine-contract.md`](docs/engine-contract.md)

---

## Sources déclaratives

Le comportement du moteur est piloté par quatre sources de données validées automatiquement à chaque build :

| Source | Rôle |
|---|---|
| `public/knowledge/base_v3_normalized.json` | Presets meubles, modules compatibles |
| `src/lib/knowledge/modules.ts` | Catalogue des 8 modules avec contraintes |
| `src/lib/knowledge/rules/thresholds.ts` | Seuils numériques (anti-basculement, profondeur penderie, etc.) |
| `src/data/materials.ts` | Propriétés physiques des matériaux |

Taxonomie déclaratif/calculatoire : [`docs/engine-taxonomy.md`](docs/engine-taxonomy.md)

---

## CI

5 jobs sur chaque PR et push sur `main` : `typecheck`, `lint`, `unit`, `golden`, `build`, `validate-kb`.

Configuration branch protection : [`docs/ci-setup.md`](docs/ci-setup.md)

---

## Stack

React 19 · Vite 8 · TypeScript 6 · Vitest 4 · Tailwind 4 · Vercel
