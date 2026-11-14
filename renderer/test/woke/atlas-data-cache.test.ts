// The atlas tree data cache: drawn at once, checked again after 6 hours, so a
// changed export (3.30's preview went from 138 to 150 points) shows up.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/web/woke/shared/perf', () => ({
  perfTimeAsync: async <T>(_name: string, p: Promise<T>) => await p,
  whenIdle: (fn: () => void) => { setTimeout(fn, 0) }
}))

const URL_A = 'https://example.test/atlas/data.json'
const atlas = (points: number) => ({
  nodes: { root: { out: ['1'] }, 1: { skill: 1, name: 'Start', group: 1, orbit: 0, orbitIndex: 0, out: ['2'] }, 2: { skill: 2, name: 'Small', group: 1, orbit: 1, orbitIndex: 0, stats: ['1% more'] } },
  groups: { 1: { x: 0, y: 0 } },
  points: { totalPoints: points }
})
const HOUR = 60 * 60 * 1000

async function loadWidget () {
  vi.resetModules()
  return await import('@/web/woke/atlas/widget')
}

function respond (body: string) {
  const calls: string[] = []
  vi.stubGlobal('fetch', async (u: string) => { calls.push(u); return new Response(body, { status: 200 }) })
  return calls
}

async function settle (check: () => boolean) {
  for (let i = 0; i < 100 && !check(); i++) await new Promise(resolve => setTimeout(resolve, 10))
}

describe('atlas data cache', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('replaces a cache older than 6 hours with the changed export', async () => {
    localStorage.setItem('woke-atlas-data', JSON.stringify({ url: URL_A, json: atlas(138), at: Date.now() - 2 * 24 * HOUR }))
    const calls = respond(JSON.stringify(atlas(150)))
    const w = await loadWidget()
    const { atlasTree } = w.useAtlasData(URL_A)
    await settle(() => atlasTree.value?.points === 150)
    expect(atlasTree.value?.points).toBe(150)
    expect(calls).toEqual([URL_A])
    const saved = JSON.parse(localStorage.getItem('woke-atlas-data')!) as { json: { points: { totalPoints: number } }, sig: string }
    expect(saved.json.points.totalPoints).toBe(150)
    expect(saved.sig).toBe(w.textSig(JSON.stringify(atlas(150))))
  })

  it('keeps a fresh cache without downloading', async () => {
    localStorage.setItem('woke-atlas-data', JSON.stringify({ url: URL_A, json: atlas(150), at: Date.now() - HOUR }))
    const calls = respond('never read')
    const w = await loadWidget()
    const { atlasTree } = w.useAtlasData(URL_A)
    await settle(() => atlasTree.value != null)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(atlasTree.value?.points).toBe(150)
    expect(calls).toEqual([])
  })

  it('an unchanged download only stamps the check time', async () => {
    const body = JSON.stringify(atlas(150))
    const old = Date.now() - 7 * HOUR
    const w0 = await loadWidget()
    localStorage.setItem('woke-atlas-data', JSON.stringify({ url: URL_A, json: atlas(150), at: old, sig: w0.textSig(body) }))
    const calls = respond(body)
    const w = await loadWidget()
    w.useAtlasData(URL_A)
    await settle(() => localStorage.getItem('woke-atlas-data-checked') != null)
    expect(calls).toEqual([URL_A])
    expect((JSON.parse(localStorage.getItem('woke-atlas-data')!) as { at: number }).at).toBe(old)
    const checked = JSON.parse(localStorage.getItem('woke-atlas-data-checked')!) as { url: string, at: number }
    expect(checked.url).toBe(URL_A)
    expect(w.cacheFresh(old, checked.at, Date.now())).toBe(true)
  })

  it('a failed check keeps the cached tree without an error', async () => {
    localStorage.setItem('woke-atlas-data', JSON.stringify({ url: URL_A, json: atlas(138), at: Date.now() - 2 * 24 * HOUR }))
    vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch') })
    const w = await loadWidget()
    const { atlasTree, atlasDataError } = w.useAtlasData(URL_A)
    await settle(() => atlasTree.value != null)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(atlasTree.value?.points).toBe(138)
    expect(atlasDataError.value).toBe('')
  })

  it('counts a cache as fresh only within 6 hours of its last save or check', async () => {
    const { cacheFresh } = await loadWidget()
    const now = 1_000_000_000_000
    expect(cacheFresh(now - HOUR, undefined, now)).toBe(true)
    expect(cacheFresh(now - 7 * HOUR, undefined, now)).toBe(false)
    expect(cacheFresh(now - 7 * 24 * HOUR, now - HOUR, now)).toBe(true)
    expect(cacheFresh(undefined, undefined, now)).toBe(false)
    expect(cacheFresh(now + HOUR, undefined, now)).toBe(false)
    expect(cacheFresh(now + HOUR, now - HOUR, now)).toBe(true)
  })

  for (const [name, reply] of [
    ['an error status', () => new Response('', { status: 503 })],
    ["a page that isn't JSON", () => new Response('<html>sign in</html>', { status: 200 })],
    ["an export in a format it can't read", () => new Response(JSON.stringify({ nodes: {} }), { status: 200 })]
  ] as Array<[string, () => Response]>) {
    it(`keeps the cached tree and its cache over ${name}`, async () => {
      const at = Date.now() - 2 * 24 * HOUR
      localStorage.setItem('woke-atlas-data', JSON.stringify({ url: URL_A, json: atlas(138), at }))
      let calls = 0
      vi.stubGlobal('fetch', async () => { calls++; return reply() })
      const w = await loadWidget()
      const { atlasTree, atlasDataError, atlasTreeError } = w.useAtlasData(URL_A)
      await settle(() => calls > 0)
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(atlasTree.value?.points).toBe(138)
      expect(atlasDataError.value).toBe('')
      expect(atlasTreeError.value).toBe('')
      expect((JSON.parse(localStorage.getItem('woke-atlas-data')!) as { at: number }).at).toBe(at)
    })
  }
})
