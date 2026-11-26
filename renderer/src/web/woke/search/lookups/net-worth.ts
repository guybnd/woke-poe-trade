// Net worth profit per hour of play, from the last stash read's saved glance.
import { formatAmount, formatDuration } from '../../ui/format'
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
        ? { label: w.label, value: r.hubOnly ? 'no maps, hideout only' : 'under 10 min played', dim: true }
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

const SELL_WORDS = ['worth selling', 'selling', 'sell', 'liquidate', 'falling', 'dump', 'what to sell']

// Typed in full up to at least the first word, as above.
function wantsSelling (query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return q.length >= 4 && SELL_WORDS.some(p => p.startsWith(q) && q.length >= Math.min(p.split(' ')[0].length, p.length))
}

const lostText = (chaos: number, divine: number | null) => divine && chaos >= divine ? `${(chaos / divine).toFixed(1)} div` : `${Math.round(chaos)} chaos`
const pct = (c: number) => `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(Math.round(c * 100))}%`

// Net worth's Worth selling list, from the last read's saved glance.
export function worthSellingLookup (glance: Glance | null): Lookup {
  return (query, ctx) => {
    if (!glance || !wantsSelling(query)) return []
    const list = glance.selling
    if (!list) return []
    const rows: LookupRow[] = list.map(s => ({ label: `${s.count > 1 ? `${formatAmount(s.count)} × ` : ''}${s.name}`, item: { name: s.tip ?? s.name }, note: `${pct(s.d1)} · 7d ${pct(s.d7)}`, chaos: s.chaos }))
    const lost = list.reduce((n, s) => n + s.lostChaos, 0)
    return [{
      id: 'answer:net-worth-selling',
      group: 'Answer',
      name: list.length ? `Worth selling: ${list.length} ${list.length === 1 ? 'item' : 'items'} falling` : 'Worth selling: nothing you hold much of is falling',
      sub: 'Net worth, from the last stash read',
      icon: 'fas fa-arrow-trend-down',
      sections: list.length
        ? [{ rows }, { text: [`Worth ${lostText(lost, glance.divine ?? ctx.divine)} more a week ago. Down 5% today and 15% over 7 days (or 20% today), 1 div or more held. Thin markets and your own prices left out.`] }]
        : [{ text: ['Down 5% today and 15% over 7 days (or 20% today), 1 div or more held. Thin markets and your own prices left out.'] }],
      actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
    }]
  }
}
