// The night so far, or the last one, from Session story.
import { formatChaos, formatClock, formatDuration } from '../../ui/format'
import { ANALYTICS_TYPE } from '../../analytics/types'
import type { NightStory } from '../../session-story/story'
import { tierText, usualMapMs } from '../../session-story/map-log'
import type { MapRecord } from '../../session-story/map-log'
import type { Lookup, LookupRow } from './types'
import { isSkippedArea } from '../../session-story/skip-areas'

const WORDS = ['tonight', 'last night', 'session story', 'session summary', 'night']

// Typed in full up to at least the first word: "ton" stays an item search.
function wanted (query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return WORDS.some(p => p.startsWith(q) && q.length >= Math.min(p.split(' ')[0].length, 5))
}

function signed (chaos: number, divine: number | null): string {
  return `${chaos > 0 ? '+' : ''}${formatChaos(chaos, divine)}`
}

function rows (s: NightStory): LookupRow[] {
  const out: LookupRow[] = [
    { label: 'Played', value: formatDuration(s.endedAt - s.startedAt) },
    { label: 'Maps', value: String(s.maps.length) }
  ]
  if (s.profitChaos != null) out.push({ label: 'Profit', value: signed(s.profitChaos, s.divine) })
  if (s.best) out.push({ label: 'Best drop', value: `${s.best.name} · ${formatChaos(s.best.chaos, s.divine)}` })
  const hours = (s.endedAt - s.startedAt) / 3_600_000
  if (s.maps.length) out.push({ label: 'Average map', value: formatClock(s.mapMs / s.maps.length) })
  if (hours >= 0.25) out.push({ label: 'Maps per hour', value: (s.maps.length / hours).toFixed(1) })
  for (const l of s.levelUps ?? []) out.push({ label: s.levelUps!.length > 1 ? l.char : 'Level', value: `${l.from} → ${l.to}` })
  out.push({ label: 'Deaths', value: String(s.deathsAt.length) })
  out.push({ label: 'Hideout', value: formatDuration(s.otherMs) })
  if (s.longestBreakMs && s.longestBreakMs >= 60_000) out.push({ label: 'Longest break', value: formatClock(s.longestBreakMs) })
  return out
}

// `live`: the night still going; `last`: the newest finished one.
export function sessionStoryLookup (live: NightStory | null, last: NightStory | null): Lookup {
  return (query) => {
    const s = live ?? last
    if (!s || !wanted(query)) return []
    const when = new Date(s.startedAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
    return [{
      id: 'answer:session-story',
      group: 'Answer',
      name: live ? 'Tonight so far' : `Night of ${when}`,
      sub: `${formatDuration(s.endedAt - s.startedAt)} · ${s.maps.length} maps${s.profitChaos != null ? ` · ${signed(s.profitChaos, s.divine)}` : ''}`,
      icon: 'fas fa-moon',
      sections: [{ rows: rows(s) }],
      actions: [{ label: 'Open Session analytics', open: { tool: ANALYTICS_TYPE, id: 'history' } }]
    }]
  }
}

const MAP_WORDS = ['maps', 'last maps', 'map history', 'map times']

// The last maps you ran, from Session story's map history.
export function mapsLookup (all: readonly MapRecord[]): Lookup {
  return (query) => {
    // Vaults saved before they were skipped don't count.
    const maps = all.filter(m => !isSkippedArea(m.name))
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!maps.length || !MAP_WORDS.some(w => w.startsWith(q) && q.length >= 4)) return []
    const last = maps.slice(0, 8)
    const usual = usualMapMs(maps)
    return [{
      id: 'answer:map-history',
      group: 'Answer',
      name: `Last maps${usual != null ? `: average ${formatClock(usual)}` : ''}`,
      sub: `${maps.length} maps in the last 2 days`,
      icon: 'fas fa-map',
      sections: [{
        rows: last.map(m => ({
          label: `${m.name} ${tierText(m.areaLevel)}`,
          value: [formatClock(m.mapMs), m.deaths ? `${m.deaths} ${m.deaths === 1 ? 'death' : 'deaths'}` : '', m.npcs.join(', ')].filter(Boolean).join(' · '),
          // Opens Map history at that map's row.
          action: { label: 'Show', open: { tool: ANALYTICS_TYPE, id: `map:${m.enteredAt}` } }
        }))
      }],
      actions: [{ label: 'Open Map history', open: { tool: ANALYTICS_TYPE, id: 'history' } }]
    }]
  }
}
