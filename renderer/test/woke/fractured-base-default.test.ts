// Guy (2026-11-16): a fractured item is priced as a base, so its base type
// filter starts ticked. Other rares keep the category (generic) search.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }
const SHIELD = 'items/rare-shield-fractured-res.txt'

function relaxed (text: string) {
  const { active, presets } = createPresets(parseItem(text), OPTS)
  return presets.find(p => p.id === active)!.filters.searchRelaxed
}

describe('fractured item base type default', () => {
  beforeAll(loadGameData)

  it('ticks base type on a fractured item', () => {
    expect(relaxed(fixture(SHIELD))?.disabled).toBe(true)
  })

  it('leaves the same item unfractured on the category search', () => {
    const text = fixture(SHIELD)
      .replace(/\n-+\nFractured Item\s*$/, '\n')
      .replace(/\{ Fractured (Prefix|Suffix) Modifier/g, '{ $1 Modifier')
      .replace(/ \(fractured\)/g, '')
    const item = parseItem(text)
    expect(item.isFractured).toBeFalsy()
    expect(relaxed(text)?.disabled).toBe(false)
  })
})

// Guy (2026-11-16): an overquality item starts as just its base, its quality
// and its item level; mods off.
describe('overquality item defaults', () => {
  beforeAll(loadGameData)

  const unfractured = (text: string) => text
    .replace(/\n-+\nFractured Item\s*$/, '\n')
    .replace(/\{ Fractured (Prefix|Suffix) Modifier/g, '{ $1 Modifier')
  const withQuality = (text: string, q: number) =>
    text.replace('Chance to Block: 26%\n', `Chance to Block: 26%\nQuality: +${q}% (augmented)\n`)

  function active (text: string) {
    const { active, presets } = createPresets(parseItem(text), OPTS)
    return presets.find(p => p.id === active)!
  }

  it('ticks base, quality and item level, and unticks every mod', () => {
    const p = active(withQuality(unfractured(fixture(SHIELD)), 23))
    expect(p.filters.searchRelaxed?.disabled).toBe(true)
    expect(p.filters.quality).toMatchObject({ value: 23, disabled: false })
    expect(p.filters.itemLevel).toMatchObject({ value: 73, disabled: false })
    const ticked = p.stats.filter(s => !s.group && !s.disabled)
    expect(ticked).toEqual([])
  })

  it('keeps a fractured item\'s fractured mod ticked', () => {
    const p = active(withQuality(fixture(SHIELD), 23))
    const ticked = p.stats.filter(s => !s.group && !s.disabled)
    expect(ticked.map(s => !s.group && s.fracLead)).toEqual([true])
  })

  it('leaves 20% quality alone', () => {
    const p = active(withQuality(unfractured(fixture(SHIELD)), 20))
    expect(p.filters.searchRelaxed?.disabled).toBe(false)
    expect(p.filters.itemLevel?.disabled).toBe(true)
    expect(p.stats.some(s => !s.group && !s.disabled)).toBe(true)
  })
})
