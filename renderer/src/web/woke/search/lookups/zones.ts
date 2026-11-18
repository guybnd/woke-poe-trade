// Campaign zone cards: act, area level, waypoint, and what the levelling route
// does there (bosses, Trials of Ascendancy, quest items, hand-ins). All from
// the Campaign tool's bundled exile-leveling route (MIT, see
// campaign/route/README.md), read once when the palette opens.
import { DEFAULT_ROUTE_OPTIONS, arenaName, parseRoute } from '../../campaign/route-parse'
import type { RouteData } from '../../campaign/route-parse'
import { matchRank } from '../search'
import type { GemTable } from './gems'
import type { Lookup, LookupCard, LookupRow, LookupSection } from './types'

export interface ZoneBoss {
  name: string
  // The boss's own arena inside the zone, when the route names one.
  arena?: string
  // "Recommended Level" from the route's notes.
  level?: number
}

export interface Zone {
  id: string
  name: string
  act: number
  level: number
  town: boolean
  waypoint: boolean
  // The town a portal from here goes to.
  townName: string | null
  crafts: string[]
  bosses: ZoneBoss[]
  trial: boolean
  // Things the route has you find, take or use there ("Glyph", "Map Device").
  objectives: string[]
  // Quests the route hands in here (towns).
  quests: string[]
  // Zones the route goes on to from here, in route order.
  next: string[]
}

// Every zone the route goes through, in route order. Trials and extra stops
// are in (the league-start route), so every trial zone says so.
export function zoneFacts (sources: string[], data: RouteData): Zone[] {
  const zones = new Map<string, Zone>()
  const zone = (id: string): Zone | null => {
    const row = data.areas[id]
    if (!row) return null
    let z = zones.get(id)
    if (!z) {
      const [name, act, level, town, waypoint, parent, crafts] = row
      z = { id, name, act, level, town, waypoint, townName: parent ? data.areas[parent]?.[0] ?? null : null, crafts: [...crafts], bosses: [], trial: false, objectives: [], quests: [], next: [] }
      zones.set(id, z)
    }
    return z
  }
  const add = (list: string[], v: string) => { if (!list.includes(v)) list.push(v) }
  // A kill after "➞ {arena|…}" on the same step is in that arena.
  let arena: { step: number, name: string } | null = null
  const bossSteps: Array<{ boss: ZoneBoss, step: number }> = []
  const route = parseRoute(sources, data, DEFAULT_ROUTE_OPTIONS, (raw, before, after, step) => {
    const [kind, ...args] = raw.split('|')
    const here = zone(before)
    if (!here) return
    switch (kind) {
      case 'enter': {
        const to = zone(after)
        if (to && to.id !== here.id && !to.town && !here.town) add(here.next, to.name)
        break
      }
      case 'arena': arena = { step, name: arenaName(args[0]) }; break
      case 'kill': {
        // "Kill {kill|Everything}" is clearing the zone, not a boss.
        if (here.town || args[0] === 'Everything' || here.bosses.some(b => b.name === args[0])) break
        const boss: ZoneBoss = { name: args[0], ...(arena?.step === step ? { arena: arena.name } : {}) }
        here.bosses.push(boss)
        bossSteps.push({ boss, step })
        break
      }
      case 'trial': here.trial = true; break
      case 'quest_text': add(here.objectives, args[0]); break
      case 'quest': if (here.town && args[0]) add(here.quests, data.quests[args[0]] ?? args[0]); break
    }
  })
  for (const { boss, step } of bossSteps) {
    const level = route.steps[step]?.recommendedLevel
    if (level != null) boss.level = level
  }
  return [...zones.values()]
}

// Quest name -> how many gems it gives as a reward, any class.
export function rewardCounts (table: GemTable | null): Map<string, number> {
  const out = new Map<string, number>()
  for (const entry of Object.values(table ?? {})) {
    for (const s of new Set(entry.s.filter(s => s[3] === 'q').map(s => s[1]))) out.set(s, (out.get(s) ?? 0) + 1)
  }
  return out
}

// Past act 10 is the epilogue (Karui Shores).
export const actName = (act: number) => act > 10 ? 'Epilogue' : `Act ${act}`

export function zoneCard (z: Zone, rewards: ReadonlyMap<string, number> = new Map()): LookupCard {
  const facts: LookupRow[] = [
    { label: 'Act', value: z.act > 10 ? 'Epilogue' : String(z.act) },
    ...(z.town ? [] : [{ label: 'Area level', value: String(z.level) }]),
    { label: 'Waypoint', value: z.waypoint ? 'Yes' : 'No' },
    ...(!z.town && z.townName ? [{ label: 'Town', value: z.townName }] : [])
  ]
  const sections: LookupSection[] = [{ rows: facts }]
  if (z.bosses.length) {
    sections.push({
      label: 'Bosses',
      rows: z.bosses.map(b => ({ label: b.name, value: [b.arena, b.level != null ? `level ${b.level}` : ''].filter(Boolean).join(' · ') || undefined }))
    })
  }
  if (z.trial) sections.push({ label: 'Trial of Ascendancy', text: ['One of the six trials for the Labyrinth is here.'] })
  if (z.objectives.length) sections.push({ label: 'Quest objectives', rows: z.objectives.map(label => ({ label })) })
  if (z.quests.length) {
    sections.push({
      label: 'Quests handed in here',
      rows: z.quests.map(q => {
        const n = rewards.get(q)
        // Every class's choices together: you take one of your class's.
        return { label: q, value: n ? `gem reward: pick from ${n}, all classes` : undefined }
      })
    })
  }
  if (z.crafts.length) sections.push({ label: 'Crafting recipes', rows: z.crafts.map(label => ({ label })) })
  if (z.next.length) sections.push({ label: 'Next on the route', text: [z.next.join(', ')] })
  sections.push({ text: ['From the levelling route (exile-leveling). Bosses are the ones the route kills.'] })
  const slug = encodeURIComponent(z.name.replaceAll(' ', '_'))
  return {
    id: `zone:${z.id}`,
    group: 'Zones',
    name: z.name,
    sub: z.town ? `${actName(z.act)} town` : `${actName(z.act)} · level ${z.level}${z.trial ? ' · trial' : ''}`,
    icon: z.town ? 'fas fa-campground' : 'fas fa-map-location-dot',
    sections,
    actions: [
      { label: 'poedb', url: `https://poedb.tw/us/${slug}` },
      { label: 'Wiki', url: `https://www.poewiki.net/wiki/${slug}` }
    ]
  }
}

// "lunaris temple" is four zones in two acts, "lunaris" six.
const MAX_ZONES = 8

// Zones by name; "the" alone matches nothing. The same name in two acts
// (The Coast) gives a card for each.
export function zoneLookup (zones: readonly Zone[] | null, rewards: ReadonlyMap<string, number> = new Map()): Lookup {
  return (query) => {
    const q = query.trim().replace(/^the\s+/i, '')
    if (!zones || q.length < 4) return []
    return zones
      .map(z => ({ z, rank: Math.min(...[matchRank(z.name, query), matchRank(z.name.replace(/^The /, ''), q)].map(r => r < 0 ? 9 : r)) }))
      .filter(h => h.rank < 2)
      .sort((a, b) => a.rank - b.rank || a.z.act - b.z.act)
      .slice(0, MAX_ZONES)
      .map(h => zoneCard(h.z, rewards))
  }
}
