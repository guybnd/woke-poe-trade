// Item text pasted into search from outside the game: poe.ninja, trade sites
// and Path of Building.
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard, ItemCategory, ItemRarity } from '@/parser'
import { pastedItemText } from '@/web/woke/search/pasted-item'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

// Copied from a poe.ninja build page: no "Item Class:" line, an empty
// section, and the eldritch lines at the end.
const NINJA = `Rarity: Rare
Honour Jack
Twilight Regalia
--------
Quality: +20%
Energy Shield: 1129
--------
Requirements:
Level: 84
Str: 111
Dex: 98
Int: 293
--------
Sockets: B-B-W-G-B-B
--------
Item Level: 85
--------
--------
Melee Hits have 9% chance to Fortify (implicit)
+1% to all maximum Resistances (implicit)
--------
+95 to maximum Energy Shield
137% increased Energy Shield
Regenerate 132.8 Life per second
+46% to Fire Resistance
+46% to Cold Resistance
17% increased Stun and Block Recovery
--------
Searing Exarch Item
--------
Eater of Worlds Item`

function read (text: string) {
  const game = pastedItemText(text)
  expect(game).not.toBeNull()
  return parseClipboard(game!)._unsafeUnwrap()
}

describe('pastedItemText', () => {
  it('reads a poe.ninja copy with no item class', () => {
    const item = read(NINJA)
    expect(item.rarity).toBe(ItemRarity.Rare)
    expect(item.category).toBe(ItemCategory.BodyArmour)
    expect(item.info.refName).toBe('Twilight Regalia')
    expect(item.itemLevel).toBe(85)
    expect(item.unknownModifiers).toEqual([])
    const refs = item.statsByType.map(s => s.stat.ref)
    expect(refs).toContain('+#% to all maximum Resistances')
    expect(refs).toContain('#% increased Energy Shield')
    expect(refs).toContain('+#% to Cold Resistance')
  })

  it('reads the same copy pasted indented with Windows line ends', () => {
    const item = read('\r\n' + NINJA.split('\n').map(l => '    ' + l).join('\r\n') + '\r\n')
    expect(item.info.refName).toBe('Twilight Regalia')
    expect(item.unknownModifiers).toEqual([])
  })

  it('takes upper case rarity on a separated copy', () => {
    const item = read(NINJA.replace('Rarity: Rare', 'Rarity: RARE'))
    expect(item.rarity).toBe(ItemRarity.Rare)
  })

  it('still reads the game copy with its item class', () => {
    const item = read('Item Class: Body Armours\n' + NINJA)
    expect(item.info.refName).toBe('Twilight Regalia')
  })

  it("reads Path of Building's item text", () => {
    const item = read(`Rarity: RARE
Honour Jack
Twilight Regalia
Searing Exarch Item
Eater of Worlds Item
Unique ID: abc123
Item Level: 85
Quality: 20
Sockets: B-B-W-G-B-B
LevelReq: 84
Implicits: 2
Melee Hits have 9% chance to Fortify
+1% to all maximum Resistances
+95 to maximum Energy Shield
137% increased Energy Shield
{crafted}+46% to Cold Resistance`)
    expect(item.rarity).toBe(ItemRarity.Rare)
    expect(item.info.refName).toBe('Twilight Regalia')
    expect(item.unknownModifiers).toEqual([])
    const refs = item.statsByType.map(s => s.stat.ref)
    expect(refs).toContain('+#% to all maximum Resistances')
    expect(refs).toContain('+#% to Cold Resistance')
  })

  it('leaves plain searches alone', () => {
    expect(pastedItemText('Headhunter')).toBeNull()
    expect(pastedItemText('Twilight Regalia\nanother line')).toBeNull()
    expect(pastedItemText('Rarity: whatever\nfoo')).toBeNull()
    expect(pastedItemText('')).toBeNull()
  })
})

describe('pastedItemText on other plain copies', () => {
  it('reads crafted and fractured mods and leaves a unique flavour text alone', () => {
    const game = pastedItemText(`Rarity: Unique
Tabula Rasa
Simple Robe
--------
Sockets: W-W-W-W-W-W
--------
Item Level: 70
--------
+10 to maximum Life (crafted)
--------
Corrupted`)!
    const item = parseClipboard(game)._unsafeUnwrap()
    expect(item.isCorrupted).toBe(true)
    expect(item.statsByType.map(s => s.stat.ref)).toContain('+# to maximum Life')
  })

  it('leaves an advanced copy as it is', () => {
    const text = `Item Class: Rings
Rarity: Rare
Dread Loop
Ruby Ring
--------
Item Level: 84
--------
{ Implicit Modifier }
+25% to Fire Resistance (implicit)
--------
{ Prefix Modifier "Hale" (Tier: 1) }
+64 to maximum Life`
    expect(pastedItemText(text)).toBe(text)
  })
})
