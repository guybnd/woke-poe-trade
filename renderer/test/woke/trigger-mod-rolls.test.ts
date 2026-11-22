// Two-number lines the trade site searches by their first number: Kitava's
// Thirst's trigger ("50% chance ... 200 Life") once averaged to "125%" and the
// search found nothing. Each stat was checked on the live trade API.
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { loadGameData, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { searchedNumber } from '@/parser/stat-translations'
import { rollPair } from '@/web/woke/price-insight/roll-pair'
import type { Stat } from '@/assets/data'

function kitava (foul: boolean, ar = 245, es = 51) {
  return parseItem([
    'Item Class: Helmets', 'Rarity: Unique', `${foul ? 'Foulborn ' : ''}Kitava's Thirst`, 'Zealot Helmet', '--------',
    'Quality: +20% (augmented)', `Armour: ${ar} (augmented)`, `Energy Shield: ${es} (augmented)`, '--------',
    'Item Level: 73', '--------',
    foul ? '{ Foulborn Unique Modifier }' : '{ Unique Modifier }',
    `50% chance to Trigger Socketed Spells when you Spend at least ${foul ? '200 Life' : '100 Mana'} on an`,
    'Upfront Cost to Use or Trigger a Skill, with a 0.1 second Cooldown',
    '{ Unique Modifier — Caster, Speed }', '15% reduced Cast Speed',
    '{ Unique Modifier — Defences }', '70(70-80)% increased Armour and Energy Shield',
    '{ Unique Modifier — Mana }', '+31(30-50) to maximum Mana', '--------', ''
  ].join('\n'))
}

function filters (text: string) {
  return initUiModFilters(parseItem(text), { searchStatRange: 10 }) as StatFilter[]
}

function unique (name: string, base: string, cls: string, line: string) {
  return [
    `Item Class: ${cls}`, 'Rarity: Unique', name, base, '--------', 'Item Level: 80', '--------',
    '{ Unique Modifier }', line, '--------', ''
  ].join('\n')
}

describe('two-number lines searched by their first number', () => {
  beforeAll(loadGameData)

  it('searches Foulborn Kitava\'s Thirst by its 50% chance, not 125', () => {
    const stats = initUiModFilters(kitava(true), { searchStatRange: 10 }) as StatFilter[]
    const trig = stats.find(f => f.text.includes('Upfront Cost'))!
    expect(trig.tradeId).toEqual(['explicit.stat_2513998383'])
    expect(trig.tag).toBe('foulborn')
    expect(trig.roll).toMatchObject({ value: 50, min: 50 })
    // The line reads as the game shows it.
    expect(rollPair(trig)).toEqual([50, 200])
  })

  it('searches plain Kitava\'s Thirst by its 50% chance, not 75', () => {
    const stats = initUiModFilters(kitava(false), { searchStatRange: 10 }) as StatFilter[]
    const trig = stats.find(f => f.text.includes('Upfront Cost'))!
    expect(trig.tradeId).toEqual(['explicit.stat_723388324'])
    expect(trig.roll?.value).toBe(50)
    expect(rollPair(trig)).toEqual([50, 100])
  })

  it('reads the base roll the trade site does (6% on this copy)', () => {
    // A live Covens listing: Q20, 245 Armour, 51 ES, 70% increased; the
    // trade site's base percentile filter puts it at 10 or under.
    expect(kitava(true).basePercentile).toBe(6)
  })

  it('searches Tinkerskin by its 30% chance and Deerstalker by its 15%', () => {
    const tinker = filters(unique('Tinkerskin', 'Sadist Garb', 'Body Armours', '30% chance to gain Phasing for 4 seconds when your Trap is triggered by an Enemy'))
      .find(f => f.text.includes('Phasing'))!
    expect(tinker.roll).toMatchObject({ value: 30 })
    expect(rollPair(tinker)).toEqual([30, 4])
    const deer = filters(unique('Deerstalker', 'Deerskin Boots', 'Boots', '15% increased Movement Speed for 9 seconds on Throwing a Trap'))
      .find(f => f.text.includes('Throwing a Trap'))!
    expect(deer.roll).toMatchObject({ value: 15 })
  })

  it('keeps the average where the trade site stores it (Death\'s Oath)', () => {
    // Checked on the trade API: 226.5 matches, 450 doesn't (the filter rounds down).
    const oath = filters(unique('Death\'s Oath', 'Astral Plate', 'Body Armours', 'You take 450 Chaos Damage per second for 3 seconds on Kill'))
      .find(f => f.text.includes('on Kill'))!
    expect(oath.roll?.value).toBe(226)
    expect(rollPair(oath)).toBeUndefined()
  })

  it('leaves "Adds # to #" lines as their average', () => {
    const adds = filters(unique('Abberath\'s Horn', 'Goat\'s Horn', 'Shields', 'Adds 5 to 10 Fire Damage to Spells'))
      .find(f => f.text.includes('Fire Damage to Spells'))!
    expect(adds.roll?.value).toBe(7)
    expect(rollPair(adds)).toEqual([5, 10])
  })

  it('has every line with one percentage among two numbers checked on the trade site', () => {
    // Checked on the live trade API (2026-11-22): searched by the percentage
    // (searchedNumber) or stored as the average. A new stat of this shape
    // fails here until someone checks it and adds it to one list.
    const PERCENTAGE = ['stat_723388324', 'stat_2513998383', 'stat_144887967', 'stat_3102860761']
    const AVERAGE = ['stat_3788412017'] // idols: "#% chance for up to # Rare Monsters to be Possessed"
    for (const lang of ['en', 'ru', 'ko', 'cmn-Hant']) {
      const file = path.resolve(__dirname, `../../public/data/${lang}/stats.ndjson`)
      const found = new Set<string>()
      for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        if (!line) continue
        const stat = JSON.parse(line) as Stat
        for (const m of stat.matchers ?? []) {
          const pct = m.string.split('#').slice(1).map(s => s[0] === '%')
          if (pct.length !== 2 || pct[0] === pct[1]) continue
          const ids = Object.values(stat.trade.ids).flat().map(id => id.split('.')[1])
          ids.forEach(id => found.add(id))
          // The parser's rule agrees: percentage index for the checked ones only.
          expect(searchedNumber(stat, m.string), `${lang} ${m.string}`).toBe(ids.some(id => PERCENTAGE.includes(id)) ? pct.indexOf(true) : -1)
        }
      }
      expect([...found].sort(), lang).toEqual([...PERCENTAGE, ...AVERAGE].sort())
    }
  })
})
