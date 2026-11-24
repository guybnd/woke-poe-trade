// Which notables a Forbidden Flame and Flesh pair can give a class, and the
// trade searches for one pair. No app imports: the tests load it on its own.
//
// The game's rules (checked against the trade site's stat list and poedb):
// both jewels must name the same notable; the notable comes from the jewels'
// class (any of its three ascendancies, plus one notable that only these
// jewels give); each jewel is Limited to 1, so a build has one pair.

export const FLAME = 'Forbidden Flame'
export const FLESH = 'Forbidden Flesh'
export const FLAME_BASE = 'Crimson Jewel'
export const FLESH_BASE = 'Cobalt Jewel'

export const CLASSES = ['Duelist', 'Marauder', 'Ranger', 'Scion', 'Shadow', 'Templar', 'Witch'] as const
export type ClassName = typeof CLASSES[number]

// The tree's ascendancy ids, with each one's class.
const ASC_CLASS: Record<string, ClassName> = {
  Slayer: 'Duelist',
  Gladiator: 'Duelist',
  Champion: 'Duelist',
  Juggernaut: 'Marauder',
  Berserker: 'Marauder',
  Chieftain: 'Marauder',
  Deadeye: 'Ranger',
  Raider: 'Ranger',
  Pathfinder: 'Ranger',
  Ascendant: 'Scion',
  Assassin: 'Shadow',
  Saboteur: 'Shadow',
  Trickster: 'Shadow',
  Inquisitor: 'Templar',
  Hierophant: 'Templar',
  Guardian: 'Templar',
  Necromancer: 'Witch',
  Occultist: 'Witch',
  Elementalist: 'Witch'
}
// The tree still calls the Warden "Raider" (it replaced Raider in 3.25).
const ASC_SHOWN: Record<string, string> = { Raider: 'Warden' }
// What PoB or the game may call an ascendancy, to the tree's id.
const ASC_ALIAS: Record<string, string> = { Warden: 'Raider' }

// One notable per class that only these jewels give (no ascendancy has it).
const CLASS_ONLY: Record<string, ClassName> = {
  'Nine Lives': 'Witch',
  'Searing Purity': 'Templar',
  'Indomitable Resolve': 'Marauder',
  'Fatal Flourish': 'Duelist',
  'Fury of Nature': 'Ranger',
  'Unleashed Potential': 'Scion',
  'Harness the Void': 'Shadow'
}
// The group those go under.
export const ONLY_HERE = 'Only on Forbidden jewels'

// A class or ascendancy name (PoB's, the game's, the tree's) to its class.
export function classOf (name: string | null | undefined): ClassName | null {
  if (!name) return null
  if ((CLASSES as readonly string[]).includes(name)) return name as ClassName
  return ASC_CLASS[ASC_ALIAS[name] ?? name] ?? null
}

// The ascendancy as shown ("Warden" for the tree's Raider), or null for a class.
export function ascendancyShown (name: string | null | undefined): string | null {
  if (!name || (CLASSES as readonly string[]).includes(name)) return null
  const id = ASC_ALIAS[name] ?? name
  return ASC_CLASS[id] ? (ASC_SHOWN[id] ?? id) : null
}

export interface StatLike { ref: string, trade?: { ids: Record<string, string[] | undefined> } }
export interface TreeNodeLike { name: string, stats: string[], asc?: string }

export interface ForbiddenNotable {
  name: string
  node: number
  cls: ClassName
  // As shown ("Warden"), or ONLY_HERE.
  group: string
  stats: string[]
  // The trade site's stat for each jewel; the node is its option.
  flameStat: string
  fleshStat: string
}

const REF = /^Allocates (.+) if you have the matching modifier on Forbidden (Flame|Flesh)$/

// "explicit.stat_2460506030|38999" -> the stat and the node.
function splitId (id: string | undefined): { stat: string, node: number } | null {
  const m = /^(explicit\.stat_\d+)\|(\d+)$/.exec(id ?? '')
  return m ? { stat: m[1], node: Number(m[2]) } : null
}

// Every notable a pair can give, from the trade site's stats and the tree.
// A notable the tree no longer has (removed since) is left out.
export function forbiddenNotables (stats: Iterable<StatLike>, tree: (id: number) => TreeNodeLike | undefined): ForbiddenNotable[] {
  const halves = new Map<number, { name: string, flame?: string, flesh?: string }>()
  for (const s of stats) {
    const m = REF.exec(s.ref)
    const id = m && splitId(s.trade?.ids.explicit?.[0])
    if (!m || !id) continue
    const h = halves.get(id.node) ?? { name: m[1] }
    // The mod naming the other jewel: "...on Forbidden Flesh" sits on Forbidden Flame.
    if (m[2] === 'Flesh') h.flame = id.stat
    else h.flesh = id.stat
    halves.set(id.node, h)
  }
  const out: ForbiddenNotable[] = []
  for (const [node, h] of halves) {
    if (!h.flame || !h.flesh) continue
    const t = tree(node)
    if (!t) continue
    const cls = t.asc ? ASC_CLASS[t.asc] : CLASS_ONLY[h.name]
    if (!cls) continue
    out.push({
      name: h.name,
      node,
      cls,
      group: t.asc ? (ASC_SHOWN[t.asc] ?? t.asc) : ONLY_HERE,
      stats: t.stats.flatMap(s => s.split('\n')).map(s => s.trim()).filter(Boolean),
      flameStat: h.flame,
      fleshStat: h.flesh
    })
  }
  return out.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
}

export interface NotableGroup { group: string, mine: boolean, rows: ForbiddenNotable[] }

// One class's notables by ascendancy: yours first, then the others, then
// the jewels' own notable.
export function groupsFor (all: readonly ForbiddenNotable[], cls: ClassName, ascendancy: string | null): NotableGroup[] {
  const by = new Map<string, ForbiddenNotable[]>()
  for (const n of all) if (n.cls === cls) by.set(n.group, [...(by.get(n.group) ?? []), n])
  const rank = (g: string) => g === ascendancy ? 0 : g === ONLY_HERE ? 2 : 1
  return [...by].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([group, rows]) => ({ group, mine: group === ascendancy, rows }))
}

export type TradeStatus = 'online' | 'securable' | 'available' | 'any'

// The trade search for one jewel of the pair, cheapest first.
export function jewelQuery (n: ForbiddenNotable, jewel: 'flame' | 'flesh', status: TradeStatus) {
  return {
    query: {
      status: { option: status },
      name: jewel === 'flame' ? FLAME : FLESH,
      type: jewel === 'flame' ? FLAME_BASE : FLESH_BASE,
      stats: [{ type: 'and', filters: [{ id: jewel === 'flame' ? n.flameStat : n.fleshStat, value: { option: n.node } }] }]
    },
    sort: { price: 'asc' as const }
  }
}

// poe.ninja's Forbidden jewel rows carry the notable's name, one for each
// jewel. With exactly two (one each), their sum is the pair's price; anything
// else (none, or a name another row shares) gives no estimate.
export function pairEstimate (rows: ReadonlyArray<{ chaos: number }>): number | null {
  if (rows.length !== 2 || !rows.every(r => r.chaos > 0)) return null
  return rows[0].chaos + rows[1].chaos
}

export interface CheapestOf { chaos: number | null, listings: number }

// The cheapest listing in chaos (divines at the given rate), with how many there are.
export function cheapest (listings: ReadonlyArray<{ priceAmount: number, priceCurrency: string }>, total: number, divine: number): CheapestOf {
  const chaos = listings
    .map(l => l.priceCurrency === 'chaos' ? l.priceAmount : l.priceCurrency === 'divine' ? l.priceAmount * divine : null)
    .filter((n): n is number => n != null && n > 0)
  return { chaos: chaos.length ? Math.min(...chaos) : null, listings: total }
}

// The jewel's game text, for the price check (as if copied in game).
export function jewelText (n: ForbiddenNotable, jewel: 'flame' | 'flesh'): string {
  const [name, base, other] = jewel === 'flame' ? [FLAME, FLAME_BASE, FLESH] : [FLESH, FLESH_BASE, FLAME]
  return [
    'Item Class: Jewels', 'Rarity: Unique', name, base, '--------',
    'Limited to: 1', '--------',
    'Item Level: 86', '--------',
    // The advanced copy's mod header: the price check reads mods only under one.
    '{ Unique Modifier }',
    `Allocates ${n.name} if you have the matching modifier on ${other}`, '--------',
    'Corrupted'
  ].join('\n')
}
