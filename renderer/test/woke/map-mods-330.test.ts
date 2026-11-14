// 3.30 map mods: the new suffixes can be picked, Vaal side areas are gone.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData } from '../helpers/game-data'
import { allAreaMods, allMapNames } from '@/web/woke/map-mods/data'
import { buildMapRegex } from '@/web/woke/map-mods/regex'

beforeAll(loadGameData)

const NEW = [
  'Area contains a Mirage',
  'Area contains a Mirror of Delirium',
  'Area contains the Viridian Wildwood',
  'Area contains a buried Apex Sentinel',
  'Area contains a buried Stalker Sentinel',
  'Area contains a buried Pandemonium Sentinel',
  'Area contains an Evocator of Ghorr',
  'Area contains an Evocator of Beidat',
  "Area contains an Evocator of K'Tash"
]

describe('3.30 map mods', () => {
  it('lists the new map suffixes and drops Vaal side areas', () => {
    const mods = allAreaMods()
    for (const m of NEW) expect(mods, m).toContain(m)
    expect(mods).not.toContain('Map has a Vaal Side Area')
  })

  it('each new suffix gets a search token of its own', () => {
    for (const m of NEW) {
      const { missing, text } = buildMapRegex({ avoid: [], want: [m], mins: {}, highlight: 'good' }, allAreaMods(), allMapNames())
      expect(missing, m).toEqual([])
      expect(text.length, m).toBeGreaterThan(0)
    }
  })
})
