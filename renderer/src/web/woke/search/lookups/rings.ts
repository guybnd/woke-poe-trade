// Blight ring anoints in the search palette: the tower enchants two oils give
// a ring, with those oils and their prices. From the game's anoint recipes in
// the app's stat data.
import { matchRank } from '../search'
import { anointSection } from './tree'
import type { Lookup, LookupCard, LookupContext } from './types'

export interface RingAnoint {
  // As the game writes it, with its number.
  text: string
  // The two oils, lowest tier first.
  oils: string[]
  // What a query matches: the text, the English line (so English words work
  // on any language's data) and "tower", which "Glacial Cage" lacks.
  match: string
}

interface AnointStat {
  ref: string
  matchers: Array<{ string: string, negate?: true, value?: number }>
  anointments?: Array<{ roll: number, oils: string }>
}

// The enchant's text at a roll: a fixed-value line when the stat has one for
// it ("an additional Meteor"), the negated line for a negative roll ("25%
// reduced Impact Delay"), else the first line with the number in.
export function anointText (stat: AnointStat, roll: number): string {
  const fixed = stat.matchers.find(m => m.value === roll && !m.negate)
  if (fixed) return fixed.string
  const line = (roll < 0 ? stat.matchers.find(m => m.negate) : undefined) ?? stat.matchers[0]
  const n = roll < 0 && line.negate ? -roll : roll
  return line.string.replace('#', String(n)).replace(/ {2,}/g, ' ')
}

// Ring anoints from the stat data. Amulet anoints ("Allocates <notable>") take
// three oils, ring anoints two.
export function ringAnoints (stats: Iterable<AnointStat>, oilNames: (encoded: string) => string[]): RingAnoint[] {
  const out: RingAnoint[] = []
  for (const stat of stats) {
    for (const a of stat.anointments ?? []) {
      const oils = oilNames(a.oils)
      if (oils.length !== 2 || !oils.every(Boolean)) continue
      const text = anointText(stat, a.roll)
      out.push({ text, oils, match: `${text} ${stat.ref.replace('#', '')} towers` })
    }
  }
  return out
}

// Words that say you want a ring anoint, dropped before matching the enchant.
// "ring" alone doesn't ask ("ring life" is an item hunt), but goes with one.
const ASK = /^(?:blight(?:ed)?|anoints?|anointments?|anointed)$/
const FILLER = /^(?:rings?|enchants?|enchantments?|oils?)$/
const TOWER = /^towers?$/

function ringCard (r: RingAnoint, ctx: LookupContext): LookupCard {
  return {
    id: `ring-anoint:${r.oils.join('+')}:${r.text}`,
    group: 'Ring anoints',
    name: r.text,
    sub: `Blight ring anoint · ${r.oils.map(o => o.replace(/ Oil$/, '')).join(' + ')}`,
    icon: 'fas fa-ring',
    sections: [
      { label: 'Ring anoint', text: [r.text, 'Cassia anoints a ring with two oils. Works on your Blight towers.'] },
      anointSection(r.oils, ctx)
    ],
    actions: [{ label: 'poedb', url: 'https://poedb.tw/us/Anoint#AnointRings' }]
  }
}

// Shows up when the query names a tower ("arc tower range") or asks for a
// ring anoint ("ring anoint glacial cage"), so a plain "fireball" stays a gem.
export function ringAnointLookup (anoints: readonly RingAnoint[] | null): Lookup {
  return (query, ctx) => {
    if (!anoints?.length) return []
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.some(w => ASK.test(w) || TOWER.test(w))) return []
    const rest = words.filter(w => !ASK.test(w) && !FILLER.test(w))
    // Needs more than the asking words: a bare "tower" is Tower Map.
    if (rest.filter(w => !TOWER.test(w)).join(' ').length < 3) return []
    return anoints
      .map(r => ({ r, rank: matchRank(r.match, rest.join(' ')) }))
      .filter(h => h.rank >= 0 && h.rank < 2)
      .sort((a, b) => a.rank - b.rank || a.r.text.length - b.r.text.length)
      // A tower has up to six.
      .slice(0, 6)
      .map(h => ringCard(h.r, ctx))
  }
}
