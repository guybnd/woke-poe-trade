// Finds the filter block(s) that decide how an item drops.
//
// Each condition evaluates to true, false or unknown (the copy can't tell, e.g.
// DropLevel of an unknown base). Blocks are walked in file order like the
// game does: the first fully matching block without `Continue` wins, and
// `Continue` blocks before it layer their style underneath.
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc } from './parse'
import type { ItemFacts } from './item-facts'

export type Tri = true | false | null

export interface ConditionResult {
  condition: FilterCondition
  result: Tri
}

export interface BlockMatch {
  block: FilterBlock
  result: Tri
  conditions: ConditionResult[]
}

export interface MatchResult {
  // The block that decides visibility (null: no rule matched, item shows by default).
  final: BlockMatch | null
  // Continue blocks that matched before `final`, in order.
  layers: BlockMatch[]
  // Blocks before `final` the item might match (unknown conditions).
  uncertain: BlockMatch[]
  // Merged actions as the game would apply them.
  actions: FilterAction[]
  visibility: 'Show' | 'Hide' | 'Minimal'
}

const RARITY_ORDER = ['Normal', 'Magic', 'Rare', 'Unique']

function compareNum (op: string, actual: number, expected: number): boolean {
  switch (op) {
    case '<': return actual < expected
    case '<=': return actual <= expected
    case '>': return actual > expected
    case '>=': return actual >= expected
    case '!=': case '!': return actual !== expected
    default: return actual === expected
  }
}

function numeric (c: FilterCondition, actual: number | undefined): Tri {
  if (actual == null) return null
  const values = c.values.map(Number).filter(v => !Number.isNaN(v))
  if (!values.length) return null
  if (c.op === '!=' || c.op === '!') return values.every(v => actual !== v)
  return values.some(v => compareNum(c.op, actual, v))
}

function bool (c: FilterCondition, actual: boolean | undefined): Tri {
  if (actual == null) return null
  const want = (c.values[0] ?? 'True').toLowerCase() === 'true'
  const negate = c.op === '!=' || c.op === '!'
  return (actual === want) !== negate
}

// String lists: `==` is an exact match, no operator is a substring match.
function strings (c: FilterCondition, actual: string | string[] | undefined): Tri {
  if (actual == null) return null
  const list = Array.isArray(actual) ? actual : [actual]
  // With a count (`HasExplicitMod <2 "A" "B"`) the operator is for the count.
  if (c.count != null) {
    const hits = c.values.filter(v => list.some(a => a.includes(v))).length
    return compareNum(c.op || '>=', hits, c.count)
  }
  const exact = c.op === '=='
  const hits = c.values.filter(v => list.some(a => exact ? a === v : a.includes(v))).length
  if (c.op === '!=' || c.op === '!') return hits === 0
  return hits > 0
}

function rarity (c: FilterCondition, actual: string | undefined): Tri {
  if (!actual) return null
  const a = RARITY_ORDER.indexOf(actual)
  if (c.op === '' || c.op === '=' || c.op === '==') return c.values.includes(actual)
  if (c.op === '!=' || c.op === '!') return !c.values.includes(actual)
  return c.values.some(v => compareNum(c.op, a, RARITY_ORDER.indexOf(v)))
}

// `Sockets >= 5`, `Sockets >= 6RGB`, `SocketGroup >= 5GGG`.
function sockets (c: FilterCondition, groups: string[] | undefined, linkedOnly: boolean): Tri {
  const g = groups ?? []
  return c.values.some(v => {
    const m = /^(\d*)([RGBWAD]*)$/i.exec(v)
    if (!m) return false
    const n = m[1] ? Number(m[1]) : null
    const colours = m[2].toUpperCase()
    const pools = linkedOnly ? (g.length ? g : ['']) : [g.join('')]
    return pools.some(pool => {
      if (n != null && !compareNum(c.op, pool.length, n)) return false
      for (const ch of new Set(colours)) {
        const need = [...colours].filter(x => x === ch).length
        if ([...pool].filter(x => x === ch).length < need) return false
      }
      return true
    })
  })
}

function influence (c: FilterCondition, actual: string[]): Tri {
  if (c.values.includes('None')) return actual.length === 0
  if (c.op === '==') return c.values.every(v => actual.includes(v))
  return c.values.some(v => actual.includes(v))
}

function linkedSockets (groups: string[] | undefined): number {
  if (!groups) return 0
  return Math.max(0, ...groups.map(g => g.length > 1 ? g.length : 0))
}

// A condition on something only maps or gems have: any other item fails it,
// where a map or gem whose copy can't tell stays unknown.
function only (c: FilterCondition, applies: boolean | null, actual: number | undefined): Tri {
  return applies === false ? false : numeric(c, actual)
}

// BaseType lists run to hundreds of names, and a walk asks every one of them.
const baseSets = new WeakMap<FilterCondition, Set<string>>()

function isBase (c: FilterCondition, base: string | undefined): Tri {
  if (base == null) return null
  let set = baseSets.get(c)
  if (!set) baseSets.set(c, set = new Set(c.values))
  return set.has(base)
}

export function evalCondition (c: FilterCondition, item: ItemFacts): Tri {
  const cls = item.itemClass
  switch (c.key) {
    case 'Class': return strings(c, item.itemClass)
    case 'BaseType': return c.op === '==' && c.count == null ? isBase(c, item.baseType) : strings(c, item.baseType)
    case 'Rarity': return rarity(c, item.rarity)
    case 'ItemLevel': return numeric(c, item.itemLevel)
    case 'DropLevel': return numeric(c, item.dropLevel)
    case 'Quality': return numeric(c, item.quality)
    case 'AreaLevel': return numeric(c, item.areaLevel)
    case 'MapTier': return only(c, cls == null ? null : cls === 'Maps', item.mapTier)
    case 'GemLevel': return only(c, cls == null ? null : /Gem/.test(cls), item.gemLevel)
    case 'StackSize': return numeric(c, item.stackSize ?? 1)
    case 'Width': return numeric(c, item.width)
    case 'Height': return numeric(c, item.height)
    case 'MemoryStrands': return numeric(c, item.memoryStrands)
    case 'CorruptedMods': return numeric(c, item.corruptedMods)
    case 'EnchantmentPassiveNum': return numeric(c, item.enchantmentPassiveNum ?? (item.enchantments ? 0 : undefined))
    case 'LinkedSockets': return numeric(c, linkedSockets(item.socketGroups))
    case 'Sockets': return sockets(c, item.socketGroups, false)
    case 'SocketGroup': return sockets(c, item.socketGroups, true)
    case 'Identified': return bool(c, item.identified)
    case 'Corrupted': return bool(c, item.corrupted)
    case 'Mirrored': return bool(c, item.mirrored)
    case 'FracturedItem': return bool(c, item.fractured)
    case 'SynthesisedItem': return bool(c, item.synthesised)
    case 'Replica': return bool(c, item.replica)
    case 'Foulborn': return bool(c, item.foulborn)
    case 'Vestigial': return bool(c, item.vestigial)
    case 'TransfiguredGem': return bool(c, item.transfigured)
    case 'BlightedMap': return bool(c, item.blightedMap)
    case 'Imbued': return bool(c, item.imbued)
    case 'ZanaMemory': return bool(c, item.zanaMemory)
    case 'Exceptional': return bool(c, item.exceptional)
    case 'ShaperItem': return bool(c, item.influences.includes('Shaper'))
    case 'ElderItem': return bool(c, item.influences.includes('Elder'))
    case 'HasCruciblePassiveTree': return bool(c, item.crucibleTree)
    case 'UberBlightedMap': return bool(c, item.uberBlightedMap)
    case 'AnyEnchantment': return bool(c, item.anyEnchantment)
    case 'HasImplicitMod': return bool(c, item.hasImplicitMod)
    case 'HasSearingExarchImplicit': return numeric(c, item.exarchTier)
    case 'HasEaterOfWorldsImplicit': return numeric(c, item.eaterTier)
    case 'UnidentifiedItemTier': return numeric(c, item.unidentifiedItemTier)
    case 'HasInfluence': return influence(c, item.influences)
    // An unidentified item shows no mods, so counts see none: "=0" passes.
    case 'HasExplicitMod': return strings(c, item.identified === false ? [] : item.explicitModNames)
    case 'HasEnchantment': return strings(c, item.enchantments)
    case 'EnchantmentPassiveNode': return strings(c, item.enchantPassiveNodes)
    default: return null
  }
}

export function evalBlock (block: FilterBlock, item: ItemFacts): BlockMatch {
  const conditions = block.conditions.map(condition => ({ condition, result: evalCondition(condition, item) }))
  let result: Tri = true
  for (const c of conditions) {
    if (c.result === false) { result = false; break }
    if (c.result === null) result = null
  }
  return { block, result, conditions }
}

// Later actions replace earlier ones of the same kind.
function mergeActions (base: FilterAction[], top: FilterAction[]): FilterAction[] {
  const out = base.filter(a => !top.some(t => t.key === a.key))
  return [...out, ...top]
}

// `brief`: stops at the first failed condition, for walks that only want the
// outcome. A block that fails then lists fewer condition results.
function evalBlockBrief (block: FilterBlock, item: ItemFacts): BlockMatch {
  let result: Tri = true
  for (const condition of block.conditions) {
    const r = evalCondition(condition, item)
    if (r === false) return { block, result: false, conditions: [] }
    if (r === null) result = null
  }
  return { block, result, conditions: [] }
}

export function matchItem (doc: FilterDoc, item: ItemFacts, opts: { brief?: boolean } = {}): MatchResult {
  const layers: BlockMatch[] = []
  const uncertain: BlockMatch[] = []
  let actions: FilterAction[] = []
  let visibility: MatchResult['visibility'] = 'Show'
  const evaluate = opts.brief ? evalBlockBrief : evalBlock
  for (const block of doc.blocks) {
    if (block.disabled) continue
    const m = evaluate(block, item)
    if (m.result === false) continue
    if (m.result === null) {
      // Continue blocks only layer style, so they can't steal the item.
      if (!block.continue) uncertain.push(m)
      continue
    }
    actions = mergeActions(actions, block.actions)
    visibility = block.visibility
    if (block.continue) {
      layers.push(m)
      continue
    }
    return { final: m, layers, uncertain, actions, visibility }
  }
  // Ran off the end: the last Continue block (if any) decides.
  const last = layers.pop() ?? null
  return { final: last, layers, uncertain, actions, visibility }
}
