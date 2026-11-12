import { shallowRef } from 'vue'
import { DEFAULT_ATLAS_DATA_URL, parseAtlasData } from './tree'
import type { AtlasNode } from './tree'
import type { AtlasTreeModel } from './atlas-tree'
import { perfTimeAsync, whenIdle } from '../shared/perf'

export * from './strategies'

// Atlas tree data (about 1.4 MB), cached in localStorage and downloaded again
// only when the cache is a week old, so startup doesn't refetch it every time.
const CACHE_KEY = 'woke-atlas-data'
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const atlasData = shallowRef<Map<number, AtlasNode> | null>(null)
const atlasDataError = shallowRef('')
// The same data as a tree to draw and edit.
const atlasTree = shallowRef<AtlasTreeModel | null>(null)
// The data loaded but can't be drawn (its format changed): the editor says so.
const atlasTreeError = shallowRef('')
let loadingUrl: string | null = null

// A tree that can't be drawn still leaves the notable list working. Its code
// loads with the data, off the startup path.
async function readTree (json: unknown): Promise<AtlasTreeModel | null> {
  try {
    const { readAtlasTree } = await import('./atlas-tree')
    atlasTreeError.value = ''
    return readAtlasTree(json)
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

// After a failed download: try the same URL again.
export function retryAtlasData (url: string) {
  loadingUrl = null
  return useAtlasData(url)
}

async function load (url: string) {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { url: cachedUrl, json, at } = JSON.parse(cached) as { url: string, json: unknown, at?: number }
      if (cachedUrl === url && loadingUrl === url) {
        atlasData.value = parseAtlasData(json)
        const tree = await readTree(json)
        if (loadingUrl !== url) return
        atlasTree.value = tree
        if (at && Date.now() - at < CACHE_MAX_AGE_MS) return
      }
    }
  } catch {}

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Atlas data download failed (${res.status})`)
  const json: unknown = await res.json()
  const parsed = parseAtlasData(json)
  // The data URL changed while this one downloaded: keep the newer data.
  if (loadingUrl !== url) return
  const tree = await readTree(json)
  if (loadingUrl !== url) return
  atlasData.value = parsed
  atlasTree.value = tree
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ url, json, at: Date.now() }))
  } catch {}
}
