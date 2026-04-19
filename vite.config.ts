import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isGoldenRun = process.argv.some((arg) => arg.includes('tests/golden'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      ...(isGoldenRun ? [] : ['tests/golden/**']),
    ],
  },
})
