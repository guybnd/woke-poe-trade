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
import { FRAGMENT_CATEGORIES, FRAGMENT_IDS, FRAGMENT_LOOK, fragmentCategoryOf } from './fragment-classes'
import { CARD_CATEGORIES, CARD_IDS, CARD_LOOK } from './card-classes'
import type { CardFacts } from './card-classes'
import { FOULBORN_PREFIX, FOULBORN_TYPE, UNIQUE_CATEGORIES, UNIQUE_CLS, UNIQUE_IDS, UNIQUE_LOOK, UNIQUE_MODES, foulCategoryOf, foulGuess, uniqueCategoryOf, uniqueGuess } from './unique-classes'
import { GEM_CATEGORIES, GEM_IDS, GEM_LOOK, GEM_MODES, gemBand, gemCategoryOf } from './gem-classes'
import { BLIGHT_TYPE, MAP_CATEGORIES, MAP_IDS, MAP_KINDS, MAP_LOOK } from './map-classes'
import type { GemLine } from './gem-classes'
import { CURRENCY_TYPE, CSTEP_NAMES } from './currency-settings'
import type { CStep, CurrencySettings, ItemEdit, SectionMode } from './currency-settings'

export { CURRENCY_TYPE, CSTEP_NAMES, FAINT_UNTIL, LINE_MIN, LINE_MAX, NUDGE_MAX, MULT_MIN, MULT_MAX, defaultCurrency, normalizeCurrency } from './currency-settings'
export type { CStep, CurrencySettings, FaintSettings, ItemEdit, SectionMode } from './currency-settings'

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
// Every class's categories (the Loot tab's rail shows one class at a time).
export const ALL_CATEGORIES: CurrencyCategory[] = [...CURRENCY_CATEGORIES, ...FRAGMENT_CATEGORIES, ...CARD_CATEGORIES, ...UNIQUE_CATEGORIES, ...GEM_CATEGORIES, ...MAP_CATEGORIES]
export type LootKind = 'currency' | 'fragments' | 'cards' | 'uniques' | 'gems' | 'maps'
export const kindOf = (cat: string): LootKind => FRAGMENT_IDS.has(cat) ? 'fragments' : CARD_IDS.has(cat) ? 'cards' : UNIQUE_IDS.has(cat) ? 'uniques' : GEM_IDS.has(cat) ? 'gems' : MAP_IDS.has(cat) ? 'maps' : 'currency'
// A section's Off / Weighted / Always: yours, else its default (boss-only
// uniques: Always).
export const sectionMode = (c: Pick<CurrencySettings, 'catMode'>, cat: string): SectionMode => c.catMode?.[cat] ?? UNIQUE_MODES[cat] ?? GEM_MODES[cat] ?? 'auto'

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
  if (type === 'fragments' && !THREAD.test(name)) return fragmentCategoryOf(name)
  // NeverSink lists it with the Allflame Embers too; it's a fragment (Guy 2026-11-27).
  if (name === 'Divine Vessel') return 'fragother'
  if (BY_TYPE[type]) return BY_TYPE[type]
  if (/Crystallised Lifeforce$/.test(name)) return 'harvest'
  if (/^Timeless .+ Splinter$|^(Simulacrum|Ritual) Splinter$/.test(name)) return 'splinters'
  if (/Catalyst$/.test(name)) return 'catalysts'
  if (/^Tainted /.test(name)) return 'tainted'
  if (/^(Astragali|Burial Medallion|Exotic Coinage|Scrap Metal)$/.test(name)) return 'expedition'
  if (/Eldritch|^(Crusader|Hunter|Redeemer|Warlord|Shaper|Elder)'s Exalted Orb$|^Awakener's Orb$|^Orb of Dominance$|^Maven's Orb$/.test(name)) return 'influence'
  if (/Astrolabe|^Maven's Chisel|^Memory of|^Valdo's Puzzle Box$|Enshrouding Crystal|^Crescent Splinter$|^Reflecting Mist$|^Refracting Fog$|^Frayed Thread$|^Message in a Bottle$/.test(name)) return 'atlas'
  if (/(Orb|Shard|Scroll|Prism|Bauble|Scrap|Whetstone)$|^Mirror|^Scroll|^Stacked Deck$|^(Foulborn )?Orb of /.test(name)) return 'orbs'
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
  // A unique base: the unique whose price it carries, and how many priced
  // uniques drop on it.
  top?: string
  of?: number
  // A gem band: the gem's name (BaseType) and its level, quality and
  // corruption conditions; `name` is the band ("Arc 20/20").
  bt?: string
  conds?: FilterCondition[]
}

const SHARD_OF: Record<string, string> = {
  'Alchemy Shard': 'Orb of Alchemy',
  'Alteration Shard': 'Orb of Alteration',
  'Transmutation Shard': 'Orb of Transmutation',
  'Chaos Shard': 'Chaos Orb',
  'Regal Shard': 'Regal Orb',
  'Exalted Shard': 'Exalted Orb',
  'Annulment Shard': 'Orb of Annulment',
  'Binding Shard': 'Orb of Binding',
  'Horizon Shard': 'Orb of Horizons',
  "Engineer's Shard": "Engineer's Orb",
  "Harbinger's Shard": "Harbinger's Orb",
  'Ancient Shard': 'Ancient Orb'
  // Not Mirror Shard: it often sells above a twentieth of a mirror (Guy).
}
const ANY_PAGE: EconomyGroup = { type: 'any', label: 'Any', ninja: ['*'] }
const UNIQUE_PAGE = NET_GROUPS.find(g => g.unique)!
const FOULBORN_PAGE: EconomyGroup = { ...UNIQUE_PAGE, foulborn: true }
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
// `cards`: each card's set size and reward fold (card-classes.ts), once read.
// `gems`: poe.ninja's gem lines, each a band (gem-classes.ts).
export function currencyItems (doc: FilterDoc, lookup: PriceLookup | null, edits: Record<string, ItemEdit> = {}, cards: CardFacts | null = null, gems: readonly GemLine[] | null = null): CurrencyItem[] {
  const seen = new Map<string, CurrencyItem>()
  const find = (type: string, name: string) => lookup?.(groupOf(type), name) ?? lookup?.(ANY_PAGE, name) ?? null
  for (const b of doc.blocks) {
    // NeverSink's fragment rules: league threads (Guy counts them as
    // currency) and the fragments (their own class on the Loot tab).
    const frags = b.type === 'fragments'
    // Divination cards: their own class too.
    const card = b.type === 'divination'
    // Uniques: NeverSink's plain tiers, a list of bases and nothing else.
    const ucat = b.type === 'uniques' ? uniqueCategoryOf(b.tier) : null
    if (ucat) {
      const bt = b.conditions.find(x => x.key === 'BaseType' && (x.op === '==' || x.op === '='))
      if (!bt || b.conditions.some(x => x !== bt && x.key !== 'Rarity')) continue
      for (const name of bt.values) {
        if (seen.has(name)) continue
        const p = lookup?.(UNIQUE_PAGE, name) ?? null
        const guess = uniqueGuess(b.tier)
        const priced = p != null && !p.thin && p.chaos > 0
        // Early league: a thin price never takes it below the guess.
        const thin = p != null && p.chaos > 0 ? (ucat === 'uniqearly' ? Math.max(guess, p.chaos) : thinPrice(p.chaos, guess)) : guess
        const own = edits[name]?.price
        const m = p?.note?.match(/^(.*?)(?:, 1 of (\d+))?$/)
        seen.set(name, {
          name,
          cls: UNIQUE_CLS,
          type: 'uniques',
          tier: b.tier,
          cat: ucat,
          chaos: (own ?? (priced ? p.chaos : thin)) * (edits[name]?.mult ?? 1),
          est: own == null && (!priced || Boolean(p?.day1)),
          ...(own != null ? { own: true } : {}),
          full: 1,
          ...(m?.[1] ? { top: m[1], of: Number(m[2] ?? 1) } : {})
        })
      }
      continue
    }
    // Foulborn uniques: NeverSink's Foulborn tiers, a list of bases. Named
    // "Foulborn <base>" so they never meet the plain unique on that base.
    const fcat = b.type === FOULBORN_TYPE ? foulCategoryOf(b.tier) : null
    if (fcat) {
      const bt = b.conditions.find(x => x.key === 'BaseType' && (x.op === '==' || x.op === '='))
      if (!bt || b.conditions.some(x => x !== bt && x.key !== 'Rarity' && x.key !== 'Foulborn')) continue
      for (const base of bt.values) {
        const name = FOULBORN_PREFIX + base
        if (seen.has(name)) continue
        const p = lookup?.(FOULBORN_PAGE, base) ?? null
        const guess = foulGuess(b.tier)
        const priced = p != null && !p.thin && p.chaos > 0
        const own = edits[name]?.price
        const m = p?.note?.match(/^(.*?)(?:, 1 of (\d+))?$/)
        seen.set(name, {
          name,
          cls: UNIQUE_CLS,
          type: 'uniques',
          tier: b.tier,
          cat: fcat,
          chaos: (own ?? (priced ? p.chaos : p != null && p.chaos > 0 ? thinPrice(p.chaos, guess) : guess)) * (edits[name]?.mult ?? 1),
          est: own == null && (!priced || Boolean(p?.day1)),
          ...(own != null ? { own: true } : {}),
          full: 1,
          bt: base,
          conds: [c('Foulborn', '', ['True'])],
          ...(m?.[1] ? { top: m[1], of: Number(m[2] ?? 1) } : {})
        })
      }
      continue
    }
    if (!b.type || !(SCOPE.test(b.type) || frags || card)) continue
    const cls = b.conditions.find(x => x.key === 'Class')?.values ?? []
    const bt = b.conditions.find(x => x.key === 'BaseType' && (x.op === '==' || x.op === '='))
    if (!bt || !cls.length || (!frags && !card && !cls.every(x => /Stackable/.test(x)))) continue
    for (const name of bt.values) {
      if (seen.has(name)) continue
      const thread = frags && THREAD.test(name)
      // Prices are in chaos, so poe.ninja doesn't list chaos itself.
      // Threads (and anything poe.ninja lists on another page than the
      // filter's group) are found by name on any page.
      const listed = name === 'Chaos Orb' ? { chaos: 1, thin: false } : find(b.type, name)
      // 20 shards make the orb, so a shard is worth at most a twentieth of
      // it. poe.ninja's shard lines are thin and can be far off (Alchemy
      // Shard at 1.12c, Guy 2026-11-27): the orb's price caps them.
      const orb = SHARD_OF[name]
      const whole = orb ? (orb === 'Chaos Orb' ? 1 : find(b.type, orb)?.chaos) : undefined
      const p = whole != null && whole > 0 && !(listed != null && listed.chaos > 0 && listed.chaos <= whole / 20) ? { chaos: whole / 20, thin: false } : listed
      const priced = p != null && !p.thin && p.chaos > 0
      const guess = tierGuess(b.tier)
      const own = edits[name]?.price
      seen.set(name, {
        name,
        cls: frags || card ? cls.join('|') : cls.length === 1 ? cls[0] : 'Stackable Currency',
        type: b.type,
        tier: b.tier,
        cat: card ? cards?.get(name)?.cat ?? 'cardother' : categoryOf(name, b.type),
        chaos: (own ?? (priced ? p.chaos : p != null && p.chaos > 0 ? thinPrice(p.chaos, guess) : guess)) * (edits[name]?.mult ?? 1),
        est: own == null && (!priced || Boolean(p?.day1)),
        ...(own != null ? { own: true } : {}),
        // Odd items with no solid price (none, or a thin one) always show.
        ...(!card && own == null && !priced && isFree(name, b.type, b.tier) ? { free: true } : {}),
        // Fragments don't stack: one is the whole pile. A card's pile is at
        // most a set (10 until the sizes are read).
        full: card ? cards?.get(name)?.stack ?? 10 : frags && !thread ? 1 : fullStack(name)
      })
    }
  }
  if (gems?.length) {
    const names = new Set(gems.map(g => g.name))
    for (const g of gems) {
      const band = gemBand(g.variant)
      const name = `${g.name} ${g.variant}`
      if (!band || seen.has(name) || !(g.chaos > 0)) continue
      const own = edits[name]?.price
      const conds = [c('GemLevel', '>=', [band.level])]
      if (band.quality > 0) conds.push(c('Quality', '>=', [band.quality]))
      if (band.corrupted) conds.push(c('Corrupted', '', ['True']))
      const cat = gemCategoryOf(g.name, names)
      // The filter names a transfigured gem by its base gem (renameBases):
      // a plain gem's band mustn't catch its transfigured versions.
      if (cat !== 'gemtrans') conds.push(c('TransfiguredGem', '', ['False']))
      seen.set(name, {
        name,
        cls: g.name.endsWith(' Support') ? 'Support Gems' : 'Skill Gems',
        type: 'gems',
        tier: null,
        cat,
        chaos: (own ?? g.chaos) * (edits[name]?.mult ?? 1),
        est: own == null && g.thin,
        ...(own != null ? { own: true } : {}),
        full: 1,
        bt: g.name,
        conds
      })
    }
  }
  // Blighted and blight-ravaged maps: a tier poe.ninja prices is an item;
  // one it doesn't stays NeverSink's.
  if (lookup && doc.blocks.some(b => b.type === BLIGHT_TYPE)) {
    for (const k of MAP_KINDS) {
      const group: EconomyGroup = { type: k.cat, label: k.prefix, ninja: [k.ninja] }
      for (let t = 1; t <= 17; t++) {
        const name = `${k.prefix} (Tier ${t})`
        const p = lookup(group, name)
        if (!p || !(p.chaos > 0)) continue
        const own = edits[name]?.price
        seen.set(name, {
          name,
          cls: 'Maps',
          type: 'maps',
          tier: null,
          cat: k.cat,
          chaos: (own ?? p.chaos) * (edits[name]?.mult ?? 1),
          est: own == null && (p.thin || Boolean(p.day1)),
          ...(own != null ? { own: true } : {}),
          full: 1,
          bt: `Map (Tier ${t})`,
          conds: [c(k.cond, '', ['True'])]
        })
      }
    }
  }
  return [...seen.values()]
}

// An item with the player's own price and Worth × on top.
export function withEdit (it: CurrencyItem, e: ItemEdit | undefined): CurrencyItem {
  if (e?.price == null && !e?.mult) return it
  return { ...it, chaos: (e.price ?? it.chaos) * (e.mult ?? 1), ...(e.price != null ? { est: false, own: true } : {}) }
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
// A category's own strictness (Guy 2026-11-27): each notch ×1.25 (or ÷),
// on top of the main multiplier, on every step's price.
export const catMult = (c: Pick<CurrencySettings, 'nudge'>, cat: string): number => 1.25 ** (c.nudge[cat] ?? 0)
export function catLine (c: Pick<CurrencySettings, 'line' | 'nudge'>, cat: string): number {
  return c.line * catMult(c, cat)
}

// Where each step 1..5 starts, in chaos, with the category's strictness:
// Small at the line, the louder ones at their own price, never under it.
export function stepStarts (c: Pick<CurrencySettings, 'line' | 'from' | 'nudge'>, cat = ''): number[] {
  const k = catMult(c, cat)
  const line = c.line * k
  return [line, ...c.from.map(f => Math.max(line, f * k))]
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
  // Its category set by hand: Off hides it unless the item itself is
  // Always; Always shows every pile at least Small.
  const mode = sectionMode(c, it.cat)
  if (mode === 'off' && e?.supply !== 1 && !e?.min) return [null, null, null, null, null]
  const out = stepStarts(c, it.cat).map(at => minStack(it, at, c.from[1]))
  const supply = e?.supply ?? (it.free || mode === 'always' ? 1 : null)
  if (supply != null) {
    const f = Math.min(supply, it.full)
    out[0] = out[0] == null ? f : Math.min(out[0], f)
  }
  // A louder step never starts below a quieter one.
  for (let i = out.length - 2; i >= 0; i--) if (out[i + 1] != null && (out[i] == null || out[i]! > out[i + 1]!)) out[i] = out[i + 1]
  // A step turned off: piles that would get it hide (an item's own step stays).
  for (const s of c.off ?? []) if (s >= 1 && s <= 4) out[s - 1] = null
  // Collecting (a floor step): every pile gets at least it, whatever hides
  // the rest (Guy's star, 2026-11-27).
  if (e?.min) out[e.min - 1] = 1
  return out
}

// Hidden by hand, so never Faint either: the item's own Off, or its
// category's Off without the item's own Always.
export function forcedHidden (it: Pick<CurrencyItem, 'name' | 'cat'>, c: Pick<CurrencySettings, 'items' | 'catMode'>): boolean {
  const e = c.items[it.name]
  return e?.step === 0 || (sectionMode(c, it.cat) === 'off' && e?.supply !== 1 && e?.step == null && !e?.min)
}

// The Strictness multiplier in force: the player's own, or the filter's level's.
export function multOf (c: Pick<CurrencySettings, 'mult'>, strictness: string | null): number {
  return c.mult ?? strictMult(levelOf(strictness))
}
// Faint is on while the multiplier is under its "until" (Guy's T1).
export function faintOn (c: Pick<CurrencySettings, 'mult' | 'faint'>, strictness: string | null): boolean {
  return !!c.faint?.on && multOf(c, strictness) < c.faint.until
}
// Faint's look (Guy's X1): the category colour at 40% opacity, small text,
// no box, no sound.
export function faintLook (rgb: readonly number[]): StylePatch {
  return {
    fontSize: 20,
    text: [rgb[0], rgb[1], rgb[2], 100],
    border: [0, 0, 0, 0],
    background: [0, 0, 0, 0],
    icon: null,
    effect: null
  }
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
    case 2: return [a('SetFontSize', 37), a('SetTextColor', 255, 219, 111, 255), a('SetBorderColor', 255, 219, 111, 255), a('SetBackgroundColor', 51, 44, 22, 255), a('PlayAlertSound', 2, 180), a('MinimapIcon', 2, 'Yellow', 'Circle')]
    case 3: return [a('SetFontSize', 41), a('SetTextColor', 0, 0, 0, 255), a('SetBorderColor', 235, 210, 150, 255), a('SetBackgroundColor', 255, 190, 0, 255), a('PlayAlertSound', 3, 250), a('PlayEffect', 'Yellow', 'Temp'), a('MinimapIcon', 1, 'Yellow', 'Circle')]
    case 4: return [a('SetFontSize', 45), a('SetTextColor', 0, 0, 0, 255), a('SetBorderColor', 235, 210, 150, 255), a('SetBackgroundColor', 255, 93, 27, 255), a('PlayAlertSound', 1, 300), a('PlayEffect', 'Yellow'), a('MinimapIcon', 0, 'Yellow', 'Circle')]
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
  // Not red: red beams and map icons are kept for Tink (sure profit, Guy 2026-11-27).
  tainted: { text: [235, 95, 95], color: 'Purple', shape: 'Raindrop' },
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

// The ladder (Guy 2026-11-27, O2C: the orange the game's players know).
// Small: the category colour on black. Normal: a vivid category colour on a
// dark box of it. Decent: black on amber, Big: black on orange, both edged in
// the category colour. Tink: red on white with the category's border and map
// icon (beam red).
// A step sets loudness only (size, sound, beam, icon size): its edits apply to
// every category. A category sets its colour and map icon.
const mixTo = (c: number[], to: number, f: number) => c.map(v => Math.round(v + (to - v) * f))
// The colour pushed 80% further from grey (Normal: "as now but more saturated").
const vivid = (c: number[]) => { const g = (c[0] + c[1] + c[2]) / 3; return c.map(v => Math.max(0, Math.min(255, Math.round(v + (v - g) * 0.8)))) }
export function catColour (cat: string, c: Pick<CurrencySettings, 'cats'>): { rgb: [number, number, number], color: string, shape: string } {
  const d = CAT_LOOK[cat] ?? FRAGMENT_LOOK[cat] ?? CARD_LOOK[cat] ?? UNIQUE_LOOK[cat] ?? GEM_LOOK[cat] ?? MAP_LOOK[cat] ?? CAT_LOOK.other
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
    case 2: { const k = vivid(rgb); Object.assign(out, { text: col(k), border: col(k), background: col(mixTo(k, 0, 0.8)) }); break }
    case 3: Object.assign(out, { text: col([0, 0, 0]), border: col(rgb), background: col([255, 190, 0]) }); break
    case 4: Object.assign(out, { text: col([0, 0, 0]), border: col(rgb), background: col([255, 93, 27]) }); break
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

function faintBlock (conds: FilterCondition[], cat: string, rgb: readonly number[]): FilterBlock {
  const b = block(1, conds, '')
  b.tier = 'faint'
  b.comment = `$type->${CURRENCY_TYPE} $tier->faint woke: currency weights, faint: ${cat}`
  b.actions = [a('SetFontSize', 20), a('DisableDropSound', 'True')]
  applyStyle(b, faintLook(rgb))
  return b
}

export function divineChaos (items: CurrencyItem[]): number {
  const d = items.find(i => i.name === 'Divine Orb')
  return d && !d.est ? d.chaos : 150
}

export function compileCurrency (cfg: CurrencySettings, items: CurrencyItem[], opts: { faint?: boolean, floors?: FilterBlock[] } = {}): CurrencyCompiled {
  const blocks: FilterBlock[] = []
  const bts = (list: CurrencyItem[]) => [...new Set(list.map(i => i.bt ?? i.name))].sort()
  const stacks = new Map(items.map(it => [it.name, stacksFor(it, cfg)]))
  const area = c('AreaLevel', '>=', [68])
  const clsCond = (list: CurrencyItem[]) => list[0]?.cls === UNIQUE_CLS ? c('Rarity', '', ['Unique']) : c('Class', '==', [...new Set(list.flatMap(i => i.cls.split('|')))].sort())
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
      const conds = [area, clsCond([it]), c('BaseType', '==', bts([it])), ...(it.conds ?? [])]
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
      const key = `${s}|${k}|${cat}|${it.conds ? JSON.stringify(it.conds) : ''}`
      const g = groups.get(key) ?? { step: s, k, cat, list: [] }
      g.list.push(it)
      groups.set(key, g)
    }
  }
  for (const g of [...groups.values()].sort((x, y) => y.step - x.step || y.k - x.k)) {
    const conds = [area, clsCond(g.list), c('BaseType', '==', bts(g.list)), ...(g.list[0].conds ?? [])]
    if (g.k > 1) conds.push(c('StackSize', '>=', [g.k]))
    blocks.push(block(g.step, conds, [g.cat, g.k > 1 ? `${g.k}+` : ''].filter(Boolean).join(', '), currencyLook(g.step, g.cat, cfg)))
  }
  // What was hidden by hand (its own Off, or its section's) hides before the
  // floors and Faint: a section set Off doesn't come back at 20% quality.
  // A gem band keeps its own conditions (level, quality, TransfiguredGem
  // False), so hiding one band or plain gems never hides the others.
  const forced = items.filter(it => forcedHidden(it, cfg))
  if (forced.length && (opts.faint || opts.floors?.length)) {
    const byConds = new Map<string, CurrencyItem[]>()
    for (const it of forced) {
      const k = it.conds ? JSON.stringify(it.conds) : ''
      byConds.set(k, [...(byConds.get(k) ?? []), it])
    }
    for (const list of byConds.values()) blocks.push(block(0, [area, clsCond(list), c('BaseType', '==', bts(list)), ...(list[0].conds ?? [])], 'off, set by hand'))
  }
  // Floors (gems at 20% quality, transfigured gems): above the line.
  blocks.push(...(opts.floors ?? []))
  // Under the line: Faint in the category colour (Guy's T1, X1) while it's
  // on, except what was hidden by hand; otherwise hidden.
  // A list whose items all carry the same extra conditions (Foulborn True)
  // keeps them, so it never catches the plain items on those bases.
  const shared = (list: CurrencyItem[]) => {
    const k = list[0]?.conds ? JSON.stringify(list[0].conds) : ''
    return k && list.every(it => it.conds && JSON.stringify(it.conds) === k) ? list[0].conds! : []
  }
  if (opts.faint) {
    const byCat = new Map<string, CurrencyItem[]>()
    for (const it of items) if (!forcedHidden(it, cfg)) byCat.set(it.cat, [...(byCat.get(it.cat) ?? []), it])
    for (const [cat, list] of byCat) blocks.push(faintBlock([area, clsCond(list), c('BaseType', '==', bts(list)), ...shared(list)], cat, catColour(cat, cfg).rgb))
  } else if (items.length) blocks.push(block(0, [area, clsCond(items), c('BaseType', '==', bts(items)), ...shared(items)], 'under the line'))
  const chars = blocks.reduce((n, b) => n + 160 + b.conditions.reduce((m, x) => m + x.key.length + 12 + x.values.reduce((k, v) => k + v.length + 3, 0), 0), 0)
  return { blocks, items, chars }
}

// Writes the rules above everything else in the filter (like the rare
// weights: build rules, presets and your own rules then go on top).
export function applyCurrency (doc: FilterDoc, cfg: CurrencySettings, lookup: PriceLookup | null, cards: CardFacts | null = null, gems: readonly GemLine[] | null = null): CurrencyCompiled | null {
  // Without prices every item would be a guess: leave it to NeverSink.
  if (!cfg.on || !lookup) return null
  const all = currencyItems(doc, lookup, cfg.items, cards, gems)
  if (!all.length) return null
  const eff = scaled(cfg, doc.strictness)
  const faint = faintOn(cfg, doc.strictness)
  const gemItems = all.filter(it => it.type === 'gems')
  const items = all.filter(it => it.cls !== UNIQUE_CLS && it.type !== 'gems' && it.type !== 'maps')
  const none: CurrencyCompiled = { blocks: [], items: [], chars: 0 }
  const compiled = items.length ? compileCurrency(eff, items, { faint }) : none
  const gemsOut = gemItems.length ? compileCurrency(eff, gemItems, { faint, floors: gemFloors(eff) }) : none
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  insertBlocks(doc, first < 0 ? doc.chunks.length : first, [...compiled.blocks, ...gemsOut.blocks])
  const foul = applyFoulborn(doc, eff, all.filter(it => it.cat === 'uniqfoul'), faint) ?? none
  const uniq = applyUniques(doc, eff, all.filter(it => it.cls === UNIQUE_CLS && it.cat !== 'uniqfoul'), faint) ?? none
  const maps = applySpecialMaps(doc, eff, all.filter(it => it.type === 'maps'), faint) ?? none
  const parts = [compiled, gemsOut, foul, uniq, maps]
  return { blocks: parts.flatMap(x => x.blocks), items: parts.flatMap(x => x.items), chars: parts.reduce((n, x) => n + x.chars, 0) }
}

// Gems that show at least Small whatever their band says: 20% quality (a
// Gemcutter's Prism at the vendor, Guy's G2), and the Always sections, which
// also catch gems poe.ninja doesn't list.
function gemFloors (cfg: CurrencySettings): FilterBlock[] {
  const area = c('AreaLevel', '>=', [68])
  const cls = c('Class', '==', ['Skill Gems', 'Support Gems'])
  const out = [block(1, [area, cls, c('Quality', '>=', [20])], 'gems at 20% quality', currencyLook(1, 'gemskill', cfg))]
  const floor = (cat: string, cond: FilterCondition) => {
    if (sectionMode(cfg, cat) === 'always') out.unshift(block(1, [area, cls, cond], `${cat}, always`, currencyLook(1, cat, cfg)))
  }
  floor('gemexc', c('BaseType', '', ['Enlighten Support', 'Empower Support', 'Enhance Support']))
  floor('gemawk', c('BaseType', '', ['Awakened ']))
  floor('gemtrans', c('TransfiguredGem', '', ['True']))
  return out
}

function insertBlocks (doc: FilterDoc, at: number, blocks: FilterBlock[]) {
  if (!blocks.length) return
  const after = doc.chunks.slice(at).find((ch): ch is FilterBlock => ch.kind === 'block')
  doc.chunks.splice(at, 0, ...blocks)
  const line = after?.line ?? doc.blocks[doc.blocks.length - 1]?.line ?? 1
  blocks.forEach(b => { b.line = line })
  const i = after ? doc.blocks.indexOf(after) : doc.blocks.length
  doc.blocks.splice(i < 0 ? doc.blocks.length : i, 0, ...blocks)
  doc.blocks.forEach((b, k) => { b.index = k })
}

// Blighted and blight-ravaged maps go where NeverSink's blighted maps start,
// one compile per kind so each rule, the line's too, keeps its BlightedMap or
// UberBlightedMap condition and never touches plain maps of those tiers.
function applySpecialMaps (doc: FilterDoc, cfg: CurrencySettings, items: CurrencyItem[], faint: boolean): CurrencyCompiled | null {
  if (!items.length) return null
  const anchor = doc.blocks.find(b => b.type === BLIGHT_TYPE)
  if (!anchor) return null
  const parts = MAP_KINDS.map(k => items.filter(it => it.cat === k.cat)).filter(l => l.length).map(l => compileCurrency(cfg, l, { faint }))
  const blocks = parts.flatMap(x => x.blocks)
  insertBlocks(doc, doc.chunks.indexOf(anchor), blocks)
  return { blocks, items, chars: parts.reduce((n, x) => n + x.chars, 0) }
}

// Foulborn uniques go where NeverSink's Foulborn tiers start, so the plain
// unique rules below never see them. Every rule matches `Foulborn True`.
function applyFoulborn (doc: FilterDoc, cfg: CurrencySettings, items: CurrencyItem[], faint: boolean): CurrencyCompiled | null {
  if (!items.length) return null
  const anchor = doc.blocks.find(b => b.type === FOULBORN_TYPE)
  if (!anchor) return null
  const compiled = compileCurrency(cfg, items, { faint })
  insertBlocks(doc, doc.chunks.indexOf(anchor), compiled.blocks)
  return compiled
}

// Uniques go where NeverSink's unique tiers start, under its special rules
// that come first (6-link, synthesised, abyss sockets; Foulborn and replicas
// earlier still). The specials NeverSink lists among its tiers (corrupted
// implicits, 5-link, 6 sockets, Vestigial...) are copied in between, so a
// valuable base keeps its loud look, a special one on a cheap base keeps
// NeverSink's, and nothing special is hidden by a price. Below area level 68
// NeverSink's own rules still decide.
function applyUniques (doc: FilterDoc, cfg: CurrencySettings, items: CurrencyItem[], faint: boolean): CurrencyCompiled | null {
  if (!items.length) return null
  const anchor = doc.blocks.find(b => b.type === 'uniques' && uniqueCategoryOf(b.tier) != null)
  if (!anchor) return null
  const compiled = compileCurrency(cfg, items, { faint })
  const loud = compiled.blocks.filter(b => b.visibility === 'Show' && Number(b.tier?.slice(1)) >= 3)
  const quiet = compiled.blocks.filter(b => !loud.includes(b))
  const area = c('AreaLevel', '>=', [68])
  const specials = doc.blocks
    .filter(b => b.index > anchor.index && b.type === 'uniques' && uniqueCategoryOf(b.tier) == null && b.visibility === 'Show' && !b.disabled)
    .map(b => ({
      ...b,
      comment: `$type->${CURRENCY_TYPE} $tier->u-${b.tier} woke: currency weights, NeverSink's ${b.tier} uniques kept above the priced ones`,
      type: CURRENCY_TYPE,
      tier: `u-${b.tier}`,
      conditions: [area, ...b.conditions.map(x => ({ ...x, values: [...x.values] }))],
      actions: b.actions.map(x => ({ ...x, args: [...x.args] })),
      dirty: true,
      added: true,
      inherited: true
    }) as FilterBlock)
  const blocks = [...loud, ...specials, ...quiet]
  insertBlocks(doc, doc.chunks.indexOf(anchor), blocks)
  return { ...compiled, blocks }
}
