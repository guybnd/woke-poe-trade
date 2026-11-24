// Net worth profit per hour of play, from the last stash read's saved glance.
import { formatDuration } from '../../ui/format'
import { NET_WORTH_TYPE } from '../../net-worth/widget'
import type { Glance, GlanceRate, GlanceRates } from '../../net-worth/glance'
import type { Lookup, LookupRow } from './types'

const WORDS = ['per hour', 'profit', 'profit per hour', 'net worth', 'income', 'currency per hour', 'divines per hour']

// Typed in full up to at least the first word: "pro" stays an item search.
function wanted (query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  if (q === 'c/h' || q === 'd/h' || q === 'div/h') return true
  return WORDS.some(p => p.startsWith(q) && q.length >= p.split(' ')[0].length)
}

const WINDOWS: Array<{ id: '1h' | '2h' | '3h' | 'today', label: string }> = [
  { id: '1h', label: 'Last hour' },
  { id: '2h', label: 'Last 2 hours' },
  { id: '3h', label: 'Last 3 hours' },
  { id: 'today', label: 'Today' }
]

function amount (chaos: number, divine: number | null): string {
  const sign = chaos > 0 ? '+' : chaos < 0 ? '−' : ''
  const div = divine && Math.abs(chaos) >= divine ? Math.abs(chaos) / divine : null
  return div != null ? `${sign}${div.toFixed(1)} div/h` : `${sign}${Math.round(Math.abs(chaos))} c/h`
}

// What the read counted (the Per hour setting then; older glances left
// hideout, AFK and closed out).
function sub (r: GlanceRate, rates: GlanceRates): string {
  const parts = [`${formatDuration(r.playMs)} ${rates.withOff ? 'counted' : 'played'}`]
  if (rates.fromLog && !rates.withHub && r.hubMs >= 60_000) parts.push(`${formatDuration(r.hubMs)} hideout left out`)
  if (rates.fromLog && !rates.withOff && r.offMs >= 60_000) parts.push(`${formatDuration(r.offMs)} AFK or closed left out`)
  return parts.join(' · ')
}

// `glance`: the league's last saved one, or null with net worth off or never read.
export function netWorthLookup (glance: Glance | null): Lookup {
  return (query, ctx) => {
    if (!glance?.rates || !wanted(query)) return []
    const rates = glance.rates
    const divine = glance.divine ?? ctx.divine
    const rows: LookupRow[] = WINDOWS.map(w => {
      const r = rates[w.id]
      return r.perHour == null
        ? { label: w.label, value: 'under 10 min played', dim: true }
        : { label: w.label, value: `${amount(r.perHour, divine)} · ${sub(r, rates)}` }
    })
    const head = rates['1h'].perHour != null ? { label: 'Last hour', chaos: rates['1h'].perHour } : rates.today.perHour != null ? { label: 'Today', chaos: rates.today.perHour } : null
    const minutes = Math.max(0, Math.round((ctx.now - glance.at) / 60_000))
    const read = `From the stash read ${minutes < 1 ? 'just now' : `${formatDuration(minutes * 60_000)} ago`}.`
    const text = [rates.fromLog ? `${read} Hideout, town, closed and AFK time left out.` : `${read} Client.txt wasn't found: hideout time isn't left out.`]
    text.push("Purchases count 0, not as a loss: a refresh where 10 div or more, mostly currency, left the stash. Mark or dismiss one in Net worth's change list or by clicking a chart point.")
    return [{
      id: 'answer:net-worth-per-hour',
      group: 'Answer',
      name: head == null ? 'Profit per hour: not enough play yet' : `Profit per hour, ${head.label.toLowerCase()}: ${amount(head.chaos, divine)}`,
      sub: 'Net worth, per hour of play',
      icon: 'fas fa-coins',
      sections: [{ rows }, { text }],
      actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
    }]
  }
}
