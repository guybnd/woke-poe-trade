// Strategy runs (Net worth's Runs view): the run going now, from its saved
// glance. "run", "strategy" or the run's name answers.
import { formatDuration } from '../../ui/format'
import { NET_WORTH_TYPE } from '../../net-worth/widget'
import type { RunGlance } from '../../net-worth/runs'
import type { Lookup, LookupRow } from './types'

const WORDS = ['run', 'strategy', 'strategy run', 'farm run', 'cost per map', 'profit per map']

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

// `run`: the live run's saved glance, or null with no run going.
export function runsLookup (run: RunGlance | null): Lookup {
  return (query, ctx) => {
    if (!run || !wanted(query, run.name)) return []
    const divine = run.divine ?? ctx.divine
    const rows: LookupRow[] = [
      { label: 'Profit', value: amount(run.profitChaos, divine) },
      ...(run.faustusChaos ? [{ label: 'In Faustus', value: amount(run.faustusChaos, divine) }, { label: 'Total', value: amount(run.profitChaos + run.faustusChaos, divine) }] : []),
      { label: 'Maps', value: String(run.maps) },
      { label: 'Per map', value: run.maps ? amount(run.profitChaos / run.maps, divine) : '—', dim: !run.maps },
      { label: 'Per hour', value: run.perHourChaos != null ? amount(run.perHourChaos, divine, '/h') : 'under 10 min', dim: run.perHourChaos == null },
      { label: 'Cost per map', value: run.costPerMapChaos != null ? amount(run.costPerMapChaos, divine).replace(/^[+−]/, '') : '—', dim: run.costPerMapChaos == null },
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
