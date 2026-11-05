import type { Widget, Anchor } from '@/web/overlay/widgets'
import type { FilterEdit } from './edits'
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

export interface LootFilterWidget extends Widget {
  anchor: Anchor
  // Hover an item and press: card with the rule that matched it.
  sampleHotkey: string | null
  // Opens the full editor.
  editorHotkey: string | null
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
  // Hold that chat command until you're in town or your hideout.
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
  priceTiers: PriceTiers
  safetyNet: SafetyNet
  // Changes as they were at each of the last saves, newest first.
  history: SavePoint[]
  neversink: NeverSinkSource
  strictAuto: StrictnessAuto
  // Rules from the rule builder, on top of NeverSink's.
  rules: OwnRule[]
  presets: Presets
  // One step stricter / looser (NeverSink from GitHub only).
  stricterHotkey: string | null
  looserHotkey: string | null
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
  w.history = []
  w.neversink = defaultNeverSink()
  w.strictAuto = defaultStrictnessAuto()
  w.rules = []
  w.presets = defaultPresets()
  w.stricterHotkey = 'Alt + BracketRight'
  w.looserHotkey = 'Alt + BracketLeft'
}

export function normalizeLootFilterWidget (w: LootFilterWidget) {
  if (!w.anchor) w.anchor = popupAnchor()
  if (w.sampleHotkey === undefined) w.sampleHotkey = null
  if (w.editorHotkey === undefined) w.editorHotkey = null
  if (typeof w.folder !== 'string') w.folder = ''
  if (typeof w.sourceName !== 'string') w.sourceName = ''
  if (w.saveMode !== 'overwrite') w.saveMode = 'copy'
  if (typeof w.reloadViaChat !== 'boolean') w.reloadViaChat = true
  if (typeof w.reloadWhenSafe !== 'boolean') w.reloadWhenSafe = true
  if (typeof w.sourceOnline !== 'boolean') w.sourceOnline = false
  if (typeof w.sourceTitle !== 'string') w.sourceTitle = ''
  if (!Array.isArray(w.edits)) w.edits = []
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
  if (!Array.isArray(w.history)) w.history = []
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
  w.rules = w.rules.filter(r => r && typeof r.id === 'number' && Array.isArray(r.conditions))
  w.presets = normalizePresets(w.presets)
  if (w.stricterHotkey === undefined) w.stricterHotkey = 'Alt + BracketRight'
  if (w.looserHotkey === undefined) w.looserHotkey = 'Alt + BracketLeft'
}

export function editorHotkeyTarget (wmId: number): string {
  return `woke-loot-filter:${wmId}`
}

export function parseEditorHotkeyTarget (target: string): number | null {
  const m = /^woke-loot-filter:(\d+)$/.exec(target)
  return m ? Number(m[1]) : null
}

export function strictnessHotkeyTarget (wmId: number, dir: 'stricter' | 'looser'): string {
  return `woke-loot-filter:${wmId}:${dir}`
}

export function parseStrictnessTarget (target: string): { wmId: number, dir: 'stricter' | 'looser' } | null {
  const m = /^woke-loot-filter:(\d+):(stricter|looser)$/.exec(target)
  return m ? { wmId: Number(m[1]), dir: m[2] as 'stricter' | 'looser' } : null
}

export function outputName (w: Pick<LootFilterWidget, 'sourceName' | 'saveMode' | 'sourceOnline' | 'sourceTitle'> & { neversink?: { on: boolean } }): string {
  if (w.neversink?.on) return NEVERSINK_OUTPUT
  if (w.sourceOnline) {
    const safe = (w.sourceTitle || w.sourceName).replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    return `${safe || 'Online filter'} (woke).filter`
  }
  if (w.saveMode === 'overwrite') return w.sourceName
  return w.sourceName.replace(/\.filter$/i, '') + ' (woke).filter'
}
