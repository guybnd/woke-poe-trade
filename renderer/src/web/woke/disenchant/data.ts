// Uniques that can be disenchanted, read fresh from the item data each time
// (it can be swapped for a newer download while the app runs). The base dust numbers
// come with the item data downloader, so a new league's uniques show up once
// the data has them.
import { ITEMS_ITERATOR, ITEM_BY_REF } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import type { DustUnique } from './calc'

// Kingsmarch won't take these, and the legacy names are priced as collector's items.
const NOT_DISENCHANTABLE = new Set([
  'Curio of Consumption', 'Curio of Absorption', 'Curio of Potential', 'Curio of Decay',
  "Deshret's Vise", 'Titucus Span', 'Hellbringer'
])
const PIECE_RE = /^(First|Second|Third|Fourth) Piece of /

// Mirrored or always corrupted, so quality can't be added.
const NO_QUALITY = new Set([
  "Kalandra's Touch", 'Skin of the Lords', 'String of Servitude', 'Blood of Corruption',
  "Night's Hold", "Ixchel's Temptation", 'Blightwell', "Rigwald's Curse", 'Star of Wraeclast',
  "Angler's Plait", 'The Utmost', 'Natural Hierarchy', 'Eyes of the Greatwolf',
  'Glimpse of Chaos', "Leadership's Price", "Malachai's Vision", 'Shadowstitch'
])

const JEWELLERY = new Set(['Amulet', 'Ring', 'Belt'])

// Bases of uniques with no dust number (new, or not disenchantable).
export function basesWithoutDust (): Set<string> {
  const out = new Set<string>()
  for (const u of ITEMS_ITERATOR('"unique":{"base"') as Generator<BaseType>) {
    if (u.namespace !== 'UNIQUE' || !u.unique || /^Replica /.test(u.refName)) continue
    const dust = u.unique.disenchantValue
    if (!(dust != null && dust > 0) || NOT_DISENCHANTABLE.has(u.refName) || PIECE_RE.test(u.refName)) out.add(u.unique.base)
  }
  return out
}

export function dustUniques (): DustUnique[] {
  const list: DustUnique[] = []
  for (const u of ITEMS_ITERATOR('"disenchantValue"') as Generator<BaseType>) {
    const dust = u.unique?.disenchantValue
    if (u.namespace !== 'UNIQUE' || !u.unique || !(dust != null && dust > 0)) continue
    if (NOT_DISENCHANTABLE.has(u.refName) || PIECE_RE.test(u.refName)) continue
    const base = ITEM_BY_REF('ITEM', u.unique.base)?.[0]
    const category = base?.craftable?.category
    list.push({
      name: u.refName,
      base: u.unique.base,
      dust,
      kind: category && JEWELLERY.has(category) ? 'jewellery' : 'gear',
      noQuality: category === 'Quiver' || NO_QUALITY.has(u.refName),
      slots: Math.max(1, (base?.w ?? 1) * (base?.h ?? 1))
    })
  }
  return list
}
