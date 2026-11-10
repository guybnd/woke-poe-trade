// A unique's price check starts from its name: only what sets this copy apart starts ticked.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'

function ticked (text: string): string[] {
  const filters = initUiModFilters(parseItem(text), { searchStatRange: 10 }) as StatFilter[]
  return filters.filter(f => !f.group && !f.disabled && !f.hidden).map(f => f.text)
}

const kaom = (fire: string, ...extra: string[]) => [
  'Item Class: Body Armours',
  'Rarity: Unique',
  'Kaom\'s Heart',
  'Glorious Plate',
  '--------',
  'Armour: 1013 (augmented)',
  '--------',
  'Requirements:',
  'Level: 68',
  'Str: 191',
  '--------',
  'Sockets: R',
  '--------',
  'Item Level: 86',
  '--------',
  ...extra,
  '{ Unique Modifier — Damage, Elemental, Fire }',
  `${fire}(20-40)% increased Fire Damage`,
  '{ Unique Modifier — Life }',
  '+500 to maximum Life',
  '--------',
  'The warrior who fears will fall.',
  ''
].join('\n')

describe('unique price check defaults', () => {
  beforeAll(loadGameData)

  it('leaves an average roll unticked, even with few mods', () => {
    expect(ticked(kaom('30'))).toEqual([])
  })

  it('ticks a roll near the top of its range', () => {
    expect(ticked(kaom('39'))).toEqual(['#% increased Fire Damage'])
  })

  it('ticks a corruption implicit, not the average rolls beside it', () => {
    const text = kaom('30',
      '{ Corruption Implicit Modifier — Gem }',
      '+1 to Level of Socketed Gems',
      '--------'
    ).replace('The warrior who fears will fall.\n', 'The warrior who fears will fall.\n--------\nCorrupted\n')
    const on = ticked(text)
    expect(on.some(t => /Socketed Gems/.test(t))).toBe(true)
    expect(on.some(t => /Fire Damage/.test(t))).toBe(false)
  })

  it('keeps a Watcher\'s Eye aura mod ticked and its plain rolls off', () => {
    const on = ticked(fixture('items/unique-watchers-eye.txt'))
    expect(on.some(t => /Wrath/.test(t))).toBe(true)
    expect(on.some(t => /maximum (Life|Mana|Energy Shield)/.test(t))).toBe(false)
  })

  // Guy's screenshot: every row of this corrupted copy started ticked.
  it('ticks only the corruption implicit and the perfect roll on The Dark Seer', () => {
    const on = ticked([
      'Item Class: Sceptres', 'Rarity: Unique', 'The Dark Seer', 'Shadow Sceptre', '--------',
      'Item Level: 84', '--------',
      '{ Corruption Implicit Modifier }', '+10% to Quality of Socketed Gems', '--------',
      '{ Unique Modifier — Gem }', '+2 to Level of all Spell Skill Gems',
      '{ Unique Modifier }', '10% Global chance to Blind Enemies on hit',
      '{ Unique Modifier — Mana }', '+1(1-2) Maximum Mana per Level',
      '{ Unique Modifier — Defences, Energy Shield }', '+2(1-2) Maximum Energy Shield per Level', '--------',
      'Corrupted', ''
    ].join('\n'))
    expect(on.some(t => /Quality of Socketed Gems/.test(t))).toBe(true)
    expect(on.some(t => /Energy Shield per Level/.test(t))).toBe(true)
    expect(on.some(t => /Spell Skill Gems|Blind|Mana per Level/.test(t))).toBe(false)
  })

  it('ticks a total that holds a corruption implicit', () => {
    const on = ticked(kaom('30',
      '{ Corruption Implicit Modifier — Elemental, Resistance }',
      '+10(8-12)% to all Elemental Resistances',
      '--------'
    ).replace('The warrior who fears will fall.\n', 'The warrior who fears will fall.\n--------\nCorrupted\n'))
    expect(on.some(t => /Elemental Resistance/.test(t))).toBe(true)
  })
})
