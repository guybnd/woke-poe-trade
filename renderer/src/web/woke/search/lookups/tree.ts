// Passive tree lookup: keystones, notables, ascendancy notables and cluster
// jewel notables, with what they do. From the PoB tool's tree data.
import { matchRank } from '../search'
import type { Lookup, LookupCard, LookupContext } from './types'

export type PassiveKind = 'Keystone' | 'Notable' | 'Ascendancy notable' | 'Cluster jewel notable' | 'Cluster jewel keystone'

export interface Passive {
  name: string
  kind: PassiveKind
  stats: string[]
}

const KINDS: Record<string, PassiveKind> = { key: 'Keystone', notable: 'Notable', asc: 'Ascendancy notable' }

// From the tree's nodes and its cluster jewel notables. A name on the tree
// wins over the same name on a cluster jewel.
export function passiveList (
  nodes: Iterable<{ kind: string, name: string, stats: string[] }>,
  clusterNamed: Record<string, { stats: string[], key: number }> | null
): Passive[] {
  const out = new Map<string, Passive>()
  // By name and kind: "Sanctuary" is both a notable and a Guardian node.
  for (const n of nodes) {
    const kind = KINDS[n.kind]
    const name = n.name?.trim()
    if (!kind || !name || out.has(`${kind}|${name}`)) continue
    // Class markers on the ascendancy trees, not passives.
    if (kind === 'Ascendancy notable' && /(Ascendancy|Display)$/.test(name)) continue
    out.set(`${kind}|${name}`, { name, kind, stats: n.stats.flatMap(s => s.split('\n')) })
  }
  for (const [name, c] of Object.entries(clusterNamed ?? {})) {
    const kind: PassiveKind = c.key ? 'Cluster jewel keystone' : 'Cluster jewel notable'
    if (!out.has(`${kind}|${name}`)) out.set(`${kind}|${name}`, { name, kind, stats: c.stats.flatMap(s => s.split('\n')) })
  }
  return [...out.values()]
}

// Uniques that give you a keystone: "Iron Reflexes", "Pain Attunement",
// "You have Iron Reflexes while ...". Not "Cannot be used with", not a jewel
// radius, not a minion's.
export function keystoneUniques (
  uniques: Record<string, { v: Array<{ e?: string[], i?: string[] }> }>,
  keystones: readonly string[]
): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const pattern = new RegExp(`^(?:You have )?(${keystones.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?: while .*| during .*)?$`)
  for (const [name, u] of Object.entries(uniques)) {
    for (const v of u.v) {
      for (const line of [...(v.e ?? []), ...(v.i ?? [])]) {
        const k = pattern.exec(line)?.[1]
        if (!k) continue
        const list = out.get(k) ?? []
        if (!list.includes(name)) list.push(name)
        out.set(k, list)
      }
    }
  }
  return out
}

export function passiveCard (p: Passive, ctx?: LookupContext, grantedBy: readonly string[] = []): LookupCard {
  const slug = encodeURIComponent(p.name.replaceAll("'", '').replaceAll(' ', '_'))
  return {
    id: `passive:${p.kind}:${p.name}`,
    group: 'Passive tree',
    name: p.name,
    sub: p.kind,
    icon: p.kind.includes('Keystone') ? 'fas fa-dharmachakra' : 'fas fa-circle-nodes',
    sections: [
      { label: p.kind, text: p.stats.length ? p.stats : ['No stats in the tree data.'] },
      ...(grantedBy.length ? [{ label: 'Uniques that grant it', rows: grantedBy.map(name => ({ label: name, chaos: ctx?.price(name) ?? null, item: { name } })) }] : [])
    ],
    actions: [
      { label: 'Copy name', copy: p.name },
      { label: 'poedb', url: `https://poedb.tw/us/${slug}` }
    ]
  }
}

export function treeLookup (passives: readonly Passive[] | null, grants: ReadonlyMap<string, string[]> = new Map()): Lookup {
  return (query, ctx) => {
    if (!passives || query.trim().length < 4) return []
    return passives
      .map(p => ({ p, rank: matchRank(p.name, query) }))
      .filter(h => h.rank >= 0 && h.rank < 2)
      // Keystones first on a tie: they're what people look up.
      .sort((a, b) => a.rank - b.rank || Number(b.p.kind === 'Keystone') - Number(a.p.kind === 'Keystone') || a.p.name.length - b.p.name.length)
      .slice(0, 4)
      .map(h => passiveCard(h.p, ctx, h.p.kind.includes('Keystone') ? grants.get(h.p.name) ?? [] : []))
  }
}
