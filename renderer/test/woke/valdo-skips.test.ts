// Valdo map skips (valdo/skips.ts): mods a build can't run, read from each
// loaded listing since the trade site searches only a Valdo map's Void mod.
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/web/Config', () => ({ AppConfig: () => ({ widgets: [], woke: { off: [] } }) }))

/* eslint-disable import-x/first */
import { isSkipped, listingMarks, listingModLines, profileSkips, rememberSeen, setSkipped, skipKey, skippedBy, valdoHides, VOID_TEXT } from '@/web/woke/valdo/skips'
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

describe('valdo mods met so far', () => {
  it('remembers each mod once, numbers as #, never the Void', () => {
    const w: { valdoSeen?: string[] } = {}
    expect(rememberSeen(w, ['Players deal 10% less Damage per Equipped Item', 'Area contains The Feared', VOID_TEXT])).toBe(true)
    expect(rememberSeen(w, ['Players deal 20% less Damage per Equipped Item'])).toBe(false)
    expect(w.valdoSeen).toEqual(['Players deal #% less Damage per Equipped Item', 'Area contains The Feared'])
  })
  it('keeps the newest 300', () => {
    const w: { valdoSeen?: string[] } = {}
    rememberSeen(w, Array.from({ length: 310 }, (_, i) => `Mod number${'x'.repeat(i)}`))
    expect(w.valdoSeen).toHaveLength(300)
    expect(w.valdoSeen![299]).toBe(`Mod number${'x'.repeat(309)}`)
  })
  it('reads a listing\'s first lines, without the minions line', () => {
    expect(listingModLines({ explicitMods: ['Players deal 10% less Damage per Equipped Item\nPlayers\' Minions deal 10% less Damage', 'Players\' Minions have 10% less Life', { description: 'Area contains The Feared' }] } as never))
      .toEqual(['Players deal 10% less Damage per Equipped Item', 'Area contains The Feared'])
    expect(listingModLines(undefined)).toEqual([])
  })
})

describe('valdo listing marks', () => {
  it('lists the rated mods on a listing, worst first, by any number', () => {
    const ratings = { 'Area contains The Feared': 'good', 'Players deal #% less Damage per Equipped Item': 'warn', 'Players cannot gain Flask Charges': 'deadly', 'Monsters cannot be Stunned': 'ok' } as const
    const item = { explicitMods: ['Area contains The Feared', 'Players deal 12% less Damage per Equipped Item\nPlayers\' Minions deal 12% less Damage', 'Players cannot gain Flask Charges', 'Monsters cannot be Stunned'] }
    expect(listingMarks(item as never, { ratings: { ...ratings } })).toEqual([
      { label: 'Players cannot gain Flask Charges', rating: 'deadly' },
      { label: 'Players deal #% less Damage per Equipped Item', rating: 'warn' },
      { label: 'Area contains The Feared', rating: 'good' }
    ])
    expect(listingMarks(undefined, { ratings: { ...ratings } })).toEqual([])
    expect(listingMarks(item as never, null)).toEqual([])
  })
})
