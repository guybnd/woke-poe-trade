// Currency weights (beta): endgame currency shows by what the pile is worth,
// not by NeverSink's tiers. Step 1 of moving the whole filter onto scores
// (plan: /mnt/project-files/filter-funnel/score-everything-else.html).
//
// A pile counts as chaos each × √stack × a full-stack bonus: an orb whose full
// stack is worth a lot gets up to ×2.5, one whose full stack is junk gets
// nothing (Guy's pick B4, 2026-11-27). Under the line it hides; over it it
// shows Small, and Normal, Big and Beam start at fixed prices (Beam in
// divines) whatever the line. Supplies show from a set stack, pins always.
//
// The items are the ones NeverSink tiers as currency, essences, fossils,
// oils, delirium orbs, omens, tattoos and ducats. Splinters, lifeforce and
// the like wait for their own step. Prices are poe.ninja's; an item with no
// price or a thin one gets a guess from NeverSink's tier (marked est.).
// Only at area level 68+: levelling stays NeverSink's. The rules sit above
// everything NeverSink has and end with their own Hide, so NeverSink never
// sees these items in maps. Off (the default), nothing is written.
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc } from './parse'
import { NET_GROUPS } from './economy'
import type { EconomyGroup, PriceLookup } from './economy'
import { fullStack } from './stack-sizes'
import { CURRENCY_TYPE } from './currency-settings'
import type { CurrencySettings } from './currency-settings'

export { CURRENCY_TYPE, LINE_MIN, LINE_MAX, defaultCurrency, normalizeCurrency } from './currency-settings'
export type { CurrencySettings } from './currency-settings'

export type CStep = 0 | 1 | 2 | 3 | 4
export const CSTEP_NAMES = ['Hidden', 'Small', 'Normal', 'Big, sound', 'Beam'] as const

// NeverSink's currency types this step covers.
const SCOPE = /^currency(->(essence|fossil|oil|deliriumorbs|trial->omen|trial->tattoo|ducats|others))?$/
// A guess in chaos for an item without a usable price, by NeverSink's tier
// number (t1exalted, t4chaos, t3...): rough, and marked est. in the tab.
const TIER_GUESS = [150, 150, 60, 20, 5, 1.5, 0.5, 0.2, 0.1, 0.05]
const UNTIERED_GUESS = 0.3
// NeverSink tiers that it hides: worth nothing much.
const HIDDEN_TIERS = /^(exhide|restex)$/

export interface CurrencyItem {
  name: string
  cls: string
  // NeverSink's type and tier the item was listed under.
  type: string
  tier: string | null
  chaos: number
  // No price (or a thin one): `chaos` is a guess from the tier.
  est: boolean
  full: number
}

// Net worth's groups: NeverSink lists astrolabes, crystals and artifacts as
// currency, and only those groups ask poe.ninja for them.
function groupOf (type: string): EconomyGroup {
  return NET_GROUPS.find(g => g.type === type) ?? NET_GROUPS[0]
}

// A thin price counts, held within ×10 of the tier guess either way: a rare
// orb can still reach Beam, a faked listing can't make junk beam.
function thinPrice (p: number, guess: number): number {
  return Math.min(guess * 10, Math.max(guess / 10, p))
}

export function tierGuess (tier: string | null): number {
  if (tier && HIDDEN_TIERS.test(tier)) return 0.05
  const m = tier?.match(/^t(\d)/)
  return m ? TIER_GUESS[Number(m[1])] ?? UNTIERED_GUESS : UNTIERED_GUESS
}

// The items, from the filter's own currency rules, with their prices.
export function currencyItems (doc: FilterDoc, lookup: PriceLookup | null): CurrencyItem[] {
  const seen = new Map<string, CurrencyItem>()
  for (const b of doc.blocks) {
    if (!b.type || !SCOPE.test(b.type)) continue
    const cls = b.conditions.find(x => x.key === 'Class')?.values ?? []
    const bt = b.conditions.find(x => x.key === 'BaseType' && (x.op === '==' || x.op === '='))
    if (!bt || !cls.length || !cls.every(x => /Stackable/.test(x))) continue
    for (const name of bt.values) {
      if (seen.has(name)) continue
      // Prices are in chaos, so poe.ninja doesn't list chaos itself.
      const p = name === 'Chaos Orb' ? { chaos: 1, thin: false } : lookup?.(groupOf(b.type), name) ?? null
      const priced = p != null && !p.thin && p.chaos > 0
      const guess = tierGuess(b.tier)
      seen.set(name, {
        name,
        cls: cls.length === 1 ? cls[0] : 'Stackable Currency',
        type: b.type,
        tier: b.tier,
        chaos: priced ? p.chaos : p != null && p.chaos > 0 ? thinPrice(p.chaos, guess) : guess,
        est: !priced,
        full: fullStack(name)
      })
    }
  }
  return [...seen.values()]
}

// The full-stack bonus: 1 + log10(full stack in chaos) / 2, between ×1 and ×2.5.
export function fullBias (it: Pick<CurrencyItem, 'chaos' | 'full'>): number {
  return Math.min(2.5, 1 + Math.log10(Math.max(1, it.chaos * it.full)) / 2)
}

// What a pile of `stack` counts for, in chaos.
export function pileWorth (it: Pick<CurrencyItem, 'chaos' | 'full'>, stack: number): number {
  return it.chaos * Math.sqrt(Math.max(1, stack)) * fullBias(it)
}

// Where each step starts, in chaos: Small at the line, the louder ones at
// their own price (never under the line). `divine` is a Divine Orb in chaos.
export function stepStarts (c: Pick<CurrencySettings, 'line' | 'normal' | 'big' | 'beamDiv'>, divine: number): [number, number, number, number] {
  const beam = Math.max(c.big, c.beamDiv * divine)
  return [c.line, Math.max(c.line, c.normal), Math.max(c.line, c.big), Math.max(c.line, beam)]
}

// The smallest pile (1 up to a full stack) that counts for `at`, or null.
export function minStack (it: Pick<CurrencyItem, 'chaos' | 'full'>, at: number): number | null {
  const per = it.chaos * fullBias(it)
  if (per <= 0) return null
  // √k ≥ at / per; rounding can land one short, so check.
  let k = Math.max(1, Math.ceil((at / per) ** 2 - 1e-9))
  if (pileWorth(it, k) < at) k++
  return k <= it.full ? k : null
}

// For each step 1..4, the smallest pile that reaches it (null: never).
// Supplies and pins lower Small.
export function stacksFor (it: CurrencyItem, c: CurrencySettings, starts: readonly number[]): Array<number | null> {
  const out = starts.map(at => minStack(it, at))
  const floor = c.pins.includes(it.name) ? 1 : c.supplies[it.name] ?? null
  if (floor != null) {
    const f = Math.min(floor, it.full)
    out[0] = out[0] == null ? f : Math.min(out[0], f)
  }
  // A louder step never starts below a quieter one.
  for (let i = 2; i >= 0; i--) if (out[i + 1] != null && (out[i] == null || out[i]! > out[i + 1]!)) out[i] = out[i + 1]
  return out
}

// The step a pile of `stack` gets.
export function stepOfPile (stacks: ReadonlyArray<number | null>, stack: number): CStep {
  for (let s = 3; s >= 0; s--) if (stacks[s] != null && stack >= stacks[s]!) return (s + 1) as CStep
  return 0
}

const a = (key: string, ...args: Array<string | number>): FilterAction => ({ key, args: args.map(String) })
const c = (key: string, op: string, values: Array<string | number>): FilterCondition => ({ key, op, count: null, values: values.map(String) } as FilterCondition)

// How each step looks. Currency keeps its own colour up to Big; Beam is the
// classic red on white for every class (Guy, 2026-11-27), with currency's
// own minimap shape (a circle) as its mark.
export function currencyActions (step: CStep): FilterAction[] {
  switch (step) {
    case 0: return [a('SetFontSize', 18), a('DisableDropSound', 'True')]
    case 1: return [a('SetFontSize', 32), a('SetTextColor', 170, 158, 130, 255), a('SetBorderColor', 0, 0, 0, 0), a('SetBackgroundColor', 0, 0, 0, 180)]
    case 2: return [a('SetFontSize', 38), a('SetTextColor', 210, 190, 140, 255), a('SetBorderColor', 170, 158, 130, 160), a('SetBackgroundColor', 20, 16, 10, 230)]
    case 3: return [a('SetFontSize', 42), a('SetTextColor', 255, 225, 150, 255), a('SetBorderColor', 255, 225, 150, 255), a('SetBackgroundColor', 70, 55, 25, 240), a('PlayAlertSound', 3, 300), a('MinimapIcon', 1, 'Yellow', 'Circle')]
    case 4: return [a('SetFontSize', 45), a('SetTextColor', 255, 0, 0, 255), a('SetBorderColor', 255, 0, 0, 255), a('SetBackgroundColor', 255, 255, 255, 255), a('PlayAlertSound', 1, 300), a('PlayEffect', 'Red'), a('MinimapIcon', 0, 'Red', 'Circle')]
  }
}

export interface CurrencyCompiled {
  blocks: FilterBlock[]
  items: CurrencyItem[]
  chars: number
}

function block (step: CStep, conds: FilterCondition[], note: string): FilterBlock {
  return {
    kind: 'block',
    index: -1,
    line: 1,
    visibility: step === 0 ? 'Hide' : 'Show',
    disabled: false,
    comment: `$type->${CURRENCY_TYPE} $tier->s${step} woke: currency weights, ${CSTEP_NAMES[step].toLowerCase()}${note ? `: ${note}` : ''}`,
    type: CURRENCY_TYPE,
    tier: `s${step}`,
    conditions: conds,
    actions: currencyActions(step),
    continue: false,
    section: '[[0051]] Currency weights (woke)',
    subsection: '',
    raw: [],
    dirty: true,
    added: true
  } as FilterBlock
}

export function divineChaos (items: CurrencyItem[]): number {
  const d = items.find(i => i.name === 'Divine Orb')
  return d && !d.est ? d.chaos : 150
}

export function compileCurrency (cfg: CurrencySettings, items: CurrencyItem[]): CurrencyCompiled {
  const starts = stepStarts(cfg, divineChaos(items))
  const blocks: FilterBlock[] = []
  const stacks = new Map(items.map(it => [it.name, stacksFor(it, cfg, starts)]))
  const area = c('AreaLevel', '>=', [68])
  const clsCond = (list: CurrencyItem[]) => c('Class', '==', [...new Set(list.map(i => i.cls))].sort())
  // Loudest first: the first rule that matches wins, so a big pile meets
  // its louder rule before a quieter one.
  for (const step of [4, 3, 2, 1] as const) {
    const byStack = new Map<number, CurrencyItem[]>()
    for (const it of items) {
      const k = stacks.get(it.name)![step - 1]
      if (k == null) continue
      // A step that starts where the next louder one does never applies.
      const louder = step < 4 ? stacks.get(it.name)![step] : null
      if (louder != null && louder <= k) continue
      byStack.set(k, [...byStack.get(k) ?? [], it])
    }
    for (const [k, list] of [...byStack.entries()].sort((x, y) => y[0] - x[0])) {
      const conds = [area, clsCond(list), c('BaseType', '==', list.map(i => i.name).sort())]
      if (k > 1) conds.push(c('StackSize', '>=', [k]))
      blocks.push(block(step, conds, k > 1 ? `${k}+` : ''))
    }
  }
  if (items.length) blocks.push(block(0, [area, clsCond(items), c('BaseType', '==', items.map(i => i.name).sort())], 'under the line'))
  const chars = blocks.reduce((n, b) => n + 160 + b.conditions.reduce((m, x) => m + x.key.length + 12 + x.values.reduce((k, v) => k + v.length + 3, 0), 0), 0)
  return { blocks, items, chars }
}

// Writes the rules above everything else in the filter (like the rare
// weights: build rules, presets and your own rules then go on top).
export function applyCurrency (doc: FilterDoc, cfg: CurrencySettings, lookup: PriceLookup | null): CurrencyCompiled | null {
  // Without prices every item would be a guess: leave it to NeverSink.
  if (!cfg.on || !lookup) return null
  const items = currencyItems(doc, lookup)
  if (!items.length) return null
  const compiled = compileCurrency(cfg, items)
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  const at = first < 0 ? doc.chunks.length : first
  doc.chunks.splice(at, 0, ...compiled.blocks)
  const line = doc.blocks[0]?.line ?? 1
  compiled.blocks.forEach(b => { b.line = line })
  doc.blocks.unshift(...compiled.blocks)
  doc.blocks.forEach((b, i) => { b.index = i })
  return compiled
}
