// An essence's tooltip: the mod it forces on each slot (Guy's pick I6 in the
// tooltip audit, 2026-11-25), from tips/essences.json (scripts/
// build-essence-data.mjs, Path of Building's data). Pure.
import type { TipLine, TipPart } from './tip-content'

const part = (text: string, tone: TipPart['tone']): TipPart => ({ text, tone })

const ONE_HAND = ['Claw', 'Dagger', 'One Handed Axe', 'One Handed Mace', 'One Handed Sword', 'Sceptre', 'Thrusting One Handed Sword', 'Wand']
const TWO_HAND = ['Bow', 'Staff', 'Two Handed Axe', 'Two Handed Mace', 'Two Handed Sword']
const ARMOUR = ['Body Armour', 'Boots', 'Gloves', 'Helmet', 'Shield']
const JEWELLERY = ['Amulet', 'Ring', 'Belt']

// ["Bow", "Claw", ...all weapons] -> "Weapons"; the rest by name.
export function slotLabel (slots: string[]): string {
  const left = new Set(slots)
  const words: string[] = []
  const take = (group: string[], word: string) => {
    if (group.every(s => left.has(s))) { group.forEach(s => left.delete(s)); words.push(word) }
  }
  take([...ONE_HAND, ...TWO_HAND], 'Weapons')
  take(ONE_HAND, 'One-hand weapons')
  take(TWO_HAND, 'Two-hand weapons')
  take(ARMOUR, 'Armour')
  take(JEWELLERY, 'Jewellery')
  const rest = [...left].map(s => s.replace(' Handed', '-handed').replace('Thrusting One-handed Sword', 'Rapier'))
  return [...words, ...rest].join(', ')
}

export function essenceSections (groups: Array<[string[], string[]]> | undefined): TipLine[][] {
  if (!groups?.length) return []
  return [[
    [part('Forces one of these, by slot:', 'label')],
    ...groups.map(([slots, lines]): TipLine => [part(`${slotLabel(slots)}: `, 'label'), part(lines.join(', '), 'mod')])
  ]]
}
