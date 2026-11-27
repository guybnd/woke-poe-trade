// Gems on the Loot tab (Guy's picks, 2026-11-27: Gems A, G2 + G3, L3, build
// gems always). poe.ninja prices a gem by level, quality and corruption, and
// the filter can match all three, so each poe.ninja line is a band: "Arc
// 20/20" matches an Arc of level 20+ and quality 20+. Bands are folded by
// kind. Exceptional, Awakened and Transfigured gems are Always by default,
// and any gem at 20% quality shows at least Small (a Gemcutter's Prism at
// the vendor). Levelling (under area level 68) stays NeverSink's, and gems
// in your build show above all of this (build rules).
import type { LootCategory } from './fragment-classes'
import type { SectionMode } from './currency-settings'
import { isThin } from '../market/types'

export const GEM_CATEGORIES: LootCategory[] = [
  { id: 'gemexc', name: 'Exceptional', art: 'Enlighten Support' },
  { id: 'gemawk', name: 'Awakened', art: 'Awakened Multistrike Support' },
  { id: 'gemtrans', name: 'Transfigured', art: 'Ice Nova of Frostbolts' },
  { id: 'gemvaal', name: 'Vaal gems', art: 'Vaal Grace' },
  { id: 'gemsup', name: 'Supports', art: 'Multistrike Support' },
  { id: 'gemskill', name: 'Skill gems', art: 'Arc' }
]
export const GEM_IDS = new Set(GEM_CATEGORIES.map(x => x.id))

// The gem cyan, a shade per fold.
export const GEM_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  gemexc: { text: [60, 230, 230], color: 'Cyan', shape: 'Star' },
  gemawk: { text: [110, 210, 255], color: 'Cyan', shape: 'Diamond' },
  gemtrans: { text: [120, 240, 200], color: 'Cyan', shape: 'Hexagon' },
  // Not red: red beams and map icons are kept for Tink (Guy 2026-11-27).
  gemvaal: { text: [220, 90, 90], color: 'Pink', shape: 'Triangle' },
  gemsup: { text: [27, 200, 190], color: 'Cyan', shape: 'Triangle' },
  gemskill: { text: [27, 162, 155], color: 'Cyan', shape: 'Circle' }
}

export const GEM_MODES: Record<string, SectionMode> = { gemexc: 'always', gemawk: 'always', gemtrans: 'always' }

export interface GemLine { name: string, variant: string, chaos: number, thin: boolean }
export interface GemBand { level: number, quality: number, corrupted: boolean }

// "21/20c" -> level 21, quality 20, corrupted; "3" -> level 3.
export function gemBand (variant: string): GemBand | null {
  const m = /^(\d+)(?:\/(\d+))?(c?)$/.exec(variant.trim())
  if (!m) return null
  return { level: Number(m[1]), quality: Number(m[2] ?? 0), corrupted: m[3] === 'c' }
}

const EXCEPTIONAL = /^(Awakened )?(Enlighten|Empower|Enhance) Support$/
// `names`: every gem poe.ninja lists, to tell "Ice Nova of Frostbolts"
// (transfigured) from "Herald of Ice".
export function gemCategoryOf (name: string, names: ReadonlySet<string>): string {
  if (EXCEPTIONAL.test(name)) return 'gemexc'
  if (name.startsWith('Awakened ')) return 'gemawk'
  const of = name.indexOf(' of ')
  if (of > 0 && names.has(name.slice(0, of))) return 'gemtrans'
  if (name.startsWith('Vaal ')) return 'gemvaal'
  if (name.endsWith(' Support')) return 'gemsup'
  return 'gemskill'
}

// poe.ninja's gem lines from a price snapshot.
export function gemLinesOf (items: ReadonlyArray<{ type: string, name: string, variant: string, chaos: number, gaps?: number }>): GemLine[] {
  return items.filter(i => i.type === 'SkillGem').map(i => ({ name: i.name, variant: i.variant, chaos: i.chaos, thin: isThin(i) }))
}
