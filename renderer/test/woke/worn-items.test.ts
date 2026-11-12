// Worn gear from pathofexile.com's get-items reply, compared like a PoB set.
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard } from '@/parser'
import { pobItemText } from '@/web/woke/pob-builds/item-text'
import { swapCheck } from '@/web/woke/pob-builds/swap-check'
import fs from 'fs'
import path from 'path'
import { cleanMod, parseWornItems, pickCharacter, WornReader } from '../../../main/src/woke/personal/worn-items'
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

  it('an armour with two increased Energy Shield mods, against itself, shows no differences', () => {
    const copied = fs.readFileSync(path.resolve(__dirname, '../../../testing/fixtures/items/rare-body-armour-es.txt'), 'utf8').replace(/\r\n/g, '\n')
    const checked = parseClipboard(copied)._unsafeUnwrap()
    const worn = parseWornItems(JSON.stringify({ items: [{
      inventoryId: 'BodyArmour',
      frameType: 2,
      name: 'Doom Shell',
      typeLine: 'Twilight Regalia',
      baseType: 'Twilight Regalia',
      ilvl: 86,
      properties: [{ name: 'Quality', values: [['+20%', 1]] }, { name: 'Energy Shield', values: [['1210', 1]] }],
      sockets: [0, 0, 0, 0, 0, 0].map(() => ({ group: 0, sColour: 'B' })),
      explicitMods: ['120% increased Energy Shield', '42% increased Energy Shield', '18% increased Stun and Block Recovery', '+120 to maximum Life', '+34% to Fire Resistance', '+34% to Cold Resistance', '+31% to Chaos Resistance']
    }] }))![0].item
    const yours = parseClipboard(pobItemText(worn))._unsafeUnwrap()
    const r = swapCheck(yours, checked, null)
    expect(r.rows).toEqual([])
    expect(r.verdict).toBe('same')
  })

  it('reads foil uniques, normal bases by their base and Foulborn mods', () => {
    const items = parseWornItems(JSON.stringify({ items: [
      { ...TIMEPIECE, frameType: 10 },
      { inventoryId: 'Belt', frameType: 0, typeLine: 'Synthesised Leather Belt', baseType: 'Leather Belt', implicitMods: ['+30 to maximum Life'] },
      { ...TIMEPIECE, inventoryId: 'Ring', frameType: 42, name: '<<set:MS>>Odd', typeLine: 'Gold Ring' },
      { ...TIMEPIECE, inventoryId: 'Ring2', mutatedMods: ['+1 to Level of all Skill Gems'] }
    ] }))!
    expect(items.map(x => x.item.rarity)).toEqual(['UNIQUE', 'NORMAL', 'UNIQUE', 'UNIQUE'])
    expect(items[1].item.name).toBe('Leather Belt')
    expect(items[2].item.name).toBe('Odd')
    expect(items[3].item.mods).toContain('+1 to Level of all Skill Gems')
    expect(parseClipboard(pobItemText(items[1].item)).isOk()).toBe(true)
  })
})

describe('worn reader', () => {
  const reply = (status: number, body: string) => ({ status, headers: {}, body })
  function setup () {
    const calls: string[] = []
    let now = 1_000_000
    let signedOut = 0
    const answers: Record<string, ReturnType<typeof reply>> = {
      'get-characters': reply(200, JSON.stringify([{ name: 'Old' }, { name: 'Played', lastActive: true }])),
      'get-items': reply(200, JSON.stringify({ items: [TIMEPIECE] }))
    }
    const r = new WornReader({
      fetch: async (url) => { calls.push(url); return answers[/(get-\w+)/.exec(url)![1]] },
      now: () => now,
      sleep: async (ms) => { now += ms },
      account: () => 'Me#1234',
      signedOut: () => { signedOut++ }
    })
    return { r, calls, answers, tick: (ms: number) => { now += ms }, signedOuts: () => signedOut }
  }

  it('reads the character you last played, then answers from its cache for a minute', async () => {
    const t = setup()
    const g = await t.r.read('SomeoneInParty')
    expect('character' in g && g.character).toBe('Played')
    expect(t.calls.map(u => /get-\w+/.exec(u)![0])).toEqual(['get-characters', 'get-items'])
    expect(t.calls[1]).toContain('character=Played')
    t.tick(10_000)
    await t.r.read('SomeoneInParty')
    expect(t.calls.length).toBe(2)
    t.tick(60_000)
    await t.r.read('SomeoneInParty')
    expect(t.calls.length).toBe(3)
  })

  it('keeps a failure for a minute and passes a sign-out on', async () => {
    const t = setup()
    t.answers['get-characters'] = reply(401, '')
    expect(await t.r.read('X')).toEqual({ error: 'Signed out of pathofexile.com.' })
    expect(t.signedOuts()).toBe(1)
    t.tick(5_000)
    await t.r.read('X')
    expect(t.calls.length).toBe(1)
  })

  it('picks the last played character, else the log name, else your highest in the league', () => {
    const list = [{ name: 'Std', league: 'Standard', level: 98 }, { name: 'Low', league: 'Keepers', level: 40 }, { name: 'Main', league: 'Keepers', level: 92 }]
    expect(pickCharacter(JSON.stringify([...list, { name: 'Now', league: 'Keepers', level: 1, lastActive: true }]), '', 'Keepers')).toBe('Now')
    expect(pickCharacter(JSON.stringify({ characters: list }), 'Low', 'Keepers')).toBe('Low')
    expect(pickCharacter(JSON.stringify(list), 'Stranger', 'Keepers')).toBe('Main')
    expect(pickCharacter(JSON.stringify(list), '', null)).toBe('Std')
    expect(pickCharacter('nope', 'X', null)).toBeNull()
  })
})
