import { shallowRef } from 'vue'
import { DEFAULT_ATLAS_DATA_URL, parseAtlasData } from './tree'
import type { AtlasNode } from './tree'
import type { AtlasTreeModel } from './atlas-tree'
import { perfTimeAsync, whenIdle } from '../shared/perf'

export * from './strategies'

// Atlas tree data (about 1.4 MB), cached in localStorage so the tree draws at
// once. The cache is checked against the download again once it's 6 hours
// old: GGG's export changes several times around a league launch (3.30's
// first preview said 138 points, the second 150, both on one night), and a
// week-old cache kept the wrong one. A download that matches the cache only
// stamps the check time; it isn't read or saved again.
const CACHE_KEY = 'woke-atlas-data'
const CHECKED_KEY = 'woke-atlas-data-checked'
export const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000

// A cheap fingerprint of the downloaded text (FNV-1a and the length), to tell
// an unchanged download without parsing it.
export function textSig (text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${text.length}:${(h >>> 0).toString(16)}`
}

// Whether the cache still counts as current: saved or last checked within
// the max age. A stamp from the future (the clock was ahead) doesn't count,
// so the next check stamps a real time instead of downloading every start.
export function cacheFresh (savedAt: number | undefined, checkedAt: number | undefined, now: number): boolean {
  const at = Math.max(...[savedAt ?? 0, checkedAt ?? 0].filter(t => t <= now))
  return at > 0 && now - at < CACHE_MAX_AGE_MS
}

function checkedAt (url: string): number | undefined {
  try {
    const raw = localStorage.getItem(CHECKED_KEY)
    if (!raw) return undefined
    const c = JSON.parse(raw) as { url?: string, at?: number }
    return c.url === url && typeof c.at === 'number' ? c.at : undefined
  } catch {
    return undefined
  }
}
const atlasData = shallowRef<Map<number, AtlasNode> | null>(null)
const atlasDataError = shallowRef('')
// The same data as a tree to draw and edit.
const atlasTree = shallowRef<AtlasTreeModel | null>(null)
// The data loaded but can't be drawn (its format changed): the editor says so.
const atlasTreeError = shallowRef('')
let loadingUrl: string | null = null

// A tree that can't be drawn still leaves the notable list working. Its code
// loads with the data, off the startup path.
async function readTree (json: unknown, url: string): Promise<AtlasTreeModel | null> {
  try {
    const { readAtlasTree } = await import('./atlas-tree')
    atlasTreeError.value = ''
    return readAtlasTree(json, url)
  } catch (err) {
    atlasTreeError.value = `The atlas tree can't be drawn: ${(err as Error).message}`
    return null
  }
}

export function useAtlasData (url: string) {
  const target = url || DEFAULT_ATLAS_DATA_URL
  if (loadingUrl !== target) {
    loadingUrl = target
    atlasDataError.value = ''
    // Off the startup path: reading the cache parses a large JSON.
    whenIdle(() => {
      perfTimeAsync('Atlas: load tree data', load(target)).catch((err: Error) => {
        if (loadingUrl === target) atlasDataError.value = err.message
      })
    })
  }
  return { atlasData, atlasDataError, atlasTree, atlasTreeError }
}

// The loaded data, without starting a load.
export function atlasDataState () {
  return { atlasData, atlasDataError, atlasTree, atlasTreeError }
}

// The atlas nodes for the Claude link: loaded ones, else the saved copy, read
// once without keeping it (the window may never open). Null: never downloaded.
export function cachedAtlasData (): Map<number, AtlasNode> | null {
  if (atlasData.value) return atlasData.value
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    return cached ? parseAtlasData((JSON.parse(cached) as { json: unknown }).json) : null
  } catch {
    return null
  }
}

// After a failed download: try the same URL again.
export function retryAtlasData (url: string) {
  loadingUrl = null
  return useAtlasData(url)
}

async function load (url: string) {
  // The cache is on screen: a failed check keeps it, without an error.
  let shown = false
  let cachedSig: string | undefined
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { url: cachedUrl, json, at, sig } = JSON.parse(cached) as { url: string, json: unknown, at?: number, sig?: string }
      if (cachedUrl === url && loadingUrl === url) {
        atlasData.value = parseAtlasData(json)
        const tree = await readTree(json, url)
        if (loadingUrl !== url) return
        atlasTree.value = tree
        shown = true
        cachedSig = sig
        if (cacheFresh(at, checkedAt(url), Date.now())) return
      }
    }
  } catch {}

  let text: string
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Atlas data download failed (${res.status})`)
    text = await res.text()
  } catch (err) {
    if (shown && loadingUrl === url) return
    throw err
  }
  // The data URL changed while this one downloaded: keep the newer data.
  if (loadingUrl !== url) return
  const sig = textSig(text)
  if (shown && sig === cachedSig) {
    try {
      localStorage.setItem(CHECKED_KEY, JSON.stringify({ url, at: Date.now() }))
    } catch {}
    return
  }
  let json: unknown
  let parsed: Map<number, AtlasNode>
  let tree: AtlasTreeModel | null
  try {
    json = JSON.parse(text)
    parsed = parseAtlasData(json)
    tree = await readTree(json, url)
  } catch (err) {
    if (shown && loadingUrl === url) return
    throw err
  }
  if (loadingUrl !== url) return
  // A download that can't be drawn (a changed format, a cut-off file) never
  // replaces a cached tree that can; it isn't saved either.
  if (shown && !tree && atlasTree.value) {
    atlasTreeError.value = ''
    return
  }
  atlasData.value = parsed
  atlasTree.value = tree
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ url, json, at: Date.now(), sig }))
    localStorage.removeItem(CHECKED_KEY)
  } catch {}
}
