// woke: an item the item data doesn't have yet, such as a new league's unique,
// searched by its name and base alone. Read from the copied text's first block,
// in English only: other languages name the lines differently.

export interface NewItemQuery {
  name?: string
  type: string
  // Uniques search as uniques; a rare's base searches without its name.
  rarity?: 'unique' | 'nonunique'
}

const SEPARATOR = '--------'

export function newItemQuery (rawText: string): NewItemQuery | null {
  const head = rawText.replace(/\r\n/g, '\n').split(SEPARATOR)[0]
    .split('\n').map(line => line.trim()).filter(Boolean)
  const rarityAt = head.findIndex(line => line.startsWith('Rarity: '))
  if (rarityAt === -1) return null
  const rarity = head[rarityAt].slice('Rarity: '.length)
  const lines = head.slice(rarityAt + 1)
  if (!lines.length || lines.length > 2) return null

  switch (rarity) {
    case 'Unique':
      return lines.length === 2
        ? { name: lines[0], type: lines[1], rarity: 'unique' }
        // Unidentified: only the base shows.
        : { type: lines[0], rarity: 'unique' }
    case 'Rare':
      return lines.length === 2 ? { type: lines[1], rarity: 'nonunique' } : null
    case 'Currency':
    case 'Gem':
    case 'Divination Card':
    case 'Normal':
      // A magic item's name carries its affixes, so it can't be searched by name.
      return lines.length === 1 ? { type: lines[0].replace(/^Superior /, '') } : null
    default:
      return null
  }
}

export function newItemTradeBody (q: NewItemQuery) {
  return {
    query: {
      status: { option: 'online' as const },
      ...(q.name ? { name: q.name } : {}),
      type: q.type,
      stats: [{ type: 'and' as const, filters: [] }],
      filters: q.rarity ? { type_filters: { filters: { rarity: { option: q.rarity } } } } : {}
    },
    sort: { price: 'asc' as const }
  }
}

export function newItemTradeUrl (league: string, q: NewItemQuery, host = 'www.pathofexile.com'): string {
  return `https://${host}/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(newItemTradeBody(q)))}`
}
