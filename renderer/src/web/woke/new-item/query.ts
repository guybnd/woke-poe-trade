// woke: an item the item data doesn't have yet, such as a new league's unique,
// searched by its name and base alone. Read from the copied text's first block,
// in English only: other languages name the lines differently.

import { ITEM_BY_REF } from '@/assets/data'
import { tradeUrl } from '../search/search'

export interface NewItemQuery {
  name?: string
  type: string
  // Uniques search as uniques; a rare's base searches without its name.
  rarity?: 'unique' | 'nonunique'
  // Currency and cards are priced on the bulk exchange once the item data
  // knows their trade tag; gems by level and quality. Others by mods.
  kind?: 'stack' | 'gem'
  // The trade site names a Foulborn unique and a Vestigial base without the
  // word, and finds them by a filter instead.
  foulborn?: true
  vestigial?: true
  // A new transfigured gem ("<Known Gem> of <Something>"): the trade site
  // finds it by its base gem plus a variant the item data doesn't know yet,
  // so there is nothing to search (Guy's pick: note only, no search).
  transfigured?: true
}

// A known gem's name, from the item data.
function isKnownGem (name: string): boolean {
  return Boolean(ITEM_BY_REF('GEM', name)?.length)
}

// "Ice Nova of Snowfall" when the data knows Ice Nova but not this name.
export function looksTransfigured (type: string, known: (name: string) => boolean = isKnownGem): boolean {
  if (known(type)) return false
  const at = type.lastIndexOf(' of ')
  if (at <= 0) return false
  return known(type.slice(0, at))
}

const FOULBORN = /^Foulborn /
const VESTIGIAL = /^Vestigial /

function unmark (q: NewItemQuery): NewItemQuery {
  if (q.name && FOULBORN.test(q.name)) q = { ...q, name: q.name.replace(FOULBORN, ''), foulborn: true }
  if (VESTIGIAL.test(q.type)) q = { ...q, type: q.type.replace(VESTIGIAL, ''), vestigial: true }
  return q
}

const SEPARATOR = '--------'
const CANNOT_USE = 'You cannot use this item. Its stats will be ignored'

export function newItemQuery (rawText: string, knownGem: (name: string) => boolean = isKnownGem): NewItemQuery | null {
  const sections = rawText.replace(/\r\n/g, '\n').split(SEPARATOR)
    .map(section => section.split('\n').map(line => line.trim()).filter(Boolean))
  let head = sections[0] ?? []
  // An item the character can't use has a line of its own here, and its name
  // and base in the next block.
  if (head.includes(CANNOT_USE)) head = [...head.filter(line => line !== CANNOT_USE), ...(sections[1] ?? [])]
  const rarityAt = head.findIndex(line => line.startsWith('Rarity: '))
  if (rarityAt === -1) return null
  const rarity = head[rarityAt].slice('Rarity: '.length)
  const lines = head.slice(rarityAt + 1)
  if (!lines.length || lines.length > 2) return null

  switch (rarity) {
    case 'Unique':
      return unmark(lines.length === 2
        ? { name: lines[0], type: lines[1], rarity: 'unique' }
        // Unidentified: only the base shows.
        : { type: lines[0], rarity: 'unique' })
    case 'Rare':
      return lines.length === 2 ? unmark({ type: lines[1], rarity: 'nonunique' }) : null
    case 'Currency':
    case 'Divination Card':
      return lines.length === 1 ? { type: lines[0], kind: 'stack' } : null
    case 'Gem': {
      if (lines.length !== 1) return null
      const type = lines[0].replace(/^Superior /, '')
      return looksTransfigured(type, knownGem) ? { type, kind: 'gem', transfigured: true } : { type, kind: 'gem' }
    }
    case 'Normal':
      // A magic item's name carries its affixes, so it can't be searched by name.
      return lines.length === 1 ? { type: lines[0].replace(/^Superior /, '') } : null
    default:
      return null
  }
}

// What the name-only search leaves out, and what the next data update brings.
export function newItemNote (q: NewItemQuery): string {
  if (q.transfigured) return 'New gem: no price until the next data update.'
  if (q.kind === 'stack') return 'New item. Searched single listings by name. Bulk exchange and poe.ninja prices come with the next item data update.'
  if (q.kind === 'gem') return 'New gem. Searched by name only. Level and quality filters come with the next item data update.'
  return 'New item. Searched by name only. Mod filters come with the next item data update.'
}

function queryFields (q: NewItemQuery) {
  const misc = {
    ...(q.foulborn ? { foulborn_item: { option: 'true' } } : {}),
    ...(q.vestigial ? { vestigial: { option: 'true' } } : {})
  }
  return {
    ...(q.name ? { name: q.name } : {}),
    type: q.type,
    filters: {
      ...(q.rarity ? { type_filters: { filters: { rarity: { option: q.rarity } } } } : {}),
      ...(Object.keys(misc).length ? { misc_filters: { filters: misc } } : {})
    }
  }
}

export function newItemTradeBody (q: NewItemQuery) {
  return {
    query: {
      status: { option: 'online' as const },
      ...queryFields(q),
      stats: [{ type: 'and' as const, filters: [] }]
    },
    sort: { price: 'asc' as const }
  }
}

export function newItemTradeUrl (league: string, q: NewItemQuery, host = 'www.pathofexile.com'): string {
  return tradeUrl(league, queryFields(q), host)
}
