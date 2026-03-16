import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const syncServiceWorkerPlugin = () => {
  const srcPath = path.resolve(process.cwd(), 'src/service-worker.js')
  const publicPath = path.resolve(process.cwd(), 'public/service-worker.js')

  const syncServiceWorker = () => {
    if (!fs.existsSync(srcPath)) {
      return
    }

    const source = fs.readFileSync(srcPath, 'utf8')

    fs.mkdirSync(path.dirname(publicPath), { recursive: true })
    fs.writeFileSync(publicPath, source, 'utf8')
  }

  return {
    name: 'sync-service-worker',
    buildStart() {
      syncServiceWorker()
    },
    configureServer(server) {
      syncServiceWorker()
      server.watcher.add(srcPath)
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === srcPath) {
          syncServiceWorker()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [syncServiceWorkerPlugin()],
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
