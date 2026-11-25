import { describe, expect, it } from 'vitest'
import { LABEL_OPENS, dismissWelcome, labelsShown, startWelcome, welcomePhase } from '@/web/woke/tab-bar/welcome'
import type { WokeModulesConfig } from '@/web/woke/modules'

const fresh = (): WokeModulesConfig => ({ setupDone: false, off: [] })

describe('first-run help', () => {
  it('starts with the card, then names the rail buttons for a few opens', () => {
    const woke = fresh()
    startWelcome(woke)
    expect(welcomePhase(woke.welcome)).toBe('card')
    // An overlay close while the card was up doesn't use up a labels open.
    labelsShown(woke.welcome)
    expect(woke.welcome!.labelOpens).toBe(LABEL_OPENS)
    dismissWelcome(woke.welcome)
    for (let i = 0; i < LABEL_OPENS; i++) {
      expect(welcomePhase(woke.welcome)).toBe('labels')
      labelsShown(woke.welcome)
    }
    expect(welcomePhase(woke.welcome)).toBe(null)
    labelsShown(woke.welcome)
    expect(woke.welcome!.labelOpens).toBe(0)
  })

  it('players who updated never get it, and running setup again does not restart it', () => {
    expect(welcomePhase(undefined)).toBe(null)
    const woke = fresh()
    startWelcome(woke)
    dismissWelcome(woke.welcome)
    startWelcome(woke)
    expect(welcomePhase(woke.welcome)).toBe('labels')
  })
})

describe("what's new", () => {
  it('a fresh setup sees nothing new; seen lines drop out once their line is gone', async () => {
    const { NEWS, markNewsSeen, newsFor } = await import('@/web/woke/tab-bar/news')
    const woke = fresh()
    const first = NEWS[0]
    expect(newsFor(first.wmType, woke.seenNews, '0.0.0-test')?.id).toBe(first.id)
    startWelcome(woke)
    expect(NEWS.every(n => newsFor(n.wmType, woke.seenNews, '0.0.0-test') == null)).toBe(true)
    const other = fresh()
    other.seenNews = ['gone-line']
    markNewsSeen(other, [first.id])
    expect(other.seenNews).toEqual([first.id])
  })
})

describe('starter pins', () => {
  it('takes the first five tools that are on', async () => {
    const { pickStarterPins, STARTER_PIN_COUNT } = await import('@/web/woke/tab-bar/tools')
    expect(pickStarterPins(() => true)).toHaveLength(STARTER_PIN_COUNT)
    // Leveling: no market or map mods.
    const leveling = pickStarterPins(t => !['woke-market-tracker', 'woke-map-mods', 'woke-atlas-strategies', 'woke-trade', 'woke-scarab-flip', 'woke-trade-searches'].includes(t))
    expect(leveling).toEqual(['woke-pob-builds', 'woke-run-timer', 'woke-lab', 'woke-regex-library', 'woke-challenges'])
    expect(pickStarterPins(() => false)).toEqual([])
  })
})
