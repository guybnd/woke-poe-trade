// The doubt line for a poe.ninja price on the instant card and the cached
// verdict (ninja-trust.ts): reads the app's saved daily prices for the item,
// once, and waits briefly for them so the line doesn't flip while it's up.
import { computed, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { useLeagues } from '@/web/background/Leagues'
import { usePoeninja } from '@/web/background/Prices'
import { STACKED_DECK, cardCap, cardChance } from '../shared/card-cap'
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
  const ninja = usePoeninja()
  const history = shallowRef<Array<number | null> | undefined>(undefined)
  const loading = shallowRef(false)

  // Keyed by the item, not the row object: a new divine rate makes a new row.
  watch(() => row.value ? `${row.value.slug}\u0000${row.value.name}\u0000${row.value.variant ?? ''}` : '', async (key) => {
    const r = row.value
    history.value = undefined
    loading.value = false
    const league = leagues.selectedId.value
    const type = r?.slug ? typeForSlug(r.slug) : undefined
    if (!r || !league || !type || NOT_SAVED.has(type)) return
    loading.value = true
    const same = () => (row.value ? `${row.value.slug}\u0000${row.value.name}\u0000${row.value.variant ?? ''}` : '') === key
    // A short wait so the line rarely flips; a slower answer (the first read
    // can import old history) still updates it once when it comes.
    const wait = setTimeout(() => { if (same()) loading.value = false }, WAIT_MS)
    try {
      const rows = await dailyHistory(league, { type, name: r.name, variant: r.variant ?? '' })
      if (same()) history.value = dailySeries(rows, utcDate(Date.now()))
    } catch {
      // No saved prices: poe.ninja's own line stands in.
    } finally {
      clearTimeout(wait)
      if (same()) loading.value = false
    }
  }, { immediate: true })

  return computed<NinjaDoubt | null>(() => {
    const r = row.value
    if (!r || loading.value) return null
    const loaded = lastWokePrices()
    const category = categoryOfType(r.slug ? typeForSlug(r.slug) : undefined)
    // A card priced over what its drop rate allows (shared/card-cap.ts).
    if (category === 'cards') {
      const cap = cardCap(cardChance(r.name), ninja.findPriceByQuery({ ns: 'ITEM', name: STACKED_DECK, variant: undefined })?.chaos ?? null)
      if (cap != null && r.chaos > cap) return { kind: 'drop-rate' }
    }
    return ninjaDoubt({
      chaos: r.chaos,
      graph: r.graph,
      days: loaded ? feedDays(loaded.chunks) : undefined,
      history: history.value,
      category
    })
  })
}
