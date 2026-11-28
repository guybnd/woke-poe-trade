import type { Widget, Anchor } from '@/web/overlay/widgets'
import { isPatch, isValidEdit } from './edits'
import type { FilterEdit } from './edits'
import type { NavMode } from './nav'
import { DEFAULT_BUILD_RULES } from './build-rules'
import type { BuildRuleSwitches } from './build-rules'
import type { PriceMove, UniqueRule } from './economy'
import { DEFAULT_SAFETY_NET } from './safety'
import type { SafetyNet } from './safety'
import { clampLevel, defaultStrictnessAuto } from './strictness'
import type { StrictnessAuto } from './strictness'
import type { OwnRule } from './rules'
import { defaultPresets, normalizePresets } from './presets'
import type { Presets } from './presets'
import { popupAnchor } from '../ui/window-anchor'
import { sortKeys } from './hotkey-match'

export const LOOT_FILTER_TYPE = 'woke-loot-filter'
// copy-item target: sample the hovered item and open its rule card.
export const LOOT_FILTER_SAMPLE_TARGET = 'woke-loot-filter'

export type SaveMode = 'copy' | 'overwrite'

export interface PriceTiers {
  // Re-tier price groups from poe.ninja (reviewed before anything moves).
  on: boolean
  // Moves applied on top of NeverSink's tiers, kept until prices say otherwise.
  moves: PriceMove[]
  // The list before the last Apply, for Undo.
  prev: PriceMove[] | null
  // `${type}|${base}` keys you kept where they are.
  locks: string[]
  appliedAt: number | null
  // How a base with several uniques is priced.
  uniqueRule: UniqueRule
}

export interface SavePoint {
  ts: number
  label: string
  edits: FilterEdit[]
  moves: PriceMove[]
}

export const HISTORY_SIZE = 20

// NeverSink straight from GitHub (all strictness levels, kept up to date)
// instead of a file you downloaded yourself.
export interface NeverSinkSource {
  on: boolean
  // Version in use (cached in the app's folder); null until first download.
  version: string | null
  // The version before the last update, for Undo.
  prevVersion: string | null
  // NeverSink style folder ('' = default look).
  style: string
  // Strictness in use, 0 (Soft) to 6 (Uber plus).
  level: number
  // Newest version seen on GitHub, and when we last looked.
  latest: string | null
  latestChanges: string
  checkedAt: number | null
}

export function defaultNeverSink (): NeverSinkSource {
  return { on: false, version: null, prevVersion: null, style: '', level: 1, latest: null, latestChanges: '', checkedAt: null }
}

export const NEVERSINK_OUTPUT = 'NeverSink (woke).filter'
// What our own filter saves to when no filter file was ever picked.
export const OWN_OUTPUT = 'Loot filter (woke).filter'

// A named whole filter (profiles.ts). The one in use keeps its settings on the
// widget; the others carry them in `data`.
export interface FilterProfile {
  id: number
  name: string
  // Saves to the file it had before profiles ("NeverSink (woke).filter" and
  // the like) until it's renamed; then, like every other, "<name> (woke).filter".
  legacyFile?: boolean
  // The settings of a profile not in use; the one in use has none here.
  data?: Partial<LootFilterWidget>
}

export const PROFILE_NAME_MAX = 40

export function cleanProfileName (name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, PROFILE_NAME_MAX)
}

export interface LootFilterWidget extends Widget {
  anchor: Anchor
  // Hover an item and press: card with the rule that matched it.
  sampleHotkey: string | null
  // Opens the full editor.
  editorHotkey: string | null
  // Types /itemfilter in chat. One press, one command.
  reloadHotkey: string | null
  // Empty: Documents/My Games/Path of Exile.
  folder: string
  // The downloaded NeverSink file the edits are applied to.
  sourceName: string
  // The source is an online filter (OnlineFilters folder, read only):
  // sourceName is its id and sourceTitle its name. Saves always go to a copy.
  sourceOnline: boolean
  sourceTitle: string
  // 'copy' writes "<source> (woke).filter", 'overwrite' replaces the source
  // (keeping a .bak of the first original).
  saveMode: SaveMode
  // After saving, type `/itemfilter <name>` in chat to make the game reload it.
  reloadViaChat: boolean
  // Outside town or your hideout, that command waits for you to press Reload now.
  reloadWhenSafe: boolean
  edits: FilterEdit[]
  // NeverSink version the edits were last saved against, to spot updates.
  lastVersion: string | null
  // Area level used for AreaLevel conditions when Client.txt hasn't shown one.
  fallbackAreaLevel: number
  // Rules made from the active PoB build (top of the saved filter).
  buildRules: BuildRuleSwitches
  // Fingerprint of the build rules at the last save, to flag unsaved changes.
  savedBuildSig?: string
  // Fingerprint of price moves + safety net at the last save.
  savedExtraSig?: string
  // What the cluster price rules named at the last save (cluster-prices.ts).
  savedClusterSig?: string
  // The same without the net's list: your changes, as last saved.
  savedUserSig?: string
  // The source and its text, as the last save was made from them.
  savedSourceHash?: string
  priceTiers: PriceTiers
  safetyNet: SafetyNet
  // Older versions kept the save points (`history`) and undo steps
  // (`timeline`) here; they now live in their own file (history-file.ts),
  // and these are moved there on first start.
  history?: unknown
  neversink: NeverSinkSource
  // Our own filter (own-base.ts) under woke's rules, with no NeverSink rules
  // and no file to read: the default since NeverSink was retired (M7). Off
  // when you pick another filter file. Each profile has its own.
  ownBase?: boolean
  // Moved onto our own base by the one-time switch (Config.ts): the next load
  // saves once, so the game's file matches what the editor shows.
  ownBaseSavePending?: boolean
  strictAuto: StrictnessAuto
  // Rules from the rule builder, on top of NeverSink's.
  rules: OwnRule[]
  presets: Presets
  // "Not for me" on a valuable hidden item: its price then, by group|base.
  healthDismissed: Record<string, number>
  // The same on a hidden item: the net leaves it hidden too.
  netDismissed: Record<string, number>
  // The rule list: what its switch shows, and the groups you pinned.
  ruleNav: { mode: NavMode, pins: string[] }
  timeline?: unknown
  // Dock icon notices you've turned off, and what each said when you pressed Got it.
  noticesOff: string[]
  noticesSeen: Record<string, string | number>
  // One step stricter / looser (NeverSink from GitHub only).
  stricterHotkey: string | null
  looserHotkey: string | null
  // Named filters you switch between, and the one in use.
  profiles: FilterProfile[]
  activeProfile: number
  // The highest id ever given: a deleted profile's id (and its undo file) is never reused.
  lastProfileId?: number
}

export function defaultPriceTiers (): PriceTiers {
  return { on: true, moves: [], prev: null, locks: [], appliedAt: null, uniqueRule: 'max' }
}

export function initLootFilterWidget (w: LootFilterWidget) {
  w.wmTitle = 'Loot filter'
  w.wmFlags = ['invisible-on-blur']
  w.anchor = popupAnchor()
  w.sampleHotkey = 'Alt + F'
  w.editorHotkey = 'Alt + Shift + F'
  w.reloadHotkey = 'Alt + Shift + R'
  w.folder = ''
  w.sourceName = ''
  w.sourceOnline = false
  w.sourceTitle = ''
  w.saveMode = 'copy'
  w.reloadViaChat = true
  w.reloadWhenSafe = true
  w.edits = []
  w.lastVersion = null
  w.fallbackAreaLevel = 83
  w.buildRules = { ...DEFAULT_BUILD_RULES }
  w.priceTiers = defaultPriceTiers()
  w.safetyNet = { ...DEFAULT_SAFETY_NET }
  w.neversink = defaultNeverSink()
  w.strictAuto = defaultStrictnessAuto()
  w.rules = []
  w.presets = defaultPresets()
  w.healthDismissed = {}
  w.netDismissed = {}
  w.ruleNav = { mode: 'endgame', pins: [] }
  w.noticesOff = []
  w.noticesSeen = {}
  w.stricterHotkey = 'Alt + BracketRight'
  w.looserHotkey = 'Alt + BracketLeft'
  w.profiles = []
  w.activeProfile = 1
}

// The editor's hotkeys only register once the widget exists, so it is on every
// overlay from the start. Already set up and hidden: adding it shows nothing.
// `taken` lists keys already in use; two actions on one key would both die.
export function seedLootFilterWidget (wmId: number, taken: string[] = []): LootFilterWidget {
  const w = { wmId, wmType: LOOT_FILTER_TYPE, wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [] } as unknown as LootFilterWidget
  initLootFilterWidget(w)
  // A new filter starts with the Loot and Equipment tabs on. It goes onto our
  // own base the first time it loads (store.ts load()), not before: an
  // overlay nobody set up stays quiet.
  w.presets.currency.on = true
  w.presets.weights.on = true
  // Order doesn't matter: 'Shift + Alt + F' is 'Alt + Shift + F'.
  const used = new Set(taken.map(sortKeys))
  const free = (key: string | null) => key && !used.has(sortKeys(key)) ? key : null
  w.sampleHotkey = free(w.sampleHotkey)
  w.editorHotkey = free(w.editorHotkey)
  w.reloadHotkey = free(w.reloadHotkey)
  w.stricterHotkey = free(w.stricterHotkey)
  w.looserHotkey = free(w.looserHotkey)
  return w
}

// Strictness levels, their hotkeys and the ladder work on our own filter and
// on NeverSink from GitHub; only the latter downloads anything.
export const levelsOn = (w: { neversink?: { on?: boolean }, ownBase?: boolean }): boolean => w.ownBase === true || w.neversink?.on === true
export const nsDownload = (w: { neversink?: { on?: boolean }, ownBase?: boolean }): boolean => w.ownBase !== true && w.neversink?.on === true

// Once per config (Config.ts, woke.lootOnByDefault): the Loot and Equipment tabs go on for
// the profile in use and every stored one, as NeverSink's tab is retired.
export function lootOnForAll (w: { presets?: unknown, profiles?: Array<{ data?: { presets?: unknown } }> }) {
  const on = (holder: { presets?: unknown }) => {
    const p = (holder.presets && typeof holder.presets === 'object' ? holder.presets : {}) as Record<string, unknown>
    // Loot and Equipment both (Guy, 2026-11-28: Equipment out of beta too).
    for (const k of ['currency', 'weights']) {
      const c = (p[k] && typeof p[k] === 'object' ? p[k] : {}) as { on?: boolean }
      c.on = true
      p[k] = c
    }
    holder.presets = p
  }
  on(w)
  for (const p of Array.isArray(w.profiles) ? w.profiles : []) if (p?.data && typeof p.data === 'object') on(p.data)
}

export function normalizeLootFilterWidget (w: LootFilterWidget) {
  if (!w.anchor) w.anchor = popupAnchor()
  if (w.sampleHotkey === undefined) w.sampleHotkey = null
  if (w.editorHotkey === undefined) w.editorHotkey = null
  // Not Alt + R: that's Map mods' scan rolling mode.
  if (w.reloadHotkey === undefined) w.reloadHotkey = 'Alt + Shift + R'
  if (typeof w.folder !== 'string') w.folder = ''
  if (typeof w.sourceName !== 'string') w.sourceName = ''
  if (w.saveMode !== 'overwrite') w.saveMode = 'copy'
  if (typeof w.reloadViaChat !== 'boolean') w.reloadViaChat = true
  if (typeof w.reloadWhenSafe !== 'boolean') w.reloadWhenSafe = true
  if (typeof w.sourceOnline !== 'boolean') w.sourceOnline = false
  if (typeof w.sourceTitle !== 'string') w.sourceTitle = ''
  w.edits = Array.isArray(w.edits) ? w.edits.filter(isValidEdit) : []
  if (w.lastVersion === undefined) w.lastVersion = null
  if (typeof w.fallbackAreaLevel !== 'number') w.fallbackAreaLevel = 83
  if (!w.buildRules || typeof w.buildRules !== 'object') w.buildRules = { ...DEFAULT_BUILD_RULES }
  for (const k of Object.keys(DEFAULT_BUILD_RULES) as Array<keyof BuildRuleSwitches>) {
    if (typeof w.buildRules[k] !== 'boolean') w.buildRules[k] = DEFAULT_BUILD_RULES[k]
  }
  const pt = w.priceTiers as Partial<PriceTiers> | undefined
  if (!pt || typeof pt !== 'object') {
    w.priceTiers = defaultPriceTiers()
  } else {
    const d = defaultPriceTiers()
    w.priceTiers = {
      on: typeof pt.on === 'boolean' ? pt.on : d.on,
      moves: Array.isArray(pt.moves) ? pt.moves : [],
      prev: Array.isArray(pt.prev) ? pt.prev : null,
      locks: Array.isArray(pt.locks) ? pt.locks.filter(x => typeof x === 'string') : [],
      appliedAt: typeof pt.appliedAt === 'number' ? pt.appliedAt : null,
      uniqueRule: pt.uniqueRule === 'min' ? 'min' : 'max'
    }
  }
  if (!w.safetyNet || typeof w.safetyNet !== 'object') w.safetyNet = { ...DEFAULT_SAFETY_NET }
  if (typeof w.safetyNet.on !== 'boolean') w.safetyNet.on = DEFAULT_SAFETY_NET.on
  if (typeof w.safetyNet.minChaos !== 'number' || !(w.safetyNet.minChaos > 0)) w.safetyNet.minChaos = DEFAULT_SAFETY_NET.minChaos
  const last = w.safetyNet.last
  if (last && (!Array.isArray(last.plain) || !Array.isArray(last.unique))) delete w.safetyNet.last
  const ns = w.neversink as Partial<NeverSinkSource> | undefined
  const dn = defaultNeverSink()
  w.neversink = {
    on: typeof ns?.on === 'boolean' ? ns.on : dn.on,
    version: typeof ns?.version === 'string' ? ns.version : null,
    prevVersion: typeof ns?.prevVersion === 'string' ? ns.prevVersion : null,
    style: typeof ns?.style === 'string' ? ns.style : '',
    level: typeof ns?.level === 'number' ? clampLevel(ns.level) : dn.level,
    latest: typeof ns?.latest === 'string' ? ns.latest : null,
    latestChanges: typeof ns?.latestChanges === 'string' ? ns.latestChanges : '',
    checkedAt: typeof ns?.checkedAt === 'number' ? ns.checkedAt : null
  }
  const sa = w.strictAuto as Partial<StrictnessAuto> | undefined
  const da = defaultStrictnessAuto()
  w.strictAuto = {
    on: typeof sa?.on === 'boolean' ? sa.on : da.on,
    paused: typeof sa?.paused === 'boolean' ? sa.paused : false,
    ladder: Array.isArray(sa?.ladder) && sa!.ladder.length && sa!.ladder.every(x => typeof x?.from === 'number' && typeof x?.level === 'number')
      ? sa!.ladder.map(x => ({ from: x.from, level: clampLevel(x.level) }))
      : da.ladder
  }
  if (!Array.isArray(w.rules)) w.rules = []
  w.rules = w.rules.filter(r => r && typeof r.id === 'number' && Array.isArray(r.conditions) && isPatch(r.patch))
  w.presets = normalizePresets(w.presets)
  if (!w.healthDismissed || typeof w.healthDismissed !== 'object') w.healthDismissed = {}
  if (!w.netDismissed || typeof w.netDismissed !== 'object') w.netDismissed = {}
  const nav = w.ruleNav as Partial<LootFilterWidget['ruleNav']> | undefined
  w.ruleNav = {
    mode: nav?.mode === 'campaign' || nav?.mode === 'all' ? nav.mode : 'endgame',
    pins: Array.isArray(nav?.pins) ? nav.pins.filter(p => typeof p === 'string') : []
  }
  if (!Array.isArray(w.noticesOff)) w.noticesOff = []
  if (!w.noticesSeen || typeof w.noticesSeen !== 'object') w.noticesSeen = {}
  if (w.stricterHotkey === undefined) w.stricterHotkey = 'Alt + BracketRight'
  if (w.looserHotkey === undefined) w.looserHotkey = 'Alt + BracketLeft'
  normalizeProfiles(w)
}

// The name the first profile gets: the file it already saves to, so the list
// says what the game's filter list says.
export function firstProfileName (w: LootFilterWidget): string {
  if (!w.sourceName && !w.neversink?.on) return 'My filter'
  const stem = outputName({ ...w, profile: null }).replace(/\.filter$/i, '').replace(/\s*\(woke\)\s*$/i, '').trim()
  return cleanProfileName(stem) || 'My filter'
}

// Every widget has at least one profile; the one there before profiles came
// keeps its file (and its undo steps, history-file.ts).
export function normalizeProfiles (w: LootFilterWidget) {
  const list = Array.isArray(w.profiles) ? w.profiles : []
  const seen = new Set<number>()
  w.profiles = list.filter(p => {
    if (!p || typeof p.id !== 'number' || !Number.isInteger(p.id) || p.id < 1 || seen.has(p.id) || typeof p.name !== 'string') return false
    seen.add(p.id)
    return true
  })
  for (const p of w.profiles) {
    p.name = cleanProfileName(p.name) || `Profile ${p.id}`
    if (p.data != null && typeof p.data !== 'object') delete p.data
  }
  if (!w.profiles.length) {
    w.profiles = [{ id: 1, name: firstProfileName(w), legacyFile: true }]
    w.activeProfile = 1
  }
  if (!w.profiles.some(p => p.id === w.activeProfile)) {
    // The one in use is the one without a stored copy.
    w.activeProfile = (w.profiles.find(p => !p.data) ?? w.profiles[0]).id
  }
  const top = Math.max(...w.profiles.map(p => p.id))
  if (typeof w.lastProfileId !== 'number' || !(w.lastProfileId >= top)) w.lastProfileId = top
  // The one in use lives on the widget.
  const active = w.profiles.find(p => p.id === w.activeProfile)!
  if (active.data) delete active.data
}

export function editorHotkeyTarget (wmId: number): string {
  return `woke-loot-filter:${wmId}`
}

export function parseEditorHotkeyTarget (target: string): number | null {
  const m = /^woke-loot-filter:(\d+)$/.exec(target)
  return m ? Number(m[1]) : null
}

export function reloadHotkeyTarget (wmId: number): string {
  return `woke-loot-filter:${wmId}:reload`
}

export function parseReloadHotkeyTarget (target: string): number | null {
  const m = /^woke-loot-filter:(\d+):reload$/.exec(target)
  return m ? Number(m[1]) : null
}

export function strictnessHotkeyTarget (wmId: number, dir: 'stricter' | 'looser'): string {
  return `woke-loot-filter:${wmId}:${dir}`
}

export function parseStrictnessTarget (target: string): { wmId: number, dir: 'stricter' | 'looser' } | null {
  const m = /^woke-loot-filter:(\d+):(stricter|looser)$/.exec(target)
  return m ? { wmId: Number(m[1]), dir: m[2] as 'stricter' | 'looser' } : null
}

export function isWokeCopy (name: string): boolean {
  return /\(woke\)\.filter$/i.test(name)
}

// The filter a copy saved by this editor was made from, when the original is
// gone (the game empties OnlineFilters): its text without our header and rules.
export function baseFromCopy (text: string): string {
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  let i = 0
  if (/^# WOKE-LOOT-FILTER-EDITOR\b/.test(lines[0] ?? '')) {
    while (i < lines.length && lines[i].startsWith('#') && lines[i].trim() !== '' && i < 3) i++
    if (lines[i]?.trim() === '') i++
  }
  for (; i < lines.length; i++) {
    if (/^(Show|Hide|Minimal)\b.*\$type->woke->/.test(lines[i])) {
      i++
      while (i < lines.length && /^\s+\S/.test(lines[i])) i++
      if (lines[i]?.trim() !== '') i--
      continue
    }
    out.push(lines[i])
  }
  return out.join('\n')
}

type OutputOf = Pick<LootFilterWidget, 'sourceName' | 'saveMode' | 'sourceOnline' | 'sourceTitle'> & {
  neversink?: { on: boolean }
  // The profile it saves for; without one, the profile in use (if any).
  profile?: Pick<FilterProfile, 'name' | 'legacyFile'> | null
  profiles?: FilterProfile[]
  activeProfile?: number
}

export function outputName (w: OutputOf): string {
  const profile = w.profile !== undefined ? w.profile : w.profiles?.find(p => p.id === w.activeProfile)
  // A named profile writes "<name> (woke).filter"; the first one keeps the
  // file it had before profiles until it's renamed.
  const named = profile ? cleanProfileName(profile.name) : ''
  if (profile && !profile.legacyFile && named) return `${named} (woke).filter`
  const legacy = legacyOutput(w)
  // The first profile's old file can't be another profile's: two would write one file.
  if (profile && named && w.profiles?.some(p => p.name !== profile.name && !p.legacyFile && `${cleanProfileName(p.name)} (woke).filter`.toLowerCase() === legacy.toLowerCase())) {
    return `${named} (woke).filter`
  }
  return legacy
}

function legacyOutput (w: OutputOf): string {
  if (w.neversink?.on) return NEVERSINK_OUTPUT
  // Our own filter with no file ever picked (a new install).
  if (!w.sourceName) return OWN_OUTPUT
  // Working on an edited copy itself: it stays the copy.
  if (!w.sourceOnline && isWokeCopy(w.sourceName)) return w.sourceName
  if (w.sourceOnline) {
    const safe = (w.sourceTitle || w.sourceName).replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    return `${safe || 'Online filter'} (woke).filter`
  }
  if (w.saveMode === 'overwrite') return w.sourceName
  return w.sourceName.replace(/\.filter$/i, '') + ' (woke).filter'
}
