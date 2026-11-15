// Your character's resistances and attributes, summed from the lines that give
// them: worn gear, socketed jewels, allocated passives (masteries included) and
// the auras you socket (Purity of Elements and the like, at their level). A
// careful sum of what the read holds, not PoB's calculation: pantheon, flasks,
// charges, other buffs and conditional lines are left out, and the page says so.
import { baseClass } from './gems'

export type Resist = 'Fire' | 'Cold' | 'Lightning' | 'Chaos'
export type Attribute = 'Strength' | 'Dexterity' | 'Intelligence'
export const RESISTS: Resist[] = ['Fire', 'Cold', 'Lightning', 'Chaos']
export const ATTRIBUTES: Attribute[] = ['Strength', 'Dexterity', 'Intelligence']

export interface Defences {
  res: Record<Resist, number>
  max: Record<Resist, number>
  attr: Record<Attribute, number>
}

// Each class's starting attributes.
const CLASS_ATTR: Record<string, [number, number, number]> = {
  Marauder: [32, 14, 14],
  Ranger: [14, 32, 14],
  Witch: [14, 14, 32],
  Duelist: [23, 23, 14],
  Templar: [23, 14, 23],
  Shadow: [14, 23, 23],
  Scion: [20, 20, 20]
}

// Kitava's two penalties (acts 5 and 10), on every resistance.
export const RES_PENALTY = -60
export const RES_CAP = 75

const N = '([+-]?\\d+(?:\\.\\d+)?)'
const RE_RES = new RegExp(`^(?:You and nearby allies gain )?${N}% to (all Elemental|all|Fire|Cold|Lightning|Chaos|Fire and Cold|Fire and Lightning|Cold and Lightning) Resistances?$`)
const RE_MAX = new RegExp(`^${N}% to (?:all )?maximum (all Elemental|Fire|Cold|Lightning|Chaos|Fire and Cold|Fire and Lightning|Cold and Lightning) Resistances?$`)
const RE_MAX_ALL = new RegExp(`^${N}% to all maximum (Elemental )?Resistances$`)
const RE_ATTR = new RegExp(`^${N} to (all Attributes|Strength|Dexterity|Intelligence|Strength and Dexterity|Strength and Intelligence|Dexterity and Intelligence)$`)
const RE_ATTR_INC = new RegExp(`^${N}% increased (Attributes|Strength|Dexterity|Intelligence)$`)

function resistsIn (what: string): Resist[] {
  if (what === 'all Elemental' || what === 'Elemental ') return ['Fire', 'Cold', 'Lightning']
  if (what === 'all') return ['Fire', 'Cold', 'Lightning', 'Chaos']
  return what.split(' and ').filter((x): x is Resist => (RESISTS as string[]).includes(x))
}

function attrsIn (what: string): Attribute[] {
  if (what === 'all Attributes' || what === 'Attributes') return [...ATTRIBUTES]
  return what.split(' and ').filter((x): x is Attribute => (ATTRIBUTES as string[]).includes(x))
}

// className: the class or ascendancy. lines: every line that may give a
// resistance or attribute, from all sources.
export function sumDefences (className: string, lines: string[]): Defences {
  const res: Record<Resist, number> = { Fire: RES_PENALTY, Cold: RES_PENALTY, Lightning: RES_PENALTY, Chaos: RES_PENALTY }
  const max: Record<Resist, number> = { Fire: RES_CAP, Cold: RES_CAP, Lightning: RES_CAP, Chaos: RES_CAP }
  const start = CLASS_ATTR[baseClass(className)] ?? [0, 0, 0]
  const flat: Record<Attribute, number> = { Strength: start[0], Dexterity: start[1], Intelligence: start[2] }
  const inc: Record<Attribute, number> = { Strength: 0, Dexterity: 0, Intelligence: 0 }
  for (const raw of lines) {
    for (const line of raw.split('\n')) {
      const text = line.trim()
      let m = RE_MAX_ALL.exec(text)
      if (m) { for (const r of m[2] ? ['Fire', 'Cold', 'Lightning'] as Resist[] : RESISTS) max[r] += Number(m[1]); continue }
      m = RE_MAX.exec(text)
      if (m) { for (const r of resistsIn(m[2])) max[r] += Number(m[1]); continue }
      m = RE_RES.exec(text)
      if (m) { for (const r of resistsIn(m[2])) res[r] += Number(m[1]); continue }
      m = RE_ATTR.exec(text)
      if (m) { for (const a of attrsIn(m[2])) flat[a] += Number(m[1]); continue }
      m = RE_ATTR_INC.exec(text)
      if (m) { for (const a of attrsIn(m[2])) inc[a] += Number(m[1]) }
    }
  }
  const attr = Object.fromEntries(ATTRIBUTES.map(a => [a, Math.floor(flat[a] * (1 + inc[a] / 100))])) as Record<Attribute, number>
  return { res, max, attr }
}
