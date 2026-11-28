// Named filter profiles: several whole filters (source, strictness, your
// changes, rules, presets, price moves) in one editor, each saved to its own
// .filter file. The profile in use keeps its settings on the widget itself, so
// everything else reads them as before; the others wait here as copies.
import { toRaw } from 'vue'
import type { FilterProfile, LootFilterWidget } from './widget'
import { cleanProfileName, PROFILE_NAME_MAX, initLootFilterWidget, normalizeLootFilterWidget, outputName } from './widget'

export type { FilterProfile }

// What belongs to one profile. Everything else (hotkeys, folder, reload
// behaviour, notices, the rule list's view) is shared.
export const PROFILE_KEYS = [
  'sourceName', 'sourceOnline', 'sourceTitle', 'saveMode', 'edits', 'lastVersion',
  'buildRules', 'savedBuildSig', 'savedExtraSig', 'savedClusterSig', 'savedUserSig', 'savedSourceHash',
  'priceTiers', 'safetyNet', 'neversink', 'ownBase', 'strictAuto', 'rules', 'presets',
  'healthDismissed', 'netDismissed'
] as const satisfies ReadonlyArray<keyof LootFilterWidget>

export type ProfileKey = typeof PROFILE_KEYS[number]
export type ProfileData = Partial<Pick<LootFilterWidget, ProfileKey>>

const clone = <T>(x: T): T => x === undefined ? x : JSON.parse(JSON.stringify(x))

export function activeProfile (w: LootFilterWidget): FilterProfile {
  return w.profiles.find(p => p.id === w.activeProfile) ?? w.profiles[0]
}

export function snapshotProfile (w: LootFilterWidget): ProfileData {
  const raw = toRaw(w) as unknown as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of PROFILE_KEYS) {
    if (raw[k] !== undefined) out[k] = clone(raw[k])
  }
  return out as ProfileData
}

function applyData (w: LootFilterWidget, data: ProfileData) {
  const t = w as unknown as Record<string, unknown>
  const d = data as Record<string, unknown>
  for (const k of PROFILE_KEYS) {
    if (d[k] === undefined) Reflect.deleteProperty(t, k)
    else t[k] = clone(d[k])
  }
  // Fills in anything missing or damaged, as on start.
  normalizeLootFilterWidget(w)
}

// The file a profile saves to.
export function profileFile (w: LootFilterWidget, p: FilterProfile): string {
  if (p.id === w.activeProfile) return outputName(w)
  const d = p.data ?? {}
  return outputName({
    sourceName: d.sourceName ?? '',
    saveMode: d.saveMode ?? 'copy',
    sourceOnline: d.sourceOnline ?? false,
    sourceTitle: d.sourceTitle ?? '',
    neversink: d.neversink,
    profile: p,
    profiles: w.profiles
  })
}

// Why a name can't be used, or null. Two profiles on one file would overwrite
// each other.
export function profileNameProblem (w: LootFilterWidget, name: string, forId: number | null): string | null {
  const clean = cleanProfileName(name)
  if (!clean) return 'Give it a name'
  const lower = clean.toLowerCase()
  const file = `${clean} (woke).filter`.toLowerCase()
  for (const p of w.profiles) {
    if (p.id === forId) continue
    if (p.name.toLowerCase() === lower) return `There's already a profile called ${p.name}`
    if (profileFile(w, p).toLowerCase() === file) return `${p.name} already saves to ${clean} (woke).filter`
  }
  return null
}

function nextId (w: LootFilterWidget): number {
  const id = Math.max(0, w.lastProfileId ?? 0, ...w.profiles.map(p => p.id)) + 1
  w.lastProfileId = id
  return id
}

// A fresh profile: the same filter to start from, none of your changes.
export function blankProfileData (w: LootFilterWidget): ProfileData {
  const fresh = { wmId: w.wmId, wmType: w.wmType, wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [] } as unknown as LootFilterWidget
  initLootFilterWidget(fresh)
  // A new profile starts with the Loot and Equipment tabs on.
  fresh.presets.currency.on = true
  fresh.presets.weights.on = true
  // On the same source as the profile it's made beside.
  fresh.ownBase = w.ownBase
  fresh.sourceName = w.sourceName
  fresh.sourceOnline = w.sourceOnline
  fresh.sourceTitle = w.sourceTitle
  fresh.neversink = { ...clone(toRaw(w.neversink)), prevVersion: null }
  const data = snapshotProfile(fresh)
  // Never saved: nothing to compare against yet.
  delete data.savedBuildSig
  delete data.savedExtraSig
  delete data.savedClusterSig
  delete data.savedUserSig
  delete data.savedSourceHash
  return data
}

// Adds a profile (a copy of the one in use, or a fresh one) without switching to it.
export function addProfile (w: LootFilterWidget, name: string, from: 'copy' | 'blank'): FilterProfile {
  const data = from === 'copy' ? snapshotProfile(w) : blankProfileData(w)
  // Its own file has never been written: it saves once you switch to it, and
  // reads unsaved until then.
  delete data.savedSourceHash
  delete data.savedBuildSig
  delete data.savedExtraSig
  delete data.savedUserSig
  delete data.savedClusterSig
  if (from === 'copy') {
    // Saved copies don't overwrite the source: the copy writes its own file.
    data.saveMode = 'copy'
  }
  const p: FilterProfile = { id: nextId(w), name: cleanProfileName(name), data }
  w.profiles = [...w.profiles, p]
  return p
}

export function renameProfile (w: LootFilterWidget, id: number, name: string): boolean {
  const p = w.profiles.find(x => x.id === id)
  if (!p || profileNameProblem(w, name, id)) return false
  p.name = cleanProfileName(name)
  // From now on its file follows its name.
  delete p.legacyFile
  w.profiles = [...w.profiles]
  return true
}

// Puts the one in use away and brings `id` onto the widget. Nothing is
// written to disk here.
export function switchProfileData (w: LootFilterWidget, id: number): boolean {
  if (id === w.activeProfile) return false
  const next = w.profiles.find(p => p.id === id)
  if (!next) return false
  const cur = activeProfile(w)
  cur.data = snapshotProfile(w)
  const data = next.data ?? {}
  delete next.data
  w.activeProfile = id
  applyData(w, data)
  w.profiles = [...w.profiles]
  return true
}

// Removes a profile not in use. Its .filter file stays in the folder.
export function deleteProfile (w: LootFilterWidget, id: number): boolean {
  if (id === w.activeProfile || w.profiles.length < 2) return false
  const before = w.profiles.length
  w.profiles = w.profiles.filter(p => p.id !== id)
  return w.profiles.length !== before
}

// The suggested name for a copy: "Mapping copy", "Mapping copy 2", …
export function copyName (w: LootFilterWidget, base: string): string {
  const stem = cleanProfileName(`${base} copy`).slice(0, PROFILE_NAME_MAX - 3)
  if (!profileNameProblem(w, stem, null)) return stem
  for (let i = 2; i < 100; i++) {
    const n = `${stem} ${i}`
    if (!profileNameProblem(w, n, null)) return n
  }
  return stem
}

export function newProfileName (w: LootFilterWidget): string {
  for (let i = w.profiles.length + 1; i < 100; i++) {
    const n = `Profile ${i}`
    if (!profileNameProblem(w, n, null)) return n
  }
  return 'New profile'
}
