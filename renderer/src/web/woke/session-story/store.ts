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
import { NIGHT_GAP_MS, bestDrop, hasMaps, isNightStory, keepNight, summarize } from './story'
import type { NightDraft, NightStory } from './story'
import { isMapRecord, keepMap } from './map-log'
import { isSkippedArea, skipVersion } from './skip-areas'
import type { MapRecord } from './map-log'

export const NIGHTS_COLLECTION = 'session-story'
export const NIGHTS_KEY = 'nights'
const DRAFT_KEY = 'tonight'
function isNightDraft (v: unknown): v is NightDraft {
  const d = v as NightDraft | null
  return !!d && typeof d.startedAt === 'number' && typeof d.lastAt === 'number' && Array.isArray(d.segs) && Array.isArray(d.deaths)
}
// One small file per day of maps (map-history/2026-11-20.json): saving a map
// rewrites only its day. Memory holds only the last RECENT maps, also kept in
// their own small file, for the chip's average, Ctrl+Space and where the log
// replay starts.
export const MAPS_COLLECTION = 'map-history'
export function dayKey (ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const DAY_MS = 86_400_000
export const DAY_MS_EXPORT = DAY_MS
const RECENT = 20
export const RECENT_MAPS_KEY = 'recent-maps'
const RECENT_KEY = RECENT_MAPS_KEY

export async function readMapDay (key: string, strict = false, collection = MAPS_COLLECTION): Promise<MapRecord[]> {
  const saved = await (hostRequest(strict ? 'doc-get-strict' : 'doc-get', { collection, key }) as Promise<unknown>)
  return Array.isArray(saved) ? saved.filter(isMapRecord) : []
}

// Every saved day, for the history tab (read when it opens, never kept).
export async function readAllMaps (): Promise<MapRecord[]> {
  const days = await (hostRequest('doc-list', { collection: MAPS_COLLECTION }) as Promise<unknown[]>)
  return days.flatMap(d => Array.isArray(d) ? d.filter(isMapRecord) : []).sort((a, b) => b.enteredAt - a.enteredAt)
}

export const useNights = createGlobalState(() => {
  const nights = shallowRef<NightStory[]>([])
  const live = shallowRef<NightStory | null>(null)
  const loadError = shallowRef('')
  // Nights finished since the app started: wakes the dock icon.
  const finished = shallowRef(0)
  let loading: Promise<void> | null = null
  // The last RECENT maps, newest first.
  const maps = shallowRef<MapRecord[]>([])
  // The newest map saved, vaults included, for Map history while it's open.
  const lastSaved = shallowRef<MapRecord | null>(null)
  const mapsError = shallowRef('')
  let mapsLoading: Promise<void> | null = null
  let recentBad = false
  // Saves run one at a time: each reads its day after the last one wrote.
  let saving: Promise<void> = Promise.resolve()

  function load (): Promise<void> {
    // Strict: null only when there's no file (main keeps a broken one aside);
    // a locked one throws, and then nothing is saved over it this run.
    loading ??= (hostRequest('doc-get-strict', { collection: NIGHTS_COLLECTION, key: NIGHTS_KEY }) as Promise<unknown>)
      .then((saved) => { nights.value = Array.isArray(saved) ? saved.filter(isNightStory) : [] })
      .catch((e) => { loadError.value = e instanceof Error ? e.message : String(e) })
    return loading
  }

  // Stash numbers for the night, when the reader read inside it (or within
  // the quiet gap after, which is when the last map's loot lands).
  function loadMaps (): Promise<void> {
    // Kept with the nights, not in map-history: the history tab lists that folder.
    mapsLoading ??= readMapDay(RECENT_KEY, true, NIGHTS_COLLECTION)
      .then((list) => { maps.value = list.sort((a, b) => b.enteredAt - a.enteredAt).slice(0, RECENT) })
      .catch((e) => {
        recentBad = true
        mapsError.value = e instanceof Error ? e.message : String(e)
      })
    return mapsLoading
  }

  async function saveMap (rec: MapRecord): Promise<void> {
    await loadMaps()
    const key = dayKey(rec.enteredAt)
    const league = useLeagues().selectedId.value
    const row = { ...rec, npcs: [...rec.npcs], ...(league ? { league } : {}) }
    // Vaults go to their day only: the recent list feeds the toast's averages.
    if (!isSkippedArea(row.name)) {
      maps.value = keepMap(maps.value, row).slice(0, RECENT)
      if (!recentBad) await hostRequest('doc-put', { collection: NIGHTS_COLLECTION, key: RECENT_KEY, value: maps.value }).catch(() => {})
    }
    let day: MapRecord[]
    try {
      day = await readMapDay(key, true)
    } catch (e) {
      // There but unreadable (locked): never written over.
      mapsError.value = e instanceof Error ? e.message : String(e)
      return
    }
    const merged = keepMap(day, row)
    const ok = await hostRequest('doc-put', { collection: MAPS_COLLECTION, key, value: merged }).then(() => true, () => false)
    // As saved: merged with an earlier visit to the same map.
    if (ok) lastSaved.value = merged.find(m => m.key === row.key) ?? row
  }

  function addMap (rec: MapRecord): Promise<void> {
    saving = saving.then(() => saveMap(rec)).catch(() => {})
    return saving
  }

  // A night that ended because the game restarted gets no extra time: the
  // next one starts right away. Reads already counted for an earlier night
  // never count again.
  async function withStash (story: NightStory): Promise<NightStory> {
    const league = useLeagues().selectedId.value
    const divine = usePoeninja().xchgRate.value ?? null
    const to = story.endedByOpening ? story.endedAt : story.endedAt + NIGHT_GAP_MS
    if (!league) return { ...story, divine, stashTo: to }
    const before = nights.value.find(n => n.startedAt < story.startedAt)
    const from = Math.max(story.startedAt, (before?.stashTo ?? 0) + 1)
    const [gains, ledger] = await Promise.all([
      stashGainsBetween(league, from, to).catch(() => null),
      (hostRequest('doc-get', { collection: 'net-worth', key: ledgerKey(league) }) as Promise<{ diffs?: unknown } | null>).catch(() => null)
    ])
    const diffs = Array.isArray(ledger?.diffs) ? ledger.diffs as Parameters<typeof bestDrop>[0] : []
    return {
      ...story,
      divine,
      stashTo: to,
      profitChaos: gains && gains.reads ? gains.chaos : null,
      best: bestDrop(diffs, from, to)
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

  // The night being read, kept here so turning the window's module off and on
  // again carries on with it.
  let draft: NightDraft | null = null
  let liveSig = ''
  // The night being read is also saved as it goes, so an app
  // restart carries on with it: the log's start-up tail only reaches back
  // about 256 KB, a dozen maps or so.
  let savedSig = ''
  // Nothing is written until the saved one has been read (a write first would wipe it).
  let draftRead = false
  function saveDraft (d: NightDraft | null) {
    if (!draftRead) return
    // On an area change, and at most once a minute otherwise (long hideout stretches).
    const sig = d ? `${d.startedAt}:${d.segs.length}:${Math.floor(d.lastAt / 60_000)}` : ''
    if (sig === savedSig) return
    savedSig = sig
    hostRequest('doc-put', { collection: NIGHTS_COLLECTION, key: DRAFT_KEY, value: d && hasMaps(d) ? d : null }).catch(() => {})
  }
  // The saved night, unless it's one already finished.
  async function readDraft (): Promise<NightDraft | null> {
    const saved = await (hostRequest('doc-get', { collection: NIGHTS_COLLECTION, key: DRAFT_KEY }) as Promise<unknown>).catch(() => null)
    draftRead = true
    if (!isNightDraft(saved)) return null
    if (nights.value.some(n => n.startedAt === saved.startedAt || n.endedAt >= saved.lastAt)) return null
    return saved
  }
  function setLive (d: NightDraft | null) {
    draft = d
    saveDraft(d)
    // Once a minute at most while nothing changes, so Ctrl+Space doesn't redo
    // its answers on every log line.
    const sig = d ? `${skipVersion()}:${d.startedAt}:${d.segs.length}:${d.deaths.length}:${d.levels?.length ?? 0}:${d.segs[d.segs.length - 1]?.name}:${Math.floor(d.lastAt / 60_000)}` : ''
    if (sig === liveSig) return
    liveSig = sig
    live.value = d && hasMaps(d) ? summarize(d) : null
  }
  const keptDraft = () => draft

  return { nights, live, loadError, finished, load, finish, setLive, keptDraft, readDraft, maps, lastSaved, mapsError, loadMaps, addMap }
})
