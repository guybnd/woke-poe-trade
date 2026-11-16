// One trade search for one gem version, run only when its row is clicked.
import { createTradeRequest, requestResults, requestTradeResultList } from '@/web/price-check/trade/pathofexile-trade'
import type { ItemFilters } from '@/web/price-check/filters/interfaces'
import { buildInsight, toChaos, type InsightOptions } from '@/web/woke/price-insight/insight'
import { versionFilters, type GemForms, type GemVersion } from './versions'

// One fetch call: the cheapest listings are enough for a price.
const FETCH_IDS = 10

export async function searchVersion (
  filters: ItemFilters,
  v: GemVersion,
  forms: GemForms,
  opts: InsightOptions & { accountName: string, useEn: boolean }
): Promise<{ chaos: number | null, total: number }> {
  const f = versionFilters(filters, v, forms, opts.useEn)
  const search = await requestTradeResultList(createTradeRequest(f, []), f.trade.league)
  const ids = search.result.slice(0, FETCH_IDS)
  if (!ids.length) return { chaos: null, total: search.total }
  const listings = await requestResults(search.id, ids, { accountName: opts.accountName })
  const insight = buildInsight(listings.map(l => ({ ...l, listedTimes: 1 })), opts)
  const cheapest = listings
    .filter(l => !l.isMine)
    .map(l => toChaos(l.priceAmount, l.priceCurrency, opts))
    .filter((c): c is number => c != null)
  const chaos = insight.range?.fair ?? (cheapest.length ? Math.min(...cheapest) : null)
  return { chaos, total: search.total }
}
