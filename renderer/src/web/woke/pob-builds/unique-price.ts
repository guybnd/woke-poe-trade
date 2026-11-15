// A unique's poe.ninja price, the way the price check finds it, for any
// build window that lists uniques (stage costs, next upgrades).
import { computed } from 'vue'
import { ItemRarity, parseClipboard } from '@/parser'
import { usePoeninja } from '@/web/background/Prices'
import { getDetailsId } from '@/web/price-check/trends/getDetailsId'
import type { Price } from './build-costs'
import { pobItemText } from './item-text'
import type { PobItem } from './widget'
import type { ParsedItem } from '@/parser'

export function useUniquePrice () {
  const ninja = usePoeninja()
  const divine = computed(() => ninja.xchgRate.value ?? null)

  // The same query as the price check, so links and Foulborn variants count.
  // A Foulborn item's name is what sets its price, and the query drops it.
  function priceOf (item: PobItem, parsed?: ParsedItem | null): Price | null {
    if (parsed === undefined) {
      const r = parseClipboard(pobItemText(item))
      parsed = r.isOk() ? r.value : null
    }
    if (parsed?.rarity === ItemRarity.Unique && !item.name.startsWith('Foulborn ')) {
      try {
        const id = getDetailsId(parsed)
        const exact = id ? ninja.findPriceByQuery(id) : null
        if (exact) return { chaos: exact.chaos }
      } catch {}
    }
    const all = ninja.findPricesByName('UNIQUE', item.name).map(r => r.chaos)
    if (!all.length) return null
    const low = Math.min(...all)
    const high = Math.max(...all)
    return high > low ? { chaos: low, high } : { chaos: low }
  }

  return { priceOf, divine, fetch: () => { ninja.queuePricesFetch() } }
}
