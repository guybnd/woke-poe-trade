// Levelling (levelling.ts, Guy's picks 2026-11-28): the Loot tab's rules
// apply everywhere by default, the hideout (area level 60) too, and below
// maps a leveller's supplies, gems and uniques never hide by price.
import { beforeAll, describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, defaultCurrency } from '@/web/woke/loot-filter/currency-weights'
import type { CurrencySettings } from '@/web/woke/loot-filter/currency-weights'
import { gateConds, isLvDefault, lvAdded, lvConds, lvCurrencyOf, lvGate, lvOn, setLvCurrency, setLvGate, setLvOn } from '@/web/woke/loot-filter/levelling'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { DEF_ALL, DEF_AR, DEF_ES, DEF_EV, LV_GEAR_TYPE, levellingGearBlocks, lvDefences, setLvDefences } from '@/web/woke/loot-filter/levelling-gear'
import type { Presets } from '@/web/woke/loot-filter/presets'

const SEMI = neverSink('2-SEMI-STRICT')
const PRICES: Record<string, number> = {
  'Divine Orb': 160,
  'Chaos Orb': 1,
  'Orb of Alchemy': 0.3,
  'Orb of Transmutation': 0.05,
  'Scroll of Wisdom': 0.02,
  'Portal Scroll': 0.02,
  'Orb of Augmentation': 0.03,
  'Orb of Scouring': 0.4,
  'Simple Robe': 0.05,
  'Leather Belt': 9000
}
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null
const on = (f?: (c: CurrencySettings) => void): CurrencySettings => {
  const c = defaultCurrency()
  c.on = true
  c.line = 1
  f?.(c)
  return c
}
const pile = (name: string, stackSize: number, areaLevel: number): ItemFacts => ({
  name, baseType: name, itemClass: 'Stackable Currency', stackSize, areaLevel, influences: [], explicitModNames: []
})
const unique = (baseType: string, areaLevel: number): ItemFacts => ({
  name: baseType, baseType, itemClass: 'Body Armours', rarity: 'Unique', areaLevel, influences: [], explicitModNames: []
} as ItemFacts)
const step = (doc: ReturnType<typeof parseFilter>, f: ItemFacts) => {
  const m = matchItem(doc, f)
  return m.visibility === 'Hide' ? 0 : Number(m.final?.block.tier?.slice(1)) || 0
}

describe('levelling', () => {
  it('reads the gate and the layer switch from catMode, everywhere and on by default', () => {
    const c = defaultCurrency()
    expect(lvGate(c)).toBe(2)
    expect(lvOn(c)).toBe(true)
    expect(gateConds(c)).toEqual([])
    expect(lvConds(c)?.map(x => `${x.key} ${x.op} ${x.values[0]}`)).toEqual(['AreaLevel <= 67'])
    setLvGate(c, 1)
    expect(gateConds(c).map(x => `${x.op} ${x.values[0]}`)).toEqual(['>= 60'])
    expect(lvConds(c)?.map(x => `${x.op} ${x.values[0]}`)).toEqual(['>= 60', '<= 67'])
    // Before Act 4 is under the hideout: nothing there with this gate.
    expect(lvConds(c, 33)).toBeNull()
    setLvGate(c, 0)
    expect(gateConds(c).map(x => `${x.op} ${x.values[0]}`)).toEqual(['>= 68'])
    expect(lvConds(c)).toBeNull()
    setLvGate(c, 2)
    setLvOn(c, false)
    expect(lvConds(c)).toBeNull()
  })

  it('a currency item can be added to the floor or taken off it', () => {
    const c = defaultCurrency()
    expect(lvCurrencyOf(c, 'Scroll of Wisdom')).toMatchObject({ step: 2 })
    expect(lvCurrencyOf(c, 'Weeping Essence of Greed')).toMatchObject({ step: 2 })
    expect(lvCurrencyOf(c, 'Orb of Scouring')).toBeNull()
    setLvCurrency(c, 'Orb of Scouring', true)
    setLvCurrency(c, 'Scroll of Wisdom', false)
    expect(lvCurrencyOf(c, 'Orb of Scouring')).toMatchObject({ step: 2 })
    expect(lvCurrencyOf(c, 'Scroll of Wisdom')).toBeNull()
    expect(lvAdded(c)).toEqual(['Orb of Scouring'])
    // Back to the list's own choice: the key goes.
    setLvCurrency(c, 'Scroll of Wisdom', true)
    expect(Object.keys(c.catMode)).toEqual(['lv:Orb of Scouring'])
    expect(isLvDefault('Portal Scroll')).toBe(true)
  })

  it('keeps a leveller\'s supplies visible below maps, the hideout too, and hides them by price in maps', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    for (const name of ['Scroll of Wisdom', 'Portal Scroll', 'Orb of Transmutation', 'Orb of Augmentation']) {
      expect(matchItem(doc, pile(name, 1, 83)).visibility, `${name} in maps`).toBe('Hide')
      for (const area of [2, 40, 60, 67]) {
        expect(matchItem(doc, pile(name, 1, area)).final?.block.type, `${name} at ${area}`).toBe(CURRENCY_TYPE)
        expect(step(doc, pile(name, 1, area)), `${name} at ${area}`).toBe(2)
      }
    }
    // A pile of orbs one step louder; wisdom stays Normal.
    expect(step(doc, pile('Orb of Transmutation', 3, 20))).toBe(3)
    expect(step(doc, pile('Scroll of Wisdom', 10, 20))).toBe(2)
    // Worth more than the floor: its own step.
    expect(step(doc, pile('Divine Orb', 1, 20))).toBe(step(doc, pile('Divine Orb', 1, 83)))
    expect(step(doc, pile('Divine Orb', 1, 20))).toBeGreaterThan(2)
    // Not on the list: the price decides, levelling too.
    expect(matchItem(doc, pile('Orb of Scouring', 1, 20)).visibility).toBe('Hide')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('an item taken off the floor hides by price while levelling; one added shows', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { setLvCurrency(c, 'Scroll of Wisdom', false); setLvCurrency(c, 'Orb of Scouring', true) }), lookup)
    expect(matchItem(doc, pile('Scroll of Wisdom', 1, 20)).visibility).toBe('Hide')
    expect(step(doc, pile('Orb of Scouring', 1, 20))).toBe(2)
  })

  it('from the hideout: the hideout gets the Loot looks, Act 1 stays NeverSink\'s', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setLvGate(c, 1)), lookup)
    expect(step(doc, pile('Portal Scroll', 1, 60))).toBe(2)
    expect(matchItem(doc, pile('Chaos Orb', 1, 60)).final?.block.type).toBe(CURRENCY_TYPE)
    expect(matchItem(doc, pile('Chaos Orb', 1, 20)).final?.block.type).not.toBe(CURRENCY_TYPE)
  })

  it('maps only: below area level 68 NeverSink decides, as before', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setLvGate(c, 0)), lookup)
    for (const area of [20, 60]) expect(matchItem(doc, pile('Chaos Orb', 1, area)).final?.block.type).not.toBe(CURRENCY_TYPE)
    expect(doc.blocks.some(b => b.comment.includes('levelling:'))).toBe(false)
  })

  it('every unique shows at least Normal below maps; in maps a cheap one hides', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    expect(matchItem(doc, unique('Simple Robe', 83)).visibility).toBe('Hide')
    expect(step(doc, unique('Simple Robe', 20))).toBe(2)
    expect(step(doc, unique('Simple Robe', 60))).toBe(2)
    // A valuable one keeps its own, louder step.
    expect(step(doc, { ...unique('Leather Belt', 20), itemClass: 'Belts' })).toBeGreaterThan(2)
  })

  it('the layer off: below maps prices alone decide', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setLvOn(c, false)), lookup)
    expect(matchItem(doc, pile('Portal Scroll', 1, 20)).visibility).toBe('Hide')
    expect(matchItem(doc, unique('Simple Robe', 20)).visibility).toBe('Hide')
  })
})

describe('levelling gear', () => {
  beforeAll(() => loadGameData(), 60_000)
  const gearDoc = (f?: (c: CurrencySettings) => void, archetype: Presets['weapons']['archetype'] = 'caster') => {
    const doc = parseFilter(SEMI)
    const cfg = on(f)
    applyCurrency(doc, cfg, lookup)
    insertBuildBlocks(doc, levellingGearBlocks(cfg, { on: false, archetype, classes: [] }, null))
    return doc
  }
  const gear = (itemClass: string, baseType: string, rarity: string, areaLevel: number, more: Partial<ItemFacts> = {}): ItemFacts => ({
    name: baseType, baseType, itemClass, rarity, areaLevel, itemLevel: areaLevel, influences: [], explicitModNames: [], identified: true, ...more
  } as ItemFacts)
  const lv = (doc: ReturnType<typeof parseFilter>, f: ItemFacts) => {
    const m = matchItem(doc, f)
    return m.final?.block.type === LV_GEAR_TYPE ? (m.visibility === 'Hide' ? 0 : Number(m.final.block.tier?.slice(1))) : null
  }

  it('links: 3-links until Act 3, 4-links until maps, 5-links loud', () => {
    const doc = gearDoc()
    const wand = (area: number, groups: string[]) => gear('Wands', 'Driftwood Wand', 'Normal', area, { socketGroups: groups, dropLevel: 1, width: 1, height: 3 })
    expect(lv(doc, wand(20, ['RRB']))).toBe(2)
    expect(lv(doc, wand(40, ['RRB']))).not.toBe(2)
    expect(lv(doc, wand(50, ['RRBB']))).toBe(3)
    expect(lv(doc, wand(50, ['RRBBG']))).toBe(4)
    expect(lv(doc, wand(70, ['RRBB']))).toBeNull()
  })

  it('movement speed boots: 10 to 15% until Act 5, 20%+ until maps', () => {
    const doc = gearDoc()
    const boots = (area: number, mod: string) => gear('Boots', 'Leather Boots', 'Magic', area, { explicitModNames: [mod], dropLevel: 1, width: 2, height: 2 })
    expect(lv(doc, boots(30, "Runner's"))).toBe(3)
    expect(lv(doc, boots(50, "Runner's"))).not.toBe(3)
    expect(lv(doc, boots(50, "Stallion's"))).toBe(3)
  })

  it('weapons of your type on a new base show; other types hide', () => {
    const doc = gearDoc()
    expect(lv(doc, gear('Wands', 'Driftwood Wand', 'Normal', 3, { dropLevel: 1, width: 1, height: 3 }))).toBe(2)
    expect(lv(doc, gear('Wands', 'Driftwood Wand', 'Normal', 30, { dropLevel: 1, width: 1, height: 3 }))).toBeNull()
    expect(lv(doc, gear('Wands', 'Carved Wand', 'Magic', 30, { dropLevel: 27, width: 1, height: 3 }))).toBe(2)
    expect(lv(doc, gear('Two Hand Axes', 'Stone Axe', 'Normal', 30, { dropLevel: 30, width: 2, height: 4 }))).toBe(0)
    // Bows have quivers; casters don't.
    expect(lv(doc, gear('Quivers', 'Serrated Arrow Quiver', 'Normal', 30, { dropLevel: 30, width: 2, height: 3 }))).toBe(0)
    const bow = gearDoc(undefined, 'bow')
    expect(lv(bow, gear('Bows', 'Recurve Bow', 'Normal', 20, { dropLevel: 18, width: 2, height: 4 }))).toBe(2)
    expect(lv(bow, gear('Wands', 'Carved Wand', 'Magic', 30, { dropLevel: 27, width: 1, height: 3 }))).toBe(0)
  })

  it('rares: every one until Act 3, then recent bases louder; big ones quieter; boots and jewellery always', () => {
    const doc = gearDoc()
    const helm = (area: number, dropLevel: number) => gear('Helmets', 'Vine Circlet', 'Rare', area, { dropLevel, width: 2, height: 2 })
    expect(lv(doc, helm(20, 5))).toBe(2)
    expect(lv(doc, helm(50, 45))).toBe(2)
    expect(lv(doc, helm(50, 5))).toBe(1)
    expect(lv(doc, gear('Body Armours', 'Simple Robe', 'Rare', 20, { dropLevel: 1, width: 2, height: 3 }))).toBe(1)
    expect(lv(doc, gear('Rings', 'Iron Ring', 'Rare', 60, { dropLevel: 1, width: 1, height: 1 }))).toBe(2)
    expect(lv(doc, gear('Two Hand Axes', 'Stone Axe', 'Rare', 20, { dropLevel: 1, width: 2, height: 4 }))).toBe(1)
  })

  it('armour in other defences: rares dimmed after Act 3, whites hidden after Act 1', () => {
    const doc = gearDoc()
    // A caster keeps energy shield; Iron Hat is armour.
    expect(lv(doc, gear('Helmets', 'Iron Hat', 'Rare', 50, { dropLevel: 1, width: 2, height: 2 }))).toBe(1)
    expect(lv(doc, gear('Helmets', 'Iron Hat', 'Normal', 30, { dropLevel: 1, width: 2, height: 2 }))).toBe(0)
    expect(lv(doc, gear('Helmets', 'Iron Hat', 'Normal', 5, { dropLevel: 1, width: 2, height: 2 }))).not.toBe(0)
    // Your own defences pick: armour kept.
    const ar = gearDoc(c => setLvDefences(c, DEF_AR | DEF_ES))
    expect(lv(ar, gear('Helmets', 'Iron Hat', 'Normal', 30, { dropLevel: 1, width: 2, height: 2 }))).not.toBe(0)
  })

  it('jewellery: every white and blue until Act 2, useful bases until Act 6', () => {
    const doc = gearDoc()
    expect(lv(doc, gear('Rings', 'Iron Ring', 'Normal', 10, { dropLevel: 1, width: 1, height: 1 }))).toBe(2)
    expect(lv(doc, gear('Rings', 'Iron Ring', 'Normal', 30, { dropLevel: 1, width: 1, height: 1 }))).toBeNull()
    expect(lv(doc, gear('Rings', 'Ruby Ring', 'Magic', 50, { dropLevel: 1, width: 1, height: 1 }))).toBe(2)
  })

  it('writes a valid filter, and nothing with the layer off or maps only', () => {
    const doc = gearDoc()
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
    expect(levellingGearBlocks(on(c => setLvOn(c, false)), { on: false, archetype: 'auto', classes: [] }, null)).toEqual([])
    expect(levellingGearBlocks(on(c => setLvGate(c, 0)), { on: false, archetype: 'auto', classes: [] }, null)).toEqual([])
    // Template defaults and picks.
    expect(lvDefences(defaultCurrency(), { on: false, archetype: 'bow', classes: [] })).toBe(DEF_EV)
    expect(lvDefences(defaultCurrency(), { on: false, archetype: 'auto', classes: [] })).toBe(DEF_ALL)
  })
})

describe('levelling flasks', () => {
  beforeAll(() => loadGameData(), 60_000)
  const doc = (() => {
    const d = parseFilter(SEMI)
    const cfg = on()
    applyCurrency(d, cfg, lookup)
    insertBuildBlocks(d, levellingGearBlocks(cfg, { on: false, archetype: 'auto', classes: [] }, null))
    return d
  })()
  const flask = (itemClass: string, baseType: string, areaLevel: number, quality = 0): ItemFacts => ({
    name: baseType, baseType, itemClass, rarity: 'Normal', areaLevel, itemLevel: areaLevel, quality, influences: [], explicitModNames: [], width: 1, height: 2
  } as ItemFacts)
  const lvStep = (f: ItemFacts) => {
    const m = matchItem(doc, f)
    return m.final?.block.type === LV_GEAR_TYPE ? (m.visibility === 'Hide' ? 0 : Number(m.final.block.tier?.slice(1))) : null
  }

  it('two newest sizes show, the newest louder; older ones without quality hide', () => {
    // Area 20: Grand (18) is newest, Greater (12) second, Large (6) old.
    expect(lvStep(flask('Life Flasks', 'Grand Life Flask', 20))).toBe(3)
    expect(lvStep(flask('Life Flasks', 'Greater Life Flask', 20))).toBe(2)
    expect(lvStep(flask('Life Flasks', 'Large Life Flask', 20))).toBe(0)
    expect(lvStep(flask('Life Flasks', 'Large Life Flask', 20, 10))).toBeNull()
    expect(lvStep(flask('Mana Flasks', 'Eternal Mana Flask', 66))).toBe(3)
    expect(lvStep(flask('Hybrid Flasks', 'Medium Hybrid Flask', 25))).toBe(3)
    expect(lvStep(flask('Life Flasks', 'Grand Life Flask', 70))).toBeNull()
  })

  it('utility flasks until maps, Quicksilver louder', () => {
    expect(lvStep(flask('Utility Flasks', 'Quicksilver Flask', 30))).toBe(3)
    expect(lvStep(flask('Utility Flasks', 'Ruby Flask', 30))).toBe(2)
    expect(lvStep(flask('Utility Flasks', 'Ruby Flask', 70))).toBeNull()
  })
})
