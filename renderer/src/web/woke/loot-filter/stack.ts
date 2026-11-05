// Stack sizes of a group's tiers: Harvest's 4000 / 500 / 250..., gold's piles. What
// the rows and the scale above them read and change.
import type { FilterBlock } from './parse'
import type { TierNode } from './groups'

const stackOf = (b: FilterBlock) => b.conditions.find(c => c.key === 'StackSize' && c.op === '>=')

// The tier's stack size, if it has one you can set. A tier whose rules disagree
// has no one number to show.
export function tierStack (t: TierNode): number | null {
  const live = t.blocks.filter(b => !b.disabled)
  if (!live.length) return null
  const sizes = new Set(live.map(b => stackOf(b)?.values[0]))
  if (sizes.size !== 1) return null
  const n = Number([...sizes][0])
  return Number.isFinite(n) && n > 0 ? n : null
}

export function cleanStackSize (v: unknown): number | null {
  const n = Math.round(Number(v))
  if (v === '' || v == null || !Number.isFinite(n)) return null
  return Math.max(1, Math.min(STACK_MAX, n))
}

export const STACK_MAX = 99999

export interface LadderStep {
  tier: string
  size: number
}

export interface StackLadder {
  // Biggest stack first.
  steps: LadderStep[]
  // The tier that catches what's smaller than all of them.
  floor: string | null
}

// Worth a scale only when one item's stacks climb through the tiers. "Stacks of 6
// or more" is all 6s, and levelling stacks are different items that happen to share
// numbers, so a line there wouldn't move anything along a ladder.
export function stackLadder (tiers: TierNode[], sizeOf: (t: TierNode) => number | null): StackLadder | null {
  const steps = tiers.flatMap(t => {
    const size = t.disabled ? null : sizeOf(t)
    return size == null ? [] : [{ tier: t.tier, size }]
  }).sort((a, b) => b.size - a.size)
  if (new Set(steps.map(s => s.size)).size < 2) return null
  const items = new Set(tiers.filter(t => steps.some(s => s.tier === t.tier)).map(t => [...t.bases].sort().join('|')))
  if (items.size > 1) return null
  const last = Math.max(...steps.map(s => tiers.findIndex(t => t.tier === s.tier)))
  const floor = tiers.slice(last + 1).find(t => !t.disabled && t.visibility !== 'Hide' && sizeOf(t) == null)
  return { steps, floor: floor?.tier ?? null }
}

const others = (b: FilterBlock) => JSON.stringify(b.conditions.filter(c => c.key !== 'StackSize' && c.key !== 'BaseType').map(c => [c.key, c.op, c.values]))

// Tiers that can never catch anything: an earlier rule for the same items takes
// every stack they would. The game goes top down, so the file's order decides.
export function unreachableTiers (tiers: TierNode[], sizeOf: (t: TierNode) => number | null): string[] {
  const out: string[] = []
  tiers.forEach((t, i) => {
    const size = t.disabled ? null : sizeOf(t)
    if (size == null) return
    const mine = t.blocks.find(b => !b.disabled)
    const caught = tiers.slice(0, i).some(u => {
      const theirs = u.disabled ? null : sizeOf(u)
      const first = u.blocks.find(b => !b.disabled)
      return theirs != null && theirs <= size && first && mine &&
        others(first) === others(mine) && (!u.bases.length || (t.bases.length > 0 && t.bases.every(x => u.bases.includes(x))))
    })
    if (caught) out.push(t.tier)
  })
  return out
}

// The scale runs on logs: 20 and 45 need to be as far apart as 500 and 4000 look.
export function scaleMax (steps: LadderStep[]): number {
  return Math.max(10, Math.max(...steps.map(s => s.size)) * 2)
}

export function scalePct (size: number, max: number): number {
  return Math.max(0, Math.min(100, Math.log10(Math.max(1, size)) / Math.log10(max) * 100))
}

export function scaleSize (pct: number, max: number): number {
  const raw = Math.pow(10, Math.max(0, Math.min(100, pct)) / 100 * Math.log10(max))
  // A round number at each scale: 4,000 and not 3,987.
  const step = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1))
  return Math.max(1, Math.round(raw / step) * step)
}
