import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { artFile, uniqueFromArt } from '@/web/woke/shared/unid-art'
import { VARIABLE_ITEMS } from '@/web/woke/shared/unid-prices'
import { VARIABLE_UNIQUE_BASES } from '@/web/woke/shared/variable-uniques'

describe('variable uniques list (Path of Building data)', () => {
  it('holds the rolled jewels and gear, and leaves fixed uniques out', () => {
    for (const name of ["Watcher's Eye", 'Forbidden Flame', 'Megalomaniac', 'Glorious Vanity', 'Voices', "Atziri's Splendour", 'Impresence']) {
      expect(VARIABLE_ITEMS.has(name), name).toBe(true)
    }
    // Fixed, or set by a base that shows before identifying (Grand Spectrum's
    // jewel, Beacon of Madness's boots).
    for (const name of ['Headhunter', 'Mageblood', 'The Rat Cage', 'Grand Spectrum', 'Beacon of Madness']) expect(VARIABLE_ITEMS.has(name), name).toBe(false)
  })

  it('has one base for trade for each, and leaves out uniques on several bases', () => {
    expect(VARIABLE_UNIQUE_BASES['Forbidden Flame']).toBe('Crimson Jewel')
    for (const name of VARIABLE_ITEMS) expect(VARIABLE_UNIQUE_BASES[name], name).toBeTruthy()
    for (const name of ["Precursor's Emblem", "Doryani's Delusion"]) expect(VARIABLE_ITEMS.has(name), name).toBe(false)
  })

  // Names are matched exactly: PoB's "Bound by Destiny" never met the game's
  // "Bound By Destiny", so it got poe.ninja's one misleading price.
  it('spells every name as the game data does', () => {
    const uniques = new Set(readFileSync(join(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
      .split('\n').filter(Boolean).map(l => JSON.parse(l) as { namespace: string, refName: string })
      .filter(i => i.namespace === 'UNIQUE').map(i => i.refName))
    // Not in the game data yet.
    const absent = new Set(['Replica Forbidden Shako'])
    expect([...VARIABLE_ITEMS].filter(n => !uniques.has(n) && !absent.has(n))).toEqual([])
  })
})

describe('an unidentified unique from its art', () => {
  const onBase = (base: string) => base === 'Crimson Jewel' ? ['Forbidden Flame', 'Thread of Hope', 'Twin A', 'Twin B'] : []
  const icons: Record<string, string> = {
    'Forbidden Flame': 'https://web.poecdn.com/gen/image/WzI1/ddfe57ac90/PuzzlePieceJewel_CleansingFire.png',
    'Thread of Hope': 'https://web.poecdn.com/gen/image/WzI2/aaaa/ThreadOfHope.png',
    'Twin A': 'https://x/Same.png',
    'Twin B': 'https://x/Same.png'
  }
  const iconOf = (n: string) => icons[n]

  it('matches the file name, whatever the cdn path', () => {
    expect(artFile('https://web.poecdn.com/gen/image/abc/123/PuzzlePieceJewel_CleansingFire.png?v=2')).toBe('puzzlepiecejewel_cleansingfire.png')
    expect(uniqueFromArt('Crimson Jewel', 'https://web.poecdn.com/gen/image/OTHER/zz/PuzzlePieceJewel_CleansingFire.png', onBase, iconOf)).toBe('Forbidden Flame')
  })

  it('gives up on shared art, another base or no art', () => {
    expect(uniqueFromArt('Crimson Jewel', 'https://y/Same.png', onBase, iconOf)).toBeNull()
    expect(uniqueFromArt('Cobalt Jewel', icons['Forbidden Flame'], onBase, iconOf)).toBeNull()
    expect(uniqueFromArt('Crimson Jewel', '', onBase, iconOf)).toBeNull()
  })
})
