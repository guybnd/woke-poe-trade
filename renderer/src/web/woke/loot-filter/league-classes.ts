// League items on the Loot tab (Guy's League A, 2026-11-27): one class, a
// section per mechanic. poe.ninja prices almost none of these (contracts,
// blueprints, logbooks, tomes), so a section is on (NeverSink's rules) or
// Off: a mechanic you don't run goes away in maps in one click.
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import type { CurrencySettings } from './currency-settings'
import { CURRENCY_TYPE } from './currency-settings'

const cond = (key: string, op: string, values: string[]): FilterCondition => ({ key, op, count: null, values } as FilterCondition)

export interface LeagueSection { id: string, name: string, conds: FilterCondition[] }
export const LEAGUE_SECTIONS: LeagueSection[] = [
  { id: 'lgheist', name: 'Heist contracts and blueprints', conds: [cond('Class', '==', ['Contracts', 'Blueprints'])] },
  { id: 'lgexped', name: 'Expedition logbooks', conds: [cond('BaseType', '==', ['Expedition Logbook'])] },
  { id: 'lgsanctum', name: 'Sanctum research', conds: [cond('Class', '==', ['Sanctum Research'])] },
  { id: 'lgkeys', name: 'Reliquary keys', conds: [cond('Class', '==', ['Vault Keys'])] },
  { id: 'lgcharts', name: 'Charts', conds: [cond('Class', '==', ['Chart'])] },
  { id: 'lgviscera', name: 'Viscera', conds: [cond('Class', '==', ['Viscera'])] },
  { id: 'lgchron', name: 'Chronicles of Atzoatl', conds: [cond('BaseType', '==', ['Chronicle of Atzoatl'])] },
  { id: 'lgult', name: 'Inscribed Ultimatums', conds: [cond('BaseType', '==', ['Inscribed Ultimatum'])] },
  { id: 'lgmerc', name: 'Mercenary warrants', conds: [cond('BaseType', '==', ['Mercenary Warrant'])] }
]

// A Hide rule at the top for each section set Off, in maps only.
export function applyLeagueOff (doc: FilterDoc, cfg: Pick<CurrencySettings, 'on' | 'catMode'>): FilterBlock[] {
  if (!cfg.on) return []
  const out = LEAGUE_SECTIONS.filter(s => cfg.catMode[s.id] === 'off').map(s => ({
    kind: 'block',
    index: -1,
    line: 1,
    visibility: 'Hide',
    disabled: false,
    comment: `$type->${CURRENCY_TYPE} $tier->${s.id} woke: league items off: ${s.name}`,
    type: CURRENCY_TYPE,
    tier: s.id,
    conditions: [cond('AreaLevel', '>=', ['68']), ...s.conds.map(x => ({ ...x, values: [...x.values] }))],
    actions: [{ key: 'SetFontSize', args: ['18'] }, { key: 'DisableDropSound', args: ['True'] }],
    continue: false,
    section: '[[0051]] Currency weights (woke)',
    subsection: '',
    raw: [],
    dirty: true,
    added: true
  }) as FilterBlock)
  if (!out.length) return out
  const first = doc.chunks.findIndex(ch => ch.kind === 'block')
  const at = first < 0 ? doc.chunks.length : first
  const line = doc.blocks[0]?.line ?? 1
  out.forEach(b => { b.line = line })
  doc.chunks.splice(at, 0, ...out)
  doc.blocks.unshift(...out)
  doc.blocks.forEach((b, i) => { b.index = i })
  return out
}
