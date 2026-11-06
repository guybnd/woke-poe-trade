import { computed, Ref, shallowRef, watch } from 'vue'
import { ItemRarity, ParsedItem } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import { graphGaps } from '../market/parse'
import { typeForSlug } from '../market/types'
import { dailyHistory } from '../market/db'
import type { Insight } from './insight'
import { buildBlend, headlinePrice } from './sources'
import { priceLog, previousCheck, entriesFor } from './price-log'
import { ninjaWeek, leagueSeries, mineSeries, HistoryPoint, HistoryRange } from './history'
import { poepricesState, poepricesChaos, loadPoeprices, checkedFair } from './check-state'

/** Everything the improved verdict shows beyond the listings themselves. */
export function useSmartPrice (
  item: Ref<ParsedItem>,
  insight: Ref<Insight>,
  divine: Ref<number | undefined>,
  logKey: Ref<string | null>,
  league: Ref<string>,
  ninjaFits: Ref<boolean>
) {
  const ninja = usePoeninja()

  const ninjaInfo = computed(() => {
    // A rare's value is in its mods, so a base type price would mislead.
    if (item.value.rarity === ItemRarity.Rare) return null
    // The divine rate arrives with each poe.ninja load, so it also re-runs this lookup.
    if (divine.value == null) return null
    try {
      const id = getDetailsId(item.value)
      if (!id) return null
      const found = ninja.findPriceByQuery(id)
      if (!found) return null
      return { ...found, gaps: graphGaps(found.graph) }
    } catch {
      return null
    }
  })

  watch(item, (it) => { loadPoeprices(it) }, { immediate: true })
  // No rate can mean another league than the one poeprices was asked about.
  const poeprices = computed(() => divine.value == null ? null : poepricesChaos(poepricesState.value, item.value, divine.value))

  // Re-read when the log changes or a minute passes (the "before this
  // session" cut-off moves with time).
  const now = shallowRef(Date.now())
  const timer = setInterval(() => { now.value = Date.now() }, 60_000)

  const mine = computed(() => {
    if (!logKey.value) return null
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    priceLog.value
    const prev = previousCheck(logKey.value, now.value)
    return prev ? { chaos: prev.fair, ts: prev.ts } : null
  })

  const blend = computed(() => buildBlend({
    insight: insight.value,
    ninja: ninjaInfo.value ? { chaos: ninjaInfo.value.chaos, gaps: ninjaInfo.value.gaps, fits: ninjaFits.value } : null,
    poeprices: poeprices.value,
    mine: mine.value,
    now: now.value
  }))

  const headline = computed(() => headlinePrice(blend.value, insight.value))

  watch(headline, (h) => {
    checkedFair.value = h ? { item: item.value, chaos: h.chaos } : null
  }, { immediate: true })

  // ---- history ----
  // Only poe.ninja items have a 7-day graph; for the rest "My checks" is the history.
  const week = computed<HistoryPoint[]>(() => {
    const n = ninjaInfo.value
    return n ? ninjaWeek(n.chaos, n.graph, now.value) : []
  })

  const mineHistory = computed<HistoryPoint[]>(() => {
    if (!logKey.value) return []
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    priceLog.value
    return mineSeries(entriesFor(logKey.value))
  })

  const leagueRows = shallowRef<HistoryPoint[] | null>(null)
  const leagueLoading = shallowRef(false)
  let leagueFor: unknown = null
  async function loadLeague () {
    const n = ninjaInfo.value
    if (!n || leagueFor === n) return
    leagueFor = n
    leagueRows.value = null
    let slug = ''
    try { slug = new URL(n.url).pathname.split('/')[4] ?? '' } catch {}
    const type = typeForSlug(slug)
    const today = { chaos: n.chaos, ts: Date.now() }
    if (!type) { leagueRows.value = leagueSeries([], today); return }
    leagueLoading.value = true
    try {
      const rows = await dailyHistory(league.value, { type, name: n.name, variant: n.variant ?? '' })
      if (leagueFor === n) leagueRows.value = leagueSeries(rows, today)
    } catch {
      if (leagueFor === n) leagueRows.value = leagueSeries([], today)
    } finally {
      leagueLoading.value = false
    }
  }

  function series (range: HistoryRange): HistoryPoint[] {
    if (range === 'week') return week.value
    if (range === 'mine') return mineHistory.value
    return leagueRows.value ?? []
  }

  const ranges = computed<HistoryRange[]>(() => {
    const out: HistoryRange[] = []
    if (week.value.length >= 2) out.push('week')
    if (ninjaInfo.value) out.push('league')
    if (mineHistory.value.length >= 2) out.push('mine')
    return out
  })

  return {
    ninjaInfo,
    poeprices,
    blend,
    headline,
    week,
    ranges,
    series,
    loadLeague,
    leagueLoading,
    stop: () => clearInterval(timer)
  }
}
