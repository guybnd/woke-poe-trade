// Economy modules: poe.ninja parsing and movers, trade listing insight,
// essence corruption, boss run profit and league-start investments.
import { describe, it, expect } from 'vitest'
import { agoPhrase, nowMinute } from '@/web/woke/ui/format'
import fs from 'fs'
import path from 'path'
import { FIXTURES } from '../helpers/game-data'
import { parseDenseChunks, findDivinePrice } from '@/web/woke/market/parse'
import { computeMovers, trendBaseline } from '@/web/woke/market/analysis'
import { CATEGORY_TYPES, uniqueItems } from '@/web/woke/market/types'
import type { PriceItem } from '@/web/woke/market/types'
import { buildInsight } from '@/web/woke/price-insight/insight'
import type { InsightListing } from '@/web/woke/price-insight/insight'
import { parseMonolith, rateMonolith, MEDS, ALL_ESSENCES } from '@/web/woke/essence-scan/essences'
import { BOSSES } from '@/web/woke/boss-runs/bosses'
import { evaluateBoss, priceResolver, observedRates, parseRunTime, formatRunTime } from '@/web/woke/boss-runs/calc'
import type { BossPrefs } from '@/web/woke/boss-runs/calc'
import { DumpImporter, importLeagues } from '@/web/woke/league-invest/dumps'
import type { LeagueHistory } from '@/web/woke/league-invest/dumps'
import { MECHANICS, expeditionRows, mechanicById, priceGroup, verdict, weekChange } from '@/web/woke/mechanics/data'
import { REWARDS, priceReward } from '@/web/woke/mechanics/betrayal'
import { MECHANIC_ICONS } from '@/web/woke/ui/game-icons'
import { mechanicOf } from '@/web/woke/atlas/tree'
import type { AtlasNode } from '@/web/woke/atlas/tree'
import { rankOpportunities } from '@/web/woke/league-invest/invest'

describe('poe.ninja', () => {
  // The recorded dense overview the fake app serves (tools/make-ninja-fixture.mjs).
  const dense = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'http/poe.ninja/poe1/api/economy/current/dense/overviews.json'), 'utf8'))

  const URL_OF = Object.fromEntries(Object.entries(CATEGORY_TYPES).map(([url, type]) => [type, url]))

  it('parses the dense overview the way APT stores it', () => {
    const chunks = (dense.currencyOverviews ?? []).concat(dense.itemOverviews ?? []).map((o: { type: string, lines: unknown[] }) => ({
      ns: 'ITEM', url: URL_OF[o.type], lines: JSON.stringify(o.lines)
    }))
    const items = parseDenseChunks(chunks)
    expect(items.length).toBeGreaterThan(10)
    expect(findDivinePrice(items)).toBe(180)
    const misery = items.find(i => i.name === 'Deafening Essence of Misery')
    expect(misery?.type).toBe('Essence')
  })

  it('movers: biggest moves first, a divine swing is not a move in div', () => {
    const then: PriceItem[] = [
      { type: 'Currency', name: 'Divine Orb', variant: '', chaos: 150 },
      { type: 'Scarab', name: 'Up Scarab', variant: '', chaos: 10 },
      { type: 'Scarab', name: 'Flat Scarab', variant: '', chaos: 20 },
      { type: 'Scarab', name: 'Down Scarab', variant: '', chaos: 40 }
    ]
    const now: PriceItem[] = [
      { type: 'Currency', name: 'Divine Orb', variant: '', chaos: 300 },
      { type: 'Scarab', name: 'Up Scarab', variant: '', chaos: 30 },
      { type: 'Scarab', name: 'Flat Scarab', variant: '', chaos: 40 },
      { type: 'Scarab', name: 'Down Scarab', variant: '', chaos: 20 }
    ]
    const chaos = computeMovers(now, then, { minChaos: 1, limit: 10 })
    expect(chaos[0].name).toBe('Up Scarab')
    expect(chaos[0].change).toBeCloseTo(2)
    const div = computeMovers(now, then, { minChaos: 1, limit: 10, unit: 'div', divNow: 300, divThen: 150, type: 'Scarab' })
    expect(div.find(m => m.name === 'Flat Scarab')?.change).toBeCloseTo(0)
    expect(div.find(m => m.name === 'Down Scarab')?.change).toBeCloseTo(-0.75)
  })
})

describe('market movers from poe.ninja trend', () => {
  it('applies the price floor to the price now', () => {
    const row = (name: string, chaos: number) => ({ type: 'Scarab', name, variant: '', chaos })
    const now = [row('Stays high', 600), row('Fell below', 394), row('Cheap jump', 39)]
    const then = [row('Stays high', 500), row('Fell below', 1115), row('Cheap jump', 6.5)]
    expect(computeMovers(now, then, { minChaos: 500, limit: 10 }).map(m => m.name)).toEqual(['Stays high'])
  })

  it('keeps one row per item from a snapshot saved with doubled rows', () => {
    const row = { type: 'Fragment', name: 'Fragment of the Chimera', variant: '', chaos: 39 }
    const other = { ...row, name: 'Fragment of the Minotaur' }
    expect(uniqueItems([row, other, { ...row }])).toEqual([row, other])
  })

  it('measures moves in divines when local history does not reach back', () => {
    const item = (type: string, name: string, chaos: number, d1: number) => ({ type, name, variant: '', chaos, d1 })
    const now = [item('Currency', 'Divine Orb', 300, 150), item('Scarab', 'Flat Scarab', 200, 100)]
    const { then, divThen } = trendBaseline(now, '24h')
    expect(divThen).toBe(150)
    const movers = computeMovers(now, then, { minChaos: 1, limit: 10, unit: 'div', divNow: 300, divThen, type: 'Scarab' })
    // Doubled in chaos, flat in divines.
    expect(movers[0].change).toBeCloseTo(0, 5)
  })
})

describe('price insight (trade listings)', () => {
  const NOW = Date.parse('2026-11-04T12:00:00Z')
  const listing = (id: string, amount: number, extra: Partial<InsightListing> = {}): InsightListing => ({
    id, accountName: `seller-${id}`, priceAmount: amount, priceCurrency: 'chaos', accountStatus: 'online', indexedAt: '2026-11-04T10:00:00Z', isMine: false, hasFee: false, ...extra
  } as InsightListing)

  it('drops bait, own and stale listings and suggests a price', () => {
    const insight = buildInsight([
      listing('bait', 5),
      listing('mine', 40, { isMine: true }),
      listing('old', 41, { accountStatus: 'offline', indexedAt: '2026-10-01T00:00:00Z' }),
      ...[50, 52, 55, 55, 58, 60, 62, 70].map((p, i) => listing(`l${i}`, p)),
      listing('div', 1, { priceCurrency: 'divine' })
    ], { divine: 180, now: NOW })
    expect(insight.dropped.get('bait')).toBe('fixer')
    expect(insight.dropped.get('mine')).toBe('mine')
    expect(insight.dropped.get('old')).toBe('stale')
    expect(insight.range?.low).toBe(50)
    expect(insight.confidence).toBe('high')
    expect(insight.suggest!.fast).toBeLessThan(50)
    expect(insight.kept.at(-1)?.chaos).toBe(180)
  })

  it('no divine price: divine listings are dropped, not guessed', () => {
    const insight = buildInsight([listing('d', 2, { priceCurrency: 'divine' })], { divine: undefined, now: NOW })
    expect(insight.dropped.get('d')).toBe('currency')
    expect(insight.confidence).toBe('none')
  })
})

describe('essence corruption', () => {
  const PRICES: Record<string, number> = {
    'Deafening Essence of Misery': 6, 'Deafening Essence of Envy': 4, 'Shrieking Essence of Greed': 0.5,
    'Essence of Horror': 45, 'Essence of Hysteria': 20, 'Essence of Insanity': 25, 'Essence of Delirium': 30
  }
  const price = (name: string) => PRICES[name] ?? null

  it('a monolith with Misery/Envy says corrupt, one without says open', () => {
    const meds = parseMonolith(['Deafening Essence of Misery', 'Shrieking Essence of Greed', 'Deafening Essence of Envy'])!
    expect(rateMonolith(meds, MEDS, price).verdict).toBe('corrupt')
    const plain = parseMonolith(['Shrieking Essence of Greed'])!
    expect(rateMonolith(plain, MEDS, price).verdict).not.toBe('corrupt')
  })

  it('knows only essences that exist', () => {
    // Every essence the game has (APT's item data), and nothing else.
    const items = fs.readFileSync(path.join(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
    const real = new Set([...items.matchAll(/"name":"((?:\w+ )?Essence of \w+)"/g)].map(m => m[1]))
    expect(ALL_ESSENCES.map(e => e.name).filter(n => !real.has(n))).toEqual([])
    expect(ALL_ESSENCES).toHaveLength(104)
    // A misread tier can't land on a name no monolith holds.
    expect(parseMonolith(['Wailing Essence of Misery'])?.essences[0]?.name).not.toBe('Wailing Essence of Misery')
  })

  it('reads OCR-ish lines', () => {
    expect(parseMonolith(['Deafenlng Essence of Misery', 'Shrieking Essence 0f Greed'])?.essences.map(e => e.name))
      .toEqual(['Deafening Essence of Misery', 'Shrieking Essence of Greed'])
  })
})

describe('league mechanics', () => {
  // APT's item data: what the game has now (Breach splinters and Incubators
  // are gone).
  const names = new Set([...fs.readFileSync(path.join(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
    .matchAll(/"name":"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse(`"${m[1]}"`) as string))

  it('prices only items that exist', () => {
    const empty: string[] = []
    for (const m of MECHANICS) {
      for (const g of m.groups) {
        if (g.types?.includes('Incubator')) empty.push(`${m.id}: ${g.label}`)
        // 3.30's Wickerman trophies reach the item data with the launch-day
        // trade-site patch (WOKEPOET-154); drop this once they're in.
        if (m.id === 'covens' && ![...names].some(n => n === "Sirus' Head")) continue
        if (g.match && ![...names].some(n => g.match!.test(n))) empty.push(`${m.id}: ${g.label}`)
      }
    }
    expect(empty).toEqual([])
  })

  it('safehouse scarab rewards name scarabs that exist', () => {
    const scarabs = [...names].filter(n => / Scarab\b/.test(n))
    const missing = Object.values(REWARDS).flat()
      .map(r => /^(.+) Scarabs$/.exec(r)?.[1])
      .filter((family): family is string => !!family && !scarabs.some(n => n.startsWith(`${family} Scarab`)))
    expect(missing).toEqual([])
  })

  it('prices a replica unique as it drops, not its 6-link listing', () => {
    const heist = mechanicById('heist')!.groups[0]
    const rows = priceGroup(heist, [
      { type: 'UniqueArmour', name: 'Replica Robe', variant: 'Vaal Regalia, 6L', chaos: 900 },
      { type: 'UniqueArmour', name: 'Replica Robe', variant: 'Vaal Regalia', chaos: 40 },
      { type: 'UniqueArmour', name: 'Replica Mail', variant: 'Astral Plate, 6L', chaos: 300 }
    ])
    expect(rows.map(r => [r.item.name, r.chaos])).toEqual([['Replica Mail', 300], ['Replica Robe', 40]])
  })

  // poe.ninja's own list, as the live feed sends it (Allflame, 2026-11-05).
  const artifacts: PriceItem[] = [
    { type: 'Artifact', name: 'Burial Medallion', variant: '', chaos: 1, d7: 2.8 },
    { type: 'Artifact', name: 'Astragali', variant: '', chaos: 0.07 },
    { type: 'Artifact', name: 'Exotic Coinage', variant: '', chaos: 7.2, d7: 4 },
    { type: 'Artifact', name: 'Scrap Metal', variant: '', chaos: 2.94 },
    { type: 'Currency', name: 'Exotic Coinage', variant: '', chaos: 999 }
  ]

  it('finds the Expedition currencies under poe.ninja\'s Artifact type, with their vendors', () => {
    expect(expeditionRows(artifacts).map(r => [r.item.name, r.tag, r.chaos])).toEqual([
      ['Exotic Coinage', 'Tujen', 7.2],
      ['Scrap Metal', 'Rog', 2.94],
      ['Burial Medallion', 'Dannig', 1],
      ['Astragali', 'Gwennen', 0.07]
    ])
    for (const r of expeditionRows(artifacts)) expect(names.has(r.item.name)).toBe(true)
  })

  it('makes no best call on Expedition prices, which are per unit', () => {
    expect(verdict(mechanicById('expedition')!, artifacts)).toBeNull()
    expect(verdict(mechanicById('harvest')!, [{ type: 'Currency', name: 'Sacred Crystallised Lifeforce', variant: '', chaos: 380 }])?.best.item.name)
      .toBe('Sacred Crystallised Lifeforce')
  })

  it('shows the week\'s change only when the trend is known', () => {
    const [coinage, scrap] = expeditionRows(artifacts)
    expect(weekChange(coinage)).toBeCloseTo(0.8)
    expect(weekChange(scrap)).toBeNull()
  })

  it('prices the Betrayal Expedition reward from the same list', () => {
    expect(priceReward('Expedition currency', artifacts).chaos).toBeCloseTo(1.97)
    expect(priceReward('Expedition currency', artifacts).count).toBe(4)
  })

  it('mechanic icons show items that exist', () => {
    const missing = Object.entries(MECHANIC_ICONS).filter(([, i]) => i.item && !names.has(i.item)).map(([id]) => id)
    expect(missing).toEqual([])
  })
})

describe('atlas tree', () => {
  const notable = (name: string, stats: string[]): AtlasNode => ({ id: 1, name, stats, kind: 'notable' })

  it('groups notables by mechanic, whoever the stat names', () => {
    // Real atlas notables (GGG's atlastree-export).
    expect(mechanicOf(notable('Mighty Hunter', ['Einhar has 100% increased Cooldown Recovery Rate in your Maps']))).toBe('Bestiary')
    expect(mechanicOf(notable('Frantic Mining', ['Your Maps have +20% chance to contain Niko', 'Scarabs dropped in your Maps have 20% increased chance to be Sulphite Scarabs']))).toBe('Delve')
    expect(mechanicOf(notable('Sulphite Infusion', ['Your White Tier Maps grant 400 additional Voltaxic Sulphite on Completion']))).toBe('Delve')
    expect(mechanicOf(notable('Etched by Acid', ['Your Maps have 10% chance to award double progress towards encountering The Eater of Worlds']))).toBe('Eldritch')
  })
})

describe('boss runs', () => {
  const NO_PREFS: BossPrefs = {
    runSeconds: {}, rates: {}, extraDrops: {}, kills: {}, ownEntry: false, plannedRuns: 0,
    dropToggles: {}, priceModes: {}, customPrices: {}
  }

  it('boss data is sane', () => {
    expect(BOSSES.length).toBeGreaterThan(5)
    for (const b of BOSSES) {
      // Settlers bosses: no entry item known.
      if (!['sasan', 'lazeth', 'black-knight'].includes(b.id)) expect(b.entry.length, b.id).toBeGreaterThan(0)
      expect(b.runSeconds, b.id).toBeGreaterThan(0)
      for (const d of b.drops) if (d.chance != null) expect(d.chance, `${b.id} ${d.name}`).toBeGreaterThan(0)
      for (const d of b.drops) if (d.chance != null) expect(d.chance, `${b.id} ${d.name}`).toBeLessThanOrEqual(1)
    }
  })

  it('profit per hour = (expected loot - entry) per run time', () => {
    const boss = BOSSES.find(b => b.drops.some(d => d.chance != null))!
    const items: PriceItem[] = [
      ...boss.entry.map(e => ({ type: 'Fragment', name: e.name, variant: '', chaos: 10 })),
      ...boss.drops.map(d => ({ type: 'UniqueAccessory', name: d.name, variant: d.variant ?? '', chaos: 100 }))
    ]
    const r = evaluateBoss(boss, NO_PREFS, priceResolver(items))
    const entry = boss.entry.reduce((n, e) => n + 10 * e.qty, 0)
    expect(r.entry).toBe(entry)
    expect(r.entryMissing).toEqual([])
    expect(r.profit).toBeCloseTo(r.loot - entry)
    expect(r.perHour).toBeCloseTo(r.profit * 3600 / boss.runSeconds)
    // Bringing your own entry: entry costs nothing.
    expect(evaluateBoss(boss, { ...NO_PREFS, ownEntry: true }, priceResolver(items)).entry).toBe(0)
  })

  it('own kill log gives drop rates', () => {
    const rates = observedRates([{ ts: 1, drops: [{ name: 'A', qty: 1 }] }, { ts: 2, drops: [] }, { ts: 3, drops: [{ name: 'A', qty: 1 }, { name: 'B', qty: 1 }] }, { ts: 4, drops: [] }])
    expect(rates.get('A')).toBeCloseTo(0.5)
    expect(rates.get('B')).toBeCloseTo(0.25)
  })

  it('run time text', () => {
    expect(parseRunTime('2:30')).toBe(150)
    expect(parseRunTime('90s')).toBe(90)
    expect(parseRunTime('1.5')).toBe(90) // minutes
    expect(formatRunTime(150)).toBe('2:30')
  })
})

describe('league-start investments', () => {
  // Two past leagues of poe.ninja dump CSVs: one scarab triples in a week
  // both times, a card stays flat.
  function dumps (league: string) {
    const date = (d: number) => new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10)
    const cur = ['League;Date;Get;Pay;Value;Confidence']
    const items = ['League;Date;Id;Type;Name;BaseType;Variant;Links;Value;Confidence']
    for (let d = 0; d <= 14; d++) {
      cur.push(`${league};${date(d)};Divine Orb;Chaos Orb;${100 + d * 5};High`)
      items.push(`${league};${date(d)};1;Scarab;Rising Scarab;;;;${(5 * Math.pow(3, Math.min(d, 7) / 7) * (100 + d * 5) / 100).toFixed(2)};High`)
      items.push(`${league};${date(d)};2;DivinationCard;Flat Card;;;;${(20 * (100 + d * 5) / 100).toFixed(2)};High`)
    }
    return [cur.join('\n'), items.join('\n')]
  }

  it('ranks the item that rose in every league, in divines', () => {
    const imp = new DumpImporter()
    for (const league of ['Alpha', 'Beta']) for (const csv of dumps(league)) imp.addCsv(csv)
    const histories = imp.leagues().map(l => imp.build(l))
    const ranked = rankOpportunities(histories, {
      day: 0, horizon: 7, minLeagues: 2, minMultiple: 1.5, minReliability: 0, minBuyChaos: 1, bulkOnly: false
    })
    expect(ranked.map(o => o.name)).toEqual(['Rising Scarab'])
    expect(ranked[0].median).toBeCloseTo(3, 1)
    expect(ranked[0].leagues.sort()).toEqual(['Alpha', 'Beta'])
  })

  it('a league that cannot be built does not stop the others', async () => {
    const imp = new DumpImporter()
    for (const csv of dumps('Alpha')) imp.addCsv(csv)
    imp.addCsv(dumps('NoCurrency')[1])
    for (const csv of dumps('Omega')) imp.addCsv(csv)
    const saved: LeagueHistory[] = []
    const res = await importLeagues(imp, async (h) => { saved.push(h) })
    expect(saved.map(h => h.league)).toEqual(['Alpha', 'Omega'])
    expect(res.imported).toEqual(['Alpha', 'Omega'])
    expect(res.failed).toEqual([expect.stringContaining('NoCurrency')])
  })

  it('refuses a file that is not a poe.ninja dump', () => {
    expect(() => new DumpImporter().addCsv('a;b;c\n1;2;3')).toThrow(/poe.ninja dump/)
  })
})

describe('data age', () => {
  it('reads as a sentence: "just now", "4m ago"', () => {
    nowMinute.value = Date.UTC(2026, 10, 4, 12, 0)
    expect(agoPhrase(nowMinute.value - 10_000)).toBe('just now')
    expect(agoPhrase(nowMinute.value - 4 * 60_000)).toBe('4m ago')
    expect(agoPhrase(null)).toBe('')
  })
})
