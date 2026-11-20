// Node-side tests: OCR on screenshots (vision/) and main process handlers.
// The end-to-end overlay tests run with Playwright instead (e2e/).
import path from 'path'
import { defineConfig } from 'vitest/config'

function localWorkers (fallback: number) {
  if (process.env.CI) return undefined
  return Number(process.env.WOKE_TEST_WORKERS) || fallback
}

export default defineConfig({
  // Main process code imports electron; the fake host's stand-in serves.
  // '@': the renderer's own code, for tests that read a real screen with it.
  resolve: { alias: { electron: path.resolve(__dirname, 'fake-host/stubs/electron.ts'), '@': path.resolve(__dirname, '../renderer/src') } },
  test: {
    include: ['vision/**/*.test.ts', 'main/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // One worker per core by default, which stutters a game running alongside.
    // CI keeps the default; WOKE_TEST_WORKERS overrides it locally.
    poolOptions: { forks: { maxForks: localWorkers(4), minForks: 1 } }
  }
})
