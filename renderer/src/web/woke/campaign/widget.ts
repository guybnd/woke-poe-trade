import type { Widget, Anchor } from '@/web/overlay/widgets'
import { actFromAreaId, isTown } from './log-parse'
import { DEFAULT_ROUTE_OPTIONS } from './route-parse'
import type { PinId } from './pins'
import type { RouteOptions } from './route-parse'

export const CAMPAIGN_TYPE = 'woke-campaign'

export interface CampaignState {
  zone: string
  areaId: string
  areaLevel: number | null
  act: number | null
  charName: string
  className: string
  level: number | null
  updatedAt: number
  // Build gems ticked as bought or taken for this character (PoB names).
  gemsGot?: string[]
  // Past the campaign: no icon, and the route stays where it is.
  asleep?: boolean
  // When each route step became the current one (ms, keyed by step index),
  // so the card can show how long the steps behind you took.
  stepStarts?: Record<string, number>
}

export interface ZoneNote {
  id: number
  zone: string
  text: string
}

export interface CampaignWidget extends Widget {
  anchor: Anchor
  // Only track level-ups for this character ('' = any character seen).
  charName: string
  // Optional personal notes per act ("1".."10", "11" = epilogue).
  actNotes: Record<string, string>
  // Optional notes shown when entering a zone with this exact name.
  zoneNotes: ZoneNote[]
  showBuild: boolean
  state: CampaignState
  // Built-in route (exile-leveling) options and progress.
  route: RouteOptions
  step: number
  // Values kept on screen in the icon (none by default).
  pins: PinId[]
  // How many route steps the card lists (current one included).
  cardSteps: number
  // How many finished steps the card lists above the current one (0 = none).
  cardBehind: number
  hotkeyCard: string | null
  hotkeyNext: string | null
  hotkeyPrev: string | null
  // Every character's own route step and state, by name, while another is
  // followed (the one followed lives in `step` and `state`).
  chars?: Record<string, CharProfile>
}

export interface CharProfile {
  step: number
  state: CampaignState
}

// How long the followed character must go without levelling before another
// character's level-ups can take over.
export const SWITCH_QUIET_MS = 20 * 60 * 1000
// Characters kept besides the one followed; the longest unseen goes first.
export const MAX_SAVED_CHARS = 10

// Should a level-up by `name` switch the tracker to that character? The log
// names a character only when it levels, and logs party members' level-ups
// too, so a switch needs two level-ups of `name` in a row while the followed
// character hasn't levelled for SWITCH_QUIET_MS. In a party you both level,
// so it never fires; on an alt, the followed character has gone quiet.
export function shouldSwitch (followed: string, name: string, streak: number, followedLevelAt: number, now: number): boolean {
  if (!followed || name === followed) return false
  return streak >= 2 && now - followedLevelAt >= SWITCH_QUIET_MS
}

// Puts the followed character away (if any) and takes out `name`'s own route
// and state, or a fresh one at `freshStep` for a character not seen before.
export function switchCharacter (w: CampaignWidget, c: { charName: string, className: string, level: number }, freshStep: number) {
  const saved = w.chars?.[c.charName]
  const kept = Object.entries(w.chars ?? {}).filter(([name]) => name !== c.charName)
  // The one stored now goes first, so it wins ties (a replay stamps many alike).
  if (w.state.charName) kept.unshift([w.state.charName, { step: w.step, state: { ...w.state } }])
  kept.sort((a, b) => b[1].state.updatedAt - a[1].state.updatedAt)
  w.chars = Object.fromEntries(kept.slice(0, MAX_SAVED_CHARS))
  const where = { zone: w.state.zone, areaId: w.state.areaId, areaLevel: w.state.areaLevel, act: w.state.act, updatedAt: w.state.updatedAt }
  // A saved character higher than this one is an old character of the same
  // name (deleted and made again): start fresh instead.
  if (saved && (saved.state.level == null || saved.state.level <= c.level)) {
    w.step = saved.step
    w.state = { ...saved.state, ...where }
  } else {
    w.step = freshStep
    w.state = { ...emptyState(), ...where }
  }
  w.state.charName = c.charName
  w.state.className = c.className
  w.state.level = c.level
}

// Keeps `state` as the followed character's own: saves the one before under
// its name (the Twilight Strand starts a new character).
export function saveCharacter (w: CampaignWidget) {
  if (!w.state.charName) return
  const kept = Object.entries(w.chars ?? {}).filter(([name]) => name !== w.state.charName)
  kept.unshift([w.state.charName, { step: w.step, state: { ...w.state, stepStarts: { ...(w.state.stepStarts ?? {}) }, gemsGot: [...(w.state.gemsGot ?? [])] } }])
  kept.sort((a, b) => b[1].state.updatedAt - a[1].state.updatedAt)
  w.chars = Object.fromEntries(kept.slice(0, MAX_SAVED_CHARS))
}

export function emptyState (): CampaignState {
  return { zone: '', areaId: '', areaLevel: null, act: null, charName: '', className: '', level: null, updatedAt: 0, gemsGot: [], stepStarts: {} }
}

// Fills settings added after the widget was first placed.
export function migrateCampaign (w: CampaignWidget) {
  if (!w.route) w.route = { ...DEFAULT_ROUTE_OPTIONS }
  if (typeof w.step !== 'number') w.step = 0
  if (w.cardSteps === undefined) w.cardSteps = 3
  if (w.cardBehind === undefined) w.cardBehind = 1
  if (!Array.isArray(w.pins)) w.pins = []
  if (w.hotkeyCard === undefined) w.hotkeyCard = null
  if (w.hotkeyNext === undefined) w.hotkeyNext = null
  if (w.hotkeyPrev === undefined) w.hotkeyPrev = null
  if (w.state && !Array.isArray(w.state.gemsGot)) w.state.gemsGot = []
  if (w.state && (w.state.stepStarts == null || typeof w.state.stepStarts !== 'object')) w.state.stepStarts = {}
}

// Step `step` became current at `at`. Starts for later steps go: after a
// step back they no longer say anything true.
export function markStepStart (starts: Record<string, number>, step: number, at: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(starts)) {
    if (Number(k) < step) out[k] = v
  }
  out[String(step)] = at
  return out
}

// Longer than this, a step's time is mostly a break or the game being shut,
// so it isn't shown.
export const STEP_TIME_CAP_MS = 60 * 60_000

// How long step `step` took: from it becoming current to the next one doing
// so. Null when either moment is unknown (skipped steps, an old save), or the
// time can't be a real step (zero, or over the cap).
export function stepTook (starts: Record<string, number>, step: number): number | null {
  const a = starts[String(step)]
  const b = starts[String(step + 1)]
  if (a == null || b == null) return null
  const ms = b - a
  return ms > 0 && ms <= STEP_TIME_CAP_MS ? ms : null
}

// The log doesn't say which character is playing, so where you go decides:
// a map means past the campaign, and a campaign zone that isn't a town (the
// Twilight Strand for a new character) means levelling again. Towns and
// hideouts say nothing, since anyone can walk through them.
export function routeAsleepAfter (asleep: boolean, areaId: string): boolean {
  if (/^Map/i.test(areaId)) return true
  if (actFromAreaId(areaId) != null && !isTown(areaId)) return false
  return asleep
}

export type CampaignHotkey = 'card' | 'next' | 'prev'

export function hotkeyTarget (wmId: number, action: CampaignHotkey): string {
  return `woke-campaign:${wmId}:${action}`
}

export function parseHotkeyTarget (target: string): { wmId: number, action: CampaignHotkey } | null {
  const m = /^woke-campaign:(\d+):(card|next|prev)$/.exec(target)
  return m ? { wmId: Number(m[1]), action: m[2] as CampaignHotkey } : null
}
