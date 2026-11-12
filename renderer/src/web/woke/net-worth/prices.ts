// Prices for stash items from the poe.ninja data the app already downloads.
// Never a trade search: rares and other gear without a poe.ninja row stay
// unpriced.
import { usePoeninja } from '@/web/background/Prices'
import { gemVariant, isUniqueFrame } from './valuation'
import type { Category, Priced, PriceOf, StashItemLike } from './valuation'

const FRAGMENT_SLUGS = new Set(['fragments', 'scarabs', 'invitations', 'artifacts'])

interface Row { chaos: number, variant?: string, graph?: Array<number | null> }

// Gems by poe.ninja's variant (gemVariant), else the cheapest. A gem listed
// at its own level (Awakened 5, Enlighten 3) is found by that first.
function gemRow (rows: Row[], item: StashItemLike): Row | undefined {
  const exact = gemVariant(item, true)
  const want = gemVariant(item)
  return rows.find(r => r.variant === exact) ?? rows.find(r => r.variant === want) ?? cheapest(rows)
}

// poe.ninja's base type rows ("86", "Shaper 85"): a price for a crafting
// base at that item level, never for a plain white item.
const BASE_TYPE_VARIANT = /^(\d+|(Shaper|Elder|Crusader|Hunter|Redeemer|Warlord|Searing Exarch|Eater of Worlds)\b.*)$/

function cheapest (rows: Row[]): Row | undefined {
  return rows.reduce<Row | undefined>((m, r) => !m || r.chaos < m.chaos ? r : m, undefined)
}

export function ninjaPriceOf (): PriceOf {
  const ninja = usePoeninja()
  const cache = new Map<string, Priced | null>()
  const divine = ninja.xchgRate.value ?? null

  function lookup (item: StashItemLike): Priced | null {
    if (item.typeLine === 'Chaos Orb') return { chaos: 1, category: 'currency' }
    if (item.typeLine === 'Divine Orb' && divine) return { chaos: divine, category: 'currency' }
    if (item.frame === 6) {
      const row = ninja.findPriceByQuery({ ns: 'DIVINATION_CARD', name: item.typeLine, variant: undefined })
      return row ? { chaos: row.chaos, category: 'cards', graph: row.graph } : null
    }
    if (isUniqueFrame(item.frame)) {
      const name = item.name || item.typeLine
      const rows = ninja.findPricesByName('UNIQUE', name) as Row[]
      const exact = ninja.findPriceByQuery({ ns: 'UNIQUE', name, variant: undefined })
      const links = item.links ?? 0
      const linked = links >= 5 ? rows.find(r => r.variant === `${links}L`) : undefined
      const row = linked ?? exact ?? cheapest(rows.filter(r => !/^\dL$/.test(r.variant ?? '')))
      return row ? { chaos: row.chaos, category: 'gear', graph: row.graph } : null
    }
    if (item.frame === 4) {
      const row = gemRow(ninja.findPricesByName('GEM', item.typeLine) as Row[], item) ??
        ninja.findPriceByQuery({ ns: 'GEM', name: item.typeLine, variant: undefined }) ?? undefined
      return row ? { chaos: row.chaos, category: 'gear', graph: row.graph, variant: row.variant } : null
    }
    // Currency, fragments, scarabs, essences, maps...: listed by name.
    const exact = ninja.findPriceByQuery({ ns: 'ITEM', name: item.typeLine, variant: undefined })
    if (exact) {
      // url: https://poe.ninja/poe1/economy/<league>/<category>/<item>
      const slug = exact.url.split('/')[6] ?? ''
      const category: Category = slug === 'currency' ? 'currency' : FRAGMENT_SLUGS.has(slug) ? 'fragments' : 'other'
      return { chaos: exact.chaos, category, graph: exact.graph }
    }
    const any = cheapest((ninja.findPricesByName('ITEM', item.typeLine) as Row[])
      .filter(r => !(item.frame === 0 && !item.mapTier && BASE_TYPE_VARIANT.test(r.variant ?? ''))))
    return any ? { chaos: any.chaos, category: 'other', graph: any.graph } : null
  }

  return (item) => {
    // Magic and rare items: no poe.ninja price, and no trade searches.
    if (item.frame === 1 || item.frame === 2) return null
    const key = `${item.frame}|${item.name}|${item.typeLine}|${item.gemLevel}|${item.quality}|${item.corrupted}|${item.links}`
    if (!cache.has(key)) {
      let p: Priced | null = null
      try { p = lookup(item) } catch { p = null }
      cache.set(key, p)
    }
    return cache.get(key)!
  }
}
