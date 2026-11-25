// Sales and Faustus listings you left out of their tab's total (the shared
// line item, ui/line-item.ts), one small doc per league: the ids of each.
import { computed, shallowRef } from 'vue'
import { hostRequest } from '../shared/host'

const COLLECTION = 'net-worth'
export type OutKind = 'sale' | 'listed'
export interface LineOutDoc { league: string, sale: string[], listed: string[] }

// By league: only docs that were read (or saved) are here, so a write never
// lands on a doc it hasn't seen.
const docs = shallowRef<ReadonlyMap<string, LineOutDoc>>(new Map())
const loading = new Map<string, Promise<boolean>>()
// Writes for one league run one after another.
const writing = new Map<string, Promise<void>>()

export const lineOutKey = (league: string) => `line-out:${league}`
const isDoc = (d: unknown): d is LineOutDoc => !!d && typeof d === 'object' &&
  Array.isArray((d as LineOutDoc).sale) && Array.isArray((d as LineOutDoc).listed)

function put (d: LineOutDoc) { docs.value = new Map(docs.value).set(d.league, d) }

// Resolves true once the league's saved doc is in (or there is none).
export function loadLineOut (league: string): Promise<boolean> {
  if (docs.value.has(league)) return Promise.resolve(true)
  const was = loading.get(league)
  if (was) return was
  // Strict: null only when there's no file yet; a locked one throws (false).
  const p = (hostRequest('doc-get-strict', { collection: COLLECTION, key: lineOutKey(league) }) as Promise<unknown>)
    .then((d) => {
      if (!docs.value.has(league)) put(isDoc(d) && d.league === league ? d : { league, sale: [], listed: [] })
      return true
    })
    .catch(() => false)
    .finally(() => { loading.delete(league) })
  loading.set(league, p)
  return p
}

export const lineOutDoc = computed(() => docs.value)
// The ids left out, for one league.
export function outIdsOf (d: ReadonlyMap<string, LineOutDoc>, league: string | null | undefined, kind: OutKind): ReadonlySet<string> {
  const doc = league ? d.get(league) : undefined
  return new Set(doc ? doc[kind] : [])
}

export function setLineOut (league: string, kind: OutKind, id: string, out: boolean): Promise<void> {
  const run = async () => {
    // Not read (the app didn't answer): nothing is saved over it.
    if (!await loadLineOut(league)) throw new Error("Couldn't read what you left out")
    const cur = docs.value.get(league)!
    const list = cur[kind].filter(x => x !== id)
    if (out) list.push(id)
    const next: LineOutDoc = { ...cur, [kind]: list }
    put(next)
    await hostRequest('doc-put', { collection: COLLECTION, key: lineOutKey(league), value: next })
  }
  const p = (writing.get(league) ?? Promise.resolve()).then(run, run)
  writing.set(league, p.catch(() => {}))
  return p
}
