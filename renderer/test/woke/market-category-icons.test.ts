// The Market window's side list: each category's chosen icon item must exist
// in the item data, in any namespace (Forbidden Flame is a unique).
import { beforeAll, describe, expect, it } from 'vitest'
import { ICON_ITEMS } from '@/web/woke/market/browser'
import { itemArt, ninjaIcon } from '@/web/woke/ui/game-icons'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

describe('market category icons', () => {
  it('finds art for every chosen item', () => {
    const missing = Object.entries(ICON_ITEMS)
      .filter(([type, name]) => !(ninjaIcon(type, name) ?? itemArt({ name })))
      .map(([type, name]) => `${type}: ${name}`)
    expect(missing).toEqual([])
  })

  it('draws captured beasts with their art', () => {
    expect(ninjaIcon('Beast', 'Wild Hellion Alpha')).toBeTruthy()
  })
})
