// What a passive tree adds up to, and finding nodes by what they say. Only the
// tree itself: gear, jewels, ascendancy and masteries aren't in these sums.
import type { TreeNode } from './passive-tree'

export type TotalGroup = 'Attributes and pools' | 'Resistances' | 'Critical strikes' | 'Speed' | 'Damage' | 'Defence' | 'Other'

const GROUP_ORDER: TotalGroup[] = ['Attributes and pools', 'Resistances', 'Critical strikes', 'Speed', 'Damage', 'Defence', 'Other']

// First match wins, so a line about two things lands where it's mostly useful:
// penetration is damage, and damage taken or leeched is defence.
const GROUP_RULES: Array<[RegExp, TotalGroup]> = [
  [/Penetrat/, 'Damage'],
  [/Resistances?\b/, 'Resistances'],
  [/Critical/, 'Critical strikes'],
  [/^(to )?(Strength|Dexterity|Intelligence|all Attributes)\b|maximum (Life|Mana|Energy Shield)\b/, 'Attributes and pools'],
  [/Armour|Evasion|Block|Suppress|Recovery|Regenerat|Leech|Recoup|Damage taken|taken as/, 'Defence'],
  [/Speed\b/, 'Speed'],
  [/Damage/, 'Damage']
]

function groupOf (text: string): TotalGroup {
  return GROUP_RULES.find(([re]) => re.test(text))?.[1] ?? 'Other'
}

export interface TreeTotal {
  // "115%", "+300"; empty when the number can't stand apart from the text.
  amount: string
  text: string
  // The line as the game words it, for searching.
  search: string
  group: TotalGroup
  // The nodes it comes from, to light them.
  ids: number[]
}

// PoB wraps long lines: a following line that starts in lower case, or with a
// number that isn't a percentage of something, carries on the one before.
function statLines (stat: string): string[] {
  const out: string[] = []
  for (const raw of stat.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (out.length && /^([a-z]|\d+(?!\d*(\.\d+)?%))/.test(raw)) out[out.length - 1] += ` ${raw}`
    else out.push(raw)
  }
  return out
}

const NUMBER = /\d+(?:\.\d+)?/g
// A line starting with a number, split into the number and the rest.
const LEADING = /^([+-]?)(\d+(?:\.\d+)?)(%?)\s+(.*)$/

function round (n: number) {
  return Math.round(n * 100) / 100
}

export function treeTotals (nodes: Map<number, TreeNode>, ids: number[], nodeOf: (id: number) => TreeNode | undefined = id => nodes.get(id)): TreeTotal[] {
  const leading = new Map<string, { plus: boolean, percent: boolean, sum: number, rest: string, search: string, ids: number[] }>()
  const inside = new Map<string, { sum: number, line: string, ids: number[] }>()
  const plain = new Map<string, number[]>()
  for (const id of new Set(ids)) {
    const n = nodeOf(id)
    // Ascendancy has its own points and text; it would swamp the sums' meaning.
    if (!n || n.kind === 'asc') continue
    for (const line of n.stats.flatMap(statLines)) {
      const m = LEADING.exec(line)
      if (m && (m[4].match(NUMBER)?.length ?? 0) === 0) {
        // The sign is part of the number: +3% and -10% of one thing add up.
        const key = `${m[3]}|${m[4]}`
        const row = leading.get(key) ?? { plus: false, percent: m[3] === '%', sum: 0, rest: m[4], search: line, ids: [] }
        row.plus ||= m[1] === '+'
        row.sum += (m[1] === '-' ? -1 : 1) * Number(m[2])
        row.ids.push(id)
        leading.set(key, row)
        continue
      }
      // One number mid-line adds up in place: "Sword Attacks deal 12% ...".
      const numbers = line.match(NUMBER) ?? []
      if (numbers.length === 1) {
        const key = line.replace(NUMBER, '#')
        const row = inside.get(key) ?? { sum: 0, line, ids: [] }
        row.sum += Number(numbers[0])
        row.ids.push(id)
        inside.set(key, row)
        continue
      }
      plain.set(line, [...plain.get(line) ?? [], id])
    }
  }
  const out: TreeTotal[] = [...leading.values()]
    .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum))
    .map(r => {
      const value = round(r.sum)
      return {
        amount: `${r.plus && value > 0 ? '+' : ''}${value}${r.percent ? '%' : ''}`,
        text: r.rest.replace(/^to /, ''),
        search: r.search,
        group: groupOf(r.rest),
        ids: r.ids
      }
    })
  for (const r of inside.values()) {
    const text = r.line.replace(NUMBER, String(round(r.sum)))
    out.push({ amount: '', text, search: text, group: groupOf(r.line), ids: r.ids })
  }
  for (const [line, from] of plain) {
    out.push({ amount: '', text: from.length > 1 ? `${line} (${from.length} times)` : line, search: line, group: groupOf(line), ids: from })
  }
  return out
}

export interface TotalsGroup { name: TotalGroup, rows: TreeTotal[] }

export function groupTotals (totals: TreeTotal[]): TotalsGroup[] {
  return GROUP_ORDER
    .map(name => ({ name, rows: totals.filter(t => t.group === name) }))
    .filter(g => g.rows.length)
}

export function filterTotals (totals: TreeTotal[], query: string): TreeTotal[] {
  const q = query.trim().toLowerCase()
  if (!q) return totals
  return totals.filter(t => `${t.amount} ${t.text} ${t.search}`.toLowerCase().includes(q))
}

// Every drawn node on the tree whose name or text matches, to light them. A
// query of one letter would light half the tree, so it waits for two.
export function matchingNodes (nodes: Iterable<TreeNode>, query: string): number[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const out: number[] = []
  for (const n of nodes) {
    if (n.kind === 'asc' || n.kind === 'ascstart' || n.kind === 'start') continue
    if (n.name.toLowerCase().includes(q) || n.stats.some(s => s.replace(/\s*\n\s*/g, ' ').toLowerCase().includes(q))) out.push(n.id)
  }
  return out
}
