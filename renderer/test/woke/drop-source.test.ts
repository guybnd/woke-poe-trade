import { describe, expect, it } from 'vitest'
import { shortSource } from '../../scripts/drop-source.mjs'
import { dropLines, dropSource, randomDropsFirst } from '@/web/woke/ui/tooltip/tip-content'

describe('a restricted unique in a word or two', () => {
  it('names the boss from the drop text', () => {
    expect(shortSource({ text: 'Drops from Uber Eater.' }).s).toBe('Uber Eater')
    expect(shortSource({ text: 'Only drops from Uber Atziri.' }).s).toBe('Uber Atziri')
    // A boss with its title is still one boss.
    expect(shortSource({ text: 'Drops from Aul, the Crystal King.' }).s).toBe('Aul')
  })
  it('says the mechanic when several bosses drop it', () => {
    expect(shortSource({ text: 'Drops from Altered Synthete, Augmented Synthete, Twisted Synthete.', tags: ['Synthesis'] }).s).toBe('Synthesis')
    expect(shortSource({ text: 'Drops from Incarnation of Neglect, Incarnation of Fear.', monsters: ['Incarnation of Neglect', 'Incarnation of Fear'] }).s).toBe('Incarnations')
  })
  it('reads recipes, mechanics and places', () => {
    expect(shortSource({ text: 'This version is only obtainable from vendor matching unique Topaz Rings as vendor recipe, or from divination cards.' }).s).toBe('Vendor recipe')
    expect(shortSource({ text: 'Obtained randomly as a reward for shipping resources from Kingsmarch to Riben Fell.' }).s).toBe('Kingsmarch')
    expect(shortSource({ text: 'Replicas can be obtained from Curio Displays in the final reward rooms of any Grand Heist.' }).s).toBe('Heist')
    expect(shortSource({ text: 'Can drop from Runic monsters in Expeditions or Logbooks.' }).s).toBe('Expedition')
    expect(shortSource({ text: 'Drops from Astral monsters in Mirages.' }).s).toBe('Mirage')
    expect(shortSource({ text: 'Can drop at a fixed 50% drop rate from final map bosses in the Legacy of Phrecia event.', disabled: true }).s).toBe('Event only')
    expect(shortSource({ text: 'Broadstroke is drop disabled. It can be acquired from existing owners.', disabled: true }).s).toBe('No drop')
  })
  it('falls back to the league tag, and flags a restriction with no source', () => {
    expect(shortSource({ tags: ['league-specific', 'Breach'] }).s).toBe('Breach')
    expect(shortSource({ tags: ['corruption transformation'] }).s).toBe('Vaal Orb')
    expect(shortSource({ disabled: true })).toEqual({ s: 'No drop' })
    expect(shortSource({})).toEqual({ s: 'Restricted', guess: true })
  })
})

describe('the chip on a unique list', () => {
  it('has a label and the wiki sentence', () => {
    expect(dropSource({ r: 1, t: 'Drops from Uber Eater.', s: 'Uber Eater' }))
      .toEqual({ label: 'Uber Eater', title: 'Not a random drop on this base. Drops from Uber Eater.' })
    expect(dropSource({ r: 1 })?.label).toBe('Restricted')
    expect(dropSource({ d: 1 })?.label).toBe('No drop')
    expect(dropSource(undefined)).toBeNull()
    expect(dropSource({})).toBeNull()
  })
  it('lists random drops first, each side in its order', () => {
    const rows = [{ n: 'a', r: true }, { n: 'b', r: false }, { n: 'c', r: true }, { n: 'd', r: false }]
    expect(randomDropsFirst(rows, x => x.r).map(x => x.n)).toEqual(['b', 'd', 'a', 'c'])
  })
  it('names the source on the tooltip, unless it is a guess', () => {
    const first = (drop: Parameters<typeof dropLines>[0]) => dropLines(drop)[0].map(p => p.text).join('')
    expect(first({ r: 1, s: 'Kingsmarch' })).toBe('Not a random drop: Kingsmarch')
    expect(first({ r: 1, s: 'Restricted', u: 1 })).toBe('Restricted drop: not a random drop on its base')
  })
})
