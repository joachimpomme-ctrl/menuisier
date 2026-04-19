import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // TypeScript applique deja noUnusedLocals/noUnusedParameters via `npm run typecheck`.
      // Garder une seule source de verite evite les doublons et faux positifs ESLint/TS.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: [
      'src/components/HelpGuide.tsx',
      'src/components/MoreMenu.tsx',
      'src/components/result/Assumptions.tsx',
      'src/components/result/Facade2DView.tsx',
      'src/components/structure/Glossary.tsx',
    ],
    rules: {
      // Ces composants exportent aussi des helpers purs exercés par les tests unitaires.
      // Les déplacer serait un refactor hors périmètre du ménage ESLint.
      'react-refresh/only-export-components': 'off',
    },
  },
])
