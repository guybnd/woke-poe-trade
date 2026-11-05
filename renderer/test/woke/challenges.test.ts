// The challenge guide: its hotkey, reading the game's profile page, and merging
// that progress into the guide's ticks. The profile rows copy the page's real
// shape (a finished row, a part-done row, and the one with no count).
import { describe, it, expect } from 'vitest'
import {
  CHALLENGES_TYPE, DEFAULT_GUIDE_URL, challengesShortcuts, guideSkinCss, guideUrl, hotkeyTarget, matchesFilter, mergeProgress,
  parseHotkeyTarget, profileUrl, readProfile, scrollToJs, summarize, tickJs, toggleTickJs
} from '@/web/woke/challenges/widget'
import type { ChallengesWidget, GuideRow, ProfileRow } from '@/web/woke/challenges/widget'
import { MODULES } from '@/web/woke/modules'

const guide: GuideRow[] = [
  { n: 1, name: "Beginner's Basics", anchor: '1beginnersbasics', done: false },
  { n: 2, name: 'Deep Dive', anchor: '2deepdive', done: true },
  { n: 3, name: "Peddler's Produce I", anchor: '3peddlersproducei', done: false },
  { n: 15, name: 'Vanquished Villains', anchor: '15vanquishedvillains', done: false }
]

const profile: ProfileRow[] = [
  { name: "Beginner's Basics", have: 3, need: 3, done: true },
  { name: 'Deep Dive', have: 0, need: 3, done: false },
  { name: 'Peddlers Produce I', have: 3, need: 4, done: false },
  { name: 'Vanquished Villains', have: null, need: null, done: true }
]

function widget (hotkey: string | null): ChallengesWidget {
  return { wmId: 7, wmType: CHALLENGES_TYPE, wmTitle: '', wmWants: 'hide', wmZorder: 1, wmFlags: [], anchor: { pos: 'tl', x: 0, y: 0 }, url: '', hotkey, dockIcon: false, summary: null, lastSynced: null }
}

describe('challenge guide hotkey', () => {
  it('round-trips its target and ignores other widgets', () => {
    expect(parseHotkeyTarget(hotkeyTarget(7))).toBe(7)
    expect(parseHotkeyTarget('woke-lab:7:overlay')).toBeNull()
  })

  it('registers only when set, and takes overlay focus so you can scroll at once', () => {
    expect(challengesShortcuts(widget(null))).toEqual([])
    const [action] = challengesShortcuts(widget('Alt + G'))
    expect(action.shortcut).toBe('Alt + G')
    expect(action.action).toEqual({ type: 'trigger-event', target: 'woke-challenges:7', focusOverlay: true })
  })

  it('is a module that asks for the account name', () => {
    const m = MODULES.find(x => x.id === 'challenges')!
    expect(m.widgetTypes).toEqual([CHALLENGES_TYPE])
    expect(m.needs).toContain('account')
  })
})

describe('profile page', () => {
  it('builds the link from a game account name', () => {
    expect(profileUrl(' Name#1234 ')).toBe('https://www.pathofexile.com/account/view-profile/Name-1234/challenges')
    expect(profileUrl('we ird#1')).toContain('/we%20ird-1/challenges')
  })

  it('tells a loaded page from one still loading, missing or private', () => {
    expect(readProfile({ rows: profile, notFound: false }, 1)).toBe('ok')
    expect(readProfile({ rows: [], notFound: true }, 1)).toBe('not-found')
    expect(readProfile({ rows: [], notFound: false }, 1)).toBe('waiting')
    expect(readProfile({ rows: [], notFound: false }, 6)).toBe('waiting')
    expect(readProfile({ rows: [], notFound: false }, 15)).toBe('private')
  })
})

describe('merging progress', () => {
  it('ticks what the game finished, matching names loosely', () => {
    const { rows, toTick, matched } = mergeProgress(guide, profile)
    expect(toTick).toEqual([1, 15])
    expect(matched).toBe(4)
    expect(rows.find(r => r.n === 3)).toMatchObject({ have: 3, need: 4, done: false })
    // Shown as the site has it; the tick goes to the site, which the next read picks up.
    expect(rows.find(r => r.n === 15)).toMatchObject({ have: null, need: null, done: false })
  })

  it('keeps a manual tick the game disagrees with', () => {
    const { rows, toTick } = mergeProgress(guide, profile)
    expect(rows.find(r => r.n === 2)!.done).toBe(true)
    expect(toTick).not.toContain(2)
  })

  it('leaves the guide as it is before any sync', () => {
    const { rows, toTick, matched } = mergeProgress(guide, null)
    expect(rows.map(r => r.done)).toEqual([false, true, false, false])
    expect(toTick).toEqual([])
    expect(matched).toBe(0)
  })

  it('reports no match for another league', () => {
    expect(mergeProgress(guide, [{ name: 'Something Else', have: 1, need: 1, done: true }]).matched).toBe(0)
  })

  it('summarizes the count and the next three', () => {
    const rows = [...guide, { n: 16, name: 'Taxing Tasks', anchor: 'x', done: false }, { n: 17, name: 'Later', anchor: 'y', done: false }]
    const s = summarize(rows)
    expect(s.done).toBe(1)
    expect(s.total).toBe(6)
    expect(s.next.map(c => c.n)).toEqual([1, 3, 15])
  })
})

describe('guide page', () => {
  it('falls back to the default for an empty or unsafe address', () => {
    expect(guideUrl('')).toBe(DEFAULT_GUIDE_URL)
    expect(guideUrl('javascript:alert(1)')).toBe(DEFAULT_GUIDE_URL)
    expect(guideUrl(' https://example.com/g ')).toBe('https://example.com/g')
  })

  it('filters by name or number', () => {
    expect(matchesFilter(guide[2], 'peddler')).toBe(true)
    expect(matchesFilter(guide[2], '3 ped')).toBe(true)
    expect(matchesFilter(guide[2], 'deep')).toBe(false)
    expect(matchesFilter(guide[2], '  ')).toBe(true)
  })

  it('keeps page text out of the scripts it runs', () => {
    expect(scrollToJs('a"); alert("x')).toContain(JSON.stringify('a"); alert("x'))
    expect(toggleTickJs('1"]' as unknown as number)).toContain('data-challenge="NaN"')
    expect(tickJs(3)).toContain("dataset.complete !== 'yes'")
    expect(tickJs('1"]' as unknown as number)).toContain('data-challenge="NaN"')
  })

  it('hides the site list and undoes its phone layout', () => {
    const css = guideSkinCss('#123456')
    expect(css).toContain('background: #123456')
    expect(css).toContain('#navigation')
    expect(css).toContain('max-width: 768px')
  })
})
