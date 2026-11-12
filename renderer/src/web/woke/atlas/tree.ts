// Atlas passive tree: decoding share links and naming allocated nodes.

// GGG publishes the atlas tree data in this repository; the URL can be
// changed in the widget settings if it moves.
export const DEFAULT_ATLAS_DATA_URL =
  'https://raw.githubusercontent.com/grindinggear/atlastree-export/master/data.json'

export interface DecodedTree {
  version: number
  nodes: number[]
  masteries: Array<{ node: number, effect: number }>
}

function base64UrlToBytes (code: string): Uint8Array {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Accepts a full pathofexile.com tree link or just its code.
export function extractTreeCode (input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  let code = trimmed
  try {
    const url = new URL(trimmed)
    const parts = url.pathname.split('/').filter(Boolean)
    code = parts[parts.length - 1] ?? ''
  } catch {}
  code = code.split('?')[0].split('#')[0]
  return /^[A-Za-z0-9_\-+/=]+$/.test(code) ? code : null
}

// Passive tree share format (same as the character tree):
//   u32 version, u8 class, u8 ascendancy,
//   v4:  u8 fullscreen, then u16 node ids to the end
//   v5+: u8 count + u16 nodes, u8 count + u16 cluster nodes,
//        v6+: u8 count + (u16 node, u16 effect) mastery pairs
export function decodeTree (input: string): DecodedTree {
  const code = extractTreeCode(input)
  if (!code) throw new Error('Not a tree link')
  const bytes = base64UrlToBytes(code)
  const view = new DataView(bytes.buffer)
  if (bytes.length < 7) throw new Error('Tree link is too short')
  const version = view.getUint32(0)
  let pos = 6
  const nodes: number[] = []
  const masteries: Array<{ node: number, effect: number }> = []

  if (version <= 4) {
    pos += 1
    for (; pos + 1 < bytes.length; pos += 2) nodes.push(view.getUint16(pos))
    return { version, nodes, masteries }
  }

  const readCount = () => {
    if (pos >= bytes.length) return 0
    return view.getUint8(pos++)
  }
  const n = readCount()
  for (let i = 0; i < n && pos + 1 < bytes.length; i++, pos += 2) nodes.push(view.getUint16(pos))
  const clusters = readCount()
  pos += clusters * 2
  if (version >= 6) {
    const m = readCount()
    for (let i = 0; i < m && pos + 3 < bytes.length; i++, pos += 4) {
      masteries.push({ effect: view.getUint16(pos), node: view.getUint16(pos + 2) })
    }
  }
  return { version, nodes, masteries }
}

export interface AtlasNode {
  id: number
  name: string
  stats: string[]
  kind: 'notable' | 'keystone' | 'mastery' | 'small'
}

// GGG's text links keywords since 3.30: "[Thread|Threads]" or "[Ignite]".
export function plainText (text: string): string {
  return text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2').replace(/\[([^\]|]+)\]/g, '$1')
}

// Reads the node list from GGG's tree export (`nodes` keyed by id).
export function parseAtlasData (json: unknown): Map<number, AtlasNode> {
  const out = new Map<number, AtlasNode>()
  const nodes = (json && typeof json === 'object') ? (json as { nodes?: unknown }).nodes : null
  if (!nodes || typeof nodes !== 'object') throw new Error('Unexpected atlas data format')
  for (const [key, raw] of Object.entries(nodes as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue
    const n = raw as Record<string, unknown>
    const id = typeof n.skill === 'number' ? n.skill : Number(key)
    if (!Number.isFinite(id)) continue
    out.set(id, {
      id,
      name: typeof n.name === 'string' ? plainText(n.name) : '',
      stats: Array.isArray(n.stats) ? n.stats.filter((s): s is string => typeof s === 'string').map(plainText) : [],
      kind: n.isKeystone ? 'keystone' : n.isNotable ? 'notable' : n.isMastery ? 'mastery' : 'small'
    })
  }
  return out
}

// Atlas notables are named after the content they boost; group by the first
// mechanic word found in the name or stats.
const MECHANICS = [
  'Breach', 'Legion', 'Delirium', 'Expedition', 'Harvest', 'Ritual', 'Blight', 'Essence',
  'Abyss', 'Strongbox', 'Beyond', 'Shrine', 'Harbinger', 'Incursion', 'Delve', 'Sulphite', 'Betrayal',
  'Metamorph', 'Torment', 'Bestiary', 'Beast', 'Ultimatum', 'Heist', 'Sanctum', 'Eldritch',
  'Maven', 'Searing Exarch', 'Eater of Worlds', 'Rogue Exile', 'Kirac', 'Einhar', 'Alva',
  'Niko', 'Jun', 'Synthesis', 'Mirage', 'Wildwood', 'Sentinel', 'Mercenar', 'Ore Deposit',
  'Anomal', 'Scarab', 'Thread', 'Shaped Region', 'Gold', 'Boss', 'Unique', 'Map', 'Divination', 'Currency',
  'Gem', 'Fragment', 'Influence', 'Conqueror', 'Elder', 'Shaper', 'Tempest', 'Domination'
]

// Words that name a mechanic another way: its NPC, its currency, its bosses.
const SAME_AS: Record<string, string> = {
  'Beast': 'Bestiary',
  'Einhar': 'Bestiary',
  'Niko': 'Delve',
  'Sulphite': 'Delve',
  'Alva': 'Incursion',
  'Jun': 'Betrayal',
  'Searing Exarch': 'Eldritch',
  'Eater of Worlds': 'Eldritch',
  // 3.30
  'Mercenar': 'Mercenaries',
  'Ore Deposit': 'Ore Deposits',
  'Anomal': 'Atlas Anomalies',
  'Shaped Region': 'Thread'
}

export function mechanicOf (node: AtlasNode): string {
  const text = `${node.name} ${node.stats.join(' ')}`
  for (const m of MECHANICS) {
    if (new RegExp(`\\b${m}`, 'i').test(text)) return SAME_AS[m] ?? m
  }
  return 'General'
}

export interface AllocationOverview {
  total: number
  small: number
  unknown: number
  groups: Array<{ mechanic: string, nodes: AtlasNode[] }>
}

export function overview (decoded: DecodedTree, data: Map<number, AtlasNode>): AllocationOverview {
  const groups = new Map<string, AtlasNode[]>()
  let small = 0
  let unknown = 0
  for (const id of decoded.nodes) {
    const node = data.get(id)
    if (!node) { unknown++; continue }
    if (node.kind === 'small' || node.kind === 'mastery') { small++; continue }
    const m = mechanicOf(node)
    const list = groups.get(m)
    if (list) list.push(node)
    else groups.set(m, [node])
  }
  const sorted = Array.from(groups, ([mechanic, nodes]) => ({
    mechanic,
    nodes: nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'keystone' ? -1 : 1))
  })).sort((a, b) => b.nodes.length - a.nodes.length || a.mechanic.localeCompare(b.mechanic))
  return { total: decoded.nodes.length, small, unknown, groups: sorted }
}

// Nodes in `b` but not `a`, and the other way round.
export function diffTrees (a: DecodedTree, b: DecodedTree): { added: number[], removed: number[] } {
  const sa = new Set(a.nodes)
  const sb = new Set(b.nodes)
  return {
    added: b.nodes.filter(n => !sa.has(n)),
    removed: a.nodes.filter(n => !sb.has(n))
  }
}
