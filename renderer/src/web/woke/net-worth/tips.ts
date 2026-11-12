// The shared item tooltip (and its right-click menu) for every item Net worth
// names: table rows, price moves, change rows, the chart's card, the dock card.
// Items still held use their table line; ones that are gone fall back to the
// name. Pure: no Vue.
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import type { ValuedLine } from './valuation'

type TipLine = Pick<ValuedLine, 'key' | 'name' | 'tipName' | 'variant' | 'frame'>

export interface TipIndex { byKey: Map<string, TipLine>, byName: Map<string, TipLine> }

export function tipIndex (lines: TipLine[]): TipIndex {
  const byKey = new Map<string, TipLine>()
  const byName = new Map<string, TipLine>()
  for (const l of lines) {
    byKey.set(l.key, l)
    if (!byName.has(l.name)) byName.set(l.name, l)
  }
  return { byKey, byName }
}

// A held item: the game's name and a gem's variant (rarity for the menu).
export function lineTip (l: Pick<ValuedLine, 'tipName' | 'variant' | 'frame'>, count?: number, note?: string): ItemTipRef {
  return {
    name: l.tipName,
    // poe.ninja's kind, so a unique isn't read as a namesake (Hinekora's Lock
    // the ring, not the currency).
    type: l.frame === 3 ? 'Unique' : l.frame === 4 ? 'SkillGem' : l.frame === 6 ? 'DivinationCard' : undefined,
    variant: l.variant,
    count,
    note,
    menu: { name: l.tipName, variant: l.variant, rarity: l.frame === 3 ? 'unique' : undefined }
  }
}

// The name an item line shows, back to the game's: no gem level, map tier,
// links or rare base.
export function plainItemName (label: string): string {
  return label
    .replace(/ \d+\/\d+( corrupted)?$/, '')
    .replace(/ \(T\d+\)$/, '')
    .replace(/ [5-6]L$/, '')
    .split(', ')[0]
}

export function tipFor (index: TipIndex, key: string | null, name: string, count?: number): ItemTipRef {
  const l = (key != null ? index.byKey.get(key) : undefined) ?? index.byName.get(name)
  if (l) return lineTip(l, count)
  const plain = plainItemName(name)
  return { name: plain, count, menu: { name: plain } }
}

// The chart card's "12 × Divine Orb", "−4 × Maven's Writ", "−Sacred Orb" or
// "Mageblood" (ledger.ts topChanges).
export function parseTop (s: string): { count: number, name: string } {
  const m = /^(−?)(?:([\d,]+) × )?(.+)$/.exec(s)!
  const n = m[2] ? Number(m[2].replace(/,/g, '')) : 1
  return { count: (m[1] ? -1 : 1) * (Number.isFinite(n) ? n : 1), name: m[3] }
}
