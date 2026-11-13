// Deaths and checked maps. Saved by main (main/src/woke/death-recap-store.ts);
// checks waiting for their map stay in memory.
import { computed, shallowRef } from 'vue'
import { createGlobalState } from '@vueuse/core'
import { ItemCategory, ItemRarity } from '@/parser'
import type { ParsedItem } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import { prepareMapStat } from '@/web/map-check/prepare-map-stats'
import { hostRequest } from '../shared/host'
import { deathGroup, matchCheck, runFromCheck } from './death-log'
import type { DeathRecord, MapCheck, MapEntry, ModLine, RunRecord } from './death-log'

const MAX_DEATHS = 1000
const MAX_RUNS = 3000
const MAX_CHECKS = 200
const SAVE_DELAY_MS = 1000
const RETRY_MS = 30_000
// Rerolling a map in place: the mouse comes back to within a slot of where it was.
const SAME_SLOT_PX = 30

// The mods on a map's item text. Null for anything else, and for items with
// nothing to say: hidden mods, or text with no mods at all such as a search result.
export function checkFromItem (item: ParsedItem, at: number): MapCheck | null {
  if (item.category !== ItemCategory.Map || item.rarity === ItemRarity.Unique || item.isUnidentified) return null
  const mods = item.statsByType
    .filter(calc => calc.type === ModifierType.Explicit)
    .map(calc => prepareMapStat(calc))
    .map(s => s.roll == null ? { matcher: s.matcher } : { matcher: s.matcher, roll: s.roll })
  const unknown = item.unknownModifiers.filter(m => m.type === ModifierType.Explicit).map(m => m.text)
  if (!mods.length && !unknown.length) return null
  return { at, name: item.mapArea?.name ?? item.info.name, tier: item.mapTier, mods, unknown }
}

const newestFirst = <T extends { at: number }>(list: T[]) => list.sort((a, b) => b.at - a.at)

export const useDeathRecap = createGlobalState(() => {
  const deaths = shallowRef<DeathRecord[]>([])
  const runs = shallowRef<RunRecord[]>([])
  const loadError = shallowRef('')
  // Deaths since the app started are what the dock icon shows.
  const startedAt = Date.now()
  let checks: MapCheck[] = []
  let loaded = false
  let loading = false
  let dirty = false
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  const sessionDeaths = computed(() => deaths.value.filter(d => d.at >= startedAt).length)
  const runByKey = computed(() => new Map(runs.value.map(r => [r.key, r])))

  function save () {
    dirty = true
    // Until the saved history is in, a write would replace it.
    if (!loaded || saveTimer) return
    saveTimer = setTimeout(() => {
      saveTimer = null
      dirty = false
      hostRequest('death-recap-write', { deaths: deaths.value, runs: runs.value })
        .catch(() => {
          dirty = true
          saveTimer = setTimeout(() => {
            saveTimer = null
            if (dirty) save()
          }, RETRY_MS)
        })
    }, SAVE_DELAY_MS)
  }

  // The nth of each death, once deaths from two sources have come together.
  function recount (list: DeathRecord[]): DeathRecord[] {
    const seen = new Map<string, number>()
    return [...list].reverse().map(d => {
      const group = deathGroup(d)
      const nth = (seen.get(group) ?? 0) + 1
      seen.set(group, nth)
      return d.nth === nth ? d : { ...d, nth }
    }).reverse()
  }

  // Once old deaths drop off, maps from before them would count as no deaths.
  function pruneRuns () {
    if (deaths.value.length < MAX_DEATHS) return
    const oldest = deaths.value[deaths.value.length - 1].at
    if (runs.value.some(r => r.at < oldest)) runs.value = runs.value.filter(r => r.at >= oldest)
  }

  function load () {
    if (loaded || loading) return
    loading = true
    ;(hostRequest('death-recap-read', {}) as Promise<{ deaths: DeathRecord[], runs: RunRecord[] }>)
      .then(saved => {
        // Anything the log gave while this was loading is added in.
        const known = new Set(saved.deaths.map(d => d.id))
        const heard = deaths.value.filter(d => !known.has(d.id))
        const merged = newestFirst([...heard, ...saved.deaths]).slice(0, MAX_DEATHS)
        deaths.value = heard.length ? recount(merged) : merged
        const savedKeys = new Set(saved.runs.map(r => r.key))
        runs.value = newestFirst([...runs.value.filter(r => !savedKeys.has(r.key)), ...saved.runs]).slice(0, MAX_RUNS)
        pruneRuns()
        loaded = true
        loadError.value = ''
        if (dirty) save()
      })
      .catch((err: Error) => {
        loadError.value = err.message
        setTimeout(load, RETRY_MS)
      })
      .finally(() => { loading = false })
  }

  function addCheck (check: MapCheck) {
    const same = JSON.stringify([check.name, check.tier, check.mods, check.unknown])
    const at = check.position
    checks = checks.filter(c => {
      if (JSON.stringify([c.name, c.tier, c.mods, c.unknown]) === same) return false
      const rerolled = at && c.position && c.name === check.name && c.tier === check.tier &&
        Math.abs(c.position.x - at.x) <= SAME_SLOT_PX && Math.abs(c.position.y - at.y) <= SAME_SLOT_PX
      return !rerolled
    })
    checks.push(check)
    if (checks.length > MAX_CHECKS) checks = checks.slice(-MAX_CHECKS)
  }

  // A map opened. Replayed lines (live false) don't use up checks: a check
  // made now says nothing about a map from before it.
  function enterMap (map: MapEntry, live: boolean) {
    if (!live || map.returned || runByKey.value.has(map.key)) return
    const found = matchCheck(checks, map)
    if (!found) return
    checks = checks.filter(c => c !== found.check)
    runs.value = [runFromCheck(map.key, map, found), ...runs.value].slice(0, MAX_RUNS)
    save()
  }

  // Mods read off the screen in this map. They beat a check, which only guessed.
  function readFromScreen (map: MapEntry, mods: ModLine[], unknown: string[]) {
    const before = runByKey.value.get(map.key)
    // Part of the list was hidden, or this wasn't the list at all.
    const count = (r: { mods?: ModLine[], unknown?: string[] }) => (r.mods?.length ?? 0) + (r.unknown?.length ?? 0)
    if (before && count({ mods, unknown }) < count(before)) return
    const run: RunRecord = {
      key: map.key,
      name: map.name,
      level: map.level,
      at: before?.at ?? map.at,
      tier: before?.tier,
      mods,
      unknown,
      match: 'screen'
    }
    runs.value = [run, ...runs.value.filter(r => r.key !== map.key)].slice(0, MAX_RUNS)
    save()
  }

  function addDeath (death: Omit<DeathRecord, 'nth'>) {
    if (deaths.value.some(d => d.id === death.id)) return
    const group = deathGroup(death)
    const nth = deaths.value.filter(d => deathGroup(d) === group).length + 1
    deaths.value = newestFirst([{ ...death, nth }, ...deaths.value]).slice(0, MAX_DEATHS)
    pruneRuns()
    save()
  }

  return { deaths, runs, runByKey, sessionDeaths, loadError, load, addCheck, enterMap, readFromScreen, addDeath }
})
