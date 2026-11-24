// Valdo map skips (valdo/skips.ts): mods a build can't run, read from each
// loaded listing since the trade site searches only a Valdo map's Void mod.
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/web/Config', () => ({ AppConfig: () => ({ widgets: [], woke: { off: [] } }) }))

/* eslint-disable import-x/first */
import { isSkipped, profileSkips, setSkipped, skipKey, skippedBy, valdoHides, VOID_TEXT } from '@/web/woke/valdo/skips'
import { copyOfProfile, defaultProfile } from '@/web/woke/map-mods/rules'
import type { MapModProfile } from '@/web/woke/map-mods/rules'
/* eslint-enable import-x/first */

function profile (ratings: MapModProfile['ratings'] = {}): MapModProfile {
  return { ...defaultProfile(), ratings }
}

describe('Valdo skips', () => {
  it('keys ignore numbers, case, the minions line and Unscalable Value', () => {
    expect(skipKey('Players deal 10% less Damage per Equipped Item\nPlayers\' Minions deal 10% less Damage per Item Equipped by their Master'))
      .toBe(skipKey('Players deal #% less Damage per Equipped Item'))
    expect(skipKey('Players cannot gain Flask Charges — Unscalable Value')).toBe(skipKey('players cannot gain flask charges'))
    expect(skipKey('Rare and Unique Monsters in Area are Possessed by 3 to 4 Tormented Spirits'))
      .toBe('rare and unique monsters in area are possessed by # to # tormented spirits')
  })

  it('fills itself from the profile\'s can\'t run map mods, never the Void', () => {
    const p = profile({
      'Players cannot Regenerate Life, Mana or Energy Shield': 'deadly',
      'Players have #% less Recovery Rate of Life and Energy Shield': 'warn',
      [VOID_TEXT]: 'deadly'
    })
    expect(profileSkips(p)).toEqual([{ key: skipKey('Players cannot Regenerate Life, Mana or Energy Shield'), label: 'Players cannot Regenerate Life, Mana or Energy Shield', auto: true }])
  })

  it('adds and removes a Valdo mod, and turns an automatic one off and on', () => {
    const p = profile({ 'Players cannot Regenerate Life, Mana or Energy Shield': 'deadly' })
    setSkipped(p, 'Players deal 10% less Damage per Equipped Item', true)
    expect(p.valdoSkip).toEqual(['Players deal #% less Damage per Equipped Item'])
    expect(isSkipped(p, 'Players deal 15% less Damage per Equipped Item')).toBe(true)
    // Twice is still one line.
    setSkipped(p, 'Players deal 15% less Damage per Equipped Item', true)
    expect(profileSkips(p)).toHaveLength(2)

    setSkipped(p, 'Players cannot Regenerate Life, Mana or Energy Shield', false)
    expect(isSkipped(p, 'Players cannot Regenerate Life, Mana or Energy Shield')).toBe(false)
    // The Map mods rating itself is left alone.
    expect(p.ratings['Players cannot Regenerate Life, Mana or Energy Shield']).toBe('deadly')
    setSkipped(p, 'Players cannot Regenerate Life, Mana or Energy Shield', true)
    expect(p.valdoKeep).toBeUndefined()
    expect(p.valdoSkip).toEqual(['Players deal #% less Damage per Equipped Item'])

    setSkipped(p, 'Players deal #% less Damage per Equipped Item', false)
    expect(p.valdoSkip).toBeUndefined()
    setSkipped(p, VOID_TEXT, true)
    expect(isSkipped(p, VOID_TEXT)).toBe(false)
  })

  it('finds a skipped mod on a listing, by any line of any mod', () => {
    const keys = new Set([skipKey('Players cannot gain Flask Charges')])
    expect(skippedBy({ explicitMods: [VOID_TEXT, { description: 'Players cannot gain Flask Charges' }] }, keys)).not.toBeNull()
    expect(skippedBy({ explicitMods: ['Area contains The Feared'] }, keys)).toBeNull()
    expect(skippedBy({ explicitMods: ['Players cannot gain Flask Charges'] }, new Set())).toBeNull()
    expect(skippedBy(undefined, keys)).toBeNull()
    const minions = new Set([skipKey('Players\' Minions deal 10% less Damage per Item Equipped by their Master')])
    expect(skippedBy({ explicitMods: ['Players deal 10% less Damage per Equipped Item\nPlayers\' Minions deal 10% less Damage per Item Equipped by their Master'] }, minions)).not.toBeNull()
  })

  it('hides a listing with a Not mod, or without a Has mod', () => {
    const flask = skipKey('Players cannot gain Flask Charges')
    const feared = skipKey('Area contains The Feared')
    const a = { explicitMods: ['Players cannot gain Flask Charges', 'Area contains The Feared'] }
    const b = { explicitMods: ['Area contains The Feared'] }
    const c = { explicitMods: ['Players cannot Suppress Spell Damage'] }
    const none = new Set<string>()
    expect(valdoHides(a, new Set([flask]), none)).toBe(true)
    expect(valdoHides(b, new Set([flask]), none)).toBe(false)
    expect(valdoHides(c, none, new Set([feared]))).toBe(true)
    expect(valdoHides(b, none, new Set([feared]))).toBe(false)
    expect(valdoHides(c, none, none)).toBe(false)
    // Has for this check wins over the same mod's saved Not.
    expect(valdoHides(a, new Set([flask]), new Set([flask]))).toBe(false)
  })

  it('a copied profile has its own skip list', () => {
    const p = profile()
    setSkipped(p, 'Players cannot gain Flask Charges', true)
    const copy = copyOfProfile(p, 2)
    setSkipped(copy, 'Players cannot gain Flask Charges', false)
    expect(isSkipped(p, 'Players cannot gain Flask Charges')).toBe(true)
  })
})
