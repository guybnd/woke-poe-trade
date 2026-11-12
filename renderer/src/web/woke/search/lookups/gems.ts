// Where to get a gem in the campaign: quest rewards and vendors by class, from
// the PoB tool's gem-sources data (exile-leveling, MIT), loaded on first use.
import { matchRank } from '../search'
import type { GemColour, GemSource } from '../../pob-builds/gems'
import type { Lookup, LookupCard, LookupRow } from './types'

export type GemTable = Record<string, { l: number, a?: GemColour, s: GemSource[] }>

const CLASSES = ['Duelist', 'Marauder', 'Ranger', 'Scion', 'Shadow', 'Templar', 'Witch']
const COLOUR: Record<string, string> = { r: 'Strength (red)', g: 'Dexterity (green)', b: 'Intelligence (blue)', w: 'White' }

export function classList (mask: string): string {
  const names = CLASSES.filter((_, i) => mask[i] === '1')
  if (names.length === CLASSES.length) return 'Every class'
  if (names.length >= 5) return `Every class but ${CLASSES.filter((_, i) => mask[i] !== '1').join(' and ')}`
  return names.join(', ')
}

// The base gem of a transfigured one: "Ice Nova of Frostbolts" -> "Ice Nova".
export function transfiguredBase (name: string, table: GemTable): string | null {
  const i = name.lastIndexOf(' of ')
  return i > 0 && !table[name] && table[name.slice(0, i)] ? name.slice(0, i) : null
}

export function gemCard (name: string, table: GemTable): LookupCard | null {
  const base = transfiguredBase(name, table)
  const entry = table[name] ?? (base ? table[base] : undefined)
  if (!entry) return null
  const rows: LookupRow[] = [{ label: 'Needs level', value: String(entry.l) }]
  if (entry.a) rows.push({ label: 'Colour', value: COLOUR[entry.a] ?? entry.a })
  const sections: LookupCard['sections'] = [{ rows }]
  let sub: string
  if (base) {
    sections.push({ text: [`A transfigured ${base}. No quest or vendor gives it: use the Divine Font in the Labyrinth on ${base}, find one, or buy one.`] })
    sub = 'Transfigured gem'
  } else {
    const rewards = entry.s.filter(s => s[3] === 'q').sort((a, b) => a[0] - b[0])
    const vendors = entry.s.filter(s => s[3] === 'v').sort((a, b) => a[0] - b[0])
    if (rewards.length) sections.push({ label: 'Quest reward (free)', rows: rewards.map(s => ({ label: `Act ${s[0]} · ${s[1]}`, value: classList(s[4]) })) })
    if (vendors.length) sections.push({ label: 'Sold by', rows: vendors.map(s => ({ label: `Act ${s[0]} · ${s[2]}, after ${s[1]}`, value: classList(s[4]) })) })
    const vaalOf = name.startsWith('Vaal ') && table[name.slice(5)] ? name.slice(5) : null
    if (!rewards.length && !vendors.length) {
      sections.push({
        text: [vaalOf
          ? `No quest or vendor gives it: corrupt a ${vaalOf} with a Vaal Orb (it may turn into this), find one, or buy one.`
          : 'No quest or vendor gives it in the campaign: it drops, or comes from a league mechanic. Buy one.']
      })
    }
    const first = rewards[0] ?? vendors[0]
    sub = first ? `${first[3] === 'q' ? 'Reward' : `Sold by ${first[2]}`}, Act ${first[0]}` : 'Not in the campaign'
  }
  return {
    id: `gem:${name}`,
    group: 'Where to get gems',
    name: `Where to get ${name}`,
    title: name,
    sub,
    icon: 'fas fa-gem',
    tip: { name, type: 'SkillGem' },
    sections,
    actions: [{ label: 'poedb', url: `https://poedb.tw/us/${encodeURIComponent(name.replaceAll("'", '').replaceAll(' ', '_'))}` }]
  }
}

// `names`: every gem name to search, transfigured ones included.
export function gemLookup (table: GemTable | null, names: readonly string[]): Lookup {
  return (query) => {
    const q = query.trim()
    if (!table || q.length < 3) return []
    // Three letters only for a whole name: "arc".
    return names
      .map(name => ({ name, rank: q.length < 4 && name.toLowerCase() !== q.toLowerCase() ? -1 : matchRank(name, query) }))
      .filter(h => h.rank >= 0 && h.rank < 2)
      .sort((a, b) => a.rank - b.rank || a.name.length - b.name.length)
      .slice(0, 3)
      .map(h => gemCard(h.name, table))
      .filter((c): c is LookupCard => !!c)
  }
}
