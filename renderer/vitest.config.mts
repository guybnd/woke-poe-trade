// Unit + replay tests for the renderer (APT core and woke modules).
// Run: npm test (or npx vitest from renderer/). See testing/README.md.
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // Data files load from `/data/...` (public/). The fetch shim in
  // test/setup/env.ts reads them; this resolves the dynamic imports.
  publicDir: false,
  plugins: [vue(), {
    name: 'woke-test-public-data',
    enforce: 'pre',
    resolveId (id) {
      if (id.startsWith('/data/')) return path.resolve(__dirname, 'public' + id)
      // Images and other files the app serves from public/ (/images/...): only
      // `vitest related` (pull requests, ci-scope) reaches the pages using them.
      if (/^\/[^/]/.test(id) && fs.statSync(path.join(__dirname, 'public', id), { throwIfNoEntry: false })?.isFile()) return path.join(__dirname, 'public', id)
    }
  }],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ipc': path.resolve(__dirname, '../ipc'),
      '@fixtures': path.resolve(__dirname, '../testing/fixtures'),
      electron: path.resolve(__dirname, 'test/setup/electron-stub.ts')
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['test/setup/global.ts'],
    setupFiles: ['test/setup/env.ts'],
    testTimeout: 20_000
  }
})
