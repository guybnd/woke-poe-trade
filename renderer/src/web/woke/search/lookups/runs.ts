// Strategy runs (Net worth's Runs view): the run going now, from its saved
// glance, and past runs by strategy, from the saved board. "run",
// "strategy", "compare runs" or a run's name answers.
import { formatDuration } from '../../ui/format'
import { NET_WORTH_TYPE } from '../../net-worth/widget'
import { runPerHour, smallSample } from '../../net-worth/runs'
import type { RunBoard, RunGlance } from '../../net-worth/runs'
import type { RateTime } from '../../shared/rate-time'
import type { Lookup, LookupRow } from './types'

const WORDS = ['run', 'strategy', 'strategy run', 'farm run', 'boss run', 'cost per map', 'profit per map']
const BOARD_WORDS = ['runs', 'past runs', 'compare runs', 'best strategy', 'strategies', 'compare strategies', 'strategy runs']

function wanted (query: string, name: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  if (q.length < 3) return false
  if (WORDS.some(w => w.startsWith(q) || q === w)) return true
  return name.toLowerCase().startsWith(q) || (q.startsWith('run ') && name.toLowerCase().startsWith(q.slice(4)))
}

function amount (chaos: number, divine: number | null, unit = ''): string {
  const sign = chaos > 0 ? '+' : chaos < 0 ? '−' : ''
  const div = divine && Math.abs(chaos) >= divine ? Math.abs(chaos) / divine : null
  return div != null ? `${sign}${div.toFixed(1)} div${unit}` : `${sign}${Math.round(Math.abs(chaos))} c${unit}`
}

function wantsBoard (query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return q.length >= 3 && BOARD_WORDS.some(w => w.startsWith(q) || q === w)
}

// Past runs by strategy, best per map first (Net worth › Runs, By strategy).
function boardAnswer (board: RunBoard, time: RateTime, divine: number | null): ReturnType<Lookup> {
  // Steady ones first (a small sample's per map is a guess), then per map.
  const per = (r: RunBoard['rows'][number]) => r.perMapChaos ?? -1e15
  const rows = board.rows.filter(r => r.perMapChaos != null).sort((a, b) => Number(a.small) - Number(b.small) || per(b) - per(a)).slice(0, 6)
  if (!rows.length) return []
  const unitOf = (r: RunBoard['rows'][number]) => r.fights ? (r.maps ? 'run' : 'fight') : 'map'
  const lines: LookupRow[] = rows.map(r => {
    const runs = r.maps + r.fights
    const ph = r.perHour[time]
    const u = unitOf(r)
    const bits = [`${amount(r.perMapChaos ?? 0, divine)} a ${u}`, ph != null ? amount(ph, divine, '/h') : null, `${runs} ${u}${runs === 1 ? '' : 's'}`, r.small ? 'small sample' : null].filter(Boolean)
    return { label: r.name, value: bits.join(' · '), dim: r.small }
  })
  const best = rows[0]
  return [{
    id: 'answer:strategy-runs-compare',
    group: 'Answer',
    name: `Best strategy so far: ${best.name}, ${amount(best.perMapChaos ?? 0, divine)} a ${unitOf(best)}`,
    sub: 'Net worth, past runs by strategy',
    icon: 'fas fa-flag',
    sections: [{ rows: lines }, { text: ['Runs with the same name added up. Open Net worth › Runs to sort by per hour, cost or without the top drop.'] }],
    actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
  }]
}

// `run`: the live run's saved glance, or null with no run going. `time`: the
// Per hour setting (shared/rate-time.ts). `board`: past runs by strategy.
export function runsLookup (run: RunGlance | null, time: RateTime = 'play', board: RunBoard | null = null): Lookup {
  return (query, ctx) => {
    const past = board && wantsBoard(query) ? boardAnswer(board, time, run?.divine ?? ctx.divine) : []
    if (!run || !wanted(query, run.name)) return past
    const divine = run.divine ?? ctx.divine
    // Boss fights count like maps (per map is per map or fight).
    const fights = run.fights ?? 0
    const runs = run.maps + fights
    const unit = fights ? (run.maps ? 'run' : 'fight') : 'map'
    const perHour = runPerHour(run.profitChaos, (run.timeTo ?? run.at) - run.startAt, run.time, time)
    const sample = smallSample(runs, run.profitChaos, run.top ?? null)
    const sampleNote = sample?.few ? `Small sample: only ${runs} so far, so per ${unit} can swing a lot.` : `Small sample: one drop (${run.top?.name}) is over half the profit.`
    const rows: LookupRow[] = [
      { label: 'Profit', value: amount(run.profitChaos, divine) },
      ...(run.faustusChaos ? [{ label: 'Outside the stash', value: amount(run.faustusChaos, divine) }, { label: 'Total', value: amount(run.profitChaos + run.faustusChaos, divine) }] : []),
      { label: 'Maps', value: String(run.maps) },
      ...(fights ? [{ label: 'Boss fights', value: String(fights) }] : []),
      { label: `Per ${unit}`, value: runs ? amount(run.profitChaos / runs, divine) : '—', dim: !runs },
      { label: 'Per hour', value: perHour != null ? amount(perHour, divine, '/h') : 'under 10 min', dim: perHour == null },
      { label: `Cost per ${unit}`, value: run.costPerMapChaos != null ? amount(run.costPerMapChaos, divine).replace(/^[+−]/, '') : '—', dim: run.costPerMapChaos == null },
      ...(run.top && runs ? [{ label: `Per ${unit} without ${run.top.name}`, value: amount((run.profitChaos - run.top.chaos) / runs, divine) }] : []),
      { label: 'Running', value: formatDuration(Math.max(0, ctx.now - run.startAt)) }
    ]
    return [{
      id: 'answer:strategy-run',
      group: 'Answer',
      name: `Run ${run.name}: ${amount(run.profitChaos, divine)}`,
      sub: 'Net worth, strategy run',
      icon: 'fas fa-flag',
      sections: [{ rows }, { text: [...(sample ? [sampleNote] : []), 'From the last stash read. Open Net worth › Runs to stop it or add costs.'] }],
      actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
    }, ...past]
  }
}
