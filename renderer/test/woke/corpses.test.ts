import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CORPSE_MONSTERS, isCorpse } from '@/web/woke/shared/corpses'

const items: Array<{ name: string, namespace: string, craftable?: unknown }> = readFileSync(join(__dirname, '../../public/data/en/items.ndjson'), 'utf8')
  .trim().split('\n').map(l => JSON.parse(l))

describe('corpses', () => {
  it('lists every monster the item data has a Perfect and an Imperfect corpse of', () => {
    const names = new Set(items.filter(i => i.namespace === 'ITEM' && !i.craftable).map(i => i.name))
    const inData = [...names].filter(n => n.startsWith('Perfect ') && names.has(`Imperfect ${n.slice('Perfect '.length)}`)).map(n => n.slice('Perfect '.length))
    expect([...CORPSE_MONSTERS].sort()).toEqual(inData.sort())
  })

  it('knows a corpse by any of its three names', () => {
    expect(isCorpse('Perfect Hydra')).toBe(true)
    expect(isCorpse('Imperfect Guardian Turtle')).toBe(true)
    expect(isCorpse('Meatsack')).toBe(true)
    expect(isCorpse('Perfect Jewel')).toBe(false)
    expect(isCorpse('Divine Orb')).toBe(false)
  })
})
