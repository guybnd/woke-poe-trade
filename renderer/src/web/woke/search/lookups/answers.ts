// Quick answers: currency maths, countdowns, and a web search for anything.
import { formatAmount, formatDuration } from '../../ui/format'
import { msUntilLabReset } from '../../lab/lab'
import { matchRank } from '../search'
import type { Lookup, LookupCard, LookupRow } from './types'

// ---- currency maths ----

// What players type for a currency, to its poe.ninja name.
const ALIAS_LIST: Array<[string, string]> = [
  ['Chaos Orb', 'c ch chaos'],
  ['Divine Orb', 'd div divs divine divines'],
  ['Exalted Orb', 'ex exa exalt exalts exalted'],
  ['Mirror of Kalandra', 'mirror mirrors'],
  ['Orb of Alchemy', 'alch alchs alchemy'],
  ['Orb of Alteration', 'alt alts'],
  ['Orb of Fusing', 'fuse fuses fusing fusings'],
  ['Chromatic Orb', 'chrome chromes chromatic'],
  ["Jeweller's Orb", 'jew jewellers jewelers'],
  ['Orb of Annulment', 'annul annuls'],
  ['Regal Orb', 'regal regals'],
  ['Vaal Orb', 'vaal vaals'],
  ["Gemcutter's Prism", 'gcp gcps'],
  ['Orb of Scouring', 'scour scours'],
  ['Ancient Orb', 'ancient ancients'],
  ['Blessed Orb', 'blessed'],
  ['Orb of Regret', 'regret regrets'],
  ['Orb of Chance', 'chance'],
  ['Orb of Augmentation', 'aug augs'],
  ['Orb of Transmutation', 'trans transmute'],
  ["Awakener's Orb", 'awakener'],
  ['Veiled Chaos Orb', 'veiled']
]
const ALIASES = new Map(ALIAS_LIST.flatMap(([name, words]) => words.split(' ').map(w => [w, name] as const)))

export interface CurrencyQuery { amount: number, from: string, to: string | null }

// "3.5 div", "450c", "2k chaos", "12 div in chaos", "1 mirror to div".
export function parseCurrencyQuery (query: string, names: (text: string) => string | null): CurrencyQuery | null {
  const m = /^\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?|\.\d+)\s*(k)?\s*([a-z'][a-z' ]*?)\s*(?:\s(?:in|to|as)\s+([a-z'][a-z' ]*?))?\s*$/i.exec(query)
  if (!m) return null
  // "1,200" groups thousands; "1,5" is a decimal comma.
  const digits = /,\d{3}(?:\D|$)/.test(m[1]) ? m[1].replace(/,/g, '') : m[1].replace(',', '.')
  let amount = Number(digits)
  if (m[2]) amount *= 1000
  if (!Number.isFinite(amount) || amount <= 0) return null
  const from = names(m[3])
  if (!from) return null
  const to = m[4] ? names(m[4]) : null
  if (m[4] && !to) return null
  return { amount, from, to }
}

function bigNumber (n: number): string {
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString('en-US')
  return Math.abs(n) >= 0.1 ? String(+n.toFixed(2)) : formatAmount(n)
}

export function currencyLookup (currencyNames: readonly string[]): Lookup {
  const names = (text: string): string | null => {
    const t = text.trim().toLowerCase().replace(/’/g, "'")
    const alias = ALIASES.get(t)
    if (alias) return alias
    if (t.length < 3) return null
    // Only a name it can't be confused with: "10 orb" could be any orb.
    const hits = currencyNames.filter(n => matchRank(n, t) === 0)
    return hits.length === 1 ? hits[0] : hits.find(n => n.toLowerCase() === t) ?? null
  }
  return (query, ctx) => {
    const q = parseCurrencyQuery(query, names)
    if (!q) return []
    const each = ctx.price(q.from)
    if (each == null) return []
    const chaos = q.amount * each
    const rows: LookupRow[] = [{ label: 'In chaos', value: `${bigNumber(chaos)} c` }]
    if (ctx.divine && q.from !== 'Divine Orb') rows.push({ label: 'In divines', value: `${bigNumber(chaos / ctx.divine)} div` })
    let headline = `${bigNumber(chaos)} c`
    let copy = String(Math.round(chaos * 100) / 100)
    if (q.to && q.to !== 'Chaos Orb') {
      const target = ctx.price(q.to)
      if (target == null) return []
      const n = chaos / target
      headline = `${bigNumber(n)} ${q.to}`
      copy = String(Math.round(n * 100) / 100)
      if (q.to !== 'Divine Orb') rows.push({ label: `In ${q.to}`, value: bigNumber(n) })
    } else if (q.from === 'Chaos Orb' && ctx.divine) {
      headline = `${bigNumber(chaos / ctx.divine)} div`
      copy = String(Math.round(chaos / ctx.divine * 100) / 100)
    }
    const rates: LookupRow[] = [q.from, q.to]
      .filter((n): n is string => !!n && n !== 'Chaos Orb')
      .map(n => ({ label: `1 ${n}`, value: `${bigNumber(ctx.price(n)!)} c`, item: { name: n, type: 'Currency' } }))
    const card: LookupCard = {
      id: `answer:currency:${q.amount}:${q.from}:${q.to ?? ''}`,
      group: 'Answer',
      name: `${bigNumber(q.amount)} ${q.from} = ${headline}`,
      sub: 'Currency maths at poe.ninja prices',
      icon: 'fas fa-calculator',
      sections: [{ rows }, ...(rates.length ? [{ label: 'Rates', rows: rates }] : [])],
      actions: [{ label: `Copy ${copy}`, copy }]
    }
    return [card]
  }
}

// ---- countdowns ----

// The next league, while it hasn't started. Moves with GAME_PATCH each league.
export const NEXT_LEAGUE = { name: 'Covens of Umbra', patch: '3.30', startsAt: Date.UTC(2026, 10, 13, 19) }

// A phrase's start, with at least its first word typed in full, so "res" or
// "star" (Resolute Technique, Starforge) stay item searches.
const LAB_WORDS = ['lab reset', 'lab layout', 'lab timer', 'labyrinth reset', 'reset', 'countdown']
const LEAGUE_WORDS = ['league start', 'league end', 'league day', 'league timer', 'next league', 'countdown']

function wanted (query: string, phrases: string[]): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return phrases.some(p => p.startsWith(q) && q.length >= p.split(' ')[0].length)
}

function localTime (ts: number): string {
  return new Date(ts).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function days (ms: number): string {
  const d = Math.floor(ms / 86400e3)
  return d >= 1 ? `${d}d ${formatDuration(ms - d * 86400e3)}` : formatDuration(ms)
}

export const countdownLookup: Lookup = (query, ctx) => {
  const out: LookupCard[] = []
  if (wanted(query, LAB_WORDS)) {
    const ms = msUntilLabReset(ctx.now)
    out.push({
      id: 'answer:lab-reset',
      group: 'Countdowns',
      name: `Lab layout resets in ${formatDuration(ms)}`,
      sub: 'Countdown',
      icon: 'fas fa-hourglass-half',
      sections: [{
        rows: [
          { label: 'Resets at', value: `00:00 UTC (${localTime(ctx.now + ms)} your time)` },
          { label: 'What changes', value: 'A new layout for every difficulty', dim: true }
        ]
      }],
      actions: [{ label: 'Open poelab.com', url: 'https://www.poelab.com/' }]
    })
  }
  if (wanted(query, LEAGUE_WORDS)) {
    if (NEXT_LEAGUE.startsAt > ctx.now) {
      out.push({
        id: 'answer:league-next',
        group: 'Countdowns',
        name: `${NEXT_LEAGUE.name} starts in ${days(NEXT_LEAGUE.startsAt - ctx.now)}`,
        sub: `Patch ${NEXT_LEAGUE.patch} countdown`,
        icon: 'fas fa-flag-checkered',
        sections: [{ rows: [{ label: 'Starts', value: `${localTime(NEXT_LEAGUE.startsAt)} your time` }] }],
        actions: [{ label: 'Patch notes', url: 'https://www.pathofexile.com/forum/view-forum/patch-notes' }]
      })
    }
    const league = ctx.league
    // Standard and other permanent leagues started years ago: no day count.
    if (league?.startedAt && league.startedAt <= ctx.now && ctx.now - league.startedAt < 200 * 86400e3) {
      const day = Math.floor((ctx.now - league.startedAt) / 86400e3) + 1
      out.push({
        id: 'answer:league-day',
        group: 'Countdowns',
        name: `Day ${day} of ${league.name}`,
        sub: 'League age',
        icon: 'fas fa-calendar-day',
        sections: [{
          rows: [
            { label: 'Started', value: new Date(league.startedAt).toLocaleDateString() },
            { label: 'Ends', value: 'Not announced yet. GGG usually says a few weeks ahead.', dim: true }
          ]
        }],
        actions: [{ label: 'Announcements', url: 'https://www.pathofexile.com/forum/view-forum/news' }]
      })
    }
  }
  return out
}

// ---- the web ----

export const webLookup: Lookup = (query) => {
  const q = query.trim()
  if (q.length < 2) return []
  const enc = encodeURIComponent(q)
  return [
    { site: 'poewiki', url: `https://www.poewiki.net/index.php?search=${enc}`, icon: 'fas fa-book' },
    { site: 'poedb', url: `https://poedb.tw/us/search?q=${enc}`, icon: 'fas fa-database' }
  ].map(s => ({
    id: `web:${s.site}`,
    group: 'Search the web',
    name: `Search ${s.site} for "${q}"`,
    sub: 'Opens in your browser',
    icon: s.icon,
    sections: [{ text: [`Opens ${s.site}'s search with what you typed.`] }],
    actions: [{ label: `Open ${s.site}`, url: s.url }]
  }))
}
