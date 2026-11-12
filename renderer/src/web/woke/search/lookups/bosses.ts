// Boss cards (entry, drops, prices) and "where does this drop", from the
// Boss runs tool's table.
import { BOSSES } from '../../boss-runs/bosses'
import type { Boss } from '../../boss-runs/bosses'
import { BOSS_RUNS_TYPE } from '../../boss-runs/widget'
import { matchRank } from '../search'
import type { Lookup, LookupAction, LookupCard, LookupContext, LookupRow } from './types'

const DROP_ROWS = 12
// "th" or "the" would list half the bosses.
const MIN_QUERY = 4

// Like Boss runs: the drop's variant, else the plain row, else the cheapest.
function dropPrice (ctx: LookupContext, name: string, variant?: string): number | null {
  return (variant != null ? ctx.price(name, variant) : null) ?? ctx.price(name)
}

function percent (chance: number): string {
  const p = chance * 100
  return p >= 10 ? `${Math.round(p)}%` : `${+p.toPrecision(2)}%`
}

export function entryCost (boss: Boss, ctx: LookupContext): number | null {
  let sum = 0
  for (const e of boss.entry) {
    const each = ctx.price(e.name)
    if (each == null) return null
    sum += each * e.qty
  }
  return sum
}

// Chance x price over the drops with a known rate and a fixed price. A floor:
// unidentified jewels and unknown rates count as nothing.
export function lootPerKill (boss: Boss, ctx: LookupContext): number | null {
  let sum = 0
  let any = false
  for (const d of boss.drops) {
    if (d.chance == null || d.variable) continue
    const price = dropPrice(ctx, d.name, d.variant)
    if (price == null) continue
    sum += d.chance * price * (d.qty ?? 1)
    any = true
  }
  return any ? sum : null
}

function bossActions (boss: Boss, ctx: LookupContext): LookupAction[] {
  const out: LookupAction[] = []
  if (ctx.tools.has(BOSS_RUNS_TYPE)) out.push({ label: 'Open Boss runs', tool: BOSS_RUNS_TYPE })
  if (boss.source) out.push({ label: 'Drop rate source', url: boss.source.url })
  out.push({ label: 'poedb', url: `https://poedb.tw/us/search?q=${encodeURIComponent(boss.name)}` })
  return out
}

export function bossCard (boss: Boss, ctx: LookupContext): LookupCard {
  const cost = entryCost(boss, ctx)
  const loot = lootPerKill(boss, ctx)
  const entry: LookupRow[] = boss.entry.map(e => {
    const each = ctx.price(e.name)
    return { label: `${e.qty} × ${e.name}`, chaos: each == null ? null : each * e.qty, item: { name: e.name } }
  })
  if (boss.entry.length > 1 || (boss.entry[0]?.qty ?? 0) > 1) entry.push({ label: 'Entry total', chaos: cost })
  if (!boss.entry.length) entry.push({ label: 'No entry item: found in the world', dim: true })
  const drops = [...boss.drops]
    // Rolled drops have no one price: they go last.
    .map(d => ({ d, price: d.variable ? -1 : dropPrice(ctx, d.name, d.variant) }))
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    .slice(0, DROP_ROWS)
    .map(({ d, price }): LookupRow => ({
      label: d.chance != null ? `${d.name} · ${percent(d.chance)}` : d.name,
      chaos: d.variable ? undefined : price ?? null,
      value: d.variable ? 'Depends on the roll' : undefined,
      item: { name: d.name }
    }))
  const summary: LookupRow[] = []
  if (loot != null) summary.push({ label: 'Loot per kill (known rates)', chaos: loot })
  if (loot != null && cost != null && boss.entry.length) summary.push({ label: 'After entry cost', chaos: loot - cost })
  const source = boss.source
    ? `Rates: ${boss.source.label}${boss.source.kills ? `, ${boss.source.kills.toLocaleString('en-US')} kills` : ''}. Unidentified jewels and unknown rates aren't counted.`
    : 'No public drop rates for this boss.'
  return {
    id: `boss:${boss.id}`,
    group: 'Bosses',
    name: boss.name,
    sub: cost != null && boss.entry.length ? `Boss · entry ${Math.round(cost)} c` : 'Boss',
    icon: 'fas fa-dragon',
    sections: [
      { label: 'Entry', rows: entry },
      ...(summary.length ? [{ rows: summary }] : []),
      ...(drops.length ? [{ label: boss.drops.length > DROP_ROWS ? `Top ${DROP_ROWS} drops by price` : 'Drops', rows: drops }] : []),
      { text: [source] }
    ],
    actions: bossActions(boss, ctx)
  }
}

// Bosses by name, and the boss an entry fragment opens.
export const bossLookup: Lookup = (query, ctx) => {
  if (query.trim().length < MIN_QUERY) return []
  const hits = BOSSES
    .map(boss => ({
      boss,
      rank: Math.min(
        ...[matchRank(boss.name, query), ...boss.entry.map(e => matchRank(e.name, query) === 0 ? 1 : -1)]
          .map(r => r < 0 ? 9 : r)
      )
    }))
    .filter(h => h.rank < 2)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 4)
  return hits.map(h => bossCard(h.boss, ctx))
}

// Every boss that drops each item.
const DROPPED_BY = new Map<string, Array<{ boss: Boss, chance: number | null, variant?: string, variable?: boolean }>>()
for (const boss of BOSSES) {
  for (const d of boss.drops) {
    const list = DROPPED_BY.get(d.name) ?? []
    if (!list.some(x => x.boss.id === boss.id)) list.push({ boss, chance: d.chance, variant: d.variant, variable: d.variable })
    DROPPED_BY.set(d.name, list)
  }
}

export function droppedBy (name: string) {
  return DROPPED_BY.get(name) ?? []
}

export const dropLookup: Lookup = (query, ctx) => {
  if (query.trim().length < MIN_QUERY) return []
  const out: LookupCard[] = []
  // The closest names first: "awakened enl" before every other Awakened gem.
  const names = [...DROPPED_BY.keys()].filter(n => matchRank(n, query) === 0).sort((a, b) => a.length - b.length)
  for (const name of names) {
    const bosses = DROPPED_BY.get(name)!
    const { variant, variable } = bosses[0]
    const rows: LookupRow[] = bosses.map(({ boss, chance }) => {
      const cost = entryCost(boss, ctx)
      return {
        label: chance != null ? `${boss.name} · ${percent(chance)} of kills` : boss.name,
        value: cost != null && boss.entry.length ? `entry ${Math.round(cost)} c` : undefined
      }
    })
    out.push({
      id: `drop:${name}`,
      group: 'Where it drops',
      name: `${name} drops from ${bosses.length === 1 ? bosses[0].boss.name : `${bosses.length} bosses`}`,
      sub: 'Boss drop',
      icon: 'fas fa-gift',
      tip: { name },
      sections: [
        { rows: [variable ? { label: name, value: 'Depends on the roll', item: { name } } : { label: name, chaos: dropPrice(ctx, name, variant), item: { name } }] },
        { label: 'Dropped by', rows }
      ],
      actions: [
        ...bosses.slice(0, 3).map(({ boss }) => ({ label: boss.name, search: boss.name })),
        ...(ctx.tools.has(BOSS_RUNS_TYPE) ? [{ label: 'Open Boss runs', tool: BOSS_RUNS_TYPE }] : [])
      ]
    })
    if (out.length >= 3) break
  }
  return out
}
