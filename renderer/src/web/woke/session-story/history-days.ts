// Map history's list as drawn: a header for each day (with that day's totals),
// a line naming the character when it changes, then the maps and stash reads.
import type { HistoryItem } from './income'

export interface DayLine {
  kind: 'day'
  key: string
  // Local midnight of the day.
  at: number
  // Maps counted that day (vaults and other skipped areas left out).
  maps: number
  // Average time of the counted maps over 30 s; null without one.
  avgMs: number | null
  // What the day's stash reads added, in chaos.
  chaos: number
  reads: number
  // Chaos per divine from the day's newest read that has one.
  rate: number | null
}

export interface CharLine {
  kind: 'char'
  key: string
  char: string
  className: string | null
  level: number | null
}

export type HistoryLine = DayLine | CharLine | HistoryItem

export function dayStart (ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Under this, a map is a quick look in: left out of the average (as the chip does).
const QUICK_MS = 30_000

// `items` newest first (interleave). `shown`: how many of them are drawn; the
// day totals still count every item of the day.
export function withDays (items: readonly HistoryItem[], shown: number, skipped: (name: string) => boolean): HistoryLine[] {
  const days = new Map<number, DayLine>()
  const timed = new Map<number, { ms: number, n: number }>()
  for (const it of items) {
    const at = dayStart(it.at)
    let day = days.get(at)
    if (!day) {
      day = { kind: 'day', key: `day:${at}`, at, maps: 0, avgMs: null, chaos: 0, reads: 0, rate: null }
      days.set(at, day)
    }
    if (it.kind === 'read') {
      day.chaos += it.read.chaos
      day.reads++
      if (day.rate == null && it.read.rate) day.rate = it.read.rate
    } else if (!skipped(it.map.name)) {
      day.maps++
      if (it.map.mapMs > QUICK_MS) {
        const t = timed.get(at) ?? { ms: 0, n: 0 }
        t.ms += it.map.mapMs
        t.n++
        timed.set(at, t)
      }
    }
  }
  for (const [at, t] of timed) days.get(at)!.avgMs = t.ms / t.n

  const out: HistoryLine[] = []
  let curDay: number | null = null
  let lastChar: string | null = null
  for (const it of items.slice(0, shown)) {
    const at = dayStart(it.at)
    if (at !== curDay) {
      out.push(days.get(at)!)
      curDay = at
      lastChar = null
    }
    if (it.kind === 'map' && it.map.char && it.map.char !== lastChar) {
      lastChar = it.map.char
      out.push({
        kind: 'char',
        key: `char:${it.at}`,
        char: it.map.char,
        className: it.map.className ?? null,
        level: it.map.charLevel != null ? it.map.charLevel + (it.map.levelsGained ?? 0) : null
      })
    }
    out.push(it)
  }
  return out
}

// "Today", "Yesterday", else "Sun 22 Nov".
export function dayLabel (at: number, now: number): { title: string, date: string } {
  const date = new Date(at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/,/g, '')
  const today = dayStart(now)
  if (at === today) return { title: 'Today', date }
  // A day before today's midnight; DST makes days 23 or 25 hours long.
  if (at === dayStart(today - 1)) return { title: 'Yesterday', date }
  return { title: date, date: '' }
}

export function clockTime (ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
