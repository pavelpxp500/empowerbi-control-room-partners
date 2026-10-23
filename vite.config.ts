import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

// Portable reference: no cloud calls, production bindings or private-data middleware.
export default defineConfig({
  root,
  plugins: [react()],
  base: '/',
  define: { 'import.meta.env.VITE_OFFLINE': JSON.stringify('true') },
  resolve: { alias: { '@': path.resolve(root, 'src') } },
  build: { outDir: 'dist', sourcemap: false },
})
