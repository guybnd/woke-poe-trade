import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { parseFilter } from '../../src/web/woke/loot-filter/parse'
import { tierLabel } from '../../src/web/woke/loot-filter/names'
import { tagWords } from '../../src/web/woke/loot-filter/tag-words'

const FIXTURES = path.resolve(__dirname, '../../../testing/fixtures/filters/neversink')

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

describe('NeverSink tag names', () => {
  it('splits squashed tags into words', () => {
    expect(tagWords('exjewelscorrupted')).toBe('Special jewels corrupted')
    expect(tagWords('topilvl84')).toBe('Top item level 84')
    expect(tagWords('rgbsmall1')).toBe('RGB small 1')
    expect(tagWords('anynonbelt')).toBe('Any non-belts')
    expect(tagWords('2xabyss')).toBe('2× abyss')
    expect(tagWords('2023')).toBeNull()
    expect(tagWords('qt1')).toBeNull()
  })

  it('names NeverSink\'s shorthand from what its rules catch', () => {
    expect(tierLabel('maps_a_t16')).toBe('Map tier 16+, red')
    expect(tierLabel('maps_c_t7')).toBe('Map tier 7, yellow')
    expect(tierLabel('maps_d_t1')).toBe('Map tier 1, white')
    expect(tierLabel('r01')).toBe('Drop level 5+, item level up to 9')
    expect(tierLabel('idaj_caster')).toBe('Abyss jewel caster')
    expect(tierLabel('2123any')).toBe('Level 21+, quality 23+, any gem')
  })

  // A new tag in a NeverSink update that shows raw fails here, so it gets a
  // name in names.ts.
  it('names every tag in NeverSink\'s filters', () => {
    const raw = new Set<string>()
    for (const f of fs.readdirSync(FIXTURES).filter(f => f.endsWith('.filter.gz'))) {
      const doc = parseFilter(zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, f))).toString('utf8'))
      for (const b of doc.blocks) {
        if (b.kind !== 'block') continue
        if (b.tier && !b.tier.startsWith('#')) {
          const label = tierLabel(b.tier)
          const m = /^t(\d+)([a-z_]+)$/.exec(b.tier)
          if (!tagWords(b.tier) && (label === capital(b.tier) || (m && label === `Tier ${m[1]} ${m[2]}`))) raw.add(b.tier)
        }
      }
    }
    expect([...raw].sort()).toEqual([])
  })
})
