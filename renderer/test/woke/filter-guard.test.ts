// The loot filter guard: whatever presets you switch on, NeverSink's most
// valuable drops still show, still beep and still beam. Runs the editor's own
// save path (composeFilter) over NeverSink's real files, every strictness and
// a style, under every preset alone, the defaults and all at once, with
// prices as hostile as they get. Pairs and random mixes are in
// filter-guard-pairs and filter-guard-random; the plain-words summary is
// docs/loot-filter-guard.md (filter-guard-report.test.ts).
//
// The rule: a preset may only take away what it says it does. Quiet mode
// takes the sound of rules NeverSink ranks below your line, the beam preset
// their beam and icon. Nothing may hide a valuable drop, silence or un-beam
// it otherwise, or shrink its label.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import {
  FILTERS, PRECIOUS, SETUPS, allowedLoss, blockLook, breaches, compose, dropLook, facts, hostilePrices,
  isNeverSinkBlock, presets, source
} from '../helpers/filter-guard'
import type { Setup } from '../helpers/filter-guard'

const regular = FILTERS.find(f => f.name === '1-REGULAR')!.text

describe('NeverSink itself (what the guard compares with)', () => {
  describe.each(FILTERS)('$name', ({ name }) => {
    it.each(PRECIOUS)('$name shows, beeps and beams, from its own rule', p => {
      const look = dropLook(source(name), p.facts)
      if (p.hiddenIn?.includes(name)) { expect(look.shown).toBe(false); return }
      expect(look.rule).toBe(p.rule)
      expect(look).toMatchObject({ shown: true, sound: true, beam: true, icon: true })
      // The copy is sure: no earlier rule might catch it instead.
      const m = matchItem(source(name), facts(p.facts))
      expect(m.uncertain.map(u => `${u.block.type}/${u.block.tier}`)).toEqual([])
    })
  })
})

describe('every preset alone, the defaults, and all at once', () => {
  describe.each(FILTERS)('$name', ({ name, text }) => {
    it.each(SETUPS)('$name', s => {
      const { doc } = compose(text, s)
      expect(breaches(name, s, doc)).toEqual([])
      // And the game would load it.
      expect(validateFilter(doc).map(p => p.message)).toEqual([])
    })
  })
})

describe('what a preset may take away, it takes away as it says', () => {
  const sacred = PRECIOUS.find(p => p.name === 'Sacred Orb')!
  const quiet = (keepTiers: number): Setup => ({ name: `quiet ${keepTiers}`, presets: presets({ quiet: { on: true, keepTiers } }) })

  it('quiet mode at 1 tier silences NeverSink\'s second currency tier, and leaves its beam', () => {
    expect(allowedLoss(quiet(1), 2).sound).toBe(true)
    expect(dropLook(compose(regular, quiet(1)).doc, sacred.facts)).toMatchObject({ shown: true, sound: false, beam: true })
  })

  it('quiet mode at 2 tiers keeps it', () => {
    expect(dropLook(compose(regular, quiet(2)).doc, sacred.facts)).toMatchObject({ shown: true, sound: true, beam: true })
  })

  it('quiet mode does quiet something: rules ranked 3 and lower', () => {
    const before = source('1-REGULAR').blocks
    const quieted = compose(regular, quiet(2)).doc.blocks.filter(isNeverSinkBlock).filter((b, i) => blockLook(before[i]).sound && !blockLook(b).sound)
    expect(quieted.length).toBeGreaterThan(50)
  })

  it('the 6-socket rule still catches a plain 6-socket item, below NeverSink\'s 6-links', () => {
    const doc = compose(regular, { name: '6s', presets: presets({ sixSockets: { on: true } }), build: false }).doc
    const garb = { itemClass: 'Body Armours', baseType: "Assassin's Garb", rarity: 'Rare' as const, itemLevel: 84, width: 2, height: 3 }
    expect(dropLook(doc, { ...garb, socketGroups: ['RG', 'B', 'R', 'GB'] }).rule).toBe('woke->preset/sixsockets')
    expect(dropLook(doc, { ...garb, socketGroups: ['RRGGBB'] }).rule).toBe('6l/hightier')
  })

  // Uber+ ships NeverSink's own 6-socket tier switched off; it still marks the place.
  it.each(['1-REGULAR', '6-UBER-PLUS-STRICT'])('%s: a plain 6-socket weapon of another build still shows while levelling', name => {
    const text = FILTERS.find(f => f.name === name)!.text
    const s: Setup = { name: '6s + weapons', presets: presets({ sixSockets: { on: true }, weapons: { on: true, archetype: 'bow', classes: [] } }) }
    const doc = compose(text, s).doc
    for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
      for (const areaLevel of [20, 50, 83]) {
        const staff = { itemClass: 'Staves', baseType: 'Long Staff', rarity, itemLevel: areaLevel, areaLevel, socketGroups: ['RG', 'B', 'R', 'GB'], width: 2, height: 4 }
        expect(dropLook(doc, staff), `${rarity} at ${areaLevel}`).toMatchObject({ shown: true, rule: 'woke->preset/sixsockets' })
      }
    }
  })
})

describe('hostile and missing prices', () => {
  const harsh: Setup = { name: 'harshest', presets: presets({ cheapCurrency: { on: true, chaos: 50 }, cheapCards: { on: true, chaos: 50 }, cheapUniques: { on: true, chaos: 50 }, cheapSplinters: { on: true, chaos: 50 } }) }

  it('with no prices at all, no price preset hides anything', () => {
    const doc = compose(regular, harsh, { lookup: null, safety: null, breakdown: null, pricedTypes: null }).doc
    expect(doc.blocks.filter(b => b.type === 'woke->preset')).toEqual([])
  })

  // Open: the price presets trust poe.ninja, and the safety net reads the same
  // prices, so a Divine listed at 0.5c would be hidden by a 1c currency line.
  // Pinned as it is today, so a fix shows up here (see docs/loot-filter-guard.md,
  // Open): turn this round once a guard keeps red-beam drops out of the price presets.
  it('known gap: a wrong price still hides a red-beam drop', () => {
    const s: Setup = { name: 'crashed price', netOn: true, presets: presets({ cheapCurrency: { on: true, chaos: 1 } }) }
    const doc = compose(regular, s, hostilePrices({ 'Divine Orb': 0.5 })).doc
    expect(dropLook(doc, PRECIOUS.find(p => p.name === 'Divine Orb')!.facts)).toMatchObject({ shown: false, rule: 'woke->preset/cheapcurrency' })
  })

  it('with thin (unreliable) prices, nothing is hidden for being cheap', () => {
    const thin = hostilePrices()
    const lookup = thin.lookup!
    thin.lookup = (g, base) => ({ ...lookup(g, base)!, thin: true })
    thin.breakdown = () => [{ name: 'x', chaos: 0.01, thin: true }]
    const doc = compose(regular, harsh, thin).doc
    expect(doc.blocks.filter(b => b.type === 'woke->preset' && b.visibility === 'Hide')).toEqual([])
  })
})

describe('your own edits, and the safety net', () => {
  const divine = PRECIOUS.find(p => p.name === 'Divine Orb')!
  const hideTop = { id: 1, type: 'currency', kind: 'visibility' as const, tier: 't1exalted', visibility: 'Hide' as const }

  it('hiding NeverSink\'s top currency tier yourself hides Divines when the net is off (your call)', () => {
    const doc = compose(regular, { name: 'edit', presets: defaultPresets(), edits: [hideTop] }).doc
    expect(dropLook(doc, divine.facts).shown).toBe(false)
  })

  it('the safety net brings them back, loud, even with every preset at its harshest', () => {
    for (const p of [defaultPresets(), SETUPS.find(s => s.name === 'Every preset, harshest settings')!.presets]) {
      const doc = compose(regular, { name: 'edit + net', presets: p, edits: [hideTop], netOn: true }).doc
      expect(dropLook(doc, divine.facts)).toMatchObject({ shown: true, sound: true, beam: true, icon: true, rule: 'woke->safety/items' })
    }
  })
})

describe('the file itself', () => {
  describe.each(FILTERS)('$name', ({ text }) => {
    it('with nothing switched on, the saved file is NeverSink\'s, byte for byte', () => {
      expect(serializeFilter(compose(text, { name: 'none', presets: defaultPresets(), build: false }).doc)).toBe(text)
    })

    it.each(SETUPS.filter(s => s.name.startsWith('Every preset')))('$name: it reads back the same', s => {
      const out = serializeFilter(compose(text, s).doc)
      const again = parseFilter(out)
      expect(serializeFilter(again)).toBe(out)
      expect(validateFilter(again).map(p => p.message)).toEqual([])
    })
  })
})
