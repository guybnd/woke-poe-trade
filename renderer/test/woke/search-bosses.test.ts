// Search palette boss cards and "where it drops".
import { describe, it, expect } from 'vitest'
import { bossLookup, dropLookup, droppedBy, entryCost, lootPerKill } from '@/web/woke/search/lookups/bosses'
import { BOSSES } from '@/web/woke/boss-runs/bosses'
import { BOSS_RUNS_TYPE } from '@/web/woke/boss-runs/widget'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const PRICES: Record<string, number> = { 'Reality Fragment': 100, 'Progenesis': 2000, "Viridi's Veil": 10, 'Impossible Escape': 50 }
const ctx = (over: Partial<LookupContext> = {}): LookupContext => ({
  price: (n, v) => v === '1' && n === 'Awakened Enlighten Support' ? 30000 : PRICES[n] ?? null,
  tools: new Set([BOSS_RUNS_TYPE]),
  divine: 200,
  now: 0,
  league: null,
  ...over
})
const maven = BOSSES.find(b => b.id === 'uber-maven')!

describe('boss maths', () => {
  it('adds up the entry', () => {
    expect(entryCost(maven, ctx())).toBe(400)
    expect(entryCost(maven, ctx({ price: () => null }))).toBeNull()
  })
  it('counts known rates at the drop variant, and skips rolled jewels', () => {
    const loot = lootPerKill(maven, ctx())!
    // Enlighten lvl 1, Progenesis, Viridi's Veil; Impossible Escape is variable.
    expect(loot).toBeCloseTo(0.0081 * 30000 + 0.0170 * 2000 + 0.5207 * 10, 5)
  })
})

describe('bossLookup', () => {
  it('finds a boss by name and by its fragment', () => {
    expect(bossLookup('uber maven', ctx()).map(c => c.name)[0]).toBe('Uber Maven')
    expect(bossLookup('reality frag', ctx()).map(c => c.name)).toContain('Uber Maven')
    expect(bossLookup('mageblood', ctx())).toEqual([])
  })
  it('shows entry, drops by price and Boss runs first', () => {
    const [card] = bossLookup('uber maven', ctx())
    expect(card.sub).toBe('Boss · entry 400 c')
    const drops = card.sections.find(s => s.label?.includes('drops'))!.rows!
    expect(drops[0].label).toBe('Awakened Enlighten Support · 0.81%')
    expect(card.actions[0]).toEqual({ label: 'Open Boss runs', tool: BOSS_RUNS_TYPE })
    const noTool = bossLookup('uber maven', ctx({ tools: new Set() }))[0]
    expect(noTool.actions.some(a => 'tool' in a)).toBe(false)
  })
})

describe('dropLookup', () => {
  it('names the bosses that drop an item', () => {
    expect(droppedBy('Progenesis').map(d => d.boss.id)).toContain('uber-maven')
    const [card] = dropLookup('progenesis', ctx())
    expect(card.name).toMatch(/^Progenesis drops from /)
    expect(card.sections[1].rows!.some(r => r.label.startsWith('Uber Maven · 1.7%'))).toBe(true)
  })
  it('needs the start of the name, and more than a word like "the"', () => {
    expect(dropLookup('genesis', ctx())).toEqual([])
    expect(dropLookup('the', ctx())).toEqual([])
    expect(bossLookup('the', ctx())).toEqual([])
  })
  it('prices the drop as the boss drops it', () => {
    const [card] = dropLookup('awakened enlighten', ctx())
    expect(card.sections[0].rows![0].chaos).toBe(30000)
    const [jewel] = dropLookup('impossible escape', ctx())
    expect(jewel.sections[0].rows![0].value).toBe('Depends on the roll')
  })
})
