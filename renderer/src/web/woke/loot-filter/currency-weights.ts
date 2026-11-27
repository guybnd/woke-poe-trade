// Currency weights (beta): endgame currency shows by what the pile is worth,
// not by NeverSink's tiers. Step 1 of moving the whole filter onto scores
// (plan: /mnt/project-files/filter-funnel/score-everything-else.html; the
// tab's design: currency-tab-redesign.html, Guy's picks A, S2, G1, E1).
//
// A pile counts as chaos each × stack; an item whose full stack is worth
// less than Decent counts × stack^0.75 instead (Guy 2026-11-27). Under the line it hides; over it it shows Small,
// and Normal, Decent, Big and Tink start at fixed prices whatever the line.
// Each category can nudge the line; each item can be set by hand: its step,
// its price, a supply stack, its own look.
//
// The items are the ones NeverSink tiers as currency, essences, fossils,
// oils, delirium orbs, omens, tattoos and ducats. Splinters, lifeforce and
// the like wait for their own step. Prices are poe.ninja's; an item with no
// price gets a guess from NeverSink's tier (marked est.).
// Only at area level 68+: levelling stays NeverSink's. The rules sit above
// everything NeverSink has and end with their own Hide, so NeverSink never
// sees these items in maps. Off (the default), nothing is written.
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc } from './parse'
import { NET_GROUPS } from './economy'
import type { EconomyGroup, PriceLookup } from './economy'
import { applyStyle, readStyle } from './edits'
import type { StylePatch } from './edits'
import { fullStack } from './stack-sizes'
import { topStepActions } from './top-step'
import { CURRENCY_TYPE, CSTEP_NAMES } from './currency-settings'
import type { CStep, CurrencySettings, ItemEdit } from './currency-settings'

export { CURRENCY_TYPE, CSTEP_NAMES, LINE_MIN, LINE_MAX, NUDGE_MAX, MULT_MIN, MULT_MAX, defaultCurrency, normalizeCurrency } from './currency-settings'
export type { CStep, CurrencySettings, ItemEdit } from './currency-settings'

// NeverSink's currency types this step covers.
const SCOPE = /^(currency(->(essence|fossil|oil|deliriumorbs|trial->omen|trial->tattoo|ducats|others|deadmansulphur|harvest|heist|splinter|splinter->simulacrum))?|mapenchantments|runesgrafts)$/
// A guess in chaos for an item without a usable price, by NeverSink's tier
// number (t1exalted, t4chaos, t3...): rough, and marked est. in the tab.
const TIER_GUESS = [150, 150, 60, 20, 5, 1.5, 0.5, 0.2, 0.1, 0.05]
const UNTIERED_GUESS = 0.3
// NeverSink tiers that it hides: worth nothing much.
const HIDDEN_TIERS = /^(exhide|restex)$/
// League threads (Breach Thread, Ritual Thread...), from the fragment rules.
const THREAD = /^[A-Z][a-z]+ Thread$/

// The tab's categories, in order. `art`: an item whose art stands for it.
export interface CurrencyCategory { id: string, name: string, art: string }
export const CURRENCY_CATEGORIES: CurrencyCategory[] = [
  { id: 'orbs', name: 'Orbs', art: 'Divine Orb' },
  { id: 'influence', name: 'Influence and Eldritch', art: "Awakener's Orb" },
  { id: 'catalysts', name: 'Catalysts', art: 'Prismatic Catalyst' },
  { id: 'atlas', name: 'Atlas and Maven', art: 'Chaotic Astrolabe' },
  { id: 'expedition', name: 'Expedition', art: 'Exotic Coinage' },
  { id: 'tainted', name: 'Tainted', art: 'Tainted Chaos Orb' },
  { id: 'essences', name: 'Essences', art: 'Deafening Essence of Greed' },
  { id: 'fossils', name: 'Fossils and resonators', art: 'Fractured Fossil' },
  { id: 'oils', name: 'Oils', art: 'Golden Oil' },
  { id: 'delirium', name: 'Delirium orbs', art: 'Fine Delirium Orb' },
  { id: 'omens', name: 'Omens', art: 'Omen of Fortune' },
  { id: 'tattoos', name: 'Tattoos', art: 'Journey Tattoo of the Body' },
  { id: 'ducats', name: 'Ducats', art: "Kishara's Ducat" },
  { id: 'threads', name: 'Threads', art: 'Breach Thread' },
  { id: 'splinters', name: 'Splinters', art: 'Timeless Maraketh Splinter' },
  { id: 'harvest', name: 'Lifeforce', art: 'Sacred Crystallised Lifeforce' },
  { id: 'embers', name: 'Allflame Embers', art: 'Allflame Ember of Kulemak' },
  { id: 'runegrafts', name: 'Runegrafts', art: 'Runegraft of Bellows' },
  { id: 'other', name: 'Other', art: 'Scrying Orb' }
]

const BY_TYPE: Record<string, string> = {
  'currency->essence': 'essences',
  'currency->fossil': 'fossils',
  'currency->oil': 'oils',
  'currency->deliriumorbs': 'delirium',
  'currency->trial->omen': 'omens',
  'currency->trial->tattoo': 'tattoos',
  'currency->ducats': 'ducats',
  'currency->others': 'other',
  'currency->splinter': 'splinters',
  'currency->splinter->simulacrum': 'splinters',
  'currency->harvest': 'harvest',
  'fragments': 'threads',
  'mapenchantments': 'embers',
  'runesgrafts': 'runegrafts'
}

// NeverSink lists all of these as plain currency: sort them by name.
export function categoryOf (name: string, type: string): string {
  if (BY_TYPE[type]) return BY_TYPE[type]
  if (/Crystallised Lifeforce$/.test(name)) return 'harvest'
  if (/^Timeless .+ Splinter$|^Simulacrum Splinter$/.test(name)) return 'splinters'
  if (/Catalyst$/.test(name)) return 'catalysts'
  if (/^Tainted /.test(name)) return 'tainted'
  if (/^(Astragali|Burial Medallion|Exotic Coinage|Scrap Metal)$/.test(name)) return 'expedition'
  if (/Eldritch|^(Crusader|Hunter|Redeemer|Warlord|Shaper|Elder)'s Exalted Orb$|^Awakener's Orb$|^Orb of Dominance$|^Maven's Orb$/.test(name)) return 'influence'
  if (/Astrolabe|^Maven's Chisel|^Memory of|^Valdo's Puzzle Box$|Enshrouding Crystal|^Crescent Splinter$|^Reflecting Mist$|^Refracting Fog$|^Frayed Thread$|^Message in a Bottle$/.test(name)) return 'atlas'
  if (/(Orb|Shard|Scroll|Prism|Bauble|Scrap|Whetstone)$|^Mirror|^Scroll|^Stacked Deck$|^Orb of /.test(name)) return 'orbs'
  return 'other'
}

// Sub-groups inside a category, loudest first (Guy 2026-11-27: essences by
// tier, so a whole tier can be looked over or switched off at once).
export const ESSENCE_TIERS = ['Deafening', 'Shrieking', 'Screaming', 'Wailing', 'Weeping', 'Muttering', 'Whispering'] as const
export const SUBGROUPS: Record<string, readonly string[]> = {
  essences: [...ESSENCE_TIERS, 'Special']
}
export function subgroupOf (name: string, cat: string): string | null {
  if (cat !== 'essences') return null
  const tier = ESSENCE_TIERS.find(t => name.startsWith(`${t} Essence of `))
  return tier ?? 'Special'
}

export interface CurrencyItem {
  name: string
  cls: string
  // NeverSink's type and tier the item was listed under.
  type: string
  tier: string | null
  // The tab's category.
  cat: string
  // Chaos each: poe.ninja's, a guess, or the player's own (see `own`).
  chaos: number
  // No price (or a thin one): `chaos` is a guess from the tier.
  est: boolean
  // The player typed the price.
  own?: boolean
  // An odd item poe.ninja has no price for at all (Facetor's Lens, Imprint,
  // Scrying Orb): it shows at least Small (Guy 2026-11-27).
  free?: boolean
  full: number
}

const ANY_PAGE: EconomyGroup = { type: 'any', label: 'Any', ninja: ['*'] }
function groupOf (type: string): EconomyGroup {
  return NET_GROUPS.find(g => g.type === type) ?? NET_GROUPS[0]
}

// Odd utility items poe.ninja doesn't price (Facetor's Lens, Imprint, Scrying
// Orb): the Other category, not shards or scraps, and not hidden by NeverSink.
function isFree (name: string, type: string, tier: string | null): boolean {
  return categoryOf(name, type) === 'other' && !/(Shard|Fragment|Splinter|Scrap)$/.test(name) && !(tier && HIDDEN_TIERS.test(tier))
}

export function tierGuess (tier: string | null): number {
  if (tier && HIDDEN_TIERS.test(tier)) return 0.05
  const m = tier?.match(/^t(\d)/)
  return m ? TIER_GUESS[Number(m[1])] ?? UNTIERED_GUESS : UNTIERED_GUESS
}

// A thin price counts, held within ×10 of the tier guess either way.
function thinPrice (p: number, guess: number): number {
  return Math.min(guess * 10, Math.max(guess / 10, p))
}

// The items, from the filter's own currency rules, with their prices (and
// the player's own, when `edits` has one).
export function currencyItems (doc: FilterDoc, lookup: PriceLookup | null, edits: Record<string, ItemEdit> = {}): CurrencyItem[] {
  const seen = new Map<string, CurrencyItem>()
  for (const b of doc.blocks) {
    // League threads sit in NeverSink's fragment rules; Guy counts them as currency.
    const threads = b.type === 'fragments'
    if (!b.type || !(SCOPE.test(b.type) || threads)) continue
    const cls = b.conditions.find(x => x.key === 'Class')?.values ?? []
    const bt = b.conditions.find(x => x.key === 'BaseType' && (x.op === '==' || x.op === '='))
    if (!bt || !cls.length || (!threads && !cls.every(x => /Stackable/.test(x)))) continue
    for (const name of bt.values) {
      if (seen.has(name) || (threads && !THREAD.test(name))) continue
      // Prices are in chaos, so poe.ninja doesn't list chaos itself.
      // Threads (and anything poe.ninja lists on another page than the
      // filter's group) are found by name on any page.
      const p = name === 'Chaos Orb' ? { chaos: 1, thin: false } : lookup?.(groupOf(b.type), name) ?? lookup?.(ANY_PAGE, name) ?? null
      const priced = p != null && !p.thin && p.chaos > 0
      const guess = tierGuess(b.tier)
      const own = edits[name]?.price
      seen.set(name, {
        name,
        cls: threads ? cls.join('|') : cls.length === 1 ? cls[0] : 'Stackable Currency',
        type: b.type,
        tier: b.tier,
        cat: categoryOf(name, b.type),
        chaos: own ?? (priced ? p.chaos : p != null && p.chaos > 0 ? thinPrice(p.chaos, guess) : guess),
        est: own == null && !priced,
        ...(own != null ? { own: true } : {}),
        ...(own == null && (p == null || !(p.chaos > 0)) && isFree(name, b.type, b.tier) ? { free: true } : {}),
        full: fullStack(name)
      })
    }
  }
  return [...seen.values()]
}

// What a pile of `stack` counts for, in chaos (Guy 2026-11-27): its full
// value, price × stack. Only an item whose full stack is worth less than
// Decent (`decent`, chaos) is discounted, to price × stack^0.75, so a big
// pile of cheap shards doesn't shout. (It used to be √stack for all, under
// which 10 Chaos counted 4.7c and looked like nothing.)
export const CHEAP_POW = 0.75
export function stackPow (it: Pick<CurrencyItem, 'chaos' | 'full'>, decent: number): number {
  return it.chaos * it.full < decent ? CHEAP_POW : 1
}
export function pileWorth (it: Pick<CurrencyItem, 'chaos' | 'full'>, stack: number, decent: number): number {
  return it.chaos * Math.max(1, stack) ** stackPow(it, decent)
}

// NeverSink's strictness level from its header ("4-VERYSTRICT" → 4);
// Semi-strict (2) when the filter doesn't say.
export function levelOf (strictness: string | null): number {
  const n = Number(/^(\d)/.exec(strictness ?? '')?.[1])
  return Number.isFinite(n) && n >= 0 && n <= 6 ? n : 2
}
// The multiplier a strictness level gives: ×1 at Semi-strict, ×1.25 a level
// stricter, ÷1.25 a level looser, in 0.05s.
export function strictMult (level: number): number {
  return Math.round(1.25 ** (level - 2) * 20) / 20
}
// The settings as they apply: every step's price × the multiplier (the
// player's own, or the filter's strictness).
export function scaled (c: CurrencySettings, strictness: string | null): CurrencySettings {
  const m = c.mult ?? strictMult(levelOf(strictness))
  if (m === 1) return c
  return { ...c, line: c.line * m, from: c.from.map(f => f * m) as CurrencySettings['from'] }
}

// The line for a category, after its nudge.
export function catLine (c: Pick<CurrencySettings, 'line' | 'nudge'>, cat: string): number {
  return c.line * 2 ** (c.nudge[cat] ?? 0)
}

// Where each step 1..5 starts, in chaos: Small at the (nudged) line, the
// louder ones at their own price, never under it.
export function stepStarts (c: Pick<CurrencySettings, 'line' | 'from' | 'nudge'>, cat = ''): number[] {
  const line = catLine(c, cat)
  return [line, ...c.from.map(f => Math.max(line, f))]
}

// The smallest pile (1 up to a full stack) that counts for `at`, or null.
export function minStack (it: Pick<CurrencyItem, 'chaos' | 'full'>, at: number, decent: number): number | null {
  const per = it.chaos
  if (per <= 0) return null
  const pow = stackPow(it, decent)
  // k ** pow ≥ at / per; rounding can land one short, so check.
  let k = Math.max(1, Math.ceil((at / per) ** (1 / pow) - 1e-9))
  if (pileWorth(it, k, decent) < at) k++
  return k <= it.full ? k : null
}

// For each step 1..5, the smallest pile that reaches it (null: never).
// A step set by hand gives every pile that step; a supply lowers Small.
export function stacksFor (it: CurrencyItem, c: CurrencySettings): Array<number | null> {
  const e = c.items[it.name]
  if (e?.step != null) return [1, 2, 3, 4, 5].map(s => s === e.step ? 1 : null)
  const out = stepStarts(c, it.cat).map(at => minStack(it, at, c.from[1]))
  const supply = e?.supply ?? (it.free ? 1 : null)
  if (supply != null) {
    const f = Math.min(supply, it.full)
    out[0] = out[0] == null ? f : Math.min(out[0], f)
  }
  // A louder step never starts below a quieter one.
  for (let i = out.length - 2; i >= 0; i--) if (out[i + 1] != null && (out[i] == null || out[i]! > out[i + 1]!)) out[i] = out[i + 1]
  // A step turned off: piles that would get it hide (an item's own step stays).
  for (const s of c.off ?? []) if (s >= 1 && s <= 4) out[s - 1] = null
  return out
}

// The step a pile of `stack` gets.
export function stepOfPile (stacks: ReadonlyArray<number | null>, stack: number): CStep {
  for (let s = stacks.length - 1; s >= 0; s--) if (stacks[s] != null && stack >= stacks[s]!) return (s + 1) as CStep
  return 0
}

const a = (key: string, ...args: Array<string | number>): FilterAction => ({ key, args: args.map(String) })
const c = (key: string, op: string, values: Array<string | number>): FilterCondition => ({ key, op, count: null, values: values.map(String) } as FilterCondition)

// How each step looks. Currency keeps its own colour up to Big; Tink is the
// shared top step (top-step.ts): red on white, with the big sound and a beam.
export function currencyActions (step: CStep): FilterAction[] {
  switch (step) {
    case 0: return [a('SetFontSize', 18), a('DisableDropSound', 'True')]
    case 1: return [a('SetFontSize', 32), a('SetTextColor', 235, 210, 150, 255), a('SetBorderColor', 106, 95, 68, 255), a('SetBackgroundColor', 0, 0, 0, 215)]
    case 2: return [a('SetFontSize', 37), a('SetTextColor', 240, 220, 175, 255), a('SetBorderColor', 235, 210, 150, 255), a('SetBackgroundColor', 52, 46, 33, 240), a('PlayAlertSound', 2, 180), a('MinimapIcon', 2, 'Yellow', 'Circle')]
    case 3: return [a('SetFontSize', 41), a('SetTextColor', 18, 13, 8, 255), a('SetBorderColor', 245, 232, 202, 255), a('SetBackgroundColor', 235, 210, 150, 255), a('PlayAlertSound', 3, 250), a('PlayEffect', 'Yellow', 'Temp'), a('MinimapIcon', 1, 'Yellow', 'Circle')]
    case 4: return [a('SetFontSize', 45), a('SetTextColor', 89, 80, 57, 255), a('SetBorderColor', 235, 210, 150, 255), a('SetBackgroundColor', 255, 255, 255, 255), a('PlayAlertSound', 1, 300), a('PlayEffect', 'Yellow'), a('MinimapIcon', 0, 'Yellow', 'Circle')]
    case 5: return topStepActions('currency')
  }
}

// Each category's own colour (Guy 2026-11-27: "the colouring all being the
// same for every item type feels lame"): text on Small to Big, and the map
// icon's colour and shape where the step has one (Decent, Big). Tink stays
// the shared red on white.
export const CAT_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  orbs: { text: [235, 210, 150], color: 'Yellow', shape: 'Circle' },
  influence: { text: [200, 160, 255], color: 'Purple', shape: 'Hexagon' },
  catalysts: { text: [120, 220, 230], color: 'Cyan', shape: 'Triangle' },
  atlas: { text: [140, 185, 255], color: 'Blue', shape: 'Diamond' },
  expedition: { text: [255, 170, 90], color: 'Orange', shape: 'Square' },
  tainted: { text: [235, 95, 95], color: 'Red', shape: 'Raindrop' },
  essences: { text: [230, 140, 240], color: 'Pink', shape: 'Moon' },
  fossils: { text: [220, 205, 175], color: 'Brown', shape: 'Kite' },
  oils: { text: [255, 200, 90], color: 'Orange', shape: 'Raindrop' },
  delirium: { text: [215, 215, 230], color: 'White', shape: 'Star' },
  omens: { text: [150, 200, 255], color: 'Blue', shape: 'Moon' },
  tattoos: { text: [140, 220, 140], color: 'Green', shape: 'Cross' },
  ducats: { text: [255, 215, 60], color: 'Yellow', shape: 'Kite' },
  threads: { text: [240, 160, 220], color: 'Purple', shape: 'Cross' },
  splinters: { text: [180, 220, 255], color: 'Cyan', shape: 'Star' },
  harvest: { text: [130, 230, 110], color: 'Green', shape: 'Raindrop' },
  embers: { text: [255, 130, 60], color: 'Orange', shape: 'Triangle' },
  runegrafts: { text: [255, 120, 160], color: 'Pink', shape: 'Hexagon' },
  other: { text: [210, 190, 140], color: 'Grey', shape: 'Circle' }
}

// The ladder (Guy 2026-11-27, R2 "fill up"; one colour language, C1): the
// text stays currency gold, the category's colour fills in as value climbs.
// Small: dim, no box. Normal: an outline in the category colour. Decent: a
// filled dark tint of it. Big: inverted, the category colour is the box.
// Tink: red on white with the category's border and map icon (beam red).
// A step sets loudness only (size, sound, beam, icon size): its edits apply to
// every category. A category sets its colour and map icon.
const mixTo = (c: number[], to: number, f: number) => c.map(v => Math.round(v + (to - v) * f))
export function catColour (cat: string, c: Pick<CurrencySettings, 'cats'>): { rgb: [number, number, number], color: string, shape: string } {
  const d = CAT_LOOK[cat] ?? CAT_LOOK.other
  const own = c.cats[cat]
  return {
    rgb: own?.text ? [own.text[0], own.text[1], own.text[2]] : d.text,
    color: own?.icon?.color ?? d.color,
    shape: own?.icon?.shape ?? d.shape
  }
}

export function currencyLook (step: CStep, cat: string, c: Pick<CurrencySettings, 'steps' | 'cats'>): StylePatch {
  if (step === 0) return {}
  const { rgb, color, shape } = catColour(cat, c)
  const own = c.steps[String(step)] ?? {}
  const base = readStyle(currencyActions(step))
  const size = (own.icon !== undefined ? own.icon : base.icon)?.size
  const effect = own.effect !== undefined ? own.effect : base.effect
  const out: StylePatch = {}
  if (own.fontSize !== undefined) out.fontSize = own.fontSize
  if (own.sound !== undefined) out.sound = own.sound
  const col = (a: number[], alpha = 255) => [a[0], a[1], a[2], alpha] as [number, number, number, number]
  switch (step) {
    case 1: Object.assign(out, { text: col(rgb), border: col(mixTo(rgb, 0, 0.55)), background: col([0, 0, 0], 215) }); break
    case 2: Object.assign(out, { text: col(mixTo(rgb, 255, 0.25)), border: col(rgb), background: col(mixTo(rgb, 0, 0.78), 240) }); break
    case 3: Object.assign(out, { text: col([18, 13, 8]), border: col(mixTo(rgb, 255, 0.5)), background: col(rgb) }); break
    // Big: white, like Tink, with the category colour where Tink has red (Guy 2026-11-27: Big looked too close to Decent).
    case 4: Object.assign(out, { text: col(mixTo(rgb, 0, 0.62)), border: col(rgb), background: col([255, 255, 255]) }); break
    case 5: Object.assign(out, { border: col(rgb) }); break
  }
  // Tink's icon is red, in the category's shape (Guy 2026-11-27).
  out.icon = size == null ? null : { size, color: step === 5 ? 'Red' : color, shape }
  out.effect = effect ? { ...effect, color: step === 5 ? 'Red' : color } : null
  return out
}

// The whole look of a pile, for the tab's previews.
export function currencyFullLook (step: CStep, cat: string, c: Pick<CurrencySettings, 'steps' | 'cats'>): StylePatch {
  return { ...readStyle(currencyActions(step)), ...currencyLook(step, cat, c) }
}

export interface CurrencyCompiled {
  blocks: FilterBlock[]
  items: CurrencyItem[]
  chars: number
}

function block (step: CStep, conds: FilterCondition[], note: string, look?: ItemEdit['look']): FilterBlock {
  const b = {
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
  if (look && step > 0 && Object.keys(look).length) applyStyle(b, look)
  return b
}

export function divineChaos (items: CurrencyItem[]): number {
  const d = items.find(i => i.name === 'Divine Orb')
  return d && !d.est ? d.chaos : 150
}

export function compileCurrency (cfg: CurrencySettings, items: CurrencyItem[]): CurrencyCompiled {
  const blocks: FilterBlock[] = []
  const stacks = new Map(items.map(it => [it.name, stacksFor(it, cfg)]))
  const area = c('AreaLevel', '>=', [68])
  const clsCond = (list: CurrencyItem[]) => c('Class', '==', [...new Set(list.flatMap(i => i.cls.split('|')))].sort())
  // The piles of one item that reach each step, loudest first: [step, stack].
  const steps = (it: CurrencyItem): Array<[CStep, number]> => {
    const st = stacks.get(it.name)!
    const out: Array<[CStep, number]> = []
    for (let s = 5; s >= 1; s--) {
      const k = st[s - 1]
      if (k == null) continue
      // A step that starts where the next louder one does never applies.
      const louder = s < 5 ? st[s] : null
      if (louder != null && louder <= k) continue
      out.push([s as CStep, k])
    }
    return out
  }
  // Items with their own look get rules of their own, first.
  const own = items.filter(it => cfg.items[it.name]?.look)
  for (const it of own) {
    for (const [s, k] of steps(it)) {
      const conds = [area, clsCond([it]), c('BaseType', '==', [it.name])]
      if (k > 1) conds.push(c('StackSize', '>=', [k]))
      blocks.push(block(s, conds, `${it.name}, own look${k > 1 ? `, ${k}+` : ''}`, { ...currencyLook(s, it.cat, cfg), ...cfg.items[it.name]!.look }))
    }
  }
  // The rest grouped: loudest first (the first rule that matches wins, so a
  // big pile meets its louder rule before a quieter one), then by stack.
  const rest = items.filter(it => !cfg.items[it.name]?.look)
  const groups = new Map<string, { step: CStep, k: number, cat: string, list: CurrencyItem[] }>()
  for (const it of rest) {
    for (const [s, k] of steps(it)) {
      // Tink looks the same for every category: one rule for all of them.
      const cat = it.cat
      const key = `${s}|${k}|${cat}`
      const g = groups.get(key) ?? { step: s, k, cat, list: [] }
      g.list.push(it)
      groups.set(key, g)
    }
  }
  for (const g of [...groups.values()].sort((x, y) => y.step - x.step || y.k - x.k)) {
    const conds = [area, clsCond(g.list), c('BaseType', '==', g.list.map(i => i.name).sort())]
    if (g.k > 1) conds.push(c('StackSize', '>=', [g.k]))
    blocks.push(block(g.step, conds, [g.cat, g.k > 1 ? `${g.k}+` : ''].filter(Boolean).join(', '), currencyLook(g.step, g.cat, cfg)))
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
  const items = currencyItems(doc, lookup, cfg.items)
  if (!items.length) return null
  const compiled = compileCurrency(scaled(cfg, doc.strictness), items)
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  const at = first < 0 ? doc.chunks.length : first
  doc.chunks.splice(at, 0, ...compiled.blocks)
  const line = doc.blocks[0]?.line ?? 1
  compiled.blocks.forEach(b => { b.line = line })
  doc.blocks.unshift(...compiled.blocks)
  doc.blocks.forEach((b, i) => { b.index = i })
  return compiled
}
