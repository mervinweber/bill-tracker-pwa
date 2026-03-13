import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    strictPort: false,
    open: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  },
  preview: {
    port: 4173,
    strictPort: false
  }
})
