import { describe, expect, it } from 'vitest'
import { nextTourStep, targetsOf, tourPlace } from '@/web/woke/shared/tour'
import { ALTF_TOUR_STEPS, FILTER_TOUR_STEPS, HELP_TILES } from '@/web/woke/loot-filter/filter-tour'

const has = (ids: string[]) => (s: { id: string }) => ids.includes(s.id)
const text = (s: { text: readonly unknown[] }) => s.text.map(b => typeof b === 'string' ? b : (b as { text?: string, kbd?: string }).text ?? (b as { kbd: string }).kbd).join('')

describe('loot filter tour', () => {
  it('goes All loot, section rulers, steps, section choice, Gear, Preview', () => {
    expect(FILTER_TOUR_STEPS.map(s => s.id)).toEqual(['all', 'section', 'steps', 'mode', 'gear', 'preview'])
  })

  it('skips a step whose target is not on screen', () => {
    const all = FILTER_TOUR_STEPS.map(s => s.id)
    expect(nextTourStep(FILTER_TOUR_STEPS, 0, has(all))).toBe(0)
    // Gold has no page ruler: All loot, then steps.
    expect(nextTourStep(FILTER_TOUR_STEPS, 1, has(all.filter(id => id !== 'section')))).toBe(2)
    expect(nextTourStep(FILTER_TOUR_STEPS, 5, has(all))).toBe(5)
    expect(nextTourStep(FILTER_TOUR_STEPS, 6, has(all))).toBe(-1)
    expect(nextTourStep(FILTER_TOUR_STEPS, 3, has(['all']))).toBe(-1)
  })

  it('counts its place among the steps this window has', () => {
    const all = FILTER_TOUR_STEPS.map(s => s.id)
    expect(tourPlace(FILTER_TOUR_STEPS, 0, has(all), new Set())).toEqual({ at: 1, of: 6 })
    expect(tourPlace(FILTER_TOUR_STEPS, 2, has(all.filter(id => id !== 'section')), new Set(['all']))).toEqual({ at: 2, of: 5 })
    // A step already passed still counts once it's gone (another tab).
    expect(tourPlace(FILTER_TOUR_STEPS, 4, has(['gear', 'preview']), new Set(['all', 'section', 'steps', 'mode']))).toEqual({ at: 5, of: 6 })
  })

  it('tries each of a step\'s targets', () => {
    expect(targetsOf(FILTER_TOUR_STEPS[0])).toEqual(['[data-loot-all]'])
    expect(targetsOf(FILTER_TOUR_STEPS[2])).toHaveLength(2)
  })

  it('keeps every card to a line or two', () => {
    for (const s of [...FILTER_TOUR_STEPS, ...ALTF_TOUR_STEPS]) expect(text(s).length, s.id).toBeLessThanOrEqual(140)
    for (const t of HELP_TILES) expect(t.text.length, t.id).toBeLessThanOrEqual(100)
  })
})

describe('Alt+F tour', () => {
  it('goes rule path, needle, Ctrl+Z, and skips a card with no needle', () => {
    expect(ALTF_TOUR_STEPS.map(s => s.id)).toEqual(['path', 'needle', 'undo'])
    // Always hide: no ruler on the card.
    expect(nextTourStep(ALTF_TOUR_STEPS, 1, has(['path', 'undo']))).toBe(2)
  })

  it('finds the rule path on the Loot card and the rare card', () => {
    const path = targetsOf(ALTF_TOUR_STEPS[0])
    expect(path.some(t => t.includes('data-currency-card-rule'))).toBe(true)
    expect(path.some(t => t.includes('data-score-rule'))).toBe(true)
  })
})

describe('How the filter works', () => {
  it('has a tile per part, each with somewhere to show', () => {
    expect(HELP_TILES.map(t => t.name)).toEqual(['All loot', 'Section rulers', 'Steps', 'Section choice', 'Alt+F', 'Gear', 'Preview'])
    for (const t of HELP_TILES) expect('sample' in t.show || t.show.at.length > 0).toBe(true)
  })
})
