// The nights list as both the Session story panel and the Session window show
// it: tonight (live) first, then saved nights, with Farming's profit for nights
// the stash reader didn't read.
import { computed } from 'vue'
import { nowMinute } from '../ui/format'
import { useSessionStore } from '../analytics/store'
import { sessionTotals } from '../analytics/stats'
import { farmingProfit } from './story'
import type { NightStory } from './story'
import { useNights } from './store'

export interface Shown { story: NightStory, live: boolean }

// A finished night still shows as "the night" for this long.
export const RECENT_MS = 12 * 3_600_000

export function nightTitle (s: NightStory): string {
  const d = new Date(s.startedAt)
  return `Night of ${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`
}

export function useNightList () {
  const store = useNights()

  // Tonight, or the last night if it ended in the past 12 hours.
  const shown = computed<Shown | null>(() => {
    if (store.live.value) return { story: store.live.value, live: true }
    const last = store.nights.value[0]
    return last && nowMinute.value - last.endedAt < RECENT_MS ? { story: last, live: false } : null
  })

  const list = computed<Shown[]>(() => [
    ...(store.live.value ? [{ story: store.live.value, live: true }] : []),
    ...store.nights.value.map(story => ({ story, live: false }))
  ])

  // Farming's saved sessions: profit for nights the stash reader didn't read.
  const sessions = useSessionStore()
  sessions.load().catch(() => {})
  const farmSessions = computed(() => sessions.sessions.value.map(s => ({ startedAt: s.startedAt, endedAt: s.endedAt, profit: sessionTotals(s).profit })))
  function farmOf (s: NightStory) {
    if (s.profitChaos != null) return null
    // The next night: the one just newer in the list (the live one is newest).
    const i = list.value.findIndex(n => n.story.id === s.id)
    const next = i > 0 ? list.value[i - 1].story.startedAt : null
    return farmingProfit(s, next, farmSessions.value)
  }
  function profitOf (s: NightStory): number | null {
    return s.profitChaos ?? farmOf(s)?.chaos ?? null
  }

  return { shown, list, farmOf, profitOf }
}
