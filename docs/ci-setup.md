# Configuration CI GitHub Actions

## Workflow

Le workflow `.github/workflows/ci.yml` s'exécute sur :

- chaque `pull_request`;
- chaque `push` sur `main`.

Jobs GitHub Actions à rendre bloquants :

- `typecheck`
- `lint`
- `unit`
- `golden`
- `build`

Le déploiement preview Vercel reste géré par l'intégration Vercel existante. Il coexiste avec cette CI GitHub Actions, mais ne fait pas partie de ce workflow.

## Branch protection `main`

À configurer manuellement dans GitHub, car Codex n'a pas les droits d'administration du dépôt.

Chemin :

```text
Settings > Branches > Branch protection rules > main
```

Activer les règles suivantes :

1. `Require status checks to pass before merging`
2. `Require branches to be up to date before merging`
3. `Do not allow bypassing the above settings`

Dans la liste des checks requis, cocher :

- `typecheck`
- `lint`
- `unit`
- `golden`
- `build`

## Comportement attendu

- Une PR vide doit passer les 5 jobs.
- Une régression de type doit échouer sur `typecheck`.
- Une régression ESLint doit échouer sur `lint`.
- Une régression de test unitaire doit échouer sur `unit`.
- Une régression golden doit échouer sur `golden`.
- Une régression de compilation doit échouer sur `build`.

`npm run test` exclut les golden tests. Les golden sont exécutés uniquement par `npm run test:golden`.

## Budget temps

Chaque job installe les dépendances avec `npm ci` et utilise le cache npm de `actions/setup-node`.

Objectif : rester sous 3 minutes de temps mural pour une exécution complète sur `ubuntu-latest`, grâce au parallélisme :

- `typecheck` et `lint` démarrent en parallèle ;
- `unit`, `golden` et `build` attendent `typecheck`, puis s'exécutent en parallèle.
