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
  // The reads in divines, each at its own rate; null when a read has no rate.
  div: number | null
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

// `items` newest first (interleave). `shown`: how many items of open days are
// drawn; a folded day (`folded`, by its midnight) is just its header. The day
// totals count every item of the day. `more`: items after the page's end.
// `totals`: what the day headers add up (the list before a filter); `items` by default.
export function withDays (items: readonly HistoryItem[], shown: number, skipped: (name: string) => boolean,
  folded: ReadonlySet<number> = new Set(), totals: readonly HistoryItem[] = items): { lines: HistoryLine[], more: number } {
  const days = new Map<number, DayLine>()
  const timed = new Map<number, { ms: number, n: number }>()
  const dayOf = (at: number) => {
    let day = days.get(at)
    if (!day) {
      day = { kind: 'day', key: `day:${at}`, at, maps: 0, avgMs: null, chaos: 0, reads: 0, rate: null, div: 0 }
      days.set(at, day)
    }
    return day
  }
  for (const it of totals) {
    const at = dayStart(it.at)
    const day = dayOf(at)
    if (it.kind === 'read') {
      day.chaos += it.read.chaos
      day.reads++
      if (day.rate == null && it.read.rate) day.rate = it.read.rate
      day.div = day.div != null && it.read.rate ? day.div + it.read.chaos / it.read.rate : null
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
  // A day with only listed vaults still gets its header.
  for (const it of items) dayOf(dayStart(it.at))

  const lines: HistoryLine[] = []
  let drawn = 0
  let more = 0
  let cut = false
  let curDay: number | null = null
  let lastChar: string | null = null
  for (const it of items) {
    const at = dayStart(it.at)
    const open = !folded.has(at)
    // Past the page: nothing more is drawn, folded days after it included,
    // so the list stays in order once "Show more" adds the rest.
    if (cut || (open && drawn >= shown)) {
      cut = true
      more++
      continue
    }
    if (at !== curDay) {
      lines.push(days.get(at)!)
      curDay = at
      lastChar = null
    }
    if (!open) continue
    if (it.kind === 'map' && it.map.char && it.map.char !== lastChar) {
      lastChar = it.map.char
      lines.push({
        kind: 'char',
        key: `char:${it.at}`,
        char: it.map.char,
        className: it.map.className ?? null,
        level: it.map.charLevel != null ? it.map.charLevel + (it.map.levelsGained ?? 0) : null
      })
    }
    lines.push(it)
    drawn++
  }
  return { lines, more }
}

// Where an item falls among the drawn items of open days (for paging to it), or -1.
export function openIndex (items: readonly HistoryItem[], folded: ReadonlySet<number>, match: (it: HistoryItem) => boolean): number {
  let n = 0
  for (const it of items) {
    if (folded.has(dayStart(it.at))) continue
    if (match(it)) return n
    n++
  }
  return -1
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
