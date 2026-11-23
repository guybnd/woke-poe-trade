// Your sales for the Net worth window and Ctrl+Space: the file main keeps
// (trade-history.ts), read when the window opens and again when main says
// new sales came in. Prices in chaos come from poe.ninja's rates now.
import { computed, shallowRef } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { usePoeninja } from '@/web/background/Prices'
import { hostRequest } from '../shared/host'
import { keptSales } from './pending-glance'
import { ninjaPriceOf } from './prices'
import { NINJA_CURRENCY, saleChaos, versusMarket } from './sales'
import type { Rates, Sale, SalesReply } from './sales'

const reply = shallowRef<SalesReply | null>(null)
const reading = shallowRef(false)
// The last ask main couldn't answer (the stash reader off).
const failed = shallowRef<SalesReply['error']>(null)
let loadedFor: string | null = null

const ninja = usePoeninja()

export const salesReply = computed(() => reply.value)
export const sales = computed<Sale[]>(() => reply.value?.sales ?? [])
export const salesReading = computed(() => reading.value)
export const salesFailed = computed(() => failed.value)

export const rates = computed<Rates>(() => {
  // Read so a new price download values again.
  if (ninja.updatedAt.value == null) return { chaos: 1 }
  const r: Rates = { chaos: 1 }
  const div = ninja.xchgRate.value
  if (div) r.divine = div
  for (const [id, name] of Object.entries(NINJA_CURRENCY)) {
    const found = ninja.findPriceByQuery({ ns: 'ITEM', name, variant: undefined })
    if (found && found.chaos > 0) r[id] = found.chaos
  }
  return r
})

// What poe.ninja asks for one of the sale's item now, chaos; null: no price.
const priceOf = computed(() => ninja.updatedAt.value != null ? ninjaPriceOf() : null)
export function ninjaEach (s: Sale): number | null {
  const of = priceOf.value
  if (!of) return null
  const p = of({ name: s.name, typeLine: s.typeLine, baseType: s.baseType, frame: s.frameType, stack: 1, icon: s.icon, gemLevel: s.gemLevel, quality: s.quality, mapTier: s.mapTier, corrupted: s.corrupted, links: s.links })
  return p && p.chaos > 0 ? p.chaos : null
}
// The same, with poe.ninja's thin-market flag (pending.ts confidence).
export function ninjaPriced (s: Sale): { chaos: number, thin?: boolean } | null {
  const of = priceOf.value
  if (!of) return null
  const p = of({ name: s.name, typeLine: s.typeLine, baseType: s.baseType, frame: s.frameType, stack: 1, icon: s.icon, gemLevel: s.gemLevel, quality: s.quality, mapTier: s.mapTier, corrupted: s.corrupted, links: s.links })
  return p && p.chaos > 0 ? { chaos: p.chaos, ...(p.thin ? { thin: true } : {}) } : null
}
export function marketOf (s: Sale): number | null {
  return versusMarket(saleChaos(s, rates.value), ninjaEach(s), s.stack)
}

const ok = (r: unknown): r is SalesReply => !!r && typeof r === 'object' && Array.isArray((r as SalesReply).sales)

// 'none' reads the file only; 'manual' asks pathofexile.com (main paces it).
export async function loadSales (league: string | null, read: 'none' | 'manual' = 'none') {
  if (!league) { reply.value = null; loadedFor = null; return }
  if (read === 'none' && loadedFor === league && reply.value) return
  // Another league's sales are never this one's, even if this read fails.
  if (loadedFor !== league) { reply.value = null; failed.value = null }
  loadedFor = league
  if (read === 'manual') reading.value = true
  try {
    const r = await hostRequest('trade-history', { league, read }, 60_000).catch(() => null)
    if (loadedFor !== league) return
    // Another league's reply (a read for it was under way) isn't this one's.
    if (ok(r) && r.league === league) {
      reply.value = r
      keptSales.value = { league, sales: r.sales }
      failed.value = null
    } else if (!r && read === 'manual') {
      failed.value = { kind: 'failed', message: "Couldn't read your sales. Is the stash reader on (Settings › Modules)?" }
    }
  } finally {
    if (read === 'manual') reading.value = false
  }
}

// Main's quiet read (entering your hideout) found new sales.
MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic !== 'trade-history' || !ok(data)) return
  if (data.league === loadedFor) { reply.value = data; keptSales.value = { league: data.league, sales: data.sales } }
})
