// The farming goal on map price checks (Guy's pick, veteran review 2026-11-24):
// which numbers start in the trade search, the Planner's goal, and the
// Ctrl+Space card that explains it.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const config = { widgets: [] as Array<Record<string, unknown>>, woke: { off: [] as string[] } }
vi.mock('@/web/Config', () => ({ AppConfig: () => config }))

const { FARM_GOALS, GOAL_KEYS, RAISES, goalAddsExtra, goalDisabled, plannerGoalFor } = await import('@/web/woke/map-mods/goal')
const { farmGoal, setFarmGoal } = await import('@/web/woke/map-mods/goal-config')
const { mapBonusLookup } = await import('@/web/woke/search/lookups/map-bonus')

const ctx = { price: () => null, items: [], tools: new Set(['woke-map-mods']), divine: 100, now: 0, league: null }

beforeEach(() => {
  config.widgets = [{ wmType: 'woke-map-mods' }]
  config.woke.off = []
})

describe('farming goal', () => {
  it('is Any until picked, and remembered on the Map mods window', () => {
    expect(farmGoal()).toBe('any')
    setFarmGoal('atlas')
    expect(config.widgets[0].goal).toBe('atlas')
    expect(farmGoal()).toBe('atlas')
  })
  it('is Any with the Map mods module off, or a bad value saved', () => {
    config.widgets[0].goal = 'atlas'
    config.woke.off = ['map-mods']
    expect(farmGoal()).toBe('any')
    config.woke.off = []
    config.widgets[0].goal = 'nonsense'
    expect(farmGoal()).toBe('any')
  })
  it('Any keeps the chips as they always started', () => {
    expect(goalDisabled('Drops', 'any')).toBe(false)
    expect(goalDisabled('Rarity', 'any')).toBe(false)
    expect(goalDisabled('Pack', 'any')).toBe(false)
    expect(goalDisabled('Currency', 'any')).toBe(false)
    expect(goalDisabled('Threads', 'any')).toBe(false)
    expect(goalDisabled('Maps', 'any')).toBe(true)
    expect(goalDisabled('Div cards', 'any')).toBe(false)
    expect(goalDisabled('Quant', 'any')).toBeUndefined()
  })
  it('currency turns on Rarity, Pack and More Currency only', () => {
    const LABELS = ['Drops', 'Rarity', 'Pack', 'Currency', 'Threads', 'Maps', 'Div cards']
    const on = LABELS.filter(l => goalDisabled(l, 'currency') === false).sort()
    expect(on).toEqual(['Currency', 'Pack', 'Rarity'])
  })
  it('maps and Threads turn on Pack, More Maps and More Threads; Atlas Drops on too', () => {
    const LABELS = ['Drops', 'Rarity', 'Pack', 'Currency', 'Threads', 'Maps', 'Div cards']
    const on = LABELS.filter(l => goalDisabled(l, 'atlas') === false).sort()
    expect(on).toEqual(['Drops', 'Maps', 'Pack', 'Threads'])
    expect(GOAL_KEYS.atlas).toContain('Drops')
  })
  it('adds the More X numbers it wants that the map has not got, and only those', () => {
    const MORE = ['Currency', 'Threads', 'Maps']
    expect(MORE.filter(l => goalAddsExtra(l, 'currency'))).toEqual(['Currency'])
    expect(MORE.filter(l => goalAddsExtra(l, 'atlas')).sort()).toEqual(['Maps', 'Threads'])
    expect(MORE.filter(l => goalAddsExtra(l, 'any'))).toEqual([])
    // Each goal's More X numbers are ones it rings.
    for (const g of FARM_GOALS) for (const l of MORE) if (goalAddsExtra(l, g)) expect(GOAL_KEYS[g]).toContain(l)
    // Drops, Rarity and Pack missing means a plain map: never added.
    for (const l of ['Drops', 'Rarity', 'Pack', 'Quant', 'Div cards']) expect(goalAddsExtra(l, 'currency')).toBeUndefined()
  })
  it('every chip says what it raises, and the Planner follows the goal', () => {
    for (const label of ['Drops', 'Rarity', 'Pack', 'Currency', 'Threads', 'Maps', 'Div cards']) expect(RAISES[label], label).toBeTruthy()
    expect(RAISES.Drops).toMatch(/not currency/)
    expect(FARM_GOALS).toEqual(['currency', 'atlas', 'any'])
    expect(plannerGoalFor('currency')).toBe('currency')
    expect(plannerGoalFor('atlas')).toBe('maps')
    expect(plannerGoalFor('any')).toBeNull()
  })
})

describe('Ctrl+Space farming goal card', () => {
  const lookup = mapBonusLookup(null)
  it('answers "farming goal", "atlas drops" and "farm currency", even before the bonus data loads', () => {
    for (const q of ['farming goal', 'atlas drops', 'Farm currency', 'map goal', 'what does atlas drops do?']) {
      expect(lookup(q, ctx).map(c => c.id), q).toEqual(['map-goal'])
    }
    expect(lookup('goal', ctx)).toEqual([])
    const card = lookup('atlas drops', ctx)[0]
    expect(JSON.stringify(card.sections)).toMatch(/not currency/)
    expect(card.actions[0]).toEqual({ label: 'Open Map mods', tool: 'woke-map-mods' })
  })
})
