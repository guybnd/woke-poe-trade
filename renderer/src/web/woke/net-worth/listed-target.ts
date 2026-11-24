// Set a new price on a Faustus listing from the price check (Guy's R1,
// 2026-11-24). The app never changes the game: the price you save is a to-do
// on the Listed row until a read sees the listing at that price.
// Pure: no Vue, no IO.
import type { Listing } from './faustus'

export interface TargetPrice { amount: number, currency: 'chaos' | 'divine', at: number }

// What the price check knows of its item, from the copied text.
export interface CheckedNames {
  // The line under "Rarity:": a unique's or rare's own name, else its type.
  name: string
  // A rare or unique's base: the line after its name.
  base?: string
  rarity?: string
  mapTier?: number
  gemLevel?: number
}

// The name lines of an item's game text.
export function namesOfText (rawText: string): { name: string, base?: string } | null {
  const lines = rawText.split(/\r?\n/).map(l => l.trim())
  const at = lines.findIndex(l => l.startsWith('Rarity:'))
  if (at < 0 || !lines[at + 1] || lines[at + 1].startsWith('--')) return null
  const base = lines[at + 2] && !lines[at + 2].startsWith('--') ? lines[at + 2] : undefined
  return { name: lines[at + 1], ...(base ? { base } : {}) }
}

// A copy's prefixes the listing's name doesn't carry (Foulborn it does).
const strip = (s: string) => s.replace(/^(Superior|Synthesised|Fated) /, '')

// Your listings of the checked item. A unique or rare by its own name (and
// base); anything else by its type, a map by its tier too, a gem by its level.
export function listingsFor (c: CheckedNames, listings: readonly Listing[]): Listing[] {
  const name = strip(c.name)
  return listings.filter(l => {
    if (c.mapTier != null && l.mapTier != null && c.mapTier !== l.mapTier) return false
    if (c.gemLevel != null && l.gemLevel != null && c.gemLevel !== l.gemLevel) return false
    if (l.name && (c.rarity === 'Unique' || c.rarity === 'Rare')) {
      return l.name === name && (!c.base || strip(c.base) === l.baseType || strip(c.base) === l.typeLine)
    }
    return !l.name && (l.typeLine === name || l.baseType === name)
  })
}

// A price as the trade site takes it: divines from 1 div up, else chaos.
export function asTradePrice (chaos: number, divine: number | null): { amount: number, currency: 'chaos' | 'divine' } {
  if (divine && chaos >= divine) {
    const d = chaos / divine
    return { amount: d >= 10 ? Math.round(d) : Math.round(d * 10) / 10, currency: 'divine' }
  }
  return { amount: Math.max(1, Math.round(chaos)), currency: 'chaos' }
}

// One step under a price: 1c, 0.1 div, or 1 div from 10 div up.
export function stepUnder (p: { amount: number, currency: 'chaos' | 'divine' }, divine: number | null): { amount: number, currency: 'chaos' | 'divine' } {
  if (p.currency === 'chaos') return { amount: Math.max(1, p.amount - 1), currency: 'chaos' }
  const step = p.amount > 10 ? 1 : 0.1
  const amount = Math.round((p.amount - step) * 10) / 10
  if (amount >= 1 || !divine) return { amount: Math.max(0.1, amount), currency: 'divine' }
  return asTradePrice(amount * divine, divine)
}

// The two suggestions from the cheapest other ask (chaos, for your whole
// stack): one step under it, and matching it.
export function suggestions (cheapestChaos: number | null, divine: number | null) {
  if (cheapestChaos == null || !(cheapestChaos > 0)) return null
  const match = asTradePrice(cheapestChaos, divine)
  return { under: stepUnder(match, divine), match }
}

// The to-do still stands: the listing doesn't ask that price yet.
export function targetOpen (t: TargetPrice | undefined, l: Listing): t is TargetPrice {
  return t != null && !(l.price.amount === t.amount && l.price.currency === t.currency)
}

export function priceLabel (p: { amount: number, currency: string }): string {
  return p.currency === 'divine' ? `${p.amount} div` : p.currency === 'chaos' ? `${p.amount}c` : `${p.amount} ${p.currency}`
}
