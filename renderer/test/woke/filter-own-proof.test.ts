// NeverSink retirement M8 (WOKEPOET-721): proof that our own filter, with no
// NeverSink rules underneath (config.ownBase), handles each item class the
// way NeverSink 8.21 Very strict does, or better. Every base, unique, gem,
// map and stackable the game data knows, plus one item made from each of
// NeverSink's rules, goes through both filters at several area levels and
// under real prices (the day-1 table) and none at all (a fresh install);
// the full report (WOKE_PROOF_OUT) adds hostile ones (everything nearly
// worthless) and two more area levels.
//
// No item falls to the pink catch-all, whatever its class or stack size.
//
// The hard rule: a valuable item never hides. Valuable = worth 20c or more
// by the price table, or, unpriced, NeverSink gives it a sound or a beam.
// WOKE_PROOF_OUT=<file> writes the whole diff as JSON for the report.
import fs from 'fs'
import path from 'path'
import { beforeAll, describe, expect, it } from 'vitest'
import { composeFilter } from '@/web/woke/loot-filter/compose'
import type { ComposeInput } from '@/web/woke/loot-filter/compose'
import { matchItem, byBase } from '@/web/woke/loot-filter/match'
import type { MatchResult } from '@/web/woke/loot-filter/match'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { DEFAULT_BUILD_RULES } from '@/web/woke/loot-filter/build-rules'
import { defaultPresets, normalizePresets } from '@/web/woke/loot-filter/presets'
import { dropLookup, priceBreakdown, priceLookup, safetyLookup } from '@/web/woke/loot-filter/economy'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { loadOwnTables, ownTables } from '@/web/woke/loot-filter/own-lists'
import { loadBaseRanks } from '@/web/woke/loot-filter/base-ranks'
import { OWN_REST_TYPE } from '@/web/woke/loot-filter/own-base'
import { RETIRED, ownType } from '@/web/woke/loot-filter/own-rules'
import { gemLinesOf } from '@/web/woke/loot-filter/gem-classes'
import { randomDropsOnBase } from '@/web/woke/loot-filter/random-drops'
import { uniquesOnBase } from '@/web/woke/shared/uniques-on-base'
import type { PriceItem } from '@/web/woke/market/types'
import type { TipPack } from '@/web/woke/ui/tooltip/tip-content'
import { neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'
import { facts, lookOf } from '../helpers/filter-guard'
import type { Look } from '../helpers/filter-guard'
import { catalog, itemForBlock } from '../helpers/proof-items'
import type { ProofItem } from '../helpers/proof-items'

const LEVEL = '4-VERY-STRICT'
// Bases that only drop as uniques: a white one is a sampling artifact.
const UNIQUE_ONLY = new Set(['Timeless Jewel', 'Familial Contract', 'Naval Contract', 'Preventative Contract', 'Vengeful Contract', 'Vigilante Contract'])
const VALUABLE = 20

interface Day1 { items: Array<[string, string, string, number]> }
const day1 = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/web/woke/loot-filter/day1-prices.json'), 'utf8')) as Day1
const drops = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/tips/drops.json'), 'utf8')) as NonNullable<TipPack['drops']>
const priceItems: PriceItem[] = day1.items.map(([type, name, variant, chaos]) => ({ type, name, variant, chaos }))
// The best price any line of a name has (gem levels, links, variants).
const best = new Map<string, number>()
for (const i of priceItems) best.set(i.name, Math.max(best.get(i.name) ?? 0, i.chaos))

type Prices = 'real' | 'none' | 'hostile'

function pricesFor (kind: Prices): ComposeInput['prices'] {
  if (kind === 'none') return { lookup: null, safety: null, breakdown: null, loot: null }
  if (kind === 'hostile') {
    const cheap: PriceLookup = () => ({ chaos: 0.01, thin: false })
    return { lookup: cheap, safety: cheap, breakdown: () => [{ name: 'Junk', chaos: 0.01, thin: false }], loot: cheap, pricedTypes: null }
  }
  const random = randomDropsOnBase(drops)
  return {
    lookup: priceLookup(priceItems, random, 'max'),
    safety: safetyLookup(priceItems, random),
    breakdown: priceBreakdown(priceItems, uniquesOnBase),
    loot: dropLookup(priceItems, random, null, new Set(), uniquesOnBase),
    pricedTypes: new Set(priceItems.map(i => i.type))
  }
}

// What Guy's players get once M7 switches it on: Loot and Equipment on,
// everything else as shipped, the safety net on.
function ours (kind: Prices, ownBase = true, net = true, mapFrom = 1): FilterDoc {
  const p = defaultPresets()
  p.currency.on = true
  p.currency.mapFrom = mapFrom
  p.weights.on = true
  return composeFilter(neverSink(LEVEL), {
    presets: normalizePresets(p),
    rules: [],
    edits: [],
    buildRules: { ...DEFAULT_BUILD_RULES },
    build: null,
    moves: [],
    safetyNet: { on: net, minChaos: 20 },
    prices: pricesFor(kind),
    dustList: null,
    heldBack: () => false,
    stackHeld: () => false,
    gems: kind === 'real' ? gemLinesOf(priceItems) : null,
    own: ownTables.value,
    ids,
    ownBase
  } as ComposeInput).doc
}

export interface Row {
  label: string
  group: string
  area: number
  chaos: number | null
  ns: Look
  ours: Look
  // The same Loot and Equipment settings over NeverSink's file, as today.
  today: Look
  unknown: boolean
  // The item itself, in the full report only.
  facts?: ProofItem['facts']
}

const look = (m: MatchResult): Look => lookOf(m.actions, m.visibility, m.final?.block ?? null)
const loud = (l: Look) => l.shown && (l.sound || l.beam)

function walk (doc: FilterDoc, ns: FilterDoc, today: FilterDoc, sample: ProofItem[], area: number): Row[] {
  const a = byBase(doc)
  const b = byBase(ns)
  const c = byBase(today)
  return sample.map(x => {
    const mo = matchItem(a(x.facts), x.facts, { brief: true })
    const mn = matchItem(b(x.facts), x.facts, { brief: true })
    const mt = matchItem(c(x.facts), x.facts, { brief: true })
    return {
      label: x.label,
      group: x.group,
      area,
      chaos: best.get(x.priceName) ?? null,
      ns: look(mn),
      ours: look(mo),
      today: look(mt),
      unknown: mo.final?.block.type === OWN_REST_TYPE && mo.final.block.tier === 'unknown',
      ...(FULL ? { facts: x.facts } : {})
    }
  })
}

// Priced: by its price. Unpriced: NeverSink's sound or beam says so.
const valuable = (r: Row) => r.chaos != null ? r.chaos >= VALUABLE : loud(r.ns)

let nsDoc: FilterDoc
let ids: unknown = null
const rows: Record<Prices, Row[]> = { real: [], none: [], hostile: [] }
const ruleRows: Record<Prices, Row[]> = { real: [], none: [], hostile: [] }
// The whole report (WOKE_PROOF_OUT) walks more area levels and hostile prices.
const FULL = Boolean(process.env.WOKE_PROOF_OUT)
const AREAS = FULL ? [83, 70, 45, 12] : [83, 45]
const KINDS: Prices[] = FULL ? ['real', 'none', 'hostile'] : ['real', 'none']

beforeAll(async () => {
  await loadGameData()
  await loadOwnTables()
  await loadBaseRanks()
  // Identified rares' mod lists (M6), where this build has them.
  try {
    const m = await import('@/web/woke/loot-filter/id-mods')
    const { DEFAULT_SEED } = await import('@/web/woke/price-insight/drivers')
    await m.loadAffixTable()
    if (m.affixTable.value) ids = m.idGroups(m.affixTable.value, DEFAULT_SEED, defaultPresets().weights.mult)
  } catch {}
  nsDoc = parseFilter(neverSink(LEVEL))
  const samples = AREAS.map(area => ({ area, items: catalog(area, nsDoc) }))
  const nsRules = nsDoc.blocks.filter(b => !b.disabled && b.visibility !== 'Hide')
  const ruleItems: ProofItem[] = []
  for (const b of nsRules) {
    const f = itemForBlock(b)
    // No class and not gold: a base that never drops (Voidstones).
    if (!f || (!f.itemClass && f.baseType !== 'Gold')) continue
    // Only items NeverSink's own walk gives to this rule (not shadowed).
    const m = matchItem(nsDoc, f, { brief: true })
    if (m.final?.block !== b) continue
    ruleItems.push({ label: `${b.type}/${b.tier} (${f.rarity} ${f.baseType}, area ${f.areaLevel})`, group: `NeverSink rule: ${b.section.replace(/^\[\[\d+\]\]\s*/, '')}`, priceName: f.baseType ?? '', facts: f })
  }
  for (const kind of KINDS) {
    const doc = ours(kind)
    const today = ours(kind, false)
    for (const s of samples) rows[kind].push(...walk(doc, nsDoc, today, s.items, s.area))
    ruleRows[kind] = ruleItems.map(x => walk(doc, nsDoc, today, [x], x.facts.areaLevel ?? 83)[0])
  }
  const out = process.env.WOKE_PROOF_OUT
  if (out) fs.writeFileSync(out, JSON.stringify({ level: LEVEL, valuable: VALUABLE, rules: nsRules.length, ruleItems: ruleItems.length, rows, ruleRows }))
}, 600_000)

const show = (r: Row) => `${r.label} at area ${r.area}${r.chaos != null ? ` (${r.chaos}c)` : ''}: NeverSink ${r.ns.rule}, today ${r.today.rule}, own ${r.ours.rule}`

describe('our own filter against NeverSink Very strict', () => {
  it('walks a broad sample', () => {
    expect(rows.real.length).toBeGreaterThan(9_000)
    expect(ruleRows.real.length).toBeGreaterThan(400)
  })

  // What today's filter shows and is worth something still shows with no
  // NeverSink file underneath, with real prices and with none at all.
  it.each(['real', 'none'] as Prices[])('never hides a valuable item today\'s filter shows (%s prices)', kind => {
    const lost = [...rows[kind], ...ruleRows[kind]].filter(r => valuable(r) && r.today.shown && !r.ours.shown).map(show)
    expect(lost).toEqual([])
  })

  // The Loot tab's map floor hides plain maps only (reviewer, 2026-11-28).
  it('keeps unique and blighted maps under the map floor', () => {
    const doc = ours('real', true, true, 12)
    const map = (f: Partial<ProofItem['facts']>) => matchItem(doc, facts({ itemClass: 'Maps', baseType: 'Map (Tier 5)', mapTier: 5, width: 1, height: 1, ...f })).visibility
    expect(map({ rarity: 'Normal' })).toBe('Hide')
    expect(map({ rarity: 'Unique', identified: false })).toBe('Show')
    expect(map({ rarity: 'Normal', blightedMap: true })).toBe('Show')
    expect(map({ rarity: 'Normal', uberBlightedMap: true })).toBe('Show')
  })

  // Fractured jewels of any kind and over-quality life and mana flasks always
  // show (Guy 2026-11-28), even when every price says they're worthless.
  it.each(KINDS)('always shows fractured jewels and over-quality flasks (%s prices)', kind => {
    const hidden = rows[kind].filter(r => r.group === 'Over-quality and fractured' && /fractured|(Life|Mana|Hybrid) Flask/.test(r.label) && !r.ours.shown).map(show)
    expect(hidden).toEqual([])
  })

  // Guy's walk: a strict line, Small and Normal off and the jewel sections By
  // price hid a fractured rare abyss jewel and a 26% magic life flask.
  it('shows them on a strict line too', () => {
    const p = defaultPresets()
    p.currency.on = true
    p.weights.on = true
    p.currency.line = 50
    p.currency.catMode = { ...p.currency.catMode, jewabyss: 'auto', jewplain: 'auto', jewclus: 'auto' }
    // Guy's ruler: Small and Normal turned off.
    p.currency.offBy = { all: [1, 2] }
    const doc = composeFilter(neverSink(LEVEL), { presets: normalizePresets(p), rules: [], edits: [], buildRules: { ...DEFAULT_BUILD_RULES }, build: null, moves: [], safetyNet: { on: true, minChaos: 20 }, prices: pricesFor('real'), dustList: null, heldBack: () => false, stackHeld: () => false, gems: null, own: ownTables.value, ids, ownBase: true } as ComposeInput).doc
    const at = (f: Partial<ProofItem['facts']>) => matchItem(doc, facts({ areaLevel: 83, width: 1, height: 1, ...f })).visibility
    const eye = { itemClass: 'Abyss Jewels', baseType: 'Searching Eye Jewel', rarity: 'Rare' as const, identified: false, itemLevel: 85 }
    expect(at({ ...eye, fractured: true })).toBe('Show')
    expect(at({ itemClass: 'Jewels', baseType: 'Cobalt Jewel', rarity: 'Magic', identified: false, fractured: true })).toBe('Show')
    expect(at({ itemClass: 'Jewels', baseType: 'Large Cluster Jewel', rarity: 'Rare', identified: false, itemLevel: 84, fractured: true, enchantmentPassiveNum: 8 })).toBe('Show')
    expect(at({ itemClass: 'Life Flasks', baseType: 'Divine Life Flask', rarity: 'Magic', identified: false, quality: 26, itemLevel: 70, width: 1, height: 2 })).toBe('Show')
    // Guy's walk: identified, of Thawing, item level 85.
    const thawing = matchItem(doc, facts({ areaLevel: 83, itemClass: 'Life Flasks', baseType: 'Divine Life Flask', rarity: 'Magic', identified: true, quality: 26, itemLevel: 85, width: 1, height: 2, explicitModNames: ['of Thawing'] }))
    expect([thawing.visibility, thawing.final?.block.type, thawing.final?.block.tier]).toEqual(['Show', expect.anything(), expect.anything()])
  })

  // Every flask and tincture base has a rule of its own in maps, not the
  // plain catch-all (Guy's walk: a magic Aquamarine Flask, item level 84).
  it.each(['real', 'none'] as Prices[])('gives every flask and tincture base a real rule in maps (%s prices)', kind => {
    const plain = rows[kind].filter(r => r.area >= 68 && /Flasks$|^Tinctures$/.test(r.group) && r.ours.rule === `${OWN_REST_TYPE}/other`).map(show)
    expect(plain).toEqual([])
  })

  // Every real drop with real prices gets a Loot row (or a rule of its own),
  // not one of the skeleton's plain class looks (Guy's walk: Boundless
  // Realms, unpriced). Not: what no longer drops (scarabs, RETIRED), bases
  // that only drop as uniques, and the rules the skeleton owns on purpose
  // (rares the weights leave, maps with no tier).
  it('gives every real drop a Loot row of its own (real prices)', () => {
    const plain = new Set(['gold', 'wombgifts', 'currency', 'cards', 'gems', 'other', 'unknown'])
    const lists = new Map((ownTables.value?.lists ?? []).map(r => [r[0], r]))
    const gone = (name: string) => {
      const r = lists.get(name)
      return RETIRED.test(name) || (r != null && ownType(r[0], r[1], r[2]) == null)
    }
    const left = rows.real.filter(r => {
      const [type, tier] = r.ours.rule.split('/')
      if (type !== OWN_REST_TYPE || !plain.has(tier)) return false
      const name = r.label.replace(/^\d+x /, '').replace(/ \(.*\)$/, '')
      return !gone(name) && !UNIQUE_ONLY.has(name) && r.group !== 'Gold'
    }).map(show)
    expect(left).toEqual([])
  })

  // Pink is for an item no rule of ours knows. Every class the game data or
  // NeverSink's file names has one, at every stack size (Guy's walk,
  // 2026-11-28: 6 Alchemy Shards, 16 Gold, a Wombgift, an unpriced card).
  it.each(['real', 'none'] as Prices[])('has a rule of its own for every item (%s prices)', kind => {
    const pink = [...rows[kind], ...ruleRows[kind]].filter(r => r.unknown).map(show)
    expect(pink).toEqual([])
  })
})
