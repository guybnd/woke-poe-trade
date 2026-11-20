// Finished nights, saved in woke-docs/session-story/nights.json, and the night
// still going. Profit and the best drop come from the stash reader (Net
// worth), when it read during the night.
import { shallowRef } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { useLeagues } from '@/web/background/Leagues'
import { usePoeninja } from '@/web/background/Prices'
import { hostRequest } from '../shared/host'
import { stashGainsBetween } from '../net-worth/gains'
import { ledgerKey } from '../net-worth/glance'
import { NIGHT_GAP_MS, bestDrop, isNightStory, keepNight, summarize } from './story'
import type { NightDraft, NightStory } from './story'

export const NIGHTS_COLLECTION = 'session-story'
export const NIGHTS_KEY = 'nights'

export const useNights = createGlobalState(() => {
  const nights = shallowRef<NightStory[]>([])
  const live = shallowRef<NightStory | null>(null)
  const loadError = shallowRef('')
  // Nights finished since the app started: wakes the dock icon.
  const finished = shallowRef(0)
  let loading: Promise<void> | null = null

  function load (): Promise<void> {
    loading ??= (hostRequest('doc-get', { collection: NIGHTS_COLLECTION, key: NIGHTS_KEY }) as Promise<unknown>)
      .then((saved) => { nights.value = Array.isArray(saved) ? saved.filter(isNightStory) : [] })
      .catch((e) => { loadError.value = e instanceof Error ? e.message : String(e) })
    return loading
  }

  // Stash numbers for the night, when the reader read inside it (or within
  // the quiet gap after, which is when the last map's loot lands).
  async function withStash (story: NightStory): Promise<NightStory> {
    const league = useLeagues().selectedId.value
    const divine = usePoeninja().xchgRate.value ?? null
    if (!league) return { ...story, divine }
    const to = story.endedAt + NIGHT_GAP_MS
    const [gains, ledger] = await Promise.all([
      stashGainsBetween(league, story.startedAt, to).catch(() => null),
      (hostRequest('doc-get', { collection: 'net-worth', key: ledgerKey(league) }) as Promise<{ diffs?: unknown } | null>).catch(() => null)
    ])
    const diffs = Array.isArray(ledger?.diffs) ? ledger.diffs as Parameters<typeof bestDrop>[0] : []
    return {
      ...story,
      divine,
      profitChaos: gains && gains.reads ? gains.chaos : null,
      best: bestDrop(diffs, story.startedAt, to)
    }
  }

  async function finish (draft: NightDraft): Promise<NightStory> {
    await load()
    const story = await withStash(summarize(draft))
    nights.value = keepNight(nights.value, story)
    if (live.value?.id === story.id) live.value = null
    finished.value++
    // Saved nights that couldn't be read would be written over.
    if (!loadError.value) await hostRequest('doc-put', { collection: NIGHTS_COLLECTION, key: NIGHTS_KEY, value: nights.value }).catch(() => {})
    return story
  }

  function setLive (draft: NightDraft | null) {
    live.value = draft ? summarize(draft) : null
  }

  return { nights, live, loadError, finished, load, finish, setLive }
})
