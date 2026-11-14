// Map mods: the stash regex is checked the way PoE applies it, against map
// tooltips built from every map mod in the game data; presets and the
// default profile are checked against the same data.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData } from '../helpers/game-data'
import { allAreaMods, allMapNames, profileRegex } from '@/web/woke/map-mods/data'
import { atLeast, buildMapRegex, MAX_SEARCH_LENGTH, TOOLTIP_LINES } from '@/web/woke/map-mods/regex'
import { PRESETS, copyOfProfile, defaultProfile, rateMods, juiceScore } from '@/web/woke/map-mods/rules'
import { TooltipMatcher } from '@/web/woke/map-mods/tooltip-parse'
import type { MapModProfile } from '@/web/woke/map-mods/rules'

// PoE's stash search: space-separated terms (quotes group spaces), all must
// match; `|` is OR inside a term; a leading `!` negates the term; terms are
// case-insensitive regexes over the item text.
function stashSearch (search: string, itemText: string): boolean {
  const terms = [...search.matchAll(/"([^"]*)"|(\S+)/g)].map(m => m[1] ?? m[2])
  return terms.every(term => {
    const negate = term.startsWith('!')
    const re = new RegExp(negate ? term.slice(1) : term, 'i')
    return re.test(itemText) !== negate
  })
}

// Rare maps get a random two-word name. Tokens can't avoid every name word
// (the word lists aren't in the data), but shouldn't join two words by a
// single letter, which hits names by chance ("m h" in "Grim Hollow").
const RARE_NAMES = ['Grim Hollow', 'Malformed Mists', 'Ancient Haven', 'Blind Paradise']

function mapTooltip (mods: string[], props: { quantity?: number, rarity?: number, packSize?: number } = {}): string {
  return [
    'Item Class: Maps',
    'Rarity: Rare',
    'Grim Hollow',
    'Strand Map',
    '--------',
    'Map Tier: 16',
    `Atlas Drops: +${props.quantity ?? 70}%`,
    `Item Rarity: +${props.rarity ?? 40}%`,
    `Monster Pack Size: +${props.packSize ?? 25}%`,
    '--------',
    'Item Level: 83',
    '--------',
    ...mods.map(m => m.replace(/#/g, '35')),
    '--------',
    'Travel to this Map by using it in a personal Map Device. Maps can only be used once.'
  ].join('\n')
}

let MODS: string[]
// See 'finds a unique token…' below.
const KNOWN_UNSEARCHABLE = 27
beforeAll(async () => {
  await loadGameData()
  MODS = allAreaMods()
})

describe('area mod data', () => {
  it('has the map mods', () => {
    expect(MODS.length).toBeGreaterThan(250)
    expect(MODS).toContain('Players cannot Regenerate Life, Mana or Energy Shield')
    expect(allMapNames()).toContain('Strand Map')
  })
})

describe('stash regex', () => {
  it('atLeast(n) matches exactly the numbers >= n', () => {
    for (const n of [1, 5, 9, 10, 19, 20, 45, 80, 99, 100, 101, 110, 150, 199, 250, 999]) {
      const re = new RegExp(`^${atLeast(n)}$`)
      for (let v = 0; v <= 999; v++) {
        if (re.test(String(v)) !== (v >= n)) throw new Error(`atLeast(${n}) is wrong for ${v}: ${atLeast(n)}`)
      }
    }
  })

  // Every mod once as the one to avoid: the search must hide maps with it
  // and keep maps that only have other mods. Checks the whole universe, so a
  // token that also hits another mod's text (or map names, properties) fails.
  it('each avoided mod hides exactly the maps that have it', () => {
    const mapNames = allMapNames()
    const wrong: string[] = []
    // Mods sharing a token are the same mod in different wordings; group by
    // the stat so "other mods" means mods of other stats.
    for (const mod of MODS) {
      const { text, missing } = buildMapRegex({ avoid: [mod], want: [], mins: {}, highlight: 'good' }, MODS, mapNames)
      if (missing.length) continue // no unique text: reported by the next test
      if (stashSearch(text, mapTooltip([mod]))) wrong.push(`${mod}: not hidden by ${text}`)
      const name = RARE_NAMES.find(n => !stashSearch(text, mapTooltip([], {}).replace('Grim Hollow', n)))
      if (name) wrong.push(`${mod}: token ${text} also hides a map named "${name}"`)
      const tokenLower = text.replace(/^"!|"$/g, '').toLowerCase()
      for (const other of MODS) {
        if (other === mod) continue
        if (!stashSearch(text, mapTooltip([other])) && !other.toLowerCase().includes(tokenLower)) {
          wrong.push(`${mod}: token ${text} also hides "${other}"`)
          break
        }
      }
    }
    expect(wrong).toEqual([])
  })

  // Known gap: some mods' words all appear in other mods ("Monsters have #%
  // increased Area of Effect" vs the boss's "#% increased Area of Effect"),
  // and tokens don't span the rolled number, so these can't be searched for.
  // The builder reports them as "missing". Don't let the list grow.
  it('finds a unique token for all but a known few mods', () => {
    const missing = MODS.filter(mod => buildMapRegex({ avoid: [mod], want: [], mins: {}, highlight: 'good' }, MODS, allMapNames()).missing.length)
    expect(missing.length, missing.join('\n')).toBeLessThanOrEqual(KNOWN_UNSEARCHABLE)
  })

  // The search box takes one line, so a token across a two-line mod's line
  // break can't be typed. The T17 "can't be slowed" mod reads exactly like
  // the first line of a two-line one; that must not leave it without a token.
  it('tokens stay on one line', () => {
    const multi = MODS.filter(m => m.includes('\n'))
    expect(multi.length).toBeGreaterThan(0)
    for (const mod of multi) {
      const { text } = buildMapRegex({ avoid: [mod], want: [], mins: {}, highlight: 'good' }, MODS, allMapNames())
      expect(text, mod).not.toContain('\n')
    }
    const slow = "Monsters' Action Speed cannot be modified to below Base Value"
    const res = buildMapRegex({ avoid: [slow], want: [], mins: {}, highlight: 'good' }, MODS, allMapNames())
    expect(res.missing).toEqual([])
    expect(stashSearch(res.text, mapTooltip([slow]))).toBe(false)
  })

  it('wanted mods and minimums: the search keeps maps meeting them', () => {
    const want = ['Area contains two Unique Bosses']
    const res = buildMapRegex({ avoid: [], want, mins: { quantity: 80, packSize: 20 }, highlight: 'good' }, MODS, allMapNames())
    expect(stashSearch(res.text, mapTooltip(want, { quantity: 87, packSize: 25 }))).toBe(true)
    expect(stashSearch(res.text, mapTooltip(want, { quantity: 112, packSize: 25 }))).toBe(true)
    expect(stashSearch(res.text, mapTooltip(want, { quantity: 79, packSize: 25 }))).toBe(false)
    expect(stashSearch(res.text, mapTooltip(want, { quantity: 87, packSize: 19 }))).toBe(false)
    expect(stashSearch(res.text, mapTooltip([], { quantity: 87, packSize: 25 }))).toBe(false)
    // Rarity 80% must not pass as quantity 80%.
    expect(stashSearch(res.text, mapTooltip(want, { quantity: 60, rarity: 90, packSize: 25 }))).toBe(false)
  })

  it('"any one minimum" passes a map that meets one of them', () => {
    const res = buildMapRegex({ avoid: [], want: [], mins: { quantity: 100, rarity: 100 }, highlight: 'good', minsAny: true }, MODS, allMapNames())
    expect(stashSearch(res.text, mapTooltip([], { quantity: 105, rarity: 20 }))).toBe(true)
    expect(stashSearch(res.text, mapTooltip([], { quantity: 50, rarity: 20 }))).toBe(false)
  })

  it('tokens never match the fixed tooltip lines', () => {
    for (const line of TOOLTIP_LINES) {
      const { text } = buildMapRegex({ avoid: [], want: MODS.slice(0, 40), mins: {}, highlight: 'bad' }, MODS)
      expect(stashSearch(text.replace(/^"/, '"!'), line)).toBe(true)
    }
  })

  it('every preset (avoid all) fits the search box once auto-trimmed', () => {
    for (const preset of PRESETS) {
      const profile: MapModProfile = { ...defaultProfile(), ratings: Object.fromEntries(preset.matchers.map(m => [m, 'deadly'])), autoTrim: true }
      const res = profileRegex(profile)
      expect(res.length, preset.id).toBeLessThanOrEqual(MAX_SEARCH_LENGTH)
    }
  })
})

describe('rules', () => {
  // Each preset
  // must still match something in the current data.
  it('every preset matches at least one current map mod', () => {
    const known = new Set(MODS)
    const dead = PRESETS.filter(p => !p.matchers.some(m => known.has(m))).map(p => p.id)
    expect(dead).toEqual([])
  })

  it('rates a map by its worst mod', () => {
    const p = defaultProfile()
    expect(rateMods([{ matcher: 'Area contains two Unique Bosses' }], p).verdict).toBe('run')
    expect(rateMods([{ matcher: 'Area contains two Unique Bosses' }, { matcher: 'Players cannot Regenerate Life, Mana or Energy Shield' }], p).verdict).toBe('careful')
    const thorns = 'Rare Monsters have Physical Thorns reflecting # Physical Damage'
    expect(rateMods([{ matcher: thorns, roll: 18 }], { ...p, ratings: { [thorns]: 'deadly' } }).verdict).toBe('skip')
    expect(rateMods([], p).verdict).toBe('run')
  })

  it('a scanned negative roll keeps its sign', () => {
    const scan = new TooltipMatcher(MODS).parse(['Map Tier: 16', 'Players have -12% to all maximum Resistances'])!
    const res = rateMods(scan.mods, defaultProfile())
    expect(res.warn.map(m => m.text)).toEqual(['Players have -12% to all maximum Resistances'])
  })

  it('juice grows with quantity and pack size', () => {
    const low = juiceScore({ quantity: 40, packSize: 10 } as never).score
    const high = juiceScore({ quantity: 110, packSize: 40 } as never).score
    expect(high).toBeGreaterThan(low)
  })
})

describe('APT map check ratings brought into Map mods', () => {
  it('fills matching profiles, keeps existing ratings, makes missing ones', async () => {
    const { importAptMapRatings } = await import('@/web/woke/map-mods/apt-import')
    const { defaultProfile } = await import('@/web/woke/map-mods/rules')
    const profiles = [defaultProfile()]
    const added = importAptMapRatings(profiles, {
      profile: 1,
      showNewStats: false,
      selectedStats: [
        { matcher: 'Monsters cannot be Leeched from', decision: 'd-w' },
        // Already rated in our default profile: stays careful.
        { matcher: 'Players have #% to all maximum Resistances', decision: 'g--' },
        { matcher: 'Area has patches of Burning Ground', decision: 's--' }
      ]
    })
    expect(added).toBe(2)
    expect(profiles.map(p => p.id)).toEqual([1, 3])
    expect(profiles[0].ratings['Monsters cannot be Leeched from']).toBe('deadly')
    expect(profiles[0].ratings['Players have #% to all maximum Resistances']).toBe('warn')
    expect(profiles[0].ratings['Area has patches of Burning Ground']).toBeUndefined()
    expect(profiles[1].ratings).toEqual({ 'Monsters cannot be Leeched from': 'warn' })
  })
})

describe('map scan: mods on several tooltip lines', () => {
  const TWO_LINE = "Monsters' Action Speed cannot be modified to below Base Value\nMonsters' Movement Speed cannot be modified to below Base Value"

  it('finds a two-line mod, so a rating on it counts', () => {
    const scanned = new TooltipMatcher(allAreaMods()).parse(['Map Tier: 16', ...TWO_LINE.split('\n')])!
    expect(scanned.mods.map(m => m.matcher)).toContain(TWO_LINE)
    expect(scanned.weak).toEqual([])
    expect(rateMods(scanned.mods, { ...defaultProfile(), ratings: { [TWO_LINE]: 'deadly' } }).verdict).toBe('skip')
  })

  it('still rates the lines on their own', () => {
    const scanned = new TooltipMatcher(allAreaMods()).parse(TWO_LINE.split('\n'))!
    expect(scanned.mods.map(m => m.matcher)).toContain(TWO_LINE.split('\n')[0])
  })

  it('tells apart mods that differ only in a fixed number', () => {
    const read = (value: number) => new TooltipMatcher(allAreaMods()).parse([
      'Area is infested with Fungal Growths',
      `Map's Item Quantity Modifiers also affect Blight Chest count at ${value}% value`,
      'Can be Anointed up to 3 times'
    ])!.mods.filter(m => m.matcher.includes('\n'))
    expect(read(50).map(m => m.matcher)).toEqual([expect.stringContaining('at 50% value')])
    expect(read(50)[0].roll).toBe(3)
    expect(read(25).map(m => m.matcher)).toEqual([expect.stringContaining('at 25% value')])
  })

  it('needs every line of the mod', () => {
    const scanned = new TooltipMatcher(allAreaMods()).parse(['Map Tier: 16', TWO_LINE.split('\n')[0]])!
    expect(scanned.mods.map(m => m.matcher)).not.toContain(TWO_LINE)
  })
})

describe('map mods profiles', () => {
  it('a copy keeps every setting, and its own ratings', () => {
    const p: MapModProfile = { ...defaultProfile(), id: 1, name: 'Build', minsAny: true, autoTrim: true, highlight: 'bad', mins: { quantity: 80 } }
    const copy = copyOfProfile(p, 2)
    expect(copy).toMatchObject({ id: 2, name: 'Build copy', minsAny: true, autoTrim: true, highlight: 'bad', mins: { quantity: 80 } })
    copy.ratings.x = 'deadly'
    expect(p.ratings.x).toBeUndefined()
  })
})
