// Cost kits priced live (pick K1): a kit line's price is its stash item's
// (the valued line, with Net worth's holds on fake prices), else poe.ninja's
// by name. Never a trade search.
import { usePoeninja } from '@/web/background/Prices'
import type { LivePrice } from './runs'
import type { ValuedLine } from './valuation'

export function kitPrice (lines: readonly ValuedLine[]): LivePrice {
  const ninja = usePoeninja()
  const byKey = new Map<string, number>()
  const byName = new Map<string, number>()
  for (const l of lines) {
    if (l.state || !(l.unitChaos > 0)) continue
    byKey.set(l.key, l.unitChaos)
    const n = l.name.toLowerCase()
    if (!byName.has(n)) byName.set(n, l.unitChaos)
  }
  return (key, name) => {
    const k = key != null ? byKey.get(key) : undefined
    if (k != null) return k
    const n = byName.get(name.toLowerCase())
    if (n != null) return n
    if (name === 'Chaos Orb') return 1
    if (name === 'Divine Orb') return ninja.xchgRate.value ?? null
    const row = ninja.findPriceByQuery({ ns: 'ITEM', name, variant: undefined })
    return row && row.chaos > 0 ? row.chaos : null
  }
}
