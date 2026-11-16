// Guy's screenshot: a twice-corrupted String of Servitude opened its Corrupted
// chip on Uncorrupted, so the search left out every belt like it.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { createFilters } from '@/web/price-check/filters/create-item-filters'
/* eslint-enable import/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false, exact: true }

const belt = (...tail: string[]) => [
  'Item Class: Belts', 'Rarity: Unique', 'String of Servitude', 'Heavy Belt', '--------',
  'Item Level: 84', '--------',
  '{ Implicit Modifier — Attribute }', '+75(75-105) to Strength (implicit)', '--------',
  '{ Corruption Implicit Modifier — Life }', '+(4-5)% to maximum Life (implicit)',
  '{ Corruption Implicit Modifier — Elemental, Resistance }', '+(12-16)% to all Elemental Resistances (implicit)', '--------',
  '{ Unique Modifier }', 'Implicit Modifier magnitudes are tripled',
  '--------',
  'Ties of fear, ties of hope.',
  ...tail, ''
].join('\n')

const opening = (text: string) => {
  const item = parseItem(text)
  return { corrupted: item.isCorrupted, search: createFilters(item, OPTS).corrupted?.search }
}

describe('twice-corrupted items', () => {
  beforeAll(loadGameData)

  it.each(['Corrupted', 'Twice Corrupted', 'Twice-Corrupted'])('reads the "%s" line', (line) => {
    expect(opening(belt('--------', line))).toEqual({ corrupted: true, search: 'corrupted' })
  })

  it('counts a corruption implicit as corrupted when the line is not recognised', () => {
    expect(opening(belt('--------', 'Doubly Tainted'))).toEqual({ corrupted: true, search: 'corrupted' })
  })

  it('counts a corruption implicit as corrupted with no line at all', () => {
    expect(opening(belt())).toEqual({ corrupted: true, search: 'corrupted' })
  })

  it('does not take a lowercase "... while Corrupted" line for the mark', () => {
    const plain = belt('--------', 'Socketed Gems are Supported while Corrupted')
      .replace(/\{ Corruption Implicit[^\n]*\n[^\n]*\n/g, '')
    expect(parseItem(plain).isCorrupted).toBe(false)
  })
})
