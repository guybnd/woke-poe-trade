// 3.30 item and stat data from the trade site (WOKEPOET-154): reworded mods
// and new items are read by the parser.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseClipboard } from '@/parser'
import { pobItemText } from '@/web/woke/pob-builds/item-text'
import { parseItemText } from '../../../main/src/woke/pob-parse'
import { loadGameData } from '../helpers/game-data'
import { ITEM_BY_REF } from '@/assets/data'

beforeAll(loadGameData)

function refs (mod: string) {
  const item = parseClipboard(pobItemText(parseItemText(`
    Rarity: RARE
    Grim Hold
    Gold Ring
    Item Level: 84
    Implicits: 0
    ${mod}
  `) as never))._unsafeUnwrap()
  return { refs: item.statsByType.map(s => s.stat.ref), unknown: item.unknownModifiers.map(u => u.text) }
}

describe('3.30 data', () => {
  it('reads mods GGG reworded in 3.30', () => {
    expect(refs('+30 to maximum Life').refs).toContain('+# to maximum Life')
    expect(refs('+15% to Item Rarity')).toMatchObject({ refs: ['#% increased Rarity of Items found'], unknown: [] })
  })

  it('knows the new league items', () => {
    for (const name of ['Abyss Thread', 'Frayed Thread', 'Royal Visage', 'Essence of Trickery', 'Cryptic Astrolabe']) {
      expect(ITEM_BY_REF('ITEM', name)?.[0]?.name, name).toBe(name)
    }
  })
})
