// Turns the flat block list into the editor's tree:
// section (NeverSink's [[0000]] chapters) → group ($type) → tier ($tier).
import { EDITOR_GROUPS, UNTAGGED_PREFIX } from './parse'
import { groupLabel, sectionLabel } from './names'
import type { FilterBlock, FilterDoc, Visibility } from './parse'
import { OWN_RULE_TYPE } from './edits'
import { BUILD_RULE_TYPE } from './build-rules'
import { SAFETY_RULE_TYPE } from './safety'

// Rule groups the editor adds on top of NeverSink's, by display name.
const OWN_GROUPS: Record<string, string> = {
  [OWN_RULE_TYPE]: EDITOR_GROUPS[OWN_RULE_TYPE],
  [BUILD_RULE_TYPE]: EDITOR_GROUPS[BUILD_RULE_TYPE],
  [SAFETY_RULE_TYPE]: EDITOR_GROUPS[SAFETY_RULE_TYPE]
}

export interface TierNode {
  tier: string
  blocks: FilterBlock[]
  // Base types listed by `BaseType ==` across the tier's blocks.
  bases: string[]
  visibility: Visibility
  // Every block of the tier is commented out.
  disabled: boolean
}

export interface GroupNode {
  type: string
  section: string
  tiers: TierNode[]
  blockCount: number
  hidden: boolean
}

export interface SectionNode {
  title: string
  groups: GroupNode[]
}

export function groupName (type: string | null): string {
  if (!type) return 'Untagged'
  if (type.startsWith(UNTAGGED_PREFIX)) return type.slice(UNTAGGED_PREFIX.length) || 'Untagged'
  if (OWN_GROUPS[type]) return OWN_GROUPS[type]
  return groupLabel(type)
}

export function buildTree (doc: FilterDoc): SectionNode[] {
  const sections: SectionNode[] = []
  const groups = new Map<string, GroupNode>()
  for (const b of doc.blocks) {
    const type = b.type ?? `${UNTAGGED_PREFIX}${b.section}`
    let g = groups.get(type)
    if (!g) {
      const own = b.type != null && OWN_GROUPS[b.type] != null
      const title = own ? OWN_GROUPS[b.type!] : (b.section ? sectionLabel(b.section) : 'Other')
      let sec = sections.find(s => s.title === title)
      if (!sec) {
        sec = { title, groups: [] }
        if (own) sections.unshift(sec)
        else sections.push(sec)
      }
      g = { type, section: title, tiers: [], blockCount: 0, hidden: true }
      groups.set(type, g)
      sec.groups.push(g)
    }
    g.blockCount++
    if (b.visibility !== 'Hide' && !b.disabled) g.hidden = false
    const tierKey = b.tier ?? `#${b.line}`
    let t = g.tiers.find(x => x.tier === tierKey)
    if (!t) {
      t = { tier: tierKey, blocks: [], bases: [], visibility: b.visibility, disabled: true }
      g.tiers.push(t)
    }
    t.blocks.push(b)
    if (!b.disabled) {
      t.disabled = false
      t.visibility = b.visibility
    }
    for (const c of b.conditions) {
      if (c.key === 'BaseType' && c.op === '==') {
        for (const v of c.values) if (!t.bases.includes(v)) t.bases.push(v)
      }
    }
  }
  return sections
}

// Where a base type appears: group + tier, for the editor's search box.
export function findBase (doc: FilterDoc, query: string): Array<{ base: string, type: string, tier: string, block: FilterBlock }> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const out: Array<{ base: string, type: string, tier: string, block: FilterBlock }> = []
  for (const b of doc.blocks) {
    if (b.disabled || !b.type) continue
    for (const c of b.conditions) {
      if (c.key !== 'BaseType') continue
      for (const v of c.values) {
        if (v.toLowerCase().includes(q) && !out.some(o => o.base === v && o.type === b.type && o.tier === b.tier)) {
          out.push({ base: v, type: b.type, tier: b.tier ?? '', block: b })
        }
      }
    }
    if (out.length >= 60) break
  }
  return out
}

export interface AddResult {
  base: string
  // Where it sits now: its tier in this group, or else the first rule listing it.
  block: FilterBlock | null
  // Listed in another tier of this group, so it moves; otherwise it's added.
  sameGroup: boolean
  // A live rule before this tier lists it, and would still catch it first.
  caughtBy: FilterBlock | null
}

// The add-item box: bases matching the text, best first, without what the tier
// already lists. `extra` is every base in the game, for ones no rule names yet.
export function addSearch (doc: FilterDoc, type: string, tier: string, query: string, extra: string[] = [], limit = 8): AddResult[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const here = doc.blocks.filter(b => b.type === type && b.tier === tier)
  const inTier = new Set(here.flatMap(b => b.conditions.filter(c => c.key === 'BaseType' && c.op === '==').flatMap(c => c.values)))
  const live = here.filter(b => !b.disabled)
  const firstHere = live.length ? Math.min(...live.map(b => b.index)) : Infinity
  const inGroup = new Map<string, FilterBlock>()
  const elsewhere = new Map<string, FilterBlock>()
  const editors = new Map<string, FilterBlock>()
  const first = new Map<string, FilterBlock>()
  for (const b of doc.blocks) {
    if (b.disabled) continue
    for (const c of b.conditions) {
      if (c.key !== 'BaseType' || c.op !== '==') continue
      for (const v of c.values) {
        if (inTier.has(v) || !v.toLowerCase().includes(q)) continue
        if (!first.has(v)) first.set(v, b)
        const list = b.type === type ? inGroup : b.type?.startsWith('woke->') ? editors : elsewhere
        if (!list.has(v)) list.set(v, b)
      }
    }
  }
  const names = new Set<string>(first.keys())
  for (const v of extra) if (!inTier.has(v) && v.toLowerCase().includes(q)) names.add(v)
  const score = (name: string) => {
    const n = name.toLowerCase()
    if (n === q) return 0
    if (n.startsWith(q)) return 1
    return n.split(/\s+/).some(w => w.startsWith(q)) ? 2 : 3
  }
  return [...names]
    .sort((a, b) => score(a) - score(b) || Number(!first.has(a)) - Number(!first.has(b)) || a.localeCompare(b))
    .slice(0, limit)
    .map(base => {
      const earliest = first.get(base)
      return {
        base,
        block: inGroup.get(base) ?? elsewhere.get(base) ?? editors.get(base) ?? null,
        sameGroup: inGroup.has(base),
        caughtBy: earliest && earliest.index < firstHere ? earliest : null
      }
    })
}

// Clicking a chip: a plain click picks or unpicks it, shift picks the run from
// the last one clicked.
export function pickBases (list: string[], picked: string[], base: string, shift: boolean, last: string | null): string[] {
  if (shift && last != null && list.includes(last)) {
    const [a, b] = [list.indexOf(last), list.indexOf(base)].sort((x, y) => x - y)
    return [...new Set([...picked, ...list.slice(a, b + 1)])]
  }
  return picked.includes(base) ? picked.filter(x => x !== base) : [...picked, base]
}

// Most valuable first; with no price, they keep their order at the end.
export function byPrice (bases: string[], priceOf: (base: string) => number | null): string[] {
  return bases
    .map((base, i) => ({ base, i, chaos: priceOf(base) }))
    .sort((a, b) => a.chaos == null && b.chaos == null ? a.i - b.i : (b.chaos ?? -1) - (a.chaos ?? -1) || a.i - b.i)
    .map(x => x.base)
}

export interface ShownElsewhere { type: string, tier: string, block: FilterBlock, bases: string[] }

// Rules that still show items of a tier you hid (or NeverSink left off): a
// twin such as the Fated rares tier listing the same bases. When the tier is
// on, only rules above it count, as they get there first.
export function alsoShownBy (doc: FilterDoc, type: string, tier: string): ShownElsewhere[] {
  const own = doc.blocks.filter(b => b.type === type && b.tier === tier)
  const live = own.filter(b => !b.disabled)
  const off = !live.length || live.every(b => b.visibility === 'Hide')
  if (!off) return []
  const bases = new Set(own.flatMap(b => b.conditions.filter(c => c.key === 'BaseType' && c.op === '==').flatMap(c => c.values)))
  if (!bases.size) return []
  const out: ShownElsewhere[] = []
  for (const b of doc.blocks) {
    if (b.disabled || b.continue || b.visibility === 'Hide' || !b.type || (b.type === type && b.tier === tier)) continue
    const hit = b.conditions.filter(c => c.key === 'BaseType' && c.op === '==').flatMap(c => c.values).filter(v => bases.has(v))
    if (!hit.length) continue
    const prev = out.find(o => o.type === b.type && o.tier === b.tier)
    if (prev) prev.bases = [...new Set([...prev.bases, ...hit])]
    else out.push({ type: b.type, tier: b.tier ?? `#${b.line}`, block: b, bases: hit })
  }
  return out
}
