// Two builds side by side, each on the sets it was saved on: that's what PoB's
// saved stats describe.
import { buildDps, gearOrder, gemsOf, isGearSlot, shortNumber, slotLabel } from './build-model'
import type { PobDetails, PobItem, PobStats } from './widget'

export interface StatCompare {
  label: string
  a: string
  b: string
  delta: string
  // Whether more is better here.
  tone: 'up' | 'down' | 'dim'
}

export interface GearCompare {
  slot: string
  a: PobItem | null
  b: PobItem | null
}

export interface BuildCompare {
  stats: StatCompare[]
  gear: GearCompare[]
  gearTotal: number
  gemsOnlyA: string[]
  gemsOnlyB: string[]
  treeOnlyA: number
  treeOnlyB: number
}

type Read = (s: PobStats) => number | undefined

const STATS: Array<{ label: string, read: Read, percent?: boolean, overCap?: boolean }> = [
  { label: 'Damage (DPS)', read: s => buildDps(s) || undefined, percent: true },
  { label: 'Life', read: s => (s.Life && s.Life > 1 ? s.Life : undefined) },
  { label: 'Energy shield', read: s => s.EnergyShield },
  { label: 'Effective health', read: s => s.TotalEHP, percent: true },
  { label: 'Fire res spare over cap', read: s => s.FireResistOverCap, overCap: true },
  { label: 'Cold res spare over cap', read: s => s.ColdResistOverCap, overCap: true },
  { label: 'Lightning res spare over cap', read: s => s.LightningResistOverCap, overCap: true },
  { label: 'Chaos resistance', read: s => s.ChaosResist }
]

function signed (n: number): string {
  return `${n > 0 ? '+' : ''}${shortNumber(n)}`
}

function compareStat (a: number | undefined, b: number | undefined, percent?: boolean): Pick<StatCompare, 'delta' | 'tone'> {
  if (a == null || b == null || a === b) return { delta: '', tone: 'dim' }
  const tone = b > a ? 'up' : 'down'
  if (percent && a > 0) {
    const pct = (b - a) / a * 100
    return { delta: `${pct > 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) >= 100 ? 0 : 1)}%`, tone }
  }
  return { delta: signed(b - a), tone }
}

function activeOf<T extends { isActive: boolean }> (sets: T[] | undefined): T | undefined {
  return sets?.find(s => s.isActive) ?? sets?.[0]
}

// `isPoint`: whether a tree node id costs a passive point, when that's known.
export function compareBuilds (a: PobDetails, b: PobDetails, isPoint: (id: number) => boolean = () => true): BuildCompare {
  const stats: StatCompare[] = []
  for (const s of STATS) {
    const x = s.read(a.stats ?? {})
    const y = s.read(b.stats ?? {})
    if (x == null && y == null) continue
    stats.push({
      label: s.label,
      a: x == null ? 'none' : shortNumber(x),
      b: y == null ? 'none' : shortNumber(y),
      ...compareStat(x, y, s.percent)
    })
  }

  const slotsA = activeOf(a.itemSets)?.slots ?? []
  const slotsB = activeOf(b.itemSets)?.slots ?? []
  const slots = [...new Set([...slotsA, ...slotsB].map(s => s.slot))].filter(isGearSlot).sort((x, y) => gearOrder(x) - gearOrder(y))
  const gear: GearCompare[] = []
  for (const slot of slots) {
    const x = slotsA.find(s => s.slot === slot)?.item ?? null
    const y = slotsB.find(s => s.slot === slot)?.item ?? null
    if (JSON.stringify(x) !== JSON.stringify(y)) gear.push({ slot: slotLabel(slot), a: x, b: y })
  }

  const setA = activeOf(a.skillSets)
  const setB = activeOf(b.skillSets)
  const gemsA = setA ? gemsOf([setA]) : []
  const gemsB = setB ? gemsOf([setB]) : []
  const treeA = (activeOf(a.trees)?.nodes ?? []).filter(isPoint)
  const treeB = (activeOf(b.trees)?.nodes ?? []).filter(isPoint)

  return {
    stats,
    gear,
    gearTotal: slots.length,
    gemsOnlyA: gemsA.filter(g => !gemsB.includes(g)),
    gemsOnlyB: gemsB.filter(g => !gemsA.includes(g)),
    treeOnlyA: treeA.filter(n => !treeB.includes(n)).length,
    treeOnlyB: treeB.filter(n => !treeA.includes(n)).length
  }
}

// The passive trees in a sentence.
export function treeSentence (r: Pick<BuildCompare, 'treeOnlyA' | 'treeOnlyB'>, a: string, b: string): string {
  const points = (n: number) => `${n} extra ${n === 1 ? 'point' : 'points'}`
  // Points only: mastery picks and jewels aren't compared.
  if (!r.treeOnlyA && !r.treeOnlyB) return 'The same passive points.'
  if (!r.treeOnlyB) return `${a} has ${points(r.treeOnlyA)}. The rest of the tree is the same.`
  if (!r.treeOnlyA) return `${b} has ${points(r.treeOnlyB)}. The rest of the tree is the same.`
  return `${r.treeOnlyA} ${r.treeOnlyA === 1 ? 'point' : 'points'} only in ${a}, ${r.treeOnlyB} only in ${b}.`
}
