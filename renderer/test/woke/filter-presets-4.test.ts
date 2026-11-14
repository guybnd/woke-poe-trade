// Loot filter preset for 3.30's item tiers (UnidentifiedItemTier): magic and
// rare gear below a tier hides once you're in maps, on NeverSink's real files
// at every strictness.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { applyPresetChanges, defaultPresets, normalizePresets, presetBlocks, PRESET_TYPE } from '@/web/woke/loot-filter/presets'
import type { Presets } from '@/web/woke/loot-filter/presets'
import { LEVELS, neverSink, neverSinkStyled } from '../helpers/neversink'

function item (f: Partial<ItemFacts>): ItemFacts {
  return {
    name: f.baseType ?? 'x',
    influences: [],
    explicitModNames: [],
    areaLevel: 83,
    itemLevel: 83,
    dropLevel: 60,
    identified: false,
    corrupted: false,
    mirrored: false,
    fractured: false,
    synthesised: false,
    replica: false,
    foulborn: false,
    vestigial: false,
    crucibleTree: false,
    transfigured: false,
    imbued: false,
    zanaMemory: false,
    exceptional: false,
    blightedMap: false,
    uberBlightedMap: false,
    anyEnchantment: false,
    hasImplicitMod: false,
    corruptedMods: 0,
    memoryStrands: 0,
    exarchTier: 0,
    eaterTier: 0,
    quality: 0,
    width: 2,
    height: 2,
    socketGroups: ['R', 'G'],
    ...f
  }
}

function withPresets (text: string, patch: Partial<Presets>): FilterDoc {
  const doc = parseFilter(text)
  const p = normalizePresets({ ...defaultPresets(), ...patch })
  insertBuildBlocks(doc, presetBlocks(doc, p, null))
  applyPresetChanges(doc, p)
  return doc
}

const outcome = (doc: FilterDoc, f: Partial<ItemFacts> | ItemFacts) => {
  const m = matchItem(doc, item(f))
  return `${m.visibility} ${m.final?.block.type ?? '-'} ${m.final?.block.tier ?? '-'}`
}

// Plain gear: bases NeverSink doesn't single out, in every gear class it tiers.
const PLAIN: Array<Partial<ItemFacts>> = [
  { itemClass: 'Body Armours', baseType: 'Vaal Regalia', width: 2, height: 3, dropLevel: 68 },
  { itemClass: 'Body Armours', baseType: 'Plate Vest', width: 2, height: 3, dropLevel: 1 },
  { itemClass: 'Helmets', baseType: 'Hubris Circlet', dropLevel: 69 },
  { itemClass: 'Boots', baseType: 'Sorcerer Boots', dropLevel: 67 },
  { itemClass: 'Gloves', baseType: 'Iron Gauntlets', dropLevel: 1 },
  { itemClass: 'Rings', baseType: 'Two-Stone Ring', width: 1, height: 1, dropLevel: 20 },
  { itemClass: 'Amulets', baseType: 'Coral Amulet', width: 1, height: 1, dropLevel: 1 },
  { itemClass: 'Belts', baseType: 'Leather Belt', width: 2, height: 1, dropLevel: 8 },
  { itemClass: 'One Hand Swords', baseType: 'Jewelled Foil', width: 1, height: 4, dropLevel: 68 },
  { itemClass: 'Wands', baseType: 'Imbued Wand', width: 1, height: 3, dropLevel: 59 },
  { itemClass: 'Bows', baseType: 'Thicket Bow', width: 2, height: 4, dropLevel: 56 },
  { itemClass: 'Shields', baseType: 'Titanium Spirit Shield', width: 2, height: 3, dropLevel: 68 }
]
const RARITIES = ['Normal', 'Magic', 'Rare'] as const

// Whether NeverSink shows the drop for something other than its tier: with
// its plain tiered and rare gear rules gone and no tier at all, a rule further
// down still shows it (crafting bases, chancing, fractured, 5-links...). The
// preset must keep those.
const PLAIN_KEYS = ['UnidentifiedItemTier', 'ItemLevel', 'Rarity', 'Class', 'BaseType', 'DropLevel', 'Width', 'Height']
const untiered = new WeakMap<FilterDoc, FilterDoc>()
function withoutTierRules (doc: FilterDoc): FilterDoc {
  let out = untiered.get(doc)
  if (!out) {
    out = {
      ...doc,
      blocks: doc.blocks.filter(b => !(b.visibility === 'Show' && !b.continue &&
      (b.type === 'gear->tiered' || b.type === 'rr' || b.type?.startsWith('rr->')) && b.tier !== 'specialclasses' &&
      b.conditions.every(c => PLAIN_KEYS.includes(c.key))))
    }
    untiered.set(doc, out)
  }
  return out
}
const shownAnyway = (doc: FilterDoc, f: Partial<ItemFacts>) => {
  const m = matchItem(withoutTierRules(doc), item({ ...f, unidentifiedItemTier: 0 }))
  return m.visibility === 'Show' && m.final != null && m.final.block.type !== 'hidelayer'
}

// What NeverSink ranks above its catch-all: these keep their outcome.
const SPECIAL: Array<[string, Partial<ItemFacts>]> = [
  ['item level 86 crafting base', { itemClass: 'Body Armours', baseType: 'Conquest Lamellar', width: 2, height: 3, dropLevel: 68, itemLevel: 86 }],
  ['item level 83 crafting base', { itemClass: 'One Hand Swords', baseType: 'Jewelled Foil', width: 1, height: 4, dropLevel: 68 }],
  ['fractured', { itemClass: 'Rings', baseType: 'Two-Stone Ring', width: 1, height: 1, fractured: true }],
  ['synthesised', { itemClass: 'Helmets', baseType: 'Hubris Circlet', synthesised: true }],
  ['influenced', { itemClass: 'Boots', baseType: 'Sorcerer Boots', influences: ['Shaper'] }],
  ['6 sockets', { itemClass: 'Body Armours', baseType: 'Plate Vest', width: 2, height: 3, socketGroups: ['RR', 'GG', 'BB'] }],
  ['5-link', { itemClass: 'Body Armours', baseType: 'Plate Vest', width: 2, height: 3, socketGroups: ['RRGGB'] }],
  ['exotic base', { itemClass: 'Amulets', baseType: 'Simplex Amulet', width: 1, height: 1 }],
  ['corrupted', { itemClass: 'Rings', baseType: 'Two-Stone Ring', width: 1, height: 1, corrupted: true, corruptedMods: 1 }],
  ['enchanted', { itemClass: 'Amulets', baseType: 'Coral Amulet', width: 1, height: 1, anyEnchantment: true, enchantmentPassiveNum: 1 }]
]

const FILES = [...LEVELS, 'VAAL-3-STRICT (style)'] as const

describe.each(FILES)('item tiers preset on %s', level => {
  const text = level === 'VAAL-3-STRICT (style)' ? neverSinkStyled() : neverSink(level)
  const base = parseFilter(text)
  const docs = new Map([2, 3, 4, 5].map(n => [n, withPresets(text, { lowTiers: { on: true, tier: n } })]))

  it('passes the save check and reads back the same', () => {
    for (const doc of docs.values()) {
      expect(validateFilter(doc).map(x => x.message)).toEqual([])
      const again = parseFilter(serializeFilter(doc))
      expect(validateFilter(again).map(x => x.message)).toEqual([])
      expect(again.blocks.length).toBe(doc.blocks.length)
    }
  })

  it('hides plain gear below the tier in maps, and leaves the rest as NeverSink had it', () => {
    let hidden = 0
    for (const [n, doc] of docs) {
      for (const f of PLAIN) {
        for (const rarity of RARITIES) {
          for (let tier = 0; tier <= 5; tier++) {
            const facts = { ...f, rarity, unidentifiedItemTier: tier }
            const label = `${level} N=${n} ${rarity} ${f.baseType} tier ${tier}`
            if (tier >= n) {
              expect(outcome(doc, facts), label).toBe(outcome(base, facts))
            } else {
              const want = shownAnyway(base, facts) ? 'Show' : 'Hide'
              expect(matchItem(doc, item(facts)).visibility, label).toBe(want)
              if (want === 'Hide' && matchItem(base, item(facts)).visibility === 'Show') hidden++
            }
          }
        }
      }
    }
    expect(hidden).toBeGreaterThan(0)
  })

  it('keeps NeverSink\'s verdict in the app while the item copy shows no tier', () => {
    // WOKEPOET-153: the copy doesn't carry the tier yet, so the overlay chip
    // and Preview must not call every map rare hidden.
    for (const doc of docs.values()) {
      for (const [, f] of [...PLAIN.map(x => ['', x] as const), ...SPECIAL]) {
        for (const rarity of RARITIES) {
          const facts = { ...f, rarity }
          expect(outcome(doc, facts), `${f.baseType} ${rarity}`).toBe(outcome(base, facts))
          const brief = (d: FilterDoc) => matchItem(d, item(facts), { brief: true }).visibility
          expect(brief(doc)).toBe(brief(base))
        }
      }
    }
  })

  it('writes a file the game reads the same way: no tier means hidden below the line', () => {
    const doc = parseFilter(serializeFilter(docs.get(3)!))
    expect(doc.blocks.some(b => b.conditions.some(c => c.assumeMet))).toBe(false)
    for (const f of PLAIN) {
      for (const rarity of RARITIES) {
        const facts = { ...f, rarity, unidentifiedItemTier: 0 }
        expect(matchItem(doc, item(facts)).visibility, `${f.baseType} ${rarity}`).toBe(shownAnyway(base, facts) ? 'Show' : 'Hide')
      }
    }
  })

  it('leaves the campaign alone', () => {
    const doc = docs.get(5)!
    for (const f of PLAIN) {
      for (const rarity of RARITIES) {
        for (const areaLevel of [45, 60, 67]) {
          for (const tier of [0, 2, 4]) {
            const facts = { ...f, rarity, unidentifiedItemTier: tier, areaLevel, itemLevel: areaLevel }
            expect(matchItem(doc, item(facts)).visibility, `${f.baseType} ${rarity} area ${areaLevel}`).toBe(matchItem(base, item(facts)).visibility)
          }
        }
      }
    }
  })

  it('never hides what NeverSink ranks higher', () => {
    let kept = 0
    for (const [n, doc] of docs) {
      for (const [what, f] of SPECIAL) {
        for (const rarity of RARITIES) {
          if (!shownAnyway(base, { ...f, rarity })) continue
          kept++
          for (let tier = 0; tier <= 5; tier++) {
            // Still shown; the look may move to NeverSink's own rule for it
            // (a fractured ring gets the fractured look, not the tier's).
            expect(matchItem(doc, item({ ...f, rarity, unidentifiedItemTier: tier })).visibility, `N=${n} ${what} ${rarity} tier ${tier}`).toBe('Show')
          }
        }
      }
    }
    expect(kept).toBeGreaterThan(0)
  })

  it('works with "hide white and blue gear in maps" on too', () => {
    const both = withPresets(text, { lowTiers: { on: true, tier: 3 }, hideGear: { on: true } })
    const gearOnly = withPresets(text, { hideGear: { on: true } })
    expect(validateFilter(both).map(x => x.message)).toEqual([])
    for (const f of PLAIN) {
      for (const rarity of RARITIES) {
        for (let tier = 0; tier <= 5; tier++) {
          const facts = { ...f, rarity, unidentifiedItemTier: tier }
          if (tier >= 3) expect(outcome(both, facts)).toBe(outcome(gearOnly, facts))
          else expect(matchItem(both, item(facts)).visibility).toBe(shownAnyway(gearOnly, facts) ? 'Show' : 'Hide')
        }
      }
    }
    for (const [what, f] of SPECIAL) {
      for (const rarity of RARITIES) {
        if (shownAnyway(gearOnly, { ...f, rarity })) expect(matchItem(both, item({ ...f, rarity, unidentifiedItemTier: 2 })).visibility, what).toBe('Show')
      }
    }
  })
})

describe('item tiers preset', () => {
  it('starts off at tier 3 and keeps the tier between 2 and 5', () => {
    expect(defaultPresets().lowTiers).toEqual({ on: false, tier: 3 })
    expect(normalizePresets({}).lowTiers).toEqual({ on: false, tier: 3 })
    expect(normalizePresets({ lowTiers: { on: true, tier: 9 } }).lowTiers).toEqual({ on: true, tier: 5 })
    expect(normalizePresets({ lowTiers: { on: true, tier: 1 } }).lowTiers).toEqual({ on: true, tier: 2 })
    expect(normalizePresets({ lowTiers: { on: true, tier: 3.6 } }).lowTiers.tier).toBe(4)
  })

  it('changes nothing while off', () => {
    const text = neverSink('1-REGULAR')
    expect(serializeFilter(withPresets(text, {}))).toBe(serializeFilter(withPresets(text, { lowTiers: { on: false, tier: 4 } })))
  })

  it('asks NeverSink\'s plain gear rules for the tier, and leaves fractured, veiled, fated and special classes', () => {
    const doc = withPresets(neverSink('1-REGULAR'), { lowTiers: { on: true, tier: 4 } })
    const rule = (type: string, tier: string) => doc.blocks.find(b => b.type === type && b.tier === tier)!
    const itemTier = (type: string, tier: string) => rule(type, tier).conditions.filter(c => c.key === 'UnidentifiedItemTier').map(c => `${c.op} ${c.values.join(' ')}`)
    expect(itemTier('gear->tiered', 'any2')).toEqual(['>= 4'])
    expect(itemTier('gear->tiered', 't5r1')).toEqual(['>= 5'])
    expect(itemTier('rr', 't5')).toEqual(['>= 4'])
    expect(itemTier('rr->amuring', 't1')).toEqual(['>= 4'])
    expect(itemTier('gear->tiered', 'strandedfractured')).toEqual(['>= 3'])
    expect(itemTier('gear->tiered', 'strandedveiled')).toEqual(['>= 3'])
    expect(itemTier('gear->tiered', 'specialclasses')).toEqual(['>= 3'])
    expect(itemTier('rr', 't1f')).toEqual([])
    // Only rules for item level 68 and up, which drop in maps alone.
    for (const b of doc.blocks) {
      if (b.conditions.some(c => c.key === 'UnidentifiedItemTier' && c.values[0] === '4' && c.op === '>=')) {
        expect(b.conditions.some(c => c.key === 'ItemLevel' && c.op === '>=' && Number(c.values[0]) >= 68), `${b.type} ${b.tier}`).toBe(true)
      }
    }
    expect(doc.blocks.filter(b => b.type === PRESET_TYPE)).toEqual([])
  })

  it('hides below the tier when a player shows NeverSink\'s catch-all', () => {
    const shown = () => {
      const d = parseFilter(neverSink('1-REGULAR'))
      for (const b of d.blocks) {
        if (b.type === 'hidelayer' && (b.tier === 'normalmagicendgame' || b.tier === 'raresendgame')) b.visibility = 'Show'
      }
      return d
    }
    const base = shown()
    const doc = shown()
    applyPresetChanges(doc, normalizePresets({ lowTiers: { on: true, tier: 3 } }))
    const odd = { itemClass: 'Gloves', baseType: 'Iron Gauntlets', dropLevel: 1 }
    expect(matchItem(doc, item({ ...odd, rarity: 'Magic', unidentifiedItemTier: 1 })).visibility).toBe('Hide')
    expect(matchItem(doc, item({ ...odd, rarity: 'Rare', unidentifiedItemTier: 2 })).visibility).toBe('Hide')
    expect(matchItem(doc, item({ ...odd, rarity: 'Rare', unidentifiedItemTier: 3 })).visibility).toBe('Show')
    expect(matchItem(doc, item({ ...odd, rarity: 'Rare', unidentifiedItemTier: 3 })).actions).toEqual(matchItem(base, item({ ...odd, rarity: 'Rare', unidentifiedItemTier: 3 })).actions)
    // No tier in the copy: the app keeps the player's shown catch-all.
    expect(matchItem(doc, item({ ...odd, rarity: 'Magic' })).visibility).toBe('Show')
    // In the file the game reads, a drop with no tier fails the kept line too.
    const file = parseFilter(serializeFilter(doc))
    expect(matchItem(file, item({ ...odd, rarity: 'Magic', unidentifiedItemTier: 0 })).visibility).toBe('Hide')
    const campaign = item({ ...odd, rarity: 'Magic', unidentifiedItemTier: 1, areaLevel: 60, itemLevel: 60 })
    expect(outcome(doc, campaign)).toBe(outcome(base, campaign))
    expect(validateFilter(doc).map(x => x.message)).toEqual([])
  })

  it('leaves the chaos recipe picks shown', () => {
    const doc = withPresets(neverSink('1-REGULAR'), { lowTiers: { on: true, tier: 5 }, chaosRecipe: { on: true, slots: ['body'] } })
    const m = matchItem(doc, item({ itemClass: 'Body Armours', baseType: 'Plate Vest', rarity: 'Rare', itemLevel: 70, areaLevel: 70, width: 2, height: 3, unidentifiedItemTier: 2 }))
    expect(m.visibility).toBe('Show')
    expect(m.final?.block.tier).toBe('recipebody')
  })
})
