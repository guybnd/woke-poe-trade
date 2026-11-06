// A checked item against the one the build wears, through the real parser.
import { beforeAll, describe, expect, it } from 'vitest'
import { ItemCategory, parseClipboard } from '@/parser'
import { pobItemText } from '@/web/woke/pob-builds/item-text'
import { slotsFor, swapCheck } from '@/web/woke/pob-builds/swap-check'
import { parseItemText } from '../../../main/src/woke/pob-parse'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

function item (text: string) {
  return parseClipboard(pobItemText(parseItemText(text) as never))._unsafeUnwrap()
}

function boots (mods: string[], es = 173) {
  return item(`
    Rarity: RARE
    Test Stride
    Sorcerer Boots
    Item Level: 86
    Energy Shield: ${es}
    Implicits: 0
    ${mods.join('\n')}
  `)
}

const YOURS = ['+108 to maximum Life', '30% increased Movement Speed']
const CAPPED = { FireResist: 75, FireResistOverCap: 58, ColdResist: 75, ColdResistOverCap: 103, LightningResist: 75, LightningResistOverCap: 88, ChaosResist: 75, ChaosResistOverCap: 0 }

describe('swapCheck', () => {
  it('calls resistances over the cap no gain, and worse when you lose the rest', () => {
    const r = swapCheck(boots(YOURS), boots(['+72 to maximum Life', '25% increased Movement Speed', '+44% to Fire Resistance', '+38% to Cold Resistance'], 96), CAPPED)
    expect(r.verdict).toBe('worse')
    expect(r.summary).toContain('already over the cap')
    const row = (label: string) => r.rows.find(x => x.label === label)!
    expect(row('Life')).toMatchObject({ yours: '108', theirs: '72', delta: '-36', tone: 'down' })
    expect(row('Movement speed').delta).toBe('-5%')
    expect(row('Energy shield').delta).toBe('-77')
    expect(row('Fire resistance')).toMatchObject({ tone: 'dim', note: 'over cap 58 to 102: no change' })
  })

  it('says when a swap breaks a cap', () => {
    const yours = boots(['+60% to Fire Resistance'])
    const r = swapCheck(yours, boots([]), { ...CAPPED, FireResistOverCap: 10 })
    expect(r.verdict).toBe('worse')
    expect(r.summary).toContain('Fire 75% to 25%')
  })

  it('counts combined resistances for each element', () => {
    const r = swapCheck(boots([]), boots(['+20% to all Elemental Resistances', '+10% to Fire and Cold Resistances']), { FireResist: 60, FireResistOverCap: 0, ColdResist: 75, ColdResistOverCap: 0, LightningResist: 75, LightningResistOverCap: 0 })
    expect(r.rows.find(x => x.label === 'Fire resistance')?.theirs).toBe('30%')
    expect(r.rows.find(x => x.label === 'Lightning resistance')?.theirs).toBe('20%')
  })

  it('without saved stats, resistance counts plainly', () => {
    const r = swapCheck(boots([]), boots(['+40% to Fire Resistance']), null)
    expect(r.verdict).toBe('better')
    expect(r.rows[0].note).toBeUndefined()
  })

  it('finds a trade-off, and the same item', () => {
    expect(swapCheck(boots(['+100 to maximum Life']), boots(['20% increased Movement Speed']), null).verdict).toBe('mixed')
    expect(swapCheck(boots(YOURS), boots(YOURS), null).verdict).toBe('same')
  })
})

describe('swapCheck verdicts it must not overclaim', () => {
  it('losing chaos on an uncapped build is not a broken cap', () => {
    const r = swapCheck(boots(['+10% to Chaos Resistance']), boots(['+90 to maximum Life']), { ...CAPPED, ChaosResist: 30, ChaosResistOverCap: 0 })
    expect(r.verdict).toBe('better')
    expect(r.summary).not.toContain('under the cap')
  })

  it('uncapped elemental resistance counts, without a cap claim', () => {
    const r = swapCheck(boots(['+20% to Fire Resistance']), boots([]), { ...CAPPED, FireResist: 40, FireResistOverCap: 0 })
    expect(r.verdict).toBe('worse')
    expect(r.rows[0].note).toBe('40% to 20%')
  })

  it("won't call an item better when other mods differ", () => {
    const r = swapCheck(boots(['+20 to Strength']), boots(['+60 to maximum Life']), null)
    expect(r.verdict).toBe('mixed')
    expect(r.summary).toContain('other mods')
  })

  it('shows a mod with no number', () => {
    const r = swapCheck(boots([]), boots(['Cannot be Stunned']), null)
    expect(r.rows.map(x => x.delta)).toEqual(['new'])
    expect(r.verdict).toBe('mixed')
  })

  it('ignores life on Chaos Inoculation', () => {
    const r = swapCheck(boots(['+100 to maximum Life']), boots([]), { Life: 1 })
    expect(r.rows).toEqual([])
    expect(r.verdict).toBe('same')
  })

  it('reads flat energy shield on jewellery', () => {
    const ring = (mods: string[]) => item(`
      Rarity: RARE
      Test Loop
      Moonstone Ring
      Implicits: 0
      ${mods.join('\n')}
    `)
    const r = swapCheck(ring([]), ring(['+40 to maximum Energy Shield']), null)
    expect(r.rows.find(x => x.label === 'Energy shield')?.delta).toBe('+40')
  })
})

describe('slotsFor', () => {
  it('knows gear, and nothing else', () => {
    expect(slotsFor(ItemCategory.Ring)).toContain('Ring 2')
    expect(slotsFor(ItemCategory.Wand)).toEqual(['Weapon 1'])
    expect(slotsFor(ItemCategory.Shield)).toEqual(['Weapon 2'])
    expect(slotsFor(ItemCategory.Map)).toEqual([])
    expect(slotsFor(undefined)).toEqual([])
  })
})
