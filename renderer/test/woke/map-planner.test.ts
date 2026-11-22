// Map mods' Planner: T17 mods by bonus, ticks, "at least k of n" in the stash
// search, and the trade query.
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadGameData } from '../helpers/game-data'
import { allAreaMods, allMapNames } from '@/web/woke/map-mods/data'
import type { MapBonusData } from '@/web/woke/map-mods/bonuses'
import { DEFAULT_PLANNER, atLeastTerms, isTicked, planRows, planStashSearch, planTradeQuery, toggled } from '@/web/woke/map-mods/planner'
import type { PlannerState } from '@/web/woke/map-mods/planner'

beforeAll(loadGameData)

const data = JSON.parse(readFileSync(join(__dirname, '../../public/data/map-bonuses.json'), 'utf8')) as MapBonusData

// Every way to pick `k` of `items`.
function subsets<T> (items: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (items.length < k) return []
  const [h, ...rest] = items
  return [...subsets(rest, k - 1).map(s => [h, ...s]), ...subsets(rest, k)]
}
// Does a map with these tokens pass the quoted terms (no ! terms)?
const passes = (terms: string[], have: Set<string>) => terms.every(t => t.slice(1, -1).split('|').some(x => have.has(x)))

describe('at least k of n', () => {
  it('passes exactly the maps with k or more', () => {
    const toks = ['a', 'b', 'c', 'd', 'e']
    for (const k of [1, 2, 3]) {
      const terms = atLeastTerms(toks, k)!
      for (let n = 0; n <= toks.length; n++) {
        for (const have of subsets(toks, n)) expect(passes(terms, new Set(have)), `${k} of ${have.join()}`).toBe(n >= k)
      }
    }
  })

  it('has no answer when there are fewer than k', () => {
    expect(atLeastTerms(['a'], 2)).toBeNull()
    expect(atLeastTerms(['a', 'b'], 0)).toEqual([])
  })
})

describe('planner rows', () => {
  it('lists T17 mods with more currency, best first', () => {
    const rows = planRows(data, 'currency')
    expect(rows[0]).toMatchObject({ key: 'of Defiance', value: 64, prefix: false })
    expect(rows.find(r => r.key === 'Fecund')).toMatchObject({ value: 47, prefix: true })
    expect(rows.every(r => r.mod.t.includes('t17') && r.tradeId)).toBe(true)
  })

  it('starts mods you rated avoid unticked, and a click flips any', () => {
    const rows = planRows(data, 'currency')
    const punishing = rows.find(r => r.key === 'Punishing')!
    const ratings = Object.fromEntries(punishing.matchers.map(m => [m, 'deadly' as const]))
    let state: PlannerState = { ...DEFAULT_PLANNER }
    expect(isTicked(punishing, state, ratings)).toBe(false)
    state = toggled(state, 'Punishing', false)
    expect(isTicked(punishing, state, ratings)).toBe(true)
    state = toggled(state, 'Punishing', true)
    expect(isTicked(punishing, state, {})).toBe(false)
  })
})

describe('planner searches', () => {
  let rows: ReturnType<typeof planRows> = []
  beforeAll(() => { rows = planRows(data, 'currency') })
  // Mods with short stash tokens: the search only fits for a few.
  const pick = ['Fecund', 'Ultimate', 'of Imbibing', 'of the Juggernaut']
  const ticked = new Set(pick)

  it('builds a stash search that fits for 2 of 4, with a suffix and a total', () => {
    const s = planStashSearch(rows, ticked, { ...DEFAULT_PLANNER, need: 2, suf: 1, total: 100 }, allAreaMods(), allMapNames())
    expect(s.problem).toBeUndefined()
    expect(s.tooLong).toBe(false)
    // 4 terms for 2-of-4, 1 for the suffixes, the avoided rest, the total.
    expect(s.text.match(/"[^"]*"/g)!.length).toBe(7)
    expect(s.text).toContain('"!')
    expect(s.text).toContain('"ncy: .')
    for (const k of pick) expect(s.tokens[k], k).toBeTruthy()
  })

  it('says when the counts can\'t be met, and when it is too long', () => {
    expect(planStashSearch(rows, new Set(['Fecund']), { ...DEFAULT_PLANNER, need: 2 }, allAreaMods(), allMapNames()).problem).toBe('Tick at least 2 mods.')
    const many = new Set(rows.map(r => r.key))
    expect(planStashSearch(rows, many, { ...DEFAULT_PLANNER, need: 3 }, allAreaMods(), allMapNames()).tooLong).toBe(true)
  })

  it('trade query counts the ticked mods on T17 maps', () => {
    const q = planTradeQuery(rows, ticked, { ...DEFAULT_PLANNER, need: 2, pre: 1, total: 100 })
    expect(q.filters.map_filters.filters.map_tier).toEqual({ min: 17, max: 17 })
    const [count, pre, not, total] = q.stats
    expect(count).toMatchObject({ type: 'count', value: { min: 2 } })
    expect(count.filters).toHaveLength(4)
    expect(pre).toMatchObject({ type: 'count', value: { min: 1 } })
    expect(pre.filters).toHaveLength(2)
    expect(not.type).toBe('not')
    expect(total).toEqual({ type: 'and', filters: [{ id: 'pseudo.pseudo_map_more_currency_drops', value: { min: 100 } }] })
    expect(q.stats.reduce((n, s) => n + s.filters.length, 0)).toBeLessThanOrEqual(35)
  })
})
