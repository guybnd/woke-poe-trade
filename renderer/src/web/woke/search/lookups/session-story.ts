// The night so far, or the last one, from Session story.
import { formatChaos, formatDuration } from '../../ui/format'
import { SESSION_STORY_TYPE } from '../../session-story/widget'
import type { NightStory } from '../../session-story/story'
import type { Lookup, LookupRow } from './types'

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
  out.push({ label: 'Deaths', value: String(s.deathsAt.length) })
  out.push({ label: 'Hideout', value: formatDuration(s.otherMs) })
  const fastest = [...s.maps].filter(m => m.mapMs > 60_000).sort((a, b) => a.mapMs - b.mapMs)[0]
  if (fastest && s.maps.length > 1) out.push({ label: 'Fastest map', value: `${fastest.name} · ${formatDuration(fastest.mapMs)}`, dim: true })
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
      actions: [{ label: 'Open Session story', tool: SESSION_STORY_TYPE }]
    }]
  }
}
