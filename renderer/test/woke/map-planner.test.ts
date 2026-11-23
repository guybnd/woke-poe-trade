// Map mods' Planner: T17 mods by bonus, ticks, "at least k of n" in the stash
// search, and the trade query.
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadGameData } from '../helpers/game-data'
import { allMapNames } from '@/web/woke/map-mods/data'
import type { MapBonusData } from '@/web/woke/map-mods/bonuses'
import { DEFAULT_PLANNER, atLeastTerms, isTicked, planRows, planStashSearch, planTradeQuery, planUniverse, ratedAvoid, toggled } from '@/web/woke/map-mods/planner'
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
      const terms = atLeastTerms(toks, k) as string[]
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

describe('pack size goal', () => {
  it('lists the T17 mods with big pack size only', () => {
    const rows = planRows(data, 'p')
    expect(rows.length).toBeGreaterThan(5)
    expect(rows.every(r => r.value >= 10)).toBe(true)
    expect(rows[0].value).toBe(20)
  })

  it('searches trade by the map pack size filter, and still avoids rated mods left off the list', () => {
    const rows = planRows(data, 'p')
    const ticked = new Set(rows.map(r => r.key))
    const all = planRows(data, 'currency')
    const punishing = all.find(r => r.key === 'Punishing')!
    const ratings = Object.fromEntries(punishing.matchers.map(m => [m, 'deadly' as const]))
    const avoid = ratedAvoid(data, rows, ratings)
    expect(avoid.map(r => r.key)).toEqual(['Punishing'])
    const q = planTradeQuery(rows, ticked, { ...DEFAULT_PLANNER, goal: 'p', need: 1, total: 40 }, avoid)!
    expect(q.filters.map_filters.filters).toEqual({ map_tier: { min: 17, max: 17 }, map_packsize: { min: 40 } })
    expect(q.stats.some(s => s.filters.some(f => f.id.startsWith('item.')))).toBe(false)
    expect(q.stats.find(s => s.type === 'not')!.filters).toEqual([{ id: punishing.tradeId }])
    const s = planStashSearch(rows, ticked, { ...DEFAULT_PLANNER, goal: 'p', need: 1, total: 40 }, planUniverse(data), allMapNames(), avoid)
    expect(s.text).toContain('"ze: .')
    expect(s.text).toMatch(/"!/)
  })
})

describe('planner searches', () => {
  let rows: ReturnType<typeof planRows> = []
  beforeAll(() => { rows = planRows(data, 'currency') })
  // Mods with short stash tokens: the search only fits for a few.
  const pick = ['Fecund', 'Ultimate', 'of Imbibing', 'of the Juggernaut']
  const ticked = new Set(pick)

  it('builds a stash search that fits for 2 of 4, with a suffix and a total', () => {
    const s = planStashSearch(rows, ticked, { ...DEFAULT_PLANNER, need: 2, suf: 1, total: 100 }, planUniverse(data), allMapNames())
    expect(s.problem).toBeUndefined()
    expect(s.tooLong).toBe(false)
    // 4 terms for 2-of-4, 1 for the suffixes, the avoided rest, the total.
    expect(s.text.match(/"[^"]*"/g)!.length).toBe(7)
    expect(s.text).toContain('"!')
    expect(s.text).toContain('"ncy: .')
    for (const k of pick) expect(s.tokens[k], k).toBeTruthy()
  })

  it('uses longer text when there is room, and the shortest only when it must', () => {
    const one = planStashSearch(rows, new Set(['Fecund']), { ...DEFAULT_PLANNER, need: 1 }, planUniverse(data), allMapNames())
    expect(one.minToken).toBe(6)
    expect(one.tooLong).toBe(false)
    const six = new Set(['of Defiance', 'Fecund', 'Stalwart', 'Ultimate', 'of the Juggernaut', 'of Imbibing'])
    const tight = planStashSearch(rows, six, { ...DEFAULT_PLANNER, need: 2, total: 100 }, planUniverse(data), allMapNames())
    expect(tight.minToken).toBeLessThan(6)
    expect(tight.tooLong).toBe(false)
  })

  it('short T17-only tokens fit 2 of 6 with an avoid and a total', () => {
    const six = new Set(['of Defiance', 'Fecund', 'Stalwart', 'Ultimate', 'of the Juggernaut', 'of Imbibing'])
    const s = planStashSearch(rows, six, { ...DEFAULT_PLANNER, need: 2, total: 100 }, planUniverse(data), allMapNames())
    expect(s.tooLong).toBe(false)
    // Each token stays unique among T17 lines: it can't count another mod.
    const lines = planUniverse(data).map(l => l.toLowerCase())
    for (const [mod, tok] of Object.entries(s.tokens)) {
      const re = new RegExp(tok, 'i')
      const row = rows.find(r => r.key === mod)!
      const own = [...row.matchers, ...row.wordings].map(m => m.toLowerCase())
      expect(lines.filter(l => !own.includes(l) && re.test(l.replace(/#/g, '10'))), mod).toEqual([])
    }
  })

  it('says when the counts can\'t be met, and when it is too long', () => {
    expect(planStashSearch(rows, new Set(['Fecund']), { ...DEFAULT_PLANNER, need: 2 }, planUniverse(data), allMapNames()).problem).toBe('Tick at least 2 mods.')
    const many = new Set(rows.map(r => r.key))
    const long = planStashSearch(rows, many, { ...DEFAULT_PLANNER, need: 3 }, planUniverse(data), allMapNames())
    expect(long).toMatchObject({ tooLong: true, text: '' })
    // The trade search still works, and both refuse counts the ticks can't meet.
    expect(planTradeQuery(rows, many, { ...DEFAULT_PLANNER, need: 3 })).not.toBeNull()
    const twoSuffixes = new Set(['Fecund', 'of Imbibing'])
    expect(planTradeQuery(rows, twoSuffixes, { ...DEFAULT_PLANNER, need: 1, suf: 2 })).toBeNull()
    expect(planStashSearch(rows, twoSuffixes, { ...DEFAULT_PLANNER, need: 1, suf: 2 }, planUniverse(data), allMapNames()).problem).toBe('Tick at least 2 suffixes (1 ticked).')
  })

  it('trade query counts the ticked mods on T17 maps', () => {
    const q = planTradeQuery(rows, ticked, { ...DEFAULT_PLANNER, need: 2, pre: 1, total: 100 })
    expect(q!.filters.map_filters.filters.map_tier).toEqual({ min: 17, max: 17 })
    const [total, not, count, pre] = q!.stats
    expect(count).toMatchObject({ type: 'count', value: { min: 2 } })
    expect(count.filters).toHaveLength(4)
    expect(pre).toMatchObject({ type: 'count', value: { min: 1 } })
    expect(pre.filters).toHaveLength(2)
    expect(not.type).toBe('not')
    expect(total).toEqual({ type: 'and', filters: [{ id: 'pseudo.pseudo_map_more_currency_drops', value: { min: 100 } }] })
    expect(q!.stats.reduce((n, s) => n + s.filters.length, 0)).toBeLessThanOrEqual(35)
  })
})
