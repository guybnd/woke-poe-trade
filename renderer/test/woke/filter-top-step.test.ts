// The top step: red text on white for every class, border/beam/icon by class.
import { describe, it, expect } from 'vitest'
import { TOP_ACCENTS, topStepActions } from '@/web/woke/loot-filter/top-step'
import type { TopClass } from '@/web/woke/loot-filter/top-step'

const BEAMS = new Set(['Red', 'Green', 'Blue', 'Brown', 'White', 'Yellow', 'Cyan', 'Grey', 'Orange', 'Pink', 'Purple'])
const SHAPES = new Set(['Circle', 'Diamond', 'Hexagon', 'Square', 'Star', 'Triangle', 'Cross', 'Moon', 'Raindrop', 'Kite', 'Pentagon', 'UpsideDownHouse'])

describe('top step', () => {
  it('keeps red on white and gives each class its own accent', () => {
    const seen = new Set<string>()
    for (const cls of Object.keys(TOP_ACCENTS) as TopClass[]) {
      const act = (k: string) => topStepActions(cls).find(x => x.key === k)?.args.join(' ')
      expect(act('SetTextColor')).toBe('255 0 0 255')
      expect(act('SetBackgroundColor')).toBe('255 255 255 255')
      const t = TOP_ACCENTS[cls]
      expect(BEAMS.has(t.beam) && BEAMS.has(t.icon) && SHAPES.has(t.shape), cls).toBe(true)
      expect(seen.has(t.beam), `${cls} beam`).toBe(false)
      seen.add(t.beam)
    }
    expect(topStepActions('currency').find(x => x.key === 'SetBorderColor')?.args.join(' ')).toBe('255 0 0 255')
  })
})
