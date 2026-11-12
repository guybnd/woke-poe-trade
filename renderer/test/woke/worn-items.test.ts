// Worn gear from pathofexile.com's get-items reply, compared like a PoB set.
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard } from '@/parser'
import { pobItemText } from '@/web/woke/pob-builds/item-text'
import { swapCheck } from '@/web/woke/pob-builds/swap-check'
import { cleanMod, parseWornItems } from '../../../main/src/woke/personal/worn-items'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

const TIMEPIECE = {
  inventoryId: 'Amulet',
  frameType: 3,
  name: 'Warped Timepiece',
  typeLine: 'Turquoise Amulet',
  baseType: 'Turquoise Amulet',
  ilvl: 84,
  identified: true,
  enchantMods: ['Allocates Window of Opportunity'],
  implicitMods: ['+21 to Dexterity and Intelligence'],
  explicitMods: [
    '23% increased [AttackSpeed|Attack Speed]',
    '22% increased Cast Speed',
    '13% increased Movement Speed',
    '19% reduced Skill Effect Duration',
    'Debuffs on you expire 100% faster'
  ]
}

const RING = {
  inventoryId: 'Ring2',
  frameType: 2,
  name: 'Gale Knuckle',
  typeLine: 'Prismatic Ring',
  baseType: 'Prismatic Ring',
  ilvl: 82,
  implicitMods: ['+10% to all Elemental Resistances'],
  fracturedMods: ['+70 to maximum Life'],
  explicitMods: ['+40% to Fire Resistance'],
  craftedMods: ['+25 to Strength'],
  influences: { hunter: true },
  corrupted: true
}

// What Ctrl + Alt + C gives for the amulet in game.
const COPIED = `Item Class: Amulets
Rarity: Unique
Warped Timepiece
Turquoise Amulet
--------
Requirements:
Level: 36
--------
Item Level: 84
--------
Allocates Window of Opportunity (enchant)
--------
{ Implicit Modifier — Attribute }
+21(16-24) to Dexterity and Intelligence
--------
{ Unique Modifier — Attack, Speed }
23(15-25)% increased Attack Speed
{ Unique Modifier — Caster, Speed }
22(15-25)% increased Cast Speed
{ Unique Modifier — Speed }
13(10-15)% increased Movement Speed
{ Unique Modifier }
19(20-15)% reduced Skill Effect Duration
{ Unique Modifier }
Debuffs on you expire 100% faster
--------
And the moments in-between, like falling grains of sand,
gather up and comprise the shape of your life.
`

describe('worn items', () => {
  it('takes the equipment slots and leaves the rest', () => {
    const slots = parseWornItems(JSON.stringify({ items: [TIMEPIECE, RING, { ...RING, inventoryId: 'MainInventory' }, { ...RING, inventoryId: 'Flask' }] }))!
    expect(slots.map(s => s.slot)).toEqual(['Amulet', 'Ring 2'])
    expect(parseWornItems('<html>')).toBeNull()
    expect(parseWornItems('{"error":{"code":6}}')).toBeNull()
  })

  it('strips the site markup from mods', () => {
    expect(cleanMod('23% increased [AttackSpeed|Attack Speed]')).toBe('23% increased Attack Speed')
    expect(cleanMod('Adds [Fire] Damage')).toBe('Adds Fire Damage')
  })

  it('keeps fractured, crafted, influence and corruption', () => {
    const ring = parseWornItems(JSON.stringify({ items: [RING] }))![0].item
    expect(ring).toMatchObject({ rarity: 'RARE', name: 'Gale Knuckle', base: 'Prismatic Ring', mods: ['+70 to maximum Life', '+40% to Fire Resistance', '+25 to Strength'], modKinds: ['fractured', '', 'crafted'], influences: ['Hunter'], corrupted: true })
    expect(parseClipboard(pobItemText(ring)).isOk()).toBe(true)
  })

  it('the amulet you wear, checked against itself, shows no differences', () => {
    const worn = parseWornItems(JSON.stringify({ items: [TIMEPIECE] }))![0].item
    const yours = parseClipboard(pobItemText(worn))._unsafeUnwrap()
    const checked = parseClipboard(COPIED)._unsafeUnwrap()
    const r = swapCheck(yours, checked, null)
    expect(r.rows).toEqual([])
    expect(r.verdict).toBe('same')
  })
})
