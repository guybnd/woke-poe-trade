// The campaign tracker keeps one route per character (WOKEPOET-90).
import { describe, it, expect } from 'vitest'
import { emptyState, shouldSwitch, switchCharacter, PAST_CAMPAIGN_LEVEL } from '@/web/woke/campaign/widget'
import type { CampaignWidget } from '@/web/woke/campaign/widget'

function widget (): CampaignWidget {
  return { state: { ...emptyState(), charName: 'Mirelle', className: 'Witch', level: 30, areaId: '1_3_2', act: 3, gemsGot: ['Arc'] }, step: 40 } as unknown as CampaignWidget
}

describe('campaign tracker per character', () => {
  it('switches at once to a character past the campaign, and after two level-ups in a row to a levelling one', () => {
    expect(shouldSwitch('Mirelle', 'Kaelor', PAST_CAMPAIGN_LEVEL, 1)).toBe(true)
    expect(shouldSwitch('Mirelle', 'Kaelor', 20, 1)).toBe(false)
    expect(shouldSwitch('Mirelle', 'Kaelor', 20, 2)).toBe(true)
    expect(shouldSwitch('', 'Kaelor', 90, 5)).toBe(false)
    expect(shouldSwitch('Mirelle', 'Mirelle', 31, 5)).toBe(false)
  })

  it('puts the followed character away and brings it back with its own step and gems', () => {
    const w = widget()
    switchCharacter(w, { charName: 'Kaelor', className: 'Marauder', level: 92 }, 0)
    expect(w.state.charName).toBe('Kaelor')
    expect(w.state.asleep).toBe(true)
    expect(w.state.gemsGot).toEqual([])
    expect(w.state.areaId).toBe('1_3_2')
    expect(w.chars?.Mirelle?.step).toBe(40)

    switchCharacter(w, { charName: 'Mirelle', className: 'Witch', level: 31 }, 0)
    expect(w.step).toBe(40)
    expect(w.state.gemsGot).toEqual(['Arc'])
    expect(w.state.level).toBe(31)
    expect(w.chars?.Mirelle).toBeUndefined()
    expect(w.chars?.Kaelor?.state.level).toBe(92)
  })

  it('starts a character seen for the first time at the given step', () => {
    const w = widget()
    switchCharacter(w, { charName: 'Newbie', className: 'Ranger', level: 12 }, 17)
    expect(w.step).toBe(17)
    expect(w.state.asleep).toBeFalsy()
  })
})
