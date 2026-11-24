// Sales and Faustus listings you left out of their totals (the shared line
// item, ui/line-item.ts), one small doc per league: the ids of each.
import { computed, shallowRef } from 'vue'
import { hostRequest } from '../shared/host'

const COLLECTION = 'net-worth'
export type OutKind = 'sale' | 'listed'
export interface LineOutDoc { league: string, sale: string[], listed: string[] }

const doc = shallowRef<LineOutDoc | null>(null)
let loadedFor: string | null = null
let loading: Promise<void> = Promise.resolve()

export const lineOutKey = (league: string) => `line-out:${league}`
const isDoc = (d: unknown): d is LineOutDoc => !!d && typeof d === 'object' &&
  Array.isArray((d as LineOutDoc).sale) && Array.isArray((d as LineOutDoc).listed)

export function loadLineOut (league: string): Promise<void> {
  if (loadedFor === league) return loading
  loadedFor = league
  doc.value = null
  loading = (hostRequest('doc-get', { collection: COLLECTION, key: lineOutKey(league) }) as Promise<unknown>)
    .then((d) => {
      if (loadedFor !== league) return
      // A change made while this loaded wins over the saved doc.
      const saved = isDoc(d) && d.league === league ? d : null
      const now = doc.value
      doc.value = saved && now
        ? { league, sale: [...new Set([...saved.sale, ...now.sale])], listed: [...new Set([...saved.listed, ...now.listed])] }
        : now ?? saved
    })
    .catch(() => { if (loadedFor === league) loadedFor = null })
  return loading
}

export const lineOutDoc = computed(() => doc.value)
// The ids left out, for one league.
export function outIdsOf (d: LineOutDoc | null, league: string | null | undefined, kind: OutKind): ReadonlySet<string> {
  return new Set(d && league && d.league === league ? d[kind] : [])
}

export async function setLineOut (league: string, kind: OutKind, id: string, out: boolean): Promise<void> {
  await loadLineOut(league)
  const cur = doc.value?.league === league ? doc.value : { league, sale: [], listed: [] }
  const list = cur[kind].filter(x => x !== id)
  if (out) list.push(id)
  const next: LineOutDoc = { ...cur, [kind]: list }
  doc.value = next
  await hostRequest('doc-put', { collection: COLLECTION, key: lineOutKey(league), value: next }).catch(() => {})
}
