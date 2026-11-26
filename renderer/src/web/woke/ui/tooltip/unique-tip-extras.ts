// What a unique's tooltip adds under its mods (Guy's picks I2 and I3 in the
// tooltip audit, 2026-11-25): the mod a Foulborn copy gives up, the Vestigial
// implicit the unique leaves, and the divination cards that turn into it with
// the set's cost against the unique's own price. Pure: item-tip.ts passes the
// data and prices. Loaded on the first unique hover, not at startup.
import { cardsFor } from '../../related-family/recipe'
import { ABYSS, TIMELESS } from '../../related-family/conquest'
import { uniqueDetails } from '../../search/unique-details'
import type { TipLine, TipPack, TipPart } from './tip-content'

const part = (text: string, tone: TipPart['tone']): TipPart => ({ text, tone })

export interface UniqueExtraPrices {
  // A card's poe.ninja price in chaos, or null when it has none.
  card: (name: string) => number | null
  // The unique's own price in chaos, when it has one number.
  unique: number | null
  format: (chaos: number) => string
}

export function uniqueExtraSections (
  ref: { name: string, variant?: string },
  pack: Pick<TipPack, 'uniques' | 'unique-extras' | 'items' | 'vestigial'>,
  prices: UniqueExtraPrices
): TipLine[][] {
  const out: TipLine[][] = []
  const foul = ref.name.startsWith('Foulborn ')
  const plain = foul ? ref.name.slice('Foulborn '.length) : ref.name
  const uniques = { ...pack['unique-extras'], ...pack.uniques }
  const details = uniqueDetails(plain, uniques, pack.vestigial)

  if (foul && details) {
    const kinds = details.foulborn
    const kind = kinds.find(k => k.name != null && k.name === ref.variant) ?? (kinds.length === 1 ? kinds[0] : undefined)
    if (kind?.replaces.length) {
      out.push(kind.replaces.map((l, i) => [part(i ? 'and ' : 'Replaces: ', 'label'), part(l, 'mod')]))
    }
  }

  // A conquest jewel: the keystone each conqueror gives, whatever the number
  // (Guy's pick G2; the price check's side list has the same, conquest.ts).
  const conquerors = (TIMELESS[plain] ?? ABYSS.filter(a => a.jewel === plain)).filter(c => c.keystone)
  if (conquerors.length) {
    out.push([
      [part(conquerors.length > 1 ? 'The conqueror decides the keystone:' : 'Its keystone:', 'label')],
      ...conquerors.map((c): TipLine => [part(c.name, 'value'), part(` · ${c.keystone!.name}`, 'mod')])
    ])
  }

  const vest = details?.vestigial ?? []
  if (vest.length) {
    out.push(vest.map((lines, i) => [part(vest.length > 1 ? `Vestigial ${i + 1}: ` : 'Vestigial: ', 'label'), part(lines.join(', '), 'mod')]))
  }

  if (!foul && pack.items) {
    const cards = cardsFor({ refName: plain, namespace: 'UNIQUE' }, pack.items)
    const lines: TipLine[] = []
    for (const c of cards.slice(0, 3)) {
      const line: TipLine = [part('From card: ', 'label'), part(c.card, 'card'), part(` (${c.stack})`, 'label')]
      if (c.corrupted) line.push(part(', corrupted', 'label'))
      const each = prices.card(c.card)
      if (each != null) {
        const set = each * c.stack
        line.push(part(' · set ', 'label'), part(prices.format(set), 'value'))
        // A corrupted reward isn't worth the plain unique's price.
        const worth = c.corrupted ? null : prices.unique
        if (worth != null && worth > 0) {
          const diff = Math.round((1 - set / worth) * 100)
          // Against buying the unique itself (Guy: "dearer" read as cryptic).
          if (diff >= 3) line.push(part(` · ${diff}% less than buying it`, 'label'))
          else if (diff <= -3) line.push(part(` · ${-diff}% more than buying it`, 'label'))
        }
      }
      lines.push(line)
    }
    if (lines.length) out.push(lines)
  }
  return out
}
