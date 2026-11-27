// Passive tree lookup: keystones, notables, ascendancy notables and cluster
// jewel notables, with what they do. From the PoB tool's tree data.
import { matchRank } from '../search'
import { modQueryWords, normText, startsWords, wordsOf } from '../mod-words'
import type { Lookup, LookupCard, LookupContext, LookupSection } from './types'

export type PassiveKind = 'Keystone' | 'Notable' | 'Ascendancy notable' | 'Cluster jewel notable' | 'Cluster jewel keystone'

export interface Passive {
  name: string
  kind: PassiveKind
  stats: string[]
  // The three oils that anoint it onto an amulet, lowest tier first.
  oils?: string[]
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

// Notables that can be anointed get their oils, from the game's recipes.
export function withOils (list: Passive[], oilsOf: (name: string) => string[] | undefined): Passive[] {
  return list.map(p => {
    if (p.kind !== 'Notable') return p
    const oils = oilsOf(p.name)
    return oils ? { ...p, oils } : p
  })
}

export function anointSection (oils: readonly string[], ctx?: LookupContext): LookupSection {
  const prices = oils.map(o => ctx?.price(o) ?? null)
  const total = prices.every(c => c != null) ? prices.reduce<number>((a, c) => a + c!, 0) : null
  return {
    label: 'Anoint',
    rows: [
      ...oils.map((o, i) => ({ label: o, chaos: prices[i], item: { name: o }, bulk: true })),
      ...(ctx ? [{ label: 'Total', chaos: total, dim: true }] : [])
    ]
  }
}

// `stat`: the stat line a search by what it does matched, shown under the name.
export function passiveCard (p: Passive, ctx?: LookupContext, grantedBy: readonly string[] = [], stat?: string): LookupCard {
  const slug = encodeURIComponent(p.name.replaceAll("'", '').replaceAll(' ', '_'))
  return {
    id: `passive:${p.kind}:${p.name}`,
    group: 'Passive tree',
    name: p.name,
    sub: stat ? `${p.kind} · ${stat}` : p.kind,
    icon: p.kind.includes('Keystone') ? 'fas fa-dharmachakra' : 'fas fa-circle-nodes',
    sections: [
      { label: p.kind, text: p.stats.length ? p.stats : ['No stats in the tree data.'] },
      ...(p.oils ? [anointSection(p.oils, ctx)] : []),
      ...(grantedBy.length ? [{ label: 'Uniques that grant it', rows: grantedBy.map(name => ({ label: name, chaos: ctx?.price(name) ?? null, item: { name }, bulk: true })) }] : [])
    ],
    actions: [
      { label: 'Copy name', copy: p.name },
      { label: 'poedb', url: `https://poedb.tw/us/${slug}` }
    ]
  }
}

// Names first ("iron reflexes"), then what a passive does: "onslaught" lists
// the notables and keystones whose stats grant it. Names before stats.
const STAT_HITS = 8
const KIND_ORDER: Record<PassiveKind, number> = { 'Keystone': 0, 'Notable': 1, 'Ascendancy notable': 2, 'Cluster jewel keystone': 3, 'Cluster jewel notable': 4 }
export function treeLookup (passives: readonly Passive[] | null, grants: ReadonlyMap<string, string[]> = new Map()): Lookup {
  // Each passive's stat lines as words, worked out once.
  const statWords = new Map<Passive, Array<{ line: string, words: string[] }>>()
  const wordsFor = (p: Passive) => {
    let w = statWords.get(p)
    if (!w) statWords.set(p, w = p.stats.map(line => ({ line, words: wordsOf(normText(line)) })))
    return w
  }
  const card = (p: Passive, ctx: LookupContext, stat?: string) => passiveCard(p, ctx, p.kind.includes('Keystone') ? grants.get(p.name) ?? [] : [], stat)
  return (query, ctx) => {
    if (!passives || query.trim().length < 4) return []
    const named = passives
      .map(p => ({ p, rank: matchRank(p.name, query) }))
      .filter(h => h.rank >= 0 && h.rank < 2)
      // Keystones first on a tie: they're what people look up.
      .sort((a, b) => a.rank - b.rank || Number(b.p.kind === 'Keystone') - Number(a.p.kind === 'Keystone') || a.p.name.length - b.p.name.length)
      .slice(0, 4)
    const parts = modQueryWords(query)
    const seen = new Set(named.map(h => h.p))
    const byStat: Array<{ p: Passive, line: string }> = []
    if (parts.length) {
      for (const p of passives) {
        if (seen.has(p)) continue
        const hit = wordsFor(p).find(s => startsWords(s.words, parts))
        if (hit) byStat.push({ p, line: hit.line })
      }
      byStat.sort((a, b) => KIND_ORDER[a.p.kind] - KIND_ORDER[b.p.kind] || a.p.name.localeCompare(b.p.name))
    }
    return [
      ...named.map(h => card(h.p, ctx)),
      ...byStat.slice(0, STAT_HITS).map(h => card(h.p, ctx, h.line))
    ]
  }
}
