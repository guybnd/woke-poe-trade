// Pantheon cards: a god's powers, the souls that upgrade it and the map each
// soul is in. From public/data/pantheon-data.json (PoB's Pantheons.lua and
// poedb's maps, see scripts/build-pantheon-data.mjs), fetched on palette open.
// Where the god itself is killed comes from the levelling route's zones.
import { matchRank } from '../search'
import { actName } from './zones'
import type { Zone } from './zones'
import type { Lookup, LookupCard, LookupSection } from './types'

export interface PantheonSoul {
  name: string
  lines: string[]
  // The atlas map whose boss holds it, when poedb lists one.
  map?: string
}

export interface PantheonGod {
  id: string
  name: string
  major: boolean
  // The god's own soul first, then the upgrades in order.
  souls: PantheonSoul[]
}

export interface PantheonData {
  gods: PantheonGod[]
}

// Where the route kills the god: "Lunaris, Eternal Moon" or
// "Tsoagoth, The Brine King", not "Dusk, Harbinger of Lunaris".
export function godKills (god: PantheonGod, zones: readonly Zone[]): Array<{ boss: string, zone: Zone }> {
  const name = god.name.toLowerCase()
  const out: Array<{ boss: string, zone: Zone }> = []
  for (const zone of zones) {
    for (const b of zone.bosses) {
      const n = b.name.toLowerCase()
      if (n === name || n.startsWith(`${name},`) || n.endsWith(`, ${name}`)) out.push({ boss: b.name, zone })
    }
  }
  return out
}

const HOW = 'Put a Divine Vessel in the map device and kill the map boss; the filled vessel waits in the device. Give the Captured Soul to Sin or right-click it.'

export function godCard (god: PantheonGod, zones: readonly Zone[] = []): LookupCard {
  const [own, ...upgrades] = god.souls
  const kills = godKills(god, zones)
  const sections: LookupSection[] = [{
    label: `Base power · ${god.major ? 'Major god' : 'Minor god'}`,
    text: own?.lines ?? [],
    rows: kills.map(k => ({ label: 'Unlocked by', value: `${k.boss} · ${actName(k.zone.act)}, ${k.zone.name}` }))
  }]
  upgrades.forEach((soul, i) => {
    sections.push({
      label: `Upgrade ${i + 1} · ${soul.name}`,
      text: soul.lines,
      rows: [soul.map
        ? { label: 'Soul from', value: `${soul.map} Map boss` }
        : { label: 'Soul from', value: "Map not in poedb's data", dim: true }]
    })
  })
  if (upgrades.length) sections.push({ text: [HOW] })
  return {
    id: `god:${god.id}`,
    group: 'Pantheon',
    name: god.name,
    sub: `${god.major ? 'Major' : 'Minor'} god · ${upgrades.length} upgrade${upgrades.length === 1 ? '' : 's'}`,
    icon: god.major ? 'fas fa-sun' : 'fas fa-moon',
    sections,
    actions: [
      { label: 'poedb', url: 'https://poedb.tw/us/Pantheon' },
      { label: 'Wiki', url: 'https://www.poewiki.net/wiki/The_Pantheon' }
    ]
  }
}

// Gods by name, by "Soul of …", or by an upgrade soul or its Captured Soul.
// "pantheon" lists every god, majors first.
export function pantheonLookup (data: PantheonData | null, zones: readonly Zone[] = []): Lookup {
  return (query) => {
    const q = query.trim()
    if (!data || q.length < 4) return []
    if (matchRank('pantheon', q) === 0) {
      return [...data.gods].sort((a, b) => Number(b.major) - Number(a.major)).map(g => godCard(g, zones))
    }
    // Matched without "Captured" and "Soul of", so "soul" alone isn't every
    // god. After "soul of " a short start is enough: "soul of yug".
    const bare = q.replace(/^captured\s+/i, '').replace(/^soul of\s+/i, '')
    if (bare.length < (bare === q ? 4 : 2)) return []
    const rankOf = (name: string) => { const r = matchRank(name, bare); return r < 0 ? 9 : r }
    return data.gods
      .map(g => ({ g, rank: Math.min(rankOf(g.name), ...g.souls.slice(1).map(s => rankOf(s.name))) }))
      .filter(h => h.rank < 2)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 4)
      .map(h => godCard(h.g, zones))
  }
}
