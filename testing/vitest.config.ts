// Node-side tests: OCR on screenshots (vision/) and main process handlers.
// The end-to-end overlay tests run with Playwright instead (e2e/).
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Main process code imports electron; the fake host's stand-in serves.
  // '@': the renderer's own code, for tests that read a real screen with it.
  resolve: { alias: { electron: path.resolve(__dirname, 'fake-host/stubs/electron.ts'), '@': path.resolve(__dirname, '../renderer/src') } },
  test: {
    include: ['vision/**/*.test.ts', 'main/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000
  }
})
