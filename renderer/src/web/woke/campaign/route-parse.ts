// Parser for the exile-leveling route files bundled in ./route (MIT, see
// route/README.md), plus the rules that move the route forward as you play.
// Pure functions only: route-data.ts feeds in the bundled text and data.

export type AreaRow = [name: string, act: number, level: number, isTown: boolean, hasWaypoint: boolean, parentTown: string | null, crafting: string[]]

export interface RouteData {
  areas: Record<string, AreaRow>
  quests: Record<string, string>
  killWaypoints: Record<string, string[]>
}

export interface RouteOptions {
  // Trials, the Den portal and other extra stops worth doing on a fresh league.
  leagueStart: boolean
  // Siosa's library gem stop in act 3.
  library: boolean
  bandit: 'kill' | 'oak' | 'kraityn' | 'alira'
}

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = { leagueStart: true, library: true, bandit: 'kill' }

export type PartKind =
  'text' | 'area' | 'town' | 'kill' | 'quest' | 'item' | 'waypoint' | 'portal' |
  'logout' | 'trial' | 'craft' | 'dir' | 'generic'

export interface Part {
  kind: PartKind
  text: string
}

export interface RouteStep {
  // Index in the flat step list.
  index: number
  act: number
  parts: Part[]
  subs: Part[][]
  // Where you are before and after doing this step.
  areaBefore: string
  areaAfter: string
  // "Recommended Level: 16" pulled out of the sub-steps.
  recommendedLevel: number | null
}

export interface Route {
  steps: RouteStep[]
  // First step index of each act.
  actStarts: Map<number, number>
}

const DIRS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']

function defines (opts: RouteOptions): Set<string> {
  const set = new Set<string>()
  if (opts.leagueStart) set.add('LEAGUE_START')
  if (opts.library) set.add('LIBRARY')
  set.add({ kill: 'BANDIT_KILL', oak: 'BANDIT_OAK', kraityn: 'BANDIT_KRAITYN', alira: 'BANDIT_ALIRA' }[opts.bandit])
  return set
}

interface ParseState {
  area: string
  lastTown: string
  portalArea: string | null
}

// sources: route file text in act order.
export function parseRoute (sources: string[], data: RouteData, opts: RouteOptions = DEFAULT_ROUTE_OPTIONS): Route {
  const defs = defines(opts)
  const state: ParseState = { area: '1_1_1', lastTown: '1_1_town', portalArea: null }
  const steps: RouteStep[] = []
  const actStarts = new Map<number, number>()
  let act = 1

  const areaName = (id: string) => data.areas[id]?.[0] ?? id
  const enterArea = (id: string) => {
    const row = data.areas[id]
    if (row?.[3]) state.lastTown = id
    state.area = id
  }

  function fragment (raw: string): Part | null {
    const [kind, ...args] = raw.split('|')
    switch (kind) {
      case 'enter': {
        enterArea(args[0])
        const town = data.areas[args[0]]?.[3]
        return { kind: town ? 'town' : 'area', text: areaName(args[0]) }
      }
      case 'area': return { kind: 'area', text: areaName(args[0]) }
      case 'arena': return { kind: 'area', text: args[0] }
      case 'kill': return { kind: 'kill', text: args[0] }
      case 'logout':
        enterArea(state.lastTown)
        state.portalArea = null
        return { kind: 'logout', text: 'Logout' }
      case 'waypoint':
        if (args[0]) {
          enterArea(args[0])
          return { kind: 'waypoint', text: `Waypoint to ${areaName(args[0])}` }
        }
        return { kind: 'waypoint', text: 'waypoint' }
      case 'waypoint_get': return { kind: 'waypoint', text: 'waypoint' }
      case 'portal':
        if (args[0] === 'set') {
          state.portalArea = state.area
          return { kind: 'portal', text: 'portal' }
        }
        if (args[0] === 'use') {
          const row = data.areas[state.area]
          if (state.portalArea && state.portalArea !== state.area && row?.[3]) {
            enterArea(state.portalArea)
            state.portalArea = null
          } else {
            if (!row?.[3]) state.portalArea = state.area
            const town = row?.[5]
            if (town) enterArea(town)
          }
          return { kind: 'portal', text: 'portal' }
        }
        return null
      case 'quest': return { kind: 'quest', text: data.quests[args[0]] ?? args[0] }
      case 'quest_text': return { kind: 'item', text: args[0] }
      case 'generic': return { kind: 'generic', text: args[0] }
      case 'trial': return { kind: 'trial', text: 'Trial of Ascendancy' }
      case 'ascend':
        enterArea(state.lastTown)
        return { kind: 'trial', text: `${args[0][0].toUpperCase()}${args[0].slice(1)} Labyrinth` }
      case 'crafting': {
        const recipes = data.areas[args[0] ?? state.area]?.[6] ?? []
        return { kind: 'craft', text: recipes.length ? `crafting recipe (${recipes.join(', ')})` : 'crafting recipe' }
      }
      case 'dir': {
        const deg = ((Number(args[0]) % 360) + 360) % 360
        return { kind: 'dir', text: DIRS[Math.floor(deg / 45)] ?? '' }
      }
      default: return null
    }
  }

  function parseLine (text: string): Part[] {
    const parts: Part[] = []
    // Drop "#comment" tails (area names the route author wrote for themselves).
    const re = /\{([^}]+)\}|([^{#]+)|(#.*)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      if (m[3]) break
      if (m[2]) {
        if (m[2].trim() || parts.length) parts.push({ kind: 'text', text: m[2] })
      } else if (m[1]) {
        const part = fragment(m[1])
        if (part) parts.push(part)
      }
    }
    // Trim trailing whitespace text.
    while (parts.length && parts[parts.length - 1].kind === 'text' && !parts[parts.length - 1].text.trim()) parts.pop()
    if (parts.length && parts[parts.length - 1].kind === 'text') {
      parts[parts.length - 1] = { kind: 'text', text: parts[parts.length - 1].text.trimEnd() }
    }
    return parts
  }

  for (const source of sources) {
    const cond: boolean[] = []
    for (const raw of source.split(/\r\n|\r|\n/)) {
      const line = raw.trim()
      if (!line) continue
      let m = /^#section\s*(.*)/.exec(line)
      if (m) {
        const n = /Act\s+(\d+)/i.exec(m[1])
        if (n) act = Number(n[1])
        if (!actStarts.has(act)) actStarts.set(act, steps.length)
        continue
      }
      if (/^#endif/.test(line)) { cond.pop(); continue }
      m = /^#(ifn?def)\s+(\S+)/.exec(line)
      if (m) {
        cond.push(m[1] === 'ifdef' ? defs.has(m[2]) : !defs.has(m[2]))
        continue
      }
      if (cond.includes(false)) continue
      m = /^#sub\s*(.*)/.exec(line)
      if (m) {
        const prev = steps[steps.length - 1]
        if (!prev) continue
        const parts = parseLine(m[1])
        const text = parts.map(p => p.text).join('')
        const lvl = /Recommended Level:\s*(\d+)/i.exec(text)
        if (lvl) prev.recommendedLevel = Number(lvl[1])
        else if (parts.length) prev.subs.push(parts)
        continue
      }
      if (line.startsWith('#')) continue
      const areaBefore = state.area
      const parts = parseLine(line)
      if (!parts.length) continue
      steps.push({ index: steps.length, act, parts, subs: [], areaBefore, areaAfter: state.area, recommendedLevel: null })
    }
  }
  return { steps, actStarts }
}

// ---- progress ----

// How far ahead a zone change may move the route. Keeps a town visit or a
// detour from jumping to some later step in the same town.
const LOOKAHEAD = 14

function entersArea (step: RouteStep, areaId: string): boolean {
  return step.areaAfter === areaId && step.areaBefore !== areaId
}

// Returns the new current step after entering an area, or `current` when
// the area isn't the next stop on the route.
export function advanceOnEnter (route: Route, current: number, areaId: string, data: RouteData): number {
  const steps = route.steps
  const end = Math.min(steps.length, current + LOOKAHEAD)
  for (let i = current; i < end; i++) {
    if (entersArea(steps[i], areaId)) return i + 1
  }
  // Far ahead (skipped part of the route, or progress was lost): only trust
  // non-town areas, which the route enters once or twice at most.
  if (data.areas[areaId]?.[3]) return current
  const act = actOfArea(areaId, data)
  if (act == null) return current
  for (let i = end; i < steps.length; i++) {
    if (steps[i].act > act + 1) break
    if (entersArea(steps[i], areaId)) return i + 1
  }
  return current
}

// Best guess of where you are on a freshly built route (options changed).
export function resyncTo (route: Route, areaId: string): number {
  const i = route.steps.findIndex(s => entersArea(s, areaId))
  return i >= 0 ? i + 1 : 0
}

export function actOfArea (areaId: string, data: RouteData): number | null {
  return data.areas[areaId]?.[1] ?? null
}

// The steps to show: the current one and the next `count - 1`.
export function upcoming (route: Route, current: number, count: number): RouteStep[] {
  return route.steps.slice(current, current + count)
}

// The last `count` finished steps, oldest first.
export function behind (route: Route, current: number, count: number): RouteStep[] {
  if (count <= 0) return []
  return route.steps.slice(Math.max(0, current - count), Math.min(current, route.steps.length))
}

// How far into the current step's act you are: steps done of the act's total.
export function actProgress (route: Route, current: number): { done: number, total: number } | null {
  const step = route.steps[current]
  if (!step) return null
  const inAct = route.steps.filter(s => s.act === step.act)
  return { done: inAct.filter(s => s.index < current).length, total: inAct.length }
}

export function stepsLeftInAct (route: Route, current: number): number {
  const step = route.steps[current]
  if (!step) return 0
  let n = 0
  for (let i = current; i < route.steps.length && route.steps[i].act === step.act; i++) n++
  return n
}

// ---- XP penalty ----

// PoE 1: no penalty while the gap to the monster level is within
// 3 + floor(level / 16). Past that the XP multiplier is
// ((L + 5) / (L + 5 + d^2.5))^1.5 where d is the gap beyond the safe range.
// (Characters 95+ get an extra penalty that doesn't matter in the campaign.)
export function xpSafeRange (charLevel: number): number {
  return 3 + Math.floor(charLevel / 16)
}

export function xpMultiplier (charLevel: number, areaLevel: number): number {
  const d = Math.max(0, Math.abs(charLevel - areaLevel) - xpSafeRange(charLevel))
  if (d === 0) return 1
  return Math.pow((charLevel + 5) / (charLevel + 5 + Math.pow(d, 2.5)), 1.5)
}

export type XpBand = 'safe' | 'edge' | 'penalty'

export interface XpState {
  band: XpBand
  // Character level minus area level: + over-levelled, − under-levelled.
  diff: number
  safeRange: number
  multiplier: number
}

// Green inside the band, amber on its last level (one more level and you
// start losing XP), red once XP is lost.
export function xpState (charLevel: number, areaLevel: number): XpState {
  const diff = charLevel - areaLevel
  const safeRange = xpSafeRange(charLevel)
  const multiplier = xpMultiplier(charLevel, areaLevel)
  const band: XpBand = multiplier < 1 ? 'penalty' : Math.abs(diff) >= safeRange ? 'edge' : 'safe'
  return { band, diff, safeRange, multiplier }
}
