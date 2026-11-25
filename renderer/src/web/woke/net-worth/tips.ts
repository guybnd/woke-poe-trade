// The shared item tooltip (and its right-click menu) for every item Net worth
// names: table rows, price moves, change rows, the chart's card, the dock card.
// Items still held use their table line; ones that are gone fall back to the
// name. Pure: no Vue.
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import type { ValuedLine } from './valuation'
import { HOLD_MS, HOLD_RATIO, ONE_DAY_MIN, SPIKE_KEEP_DAYS, SPIKE_NEVER_RATIO, isUniqueFrame } from './valuation'
import { DROP_RATE_CAP } from '../shared/card-cap'

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
    type: isUniqueFrame(l.frame) ? 'Unique' : l.frame === 4 ? 'SkillGem' : l.frame === 6 ? 'DivinationCard' : undefined,
    variant: l.variant,
    count,
    note,
    menu: { name: l.tipName, variant: l.variant, rarity: isUniqueFrame(l.frame) ? 'unique' : undefined }
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

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

// Why a held price (valuation.ts holdJump) isn't poe.ninja's. `price` writes
// a chaos amount in the table's unit.
export function heldNote (l: Pick<ValuedLine, 'heldSince' | 'heldKind' | 'ninjaChaos' | 'unitChaos'>, price: (chaos: number) => string): string | undefined {
  if (l.heldSince == null || l.ninjaChaos == null) return undefined
  if (l.heldKind === 'drop-rate') {
    return `${l.unitChaos > 0 ? `Held at its last solid price, ${price(l.unitChaos)}` : 'Not counted'}. poe.ninja says ${price(l.ninjaChaos)}, far more than this card can be worth for how often it drops ` +
      `(a Stacked Deck would be worth more than ${DROP_RATE_CAP}× its price from this card alone). That's a few fake listings. ` +
      'Counts again once poe.ninja\'s price comes down. Right-click to set your own price'
  }
  if (l.heldKind === 'one-day') {
    return `${l.unitChaos > 0 ? 'Held at its last solid price' : 'Not counted'}. poe.ninja says ${price(l.ninjaChaos)}, but it has priced this on only one of the last 7 days` +
      `${l.unitChaos > 0 ? `, at ${HOLD_RATIO}× or more its earlier price` : ` (${ONE_DAY_MIN}c or more, with no earlier price to check it against)`}. ` +
      'Prices like this have been fakes. Counts once poe.ninja prices it on a second day. Right-click to set your own price'
  }
  if (l.heldKind === 'spike') {
    const huge = l.unitChaos > 0 && l.ninjaChaos >= l.unitChaos * SPIKE_NEVER_RATIO
    return `Counted at ${price(l.unitChaos)}, its usual price. poe.ninja says ${price(l.ninjaChaos)} now, ` +
      `a sudden step of ${huge ? `${SPIKE_NEVER_RATIO}` : HOLD_RATIO}× or more, which a few fake listings can cause. ` +
      (huge
        ? 'A step this big counts only once it has been the price for about 2 weeks. '
        : `Counts once it has held ${SPIKE_KEEP_DAYS} days. `) +
      'Right-click to set your own price'
  }
  return `Held at the last read's price. poe.ninja says ${price(l.ninjaChaos)}, a jump of ${HOLD_RATIO}× or more in a thin market ` +
    `(no price on 3+ of the last 7 days), which one fake listing can cause. Takes poe.ninja's price at ${clock(l.heldSince + HOLD_MS)} ` +
    'if it stays up, sooner if it falls back. Right-click to set your own price'
}
