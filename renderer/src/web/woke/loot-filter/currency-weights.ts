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
// Everywhere by default, the hideout too (levelling.ts: the gate, and the
// levelling floors below maps). The rules sit above everything NeverSink
// has and end with their own Hide, so NeverSink never sees these items. Off (the default), nothing is written.
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc } from './parse'
import { NET_GROUPS } from './economy'
import type { DropUnique, EconomyGroup, PriceLookup } from './economy'
import { applyStyle, readStyle } from './edits'
import type { StylePatch } from './edits'
import { fullStack } from './stack-sizes'
import { ITEM_BY_REF } from '@/assets/data'
import { topStepActions } from './top-step'
import { FRAGMENT_CATEGORIES, FRAGMENT_IDS, FRAGMENT_LOOK, fragmentCategoryOf } from './fragment-classes'
import { CARD_CATEGORIES, CARD_IDS, CARD_LOOK } from './card-classes'
import type { CardFacts } from './card-classes'
import { FOULBORN_PREFIX, FOULBORN_TYPE, SPECIAL_ROLLS, UNIQUE_CATEGORIES, UNIQUE_CLS, UNIQUE_IDS, UNIQUE_LOOK, UNIQUE_MODES, chaseLookOf, foulCategoryOf, foulGuess, uniqueCategoryOf, uniqueGuess } from './unique-classes'
import { GEM_CATEGORIES, GEM_IDS, GEM_LOOK, GEM_MODES, gemBand, gemCategoryOf } from './gem-classes'
import { CHRONICLE, LEAGUE_CATEGORIES, LEAGUE_IDS, LEAGUE_LOOK, LEAGUE_MODES, LEAGUE_PRICED, LEAGUE_ROWS } from './league-classes'
import { JEWEL_CATEGORIES, JEWEL_IDS, JEWEL_LOOK, JEWEL_ROWS, JEWEL_TYPE } from './jewel-classes'
import { BLIGHT_TYPE, MAP_CATEGORIES, MAP_IDS, MAP_KINDS, MAP_LOOK, SPECIAL_MAPS, SPECIAL_MAP_CATS } from './map-classes'
import type { GemBand, GemLine } from './gem-classes'
import { CURRENCY_TYPE, CSTEP_NAMES } from './currency-settings'
import { LV_GEMS_UNTIL, LV_UNIQUE_STEP, gateConds, lvConds, lvCurrencyOf } from './levelling'
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
  { id: 'gold', name: 'Gold', art: 'Gold' },
  { id: 'other', name: 'Other', art: 'Scrying Orb' }
]

// Gold has no price: its piles get their step by size, from the Gold
// ruler (CurrencySettings.gold).
export const GOLD_NAME = 'Gold'
// Every class's categories (the Loot tab's rail shows one class at a time).
export const ALL_CATEGORIES: CurrencyCategory[] = [...CURRENCY_CATEGORIES, ...FRAGMENT_CATEGORIES, ...CARD_CATEGORIES, ...UNIQUE_CATEGORIES, ...GEM_CATEGORIES, ...MAP_CATEGORIES, ...JEWEL_CATEGORIES, ...LEAGUE_CATEGORIES]
export type LootKind = 'currency' | 'gold' | 'fragments' | 'cards' | 'uniques' | 'gems' | 'maps' | 'jewels' | 'league'
export const kindOf = (cat: string): LootKind => cat === 'gold' ? 'gold' : FRAGMENT_IDS.has(cat) ? 'fragments' : CARD_IDS.has(cat) ? 'cards' : UNIQUE_IDS.has(cat) ? 'uniques' : GEM_IDS.has(cat) ? 'gems' : MAP_IDS.has(cat) ? 'maps' : JEWEL_IDS.has(cat) ? 'jewels' : LEAGUE_IDS.has(cat) ? 'league' : 'currency'
// A section's Off / Weighted / Always: yours, else its default (boss-only
// uniques: Always).
export const sectionMode = (c: Pick<CurrencySettings, 'catMode'>, cat: string): SectionMode => c.catMode?.[cat] ?? UNIQUE_MODES[cat] ?? GEM_MODES[cat] ?? LEAGUE_MODES[cat] ?? 'auto'

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
// Gems by level and quality (Guy 2026-11-28: "these sections very dense"),
// corrupted ones first with bands of their own (his pick C). Vaal gems are
// always corrupted, so they only get the bands.
const PLAIN_BANDS = ['20/20', '20/0', '1/20', '1/0+']
export const GEM_BANDS = [...['21/23', '21/20', '20/23', ...PLAIN_BANDS].map(b => `Corrupted · ${b}`), ...PLAIN_BANDS]
const GEM_BANDED = new Set(['gemtrans', 'gemvaal', 'gemsup', 'gemskill'])
export const SUBGROUPS: Record<string, readonly string[]> = {
  essences: [...ESSENCE_TIERS, 'Special'],
  ...Object.fromEntries([...GEM_BANDED].map(id => [id, GEM_BANDS])),
  gemvaal: ['21/23', '21/20', '20/23', ...PLAIN_BANDS]
}
function gemBandOf (name: string, cat: string): string {
  const m = / (\d+)(?:\/(\d+))?(c)?$/.exec(name)
  const lv = Number(m?.[1] ?? 1)
  const q = Number(m?.[2] ?? 0)
  const band = lv >= 21 ? (q >= 21 ? '21/23' : '21/20') : q >= 21 ? '20/23' : lv >= 20 ? (q >= 20 ? '20/20' : '20/0') : q >= 20 ? '1/20' : '1/0+'
  return m?.[3] && cat !== 'gemvaal' ? `Corrupted · ${band}` : band
}
export function subgroupOf (name: string, cat: string): string | null {
  if (GEM_BANDED.has(cat)) return gemBandOf(name, cat)
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
  // Priced by its average drop over `of` uniques (dropLookup), and the rare
  // valuable uniques left out of that average, most valuable first.
  avg?: true
  chase?: Array<{ name: string, chaos: number }>
  // Every priced unique on the base and how the average treats it.
  uniques?: DropUnique[]
  // A unique base's inventory size ("2x3"), for the size cut.
  size?: string
  // A gem band: the gem's name (BaseType) and its level, quality and
  // corruption conditions; `name` is the band ("Arc 20/20").
  bt?: string
  // Several BaseTypes (a special map of any tier, "Any unique, 6-link"); `bt` is the one its tooltip shows.
  bts?: string[]
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
        const m = p?.drop ? null : p?.note?.match(/^(.*?)(?:, 1 of (\d+))?$/)
        // Guy's S1: a boss base that also drops world uniques is priced by
        // those (the boss's own unique is left out); a boss-only one stays
        // Boss drops. A base with a chase unique on it goes to Chase uniques.
        // A base with no world-drop unique at all (Guy 2026-11-28: Cabalist
        // Regalia, Fishing Rod...) goes there too, whatever NeverSink's tier.
        const cat = p?.noWorld ? 'uniqboss' : ucat === 'uniqboss' && p?.drop ? 'uniqbossmix' : ucat
        seen.set(name, {
          name,
          cls: UNIQUE_CLS,
          type: 'uniques',
          tier: b.tier,
          cat: p?.drop?.chase.length && cat !== 'uniqboss' ? 'uniqchase' : cat,
          chaos: (own ?? (priced ? p.chaos : thin)) * (edits[name]?.mult ?? 1),
          est: own == null && (!priced || Boolean(p?.day1)),
          ...(own != null ? { own: true } : {}),
          full: 1,
          ...(m?.[1] ? { top: m[1], of: Number(m[2] ?? 1) } : {}),
          ...sizeOf(name),
          ...(p?.drop ? { of: p.drop.of, avg: true, uniques: p.drop.uniques, ...(p.drop.chase.length ? { chase: p.drop.chase } : {}) } : {})
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
    // A thin band (poe.ninja had no price most days) is often a few hand-set
    // listings: "More Duration Support 21/23c" at 150 div (Guy 2026-11-28).
    // It counts at most 3× the most valuable solid band of the same gem that
    // is at least as good (level and quality as high, corrupted or not the
    // same): a better copy can't be worth less than a worse one.
    const solidBands = new Map<string, Array<{ band: GemBand, chaos: number }>>()
    for (const g of gems) {
      const band = gemBand(g.variant)
      if (g.thin || !band || !(g.chaos > 0)) continue
      solidBands.set(g.name, [...(solidBands.get(g.name) ?? []), { band, chaos: g.chaos }])
    }
    const thinCap = (g: GemLine, b: GemBand): number | null => {
      const better = (solidBands.get(g.name) ?? []).filter(x => x.band.level >= b.level && x.band.quality >= b.quality && x.band.corrupted === b.corrupted)
      return better.length ? Math.max(...better.map(x => x.chaos)) * 3 : null
    }
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
        chaos: (own ?? Math.min(g.chaos, (g.thin ? thinCap(g, band) : null) ?? Infinity)) * (edits[name]?.mult ?? 1),
        est: own == null && g.thin,
        ...(own != null ? { own: true } : {}),
        full: 1,
        bt: g.name,
        conds
      })
    }
  }
  // Special unique rolls: each base of each of NeverSink's special rules,
  // with that rule's conditions (6 links, both influences, no sockets...).
  if (lookup) {
    const fusing = find('currency', 'Orb of Fusing')
    // No Fusing price yet: about what 20 have cost in past leagues.
    const linkFloor = fusing && fusing.chaos > 0 ? fusing.chaos * 20 : 10
    const plainBases = [...seen.values()].filter(it => it.cls === UNIQUE_CLS && it.type === 'uniques' && !it.conds).map(it => it.name)
    for (const b of doc.blocks) {
      const label = b.type === 'uniques' && b.tier ? SPECIAL_ROLLS[b.tier] : undefined
      if (!label || b.visibility !== 'Show' || b.disabled) continue
      const bt = b.conditions.find(x => x.key === 'BaseType' && (x.op === '==' || x.op === '='))
      const conds = b.conditions.filter(x => x !== bt && x.key !== 'Rarity').map(x => ({ ...x, values: [...x.values] }))
      const links = conds.some(x => x.key === 'LinkedSockets')
      const group: EconomyGroup = { ...UNIQUE_PAGE, special: true, links }
      // NeverSink's any-base 6-link rule is one row (Guy's R1, 2026-11-28),
      // priced by the most valuable 6-linked unique, so it shows the way
      // NeverSink shows every 6-linked unique (Tink) unless you set its step.
      if (!bt) {
        const name = `Any unique, ${label}`
        if (seen.has(name)) continue
        const lines = plainBases.map(base => ({ base, p: lookup(group, base) })).filter(x => x.p && x.p.chaos > 0)
        if (!lines.length) continue
        const low = lines.reduce((x, y) => y.p!.chaos > x.p!.chaos ? y : x)
        const own = edits[name]?.price
        seen.set(name, {
          name,
          cls: UNIQUE_CLS,
          type: 'uniques',
          tier: b.tier,
          cat: 'uniqspec',
          chaos: (own ?? (links ? Math.max(low.p!.chaos, linkFloor) : low.p!.chaos)) * (edits[name]?.mult ?? 1),
          est: own == null && (low.p!.thin || Boolean(low.p!.day1)),
          ...(own != null ? { own: true } : {}),
          full: 1,
          bts: lines.map(x => x.base),
          conds,
          of: lines.length
        })
        continue
      }
      for (const base of bt.values) {
        const name = `${base}, ${label}`
        if (seen.has(name)) continue
        const p = lookup(group, base)
        if (!p || !(p.chaos > 0)) continue
        const own = edits[name]?.price
        const m = p.note?.match(/^(.*?)(?:, 1 of (\d+))?$/)
        seen.set(name, {
          name,
          cls: UNIQUE_CLS,
          type: 'uniques',
          tier: b.tier,
          cat: 'uniqspec',
          chaos: (own ?? (links ? Math.max(p.chaos, linkFloor) : p.chaos)) * (edits[name]?.mult ?? 1),
          est: own == null && (p.thin || Boolean(p.day1)),
          ...(own != null ? { own: true } : {}),
          full: 1,
          bt: base,
          ...sizeOf(base),
          conds,
          ...(m?.[1] ? { top: m[1], of: Number(m[2] ?? 1) } : {})
        })
      }
    }
  }
  // Blighted and blight-ravaged maps: a tier poe.ninja prices is an item;
  // one it doesn't stays NeverSink's.
  if (lookup && doc.blocks.some(b => b.type === BLIGHT_TYPE)) {
    for (const k of MAP_KINDS) {
      const group: EconomyGroup = { type: k.cat, label: k.prefix, ninja: [k.ninja] }
      // Blighted maps stop at tier 16 (no "Map (Tier 17)" base to name).
      for (let t = 1; t <= 16; t++) {
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
  // Gold (Guy 2026-11-28, "we also missing a gold section"): no trade price,
  // so one row, its piles stepped by size on the Gold ruler.
  if (doc.blocks.some(b => b.conditions.some(x => x.key === 'BaseType' && x.values.includes('Gold')))) {
    seen.set(GOLD_NAME, { name: GOLD_NAME, cls: '', type: 'gold', tier: null, cat: 'gold', chaos: 0, est: true, full: 1e7, bt: 'Gold' })
  }
  // Special maps (Guy 2026-11-28): endgame and guardian maps priced by
  // poe.ninja, the rest from a guess.
  if (lookup && doc.blocks.some(b => b.type?.startsWith('maps'))) {
    const group: EconomyGroup = { type: 'maps', label: 'Maps', ninja: ['Map'] }
    for (const m of SPECIAL_MAPS) {
      const prices = (m.ninja ?? []).map(n => lookup(group, n)).filter((p): p is NonNullable<typeof p> => !!p && p.chaos > 0)
      if (m.ninja && !prices.length) continue
      const p = prices.length ? prices.reduce((a, b) => (b.chaos < a.chaos ? b : a)) : null
      const own = edits[m.name]?.price
      seen.set(m.name, {
        name: m.name,
        cls: 'Maps',
        type: 'maps',
        tier: null,
        cat: m.cat,
        chaos: (own ?? p?.chaos ?? m.guess ?? 1) * (edits[m.name]?.mult ?? 1),
        est: own == null && (!p || p.thin || Boolean(p.day1)),
        ...(own != null ? { own: true } : {}),
        full: 1,
        bt: m.bts[m.bts.length - 1],
        bts: m.bts,
        conds: m.conds.map(x => ({ ...x, values: [...x.values] }))
      })
    }
  }
  // Abyss and plain jewels (Guy's Jewels A, 2026-11-28): a row per rarity and
  // item level band, each a guess you set the step or price of.
  if (doc.blocks.some(b => b.type != null && JEWEL_TYPE.test(b.type))) {
    for (const j of JEWEL_ROWS) {
      const own = edits[j.name]?.price
      seen.set(j.name, {
        name: j.name,
        cls: j.cls,
        type: 'jewels',
        tier: null,
        cat: j.cat,
        chaos: (own ?? j.guess) * (edits[j.name]?.mult ?? 1),
        est: own == null,
        ...(own != null ? { own: true } : {}),
        full: 1,
        bt: j.bts[0],
        bts: j.bts,
        conds: j.conds.map(x => ({ ...x, values: [...x.values] }))
      })
    }
  }
  // League items (Guy's League A, 2026-11-28): priced sections by name, the
  // rest a row per thing a filter can see, each a guess you can change.
  if (doc.blocks.some(b => b.type === 'expedition->logbook' || b.type?.startsWith('heist->') || b.type === 'viscera' || b.type === 'miscmapitemsextra')) {
    const guessed = (name: string, cat: string, cls: string, bts: string[], guess: number, conds: FilterCondition[], tip?: string) => {
      const own = edits[name]?.price
      seen.set(name, {
        name,
        cls,
        type: 'league',
        tier: null,
        cat,
        chaos: (own ?? guess) * (edits[name]?.mult ?? 1),
        est: own == null,
        ...(own != null ? { own: true } : {}),
        full: 1,
        ...(tip ?? bts[0] ? { bt: tip ?? bts[0] } : {}),
        bts,
        conds: conds.map(x => ({ ...x, values: [...x.values] }))
      })
    }
    for (const r of LEAGUE_ROWS) guessed(r.name, r.cat, r.cls, r.bts, r.guess, r.conds, r.tip)
    for (const sec of LEAGUE_PRICED) {
      const group: EconomyGroup = { type: sec.cat, label: sec.cat, ninja: sec.ninja }
      for (const b of doc.blocks) {
        if (b.type !== sec.type || !sec.tiers.includes(b.tier ?? '')) continue
        const bt = b.conditions.find(x => x.key === 'BaseType' && (x.op === '==' || x.op === '='))
        for (const name of bt?.values ?? []) {
          if (seen.has(name)) continue
          const p = lookup?.(group, name) ?? null
          const priced = p != null && p.chaos > 0
          const own = edits[name]?.price
          seen.set(name, {
            name,
            cls: sec.cls,
            type: 'league',
            tier: b.tier,
            cat: sec.cat,
            chaos: (own ?? (priced ? p.chaos : sec.guess(b.tier))) * (edits[name]?.mult ?? 1),
            est: own == null && (!priced || p.thin || Boolean(p.day1)),
            ...(own != null ? { own: true } : {}),
            full: 1
          })
        }
      }
    }
    const p = lookup?.({ type: CHRONICLE.cat, label: CHRONICLE.cat, ninja: CHRONICLE.ninja }, CHRONICLE.name) ?? null
    const own = edits[CHRONICLE.name]?.price
    seen.set(CHRONICLE.name, {
      name: CHRONICLE.name,
      cls: '',
      type: 'league',
      tier: null,
      cat: CHRONICLE.cat,
      chaos: (own ?? (p && p.chaos > 0 ? p.chaos : CHRONICLE.guess)) * (edits[CHRONICLE.name]?.mult ?? 1),
      est: own == null && (!p || !(p.chaos > 0) || p.thin || Boolean(p.day1)),
      ...(own != null ? { own: true } : {}),
      full: 1
    })
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
  // The size cut: Auto turns it on from Strict (×1.25) up (Guy's W2).
  const sizeOn = c.sizeCut === 'on' || (c.sizeCut !== 'off' && m >= 1.25)
  if (m === 1) return sizeOn === Boolean(c.sizeOn) ? c : { ...c, sizeOn }
  return { ...c, sizeOn, line: c.line * m, from: c.from.map(f => f * m) as CurrencySettings['from'], gold: c.gold.map(g => Math.max(1, Math.round(g * m))), rulers: Object.fromEntries(Object.entries(c.rulers ?? {}).map(([k, r]) => [k, r.map(v => v * m)])) }
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
// A section with its own ruler starts its steps there, without its bias.
export function stepStarts (c: Pick<CurrencySettings, 'line' | 'from' | 'nudge'> & Partial<Pick<CurrencySettings, 'rulers'>>, cat = ''): number[] {
  const own = c.rulers?.[cat]
  if (own) return own.map(v => Math.max(own[0], v))
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
// A unique base's size, from the item data (none until it has loaded).
function sizeOf (base: string): { size?: string } {
  const b = ITEM_BY_REF('ITEM', base)?.[0]
  return b ? { size: `${b.w ?? 1}x${b.h ?? 1}` } : {}
}
// The size cut (Guy's S2 and Z1): 2x2 counts 75% of its price, 2x3 60%,
// 2x4 50%; smaller items keep all of it.
export function sizeCut (size: string | undefined): number {
  const m = /^(\d)x(\d)$/.exec(size ?? '')
  const cells = m ? Number(m[1]) * Number(m[2]) : 1
  return cells >= 8 ? 0.5 : cells >= 6 ? 0.6 : cells >= 4 ? 0.75 : 1
}
// The cut an item gets now: only with the cut on, never in an Always
// section (Guy's E1: chase and boss-only bases show whatever their size).
export function sizeCutNow (it: Pick<CurrencyItem, 'size' | 'cat'>, c: Pick<CurrencySettings, 'sizeOn' | 'catMode'>): number {
  if (!c.sizeOn || !it.size || sectionMode(c, it.cat) === 'always') return 1
  return sizeCut(it.size)
}

export function stacksFor (it: CurrencyItem, c: CurrencySettings): Array<number | null> {
  const e = c.items[it.name]
  if (e?.step != null) return [1, 2, 3, 4, 5].map(s => s === e.step ? 1 : null)
  // Its category set by hand: Off hides it unless the item itself is
  // Always; Always shows every pile at least Small.
  const mode = sectionMode(c, it.cat)
  if (mode === 'off' && e?.supply !== 1 && !e?.min) return [null, null, null, null, null]
  const cut = sizeCutNow(it, c)
  const worth = cut < 1 ? { ...it, chaos: it.chaos * cut } : it
  const out = it.type === 'gold' ? [...c.gold] as Array<number | null> : stepStarts(c, it.cat).map(at => minStack(worth, at, c.from[1]))
  const supply = e?.supply ?? (it.free || mode === 'always' ? 1 : null)
  if (supply != null) {
    const f = Math.min(supply, it.full)
    out[0] = out[0] == null ? f : Math.min(out[0], f)
  }
  // A louder step never starts below a quieter one.
  for (let i = out.length - 2; i >= 0; i--) if (out[i + 1] != null && (out[i] == null || out[i]! > out[i + 1]!)) out[i] = out[i + 1]
  // A step turned off keeps where it starts: piles that would get it hide
  // (stepOfPile with offSteps), not fall to the quieter step.
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

// Steps turned off (Guy 2026-11-28: they hide, they don't fall to the
// quieter step) for this item: never its own step or its Collecting floor.
export function offSteps (it: Pick<CurrencyItem, 'name' | 'cat'>, c: Pick<CurrencySettings, 'items' | 'offBy'> & Partial<Pick<CurrencySettings, 'catMode'>>): number[] {
  const e = c.items[it.name]
  if (e?.step != null) return []
  // A section set Always (Chase uniques, Boss drops by default) shows
  // whatever steps are turned off (Guy 2026-11-28: chase bases hid with
  // Small and Normal off).
  if (sectionMode({ catMode: c.catMode ?? {} }, it.cat) === 'always') return []
  return stepsOffIn(c, it.cat).filter(s => s >= 1 && s <= 4 && s !== e?.min)
}
// The steps off in a section: its own when it sets them, else its page's,
// else every page's (Guy 2026-11-28).
export const stepsOffIn = (c: Pick<CurrencySettings, 'offBy'>, cat: string): number[] => c.offBy?.[cat] ?? c.offBy?.[kindOf(cat)] ?? c.offBy?.all ?? []

// The step a pile of `stack` gets: Hidden when it lands on a step turned off.
export function stepOfPile (stacks: ReadonlyArray<number | null>, stack: number, off: readonly number[] = []): CStep {
  for (let s = stacks.length - 1; s >= 0; s--) if (stacks[s] != null && stack >= stacks[s]!) return off.includes(s + 1) ? 0 : (s + 1) as CStep
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
  influence: { text: [200, 160, 255], color: 'Purple', shape: 'Circle' },
  catalysts: { text: [120, 220, 230], color: 'Cyan', shape: 'Circle' },
  atlas: { text: [140, 185, 255], color: 'Blue', shape: 'Circle' },
  expedition: { text: [255, 170, 90], color: 'Orange', shape: 'Circle' },
  // Not red: red beams and map icons are kept for Tink (sure profit, Guy 2026-11-27).
  tainted: { text: [235, 95, 95], color: 'Purple', shape: 'Circle' },
  essences: { text: [230, 140, 240], color: 'Pink', shape: 'Circle' },
  fossils: { text: [220, 205, 175], color: 'Brown', shape: 'Circle' },
  oils: { text: [255, 200, 90], color: 'Orange', shape: 'Circle' },
  delirium: { text: [215, 215, 230], color: 'White', shape: 'Circle' },
  omens: { text: [150, 200, 255], color: 'Blue', shape: 'Circle' },
  tattoos: { text: [140, 220, 140], color: 'Green', shape: 'Circle' },
  ducats: { text: [255, 215, 60], color: 'Yellow', shape: 'Circle' },
  threads: { text: [240, 160, 220], color: 'Purple', shape: 'Circle' },
  splinters: { text: [180, 220, 255], color: 'Cyan', shape: 'Circle' },
  harvest: { text: [130, 230, 110], color: 'Green', shape: 'Circle' },
  embers: { text: [255, 130, 60], color: 'Orange', shape: 'Circle' },
  runegrafts: { text: [255, 120, 160], color: 'Pink', shape: 'Circle' },
  gold: { text: [255, 211, 90], color: 'Yellow', shape: 'Cross' },
  other: { text: [210, 190, 140], color: 'Grey', shape: 'Circle' }
}

// The ladder (Guy 2026-11-27, O2C: the orange the game's players know).
// Small: the category colour on black. Normal: a vivid category colour on a
// dark box of it. Decent and Big: currency black on amber and on orange, edged
// in the category colour; other classes their own fills (CLASS_FILL). Tink: red on white with the category's border and map
// icon (beam red).
// A step sets loudness only (size, sound, beam, icon size): its edits apply to
// every category. A category sets its colour and map icon.
const mixTo = (c: number[], to: number, f: number) => c.map(v => Math.round(v + (to - v) * f))
// The colour pushed 80% further from grey (Normal: "as now but more saturated").
const vivid = (c: number[]) => { const g = (c[0] + c[1] + c[2]) / 3; return c.map(v => Math.max(0, Math.min(255, Math.round(v + (v - g) * 0.8)))) }
// Each class's own Decent and Big (Guy 2026-11-28: "it all looks the same as
// currency"). Currency keeps the amber and orange boxes players know; every
// other class fills with its own colour, so a gem reads teal, a unique brown,
// a card blue, a map white and a fragment purple at a glance. Decent: dark
// text on the class colour. Big: light text on the class colour deepened,
// with a light edge. Loudness still comes from size, sound, beam and icon.
// Red stays Tink's.
type Rgb = [number, number, number]
export const CLASS_FILL: Partial<Record<LootKind, { decent: { bg: Rgb, text: Rgb }, big: { bg: Rgb, text: Rgb, edge: Rgb } }>> = {
  gems: { decent: { bg: [27, 200, 190], text: [0, 0, 0] }, big: { bg: [0, 100, 95], text: [255, 255, 255], edge: [190, 255, 250] } },
  uniques: { decent: { bg: [185, 125, 75], text: [0, 0, 0] }, big: { bg: [125, 55, 15], text: [255, 255, 255], edge: [255, 225, 190] } },
  cards: { decent: { bg: [120, 200, 255], text: [0, 0, 0] }, big: { bg: [0, 75, 190], text: [255, 255, 255], edge: [205, 235, 255] } },
  fragments: { decent: { bg: [195, 145, 255], text: [0, 0, 0] }, big: { bg: [90, 30, 150], text: [255, 255, 255], edge: [235, 215, 255] } },
  // Maps (Guy's B, 2026-11-28): black on white, edged in the kind's tint
  // (MAP_STEP below; Tink is red text on white with a red beam).
  maps: { decent: { bg: [255, 255, 255], text: [0, 0, 0] }, big: { bg: [255, 255, 255], text: [0, 0, 0], edge: [255, 255, 255] } }
}

// A category with a fill of its own, whatever its class: gold (currency
// class) reads yellow, not amber.
export const CAT_FILL: Record<string, NonNullable<typeof CLASS_FILL[LootKind]>> = {
  gold: { decent: { bg: [255, 215, 90], text: [0, 0, 0] }, big: { bg: [120, 95, 10], text: [255, 255, 255], edge: [255, 240, 190] } }
}
const fillOf = (cat: string) => CAT_FILL[cat] ?? CLASS_FILL[kindOf(cat)]
// Maps from Normal to Big: black on light grey, then on white, always edged
// in the kind's tint, so an 8-mod and an Originator map differ by border,
// beam and icon (Guy's B). Size, sound and beam make the step louder.
const MAP_STEP: Partial<Record<CStep, Rgb>> = { 2: [205, 205, 205], 3: [255, 255, 255], 4: [255, 255, 255] }

export function catColour (cat: string, c: Pick<CurrencySettings, 'cats' | 'chaseLook'>): { rgb: [number, number, number], color: string, shape: string } {
  const d = cat === 'uniqchase' ? { ...UNIQUE_LOOK.uniqchase, text: chaseLookOf(c.chaseLook).text as [number, number, number], color: chaseLookOf(c.chaseLook).color } : CAT_LOOK[cat] ?? FRAGMENT_LOOK[cat] ?? CARD_LOOK[cat] ?? UNIQUE_LOOK[cat] ?? GEM_LOOK[cat] ?? MAP_LOOK[cat] ?? JEWEL_LOOK[cat] ?? LEAGUE_LOOK[cat] ?? CAT_LOOK.other
  const own = c.cats[cat]
  return {
    rgb: own?.text ? [own.text[0], own.text[1], own.text[2]] : d.text,
    color: own?.icon?.color ?? d.color,
    shape: own?.icon?.shape ?? d.shape
  }
}

export function currencyLook (step: CStep, cat: string, c: Pick<CurrencySettings, 'steps' | 'cats' | 'chaseLook'>): StylePatch {
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
    case 3: { const f = fillOf(cat); Object.assign(out, f ? { text: col(f.decent.text), border: col(mixTo(rgb, 0, 0.55)), background: col(f.decent.bg) } : { text: col([0, 0, 0]), border: col(rgb), background: col([255, 190, 0]) }); break }
    case 4: { const f = fillOf(cat); Object.assign(out, f ? { text: col(f.big.text), border: col(c.cats[cat]?.text ? rgb : f.big.edge), background: col(f.big.bg) } : { text: col([0, 0, 0]), border: col(rgb), background: col([255, 93, 27]) }); break }
    case 5: Object.assign(out, { border: col(rgb) }); break
  }
  const mapBg = kindOf(cat) === 'maps' ? MAP_STEP[step] : undefined
  if (mapBg) Object.assign(out, { text: col([0, 0, 0]), border: col(rgb), background: col(mapBg) })
  // Tink's icon is red, in the category's shape (Guy 2026-11-27).
  out.icon = size == null ? null : { size, color: step === 5 ? 'Red' : color, shape }
  out.effect = effect ? { ...effect, color: step === 5 ? 'Red' : color } : null
  // Chase uniques (Guy 2026-11-28: "the T0 unique container", "needs a
  // special look for itself"): one look below Tink whatever the price, picked
  // from CHASE_LOOKS on the section's header, with its own sound. Your own
  // colour and icon for the section win.
  if (cat === 'uniqchase' && step < 5) {
    const l = chaseLookOf(c.chaseLook)
    const t = c.cats[cat]?.text
    Object.assign(out, {
      fontSize: own.fontSize ?? 45,
      text: col(t ?? l.text),
      border: col(t ?? l.edge),
      background: col(l.bg)
    })
    out.icon = { size: 1, color, shape }
    out.effect = { color, temp: true }
    if (own.sound === undefined) out.sound = { id: '3', volume: 250 }
  }
  return out
}

// The whole look of a pile, for the tab's previews.
export function currencyFullLook (step: CStep, cat: string, c: Pick<CurrencySettings, 'steps' | 'cats' | 'chaseLook'>): StylePatch {
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

// A step turned off hides its piles, but they keep that step's colours and
// size, quiet (no sound, beam or map icon), so holding Alt shows them
// labelled as they would be (Guy 2026-11-28). No extra rules.
function offBlock (step: CStep, conds: FilterCondition[], note: string, look: StylePatch): FilterBlock {
  const b = block(0, conds, note)
  applyStyle(b, { fontSize: readStyle(currencyActions(step)).fontSize, ...look, sound: null, effect: null, icon: null })
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

// The piles of one item that reach each step, loudest first: [step, stack,
// hidden]. A step that starts where the next louder one does never applies;
// a step turned off keeps its place in the order but hides.
export function pileSteps (stacks: ReadonlyArray<number | null>, off: readonly number[] = []): Array<[CStep, number, boolean]> {
  const out: Array<[CStep, number, boolean]> = []
  for (let s = 5; s >= 1; s--) {
    const k = stacks[s - 1]
    if (k == null) continue
    const louder = s < 5 ? stacks[s] : null
    if (louder != null && louder <= k) continue
    out.push([s as CStep, k, off.includes(s)])
  }
  return out
}

// A gem band's thresholds, from its conditions (null for other items).
function bandOfConds (it: CurrencyItem): { level: number, quality: number, corrupted: boolean, trans: boolean } | null {
  if (it.type !== 'gems' || !it.conds) return null
  const num = (key: string) => Number(it.conds!.find(x => x.key === key)?.values[0] ?? 0)
  return { level: num('GemLevel'), quality: num('Quality'), corrupted: it.conds.some(x => x.key === 'Corrupted'), trans: !it.conds.some(x => x.key === 'TransfiguredGem') }
}

// A levelling floor (levelling.ts): below maps these items show at least at
// `step` (`stack`+ one louder). `names` null: every item of the compile.
export interface LvFloor { step: CStep, conds: FilterCondition[], names: Set<string> | null, stack?: Map<string, number> }

export function compileCurrency (cfg: CurrencySettings, items: CurrencyItem[], opts: { faint?: boolean, floors?: FilterBlock[], lvl?: LvFloor[] } = {}): CurrencyCompiled {
  const blocks: FilterBlock[] = []
  const bts = (list: CurrencyItem[]) => [...new Set(list.flatMap(i => i.bts ?? [i.bt ?? i.name]))].sort()
  // An item of a whole class (charts, Sanctum research) names no BaseType.
  const btCond = (list: CurrencyItem[]): FilterCondition[] => {
    const v = bts(list)
    return v.length ? [c('BaseType', '==', v)] : []
  }
  const stacks = new Map(items.map(it => [it.name, stacksFor(it, cfg)]))
  const area = gateConds(cfg)
  // No class (gold, whose BaseType is its own): no Class condition.
  const clsCond = (list: CurrencyItem[]): FilterCondition[] => list[0]?.cls === UNIQUE_CLS
    ? [c('Rarity', '', ['Unique'])]
    : list.some(i => !i.cls) ? [] : [c('Class', '==', [...new Set(list.flatMap(i => i.cls.split('|')))].sort())]
  const steps = (it: CurrencyItem) => pileSteps(stacks.get(it.name)!, offSteps(it, cfg))
  // A gem band hidden by an Off step also matches the narrower bands of its
  // gem (Arc 1 catches Arc 21/20): a narrower band that shows gets its rule
  // again just above the Hide, so it keeps its own step.
  const rescued = new Set<string>()
  const rescue = (list: CurrencyItem[], step: CStep = 5) => {
    for (const it of list) {
      const a = bandOfConds(it)
      if (!a) continue
      for (const n of items) {
        const b = bandOfConds(n)
        if (n === it || !b || n.bt !== it.bt || rescued.has(`${it.name}|${n.name}`) || forcedHidden(n, cfg)) continue
        if (!(b.level >= a.level && b.quality >= a.quality && (b.corrupted || !a.corrupted) && b.trans === a.trans)) continue
        const top = steps(n)[0]
        // A louder one's rule is above the Hide already.
        if (!top || top[2] || top[0] > step) continue
        rescued.add(`${it.name}|${n.name}`)
        const conds = [...area, ...clsCond([n]), ...btCond([n]), ...(n.conds ?? [])]
        const look = cfg.items[n.name]?.look
        blocks.push(block(top[0], conds, `${n.name}, above ${it.name}`, { ...currencyLook(top[0], n.cat, cfg), ...look }))
      }
    }
  }
  // Items with their own look get rules of their own, first.
  const own = items.filter(it => cfg.items[it.name]?.look)
  for (const it of own) {
    for (const [s, k, hidden] of steps(it)) {
      const conds = [...area, ...clsCond([it]), ...btCond([it]), ...(it.conds ?? [])]
      if (k > 1) conds.push(c('StackSize', '>=', [k]))
      if (hidden) {
        rescue([it])
        blocks.push(offBlock(s, conds, `${it.name}, ${CSTEP_NAMES[s]} off${k > 1 ? `, ${k}+` : ''}`, { ...currencyLook(s, it.cat, cfg), ...cfg.items[it.name]!.look }))
      } else blocks.push(block(s, conds, `${it.name}, own look${k > 1 ? `, ${k}+` : ''}`, { ...currencyLook(s, it.cat, cfg), ...cfg.items[it.name]!.look }))
    }
  }
  // The rest grouped: loudest first (the first rule that matches wins, so a
  // big pile meets its louder rule before a quieter one), then by stack.
  const rest = items.filter(it => !cfg.items[it.name]?.look)
  const groups = new Map<string, { step: CStep, k: number, cat: string, hidden: boolean, list: CurrencyItem[] }>()
  for (const it of rest) {
    for (const [s, k, hidden] of steps(it)) {
      // Tink looks the same for every category: one rule for all of them.
      const cat = it.cat
      const key = `${s}|${k}|${cat}|${hidden ? 'off' : ''}|${it.conds ? JSON.stringify(it.conds) : ''}`
      const g = groups.get(key) ?? { step: s, k, cat, hidden, list: [] }
      g.list.push(it)
      groups.set(key, g)
    }
  }
  for (const g of [...groups.values()].sort((x, y) => y.step - x.step || y.k - x.k)) {
    const conds = [...area, ...clsCond(g.list), ...btCond(g.list), ...(g.list[0].conds ?? [])]
    if (g.k > 1) conds.push(c('StackSize', '>=', [g.k]))
    if (g.hidden) {
      rescue(g.list, g.step)
      blocks.push(offBlock(g.step, conds, [g.cat, `${CSTEP_NAMES[g.step]} off`, g.k > 1 ? `${g.k}+` : ''].filter(Boolean).join(', '), currencyLook(g.step, g.cat, cfg)))
    } else blocks.push(block(g.step, conds, [g.cat, g.k > 1 ? `${g.k}+` : ''].filter(Boolean).join(', '), currencyLook(g.step, g.cat, cfg)))
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
    for (const list of byConds.values()) blocks.push(block(0, [...area, ...clsCond(list), ...btCond(list), ...(list[0].conds ?? [])], 'off, set by hand'))
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
    for (const [cat, list] of byCat) blocks.push(faintBlock([...area, ...clsCond(list), ...btCond(list), ...shared(list)], cat, catColour(cat, cfg).rgb))
  } else if (items.length) blocks.push(block(0, [...area, ...clsCond(items), ...btCond(items), ...shared(items)], 'under the line'))
  for (const f of opts.lvl ?? []) lvFloor(blocks, f, items.filter(it => (!f.names || f.names.has(it.name)) && !forcedHidden(it, cfg)), cfg, clsCond, btCond)
  const chars = blocks.reduce((n, b) => n + 160 + b.conditions.reduce((m, x) => m + x.key.length + 12 + x.values.reduce((k, v) => k + v.length + 3, 0), 0), 0)
  return { blocks, items, chars }
}

// Currency a leveller needs (levelling.ts), by step.
function currencyFloors (cfg: CurrencySettings, items: CurrencyItem[]): LvFloor[] {
  const lv = lvConds(cfg)
  if (!lv) return []
  const by = new Map<CStep, LvFloor>()
  for (const it of items) {
    const x = lvCurrencyOf(cfg, it.name)
    if (!x) continue
    const f = by.get(x.step) ?? { step: x.step, conds: lv, names: new Set<string>(), stack: new Map<string, number>() }
    f.names!.add(it.name)
    if (x.stack) f.stack!.set(it.name, x.stack)
    by.set(x.step, f)
  }
  return [...by.values()].sort((a, b) => b.step - a.step)
}

// Gems while levelling: Normal before Act 4, any quality Small until maps.
function gemLvFloors (cfg: CurrencySettings): LvFloor[] {
  const early = lvConds(cfg, LV_GEMS_UNTIL)
  const all = lvConds(cfg)
  return [
    ...(early ? [{ step: 2 as CStep, conds: early, names: null }] : []),
    ...(all ? [{ step: 1 as CStep, conds: [...all, c('Quality', '>=', [1])], names: null }] : [])
  ]
}

// A floor's rules go just above the first rule that would show its items
// quieter (or hide them), so louder piles keep their own step.
function lvFloor (blocks: FilterBlock[], f: LvFloor, list: CurrencyItem[], cfg: CurrencySettings, clsCond: (l: CurrencyItem[]) => FilterCondition[], btCond: (l: CurrencyItem[]) => FilterCondition[]) {
  if (!list.length) return
  const names = new Set(list.flatMap(i => i.bts ?? [i.bt ?? i.name]))
  const touches = (b: FilterBlock) => {
    const bt = b.conditions.find(x => x.key === 'BaseType')
    return !f.names || !bt || bt.values.some(v => names.has(v))
  }
  const stepOf = (b: FilterBlock) => b.visibility === 'Hide' || b.tier === 'faint' ? 0 : Number(b.tier?.slice(1)) || 0
  const put = (step: CStep, conds: FilterCondition[], note: string, cat: string) => {
    let at = blocks.findIndex(b => stepOf(b) < step && touches(b))
    if (at < 0) at = blocks.length
    blocks.splice(at, 0, block(step, conds, `levelling: ${note}`, currencyLook(step, cat, cfg)))
  }
  const byCat = new Map<string, CurrencyItem[]>()
  for (const it of list) byCat.set(it.cat, [...(byCat.get(it.cat) ?? []), it])
  for (const [cat, group] of byCat) {
    const base = [...f.conds, ...clsCond(group), ...(f.names ? btCond(group) : [])]
    // Louder piles first, each stack size on its own.
    const sizes = new Map<number, CurrencyItem[]>()
    for (const it of group) {
      const k = f.stack?.get(it.name)
      if (k && f.step < 5) sizes.set(k, [...(sizes.get(k) ?? []), it])
    }
    for (const [k, l] of [...sizes].sort((x, y) => y[0] - x[0])) put((f.step + 1) as CStep, [...f.conds, ...clsCond(l), ...btCond(l), c('StackSize', '>=', [k])], `${cat}, ${k}+`, cat)
    put(f.step, base, cat, cat)
  }
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
  const items = all.filter(it => it.cls !== UNIQUE_CLS && it.type !== 'gems' && it.type !== 'maps' && it.type !== 'gold' && it.type !== 'jewels' && it.type !== 'league')
  const goldItems = all.filter(it => it.type === 'gold')
  const none: CurrencyCompiled = { blocks: [], items: [], chars: 0 }
  const compiled = items.length ? compileCurrency(eff, items, { faint, lvl: currencyFloors(eff, items) }) : none
  const gemsOut = gemItems.length ? compileCurrency(eff, gemItems, { faint, floors: gemFloors(eff), lvl: gemLvFloors(eff) }) : none
  // Gold on its own, so its rules (the line's too) only ever name Gold.
  const goldOut = goldItems.length ? compileCurrency(eff, goldItems, { faint }) : none
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  insertBlocks(doc, first < 0 ? doc.chunks.length : first, [...compiled.blocks, ...gemsOut.blocks, ...goldOut.blocks])
  // Recipes go where NeverSink's own socket recipes start: below Equipment
  // (rares, flasks) and NeverSink's valuable rules (influenced, top bases),
  // so a recipe never caps something worth more.
  // The 6-link one under NeverSink's top-base 6-links, above its other 6-links.
  const recipes = recipeBlocks(eff)
  const ns = doc.chunks.findIndex(ch => ch.kind === 'block' && !(ch as FilterBlock).type?.startsWith('woke->'))
  const anchor = (b?: FilterBlock) => b ? doc.chunks.indexOf(b) : ns < 0 ? doc.chunks.length : ns
  const link6 = recipes.filter(b => b.comment.endsWith(': recipe: 6-link'))
  insertBlocks(doc, anchor(doc.blocks.find(b => b.type === '6l' && b.tier === 'others') ?? doc.blocks.find(b => b.type === '6l')), link6)
  insertBlocks(doc, anchor(doc.blocks.find(b => b.type === 'socketslinks')), recipes.filter(b => !link6.includes(b)))
  const foul = applyFoulborn(doc, eff, all.filter(it => it.cat === 'uniqfoul'), faint) ?? none
  const spec = applySpecialRolls(doc, eff, all.filter(it => it.cat === 'uniqspec'), faint) ?? none
  const uniq = applyUniques(doc, eff, all.filter(it => it.cls === UNIQUE_CLS && it.cat !== 'uniqfoul' && it.cat !== 'uniqspec'), faint) ?? none
  const maps = applySpecialMaps(doc, eff, all.filter(it => it.type === 'maps'), faint) ?? none
  const jewels = applyJewels(doc, eff, all.filter(it => it.type === 'jewels'), faint) ?? none
  const league = applyLeague(doc, eff, all.filter(it => it.type === 'league'), faint) ?? none
  const parts = [{ blocks: recipes, items: [], chars: recipes.length * 220 }, compiled, gemsOut, goldOut, foul, spec, uniq, maps, jewels, league]
  return { blocks: parts.flatMap(x => x.blocks), items: parts.flatMap(x => x.items), chars: parts.reduce((n, x) => n + x.chars, 0) }
}

// Vendor recipes (Guy's pick, 2026-11-28: a Recipes fold on the Loot tab):
// each shows its items in maps at its step, or not at all (0). Kept in
// catMode as `rc<id>`: a number, so the settings that load at startup
// don't grow. R-G-B at 0 also stops NeverSink's chromatic rules in maps.
export const RECIPES = [
  { id: 'link6', name: '6-link', gives: '20 Orbs of Fusing', art: 'Orb of Fusing', dflt: 4 },
  { id: 'six', name: '6 sockets', gives: '7 Jeweller\'s Orbs', art: 'Jeweller\'s Orb', dflt: 2 },
  { id: 'gem20', name: '20% quality gems', gives: 'Gemcutter\'s Prism', art: 'Gemcutter\'s Prism', dflt: 1 },
  { id: 'flask20', name: '20% quality flasks', gives: 'Glassblower\'s Bauble', art: 'Glassblower\'s Bauble', dflt: 1 },
  { id: 'rgb', name: 'R-G-B linked', gives: 'Chromatic Orb', art: 'Chromatic Orb', dflt: 0 }
] as const
export type RecipeId = (typeof RECIPES)[number]['id']
export function recipeStep (c: Pick<CurrencySettings, 'catMode'>, id: RecipeId): CStep {
  const v = (c.catMode as Record<string, unknown>)[`rc${id}`]
  return (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 5 ? v : RECIPES.find(r => r.id === id)!.dflt) as CStep
}
export function setRecipeStep (c: Pick<CurrencySettings, 'catMode'>, id: RecipeId, step: CStep) {
  c.catMode = { ...c.catMode, [`rc${id}`]: step as unknown as SectionMode }
}

function recipeBlocks (cfg: CurrencySettings): FilterBlock[] {
  const area = gateConds(cfg)
  const gear = c('Rarity', '<=', ['Rare'])
  const conds: Partial<Record<RecipeId, FilterCondition[]>> = {
    link6: [c('LinkedSockets', '>=', [6]), gear],
    six: [c('Sockets', '>=', [6]), gear],
    flask20: [c('Quality', '>=', [20]), c('Rarity', '', ['Normal', 'Magic']), c('Class', '==', ['Life Flasks', 'Mana Flasks', 'Hybrid Flasks', 'Utility Flasks'])],
    rgb: [c('SocketGroup', '', ['RGB']), gear]
  }
  const out: FilterBlock[] = []
  for (const r of RECIPES) {
    const s = recipeStep(cfg, r.id)
    const cs = conds[r.id]
    if (s && cs) out.push(block(s, [...area, ...cs], `recipe: ${r.name}`, currencyLook(s, 'other', cfg)))
  }
  return out
}

// Gems that show at least Small whatever their band says: 20% quality (a
// Gemcutter's Prism at the vendor, Guy's G2), and the Always sections, which
// also catch gems poe.ninja doesn't list.
function gemFloors (cfg: CurrencySettings): FilterBlock[] {
  const area = gateConds(cfg)
  const cls = c('Class', '==', ['Skill Gems', 'Support Gems'])
  const q20 = c('Quality', '>=', [20])
  // Sections in gemCategoryOf's order, so a narrower one (Awakened Enlighten,
  // Awakened Multistrike) is settled before a broader one can catch it.
  const cats: Array<[string, FilterCondition]> = [
    ['gemexc', c('BaseType', '', ['Enlighten Support', 'Empower Support', 'Enhance Support'])],
    ['gemawk', c('BaseType', '', ['Awakened '])],
    ['gemtrans', c('TransfiguredGem', '', ['True'])],
    ['gemvaal', c('BaseType', '', ['Vaal '])],
    ['gemsup', c('Class', '==', ['Support Gems'])],
    ['gemskill', c('Class', '==', ['Skill Gems'])]
  ]
  // Always (Exceptional, Awakened, Transfigured) shows the section's gems
  // poe.ninja doesn't list too. Off hides its 20% gems, also unlisted ones
  // (Guy's pick); with an Always section below it, every gem of it, or that
  // section would catch them. The filter has no "not", so a section above an
  // Off or Always one settles its own 20% gems first.
  const ALWAYS = ['gemexc', 'gemawk', 'gemtrans']
  const mode = cats.map(([cat]) => sectionMode(cfg, cat) === 'off' ? 'off' : ALWAYS.includes(cat) && sectionMode(cfg, cat) === 'always' ? 'always' : '')
  const last = Math.max(mode.lastIndexOf('off'), mode.lastIndexOf('always'))
  // The 20% floor is the Gemcutter's recipe (Loot › Recipes): its step, or
  // none, and then nothing at 20% needs settling either.
  const g = recipeStep(cfg, 'gem20')
  const look = currencyLook(g, 'gemskill', cfg)
  const out: FilterBlock[] = []
  cats.slice(0, last + 1).forEach(([cat, cond], i) => {
    const all = mode.indexOf('always', i) > i
    if (mode[i] === 'always') out.push(block(1, [...area, cls, cond], `${cat}, always`, currencyLook(1, cat, cfg)))
    else if (mode[i] === 'off') { if (g || all) out.push(block(0, [...area, cls, cond, ...(all ? [] : [q20])], `${cat}, off`)) } else if (g) out.push(block(g, [...area, cls, cond, q20], `${cat}, 20% quality`, look))
  })
  if (g) out.push(block(g, [...area, cls, q20], 'gems at 20% quality', look))
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
  const out: CurrencyCompiled[] = []
  const anchor = doc.blocks.find(b => b.type === BLIGHT_TYPE)
  if (anchor) {
    const parts = MAP_KINDS.map(k => items.filter(it => it.cat === k.cat)).filter(l => l.length).map(l => compileCurrency(cfg, l, { faint }))
    insertBlocks(doc, doc.chunks.indexOf(anchor), parts.flatMap(x => x.blocks))
    out.push(...parts)
  }
  // The special map folds go above NeverSink's first map rule (its
  // Originator and influenced maps). One compile per item, so each rule, the
  // line's and Faint's too, keeps that item's own conditions and never
  // touches plain maps. Loudest first: a map that is two kinds at once (an
  // Originator map with a Mirage) gets the louder one.
  const special = items.filter(it => SPECIAL_MAP_CATS.has(it.cat))
  const first = doc.blocks.find(b => b.type?.startsWith('maps'))
  if (special.length && first) {
    // A guessed price never hides a map. Under the line it shows Small in
    // its kind's tint from the tier normal maps show from (Guy 2026-11-28:
    // they fell to NeverSink's purple and all looked alike); lower tiers
    // fall through to NeverSink's rules. Only a section or item set Off by
    // hand hides it.
    const guessed = (it: CurrencyItem) => it.est && !it.own
    const floor = cfg.mapFrom > 1 ? [c('MapTier', '>=', [Math.min(cfg.mapFrom, 17)])] : []
    const parts = special.map(it => {
      const x = compileCurrency(cfg, [it], { faint })
      if (!guessed(it) || forcedHidden(it, cfg)) return x
      const under = x.blocks.find(b => b.tier === 'faint' || b.comment.endsWith(': under the line'))
      const rest = x.blocks.filter(b => b.tier !== 'faint' && !b.comment.endsWith(': under the line'))
      if (under) rest.push(block(1, [...under.conditions, ...floor], `${it.cat}, guessed, under the line`, currencyLook(1, it.cat, cfg)))
      return { ...x, blocks: rest }
    })
    const blocks = parts.flatMap(x => x.blocks)
    const shown = blocks.filter(b => b.visibility === 'Show' && b.tier !== 'faint').sort((x, y) => Number(y.tier?.slice(1) ?? 0) - Number(x.tier?.slice(1) ?? 0))
    const rest = blocks.filter(b => !shown.includes(b))
    insertBlocks(doc, doc.chunks.indexOf(first), [...shown, ...rest])
    out.push(...parts)
  }
  if (!out.length) return null
  return { blocks: out.flatMap(x => x.blocks), items, chars: out.reduce((n, x) => n + x.chars, 0) }
}

// Jewel rows go above NeverSink's first jewel rule (its special corrupted
// ones), one compile per row so each rule keeps its own rarity and item level
// conditions. Loudest first: a corrupted 5-mod abyss jewel of item level 86
// gets the louder of its two rows. Below area level 68 NeverSink decides.
function applyJewels (doc: FilterDoc, cfg: CurrencySettings, items: CurrencyItem[], faint: boolean): CurrencyCompiled | null {
  if (!items.length) return null
  const first = doc.blocks.find(b => b.type != null && JEWEL_TYPE.test(b.type))
  if (!first) return null
  const parts = items.map(it => compileCurrency(cfg, [it], { faint }))
  const blocks = parts.flatMap(x => x.blocks)
  const shown = blocks.filter(b => b.visibility === 'Show' && b.tier !== 'faint').sort((x, y) => Number(y.tier?.slice(1) ?? 0) - Number(x.tier?.slice(1) ?? 0))
  const rest = blocks.filter(b => !shown.includes(b))
  insertBlocks(doc, doc.chunks.indexOf(first), [...shown, ...rest])
  return { blocks: [...shown, ...rest], items, chars: parts.reduce((n, x) => n + x.chars, 0) }
}

// League items go at the top with the currency: each row compiled on its own
// (they overlap: an enchanted blueprint is also item level 83+), the priced
// lists a section at a time. Loudest first.
function applyLeague (doc: FilterDoc, cfg: CurrencySettings, items: CurrencyItem[], faint: boolean): CurrencyCompiled | null {
  if (!items.length) return null
  const rows = items.filter(it => it.conds)
  const lists = new Map<string, CurrencyItem[]>()
  for (const it of items) if (!it.conds) lists.set(it.cat, [...(lists.get(it.cat) ?? []), it])
  const parts = [...rows.map(it => compileCurrency(cfg, [it], { faint })), ...[...lists.values()].map(l => compileCurrency(cfg, l, { faint }))]
  const blocks = parts.flatMap(x => x.blocks)
  const shown = blocks.filter(b => b.visibility === 'Show' && b.tier !== 'faint').sort((x, y) => Number(y.tier?.slice(1) ?? 0) - Number(x.tier?.slice(1) ?? 0))
  const rest = blocks.filter(b => !shown.includes(b))
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  insertBlocks(doc, first < 0 ? doc.chunks.length : first, [...shown, ...rest])
  return { blocks: [...shown, ...rest], items, chars: parts.reduce((n, x) => n + x.chars, 0) }
}

// Special unique rolls go just above NeverSink's own special rules, one
// compile per rule so each of its rules, the line's too, keeps that rule's
// conditions. NeverSink's rules stay below for whatever poe.ninja can't price.
function applySpecialRolls (doc: FilterDoc, cfg: CurrencySettings, items: CurrencyItem[], faint: boolean): CurrencyCompiled | null {
  if (!items.length) return null
  const anchor = doc.blocks.find(b => b.type === 'uniques' && b.tier != null && b.tier in SPECIAL_ROLLS)
  if (!anchor) return null
  const byTier = new Map<string, CurrencyItem[]>()
  for (const it of items) byTier.set(it.tier ?? '', [...(byTier.get(it.tier ?? '') ?? []), it])
  const parts = [...byTier.values()].map(l => compileCurrency(cfg, l, { faint }))
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
  const lv = lvConds(cfg)
  const compiled = compileCurrency(cfg, items, { faint, lvl: lv ? [{ step: LV_UNIQUE_STEP, conds: lv, names: null }] : [] })
  const loud = compiled.blocks.filter(b => b.visibility === 'Show' && Number(b.tier?.slice(1)) >= 3)
  const quiet = compiled.blocks.filter(b => !loud.includes(b))
  const area = gateConds(cfg)
  const specials = doc.blocks
    .filter(b => b.index > anchor.index && b.type === 'uniques' && uniqueCategoryOf(b.tier) == null && b.visibility === 'Show' && !b.disabled)
    .map(b => ({
      ...b,
      comment: `$type->${CURRENCY_TYPE} $tier->u-${b.tier} woke: currency weights, NeverSink's ${b.tier} uniques kept above the priced ones`,
      type: CURRENCY_TYPE,
      tier: `u-${b.tier}`,
      conditions: [...area, ...b.conditions.map(x => ({ ...x, values: [...x.values] }))],
      actions: b.actions.map(x => ({ ...x, args: [...x.args] })),
      dirty: true,
      added: true,
      inherited: true
    }) as FilterBlock)
  const blocks = [...loud, ...specials, ...quiet]
  insertBlocks(doc, doc.chunks.indexOf(anchor), blocks)
  return { ...compiled, blocks }
}
