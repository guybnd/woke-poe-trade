// Search palette Blight ring anoints, on the real stat data.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ringAnointLookup, ringAnoints, anointText } from '@/web/woke/search/lookups/rings'
import { oilNames } from '@/web/price-check/filters/pseudo/anointments'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const stats = readFileSync(join(__dirname, '../../public/data/en/stats.ndjson'), 'utf8')
  .split('\n').filter(Boolean).map(l => JSON.parse(l)).flatMap(s => s.stats ?? [s])
const list = ringAnoints(stats, oilNames)
const lookup = ringAnointLookup(list)
const PRICES: Record<string, number> = { 'Amber Oil': 2, 'Golden Oil': 40, 'Clear Oil': 1, 'Opalescent Oil': 10 }
const ctx = { price: (n: string) => PRICES[n] ?? null } as unknown as LookupContext

describe('ringAnoints', () => {
  it('reads every ring recipe, and no amulet ones', () => {
    // poedb's Anoint Rings list has 91.
    expect(list).toHaveLength(91)
    expect(list.every(r => r.oils.length === 2)).toBe(true)
    expect(list.some(r => r.text.startsWith('Allocates'))).toBe(false)
  })
  it('writes the numbers as the game does (checked on poedb)', () => {
    const texts = list.map(r => `${r.oils.join(' + ')}: ${r.text}`)
    expect(texts).toContain('Amber Oil + Golden Oil: Your Arc Towers have 3 additional chains')
    expect(texts).toContain('Sepia Oil + Opalescent Oil: Your Fireball Towers fire an additional 2 Projectiles')
    expect(texts).toContain('Opalescent Oil + Golden Oil: Your Fireball Towers fire an additional 8 Projectiles')
    expect(texts).toContain('Teal Oil + Golden Oil: Your Temporal Towers also grant you 20% increased action speed')
    expect(texts).toContain('Opalescent Oil + Opalescent Oil: Your Smothering Towers also grant 20% reduced Movement Speed')
    expect(texts).toContain('Verdant Oil + Opalescent Oil: Your Meteor Towers drop an additional Meteor')
    expect(texts).toContain('Clear Oil + Opalescent Oil: Enemies inside Glacial Cage take 10% increased Damage')
    expect(list.some(r => r.text.includes('#') || r.text.includes('  '))).toBe(false)
  })
  it('fills a negative roll into the negated line', () => {
    const stat = { ref: 'x', matchers: [{ string: 'Has #% increased Delay' }, { string: 'Has #% reduced Delay', negate: true as const }] }
    expect(anointText(stat, -25)).toBe('Has 25% reduced Delay')
    expect(anointText(stat, 25)).toBe('Has 25% increased Delay')
  })
})

describe('ringAnointLookup', () => {
  it('finds a tower anoint with its two oils, prices and total', () => {
    const [card] = lookup('arc tower chains', ctx)
    expect(card.name).toBe('Your Arc Towers have 3 additional chains')
    expect(card.sub).toBe('Blight ring anoint · Amber + Golden')
    const rows = card.sections[1].rows!
    expect(rows.map(r => [r.label, r.chaos])).toEqual([['Amber Oil', 2], ['Golden Oil', 40], ['Total', 42]])
  })
  it('lists a whole tower, and takes "ring anoint" words', () => {
    expect(lookup('arc tower', ctx).length).toBe(5)
    expect(lookup('ring anoint glacial cage', ctx).length).toBeGreaterThan(1)
    expect(lookup('blight ring meteor', ctx).every(c => c.name.includes('Meteor'))).toBe(true)
  })
  it('finds Glacial Cage enchants with no "tower" in them', () => {
    expect(lookup('glacial cage tower', ctx).map(c => c.name)).toContain('Enemies inside Glacial Cage take 10% increased Damage')
  })
  it("takes English words on other languages' data", () => {
    const ru = readFileSync(join(__dirname, '../../public/data/ru/stats.ndjson'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l)).flatMap(s => s.stats ?? [s])
    const cards = ringAnointLookup(ringAnoints(ru, oilNames))('arc tower chains', ctx)
    expect(cards[0].sub).toBe('Blight ring anoint · Amber + Golden')
  })
  it('stays out of a plain gem or word search', () => {
    expect(lookup('fireball', ctx)).toEqual([])
    expect(lookup('increased damage', ctx)).toEqual([])
    expect(lookup('ring', ctx)).toEqual([])
    expect(lookup('tower', ctx)).toEqual([])
    expect(lookup('ring life', ctx)).toEqual([])
    expect(lookup('ring anoint', ctx)).toEqual([])
    expect(ringAnointLookup(null)('arc tower', ctx)).toEqual([])
  })
})
