// Our own filter skeleton (NeverSink retirement M3): woke's rules written
// onto own-base.ts instead of NeverSink's file.
import { describe, it, expect, beforeAll } from 'vitest'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { composeFilter } from '@/web/woke/loot-filter/compose'
import { DEFAULT_BUILD_RULES } from '@/web/woke/loot-filter/build-rules'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { CURRENCY_TYPE } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { OWN_REST_TYPE, ownBaseText } from '@/web/woke/loot-filter/own-base'
import { loadOwnTables, ownTables } from '@/web/woke/loot-filter/own-lists'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'

beforeAll(async () => { await loadGameData(); await loadOwnTables() }, 60000)

const lookup: PriceLookup = (_g, base) => ({ 'Divine Orb': 160, 'Chaos Orb': 1 } as Record<string, number>)[base] != null ? { chaos: ({ 'Divine Orb': 160, 'Chaos Orb': 1 } as Record<string, number>)[base], thin: false } : null
const item = (f: Partial<ItemFacts>): ItemFacts => ({ name: f.baseType ?? '', areaLevel: 83, influences: [], explicitModNames: [], corrupted: false, ...f } as ItemFacts)

function compose (ownBase: boolean, catMode: Record<string, number> = {}) {
  const p = defaultPresets()
  p.currency.on = true
  Object.assign(p.currency.catMode, catMode)
  p.weights.on = true
  return composeFilter(neverSink('3-STRICT'), {
    presets: p,
    rules: [],
    edits: [],
    buildRules: { ...DEFAULT_BUILD_RULES },
    build: null,
    moves: [],
    safetyNet: { on: false, minChaos: 20 },
    prices: { lookup, safety: null, breakdown: null },
    dustList: null,
    heldBack: () => false,
    stackHeld: () => false,
    own: ownTables.value,
    ownBase
  }).doc
}

describe('our own filter skeleton', () => {
  it('is a filter the game reads, at the strictness given', () => {
    const doc = parseFilter(ownBaseText('4-VERY-STRICT'))
    expect(doc.strictness).toBe('4-VERY-STRICT')
    expect(doc.blocks.map(b => [b.type, b.tier, b.visibility])).toEqual([
      [OWN_REST_TYPE, 'plaingear', 'Hide'], [OWN_REST_TYPE, 'qualityflasks', 'Show'], [OWN_REST_TYPE, 'plainflasks', 'Hide'], [OWN_REST_TYPE, 'magicflasks', 'Hide'], [OWN_REST_TYPE, 'plainjewels', 'Hide'], [OWN_REST_TYPE, 'rarejewels', 'Show'], [OWN_REST_TYPE, 'magicabyss', 'Show'],
      [OWN_REST_TYPE, 'uniques', 'Show'], [OWN_REST_TYPE, 'blightravaged', 'Show'], [OWN_REST_TYPE, 'blightedmaps', 'Show'],
      [OWN_REST_TYPE, 'maps16', 'Show'], [OWN_REST_TYPE, 'maps11', 'Show'], [OWN_REST_TYPE, 'maps6', 'Show'], [OWN_REST_TYPE, 'maps1', 'Show'], [OWN_REST_TYPE, 'mapsother', 'Show'],
      [OWN_REST_TYPE, 'rares', 'Show'], [OWN_REST_TYPE, 'cheapstack', 'Hide'], [OWN_REST_TYPE, 'gold', 'Show'], [OWN_REST_TYPE, 'wombgifts', 'Show'],
      [OWN_REST_TYPE, 'currency', 'Show'], [OWN_REST_TYPE, 'cards', 'Show'], [OWN_REST_TYPE, 'gems', 'Show'], [OWN_REST_TYPE, 'other', 'Show'], [OWN_REST_TYPE, 'unknown', 'Show']
    ])
    expect(parseFilter(ownBaseText(null)).strictness).toBe('2-SEMI-STRICT')
  })

  it('holds no NeverSink rule, and keeps NeverSink\'s strictness', () => {
    const doc = compose(true)
    expect(doc.strictness).toBe('3-STRICT')
    expect(doc.blocks.filter(b => !b.type?.startsWith('woke->')).map(b => b.type)).toEqual([])
    expect(doc.blocks.some(b => b.type === CURRENCY_TYPE)).toBe(true)
    expect(compose(false).blocks.some(b => !b.type?.startsWith('woke->'))).toBe(true)
  })

  it('our rules decide what they know; plain gear in maps hides; the rest shows pink', () => {
    const doc = compose(true)
    const chaos = matchItem(doc, item({ baseType: 'Chaos Orb', itemClass: 'Stackable Currency', stackSize: 1 }))
    expect(chaos.final?.block.type).toBe(CURRENCY_TYPE)
    const plain = matchItem(doc, item({ baseType: 'Iron Hat', itemClass: 'Helmets', rarity: 'Normal', itemLevel: 83 }))
    expect(plain.visibility).toBe('Hide')
    const odd = matchItem(doc, item({ baseType: 'Some Future Item', itemClass: 'Misc Odd Things' }))
    expect([odd.final?.block.type, odd.final?.block.tier, odd.visibility]).toEqual([OWN_REST_TYPE, 'unknown', 'Show'])
  })

  it('while levelling, gear and flasks no rule of ours shows hide, not pink', () => {
    const doc = compose(true)
    const at = (f: Partial<ItemFacts>) => matchItem(doc, item({ areaLevel: 45, itemLevel: 45, ...f }))
    const oldHat = at({ baseType: 'Iron Hat', dropLevel: 1, itemClass: 'Helmets', rarity: 'Magic' })
    expect([oldHat.final?.block.tier, oldHat.visibility]).toEqual(['plaingear', 'Hide'])
    const oldSword = at({ baseType: 'Rusted Sword', dropLevel: 1, itemClass: 'One Hand Swords', rarity: 'Normal' })
    expect(oldSword.visibility).toBe('Hide')
    const newSword = at({ baseType: 'Footman Sword', dropLevel: 40, itemClass: 'One Hand Swords', rarity: 'Normal' })
    expect([newSword.final?.block.type, newSword.visibility]).toEqual(['woke->levelling', 'Show'])
    const rare = at({ baseType: 'Iron Hat', dropLevel: 1, itemClass: 'Helmets', rarity: 'Rare', identified: false })
    expect(rare.visibility).toBe('Show')
    expect(rare.final?.block.tier).not.toBe('unknown')
    const oldFlask = at({ baseType: 'Small Life Flask', dropLevel: 1, itemClass: 'Life Flasks', rarity: 'Magic', quality: 0 })
    expect(oldFlask.visibility).toBe('Hide')
    const qFlask = at({ baseType: 'Small Life Flask', dropLevel: 1, itemClass: 'Life Flasks', rarity: 'Normal', quality: 12 })
    expect([qFlask.final?.block.tier, qFlask.visibility]).toEqual(['qualityflasks', 'Show'])
  })

  it('with the levelling rules off or from the hideout, plain gear in the acts still shows', () => {
    const hat = (doc: ReturnType<typeof compose>, areaLevel: number) => matchItem(doc, item({ baseType: 'Iron Hat', dropLevel: 1, itemClass: 'Helmets', rarity: 'Normal', areaLevel, itemLevel: areaLevel }))
    const off = compose(true, { lvon: 0 })
    expect(hat(off, 45).visibility).toBe('Show')
    expect(hat(off, 70).visibility).toBe('Hide')
    const maps = compose(true, { lvgate: 0 })
    expect(hat(maps, 45).visibility).toBe('Show')
    const hideout = compose(true, { lvgate: 1 })
    expect(hat(hideout, 45).visibility).toBe('Show')
    expect(hat(hideout, 62).visibility).toBe('Hide')
    expect(hat(compose(true), 45).visibility).toBe('Hide')
  })
})
