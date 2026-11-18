// What a pull request tests (testing/tools/ci-scope.mjs, testing/e2e/scope.json).
import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
// @ts-expect-error plain JS module
import { scope } from '../tools/ci-scope.mjs'

const ROOT = path.resolve(__dirname, '../..')
const DOC = JSON.parse(fs.readFileSync(path.join(ROOT, 'testing/e2e/scope.json'), 'utf8')) as { smoke: string[], specs: Record<string, string[]> }
const SPECS = fs.readdirSync(path.join(ROOT, 'testing/e2e')).filter(f => f.endsWith('.spec.ts')).sort()

describe('the spec map', () => {
  it('lists every spec, and only specs that exist', () => {
    expect(Object.keys(DOC.specs).sort()).toEqual(SPECS)
    for (const s of DOC.smoke) expect(SPECS).toContain(s)
  })

  it('names paths that exist', () => {
    const missing = Object.values(DOC.specs).flat().filter(p => !fs.existsSync(path.join(ROOT, p)))
    expect([...new Set(missing)]).toEqual([])
  })
})

describe('a pull request', () => {
  it('changing one module runs its specs and the smoke set', () => {
    const r = scope(['renderer/src/web/woke/wickerman/WickermanDock.vue'])
    expect(r.e2e).toEqual(['in-game.spec.ts', 'toolkit.spec.ts', 'wickerman-dock.spec.ts', 'wickerman-window.spec.ts'])
    expect(r.unit).toEqual(['src/web/woke/wickerman/WickermanDock.vue'])
  })

  it('changing shared code runs every spec', () => {
    expect(scope(['renderer/src/web/woke/ui/WButton.vue']).e2e).toBe('all')
    expect(scope(['main/src/woke/index.ts']).e2e).toBe('all')
    expect(scope(['testing/e2e/harness.ts']).e2e).toBe('all')
    expect(scope(['.github/workflows/test.yml'])).toEqual({ e2e: 'all', unit: 'all' })
  })

  it('a spec it changes runs, with the smoke set', () => {
    expect(scope(['testing/e2e/trade.spec.ts']).e2e).toEqual(['in-game.spec.ts', 'toolkit.spec.ts', 'trade.spec.ts'])
  })

  it('unit tests alone run themselves and no overlay tests', () => {
    expect(scope(['renderer/test/woke/wickerman.test.ts'])).toEqual({ e2e: [], unit: ['test/woke/wickerman.test.ts'] })
  })

  it('test helpers, data or packages run every unit test', () => {
    expect(scope(['renderer/test/helpers/game-data.ts']).unit).toBe('all')
    expect(scope(['renderer/public/data/en/items.ndjson']).unit).toBe('all')
    expect(scope(['renderer/package-lock.json']).unit).toBe('all')
  })

  it('docs alone run nothing', () => {
    expect(scope(['docs/index.md', 'README.md'])).toEqual({ e2e: [], unit: [] })
  })

  it('price check code runs the price check specs', () => {
    const r = scope(['renderer/src/web/price-check/filters/create-stat-filters.ts'])
    expect(r.e2e).toContain('price-check.spec.ts')
    expect(r.e2e).toContain('pseudo-split.spec.ts')
    expect(r.e2e).not.toContain('loot-filter.spec.ts')
  })
})
