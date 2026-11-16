// 3.30 Wickerman module: the Viscera table, which version a copied item holds,
// the palette search, and the build script's literal reader.
import fs from 'fs'
import path from 'path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/woke/app/live-data', () => ({ dataFileUrl: (f: string) => f, onSharedDataChange: () => () => {} }))

/* eslint-disable import-x/first */
import { heldTier, otherTierText, pickPriceRow, searchViscera, tierItemName, visceraHere, visceraInZone } from '@/web/woke/wickerman/viscera'
import type { Viscera, VisceraTable } from '@/web/woke/wickerman/viscera'
import { ModifierType } from '@/parser/modifiers'
import { visceraLookup } from '@/web/woke/search/lookups/viscera'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import { readViscera } from '../../scripts/build-viscera-data.mjs'
/* eslint-enable import-x/first */

const FILE = path.resolve(__dirname, '../../public/data/league/viscera.json')
const raw = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Omit<VisceraTable, 'byName'>
const TABLE: VisceraTable = { ...raw, byName: new Map(raw.viscera.map(v => [v.name.toLowerCase(), v])) }
const get = (name: string) => TABLE.byName.get(name.toLowerCase())!

const lines = (text: string) => text.split('\n').map(l => l.trim()).filter(l => l && l !== '--------')
const label = (v: Viscera, i: number | null) => i == null ? null : v.tiers[i].label

describe('Viscera table', () => {
  beforeAll(loadGameData)

  it('has every Viscera with slots the item text uses, and no best-in-slot picks', () => {
    expect(raw.viscera.length).toBeGreaterThan(150)
    for (const v of raw.viscera) {
      expect(['Head', 'Torso', 'Upper Limb', 'Lower Limb']).toContain(v.slot)
      expect(v.tiers.length).toBeGreaterThan(0)
    }
    expect(JSON.stringify(raw)).not.toMatch(/"DPS"|"TANK"|picks/)
  })

  it('names the game knows', () => {
    const items = fs.readFileSync(path.resolve(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
      .split('\n').filter(l => l.includes('"category":"Viscera"')).map(l => (JSON.parse(l) as { name: string }).name)
    const known = items.filter(n => TABLE.byName.has(n.toLowerCase()))
    expect(known.length).toBeGreaterThan(items.length - 5)
  })
})

describe('heldTier', () => {
  beforeAll(loadGameData)

  it('reads Greater, Lesser and plain versions from the copied item', () => {
    const leg = get("Skeletal Warrior's Leg")
    const greater = fixture('items/viscera-greater-skeletal-leg.txt')
    expect(parseItem(greater).info.refName).toBe("Skeletal Warrior's Leg")
    expect(label(leg, heldTier(leg, "Greater Skeletal Warrior's Leg", lines(greater)))).toBe('High')
    const lesser = fixture('items/viscera-lesser-skeletal-leg.txt')
    expect(label(leg, heldTier(leg, "Lesser Skeletal Warrior's Leg", lines(lesser)))).toBe('Low')
  })

  it('reads an advanced copy with the roll range after the value', () => {
    const claw = get('Ghostly Claw')
    expect(label(claw, heldTier(claw, 'Ghostly Claw', lines(fixture('items/viscera-ghostly-claw.txt'))))).toBe('Med')
  })

  it('tells same-worded versions apart by their ranges', () => {
    const arm = get('Scorched Arm')
    expect(label(arm, heldTier(arm, 'Scorched Arm', ['12% chance to Ignite']))).toBe('Low')
    expect(label(arm, heldTier(arm, 'Scorched Arm', ['25% chance to Ignite']))).toBe('Med')
    expect(heldTier(arm, 'Scorched Arm', ['40% chance to Ignite'])).toBeNull()
  })

  it('takes the middle version for a plain name when two ranges overlap', () => {
    // Low is (3-4)%, Med (4-5)% on both lines: 4% fits both.
    const claw = get("King Crab's Claw")
    const four = claw.tiers[0].text.replace(/\(\d+-\d+\)/g, '4').split('\n')
    expect(label(claw, heldTier(claw, "King Crab's Claw", four))).toBe('Med')
    expect(label(claw, heldTier(claw, "Lesser King Crab's Claw", four))).toBe('Low')
  })

  it('falls back to the name word when no line fits', () => {
    const arm = get('Scorched Arm')
    expect(label(arm, heldTier(arm, 'Greater Scorched Arm', ['A line the table lacks']))).toBe('High')
    expect(heldTier(arm, 'Scorched Arm', ['A line the table lacks'])).toBeNull()
  })

  it('breaks a tie between same-text versions by the name word', () => {
    const claw = get("Crustacean's Claw")
    const line = ['11% more Maximum Physical Attack Damage']
    expect(label(claw, heldTier(claw, "Greater Crustacean's Claw", line))).toBe('High')
  })
})

describe('Viscera search', () => {
  it('finds by name, boss, zone, map and effect, names first', () => {
    expect(searchViscera(TABLE, 'scorched')[0].v.name).toBe('Scorched Arm')
    expect(searchViscera(TABLE, 'fire fury').map(h => h.v.name)).toContain('Scorched Arm')
    expect(searchViscera(TABLE, 'graveyard').map(h => h.v.name)).toContain("Skeletal Warrior's Leg")
    const ignite = searchViscera(TABLE, 'ignite', 20)
    expect(ignite.map(h => h.v.name)).toContain('Scorched Arm')
    expect(ignite.every(h => h.rank === 3)).toBe(true)
    expect(searchViscera(TABLE, 'ig')).toEqual([])
  })

  it('makes cards with every version and drop source', () => {
    const ctx = { price: () => 3, items: [], tools: new Set(), divine: null, now: 0, league: null } as unknown as LookupContext
    const [card] = visceraLookup(TABLE)('scorched arm', ctx)
    expect(card.group).toBe('Viscera')
    expect(card.sub).toBe('Upper Limb · Act 1')
    const rows = card.sections.flatMap(s => s.rows ?? [])
    expect(rows.find(r => r.label === 'High')?.value).toContain('Faster')
    expect(rows.find(r => r.label === 'Act 1')?.value).toBe('Fire Fury, The Coast')
    expect(rows.find(r => r.label === 'Slot')?.chaos).toBe(3)
    expect(visceraLookup(null)('scorched', ctx)).toEqual([])
  })
})

describe('campaign zone', () => {
  it("lists the zone's Viscera for its act only", () => {
    expect(visceraInZone(TABLE, 'The Lower Prison', 1).map(v => v.name)).toContain("Skeletal Warrior's Leg")
    expect(visceraInZone(TABLE, 'the lower prison ', 1).length).toBeGreaterThan(0)
    expect(visceraInZone(TABLE, 'The Lower Prison', 6).map(v => v.name)).not.toContain("Skeletal Warrior's Leg")
    expect(visceraInZone(TABLE, 'The Riverways', 6).length).toBe(3)
    expect(visceraInZone(TABLE, 'The Lower Prison', null)).toEqual([])
  })
})

describe('version prices', () => {
  it('names versions the way poe.ninja lists them', () => {
    const leg = get("Skeletal Warrior's Leg")
    expect([0, 1, 2].map(i => tierItemName(leg, i))).toEqual(["Lesser Skeletal Warrior's Leg", "Skeletal Warrior's Leg", "Greater Skeletal Warrior's Leg"])
    expect(tierItemName(get("Maven's Orrery"), 1)).toBe("Maven's Orrery")
  })

  it("picks the row whose effect reads like the version's", () => {
    const rows = [
      { variant: '#% chance to gain an Endurance Charge on Hit', chaos: 1 },
      { variant: '#% chance to gain a Power Charge on Hit', chaos: 9 }
    ]
    expect(pickPriceRow(rows, '(2-3)% chance to gain a Power Charge on Hit')?.chaos).toBe(9)
    expect(pickPriceRow(rows, 'Something else')).toBeNull()
    const one: Array<{ variant?: string, chaos: number }> = [{ chaos: 4 }]
    expect(pickPriceRow(one, 'anything')?.chaos).toBe(4)
    expect(pickPriceRow([], 'anything')).toBeNull()
  })
})

describe('zone you stand in', () => {
  it('finds a map boss by the map name the log gives', () => {
    const here = visceraHere(TABLE, 'Graveyard', null)
    expect(here.map(h => h.v.name)).toContain("Skeletal Warrior's Leg")
    expect(here.find(h => h.v.name === "Skeletal Warrior's Leg")?.boss).toBe('Champion of Frost')
  })

  it('finds a campaign boss by act and zone, not a map of that name', () => {
    expect(visceraHere(TABLE, 'The Lower Prison', 1).map(h => h.boss)).toContain('Chatters')
    expect(visceraHere(TABLE, 'Graveyard', 1)).toEqual([])
  })

  it('finds unique maps by the name the log gives', () => {
    expect(visceraHere(TABLE, 'Mao Kun', null).length).toBeGreaterThan(0)
    expect(visceraHere(TABLE, 'Hallowed Ground', null).length).toBeGreaterThan(0)
  })

  it('finds pinnacle arenas', () => {
    expect(visceraHere(TABLE, "The Maven's Crucible", null).map(h => h.v.name)).toContain("Maven's Orrery")
  })

  it('finds nothing in a zone without a Viscera boss', () => {
    expect(visceraHere(TABLE, 'Tower', null)).toEqual([])
    expect(visceraHere(TABLE, '', null)).toEqual([])
  })
})

describe('build script', () => {
  it('reads the literals without running them', () => {
    const src = 'x=1,function(){const i=(s,x,g)=>[["Low",s],["Med",x],["High",g]],k=[];function t(){}const h="Zone not confirmed",w="Nightmare";' +
      't("Test Arm","Arm","fire",i("(1-2)% a","(3-4)% a",`b\nc`),[2,"Boss",h,!1],[["Map Boss","Strand"],["N","Abyss",w,!1]]),' +
      't("Test Head","Head","chaos",[["Fixed","+1 to x","minion"]],null,[]),window.VISCERA=k}()'
    const out = readViscera(src)
    expect(out).toEqual([
      {
        name: 'Test Arm',
        slot: 'Upper Limb',
        cat: 'fire',
        tiers: [{ label: 'Low', text: '(1-2)% a' }, { label: 'Med', text: '(3-4)% a' }, { label: 'High', text: 'b\nc' }],
        act: { n: 2, boss: 'Boss', unsure: true },
        maps: [{ boss: 'Map Boss', map: 'Strand', kind: 'Map boss' }, { boss: 'N', map: 'Abyss', kind: 'Nightmare', unsure: true }]
      },
      { name: 'Test Head', slot: 'Head', cat: 'chaos', tiers: [{ label: 'Fixed', text: '+1 to x', cat: 'minion' }], maps: [] }
    ])
  })

  it('refuses code it does not know', () => {
    const src = 'function(){const i=(s,x,g)=>0,k=[];const h=alert(1);t("A","Arm","x",[],null,[]),window.VISCERA=k}()'
    expect(() => readViscera(src)).toThrow(/Unknown call alert/)
  })

  it('decodes unicode escapes', () => {
    const src = 'function(){const i=(s,x,g)=>0,k=[];const h=1;t("Caf\\u00e9 Arm","Arm","x",[],null,[]),window.VISCERA=k}()'
    expect(readViscera(src)[0].name).toBe('Café Arm')
  })
})

// A click on a version in the price check prices that version: the item text
// is rewritten to hold it, then parsed like any copy.
describe('Viscera: price another version', () => {
  beforeAll(loadGameData)

  const CORE = () => fixture('items/viscera-molten-core.txt')
  const implicit = (text: string) => {
    const item = parseItem(text)
    expect(item.info.refName).toBe('Molten Core')
    expect(item.unknownModifiers).toEqual([])
    return item.statsByType.find(s => s.type === ModifierType.Implicit)!
  }

  it("swaps Guy's Molten Core to the other versions", () => {
    const v = get('Molten Core')
    const held = heldTier(v, 'Molten Core', lines(CORE()))
    expect(label(v, held)).toBe('Med')

    const low = otherTierText(v, CORE(), held!, v.tiers.findIndex(t => t.label === 'Low'))!
    expect(low).toContain('Lesser Molten Core')
    expect(low).toContain('+14(14-18)% to Fire Resistance')
    expect(implicit(low).stat.ref).toBe('+#% to Fire Resistance')
    expect(implicit(low).sources[0].contributes?.value).toBe(14)
    expect(label(v, heldTier(v, 'Lesser Molten Core', lines(low)))).toBe('Low')

    const high = otherTierText(v, CORE(), held!, v.tiers.findIndex(t => t.label === 'High'))!
    expect(high).toContain('Greater Molten Core')
    expect(high).not.toContain('to Fire Resistance\n')
    expect(implicit(high).stat.ref).toBe('+#% to maximum Fire Resistance')
    expect(label(v, heldTier(v, 'Greater Molten Core', lines(high)))).toBe('High')
  })

  it('writes a plain copy without ranges', () => {
    const v = get("Skeletal Warrior's Leg")
    const text = fixture('items/viscera-lesser-skeletal-leg.txt')
    const held = heldTier(v, "Lesser Skeletal Warrior's Leg", lines(text))!
    const med = v.tiers.findIndex(t => t.label === 'Med')
    const out = otherTierText(v, text, held, med)!
    expect(out).toContain(`\n${v.name}\n`)
    expect(out).not.toMatch(/\d\(/)
    expect(label(v, heldTier(v, v.name, lines(out)))).toBe('Med')
  })

  it("gives up when the item's lines don't show its version", () => {
    const v = get('Molten Core')
    expect(otherTierText(v, CORE().replace('Fire', 'Cold'), 1, 2)).toBeNull()
  })
})
