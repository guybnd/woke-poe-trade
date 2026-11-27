// Currency weights (currency-weights.ts): off writes nothing; on, every pile
// of endgame currency gets the step its worth says, on NeverSink's real
// filter, and levelling and other items stay NeverSink's.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, CURRENCY_CATEGORIES, applyCurrency, categoryOf, currencyItems, defaultCurrency, minStack, normalizeCurrency, pileWorth, stacksFor, stepOfPile, stepStarts, subgroupOf, currencyLook, levelOf, strictMult, scaled, tierGuess, divineChaos } from '@/web/woke/loot-filter/currency-weights'
import type { CurrencySettings } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { fullStack } from '@/web/woke/loot-filter/stack-sizes'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')

// Example prices; anything else has none (a guess from NeverSink's tier).
const PRICES: Record<string, number> = {
  'Divine Orb': 160,
  'Mirror of Kalandra': 60000,
  'Exalted Orb': 15,
  'Chaos Orb': 1,
  'Orb of Alchemy': 0.3,
  'Orb of Scouring': 0.4,
  'Orb of Transmutation': 0.05,
  'Scroll of Wisdom': 0.02,
  'Orb of Augmentation': 0.03
}
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null

const on = (f?: (c: CurrencySettings) => void): CurrencySettings => {
  const c = defaultCurrency()
  c.on = true
  f?.(c)
  return c
}

const pile = (name: string, stackSize: number, areaLevel = 83): ItemFacts => ({
  name, baseType: name, itemClass: 'Stackable Currency', stackSize, areaLevel, influences: [], explicitModNames: []
})

describe('currency weights', () => {
  it('reads full stack sizes from the game data', () => {
    expect(fullStack('Chaos Orb')).toBe(10)
    expect(fullStack('Orb of Transmutation')).toBe(40)
    expect(fullStack('Orb of Scouring')).toBe(30)
    expect(fullStack('Not an item')).toBe(10)
  })

  it('scores a pile at full value, cheap items discounted', () => {
    const chaos = { chaos: 1, full: 10 }
    // A full stack of Chaos (10c) reaches Decent at 10c: full value.
    expect(pileWorth(chaos, 10, 10)).toBe(10)
    expect(minStack(chaos, 5, 10)).toBe(5)
    // A full stack worth under Decent: price × stack^0.75.
    const shard = { chaos: 0.05, full: 20 }
    expect(pileWorth(shard, 16, 10)).toBeCloseTo(0.4)
    expect(minStack({ chaos: 0.02, full: 40 }, 1, 10)).toBeNull()
    for (const at of [0.1, 0.7, 1, 2.3, 5]) {
      const k = minStack({ chaos: 0.3, full: 20 }, at, 10)
      if (k == null) continue
      expect(pileWorth({ chaos: 0.3, full: 20 }, k, 10)).toBeGreaterThanOrEqual(at)
      if (k > 1) expect(pileWorth({ chaos: 0.3, full: 20 }, k - 1, 10)).toBeLessThan(at)
    }
  })

  it('multiplies every step by the strictness', () => {
    expect(levelOf('4-VERYSTRICT')).toBe(4)
    expect(levelOf(null)).toBe(2)
    expect(strictMult(2)).toBe(1)
    expect(strictMult(3)).toBe(1.25)
    expect(strictMult(4)).toBe(1.55)
    const c = defaultCurrency()
    expect(scaled(c, '2-SEMI-STRICT')).toBe(c)
    const s = scaled(c, '3-STRICT')
    expect(s.line).toBeCloseTo(0.25)
    expect(s.from[0]).toBeCloseTo(1.25)
    c.mult = 2
    expect(scaled(c, '4-VERYSTRICT').from[3]).toBe(120)
    expect(normalizeCurrency({ mult: 9 }).mult).toBe(null)
    expect(normalizeCurrency({ mult: 1.5 }).mult).toBe(1.5)
  })

  it('hides the piles of a step that is turned off', () => {
    const c = defaultCurrency()
    const it = { name: 'Chaos Orb', cat: 'orbs', chaos: 0.3, full: 20, est: false } as never
    const all = stacksFor(it, c)
    c.off = [1]
    const s = stacksFor(it, c)
    expect(s).toEqual([null, ...all.slice(1)])
    expect(stepOfPile(s, 1)).toBe(0)
    expect(stepOfPile(s, 10)).toBe(stepOfPile(all, 10))
    expect(normalizeCurrency(JSON.parse('{"off":[1,1,5,"x",2]}')).off).toEqual([1, 2])
  })

  it('guesses a price from NeverSink tiers', () => {
    expect(tierGuess('t1exalted')).toBe(150)
    expect(tierGuess('t4chaos')).toBe(5)
    expect(tierGuess('exhide')).toBe(0.05)
    expect(tierGuess(null)).toBe(0.3)
  })

  it('finds NeverSink currency with prices, guesses marked', () => {
    const items = currencyItems(parseFilter(SEMI), lookup)
    const by = new Map(items.map(i => [i.name, i]))
    expect(by.get('Chaos Orb')).toMatchObject({ chaos: 1, est: false, full: 10 })
    expect(by.get('Orb of Annulment')?.est).toBe(true)
    expect(by.has('Deafening Essence of Greed')).toBe(true)
    // Splinters wait for the fragments step.
    expect(by.has('Splinter of Xoph')).toBe(false)
    expect(new Set(items.map(i => i.name)).size).toBe(items.length)
    expect(divineChaos(items)).toBe(160)
  })

  it('caps a shard at a twentieth of its orb', () => {
    const items = currencyItems(parseFilter(SEMI), (g, base) => {
      if (base === 'Alchemy Shard') return { chaos: 1.12, thin: false }
      if (base === 'Orb of Alchemy') return { chaos: 0.6, thin: false }
      if (base === 'Alteration Shard') return { chaos: 0.002, thin: false }
      if (base === 'Orb of Alteration') return { chaos: 0.1, thin: false }
      return null
    })
    const by = new Map(items.map(i => [i.name, i]))
    expect(by.get('Alchemy Shard')).toMatchObject({ chaos: 0.03, est: false })
    expect(by.get('Alteration Shard')?.chaos).toBe(0.002)
  })

  it('prices chaos itself, asks for astrolabes and holds thin prices near the guess', () => {
    const asked = new Set<string>()
    const items = currencyItems(parseFilter(SEMI), (g, base) => {
      for (const n of g.ninja) asked.add(n)
      if (base === 'Chaos Orb') return null
      if (base === 'Orb of Annulment') return { chaos: 100_000, thin: true }
      if (base === 'Orb of Scouring') return { chaos: 0.4, thin: true }
      return null
    })
    const by = new Map(items.map(i => [i.name, i]))
    expect(by.get('Chaos Orb')).toMatchObject({ chaos: 1, est: false })
    expect(asked.has('Astrolabe')).toBe(true)
    const ann = by.get('Orb of Annulment')!
    expect(ann.est).toBe(true)
    expect(ann.chaos).toBe(tierGuess(ann.tier) * 10)
    const sc = by.get('Orb of Scouring')!
    expect(sc.chaos).toBe(Math.min(tierGuess(sc.tier) * 10, Math.max(tierGuess(sc.tier) / 10, 0.4)))
  })

  it('writes nothing when off or without prices', () => {
    const doc = parseFilter(SEMI)
    expect(applyCurrency(doc, defaultCurrency(), lookup)).toBeNull()
    expect(applyCurrency(doc, on(), null)).toBeNull()
    expect(serializeFilter(doc)).toBe(serializeFilter(parseFilter(SEMI)))
  })

  it('gives every pile the step its worth says, in maps only', () => {
    for (const line of [0.1, 0.5, 1, 3, 5]) {
      const cfg = on(c => { c.line = line })
      const doc = parseFilter(SEMI)
      const compiled = applyCurrency(doc, cfg, lookup)!
      for (const it of compiled.items) {
        const stacks = stacksFor(it, cfg)
        for (const n of [1, 2, 3, 5, 10, 20, 40]) {
          if (n > it.full) continue
          const res = matchItem(doc, { ...pile(it.name, n), itemClass: it.cls.split('|')[0] })
          const want = stepOfPile(stacks, n)
          expect(res.final?.block.type, `${it.name} ×${n} at ${line}c`).toBe(CURRENCY_TYPE)
          expect(res.final?.block.tier, `${it.name} ×${n} at ${line}c`).toBe(`s${want}`)
          expect(res.visibility === 'Hide', `${it.name} ×${n}`).toBe(want === 0)
        }
      }
      // Levelling is NeverSink's.
      expect(matchItem(doc, pile('Orb of Transmutation', 1, 40)).final?.block.type).not.toBe(CURRENCY_TYPE)
      // Other items too.
      expect(matchItem(doc, { ...pile('Splinter of Xoph', 1), itemClass: 'Stackable Currency' }).final?.block.type).not.toBe(CURRENCY_TYPE)
    }
  })

  it('shows supplies from their stack, and a step set by hand for every pile', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.line = 2; c.items = { 'Orb of Transmutation': { supply: 10 }, 'Scroll of Wisdom': { step: 3 }, 'Divine Orb': { step: 0 } } }), lookup)
    expect(matchItem(doc, pile('Orb of Transmutation', 9)).visibility).toBe('Hide')
    expect(matchItem(doc, pile('Orb of Transmutation', 10)).final?.block.tier).toBe('s1')
    expect(matchItem(doc, pile('Scroll of Wisdom', 1)).final?.block.tier).toBe('s3')
    expect(matchItem(doc, pile('Scroll of Wisdom', 40)).final?.block.tier).toBe('s3')
    expect(matchItem(doc, pile('Divine Orb', 5)).visibility).toBe('Hide')
    expect(matchItem(doc, pile('Orb of Augmentation', 1)).visibility).toBe('Hide')
  })

  it('takes your own price and gives an item its own look', () => {
    const doc = parseFilter(SEMI)
    const res = applyCurrency(doc, on(c => { c.items = { 'Orb of Scouring': { price: 100, look: { text: [0, 255, 0, 255] } } } }), lookup)!
    expect(res.items.find(i => i.name === 'Orb of Scouring')).toMatchObject({ chaos: 100, est: false, own: true })
    const hit = matchItem(doc, pile('Orb of Scouring', 1)).final!.block
    expect(hit.tier).toBe('s5')
    expect(hit.actions.find(a => a.key === 'SetTextColor')?.args.join(' ')).toBe('0 255 0 255')
    expect(hit.actions.find(a => a.key === 'PlayEffect')?.args.join(' ')).toBe('Red')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('a category nudge moves its line only', () => {
    const base = on(c => { c.line = 1 })
    const less = on(c => { c.line = 1; c.nudge = { orbs: 2 } })
    expect(stepStarts(less, 'orbs')[0]).toBe(4)
    expect(stepStarts(less, 'oils')[0]).toBe(1)
    const items = currencyItems(parseFilter(SEMI), lookup)
    const alch = items.find(i => i.name === 'Orb of Alchemy')!
    // 0.3c (a full stack is 6c, over Decent: full value): shows from 4 at 1c; a 4c line sits above Normal, so Small never applies.
    expect(stacksFor(alch, base)[0]).toBe(4)
    expect(stacksFor(alch, less)[0]).toBeNull()
  })

  it('shows odd items poe.ninja has no price for, but not shards', () => {
    const items = currencyItems(parseFilter(SEMI), lookup)
    const free = items.filter(i => i.free).map(i => i.name)
    expect(free).toContain('Facetor\'s Lens')
    expect(free.some(n => /Shard$/.test(n))).toBe(false)
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    expect(matchItem(doc, pile('Facetor\'s Lens', 1)).visibility).toBe('Show')
  })

  it('covers every stackable NeverSink lists in maps, splinters, lifeforce, embers and runegrafts too', () => {
    const items = new Map(currencyItems(parseFilter(SEMI), lookup).map(i => [i.name, i.cat]))
    expect(items.get('Timeless Karui Splinter')).toBe('splinters')
    expect(items.get('Simulacrum Splinter')).toBe('splinters')
    expect(items.get('Vivid Crystallised Lifeforce')).toBe('harvest')
    expect(items.get('Allflame Ember of Kulemak')).toBe('embers')
    expect(items.get('Runegraft of Bellows')).toBe('runegrafts')
    expect(items.has('Dead Man\'s Sulphur')).toBe(true)
    expect(items.has('Rogue\'s Marker')).toBe(true)
    // League threads come from the fragment rules; nothing else from there does.
    expect(items.get('Breach Thread')).toBe('threads')
    expect(items.has('Divine Vessel')).toBe(false)
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.items = { 'Breach Thread': { step: 4 } } }), lookup)
    const hit = matchItem(doc, { ...pile('Breach Thread', 1), itemClass: 'Misc Map Items' })
    expect(hit.final?.block.tier).toBe('s4')
  })

  it('fills in the category colour as value climbs, a step edit is loudness for all', () => {
    const c = on(x => { x.steps = { 4: { sound: { id: '7', volume: 250 }, fontSize: 44 } }; x.cats = { oils: { text: [10, 200, 20, 255] } } })
    expect(currencyLook(1, 'essences', c).text?.slice(0, 3)).toEqual([230, 140, 240])
    expect(currencyLook(2, 'essences', c).border?.slice(0, 3)).toEqual([251, 89, 255])
    const decent = currencyLook(3, 'essences', c)
    expect(decent.background?.slice(0, 3)).toEqual([255, 190, 0])
    expect(decent.border?.slice(0, 3)).toEqual([230, 140, 240])
    expect(decent.effect).toMatchObject({ color: 'Pink', temp: true })
    const big = currencyLook(4, 'essences', c)
    expect(big.background?.slice(0, 3)).toEqual([255, 93, 27])
    expect(big.border?.slice(0, 3)).toEqual([230, 140, 240])
    expect(big.sound).toEqual({ id: '7', volume: 250 })
    expect(big.icon).toMatchObject({ size: 0, color: 'Pink', shape: 'Moon' })
    expect(big.effect?.color).toBe('Pink')
    expect(currencyLook(3, 'oils', c).border?.slice(0, 3)).toEqual([10, 200, 20])
    const tink = currencyLook(5, 'essences', c)
    expect(tink.border?.slice(0, 3)).toEqual([230, 140, 240])
    expect(tink.effect?.color).toBe('Red')
    expect(tink.icon).toMatchObject({ color: 'Red', shape: 'Moon' })
    const doc = parseFilter(SEMI)
    applyCurrency(doc, c, lookup)
    expect(validateFilter(doc).map(p => p.message)).toEqual([])
  })

  it('sorts essences into their tiers', () => {
    expect(subgroupOf('Deafening Essence of Greed', 'essences')).toBe('Deafening')
    expect(subgroupOf('Whispering Essence of Hatred', 'essences')).toBe('Whispering')
    expect(subgroupOf('Essence of Horror', 'essences')).toBe('Special')
    expect(subgroupOf('Divine Orb', 'orbs')).toBeNull()
  })

  it('sorts every item into a category', () => {
    const items = currencyItems(parseFilter(SEMI), lookup)
    const ids = new Set(CURRENCY_CATEGORIES.map(c => c.id))
    for (const it of items) expect(ids.has(it.cat), it.name).toBe(true)
    const of = (n: string) => items.find(i => i.name === n)?.cat
    expect(of('Orb of Alchemy')).toBe('orbs')
    expect(of('Mirror of Kalandra')).toBe('orbs')
    expect(of('Prismatic Catalyst')).toBe('catalysts')
    expect(of("Crusader's Exalted Orb")).toBe('influence')
    expect(of('Chaotic Astrolabe')).toBe('atlas')
    expect(of('Astragali')).toBe('expedition')
    expect(of('Tainted Chaos Orb')).toBe('tainted')
    expect(of('Deafening Essence of Greed')).toBe('essences')
    expect(categoryOf('Fractured Fossil', 'currency->fossil')).toBe('fossils')
    // "Other" stays small: a new item lands in a real category.
    expect(items.filter(i => i.cat === 'other').length).toBeLessThan(25)
  })

  it('makes a chase drop red on white with a beam', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    const hit = matchItem(doc, pile('Mirror of Kalandra', 1)).final!.block
    expect(hit.tier).toBe('s5')
    const act = (k: string) => hit.actions.find(a => a.key === k)?.args.join(' ')
    expect(act('SetBackgroundColor')).toBe('255 255 255 255')
    expect(act('SetTextColor')).toBe('255 0 0 255')
    expect(act('PlayEffect')).toBe('Red')
  })

  it('writes a small filter the game takes', () => {
    for (const line of [0.1, 1, 5]) {
      const doc = parseFilter(SEMI)
      const compiled = applyCurrency(doc, on(c => { c.line = line }), lookup)!
      expect(compiled.blocks.length).toBeLessThan(200)
      const text = serializeFilter(doc)
      expect(text.length - SEMI.length).toBeLessThan(120_000)
      expect(validateFilter(parseFilter(text)).map(p => p.message)).toEqual([])
    }
  })

  it('normalizes saved settings, the first beta\'s too', () => {
    expect(normalizeCurrency(undefined)).toEqual(defaultCurrency())
    const old = normalizeCurrency({ on: true, line: 99, normal: 50, big: 10, supplies: { 'Chaos Orb': 3, 'bad': -1, 'x"y': 2 }, pins: ['Scroll of Wisdom', 7] } as never)
    expect(old).toMatchObject({ on: true, line: 0.2, from: [50, 50, 50, 60], items: { 'Chaos Orb': { supply: 3 }, 'Scroll of Wisdom': { supply: 1 } } })
    const c = normalizeCurrency({ from: [5, 2, 40, 90], nudge: { orbs: 2, oils: 9, Bad: 1, ess: 0 }, items: { 'Divine Orb': { step: 9, price: -1 }, 'Golden Oil': { step: 4, look: { fontSize: 40 } }, 'x"y': { step: 1 } } } as never)
    expect(c.from).toEqual([5, 5, 40, 90])
    expect(c.nudge).toEqual({ orbs: 2 })
    expect(c.items).toEqual({ 'Golden Oil': { step: 4, look: { fontSize: 40 } } })
  })
})
