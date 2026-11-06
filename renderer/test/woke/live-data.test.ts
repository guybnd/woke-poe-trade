// Item and stat data swapped in while the app runs, and the hashes it's checked by.
import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { ITEM_BY_REF, STAT_BY_REF_V2, stat, useLiveData } from '@/assets/data'
import { buildItemIndexes, buildStatIndexes } from '@/assets/data/build-indexes'
import { currentHashes, sharedHashes, SHARED } from '@/assets/bump-data-version.mjs'
import { loadGameData } from '../helpers/game-data'

const DATA = path.resolve(__dirname, '../../public/data')
const read = (lang: string, name: string) => fs.readFileSync(path.join(DATA, lang, name), 'utf8')
const bin = (lang: string, name: string) => {
  const b = fs.readFileSync(path.join(DATA, lang, name))
  return new Uint32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
}

beforeAll(loadGameData)

describe('downloaded data\'s lookup tables', () => {
  it.each(['en', 'ru', 'cmn-Hant', 'ko'])('are the same as the build\'s for %s', (lang) => {
    const items = buildItemIndexes(read(lang, 'items.ndjson'))
    expect(items.names).toEqual(bin(lang, 'items-name.index.bin'))
    expect(items.refNames).toEqual(bin(lang, 'items-ref.index.bin'))
    const stats = buildStatIndexes(read(lang, 'stats.ndjson'))
    expect(stats.refs).toEqual(bin(lang, 'stats-ref.index.bin'))
    expect(stats.matchers).toEqual(bin(lang, 'stats-matcher.index.bin'))
  })
})

describe('useLiveData', () => {
  const items = read('en', 'items.ndjson')
  const stats = read('en', 'stats.ndjson')
  const NEW_ITEM = JSON.stringify({ name: 'Brand New Mirror', refName: 'Brand New Mirror', namespace: 'ITEM', icon: '' })

  it('makes a new item findable straight away', () => {
    expect(ITEM_BY_REF('ITEM', 'Brand New Mirror')).toBeUndefined()
    useLiveData('en', `${items}${NEW_ITEM}\n`, stats)
    expect(ITEM_BY_REF('ITEM', 'Brand New Mirror')?.[0].name).toBe('Brand New Mirror')
    // The data everything else already relied on is still there.
    expect(ITEM_BY_REF('ITEM', 'Chaos Orb')).toBeDefined()
    useLiveData('en', items, stats)
    expect(ITEM_BY_REF('ITEM', 'Brand New Mirror')).toBeUndefined()
  })

  it('refuses data missing a stat the app needs, and keeps what it had', () => {
    const needed = stat('+#% to Fire Resistance')
    expect(STAT_BY_REF_V2(needed)).toBeDefined()
    const without = stats.split('\n').filter(l => !l.includes('"ref":"+#% to Fire Resistance"')).join('\n')
    expect(() => { useLiveData('en', items, without) }).toThrow('Cannot find stat')
    expect(STAT_BY_REF_V2(needed)).toBeDefined()
  })

  it('refuses data missing an item the price check relies on', () => {
    const without = items.split('\n').filter(l => !l.includes('"refName":"Map"')).join('\n')
    expect(() => { useLiveData('en', without, stats) }).toThrow('Cannot find item')
    expect(ITEM_BY_REF('ITEM', 'Map')).toBeDefined()
  })

  it('refuses broken data, and keeps what it had', () => {
    expect(() => { useLiveData('en', '{"name":\n', stats) }).toThrow()
    expect(() => { useLiveData('en', items, 'no new line') }).toThrow()
    expect(() => { useLiveData('en', '', stats) }).toThrow()
    expect(ITEM_BY_REF('ITEM', 'Chaos Orb')).toBeDefined()
  })
})

describe('data-version.json', () => {
  it('matches the data files. If not: node src/assets/bump-data-version.mjs', () => {
    const manifest = JSON.parse(read('', 'data-version.json')) as { format: number, version: number, files: unknown }
    expect(manifest.format).toBe(1)
    expect(manifest.files).toEqual(currentHashes())
  })

  it('has the tooltips\' and tree\'s hashes too. If not: node src/assets/bump-data-version.mjs', () => {
    const manifest = JSON.parse(read('', 'data-version.json')) as { shared: unknown }
    expect(manifest.shared).toEqual(sharedHashes())
  })

  it('lists the same shared files main downloads', () => {
    const main = fs.readFileSync(path.resolve(__dirname, '../../../main/src/woke/live-data.ts'), 'utf8')
    const listed = /SHARED_FILES = (\[[^\]]*\])/.exec(main)![1].replace(/'/g, '"')
    expect(JSON.parse(listed)).toEqual(SHARED)
  })
})
