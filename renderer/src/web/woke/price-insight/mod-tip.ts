// The hover tooltip of a price check mod row (Guy's picks G5 and I1 in the
// tooltip audit, 2026-11-25): every tier of the row's mod on this item class,
// with the item level each needs and the row's own lit, and the crafting
// bench's version of the same line. From public/data/mod-tiers.json and
// public/data/craft-data.json; no trade search. Loaded on the first hover.
import type { ParsedItem } from '@/parser'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { dataFileUrl, onSharedDataChange } from '@/web/woke/app/live-data'
import type { ModTip } from '@/web/woke/ui/tooltip/tooltip'
import { rowLadder, tierDataSoon } from './tier-ladder'
import { loadImplicitTable } from './eldritch-listing'
import { ELDRITCH_TIERS, eldritchSteps } from './eldritch-roll'

interface BenchData {
  cur: string[]
  cls: string[]
  bench: Array<{ f: string, r: Array<[string, Array<[number, number]>, number[], string]> }>
}

let bench: Promise<BenchData | null> | null = null
onSharedDataChange(() => { bench = null })
function loadBench (): Promise<BenchData | null> {
  bench ??= fetch(dataFileUrl('craft-data.json'))
    .then(r => r.ok ? r.json() as Promise<BenchData> : null)
    .catch(() => null)
    .then(d => { if (!d) bench = null; return d })
  return bench
}

// The app's item category -> the bench's item class name.
const BENCH_CLASS: Record<string, string> = {
  'Body Armour': 'Body Armour',
  'Gloves': 'Gloves',
  'Boots': 'Boots',
  'Helmet': 'Helmet',
  'Shield': 'Shield',
  'Ring': 'Ring',
  'Belt': 'Belt',
  'Amulet': 'Amulet',
  'Quiver': 'Quiver',
  'One-Handed Sword': 'One Hand Melee',
  'One-Handed Axe': 'One Hand Melee',
  'One-Handed Mace': 'One Hand Melee',
  'Sceptre': 'One Hand Melee',
  'Dagger': 'One Hand Melee',
  'Rune Dagger': 'One Hand Melee',
  'Claw': 'One Hand Melee',
  'Wand': 'One Hand Ranged',
  'Two-Handed Sword': 'Two Hand Melee',
  'Two-Handed Axe': 'Two Hand Melee',
  'Two-Handed Mace': 'Two Hand Melee',
  'Staff': 'Two Hand Melee',
  'Warstaff': 'Two Hand Melee',
  'Bow': 'Two Hand Ranged'
}

// "+# to maximum Life" -> "# to maximum Life", as the bench names its families.
const family = (text: string) => text.replace(/[+-]?#/g, '#')

/** The bench's best craft of a mod line on this item class, if it has one. */
export function benchCraft (data: BenchData, category: string | undefined, text: string): ModTip['bench'] | undefined {
  const cls = category ? data.cls.indexOf(BENCH_CLASS[category] ?? '') : -1
  if (cls < 0) return undefined
  const row = data.bench.find(b => b.f === family(text))
  const best = row?.r.filter(r => r[2].includes(cls)).pop()
  if (!best) return undefined
  const cost = best[1].map(([n, c]) => `${n} ${data.cur[c] ?? '?'}`).join(' + ')
  return { text: best[0], cost, where: best[3] === 'Default' ? 'known from the start' : `unlocked in ${best[3]}` }
}

const GEN: Record<string, string> = { prefix: 'Prefix', suffix: 'Suffix' }

/** The row's tooltip, or null when the data doesn't know its tiers. */
export async function modTipFor (item: ParsedItem, f: StatFilter): Promise<ModTip | null> {
  if (f.sources.length === 1 && f.sources[0].modifier.info.eldritch) return await eldritchTip(item, f)
  const [tiers, benchData] = await Promise.all([tierDataSoon(1500), loadBench()])
  if (!tiers) return null
  const ladder = rowLadder(tiers, item, f)
  if (!ladder) return null
  const { modifier, stat } = f.sources[0]
  const text = stat.translation.string
  // The row's line with its roll: "+120 to maximum Life". A total's one
  // source is that mod's own line, whose tiers these are.
  const own = !/\btotal\b/i.test(f.text)
  const line = own ? f.text : (f.text.startsWith('+') && !/^[+-]/.test(text) ? `+${text}` : text)
  return {
    kind: 'mod',
    title: stat.roll ? line.replace('#', String(stat.roll.value)) : line,
    sub: [GEN[modifier.info.generation ?? ''], item.category].filter(Boolean).join(' · '),
    steps: ladder.steps,
    mine: ladder.mine,
    itemLevel: item.itemLevel,
    bench: benchData ? benchCraft(benchData, item.category, text) : undefined
  }
}

/** An eldritch implicit's tiers, Lesser to Perfect, best first, with the item's own lit. */
async function eldritchTip (item: ParsedItem, f: StatFilter): Promise<ModTip | null> {
  const { modifier } = f.sources[0]
  const table = await loadImplicitTable()
  const found = eldritchSteps(f.sources[0], item.category, table?.shown)
  if (!found) return null
  const altar = modifier.info.eldritch === 'exarch' ? 'Searing Exarch' : 'Eater of Worlds'
  return {
    kind: 'mod',
    title: f.roll ? f.text.replace('#', String(f.roll.value)) : f.text,
    sub: [`${altar} implicit`, item.category].filter(Boolean).join(' · '),
    steps: found.steps.map(s => ({ tier: s.rank, min: s.min, max: s.max, label: ELDRITCH_TIERS[s.rank - 1] })).reverse(),
    mine: found.mine.rank
  }
}
