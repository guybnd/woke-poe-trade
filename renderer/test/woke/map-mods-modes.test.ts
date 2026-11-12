// Map mods tabs: which mods each one lists, the T17 switch, the sorted list, and
// the verdict on heist items and charts. The chart is real item text from the game.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'
import { allAreaMods, chartMods, heistMods, modsForMode, profileRegex, tier17Mods } from '@/web/woke/map-mods/data'
import { MAX_SEARCH_LENGTH } from '@/web/woke/map-mods/regex'
import { defaultProfile, modListRows, setSearchOption } from '@/web/woke/map-mods/rules'
import type { MapModProfile } from '@/web/woke/map-mods/rules'
import { DEFAULT_JUICE_WEIGHTS } from '@/web/woke/map-mods/rules'
import { checkMap, isMapLike } from '@/web/woke/map-mods/check'
import { importAptOnce } from '@/web/woke/map-mods/widget'
import type { MapModsWidget } from '@/web/woke/map-mods/widget'

const config = vi.hoisted(() => ({ widgets: [] as unknown[] }))
vi.mock('@/web/Config', () => ({ AppConfig: () => config, pushHostConfig: () => {} }))

const DROWNING = 'Area contains Drowning Orbs'
const GUARDS = 'Guards deal #% increased Damage'

function profile (ratings: MapModProfile['ratings'], extra: Partial<MapModProfile> = {}): MapModProfile {
  return { ...defaultProfile(), ratings, ...extra }
}

function widget (p: MapModProfile, extra: Partial<MapModsWidget> = {}): MapModsWidget {
  return { activeProfile: p.id, profiles: [p], weights: { ...DEFAULT_JUICE_WEIGHTS }, ...extra } as MapModsWidget
}

beforeAll(loadGameData)

describe('mods per tab', () => {
  it('every chart mod is one the stat data can read', () => {
    for (const m of [
      'Monsters fire # additional Projectiles',
      '#% Monster Chaos Resistance',
      'Monsters Blind on Hit',
      'Monsters have #% chance to Blind on Hit',
      'Monsters inflict # Grasping Vines on Hit',
      "Monsters' Action Speed cannot be modified to below Base Value"
    ]) expect(chartMods()).toContain(m)
    expect(chartMods().length).toBeGreaterThanOrEqual(46)
  })

  it('heist mods are their own list and stay out of Maps, even when rated', () => {
    expect(heistMods()).toContain(GUARDS)
    expect(allAreaMods()).not.toContain(GUARDS)
    const maps = modsForMode('maps', profile({}, { heistRatings: { [GUARDS]: 'deadly' } }))
    expect(maps).not.toContain(GUARDS)
    expect(modsForMode('heist', profile({}))).toContain(GUARDS)
  })

  it('a mod rated from a card stays visible on its tab, to be un-rated', () => {
    const p = profile({}, { chartRatings: { 'Monsters have #% increased Attack Speed': 'warn' } })
    expect(modsForMode('charts', p)).toContain('Monsters have #% increased Attack Speed')
    expect(modsForMode('maps', p)).not.toContain('Monsters have #% increased Attack Speed')
  })

  it('the T17 switch takes T17 mods out of Maps only', () => {
    expect(tier17Mods().has(DROWNING)).toBe(true)
    expect(modsForMode('maps', profile({}))).toContain(DROWNING)
    expect(modsForMode('maps', profile({}, { hideT17: true }))).not.toContain(DROWNING)
    expect(modsForMode('maps', profile({ [DROWNING]: 'deadly' }, { hideT17: true }))).not.toContain(DROWNING)
    // Charts roll this T17 line too; the switch is about maps.
    expect(modsForMode('charts', profile({}, { hideT17: true })))
      .toContain("Monsters' Action Speed cannot be modified to below Base Value")
  })

  it('a rated mod under an old wording stays visible on Maps', () => {
    expect(modsForMode('maps', profile({ 'Old patch wording': 'deadly' }))).toContain('Old patch wording')
  })
})

describe('map search', () => {
  it('leaves out T17 picks with the switch off, and keeps their ratings', () => {
    const p = profile({ [DROWNING]: 'deadly' })
    expect(profileRegex(p).tokens[DROWNING]).toBeTruthy()
    p.hideT17 = true
    expect(profileRegex(p).tokens[DROWNING]).toBeUndefined()
    expect(profileRegex(p).text).toBe('')
    expect(p.ratings[DROWNING]).toBe('deadly')
  })

  it('never mixes tabs: each search holds only its own picks', () => {
    const projectiles = 'Monsters fire # additional Projectiles'
    const p = profile(
      { 'Monsters reflect #% of Physical Damage': 'deadly' },
      { heistRatings: { [GUARDS]: 'deadly' }, chartRatings: { [projectiles]: 'deadly' } }
    )
    expect(Object.keys(profileRegex(p, 'maps').tokens)).toEqual(['Monsters reflect #% of Physical Damage'])
    expect(Object.keys(profileRegex(p, 'heist').tokens)).toEqual([GUARDS])
    expect(Object.keys(profileRegex(p, 'charts').tokens)).toEqual([projectiles])
  })

  it('finds a search token for every chart and heist mod', () => {
    const untokened = (mode: 'heist' | 'charts', mods: string[]) => mods.filter(m => {
      const list = { [m]: 'deadly' as const }
      const p = profile({}, mode === 'heist' ? { heistRatings: list } : { chartRatings: list })
      return !profileRegex(p, mode).tokens[m]
    })
    expect(untokened('charts', chartMods())).toEqual([])
    expect(untokened('heist', heistMods())).toEqual([])
  })

  it('heist has one row per mod, and its search token covers both wordings', () => {
    expect(heistMods()).toContain(GUARDS)
    expect(heistMods()).not.toContain('Guards deal #% reduced Damage')
    const token = profileRegex(profile({}, { heistRatings: { [GUARDS]: 'deadly' } }), 'heist').tokens[GUARDS]
    expect('guards deal 30% increased damage').toContain(token)
    expect('guards deal 30% reduced damage').toContain(token)
    expect('reinforcements have 30% reduced movement speed').not.toContain(token)
  })

  it('chart and heist tokens are long enough to miss random names', () => {
    const token = profileRegex(profile({}, { chartRatings: { 'Monsters have #% chance to Avoid Elemental Ailments': 'deadly' } }), 'charts')
      .tokens['Monsters have #% chance to Avoid Elemental Ailments']
    expect(token.length).toBeGreaterThanOrEqual(5)
    expect(fixture('items/chart-sandy-seabed.txt').toLowerCase()).not.toContain(token)
  })

  it('lists the wording of a chart mod that rolls as its negated one', () => {
    expect(chartMods()).toContain('#% less effect of Curses on Monsters')
  })

  it('highlight and auto-trim on one tab leave the others alone', () => {
    const p = profile(
      { 'Monsters reflect #% of Physical Damage': 'deadly' },
      { chartRatings: { 'Monsters are Hexproof': 'deadly' } }
    )
    const mapText = profileRegex(p, 'maps').text
    setSearchOption(p, 'charts', { highlight: 'bad', autoTrim: true })
    expect(profileRegex(p, 'maps').text).toBe(mapText)
    expect(p.highlight).toBe('good')
    expect(profileRegex(p, 'charts').text.startsWith('"!')).toBe(false)
  })

  it('minimums only go in the map search', () => {
    const p = profile({}, { mins: { quantity: 80 }, chartRatings: {} })
    expect(profileRegex(p, 'maps').text).toContain('tity')
    expect(profileRegex(p, 'charts').text).toBe('')
    expect(profileRegex(p, 'heist').text).toBe('')
  })

  it('the T17 switch leaves other tabs alone', () => {
    const action = "Monsters' Action Speed cannot be modified to below Base Value"
    const p = profile({}, { hideT17: true, chartRatings: { [action]: 'deadly' } })
    expect(profileRegex(p, 'charts').tokens[action]).toBeTruthy()
  })

  it('a chart search hides the real chart with that mod, and only by that mod', () => {
    const text = fixture('items/chart-sandy-seabed.txt').toLowerCase()
    const search = (matcher: string) => {
      const res = profileRegex(profile({}, { chartRatings: { [matcher]: 'deadly' } }), 'charts')
      expect(res.length).toBeLessThanOrEqual(MAX_SEARCH_LENGTH)
      return text.includes(res.tokens[matcher])
    }
    expect(search('Monsters fire # additional Projectiles')).toBe(true)
    expect(search('Monsters have #% increased Area of Effect')).toBe(true)
    expect(search('Monsters deal #% extra Physical Damage as Fire')).toBe(false)
    expect(search('Monsters are Hexproof')).toBe(false)
  })
})

describe('sorted list', () => {
  it('puts picks on top by rating, with a heading per group', () => {
    const rows = modListRows(['a', 'b', 'c', 'd'], { d: 'deadly', b: 'good' })
    expect(rows).toEqual([
      { kind: 'head', rating: 'deadly', count: 1 },
      { kind: 'mod', matcher: 'd' },
      { kind: 'head', rating: 'good', count: 1 },
      { kind: 'mod', matcher: 'b' },
      { kind: 'head', rating: 'ok', count: 2 },
      { kind: 'mod', matcher: 'a' },
      { kind: 'mod', matcher: 'c' }
    ])
  })

  it('has no headings when nothing is picked', () => {
    expect(modListRows(['a', 'b'], {})).toEqual([{ kind: 'mod', matcher: 'a' }, { kind: 'mod', matcher: 'b' }])
  })
})

describe('checking a chart', () => {
  const chart = () => parseItem(fixture('items/chart-sandy-seabed.txt'))

  it('reads all four mods, without the unrevealed Voyage line', () => {
    const item = chart()
    expect(isMapLike(item)).toBe(true)
    const res = checkMap(item, widget(profile({})))
    expect(res.verdict.mods.map(m => m.matcher).sort()).toEqual([
      'Area has patches of Shocked Ground which increase Damage taken by #%',
      'Monsters deal #% extra Physical Damage as Cold',
      'Monsters fire # additional Projectiles',
      'Monsters have #% increased Area of Effect'
    ])
    expect(res.unknown).toEqual([])
  })

  it('keeps the juice score from its rarity and pack size', () => {
    const res = checkMap(chart(), widget(profile({})))
    expect(res.props).toEqual([{ label: 'Rarity', value: 60 }, { label: 'Pack', value: 36 }])
    expect(res.juice?.score).toBeGreaterThan(0)
  })

  it('its verdict uses chart ratings, not map ratings', () => {
    const projectiles = 'Monsters fire # additional Projectiles'
    expect(checkMap(chart(), widget(profile({}, { chartRatings: { [projectiles]: 'deadly' } }))).verdict.verdict).toBe('skip')
    expect(checkMap(chart(), widget(profile({ [projectiles]: 'deadly' }, { chartRatings: {} }))).verdict.verdict).toBe('run')
  })
})

describe('checking a charted chart', () => {
  // Hand-written around the real chart: a charted one's text hasn't been seen.
  const charted = (implicit: string) => parseItem(
    fixture('items/chart-sandy-seabed.txt').replace('Voyage Modifier will be revealed once Charted', implicit)
  )

  it('shows a Voyage line it can\'t read as not recognised', () => {
    const res = checkMap(charted('Monsters in all Voyage Areas are at least Magic'), widget(profile({})))
    expect(res.unknown).toEqual(['Monsters in all Voyage Areas are at least Magic'])
    // The stat data has no implicit wording for this either.
    const res2 = checkMap(charted('Monster Damage Penetrates 10% Elemental Resistances'), widget(profile({})))
    expect(res2.unknown).toEqual(['Monster Damage Penetrates 10% Elemental Resistances'])
  })
})

describe('checking a heist contract', () => {
  const contract = () => parseItem([
    'Item Class: Contracts',
    'Rarity: Rare',
    'Silent Deal',
    'Contract: Bunker',
    '--------',
    'Client: Example',
    'Heist Target: Enchanted Armaments (Moderate Value)',
    'Area Level: 81',
    'Requires Lockpicking (Level 4)',
    '--------',
    'Item Level: 83',
    '--------',
    '{ Prefix Modifier "Example" (Tier: 1) }',
    'Guards deal 30% increased Damage',
    '{ Suffix Modifier "of Example" (Tier: 1) }',
    'No Travel Cost'
  ].join('\n'))

  it('rates its mods and has no juice score', () => {
    const item = contract()
    expect(isMapLike(item)).toBe(true)
    const res = checkMap(item, widget(profile({}, { heistRatings: { [GUARDS]: 'deadly' } })))
    expect(res.mode).toBe('heist')
    expect(res.verdict.verdict).toBe('skip')
    expect(res.verdict.deadly[0].text).toBe('Guards deal 30% increased Damage')
    expect(res.juice).toBeNull()
  })
})

describe('checking a contract with the opposite wording', () => {
  it('uses the rating of its row', () => {
    const item = parseItem([
      'Item Class: Contracts',
      'Rarity: Rare',
      'Silent Deal',
      'Contract: Bunker',
      '--------',
      'Client: Example',
      'Heist Target: Enchanted Armaments (Moderate Value)',
      'Area Level: 81',
      'Requires Lockpicking (Level 4)',
      '--------',
      'Item Level: 83',
      '--------',
      '{ Prefix Modifier "Example" (Tier: 1) }',
      'Guards deal 30% reduced Damage'
    ].join('\n'))
    const res = checkMap(item, widget(profile({}, { heistRatings: { [GUARDS]: 'warn' } })))
    expect(res.verdict.verdict).toBe('careful')
    expect(res.verdict.warn[0].text).toBe('Guards deal 30% reduced Damage')
  })
})

describe('final import from the old list', () => {
  const itemCheck = (selectedStats: Array<{ matcher: string, decision: string }>) => ({
    wmType: 'item-check',
    maps: { profile: 1, showNewStats: false, selectedStats }
  })

  const REFLECT = 'Rare Monsters have Physical Thorns reflecting # Physical Damage'
  const REWARD = 'Reward Rooms have #% increased Monsters'

  it('a first import sorts every old mark by tab', () => {
    const p = profile({})
    const w = widget(p)
    config.widgets = [itemCheck([
      { matcher: REWARD, decision: 'd-w' },
      { matcher: REFLECT, decision: 'd--' }
    ])]
    importAptOnce(w)
    expect(w.profiles[0].ratings).toEqual({ [REFLECT]: 'deadly' })
    expect(w.profiles[0].heistRatings).toEqual({ [REWARD]: 'deadly' })
    expect(w.profiles.map(_ => _.id)).toEqual([1, 3])
  })

  it('after an earlier import, takes only heist marks and keeps what was un-rated', () => {
    // The first import put a heist mark with the map ratings. REFLECT was then
    // un-rated here, and profile 3 deleted.
    const p = profile({ [GUARDS]: 'warn' })
    const w = widget(p, { aptImported: true })
    config.widgets = [itemCheck([
      { matcher: REWARD, decision: 'd-w' },
      { matcher: GUARDS, decision: 'd--' },
      { matcher: REFLECT, decision: 'd--' }
    ])]
    importAptOnce(w)
    const after = w.profiles[0]
    expect(after.ratings).toEqual({})
    expect(after.heistRatings).toEqual({ [GUARDS]: 'warn', [REWARD]: 'deadly' })
    expect(after.chartRatings).toBeUndefined()
    expect(w.profiles.map(_ => _.id)).toEqual([1])

    // A later removal isn't undone.
    after.ratings = {}
    after.heistRatings = {}
    importAptOnce(w)
    expect(after.ratings).toEqual({})
    expect(after.heistRatings).toEqual({})
  })
})
