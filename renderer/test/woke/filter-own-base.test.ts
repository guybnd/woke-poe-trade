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

function compose (ownBase: boolean) {
  const p = defaultPresets()
  p.currency.on = true
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
      [OWN_REST_TYPE, 'plaingear', 'Hide'], [OWN_REST_TYPE, 'plainflasks', 'Hide'], [OWN_REST_TYPE, 'magicflasks', 'Hide'], [OWN_REST_TYPE, 'plainjewels', 'Hide'], [OWN_REST_TYPE, 'rarejewels', 'Show'],
      [OWN_REST_TYPE, 'maps16', 'Show'], [OWN_REST_TYPE, 'maps11', 'Show'], [OWN_REST_TYPE, 'maps6', 'Show'], [OWN_REST_TYPE, 'maps1', 'Show'],
      [OWN_REST_TYPE, 'uniques', 'Show'], [OWN_REST_TYPE, 'unknown', 'Show']
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
})
