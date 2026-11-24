// The summary a run shows when it stops (pick W1 + T1): how it did against
// your other runs of the same name, the best drops, each map's time with its
// deaths, what the kit cost against what it kept, and up to three tips that
// the numbers back. A run with nothing to say gets no tips. Pure: no Vue, no IO.
//
// Loot can't be pinned to a map (the stash is read every few minutes), so a
// tip never says which map or scarab paid. Kits are compared across runs,
// and only with enough runs on each side.
import { compareRows, isMapCostItem, tallyRows, tallyValue } from './runs'
import type { CompareRow, Run, TallyRow } from './runs'
import { rowKey } from './faustus'
import type { RateTime, TimeSplit } from '../shared/rate-time'

// A map in the run, from Client.txt (session-story map-log.ts).
export interface SummaryMap { name: string, enteredAt: number, mapMs: number, deaths: number, npcs: string[] }

export interface SummaryDrop {
  key: string
  name: string
  icon: string
  count: number
  // What it's worth (with your count and price); a left-out one, what it would be.
  chaos: number
  // The shared line item: left out (stays listed, struck), your count or price,
  // and an item added by hand (its id; it can't be left out, only removed).
  out?: boolean
  edited?: boolean
  manualId?: string
}

export interface SummaryTip {
  id: 'pace' | 'slow' | 'kit-price' | 'hideout' | 'kit-compare'
  // Bold lead, then the numbers.
  lead: string
  text: string
}

export interface RunSummary {
  // Your other runs of the same name, added up (null: none to compare with).
  usual: CompareRow | null
  drops: SummaryDrop[]
  maps: SummaryMap[]
  avgMapMs: number | null
  medianMapMs: number | null
  deaths: number
  // Kit and map-cost items used up, against the profit kept.
  spentChaos: number
  // Profit per 1c spent (null: nothing spent, or no profit).
  returnPerChaos: number | null
  // The biggest things the spend went on, for the label.
  spentOn: string[]
  tips: SummaryTip[]
}

export interface SummaryInput {
  run: Run
  // All finished runs (this one may be among them; it is left out of "usual").
  done: readonly Run[]
  maps: readonly SummaryMap[]
  profitChaos: number
  perMapChaos: number | null
  perHourChaos: number | null
  costPerMapChaos: number | null
  runs: number
  // Where the run's time went (Client.txt), or null.
  time: TimeSplit | null
  rateTime: RateTime
  mapCostKeys?: ReadonlySet<string>
  // Formats chaos for the tips' text (chaos or divines, as the window shows).
  fmt: (chaos: number) => string
}

const MAX_DROPS = 4
const MAX_TIPS = 3
// Tips' bars: each needs this much to be worth saying.
export const PACE_MIN_MAPS = 9
export const PACE_SHARE = 0.15
export const SLOW_FACTOR = 1.8
export const SLOW_MIN_MAPS = 6
export const KIT_SHARE = 0.10
export const KIT_MIN_CHAOS = 1
export const HIDEOUT_SHARE = 0.25
export const KIT_COMPARE_MIN = 3

const CURRENCY_NAME = /\b(Orb|Shard|Scroll|Splinter|Fossil|Resonator|Catalyst|Oil|Essence|Scarab|Delirium Orb|Prism|Bauble|Whetstone|Chisel|Sextant)\b|Orb of /

// The things that came in worth showing: not currency (trades and sales),
// not map-cost items (restocks); Mirrors count, as in topDrop.
function dropRows (run: Run): SummaryDrop[] {
  const { came } = tallyRows(run)
  const out: SummaryDrop[] = []
  for (const r of came as TallyRow[]) {
    const t = r.line
    if (t.cost || isMapCostItem(t.name, undefined)) continue
    if ((t.currency || CURRENCY_NAME.test(t.name)) && !/^Mirror/.test(t.name)) continue
    const e = run.edits?.[rowKey.tally(r.key)]
    // A left-out drop stays where it was, struck (the shared line item).
    const chaos = tallyValue(t, e?.out ? { ...e, out: undefined } : e)
    if (!(chaos > 0.5)) continue
    out.push({ key: r.key, name: t.name, icon: t.icon, count: e?.count ?? Math.max(1, r.net), chaos, ...(e?.out ? { out: true } : {}), ...(e?.count != null || e?.each != null ? { edited: true } : {}) })
  }
  for (const m of run.manual ?? []) {
    if (m.side !== 'in') continue
    const chaos = Math.max(0, m.count) * Math.max(0, m.each)
    if (chaos > 0.5) out.push({ key: m.key ?? `manual:${m.id}`, name: m.name, icon: m.icon ?? '', count: m.count, chaos, manualId: m.id })
  }
  // Left-out drops keep their place by value but don't take a counted one's slot.
  const shown: SummaryDrop[] = []
  let counted = 0
  for (const d of out.sort((a, b) => b.chaos - a.chaos)) {
    if (counted >= MAX_DROPS || shown.length >= MAX_DROPS + 2) break
    shown.push(d)
    if (!d.out) counted++
  }
  return shown
}

function median (xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null

export function clockOf (ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const minutes = (ms: number) => `${Math.max(1, Math.round(ms / 60_000))} ${Math.round(ms / 60_000) === 1 ? 'minute' : 'minutes'}`
const pct = (x: number) => `${Math.round(x * 100)}%`

// What the kit and the stash's map-cost items cost over the run.
function spending (run: Run, runs: number, mapCostKeys?: ReadonlySet<string>): { chaos: number, on: string[] } {
  const parts: Array<{ name: string, chaos: number }> = []
  const typed = new Set(run.costs.map(c => c.key))
  for (const c of run.costs) parts.push({ name: c.name, chaos: Math.max(0, c.qty) * Math.max(0, c.unitChaos) * runs })
  for (const o of run.once) parts.push({ name: o.name, chaos: Math.max(0, o.chaos) })
  for (const [k, t] of Object.entries(run.tally)) {
    if (typed.has(k) || !(t.cost || mapCostKeys?.has(k))) continue
    const v = tallyValue(t, run.edits?.[rowKey.tally(k)])
    if (v < 0) parts.push({ name: t.name, chaos: -v })
  }
  for (const m of run.manual ?? []) if (m.side === 'out') parts.push({ name: m.name, chaos: Math.max(0, m.count) * Math.max(0, m.each) })
  const chaos = parts.reduce((s, p) => s + p.chaos, 0)
  const on = parts.filter(p => p.chaos > 0).sort((a, b) => b.chaos - a.chaos).slice(0, 2).map(p => p.name)
  return { chaos, on }
}

// ---------- tips (pick T1) ----------

function paceTip (all: readonly SummaryMap[], perHour: number | null, fmt: SummaryInput['fmt']): SummaryTip | null {
  const maps = all.filter(m => m.mapMs > 0)
  if (maps.length < PACE_MIN_MAPS) return null
  const third = Math.floor(maps.length / 3)
  const first = avg(maps.slice(0, third).map(m => m.mapMs))!
  const last = avg(maps.slice(-third).map(m => m.mapMs))!
  if (!(first > 0) || !(last > 0)) return null
  const change = (last - first) / first
  if (Math.abs(change) < PACE_SHARE) return null
  const faster = change < 0
  // At the end pace, per hour scales with map time (a rough guide only).
  const atEnd = faster && perHour != null && perHour > 0 ? perHour * (avg(maps.map(m => m.mapMs))! / last) : null
  return {
    id: 'pace',
    lead: faster ? 'You got faster as you went' : 'You slowed down as you went',
    text: `${clockOf(first)} a map in the first third, ${clockOf(last)} in the last.` +
      (atEnd != null ? ` At the end pace this run makes about ${fmt(atEnd)} an hour.` : '')
  }
}

function slowTip (maps: readonly SummaryMap[], med: number | null): SummaryTip | null {
  if (maps.length < SLOW_MIN_MAPS || med == null || !(med > 0)) return null
  const slow = maps.filter(m => m.mapMs > med * SLOW_FACTOR)
  if (!slow.length) return null
  const lost = slow.reduce((s, m) => s + (m.mapMs - med), 0)
  const deaths = slow.reduce((s, m) => s + m.deaths, 0)
  const allDeaths = maps.reduce((s, m) => s + m.deaths, 0)
  const named = [...slow].sort((a, b) => b.mapMs - a.mapMs).slice(0, 3).map(m => `${m.name.replace(/ Map$/, '')} ${clockOf(m.mapMs)}`).join(', ')
  // A mechanic in most of the slow maps (it met you there).
  const npcCount = new Map<string, number>()
  for (const m of slow) for (const n of new Set(m.npcs)) npcCount.set(n, (npcCount.get(n) ?? 0) + 1)
  const common = [...npcCount.entries()].filter(([, c]) => c >= Math.max(2, Math.ceil(slow.length * 0.6))).sort((a, b) => b[1] - a[1])[0]?.[0]
  const lead = slow.length === 1 ? '1 map took far longer than the rest' : `${slow.length} maps took far longer than the rest`
  const bits = [`Over ${SLOW_FACTOR}× your middle map time (${clockOf(med)}): ${named}${slow.length > 3 ? '…' : ''}.`]
  if (deaths > 0 && allDeaths > 0) bits.push(`${deaths} of your ${allDeaths} ${allDeaths === 1 ? 'death was' : 'deaths were'} in them.`)
  if (common) bits.push(`${common} was in ${slow.length === 1 ? 'it' : 'most of them'}.`)
  bits.push(`They cost about ${minutes(lost)} over a usual map.`)
  return { id: 'slow', lead, text: bits.join(' ') }
}

function kitPriceTip (run: Run, others: readonly Run[], cost: number | null, usual: number | null, profitPerMap: number | null, usualPerMap: number | null, fmt: SummaryInput['fmt']): SummaryTip | null {
  if (cost == null || usual == null || !(usual > 0)) return null
  const diff = cost - usual
  if (Math.abs(diff) < KIT_MIN_CHAOS || Math.abs(diff) / usual < KIT_SHARE) return null
  // The kit line whose price moved most, the same way, since your run of
  // this name before this one.
  const last = others.filter(r => r.costs.length && (r.stoppedAt ?? 0) <= run.startAt).sort((a, b) => b.startAt - a.startAt)[0]
  let moved = ''
  if (last) {
    let best = 0
    for (const c of run.costs) {
      const was = last.costs.find(x => x.name === c.name)
      if (!was) continue
      const d = (c.unitChaos - was.unitChaos) * c.qty
      if (Math.sign(d) === Math.sign(diff) && Math.abs(d) > Math.abs(best) && Math.abs(c.unitChaos - was.unitChaos) >= 0.5) {
        best = d
        moved = ` ${c.name} went from ${fmt(was.unitChaos)} to ${fmt(c.unitChaos)}.`
      }
    }
  }
  const more = diff > 0
  const still = profitPerMap != null && usualPerMap != null
    ? (more ? (profitPerMap >= usualPerMap ? ' Profit a map still beat your usual.' : ' Profit a map was below your usual too.') : '')
    : ''
  return {
    id: 'kit-price',
    lead: `A map cost ${fmt(Math.abs(diff))} ${more ? 'more' : 'less'} than usual`,
    text: `${fmt(cost)} a map in kit and items used up, against ${fmt(usual)} on your other runs.${moved}${still}`
  }
}

function hideoutTip (time: TimeSplit | null, avgMapMs: number | null, perMap: number | null, fmt: SummaryInput['fmt']): SummaryTip | null {
  if (!time || avgMapMs == null || !(avgMapMs > 0)) return null
  const total = time.map + time.play + time.hub
  if (!(total > 0) || time.hub / total < HIDEOUT_SHARE) return null
  // About how many maps the hideout time would have been (map time only, so
  // a rough upper bound: maps need some hideout time too).
  const worth = Math.floor(time.hub / avgMapMs)
  if (worth < 2) return null
  return {
    id: 'hideout',
    lead: `Hideout and town took ${pct(time.hub / total)} of the run`,
    text: `${minutes(time.hub)}, about ${worth} maps' worth at your map pace${perMap != null && perMap > 0 ? ` (${fmt(worth * perMap)} at this run's profit a map)` : ''}. Some of it is restocking and selling.`
  }
}

// With and without one kit line, across your runs of this name (this one in).
function kitCompareTip (run: Run, others: readonly Run[], rateTime: RateTime, fmt: SummaryInput['fmt'], mapCostKeys?: ReadonlySet<string>): SummaryTip | null {
  const all = [run, ...others].filter(r => r.final && r.stoppedAt != null)
  const names = new Set(all.flatMap(r => r.costs.map(c => c.name)))
  let best: { name: string, w: CompareRow, wo: CompareRow, nw: number, nwo: number } | null = null
  for (const name of names) {
    const withIt = all.filter(r => r.costs.some(c => c.name === name))
    const without = all.filter(r => !r.costs.some(c => c.name === name))
    if (withIt.length < KIT_COMPARE_MIN || without.length < KIT_COMPARE_MIN) continue
    const w = compareRows(withIt.map(r => ({ ...r, name: 'w' })), rateTime, true, mapCostKeys)[0]
    const wo = compareRows(without.map(r => ({ ...r, name: 'wo' })), rateTime, true, mapCostKeys)[0]
    if (w?.perMapChaos == null || wo?.perMapChaos == null) continue
    const gap = Math.abs(w.perMapChaos - wo.perMapChaos)
    if (!best || gap > Math.abs(best.w.perMapChaos! - best.wo.perMapChaos!)) best = { name, w, wo, nw: withIt.length, nwo: without.length }
  }
  if (!best || Math.abs(best.w.perMapChaos! - best.wo.perMapChaos!) < KIT_MIN_CHAOS) return null
  const pays = best.w.perMapChaos! > best.wo.perMapChaos!
  return {
    id: 'kit-compare',
    lead: pays ? `${best.name} looks worth it` : `${best.name} doesn't look worth it`,
    text: `Runs with it: ${fmt(best.w.perMapChaos!)} a map (${best.nw} runs, ${best.w.runs} maps). Without: ${fmt(best.wo.perMapChaos!)} (${best.nwo} runs, ${best.wo.runs} maps).`
  }
}

export function summarize (i: SummaryInput): RunSummary {
  const { run, fmt } = i
  // Your other runs of this name, newest first.
  const others = i.done.filter(r => r.id !== run.id && r.name === run.name && r.final && r.stoppedAt != null)
  const usual = others.length ? compareRows(others, i.rateTime, true, i.mapCostKeys)[0] ?? null : null
  const maps = [...i.maps].sort((a, b) => a.enteredAt - b.enteredAt)
  const times = maps.map(m => m.mapMs).filter(ms => ms > 0)
  const avgMapMs = avg(times)
  const medianMapMs = median(times)
  const deaths = maps.reduce((s, m) => s + m.deaths, 0)
  const spend = spending(run, i.runs, i.mapCostKeys)
  const tips = [
    kitCompareTip(run, others, i.rateTime, fmt, i.mapCostKeys),
    slowTip(maps, medianMapMs),
    paceTip(maps, i.perHourChaos, fmt),
    kitPriceTip(run, others, i.costPerMapChaos, usual?.costPerMapChaos ?? null, i.perMapChaos, usual?.perMapChaos ?? null, fmt),
    hideoutTip(i.time, avgMapMs, i.perMapChaos, fmt)
  ].filter((t): t is SummaryTip => t != null).slice(0, MAX_TIPS)
  return {
    usual,
    drops: dropRows(run),
    maps,
    avgMapMs,
    medianMapMs,
    deaths,
    spentChaos: spend.chaos,
    returnPerChaos: spend.chaos > 0 && i.profitChaos > 0 ? (i.profitChaos + spend.chaos) / spend.chaos : null,
    spentOn: spend.on,
    tips
  }
}

export { isLastRun, lastRunKey } from './runs'
export type { LastRun } from './runs'
