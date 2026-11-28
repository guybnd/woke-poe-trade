// The game's own sound volume (main/src/woke/sound-volume.ts), which scales
// the loot filter's sound preview to how loud the game plays it.
import { describe, it, expect } from 'vitest'
import { soundGainFrom } from '../../main/src/woke/sound-volume'

describe('soundGainFrom', () => {
  it('is the game master volume times its item filter volume', () => {
    expect(soundGainFrom({ SOUND: { master_volume2: '9', item_filter_sound_volume2: '36' } })).toBeCloseTo(0.0324)
    expect(soundGainFrom({ SOUND: { master_volume: '50', item_filter_sound_volume: '100' } })).toBeCloseTo(0.5)
  })

  it('is full volume when the values are missing or odd, never above it', () => {
    expect(soundGainFrom({})).toBe(1)
    expect(soundGainFrom({ SOUND: { master_volume2: 'x', item_filter_sound_volume2: '' } })).toBe(1)
    expect(soundGainFrom({ SOUND: { master_volume2: '250' } })).toBe(1)
    expect(soundGainFrom({ SOUND: { master_volume2: '0' } })).toBe(0)
  })
})
