// Gear while levelling (milestone M5, Guy's picks 2026-11-28 on the
// levelling design page): links, movement speed boots, weapons by base,
// rares, jewellery, and a build template that picks weapon types and armour
// defences ("templates for class archetypes for basetype filterings").
//
// Every rule carries the levelling layer's area conditions (lvConds), so it
// goes quiet at area 68 by itself. The filter can't read DPS or an item's
// age, only its base's drop level, so "recent" means a base that starts
// dropping within a few levels of the area, written per band of area levels.
import type { FilterAction, FilterBlock, FilterCondition } from './parse'
import type { CStep, CurrencySettings } from './currency-settings'
import { CSTEP_NAMES } from './currency-settings'
import { archetypeClasses } from './presets'
import type { Presets } from './presets'
import { WEAPON_CLASSES } from './build-rules'
import { allGearBases, baseInfo } from './gear-bases'
import { lvConds } from './levelling'

export const LV_GEAR_TYPE = 'woke->levelling'

type Mode = Pick<CurrencySettings, 'catMode'>
const mode = (c: Mode) => c.catMode as Record<string, unknown>
const cond = (key: string, op: string, values: Array<string | number>): FilterCondition => ({ key, op, count: null, values: values.map(String) })
const a = (key: string, ...args: Array<string | number>): FilterAction => ({ key, args: args.map(String) })

// ---- the template ----

// Armour defences as bits: armour, evasion, energy shield.
export const DEF_AR = 1
export const DEF_EV = 2
export const DEF_ES = 4
export const DEF_ALL = 7
export const DEFENCE_CHIPS: ReadonlyArray<{ bit: number, label: string, short: string }> = [
  { bit: DEF_AR, label: 'Armour', short: 'AR' },
  { bit: DEF_EV, label: 'Evasion', short: 'EV' },
  { bit: DEF_ES, label: 'Energy shield', short: 'ES' }
]
// Each build type's defences (what its main attribute wears).
const ARCHETYPE_DEF: Record<string, number> = { caster: DEF_ES, melee: DEF_AR, bow: DEF_EV, minion: DEF_ES }

const defBits = (d: string | null): number => d == null ? 0 : d === 'All' ? DEF_ALL : (d.includes('AR') ? DEF_AR : 0) | (d.includes('EV') ? DEF_EV : 0) | (d.includes('ES') ? DEF_ES : 0)

// The defences the build's own armour wears (PoB), or null without any.
function buildDefences (rareBases: readonly string[]): number | null {
  let bits = 0
  for (const b of rareBases) bits |= defBits(baseInfo(b).defence)
  return bits || null
}

// The defences kept: your pick (`lvdef`), else the build type's, else every one.
export function lvDefences (c: Mode, weapons: Presets['weapons'], rareBases: readonly string[] = []): number {
  const own = mode(c).lvdef
  if (typeof own === 'number' && own >= 1 && own <= DEF_ALL) return own
  if (weapons.archetype === 'auto') return buildDefences(rareBases) ?? DEF_ALL
  return ARCHETYPE_DEF[weapons.archetype] ?? DEF_ALL
}
export function setLvDefences (c: Mode, bits: number) {
  c.catMode = { ...c.catMode, lvdef: Math.max(1, Math.min(DEF_ALL, bits)) as unknown as 'auto' }
}
// A new build type starts from its own defences.
export function clearLvDefences (c: Mode) {
  c.catMode = Object.fromEntries(Object.entries(mode(c)).filter(([k]) => k !== 'lvdef')) as CurrencySettings['catMode']
}

const ONE_HANDED = ['Claws', 'Daggers', 'Rune Daggers', 'One Hand Axes', 'One Hand Maces', 'One Hand Swords', 'Thrusting One Hand Swords', 'Sceptres', 'Wands']
export interface LvTemplate {
  // Weapon classes kept; null keeps every one (Auto with no PoB weapons).
  weapons: string[] | null
  defences: number
  shields: boolean
  quivers: boolean
}
export function lvTemplate (c: Mode, weapons: Presets['weapons'], build: { weaponClasses: string[], rareBases: string[] } | null): LvTemplate {
  const kept = archetypeClasses({ weapons } as Presets, build?.weaponClasses ?? null)
  const list = kept ?? WEAPON_CLASSES
  return {
    weapons: kept,
    defences: lvDefences(c, weapons, build?.rareBases ?? []),
    shields: list.some(w => ONE_HANDED.includes(w)),
    quivers: list.includes('Bows')
  }
}

// ---- looks ----

const RARITY_RGB: Record<string, [number, number, number]> = { Normal: [200, 200, 200], Magic: [136, 136, 255], Rare: [255, 255, 119] }
const BOOTS_RGB: [number, number, number] = [0, 255, 200]

// Gear keeps its rarity's text colour; the step sets size, edge and sound.
export function gearActions (step: CStep, rgb: readonly number[]): FilterAction[] {
  const t = [rgb[0], rgb[1], rgb[2], 255]
  const dim = [Math.round(rgb[0] * 0.45), Math.round(rgb[1] * 0.45), Math.round(rgb[2] * 0.45), 255]
  switch (step) {
    case 0: return []
    case 1: return [a('SetFontSize', 30), a('SetTextColor', ...t), a('SetBorderColor', ...dim), a('SetBackgroundColor', 0, 0, 0, 190)]
    case 2: return [a('SetFontSize', 35), a('SetTextColor', ...t), a('SetBorderColor', ...t), a('SetBackgroundColor', 20, 20, 20, 230)]
    case 3: return [a('SetFontSize', 40), a('SetTextColor', ...t), a('SetBorderColor', ...t), a('SetBackgroundColor', 40, 40, 40, 245), a('PlayAlertSound', 2, 200), a('MinimapIcon', 2, 'White', 'Hexagon')]
    default: return [a('SetFontSize', 44), a('SetTextColor', 0, 0, 0, 255), a('SetBorderColor', ...t), a('SetBackgroundColor', 255, 255, 255, 255), a('PlayAlertSound', 1, 300), a('PlayEffect', 'White', 'Temp'), a('MinimapIcon', 1, 'White', 'Hexagon')]
  }
}

function gearBlock (step: CStep, conds: FilterCondition[], note: string, rgb: readonly number[], actions?: FilterAction[]): FilterBlock {
  return {
    kind: 'block',
    index: -1,
    line: 1,
    visibility: step === 0 ? 'Hide' : 'Show',
    disabled: false,
    comment: `$type->${LV_GEAR_TYPE} $tier->s${step} woke: levelling, ${CSTEP_NAMES[step].toLowerCase()}: ${note}`,
    type: LV_GEAR_TYPE,
    tier: `s${step}`,
    conditions: conds,
    actions: actions ?? gearActions(step, rgb),
    continue: false,
    section: '[[0050]] Levelling (woke)',
    subsection: '',
    raw: [],
    dirty: true,
    added: true
  } as FilterBlock
}

// ---- the rules ----

// The last area level of each act (an act's own areas end there).
export const ACT_END = { 1: 13, 2: 23, 3: 33, 4: 40, 5: 45, 6: 55 } as const
// A white or blue weapon is new when its base starts dropping within this
// many levels of the area; a rare when within RARE_RECENT.
export const WEAPON_RECENT = 5
export const RARE_RECENT = 10
const BAND = 5
export const MS_EARLY = ["Runner's", "Sprinter's"]
export const MS_LATE = ["Stallion's", "Gazelle's", "Cheetah's", "Hellion's"]
const ARMOUR = ['Helmets', 'Body Armours', 'Gloves', 'Boots', 'Shields']
const JEWELLERY = ['Amulets', 'Rings', 'Belts']
export const LV_JEWELLERY_BASES = [
  'Ruby Ring', 'Sapphire Ring', 'Topaz Ring', 'Two-Stone Ring',
  'Leather Belt', 'Heavy Belt',
  'Amber Amulet', 'Jade Amulet', 'Lapis Amulet', 'Onyx Amulet'
]

// Area bands from `from` to `to`, BAND levels each: [lo, hi].
function bands (from: number, to: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let lo = from; lo <= to; lo += BAND) out.push([lo, Math.min(to, lo + BAND - 1)])
  return out
}

// Armour bases that wear none of the kept defences.
function offDefenceBases (bits: number): string[] {
  if ((bits & DEF_ALL) === DEF_ALL) return []
  return allGearBases().filter(n => {
    const i = baseInfo(n)
    if (!i.cls || !ARMOUR.includes(i.cls)) return false
    if (i.defence == null) return false
    return (defBits(i.defence) & bits) === 0
  })
}

// Rules for gear below maps, highest first; empty when the layer is off.
export function levellingGearBlocks (cfg: CurrencySettings, weapons: Presets['weapons'], build: { weaponClasses: string[], rareBases: string[] } | null): FilterBlock[] {
  const lv = lvConds(cfg)
  if (!lv) return []
  const until = (to: number) => lvConds(cfg, to)
  // From area `lo` to `hi`, inside the layer's own area.
  const from = (lo: number, hi = 67): FilterCondition[] | null => {
    const c = until(hi)
    if (!c) return null
    const ge = c.find(x => x.key === 'AreaLevel' && x.op === '>=')
    const start = Math.max(lo, ge ? Number(ge.values[0]) : 1)
    if (start > hi) return null
    const rest = c.filter(x => x !== ge)
    return start > 1 ? [cond('AreaLevel', '>=', [start]), ...rest] : rest
  }
  const t = lvTemplate(cfg, weapons, build)
  const out: FilterBlock[] = []
  const push = (conds: FilterCondition[] | null, step: CStep, note: string, rgb: readonly number[], actions?: FilterAction[]) => {
    if (conds) out.push(gearBlock(step, conds, note, rgb, actions))
  }
  const byRarity = (conds: FilterCondition[] | null, rarities: string[], step: CStep, note: string, extra: FilterCondition[]) => {
    for (const r of rarities) push(conds && [...conds, cond('Rarity', '', [r]), ...extra], step, note, RARITY_RGB[r])
  }
  const gear = ['Normal', 'Magic', 'Rare']
  const plain = ['Normal', 'Magic']

  // Links: 5- and 6-links always, 4-links until maps, 3-links until Act 3.
  // Your build's colours are louder on the Build tab.
  byRarity(lv, gear, 4, '5-links and 6-links', [cond('LinkedSockets', '>=', [5])])
  // Movement speed boots (pick A): 10 to 15% until Act 5, 20%+ until maps.
  const boots = (to: number, mods: string[], note: string) => {
    const c = until(to)
    for (const r of ['Magic', 'Rare']) {
      push(c && [...c, cond('Rarity', '', [r]), cond('Class', '==', ['Boots']), cond('HasExplicitMod', '', mods)], 3, note, BOOTS_RGB,
        [...gearActions(3, RARITY_RGB[r]).filter(x => x.key !== 'SetBorderColor' && x.key !== 'MinimapIcon'), a('SetBorderColor', ...BOOTS_RGB, 255), a('PlayEffect', 'Cyan', 'Temp'), a('MinimapIcon', 1, 'Cyan', 'Hexagon')])
    }
  }
  boots(ACT_END[5], MS_EARLY, 'boots with 10 to 15% movement speed')
  boots(67, MS_LATE, 'boots with 20% movement speed or more')
  byRarity(lv, gear, 3, '4-links', [cond('LinkedSockets', '>=', [4])])
  byRarity(until(ACT_END[3]), gear, 2, '3-links', [cond('LinkedSockets', '>=', [3])])
  // R-G-B for a Chromatic Orb at the vendor, small items only, until Act 3;
  // later the Loot tab's Recipes decide.
  for (const size of [[cond('Width', '<=', [2]), cond('Height', '<=', [2])], [cond('Width', '<=', [1]), cond('Height', '<=', [3])]]) {
    byRarity(until(ACT_END[3]), plain, 1, 'small R-G-B items for a Chromatic Orb', [cond('SocketGroup', '', ['RGB']), ...size])
  }

  const weaponsOf = t.weapons
  const others = weaponsOf ? WEAPON_CLASSES.filter(w => !weaponsOf.includes(w)) : []
  const mine = weaponsOf ?? WEAPON_CLASSES
  const offHands = [...(t.shields ? [] : ['Shields']), ...(t.quivers ? [] : ['Quivers'])]
  const offBases = offDefenceBases(t.defences)

  // Rares: jewellery and boots always, other gear of your template.
  push(lv && [...lv, cond('Rarity', '', ['Rare']), cond('Class', '==', [...JEWELLERY, 'Boots', ...(t.quivers ? ['Quivers'] : [])])], 2, 'rare boots and jewellery', RARITY_RGB.Rare)
  // Other builds' weapons and off-hands, dimmed.
  const notMine = [...others, ...offHands]
  if (notMine.length) push(lv && [...lv, cond('Rarity', '', ['Rare']), cond('Class', '==', notMine)], 1, 'rares for other builds', RARITY_RGB.Rare)
  // Armour in other defences, dimmed after Act 3.
  if (offBases.length) push(from(ACT_END[3] + 1) && [...from(ACT_END[3] + 1)!, cond('Rarity', '', ['Rare']), cond('BaseType', '==', offBases)], 1, 'rare armour in other defences', RARITY_RGB.Rare)
  const rareGear = [...ARMOUR.filter(c => c !== 'Boots' && !offHands.includes(c)), ...mine]
  const big = [cond('Width', '>=', [2]), cond('Height', '>=', [3])]
  // Big rares (2x3 and up) one step quieter than small ones.
  push(lv && [...lv, cond('Rarity', '', ['Rare']), cond('Class', '==', rareGear), ...big], 1, 'big rares', RARITY_RGB.Rare)
  push(until(ACT_END[3]) && [...until(ACT_END[3])!, cond('Rarity', '', ['Rare']), cond('Class', '==', rareGear)], 2, 'every rare until Act 3', RARITY_RGB.Rare)
  for (const [lo, hi] of bands(ACT_END[3] + 1, 67)) {
    const c = from(lo, hi)
    push(c && [...c, cond('Rarity', '', ['Rare']), cond('Class', '==', rareGear), cond('DropLevel', '>=', [lo - RARE_RECENT])], 2, `rares on a recent base (area ${lo} to ${hi})`, RARITY_RGB.Rare)
  }
  push(lv && [...lv, cond('Rarity', '', ['Rare']), cond('Class', '==', rareGear)], 1, 'rares on an older base', RARITY_RGB.Rare)

  // White and blue weapons of your type on a new base; other types hidden.
  for (const [lo, hi] of bands(1, 67)) {
    const c = from(lo, hi)
    byRarity(c, plain, 2, `your weapons on a new base (area ${lo} to ${hi})`, [cond('Class', '==', mine), cond('DropLevel', '>=', [Math.max(1, lo - WEAPON_RECENT)])])
  }
  if (notMine.length) push(lv && [...lv, cond('Rarity', '', plain), cond('Class', '==', notMine)], 0, 'white and blue gear for other builds', RARITY_RGB.Normal)
  if (offBases.length) push(from(ACT_END[1] + 1) && [...from(ACT_END[1] + 1)!, cond('Rarity', '', plain), cond('BaseType', '==', offBases)], 0, 'white and blue armour in other defences', RARITY_RGB.Normal)

  // Jewellery (pick A): every white and blue piece until Act 2, the useful
  // bases until Act 6.
  byRarity(until(ACT_END[2]), plain, 2, 'jewellery until Act 2', [cond('Class', '==', JEWELLERY)])
  byRarity(until(ACT_END[6]), plain, 2, 'useful jewellery bases until Act 6', [cond('Class', '==', JEWELLERY), cond('BaseType', '==', LV_JEWELLERY_BASES)])
  return out
}
