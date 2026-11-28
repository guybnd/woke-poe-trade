// Browser bits the renderer expects, for tests running in Node.
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(__dirname, '../..')

// fetch('/data/...') reads the file from disk; everything else is a
// test bug (tests must not hit the network).
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (url.startsWith('/data/')) {
    const file = path.join(ROOT, 'public', decodeURIComponent(url.split('?')[0]))
    const body = fs.readFileSync(file)
    return new Response(body, { status: 200 })
  }
  if (process.env.WOKE_TEST_ALLOW_NET) return await realFetch(input, init)
  throw new Error(`Test tried to fetch ${url}. Use a fixture instead.`)
}) as typeof fetch

// Minimal localStorage, for modules that remember small things.
if (!('localStorage' in globalThis)) {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length () { return store.size }
  }
}

// The loot filter's own base ranks load with the filter in the app; tests
// read them straight away.
await import('@/web/woke/loot-filter/base-ranks').then(m => m.loadBaseRanks())
