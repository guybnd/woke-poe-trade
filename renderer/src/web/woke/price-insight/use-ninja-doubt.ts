// The doubt line for a poe.ninja price on the instant card and the cached
// verdict (ninja-trust.ts): reads the app's saved daily prices for the item,
// once, and waits briefly for them so the line doesn't flip while it's up.
import { computed, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { useLeagues } from '@/web/background/Leagues'
import { lastWokePrices } from '../market/hook'
import { feedDays } from '../market/parse'
import { typeForSlug, utcDate } from '../market/types'
import { dailyHistory } from '../market/db'
import { ninjaDoubt, categoryOfType, dailySeries } from './ninja-trust'
import type { NinjaDoubt } from './ninja-trust'

const WAIT_MS = 400
// Types the app's snapshots leave out (market/parse.ts).
const NOT_SAVED = new Set(['ClusterJewel', 'BaseType'])

export interface DoubtRow { name: string, variant?: string, chaos: number, graph?: Array<number | null>, slug: string }

export function useNinjaDoubt (row: Ref<DoubtRow | null | undefined>) {
  const leagues = useLeagues()
  const history = shallowRef<Array<number | null> | undefined>(undefined)
  const loading = shallowRef(false)

  watch(row, async (r) => {
    history.value = undefined
    loading.value = false
    const league = leagues.selectedId.value
    const type = r?.slug ? typeForSlug(r.slug) : undefined
    if (!r || !league || !type || NOT_SAVED.has(type)) return
    loading.value = true
    const wait = setTimeout(() => { if (row.value === r) loading.value = false }, WAIT_MS)
    try {
      const rows = await dailyHistory(league, { type, name: r.name, variant: r.variant ?? '' })
      if (row.value === r && loading.value) history.value = dailySeries(rows, utcDate(Date.now()))
    } catch {
      // No saved prices: poe.ninja's own line stands in.
    } finally {
      clearTimeout(wait)
      if (row.value === r) loading.value = false
    }
  }, { immediate: true })

  return computed<NinjaDoubt | null>(() => {
    const r = row.value
    if (!r || loading.value) return null
    const loaded = lastWokePrices()
    return ninjaDoubt({
      chaos: r.chaos,
      graph: r.graph,
      days: loaded ? feedDays(loaded.chunks) : undefined,
      history: history.value,
      category: categoryOfType(r.slug ? typeForSlug(r.slug) : undefined)
    })
  })
}
