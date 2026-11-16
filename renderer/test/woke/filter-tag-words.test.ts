import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { parseFilter } from '../../src/web/woke/loot-filter/parse'
import { tierLabel } from '../../src/web/woke/loot-filter/names'
import { tagWords } from '../../src/web/woke/loot-filter/tag-words'

const FIXTURES = path.resolve(__dirname, '../../../testing/fixtures/filters/neversink')

// NeverSink's tags that still show as they are: shorthand with no safe reading
// (r01, maps_a_t14, idaj_caster). A new tag in a NeverSink update lands here
// and fails the test, so it gets a name or a place on this list.
const LEFT_RAW = new Set(`
2020z 2023 2120 21xx 6s 6sockets4h altany armors1q1 armors1q2 ecotinkbases ecotinkbases84 exforgesword exoticstiered
exrationaljewel exuberimpresence hh hideable2 idaj_attack idaj_caster idaj_minion idaj_mixer l1 l2 l3 l4 l5 l6 l7 l8
lt1 lt2 lt3 lt4 maps_a_t14 maps_a_t15 maps_a_t16 maps_b_t11 maps_b_t12 maps_b_t13 maps_c_t10 maps_c_t6 maps_c_t7
maps_c_t8 maps_c_t9 maps_d_t1 maps_d_t2 maps_d_t3 maps_d_t4 maps_d_t5 outdatedlevelflaska outdatedlevelflaskb
outdatedlevelflaskc outdatedlevelflaskd qt1 qt2 qt3 qt4 qt4lvl quiv_hit r01 r02 r03 r04 r05 r06 r07 r08 r09 r10 r11
r12 r13 r14 r15bas t3stackedex rrihide1 rrihide2 rrihide3 rrihide4 t4c t5c v83 v84 v85 v86 w1 w2 w3 wamuletsblend wbeltsblend
wcastermin weapont1q1 weapont1q2 weapont2q1 weapont2q2 weleattackblend wringsblend wsmallarmorsblend xx20z xx23
`.trim().split(/\s+/))

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

  it('names every tag in NeverSink\'s filters, apart from the listed shorthand', () => {
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
    expect([...raw].filter(t => !LEFT_RAW.has(t)).sort()).toEqual([])
  })
})
