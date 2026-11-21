// Nightmare (T17) maps in the search: "nightmare" or "t17" lists all five by
// what their boss drops are worth against a Nightmare Map; a map or boss name
// ("ziggurat", "catarina") gives that map's drops. Same numbers as Boss runs'
// Nightmare tab (its fragments-a-kill setting, typed rates and kill log).
import { evaluateBoss, priceResolver } from '../../boss-runs/calc'
import type { BossPrefs, BossResult, DropRow } from '../../boss-runs/calc'
import { DEFAULT_FRAGMENTS_PER_KILL, NIGHTMARE_MAP, NIGHTMARE_MAPS, NIGHTMARE_SOURCE, nightmareBosses } from '../../boss-runs/nightmare'
import { BOSS_RUNS_TYPE } from '../../boss-runs/widget'
import { matchRank } from '../search'
import type { Lookup, LookupAction, LookupCard, LookupContext, LookupRow } from './types'
import { DEFAULT_NIGHTMARE_VAULT_CHANCE, shortName, typicalPick, vaultForNightmare } from '../../vaults/vaults'
import type { Vault, VaultTable } from '../../vaults/vaults'

// The boss behind each map, for searches by boss name (poedb, 3.30).
const BOSS_NAMES: Record<string, string[]> = {
  'nightmare-abomination': ['Nightmare of the Depraved Trinity', 'Nightmare of Maligaro', 'Nightmare of Shavronne', 'Nightmare of Doedre'],
  'nightmare-citadel': ['Nightmare of Uhtred'],
  'nightmare-fortress': ['Nightmare of the Unbreakable'],
  'nightmare-sanctuary': ['Nightmare of Lycia'],
  'nightmare-ziggurat': ['Nightmare of Catarina']
}

const OVERVIEW = /^(nightmare( maps?)?|t17( maps?)?|tier 17( maps?)?)$/i
const MIN_QUERY = 4

const DEFAULT_PREFS: BossPrefs = {
  runSeconds: {}, rates: {}, extraDrops: {}, kills: {}, ownEntry: false, plannedRuns: 0, dropToggles: {}, priceModes: {}, customPrices: {}
}

function copies (d: DropRow): number {
  return (d.chance ?? 0) * d.qty
}
function pct (d: DropRow): string {
  if (d.chance == null) return 'rate unknown'
  const p = copies(d) * 100
  return `${d.rateSource === 'estimate' ? '~' : ''}${p >= 10 ? Math.round(p) : +p.toFixed(1)}%`
}
const short = (name: string) => name.replace(/ Fragment$/, '')

function evaluate (prefs: BossPrefs, ctx: LookupContext): BossResult[] {
  const px = priceResolver([...ctx.items])
  // The map you run is the entry; every drop counts.
  const p = { ...prefs, ownEntry: false, plannedRuns: 0 }
  return nightmareBosses(p.nightmareFrags)
    .map(b => evaluateBoss(b, p, px))
    .sort((a, b) => b.loot - a.loot)
}

function note (prefs: BossPrefs): string {
  return `~ = estimated: no drop rates are published. ${prefs.nightmareFrags ?? DEFAULT_FRAGMENTS_PER_KILL} fragments a kill, 80% from the ones each boss favours; the unique's 5% is a 3.29 guide's figure. % = copies a kill. Change it or log kills in Boss runs › Nightmare.`
}

function actions (ctx: LookupContext): LookupAction[] {
  const out: LookupAction[] = []
  if (ctx.tools.has(BOSS_RUNS_TYPE)) out.push({ label: 'Open Boss runs', tool: BOSS_RUNS_TYPE })
  out.push({ label: 'Rates source', url: NIGHTMARE_SOURCE.url })
  return out
}

function overviewCard (results: BossResult[], prefs: BossPrefs, vaults: VaultTable | null, ctx: LookupContext): LookupCard {
  const mapPrice = ctx.price(NIGHTMARE_MAP)
  const rows = results.map(r => {
    const map = NIGHTMARE_MAPS.find(m => m.id === r.boss.id)!
    const favoured = map.favoured.map(f => r.drops.find(d => d.name === f)!).map(d => `${short(d.name)} ${pct(d)}`)
    const u = r.drops.find(d => d.name === map.unique)
    return {
      cells: [
        { text: r.boss.name.replace(/ Map$/, ''), sub: [...favoured, u ? `${u.name} ${pct(u)}` : '', vaultTag(r, vaults)].filter(Boolean).join(' · ') },
        `${Math.round(r.loot)} c`
      ],
      chaos: r.entryMissing.length ? null : r.profit
    }
  })
  const best = results[0]
  return {
    id: 'nightmare:all',
    group: 'Bosses',
    name: 'Nightmare (T17) maps',
    sub: best ? `Best: ${best.boss.name.replace(/ Map$/, '')}` : 'Boss fragments and uniques',
    icon: 'fas fa-dragon',
    tip: { name: NIGHTMARE_MAP },
    sections: [
      { rows: [{ label: `${NIGHTMARE_MAP}, one price for all five`, chaos: mapPrice, item: { name: NIGHTMARE_MAP } }] },
      { label: 'Run it as', table: { head: ['Map · favoured drops', 'Loot', 'Profit'], priceAt: 2, rows } },
      { text: [note(prefs)] }
    ],
    actions: actions(ctx)
  }
}

// The Templar Vault a map spawns about half the time; shown, not in profit.
function vaultTag (r: BossResult, vaults: VaultTable | null): string {
  const v = vaults ? vaultForNightmare(vaults, r.boss.id) : null
  return v ? `${shortName(v)} vault` : ''
}

function vaultRow (vault: Vault, ctx: LookupContext): LookupRow {
  const typical = typicalPick(vault, ctx.price)
  return {
    label: `Vault: ${vault.name}, ~${DEFAULT_NIGHTMARE_VAULT_CHANCE}% of maps · ~typical pick, not in profit`,
    ...(typical != null ? { chaos: typical } : { value: 'varies', dim: true }),
    action: { label: 'Vault rewards', search: shortName(vault) }
  }
}

function mapCard (r: BossResult, prefs: BossPrefs, vaults: VaultTable | null, ctx: LookupContext): LookupCard {
  const vault = vaults ? vaultForNightmare(vaults, r.boss.id) : null
  const map = NIGHTMARE_MAPS.find(m => m.id === r.boss.id)!
  const drops: LookupRow[] = [...r.drops]
    .sort((a, b) => b.value - a.value)
    .map(d => ({
      label: `${d.name} · ${pct(d)}${map.favoured.includes(d.name) ? ' · favoured' : d.name === map.unique ? ' · its unique' : ''}`,
      chaos: d.price,
      item: { name: d.name },
      bulk: true
    }))
  const summary: LookupRow[] = [
    { label: `Entry: ${NIGHTMARE_MAP}`, chaos: r.entryMissing.length ? null : r.entry, item: { name: NIGHTMARE_MAP } },
    { label: 'Loot per kill', chaos: r.loot },
    { label: 'Profit per map', chaos: r.entryMissing.length ? null : r.profit },
    ...(vault ? [vaultRow(vault, ctx)] : [])
  ]
  return {
    id: `nightmare:${r.boss.id}`,
    group: 'Bosses',
    name: `${r.boss.name} (Nightmare)`,
    sub: `${BOSS_NAMES[r.boss.id][0]} · ${r.entryMissing.length ? 'T17' : `${r.profit >= 0 ? '+' : ''}${Math.round(r.profit)} c a map`}`,
    icon: 'fas fa-dragon',
    tip: { name: NIGHTMARE_MAP },
    sections: [
      { rows: summary },
      { label: 'Drops', rows: drops },
      { text: [note(prefs)] }
    ],
    actions: actions(ctx)
  }
}

// Which Nightmare maps drop each item, as expected copies a kill, for the
// "where it drops" cards. null: the Boss runs module is off.
export function nightmareDropSources (prefs: BossPrefs | null, ctx: LookupContext): Map<string, Array<{ name: string, copies: number | null, estimate: boolean }>> {
  const out = new Map<string, Array<{ name: string, copies: number | null, estimate: boolean }>>()
  if (!prefs) return out
  for (const r of evaluate({ ...DEFAULT_PREFS, ...prefs }, ctx)) {
    for (const d of r.drops) {
      const list = out.get(d.name) ?? []
      list.push({ name: r.boss.name, copies: d.chance == null ? null : copies(d), estimate: d.rateSource === 'estimate' })
      out.set(d.name, list)
    }
  }
  return out
}

// null: the Boss runs module is off, so no Nightmare cards.
export function nightmareLookup (prefs: BossPrefs | null, vaults: VaultTable | null = null): Lookup {
  if (!prefs) return () => []
  return (query, ctx) => {
    const q = query.trim()
    if (q.length < 3) return []
    const p = { ...DEFAULT_PREFS, ...prefs }
    if (OVERVIEW.test(q)) return [overviewCard(evaluate(p, ctx), p, vaults, ctx)]
    if (q.length < MIN_QUERY) return []
    const hits = NIGHTMARE_MAPS.filter(m => [m.name, m.name.replace(/ Map$/, ''), ...BOSS_NAMES[m.id]].some(n => { const r = matchRank(n, q); return r === 0 || r === 1 }))
    if (!hits.length) return []
    const results = evaluate(p, ctx)
    // "nightmare of" names every boss: the overview says it best.
    if (hits.length > 2) return [overviewCard(results, p, vaults, ctx)]
    return hits.slice(0, 2).map(m => mapCard(results.find(r => r.boss.id === m.id)!, p, vaults, ctx))
  }
}
