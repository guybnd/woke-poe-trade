// "vaal <gem>" in the search: what a Vaal Orb on a 20/20 of that gem gives on
// average, the same numbers as the Vaal chip on a gem's price check.
import { matchRank } from '../search'
import { listVersions } from '../../gem-versions/versions'
import { vaalEv } from '../../gem-versions/vaal-ev'
import type { Lookup, LookupCard, LookupContext } from './types'

const QUERY = /^(?:vaal(?:ing)?|corrupt)\s+(.{3,})$/i
const SKIP = /^(it|orb|orbs|gem|gems)$/i

function signed (n: number): string {
  return `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n))} c`
}

export function vaalGemCard (name: string, ctx: LookupContext): LookupCard | null {
  const rows = ctx.items.filter(i => i.type === 'SkillGem')
  const base = rows.filter(i => i.name === name)
  const vaalRows = rows.filter(i => i.name === `Vaal ${name}`)
  const versions = listVersions(base, vaalRows, { vaal: false, level: 0, quality: 0, corrupted: false })
  const r = vaalEv(versions, ctx.price('Vaal Orb'), vaalRows.length > 0)
  if (!r) return null
  return {
    id: `vaal-gem:${name}`,
    group: 'Vaal it?',
    name: `${name} 20/20: Vaal it?`,
    title: `${name} 20/20: Vaal it?`,
    sub: `${signed(r.profit)}${r.unpriced ? '?' : ''} on average · ${Math.round(r.gain * 100)}% gain, ${Math.round(r.lose * 100)}% lose`,
    icon: 'fas fa-dice',
    tip: { name, type: 'SkillGem' },
    sections: [
      {
        rows: [
          { label: 'Clean 20/20 sells for', chaos: r.now },
          { label: 'Average after a Vaal Orb', chaos: r.ev },
          { label: 'Expected profit', value: signed(r.profit) }
        ]
      },
      {
        label: 'Outcomes',
        table: {
          head: ['Outcome', 'Chance', 'Price'],
          priceAt: 2,
          rows: r.outcomes.map(o => ({
            cells: [{ text: o.label, sub: o.est }, `${+(o.chance * 100).toFixed(1)}%`],
            chaos: o.chaos
          }))
        }
      },
      ...(r.unpriced ? [{ text: [`${Math.round(r.unpriced * 100)}% of outcomes have no poe.ninja price and count as 0.`] }] : []),
      { text: ['Community odds, 25% each: no change, Vaal form, level ±1, quality ±1 to 10 (max 23). poe.ninja prices.'] }
    ],
    actions: [{ label: 'Copy name', copy: name }]
  }
}

export const vaalGemLookup: Lookup = (query, ctx) => {
  const m = QUERY.exec(query.trim())
  if (!m || SKIP.test(m[1].trim())) return []
  const q = m[1].trim()
  const names = new Set<string>()
  for (const i of ctx.items) {
    if (i.type === 'SkillGem' && !i.name.startsWith('Vaal ') && /^20\/20$/.test(i.variant)) names.add(i.name)
  }
  const hits = [...names]
    .map(name => ({ name, rank: matchRank(name, q) }))
    .filter(h => h.rank >= 0 && h.rank < 2)
  // "vaal arc": Arc itself, not Arcane Cloak too.
  const best = hits.some(h => h.rank === 0) ? hits.filter(h => h.rank === 0) : hits
  return best
    .sort((a, b) => a.rank - b.rank || a.name.length - b.name.length)
    .slice(0, 3)
    .map(h => vaalGemCard(h.name, ctx))
    .filter((c): c is LookupCard => c != null)
}
