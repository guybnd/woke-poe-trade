// A strategy's loadout: the Threads and other items each map costs, priced,
// and what in the tree says about them.
import type { PriceItem } from '../market/types'
import type { AtlasTreeModel } from './atlas-tree'
import { MAX_THREADS } from './strategies'
import type { ThreadSlot } from './strategies'

export interface CostLine { qty: number, name: string }
export interface PricedLine extends CostLine { item: PriceItem | null }

// "4x Vaal Orb", "Orb of Alchemy x2", "2 Chaos Orbs", "Orb of Scouring".
export function parseCostLines (text: string): CostLine[] {
  const out: CostLine[] = []
  for (const raw of text.split(/\r?\n|;/)) {
    const line = raw.replace(/^[\s\-*•·]+/, '').trim()
    if (!line) continue
    let qty = 1
    let name = line
    const pre = /^(\d+)\s*[x×]?\s+(.+)$/i.exec(line)
    const post = /^(.+?)\s*[x×]\s*(\d+)$/i.exec(line)
    if (pre) { qty = Number(pre[1]); name = pre[2] } else if (post) { qty = Number(post[2]); name = post[1] }
    name = name.trim()
    if (name) out.push({ qty: Math.max(1, Math.min(qty, 99)), name })
  }
  return out
}

// Each line's poe.ninja item: the exact name first, then the plural or a
// near name among currency-like items ("Chaos Orbs" -> "Chaos Orb").
export function priceLines (lines: CostLine[], items: PriceItem[]): PricedLine[] {
  const byName = new Map<string, PriceItem>()
  for (const i of items) if (!byName.has(i.name.toLowerCase())) byName.set(i.name.toLowerCase(), i)
  const loose = items.filter(i => /currency|scarab|fragment|thread|essence|oil|fossil|catalyst/i.test(i.type))
  return lines.map(l => {
    const want = l.name.toLowerCase()
    const exact = byName.get(want) ?? byName.get(want.replace(/s$/, ''))
    if (exact) return { ...l, item: exact }
    const near = loose
      .filter(i => i.name.toLowerCase().includes(want) || want.includes(i.name.toLowerCase()))
      .sort((a, b) => Math.abs(a.name.length - want.length) - Math.abs(b.name.length - want.length))[0]
    return { ...l, item: near ?? null }
  })
}

// A Thread of this type on poe.ninja, once it lists them ("Breach Thread").
export function threadItem (type: string, items: PriceItem[]): PriceItem | null {
  const t = type.toLowerCase()
  return items.find(i => /thread/i.test(i.name) && i.name.toLowerCase().includes(t)) ?? null
}

export interface PricedThread extends ThreadSlot { item: PriceItem | null }

export function priceThreads (threads: ThreadSlot[], items: PriceItem[]): PricedThread[] {
  return threads.map(t => ({ ...t, item: threadItem(t.type, items) }))
}

// The keystone that changes how many Thread types and how many of each.
const ONE_TYPE_KEYSTONE = 'Unwavering Vision'

export function hasOneTypeKeystone (model: AtlasTreeModel | null, nodes: Set<number>): boolean {
  if (!model) return false
  for (const id of nodes) if (model.nodes.get(id)?.name === ONE_TYPE_KEYSTONE) return true
  return false
}

// The most of one type a map takes: 8, or 10 with Unwavering Vision.
export function threadCap (oneType: boolean): number {
  return oneType ? MAX_THREADS + 2 : MAX_THREADS
}

// What the tree and the Threads disagree on, in words.
export function treeWarnings (model: AtlasTreeModel | null, nodes: Set<number>, threads: ThreadSlot[]): string[] {
  const out: string[] = []
  const oneType = hasOneTypeKeystone(model, nodes)
  const types = new Set(threads.map(t => t.type))
  if (oneType && types.size > 1) out.push(`${ONE_TYPE_KEYSTONE} allows one Thread type`)
  const cap = threadCap(oneType)
  if (threads.some(t => t.count > cap)) out.push(`More than ${cap} of one Thread`)
  if (model) {
    let used = 0
    for (const id of nodes) if (id !== model.start) used++
    if (used > model.points) out.push(`${used - model.points} over the ${model.points} points`)
  }
  return out
}
