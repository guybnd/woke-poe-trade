// Strategy runs (Net worth's Runs view): the run going now, from its saved
// glance. "run", "strategy" or the run's name answers.
import { formatDuration } from '../../ui/format'
import { NET_WORTH_TYPE } from '../../net-worth/widget'
import { runPerHour } from '../../net-worth/runs'
import type { RunGlance } from '../../net-worth/runs'
import type { RateTime } from '../../shared/rate-time'
import type { Lookup, LookupRow } from './types'

const WORDS = ['run', 'strategy', 'strategy run', 'farm run', 'boss run', 'cost per map', 'profit per map']

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

// `run`: the live run's saved glance, or null with no run going. `time`: the
// Per hour setting (shared/rate-time.ts).
export function runsLookup (run: RunGlance | null, time: RateTime = 'play'): Lookup {
  return (query, ctx) => {
    if (!run || !wanted(query, run.name)) return []
    const divine = run.divine ?? ctx.divine
    // Boss fights count like maps (per map is per map or fight).
    const fights = run.fights ?? 0
    const runs = run.maps + fights
    const unit = fights ? (run.maps ? 'run' : 'fight') : 'map'
    const perHour = runPerHour(run.profitChaos, (run.timeTo ?? run.at) - run.startAt, run.time, time)
    const rows: LookupRow[] = [
      { label: 'Profit', value: amount(run.profitChaos, divine) },
      ...(run.faustusChaos ? [{ label: 'Outside the stash', value: amount(run.faustusChaos, divine) }, { label: 'Total', value: amount(run.profitChaos + run.faustusChaos, divine) }] : []),
      { label: 'Maps', value: String(run.maps) },
      ...(fights ? [{ label: 'Boss fights', value: String(fights) }] : []),
      { label: `Per ${unit}`, value: runs ? amount(run.profitChaos / runs, divine) : '—', dim: !runs },
      { label: 'Per hour', value: perHour != null ? amount(perHour, divine, '/h') : 'under 10 min', dim: perHour == null },
      { label: `Cost per ${unit}`, value: run.costPerMapChaos != null ? amount(run.costPerMapChaos, divine).replace(/^[+−]/, '') : '—', dim: run.costPerMapChaos == null },
      { label: 'Running', value: formatDuration(Math.max(0, ctx.now - run.startAt)) }
    ]
    return [{
      id: 'answer:strategy-run',
      group: 'Answer',
      name: `Run ${run.name}: ${amount(run.profitChaos, divine)}`,
      sub: 'Net worth, strategy run',
      icon: 'fas fa-flag',
      sections: [{ rows }, { text: ['From the last stash read. Open Net worth › Runs to stop it or add costs.'] }],
      actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
    }]
  }
}
