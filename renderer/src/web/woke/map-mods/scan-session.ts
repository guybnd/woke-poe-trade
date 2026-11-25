// Map scan's live state, shared by the Map mods window's scan box and the
// scan layer (dock icon, on-screen badge, hotkeys). One per app: only the
// first Map mods window scans (see isScanOwner).
import { computed, shallowRef } from 'vue'
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../shared/host'
import { DEFAULT_JUICE_WEIGHTS, defaultProfile, juiceScore, rateMods, shortLabel, withOtherWordings, VERDICT_LABEL as VERDICT_WORD } from './rules'
import type { ModRating, Verdict } from './rules'
import { TooltipMatcher } from './tooltip-parse'
import { allAreaMods, sameSenseWordings, statWordings } from './data'
import { findMapModsConfig } from './check'
import { activeProfile, MAP_MODS_TYPE } from './widget'
import type { MapModsWidget } from './widget'
import { sameSlot } from './scan'

// 'unsure': would be a run, but some lines were read with low confidence.
export type ShownVerdict = Verdict | 'unsure'
export const VERDICT_LABEL: Record<ShownVerdict, string> = { ...VERDICT_WORD, unsure: '?' }

export interface ScanEntry {
  id: number
  at: { x: number, y: number }
  verdict: ShownVerdict
  juice: number
  label: string
  rerolls: number
  flash: boolean
  // Reroll number while rolling.
  rollN?: number
  // Number of lines read with low confidence; a "run" isn't trusted then.
  unsure: number
  // text: the line as read, with its numbers.
  flagged: Array<{ matcher: string, text: string, label: string, rating: ModRating }>
}

export interface ScanReading { lines: string[], at: { x: number, y: number }, rolling?: boolean }

// Only the first Map mods window scans: it's the one whose profile rates maps
// everywhere else too (findMapModsConfig), and two would draw two badges.
export function isScanOwner (w: { wmId: number }): boolean {
  const first = AppConfig().widgets.find(_ => _.wmType === MAP_MODS_TYPE)
  return first?.wmId === w.wmId
}

export const running = shallowRef(false)
export const rolling = shallowRef(false)
export const locked = shallowRef(false)
export const rolls = shallowRef<Array<{ n: number, verdict: Verdict, juice: number }>>([])
export const message = shallowRef<string | null>(null)
// Another scan mode has the screen; this one resumes when it stops.
export const paused = shallowRef(false)
export const entries = shallowRef<ScanEntry[]>([])
export const current = shallowRef<ScanEntry | null>(null)
export const setupProblem = shallowRef<string | null>(null)

let nextId = 1
// Where the current roll count belongs.
let rollSlot: { x: number, y: number } | null = null
let matcher: TooltipMatcher | null = null

export const recent = computed(() => entries.value.slice(-8).reverse())
export const tally = computed(() => {
  const t = { run: 0, careful: 0, skip: 0 }
  for (const e of entries.value) {
    if (e.verdict === 'run') t.run++
    else if (e.verdict === 'careful' || e.verdict === 'unsure') t.careful++
    else t.skip++
  }
  return t
})

export function onReading (reading: ScanReading, alertOnPass: boolean) {
  matcher ??= new TooltipMatcher(allAreaMods())
  const cfg: MapModsWidget | null = findMapModsConfig()
  const profile = cfg ? activeProfile(cfg) : defaultProfile()
  // Mods the user rated are always compared in full, never skipped by the
  // first-word shortcut.
  // A rating counts for its stat's other wordings that say the same thing, so
  // those are compared in full too.
  const rated = Object.keys(profile.ratings ?? {})
  matcher.setAlwaysCheck([...rated, ...rated.flatMap(sameSenseWordings), ...Object.keys(profile.mins ?? {})])
  const scanned = matcher.parse(reading.lines)
  if (!scanned) {
    current.value = null
    return
  }
  // As the map card rates them: a rating saved under another wording of the
  // mod's stat ("Areas contain" for "Area contains") counts.
  const ratings = withOtherWordings(profile.ratings ?? {}, scanned.mods.map(m => ({ matcher: m.matcher, wordings: statWordings(m.matcher) })))
  const verdict = rateMods(scanned.mods, { ...profile, ratings })
  const juice = juiceScore({ ...scanned.props, goodMods: verdict.good.length }, cfg?.weights ?? DEFAULT_JUICE_WEIGHTS)
  const flagged = [...verdict.deadly, ...verdict.warn, ...verdict.good]
    .map(m => ({ matcher: m.matcher, text: m.text || m.matcher, label: shortLabel(m.matcher), rating: m.rating }))
  const label = verdict.deadly.length
    ? flagged.filter(f => f.rating === 'deadly').map(f => f.label).join(' · ')
    : scanned.tier ? `T${scanned.tier} map` : 'Map'

  // Same slot as an earlier reading (rerolling in place): replace it.
  const list = entries.value.slice()
  const aspect = window.innerWidth / window.innerHeight
  const idx = list.findIndex(e => sameSlot(e.at, reading.at, aspect))
  const prev = idx >= 0 ? list[idx] : null
  let rollN: number | undefined
  // A map's mods mean a roll; other tooltips (gear, a map hovered on the way past
  // with none) don't. Another slot starts a new count.
  if (reading.rolling && scanned.mods.length) {
    if (!rollSlot || !sameSlot(rollSlot, reading.at, aspect)) rolls.value = []
    rollSlot = reading.at
    rollN = rolls.value.length + 1
    rolls.value = [...rolls.value, { n: rollN, verdict: verdict.verdict, juice: juice.score }]
  }
  // The first read of a map is where it starts, not a reroll that passed.
  // While rolling, a reading with no mods (a scoured map) isn't a roll, so it can't pass either.
  const passes = verdict.verdict === 'run' && (rollN != null
    ? rollN > 1
    : !reading.rolling && Boolean(prev && prev.verdict !== 'run'))
  const entry: ScanEntry = {
    id: nextId++,
    at: prev?.at ?? reading.at,
    verdict: verdict.verdict === 'run' && scanned.weak.length ? 'unsure' : verdict.verdict,
    juice: juice.score,
    label,
    rerolls: prev ? prev.rerolls + 1 : 0,
    unsure: scanned.weak.length,
    flash: Boolean(alertOnPass && passes && !scanned.weak.length),
    rollN,
    flagged
  }
  if (idx >= 0) list.splice(idx, 1)
  list.push(entry)
  entries.value = list
  current.value = { ...entry, at: reading.at }
}

export function onScanState (d: { running?: boolean, paused?: boolean, rolling?: boolean, locked?: boolean, message?: string }) {
  running.value = Boolean(d.running)
  paused.value = Boolean(d.paused)
  const nowRolling = Boolean(d.rolling)
  if (nowRolling && !rolling.value) { rolls.value = []; rollSlot = null }
  rolling.value = nowRolling
  locked.value = Boolean(d.locked)
  message.value = d.message ?? null
  if (!running.value) current.value = null
}

// Scan mode on/off. Resolves true when it started.
export async function toggleScan (): Promise<boolean> {
  message.value = null
  try {
    // Paused for the other scan mode: the hotkey takes the screen back.
    if (running.value && !paused.value) {
      await hostRequest('map-scan-stop', null)
      running.value = false
      current.value = null
      return false
    }
    await hostRequest('map-scan-start', null)
    running.value = true
    return true
  } catch (err) {
    message.value = err instanceof Error ? err.message : String(err)
    throw err
  }
}

// Rolling mode on/off (starts scanning if needed). Resolves true when rolling.
export async function toggleRoll (): Promise<boolean> {
  message.value = null
  try {
    const s = await hostRequest('map-scan-roll', null)
    running.value = s.running
    return Boolean(s.rolling)
  } catch (err) {
    message.value = err instanceof Error ? err.message : String(err)
    throw err
  }
}

// Empties the list; returns an undo.
export function clearScan (): () => void {
  const before = { entries: entries.value, rolls: rolls.value }
  entries.value = []
  rolls.value = []
  current.value = null
  hostRequest('map-scan-reread', null).catch(() => {})
  return () => { entries.value = before.entries; rolls.value = before.rolls }
}

// The scanning window went away: stop main's scanner and forget its state,
// since its events aren't listened to any more.
export function stopScan () {
  if (running.value) hostRequest('map-scan-stop', null).catch(() => {})
  running.value = false
  paused.value = false
  rolling.value = false
  locked.value = false
  current.value = null
}

let ocrProbed = false
// Once, when the scan box first shows: are the OCR files there?
export function probeOcr () {
  if (ocrProbed) return
  ocrProbed = true
  hostRequest('ocr-check', null)
    .then(c => { setupProblem.value = c.ok ? null : c.message })
    .catch(() => {})
}

// On each mount of the scan layer: is a scan already running in main (the
// overlay reloaded mid-scan)?
export function probeScan () {
  hostRequest('map-scan-status', null)
    .then(s => { running.value = s.running; paused.value = Boolean(s.paused); rolling.value = Boolean(s.rolling) })
    .catch(() => {})
}
