// What an unidentified unique on the Alt+F card can turn out to be: every
// unique on its base with its poe.ninja price, the one whose price sets the
// base's tier, and the Foulborn versions' price range.
import type { PriceItem } from '../market/types'
import { isThin } from '../market/types'
import type { PricedName } from './health'

export interface DropUnique extends PricedName {
  setsTier: boolean
  // The copied item is this unique.
  own: boolean
  // poe.ninja's Foulborn lines for it (mutated mods), cheapest and dearest.
  foulborn: { min: number, max: number, thin: boolean } | null
}

// 5-link, 6-link and relic lines aren't what drops (see priceFinder).
const NOT_A_DROP = /\b[56]L\b|links?|^relic$/i

// The price lookup's note reads "Name" or "Name, 1 of 3".
export function setterName (note: string | undefined): string | null {
  if (!note) return null
  return note.replace(/, 1 of \d+$/, '')
}

export function dropUniques (
  list: PricedName[],
  items: PriceItem[],
  types: string[],
  base: string,
  setter: string | null,
  own: string | null
): DropUnique[] {
  const typeSet = new Set(types)
  const foulborn = new Map<string, PriceItem[]>()
  for (const i of items) {
    if (!typeSet.has(i.type) || !i.name.startsWith('Foulborn ') || NOT_A_DROP.test(i.variant)) continue
    const lines = foulborn.get(i.name)
    if (lines) lines.push(i)
    else foulborn.set(i.name, [i])
  }
  return list
    .map(u => {
      const all = foulborn.get(`Foulborn ${u.name}`) ?? []
      // A unique on several bases is priced per base; keep this base's lines.
      const onBase = all.filter(i => i.variant.split(', ').includes(base))
      const lines = onBase.length ? onBase : all
      const top = lines.length ? lines.reduce((a, b) => b.chaos > a.chaos ? b : a) : null
      return {
        ...u,
        setsTier: u.name === setter,
        own: u.name === own,
        // `thin` is the dearest line's: that's the number the eye takes.
        foulborn: top ? { min: Math.min(...lines.map(i => i.chaos)), max: top.chaos, thin: isThin(top) } : null
      }
    })
    .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1))
}
