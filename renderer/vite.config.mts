import path from 'path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { makeIndexFilesPlugin } from './src/assets/vite-plugin-make-indexes'

const PROXIED = /^\/(config|uploads|proxy|live-data|events)/

// A request Vite can't decode is the page's bug, not a build error: name it in the
// log and fail just that request. Left to Vite, it throws to the error screen.
function badUrlsPlugin (): Plugin {
  return {
    name: 'woke-bad-urls',
    configureServer (server) {
      server.middlewares.use((req, res, next) => {
        // These go on to the app, which reads them fine.
        if (PROXIED.test(req.url ?? '')) {
          next()
          return
        }
        try {
          decodeURI(req.url ?? '')
          next()
        } catch {
          server.config.logger.warn(`[woke] URL that can't be decoded: ${req.url ?? ''} (from ${req.headers.referer ?? 'unknown'})`)
          res.statusCode = 400
          res.end()
        }
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
    assetsInlineLimit: 0
  },
  optimizeDeps: {
    esbuildOptions: { target: 'esnext' }
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'webview'
        }
      }
    }),
    makeIndexFilesPlugin(),
    badUrlsPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ipc': path.resolve(__dirname, './src/../../ipc')
    }
  },
  server: {
    // The overlay sits over the game, with no way to dismiss Vite's error screen
    // from there: errors go to the log and the console.
    hmr: { overlay: false },
    proxy: {
      '^/(config|uploads|proxy|live-data)': { target: 'http://127.0.0.1:8584' },
      '/events': { ws: true, target: 'http://127.0.0.1:8584' }
    }
  }
})
