// Maps on the Loot tab (Guy's picks, 2026-11-27: Maps A, normal maps under
// the slider Hidden). Normal maps are almost all worth under a chaos, so a
// price would hide every one: they show by tier instead, from the tier you
// pick. One Hide rule goes just above NeverSink's plain map tiers, so every
// special map NeverSink lists first (unique, blighted, blight-ravaged, Valdo,
// Originator, influenced, 8-mod, corrupted implicits...) still shows.
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import type { CurrencySettings } from './currency-settings'
import { CURRENCY_TYPE } from './currency-settings'
import { OWN_REST_TYPE } from './own-base'
import { applyStyle, readStyle } from './edits'
import type { StylePatch } from './edits'

const PLAIN_TIER = /^maps_[a-z]_t\d+$/

export function applyMapFloor (doc: FilterDoc, cfg: Pick<CurrencySettings, 'on' | 'mapFrom'>): FilterBlock | null {
  if (!cfg.on || !(cfg.mapFrom > 1)) return null
  // On our own skeleton: above its plain map rules.
  const anchor = doc.blocks.find(b => b.type === 'maps' && PLAIN_TIER.test(b.tier ?? '')) ?? doc.blocks.find(b => b.type === OWN_REST_TYPE && /^maps\d+$/.test(b.tier ?? ''))
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

// Normal maps' look (Guy's B, 2026-11-28): the black on white map players
// know, darker for lower tiers, and a white square icon (NeverSink's red one
// read as Tink). T16's edge is grey, not gold: a coloured card or edge means
// a special map (Guy 2026-11-28). Only NeverSink's plain tier rules; size, sound and beam stay
// its own, and your restyles still go on top.
export const MAP_BANDS: Array<{ from: number, style: StylePatch }> = [
  { from: 16, style: { text: [0, 0, 0, 255], border: [150, 150, 150, 255], background: [255, 255, 255, 255] } },
  { from: 11, style: { text: [0, 0, 0, 255], border: [150, 150, 150, 255], background: [235, 235, 235, 255] } },
  { from: 6, style: { text: [0, 0, 0, 255], border: [120, 120, 120, 255], background: [190, 190, 190, 255] } },
  { from: 1, style: { text: [180, 180, 180, 255], border: [70, 70, 70, 255], background: [0, 0, 0, 200] } }
]

export function applyMapLooks (doc: FilterDoc, cfg: Pick<CurrencySettings, 'on'>): number {
  if (!cfg.on) return 0
  let n = 0
  for (const b of doc.blocks) {
    const m = b.type === 'maps' && b.visibility === 'Show' ? /^maps_[a-z]_t(\d+)$/.exec(b.tier ?? '') : null
    if (!m) continue
    const band = MAP_BANDS.find(x => Number(m[1]) >= x.from)!
    const icon = readStyle(b.actions).icon
    applyStyle(b, { ...band.style, ...(icon ? { icon: { ...icon, color: 'White', shape: 'Square' } } : {}) })
    b.dirty = true
    n++
  }
  return n
}
