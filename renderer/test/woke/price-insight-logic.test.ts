// The price check's pure logic: fixing flags, source blend, history, price log
// and mod worth (was renderer/scripts/price-insight-check, run by hand).
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import assert from 'node:assert/strict'
import { test } from 'vitest'
import { buildInsight, InsightListing } from '@/web/woke/price-insight/insight'
import { buildBlend, headlinePrice } from '@/web/woke/price-insight/sources'
import { ninjaWeek, leagueSeries, chartGeometry, seriesChange } from '@/web/woke/price-insight/history'
import { estimateWorth, valueChanges, matchStat, worthBand } from '@/web/woke/price-insight/mod-worth'
import { addLogEntry, previousCheck } from '@/web/woke/price-insight/price-log'

test('price check pure logic: fixing flags, blend, history, price log, mod worth', () => {
const NOW = Date.parse('2026-11-04T12:00:00Z')
const H = 3600_000
let n = 0
function L (chaos: number, o: Partial<InsightListing> = {}): InsightListing {
  n++
  return { id: 'l' + n, priceAmount: chaos, priceCurrency: 'chaos', indexedAt: new Date(NOW - 5 * H).toISOString(), hasNote: true, hasFee: false, isMine: false, accountName: 'acc' + n, accountStatus: 'online', listedTimes: 1, ...o }
}
const opts = { divine: 180, now: NOW }

// clean market: no flags
{
  const ins = buildInsight([42, 45, 48, 50, 52, 55, 58, 60].map(c => L(c)), opts)
  assert.equal(ins.risk, 'none'); assert.equal(ins.dropped.size, 0); assert.equal(ins.confidence, 'high')
  assert.equal(ins.prices.size, 8)
}
// wall: one seller with 6 copies at 8c
{
  const wall = L(8, { accountName: 'cheap', listedTimes: 6 })
  const ins = buildInsight([wall, L(42), L(45), L(48), L(50), L(52)], opts)
  assert.equal(ins.dropped.get(wall.id), 'wall')
  assert.equal(ins.risk, 'high')
  assert.ok(ins.signals.some(s => s.kind === 'wall' && s.text.includes('6 copies')))
  assert.equal(ins.range!.low, 42)
}
// bulk seller slightly cheaper is NOT a wall
{
  const bulk = L(38, { accountName: 'bulk', listedTimes: 5 })
  const ins = buildInsight([bulk, L(42), L(45), L(48), L(50)], opts)
  assert.equal(ins.dropped.size, 0)
}
// fresh dump: 3 listings at 5c from different accounts within the hour
{
  const fresh = (c: number) => L(c, { indexedAt: new Date(NOW - 10 * 60_000).toISOString() })
  const d = [fresh(5), fresh(6), fresh(5)]
  const ins = buildInsight([...d, L(40), L(42), L(45), L(48)], opts)
  for (const x of d) assert.equal(ins.dropped.get(x.id), 'dump')
  assert.equal(ins.risk, 'high')
  assert.equal(ins.range!.low, 40)
}
// a single fresh cheap listing is just bait
{
  const one = L(5, { indexedAt: new Date(NOW - 10 * 60_000).toISOString() })
  const ins = buildInsight([one, L(40), L(42), L(45), L(48)], opts)
  assert.equal(ins.dropped.get(one.id), 'fixer'); assert.equal(ins.risk, 'low')
}
// thin market
{
  const ins = buildInsight([L(40, { accountName: 'a' }), L(42, { accountName: 'a' })], opts)
  assert.equal(ins.risk, 'low'); assert.ok(ins.signals.some(s => s.kind === 'thin'))
}

// blend
{
  const ins = buildInsight([42, 45, 48, 50, 52, 55, 58, 60].map(c => L(c)), opts)
  const b = buildBlend({ insight: ins, ninja: { chaos: 49, gaps: 0 }, poeprices: { min: 40, max: 60, confidence: 80 }, mine: { chaos: 55, ts: NOW - 2 * 24 * H }, now: NOW })
  assert.equal(b.points.length, 4); assert.equal(b.agreement, 'agree')
  assert.ok(b.fair! > 45 && b.fair! < 55, String(b.fair))
  assert.equal(headlinePrice(b, ins)!.from, 'listings')
  // ninja faked: thin + 3x away -> not counted
  const b2 = buildBlend({ insight: ins, ninja: { chaos: 150, gaps: 3 }, now: NOW })
  assert.equal(b2.ninjaSuspect, true); assert.equal(b2.points.find(p => p.key === 'ninja')!.weight, 0)
  // no listings: headline from other sources
  const empty = buildInsight([], opts)
  const b3 = buildBlend({ insight: empty, ninja: { chaos: 30, gaps: 0 }, now: NOW })
  assert.equal(headlinePrice(b3, empty)!.chaos, 30); assert.equal(headlinePrice(b3, empty)!.from, 'blend')
  // old own check ignored
  const b4 = buildBlend({ insight: ins, mine: { chaos: 10, ts: NOW - 30 * 24 * H }, now: NOW })
  assert.equal(b4.points.find(p => p.key === 'mine')!.weight, 0)
}

// history
{
  const w = ninjaWeek(100, [0, 5, null, 10, 12, 15, 20], NOW)
  assert.equal(w.length, 6); assert.equal(w[w.length - 1].chaos, 100)
  assert.ok(Math.abs(w[0].chaos - 100 / 1.2) < 1e-9)
  assert.ok(seriesChange(w)! > 0.19 && seriesChange(w)! < 0.21)
  const rows = [
    { league: 'X', date: '2026-11-01', type: 'T', name: 'n', variant: '', chaos: 10, divine: 180, ts: NOW - 3 * 24 * H },
    { league: 'X', date: '2026-11-02', type: 'T', name: 'n', variant: '', chaos: 12, divine: 180, ts: NOW - 2 * 24 * H },
    { league: 'X', date: '2026-11-04', type: 'T', name: 'n', variant: '', chaos: 14, divine: 180, ts: NOW - H }
  ]
  const ls = leagueSeries(rows, { chaos: 15, ts: NOW })
  assert.equal(ls.length, 3); assert.equal(ls[2].chaos, 15)
  const g = chartGeometry(ls, 400, 120)!
  assert.ok(g.dots.every(d => d.x >= 34 && d.x <= 394 && d.y >= 6 && d.y <= 104))
  assert.equal(chartGeometry([ls[0]], 400, 120), null)
}

// price log
{
  const e = (ts: number, fair: number) => ({ key: 'k', league: 'X', label: 'Ring', ts, fair, low: fair, high: fair, n: 5 })
  let list = addLogEntry(e(NOW - 3 * 24 * H, 40), [])
  list = addLogEntry(e(NOW - 60_000, 50), list)
  list = addLogEntry(e(NOW, 52), list) // merges with the one a minute ago
  assert.equal(list.length, 2); assert.equal(list[1].fair, 52)
  assert.equal(previousCheck('k', NOW, list)!.fair, 40)
}

// mod worth
{
  const stat = (statRef: string, text: string, value: number, bmin: number, bmax: number, goodness = 0.5) => ({
    tradeId: [statRef], statRef, text, tag: 'explicit', sources: [], disabled: false,
    roll: { value, min: value, max: undefined, default: { min: value, max: value }, bounds: { min: bmin, max: bmax }, dp: false, isNegated: false, goodness, better: 1 as const }
  }) as any
  const stats = [
    stat('+# to maximum Life', '+# to maximum Life', 78, 70, 79),
    stat('+#% to Cold Resistance', '+#% to Cold Resistance', 44, 42, 45),
    stat('+# to Strength', '+# to Strength', 31, 28, 32)
  ]
  assert.equal(matchStat('(pseudo) (total) +# to maximum Life', stats)!.statRef, '+# to maximum Life')
  assert.equal(matchStat('+#% to Fire Resistance', stats), null)
  const w = estimateWorth(stats, { explanation: [{ name: '+# to maximum Life', contrib: 60 }, { name: '+#% to Cold Resistance', contrib: 15 }], seed: [], fair: 50 })
  assert.equal(worthBand(w.get('+# to maximum Life')!), 'carry')
  assert.equal(worthBand(w.get('+#% to Cold Resistance')!), 'adds')
  assert.equal(worthBand(w.get('+# to Strength')!), 'nothing')
  assert.ok(Math.abs(w.get('+# to maximum Life')!.chaos! - 30) < 1e-9)
  const ch = valueChanges(stats, w)
  const life = ch.find(c => c.statRef === '+# to maximum Life')!
  assert.equal(life.min, 75); assert.equal(life.max, undefined)
  assert.equal(ch.find(c => c.statRef === '+#% to Cold Resistance')!.min, 42)
  assert.equal(ch.find(c => c.statRef === '+# to Strength')!.disabled, true)
  // no explanation match -> guesses, which never untick
  const g = estimateWorth(stats, { explanation: [{ name: 'Something else entirely', contrib: 90 }], seed: ['to maximum Life'] })
  assert.ok([...g.values()].every(v => v.source === 'guess'))
  assert.ok(valueChanges(stats, g).every(c => !c.disabled))
  assert.equal(worthBand(g.get('+# to maximum Life')!), 'carry')
}
})
