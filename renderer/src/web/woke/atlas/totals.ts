// What the allocated atlas adds up to: each stat line summed across the
// passives that give it, grouped by mechanic (like PoB's tree Totals).
import type { AtlasTreeModel } from './atlas-tree'

export interface AtlasTotal {
  text: string
  ids: number[]
}

export interface AtlasTotalGroup {
  mechanic: string
  rows: AtlasTotal[]
}

// Passives on the paths between wheels.
export const GENERAL = 'General'

// Only amounts add up: a number before "%" or after "+" ("10%", "+1 Remnants").
// Tiers, ranges ("Tier 1-15") and counts in the text stay as written.
const AMOUNT = /(?<=\+)\d+(?:\.\d+)?|\d+(?:\.\d+)?(?=%)/g
const SLOT = '\u0000'

function round (v: number): string {
  return String(Math.round(v * 10) / 10)
}

// `taken`: the allocated passives; `picks`: node -> picked type effect.
export function atlasTotals (model: AtlasTreeModel, taken: Iterable<number>, picks: Record<number, number>): AtlasTotalGroup[] {
  const sums = new Map<string, { mechanic: string, template: string, values: number[], ids: number[] }>()
  for (const id of taken) {
    if (id === model.start) continue
    const n = model.nodes.get(id)
    if (!n || n.kind === 'mastery') continue
    const mechanic = model.mechanicOf.get(id) ?? GENERAL
    const choices = model.variants.get(id)
    const pick = choices?.find(c => c.effect === picks[id])
    // A notable that asks for a type reads as its stat with the type picked;
    // one whose stat is all in the type reads as the type's own lines.
    const lines = choices && !n.stats.length
      ? (pick ? pick.text.split(' / ') : ['No type picked'])
      : n.stats.map(raw => choices ? `${raw}: ${pick ? pick.text : 'no type picked'}` : raw)
    for (const raw of lines) {
      const line = raw.replace(/\s*\n\s*/g, ' ')
      const values = (line.match(AMOUNT) ?? []).map(Number)
      const template = line.replace(AMOUNT, SLOT)
      const key = `${mechanic}|${template}`
      const sum = sums.get(key)
      if (sum) {
        values.forEach((v, i) => { sum.values[i] = (sum.values[i] ?? 0) + v })
        if (!sum.ids.includes(id)) sum.ids.push(id)
      } else {
        sums.set(key, { mechanic, template, values, ids: [id] })
      }
    }
  }
  const groups = new Map<string, AtlasTotal[]>()
  for (const s of sums.values()) {
    let i = 0
    const text = s.template.replace(new RegExp(SLOT, 'g'), () => round(s.values[i++] ?? 0))
    const list = groups.get(s.mechanic)
    if (list) list.push({ text, ids: s.ids })
    else groups.set(s.mechanic, [{ text, ids: s.ids }])
  }
  // The mechanic with the most lines first; General last.
  return [...groups].map(([mechanic, rows]) => ({ mechanic, rows }))
    .sort((a, b) => Number(a.mechanic === GENERAL) - Number(b.mechanic === GENERAL) || b.rows.length - a.rows.length || a.mechanic.localeCompare(b.mechanic))
}

export function filterTotals (groups: AtlasTotalGroup[], query: string): AtlasTotalGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map(g => g.mechanic.toLowerCase().includes(q) ? g : { ...g, rows: g.rows.filter(r => r.text.toLowerCase().includes(q)) })
    .filter(g => g.rows.length)
}
