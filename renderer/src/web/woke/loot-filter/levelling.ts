// Levelling (milestone M5 of retiring NeverSink; Guy's picks, 2026-11-28,
// page /mnt/project-files/levelling-filter/design.html).
//
// Gate (pick A): the Loot tab's rules apply everywhere by default, not only
// at area level 68+. The hideout is always area level 60 (Guy's Client.txt),
// so before this it fell through to NeverSink's levelling looks. Below maps a
// levelling layer then keeps what a leveller needs visible even when the
// price line would hide it (floors): supplies (pick B, with a per-item
// switch), uniques at least Normal (pick A), gems at Normal early (pick A).
//
// Settings live in the Loot tab's catMode (numbers and `lv:` keys), so the
// settings that load at startup don't grow (startup JS is at its budget).
import type { FilterCondition } from './parse'
import type { CStep, CurrencySettings } from './currency-settings'

// The last area level below maps (T1 is 68).
export const LV_LAST = 67
// The hideout's area level, whatever the character's level.
export const HIDEOUT_LEVEL = 60

// Where the Loot tab's rules apply: 0 maps only (68+), 1 from the hideout
// (60+: also the Act 8 town and the Harbour Bridge), 2 everywhere (default).
export type LvGate = 0 | 1 | 2
export const LV_GATES: ReadonlyArray<{ value: LvGate, label: string, note: string }> = [
  { value: 2, label: 'Everywhere', note: 'From Act 1 to the endgame, the hideout too.' },
  { value: 1, label: 'From the hideout', note: 'Area level 60 and up: the hideout, the Act 8 town and the Harbour Bridge, then maps.' },
  { value: 0, label: 'Maps only', note: 'Area level 68 and up. Below that, and in the hideout, NeverSink decides.' }
]

type Mode = Pick<CurrencySettings, 'catMode'>
const mode = (c: Mode) => c.catMode as Record<string, unknown>
const cond = (key: string, op: string, values: Array<string | number>): FilterCondition => ({ key, op, count: null, values: values.map(String) })

export function lvGate (c: Mode): LvGate {
  const v = mode(c).lvgate
  return v === 0 || v === 1 || v === 2 ? v : 2
}
export function setLvGate (c: Mode, g: LvGate) {
  c.catMode = { ...c.catMode, lvgate: g as unknown as 'auto' }
}
// The levelling layer (pick "switch" A: one filter, a switch for anyone who
// wants a smaller file). On unless turned off.
export function lvOn (c: Mode): boolean {
  return mode(c).lvon !== 0
}
export function setLvOn (c: Mode, on: boolean) {
  c.catMode = { ...c.catMode, lvon: (on ? 1 : 0) as unknown as 'auto' }
}

// The area condition every Loot tab rule carries.
export function gateConds (c: Mode): FilterCondition[] {
  const g = lvGate(c)
  return g === 0 ? [cond('AreaLevel', '>=', [68])] : g === 1 ? [cond('AreaLevel', '>=', [HIDEOUT_LEVEL])] : []
}

// Where a levelling floor applies: below maps, where the Loot rules apply,
// up to area level `to`. Null when that's nowhere (maps only, the layer off,
// or `to` under the hideout with the gate at the hideout).
export function lvConds (c: Mode, to = LV_LAST): FilterCondition[] | null {
  const g = lvGate(c)
  if (g === 0 || !lvOn(c)) return null
  if (g === 1 && to < HIDEOUT_LEVEL) return null
  return [...(g === 1 ? [cond('AreaLevel', '>=', [HIDEOUT_LEVEL])] : []), cond('AreaLevel', '<=', [to])]
}

// Currency a leveller needs whatever it's worth (pick B). `stack`: from this
// many in a pile, one step louder.
export interface LvCurrency { name: string, step: CStep, stack?: number }
export const LV_CURRENCY: readonly LvCurrency[] = [
  { name: 'Scroll of Wisdom', step: 2 },
  { name: 'Portal Scroll', step: 2 },
  { name: 'Orb of Transmutation', step: 2, stack: 3 },
  { name: 'Orb of Augmentation', step: 2, stack: 3 },
  { name: 'Orb of Alteration', step: 2, stack: 3 },
  { name: 'Orb of Chance', step: 2, stack: 3 },
  { name: 'Orb of Alchemy', step: 2, stack: 3 },
  { name: 'Chromatic Orb', step: 2, stack: 3 },
  { name: "Jeweller's Orb", step: 2, stack: 3 },
  { name: 'Orb of Fusing', step: 2, stack: 3 },
  { name: "Armourer's Scrap", step: 2, stack: 5 },
  { name: "Blacksmith's Whetstone", step: 2, stack: 5 },
  { name: "Glassblower's Bauble", step: 2 },
  { name: "Gemcutter's Prism", step: 2 }
]
// The four lowest essence tiers, by name.
export const LV_ESSENCE = /^(Whispering|Muttering|Weeping|Wailing) Essence of /
const BY_NAME = new Map(LV_CURRENCY.map(x => [x.name, x]))

// An item's own switch (Alt+F and the Levelling page): `lv:<name>` 1 adds
// it at Normal, 0 takes it off; unset follows the list.
export function lvCurrencyOf (c: Mode, name: string): LvCurrency | null {
  const own = mode(c)[`lv:${name}`]
  if (own === 0) return null
  const listed = BY_NAME.get(name) ?? (LV_ESSENCE.test(name) && lvEssences(c) ? { name, step: 2 as CStep } : null)
  if (listed) return listed
  return own === 1 ? { name, step: 2 } : null
}
// The low essences as one switch (`lvess` 0 turns them off).
export function lvEssences (c: Mode): boolean {
  return mode(c).lvess !== 0
}
export function setLvEssences (c: Mode, on: boolean) {
  const next = { ...mode(c) }
  if (on) delete next.lvess
  else next.lvess = 0
  c.catMode = next as CurrencySettings['catMode']
}
export function isLvDefault (name: string): boolean {
  return BY_NAME.has(name) || LV_ESSENCE.test(name)
}
export function setLvCurrency (c: Mode, name: string, on: boolean) {
  const key = `lv:${name}`
  const next = Object.fromEntries(Object.entries(mode(c)).filter(([k]) => k !== key))
  if (on !== isLvDefault(name)) next[key] = on ? 1 : 0
  c.catMode = next as CurrencySettings['catMode']
}
// Items added by hand that the list doesn't name.
export function lvAdded (c: Mode): string[] {
  return Object.entries(mode(c)).filter(([k, v]) => k.startsWith('lv:') && v === 1).map(([k]) => k.slice(3)).sort()
}

// Gems (pick A): every gem at least Normal before Act 4 (the town vendors
// sell most gems from then on), and gems with quality at least Small until
// maps. Your build's gems are the Build tab's, louder, on top.
export const LV_GEMS_UNTIL = 33
// Uniques (pick A): at least Normal below maps; prices make them louder.
export const LV_UNIQUE_STEP: CStep = 2
