// Text that names an item, as trade whispers and the trade site write it, turned
// into what the item tooltip needs. English only: both come from the trade site.
import { ITEM_BY_REF } from '@/assets/data'
import type { BaseType } from '@/assets/data/interfaces'
import type { ItemTipRef } from './item-tip'

type Lookup = (ns: BaseType['namespace'], name: string) => readonly BaseType[] | undefined

const has = (found: readonly BaseType[] | undefined) => !!found?.length

export function itemRefFromText (text: string, lookup: Lookup = ITEM_BY_REF): ItemTipRef | null {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return null

  // "level 21 20% Empower Support", or without the quality.
  const gem = /^level (\d+)(?: (\d+)%)? (.+)$/i.exec(clean)
  if (gem && has(lookup('GEM', gem[3]))) {
    return { name: gem[3], type: 'SkillGem', variant: gem[2] ? `${gem[1]}/${gem[2]}` : gem[1] }
  }

  // The whole text is the name: a gem, card, currency or plain base.
  const uniqueOf = (name: string) => lookup('UNIQUE', name.replace(/^Foulborn /, ''))
  if (has(uniqueOf(clean)) || has(lookup('GEM', clean)) || has(lookup('DIVINATION_CARD', clean)) || has(lookup('ITEM', clean))) {
    return { name: clean }
  }

  // Whispers put a comma after the name: "Windscream, Reinforced Greaves".
  const words = clean.replace(/, /g, ' ').split(' ')
  // "Dying Sun Ruby Flask": a unique's name, then its own base.
  for (let n = words.length - 1; n >= 1; n--) {
    const base = words.slice(n).join(' ')
    const name = words.slice(0, n).join(' ')
    if (uniqueOf(name)?.some(u => u.unique?.base === base)) return { name }
  }
  // "Doom Fang Titan Greaves": a rare, where only the base can be known.
  for (let n = 1; n < words.length; n++) {
    const base = words.slice(n).join(' ')
    if (has(lookup('ITEM', base))) return { name: base }
  }
  return null
}
