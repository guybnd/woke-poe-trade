// 3.30 renamed three Temple rooms. The trade site still lists them under the
// old names, so a Chronicle's renamed rooms search as those.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'

beforeAll(loadGameData)

const CHRONICLE = [
  'Item Class: Misc Map Items',
  'Rarity: Normal',
  'Chronicle of Atzoatl',
  '--------',
  'Area Level: 83',
  '--------',
  'Item Level: 83',
  '--------',
  'Open Rooms:',
  'Cradle of Creation (Tier 3)',
  'Royal Forge (Tier 2)',
  'Doryani\'s Institute (Tier 3)',
  'Obstructed Rooms:',
  'Grand Reactor (Tier 2)',
  '--------',
  'Take this item to Alva Valai in Highgate to access the Temple of Atzoatl.'
].join('\n')

describe('3.30 Temple room names', () => {
  it('reads renamed rooms as their trade site rooms, shown by the new name', () => {
    const item = parseItem(CHRONICLE)
    expect(item.unknownModifiers).toEqual([])
    const rooms = item.newMods.flatMap(m => m.stats.map(s => [s.stat.ref, s.translation.string]))
    expect(rooms).toEqual(expect.arrayContaining([
      ['Has Room: Throne of Atziri (Tier 3)', 'Cradle of Creation (Tier 3)'],
      ['Has Room: Omnitect Forge (Tier 2)', 'Royal Forge (Tier 2)'],
      ['Has Room: Omnitect Reactor Plant (Tier 2)', 'Obstructed Rooms: Grand Reactor (Tier 2)']
    ]))
  })
})
