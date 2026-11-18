// Mods the trade site words one way and the game another: "Goreblossom has
// +# maximum Bloom" on the trade site is "+3 to maximum Blooms" in game.
// gameWordings (scripts/trade-data-patch.mjs) adds the game's wordings.
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard } from '@/parser'
import { gameWordings } from '../../../scripts/trade-data-patch.mjs'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

describe('game wordings in the data', () => {
  it('reads the plural Goreblossom line', () => {
    const item = parseClipboard(`Item Class: Wands
Rarity: Rare
Doom Song
Imbued Wand
--------
Wand
Physical Damage: 29-53
Critical Strike Chance: 7.00%
Attacks per Second: 1.50
--------
Requirements:
Level: 59
Int: 188
--------
Sockets: B-B-B
--------
Item Level: 84
--------
{ Prefix Modifier "Prior's" (Tier: 1) }
Trigger Level 20 Goreblossom after spending 11(10-12)% of your Maximum Life on Spells
{ Suffix Modifier "of the Bloom" (Tier: 1) }
Goreblossom has +3(1-3) to maximum Blooms`)._unsafeUnwrap()
    expect(item.unknownModifiers).toEqual([])
    const bloom = item.statsByType.find(s => s.stat.ref === 'Goreblossom has +# maximum Bloom')!
    expect(bloom.sources[0].contributes!.value).toBe(3)
  })

  it('reads a reduced roll of an increased stat as negative', () => {
    const item = parseClipboard(`Item Class: Gloves
Rarity: Rare
Grim Grasp
Fingerless Silk Gloves
--------
Energy Shield: 30
--------
Item Level: 84
--------
{ Prefix Modifier "Hale" (Tier: 1) }
+45(40-49) to maximum Life
{ Unique Modifier }
10% reduced Effect of Cruelty`)._unsafeUnwrap()
    expect(item.unknownModifiers).toEqual([])
    const s = item.statsByType.find(s => s.stat.ref === '#% increased Effect of Cruelty')!
    expect(s.sources[0].contributes!.value).toBe(-10)
  })
})

describe('Hindered within metres', () => {
  it('reads 3.30 "reduced" as the same reduction the old Nearby line read', () => {
    const item = parseClipboard(`Item Class: Body Armours
Rarity: Rare
Grim Shell
Vaal Regalia
--------
Energy Shield: 200
--------
Item Level: 84
--------
{ Unique Modifier }
Enemies within 3.5 metres are Hindered, with 25% reduced Movement Speed`)._unsafeUnwrap()
    const s = item.statsByType.find(s => s.stat.ref === 'Nearby Enemies are Hindered, with #% reduced Movement Speed')!
    const nearby = parseClipboard(`Item Class: Body Armours
Rarity: Rare
Grim Shell
Vaal Regalia
--------
Energy Shield: 200
--------
Item Level: 84
--------
{ Unique Modifier }
Nearby Enemies are Hindered, with 25% reduced Movement Speed`)._unsafeUnwrap()
    const n = nearby.statsByType.find(s => s.stat.ref === 'Nearby Enemies are Hindered, with #% reduced Movement Speed')!
    expect(s.sources[0].contributes!.value).toBe(n.sources[0].contributes!.value)
  })
})

describe('gameWordings', () => {
  const v = (string: string, min: number | null, max: number | null, format: string[], handlers: string[] = []) =>
    ({ string, condition: [{ min, max, negated: null }], format, index_handlers: [handlers], reminder_text: null, is_markup: null })
  const t = (id: string, English: unknown[]) => ({ ids: ['x'], English, trade_stats: [{ id, text: '', type: 'explicit', option: null }], hidden: null })
  const line = (ref: string, id: string, matchers = [{ string: ref }]) => ({ ref, better: 1, matchers, trade: { ids: { explicit: [id] } } })

  it('adds plural, negated and fixed-value wordings', () => {
    const lines = [
      line('Goreblossom has +# maximum Bloom', 'explicit.stat_1', [{ string: 'Goreblossom has # maximum Bloom' }]),
      line('#% increased X', 'explicit.stat_2'),
      line('Hits have #% chance to Y', 'explicit.stat_3')
    ]
    const added = gameWordings(lines, [
      t('explicit.stat_1', [v('Goreblossom has {0} maximum Bloom', 1, 1, ['+#']), v('Goreblossom has {0} to maximum Blooms', 2, null, ['+#'])]),
      t('explicit.stat_2', [v('{0}% increased X', 1, null, ['#']), v('{0}% reduced X', null, -1, ['#'], ['negate'])]),
      t('explicit.stat_3', [v('Hits have {0}% chance to Y', 1, 99, ['#']), v('Hits Y', 100, null, ['ignore'])])
    ])
    expect(added.length).toBe(3)
    expect(lines[0].matchers).toContainEqual({ string: 'Goreblossom has # to maximum Blooms' })
    expect(lines[1].matchers).toContainEqual({ string: '#% reduced X', negate: true })
    expect(lines[2].matchers).toContainEqual({ string: 'Hits Y', value: 100 })
  })

  it('follows our matcher when it reads the game wording negated', () => {
    // Ours reads "reduced" negated; the game's "reduced" is its plain wording.
    const lines = [line('#% increased Q Efficiency', 'explicit.stat_1', [{ string: '#% reduced Q Efficiency', negate: true } as any])]
    gameWordings(lines, [t('explicit.stat_1', [v('{0}% reduced Q Efficiency', 1, null, ['#']), v('{0}% increased Q Efficiency', null, -1, ['#'], ['negate'])])])
    expect(lines[0].matchers).toContainEqual({ string: '#% increased Q Efficiency' })
  })

  it('leaves words another stat reads, numberless stats, hybrids and other handlers alone', () => {
    const lines = [
      line('#% increased X', 'explicit.stat_1'),
      line('#% reduced X', 'explicit.stat_9'),
      line('Trigger Level 20 Z on Kill', 'explicit.stat_2'),
      line('# W per second', 'explicit.stat_3')
    ]
    const added = gameWordings(lines, [
      t('explicit.stat_1', [v('{0}% increased X', 1, null, ['#']), v('{0}% reduced X', null, -1, ['#'], ['negate'])]),
      t('explicit.stat_2', [v('Trigger Level 20 Z on Kill', 100, 100, ['ignore']), v('{0}% chance to Trigger Level 1 Z on Kill', null, null, ['#'])]),
      t('explicit.stat_3', [v('{0} W per second', 1, null, ['#'], ['per_minute_to_per_second']), v('{0} W per minute', 1, null, ['#'])]),
      { ...t('explicit.stat_1', [v('{0}% increased X and Q', 1, null, ['#'])]), ids: ['a', 'b'] }
    ])
    expect(added).toEqual([])
  })
})
