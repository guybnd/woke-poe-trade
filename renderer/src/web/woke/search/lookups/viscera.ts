// 3.30 Wickerman module: Viscera by name, by the boss, zone or map that drops
// them, or by an effect word ("ignite", "minion damage"). The table loads when
// the palette opens, only while the module is on.
import { actLine, searchViscera } from '../../wickerman/viscera'
import type { Viscera, VisceraTable } from '../../wickerman/viscera'
import type { Lookup, LookupCard, LookupContext, LookupRow } from './types'

function visceraCard (v: Viscera, why: string | undefined, ctx: LookupContext): LookupCard {
  const price = ctx.price(v.name)
  const unsure = (u?: boolean) => u ? ' (not confirmed)' : ''
  const drops: LookupRow[] = [
    ...(v.act ? [{ label: `Act ${v.act.n}`, value: actLine(v)! + unsure(v.act.unsure) }] : []),
    ...v.maps.map(m => ({ label: m.kind === 'Map boss' ? 'Map' : m.kind, value: `${m.boss}, ${m.map}${unsure(m.unsure)}` }))
  ]
  const where = v.act ? `Act ${v.act.n}` : v.maps[0]?.kind ?? ''
  return {
    id: `viscera:${v.name}`,
    group: 'Viscera',
    name: v.name,
    sub: [v.slot, why ?? where].filter(Boolean).join(' · '),
    icon: 'fas fa-bone',
    sections: [
      { rows: [{ label: 'Slot', value: v.slot, ...(price != null ? { chaos: price } : {}) }] },
      { label: 'Versions', rows: v.tiers.map(t => ({ label: t.label, value: t.text.replace(/\n/g, ' · ') })) },
      ...(drops.length ? [{ label: 'Dropped by', rows: drops }] : [])
    ],
    actions: [
      { label: 'Copy name', copy: v.name }
    ]
  }
}

export function visceraLookup (table: VisceraTable | null): Lookup {
  return (query, ctx) => {
    if (!table) return []
    return searchViscera(table, query).map(h => visceraCard(h.v, h.why, ctx))
  }
}
