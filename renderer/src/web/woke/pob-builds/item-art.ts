// Game art for what a build uses, from APT's bundled item data.
import { ITEM_BY_REF } from '@/assets/data'
import { gameIcon } from '../ui/game-icons'
import { gemData } from './gems'
import type { PobItem } from './widget'

export function gemArt (name: string): string | null {
  return gameIcon(gemData(name)?.name ?? name, 'GEM')
}

const magicBases = new Map<string, string>()

// A magic item's name holds its base between the affixes ("Seething Divine
// Life Flask of Staunching"): the longest run of words that is a base.
export function baseOfName (name: string): string {
  const plain = name.replace(/^Superior /, '')
  let found = magicBases.get(plain)
  if (found != null) return found
  found = ''
  const words = plain.split(' ')
  search: for (let len = words.length; len > 0; len--) {
    for (let at = 0; at + len <= words.length; at++) {
      const run = words.slice(at, at + len).join(' ')
      if (ITEM_BY_REF('ITEM', run)?.length) { found = run; break search }
    }
  }
  magicBases.set(plain, found)
  return found
}

// A unique's own art, else its base's.
export function itemArt (item: PobItem): string | null {
  if (item.rarity === 'UNIQUE' || item.rarity === 'RELIC') {
    const art = gameIcon(item.name, 'UNIQUE')
    if (art) return art
  }
  const base = item.base || baseOfName(item.name)
  return base ? gameIcon(base, 'ITEM') : null
}
