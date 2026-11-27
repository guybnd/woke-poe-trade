// Maps on the Loot tab (Guy's picks, 2026-11-27: Maps A, normal maps under
// the slider Hidden). Normal maps are almost all worth under a chaos, so a
// price would hide every one: they show by tier instead, from the tier you
// pick. One Hide rule goes just above NeverSink's plain map tiers, so every
// special map NeverSink lists first (unique, blighted, blight-ravaged, Valdo,
// Originator, influenced, 8-mod, corrupted implicits...) still shows.
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import type { CurrencySettings } from './currency-settings'
import { CURRENCY_TYPE } from './currency-settings'

const PLAIN_TIER = /^maps_[a-z]_t\d+$/

export function applyMapFloor (doc: FilterDoc, cfg: Pick<CurrencySettings, 'on' | 'mapFrom'>): FilterBlock | null {
  if (!cfg.on || !(cfg.mapFrom > 1)) return null
  const anchor = doc.blocks.find(b => b.type === 'maps' && PLAIN_TIER.test(b.tier ?? ''))
  if (!anchor) return null
  const cond = (key: string, op: string, values: string[]): FilterCondition => ({ key, op, count: null, values } as FilterCondition)
  const b = {
    kind: 'block',
    index: -1,
    line: anchor.line,
    visibility: 'Hide',
    disabled: false,
    comment: `$type->${CURRENCY_TYPE} $tier->mapfloor woke: maps under tier ${cfg.mapFrom}`,
    type: CURRENCY_TYPE,
    tier: 'mapfloor',
    conditions: [cond('Class', '==', ['Maps']), cond('MapTier', '<', [String(cfg.mapFrom)])],
    actions: [{ key: 'SetFontSize', args: ['18'] }, { key: 'DisableDropSound', args: ['True'] }],
    continue: false,
    section: anchor.section,
    subsection: anchor.subsection,
    raw: [],
    dirty: true,
    added: true
  } as FilterBlock
  doc.chunks.splice(doc.chunks.indexOf(anchor), 0, b)
  doc.blocks.splice(doc.blocks.indexOf(anchor), 0, b)
  doc.blocks.forEach((x, i) => { x.index = i })
  return b
}
