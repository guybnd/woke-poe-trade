// The campaign tracker keeps one route per character (WOKEPOET-90).
import { describe, it, expect } from 'vitest'
import { emptyState, saveCharacter, shouldSwitch, switchCharacter, MAX_SAVED_CHARS, SWITCH_QUIET_MS } from '@/web/woke/campaign/widget'
import type { CampaignWidget } from '@/web/woke/campaign/widget'

function widget (): CampaignWidget {
  return { state: { ...emptyState(), charName: 'Mirelle', className: 'Witch', level: 30, areaId: '1_3_2', act: 3, gemsGot: ['Arc'], stepStarts: { 39: 5 } }, step: 40 } as unknown as CampaignWidget
}

describe('campaign tracker per character', () => {
  it('switches only after two level-ups in a row while the followed character has gone quiet', () => {
    const now = 100 * SWITCH_QUIET_MS
    expect(shouldSwitch('Mirelle', 'Kaelor', 2, now - SWITCH_QUIET_MS, now)).toBe(true)
    // A party member catching up while you level too: never.
    expect(shouldSwitch('Mirelle', 'Kaelor', 5, now - 60_000, now)).toBe(false)
    // One level-up, even from a high-level character: not yet.
    expect(shouldSwitch('Mirelle', 'Kaelor', 1, 0, now)).toBe(false)
    expect(shouldSwitch('', 'Kaelor', 5, 0, now)).toBe(false)
    expect(shouldSwitch('Mirelle', 'Mirelle', 5, 0, now)).toBe(false)
  })

  it('puts the followed character away and brings it back with its own step, gems and step times', () => {
    const w = widget()
    switchCharacter(w, { charName: 'Kaelor', className: 'Marauder', level: 92 }, 0)
    expect(w.state.charName).toBe('Kaelor')
    expect(w.state.gemsGot).toEqual([])
    expect(w.state.areaId).toBe('1_3_2')
    expect(w.chars?.Mirelle?.step).toBe(40)

    switchCharacter(w, { charName: 'Mirelle', className: 'Witch', level: 31 }, 0)
    expect(w.step).toBe(40)
    expect(w.state.gemsGot).toEqual(['Arc'])
    expect(w.state.stepStarts).toEqual({ 39: 5 })
    expect(w.state.level).toBe(31)
    expect(w.chars?.Mirelle).toBeUndefined()
    expect(w.chars?.Kaelor?.state.level).toBe(92)
  })

  it('starts a character seen for the first time at the given step', () => {
    const w = widget()
    switchCharacter(w, { charName: 'Newbie', className: 'Ranger', level: 12 }, 17)
    expect(w.step).toBe(17)
  })

  it('saves a copy that later edits to the followed state don\'t reach, and keeps only the most recent characters', () => {
    const w = widget()
    saveCharacter(w)
    w.state.gemsGot!.push('Spark')
    w.state.stepStarts = {}
    expect(w.chars?.Mirelle?.state.gemsGot).toEqual(['Arc'])
    expect(w.chars?.Mirelle?.state.stepStarts).toEqual({ 39: 5 })
    for (let i = 0; i < MAX_SAVED_CHARS + 5; i++) {
      w.state = { ...emptyState(), charName: `Alt${i}`, updatedAt: i }
      saveCharacter(w)
    }
    expect(Object.keys(w.chars ?? {}).length).toBe(MAX_SAVED_CHARS)
  })
})

describe('campaign tracker per character, edge cases', () => {
  it('a new character with an old one\'s name starts fresh', () => {
    const w = widget()
    switchCharacter(w, { charName: 'Kaelor', className: 'Marauder', level: 60 }, 0)
    // A new Mirelle at level 2: the saved level-30 Mirelle is someone else.
    switchCharacter(w, { charName: 'Mirelle', className: 'Witch', level: 2 }, 3)
    expect(w.step).toBe(3)
    expect(w.state.gemsGot).toEqual([])
  })
})
