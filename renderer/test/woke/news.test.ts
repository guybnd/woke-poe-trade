import { describe, expect, it } from 'vitest'
import { NEWS, liveNews, newsExpired, markAllNewsSeen, markNewsSeen, seenNewsIds, unseenNews } from '@/web/woke/tab-bar/news'
import { setNewsOff } from '@/web/woke/tab-bar/news-off'
import { NEWS_SPOTS, gotoSpots, gotoTargets } from '@/web/woke/tab-bar/goto-targets'
import { NEWS_DEMOS, hasShowMe } from '@/web/woke/tab-bar/news-demos'
import { WORTH } from '@/web/woke/tab-bar/worth-knowing'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { WokeModulesConfig } from '@/web/woke/modules'

// Settings page names and ids, read from pages.ts's text (importing it pulls in
// every page's window, which doesn't load outside the app).
const pagesSrc = readFileSync(fileURLToPath(new URL('../../src/web/woke/settings/pages.ts', import.meta.url)), 'utf8')
const PAGE_NAMES = new Set([
  ...[...pagesSrc.matchAll(/^\s*(?:id|name): '([^']+)'/gm)].map(m => m[1]),
  ...[...pagesSrc.matchAll(/^\s*aliases: \[([^\]]*)\]/gm)].flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(a => a[1]))
])
const pageByName = (name: string) => PAGE_NAMES.has(name) ? name : undefined

describe("What's new lines", () => {
  it('are well formed: unique ids, a tool, a name, a short note', () => {
    expect(new Set(NEWS.map(n => n.id)).size).toBe(NEWS.length)
    for (const n of NEWS) {
      expect(n.id).toMatch(/^[a-z0-9-]+$/)
      expect(n.wmType).toMatch(/^[a-z0-9-]+$/)
      expect(n.name.trim()).not.toBe('')
      expect(n.note).toMatch(/^New: /)
      expect(n.note.length).toBeLessThanOrEqual(110)
    }
  })

  it('Price check lines name a topic, so the dock card can fold them (other tools need none)', () => {
    for (const n of NEWS) {
      if (n.wmType === 'price-check') expect(n.topic, `${n.id}: give it a topic`).toBeTruthy()
      else expect(n.topic, n.id).toBeUndefined()
    }
  })

  it('each line names the release it ships in, no later than the next one (main/package.json, patch + 1), newest first', () => {
    const app = JSON.parse(readFileSync(fileURLToPath(new URL('../../../main/package.json', import.meta.url)), 'utf8')).version as string
    const [major, league, patch] = app.split('.').map(Number)
    const num = ([m, l, p]: number[]) => (m * 10000 + l) * 10000 + p
    let prev = Infinity
    for (const n of NEWS) {
      expect(n.since, n.id).toMatch(/^\d+\.\d+\.\d+$/)
      const v = num(n.since.split('.').map(Number))
      expect(v, `${n.id}: since ${n.since} is past the next release (${app} + 1)`).toBeLessThanOrEqual(num([major, league, patch + 1]))
      // Newest at the top: a new line goes first, with the next release.
      expect(v, `${n.id}: since ${n.since} is newer than the line above it`).toBeLessThanOrEqual(prev)
      prev = v
    }
  })

  it('a line shows for its release and the next, then expires; a new league expires it too', () => {
    expect(newsExpired('1.330.21', '1.330.20')).toBe(false)
    expect(newsExpired('1.330.21', '1.330.21')).toBe(false)
    expect(newsExpired('1.330.21', '1.330.22')).toBe(false)
    expect(newsExpired('1.330.21', '1.330.23')).toBe(true)
    // A new league: its first release still shows the old league's lines.
    expect(newsExpired('1.330.21', '1.331.0')).toBe(false)
    expect(newsExpired('1.330.21', '1.331.1')).toBe(true)
    expect(newsExpired('1.330.21', '2.0.1')).toBe(true)
    expect(newsExpired('1.331.1', '1.330.21')).toBe(false)
    // Not a release: the fake app, or before the app says its version.
    expect(newsExpired('1.330.21', '0.0.0-test')).toBe(false)
    expect(newsExpired('1.330.21', '0.0.00000')).toBe(false)
    expect(liveNews('0.0.0-test')).toHaveLength(NEWS.length)
    expect(liveNews('9.0.1')).toEqual([])
  })

  it('NEWS_SPOTS and NEWS_DEMOS name only real lines', () => {
    const ids = [...NEWS, ...WORTH].map(n => n.id)
    for (const id of [...Object.keys(NEWS_SPOTS), ...Object.keys(NEWS_DEMOS)]) expect(ids, id).toContain(id)
  })

  it('offers Show me only where it shows the feature (Guy: show it, or don\'t offer to)', () => {
    for (const n of NEWS) {
      // Settings › Price check isn't where a price check feature is.
      if (n.wmType === 'price-check') expect(n.settingsPage, `${n.id}: give it a sample in NEWS_DEMOS, or no Show me`).toBeUndefined()
    }
    // A price check line without a sample has no button; with one, only where a check by name works.
    expect(hasShowMe({ id: 'x', wmType: 'price-check' })).toBe(false)
    expect(hasShowMe({ id: 'price-check-seller-spread', wmType: 'price-check' })).toBe(true)
    expect(hasShowMe({ id: 'price-check-seller-spread', wmType: 'price-check' }, false)).toBe(false)
    expect(hasShowMe({ id: 'div-card-map-chance', wmType: 'woke-search' }, false)).toBe(true)
    // Your own past searches: nothing to show until you've searched.
    expect(hasShowMe({ id: 'search-recent-queries', wmType: 'woke-search' })).toBe(false)
    // Net worth with the stash reader off has nothing to show.
    expect(hasShowMe({ id: 'x', wmType: 'woke-net-worth', goto: 'holdings' }, true, false)).toBe(false)
  })

  it('reads the Settings page names', () => {
    expect(PAGE_NAMES.size).toBeGreaterThan(20)
    for (const n of ['All modules', 'Sessions', 'Price check', 'farming', 'Modules']) expect(PAGE_NAMES, n).toContain(n)
  })

  it('Show me goes to a real place: the tab a line names exists, and a tool with tabs names one', () => {
    for (const n of NEWS) {
      if (n.settingsPage) {
        expect(n.goto, n.id).toBeUndefined()
        expect(NEWS_SPOTS[n.id], n.id).toBeUndefined()
        expect(pageByName(n.settingsPage), `${n.id}: no Settings page called "${n.settingsPage}"`).toBeDefined()
        continue
      }
      const targets = gotoTargets(n.wmType)
      if (!targets) {
        expect(n.goto, `${n.id}: ${n.wmType} has no tabs in goto-targets.ts`).toBeUndefined()
        continue
      }
      expect(Object.keys(targets), `${n.id}: add goto, one of the tool's tabs`).toContain(n.goto)
      const spot = NEWS_SPOTS[n.id]
      if (spot) {
        const spots = gotoSpots(n.wmType)
        expect(spots?.[spot], `${n.id}: spot "${spot}" isn't in GOTO_SPOTS for ${n.wmType}`).toBeDefined()
        expect(spots![spot], `${n.id}: spot "${spot}" sits on another tab`).toBe(n.goto)
      }
    }
  })

  it('players who update see every line until dismissed; a fresh install sees none', () => {
    const updated: WokeModulesConfig = { setupDone: true, off: [] }
    expect(unseenNews(updated, '0.0.0-test')).toHaveLength(NEWS.length)
    markNewsSeen(updated, [NEWS[0].id])
    expect(unseenNews(updated, '0.0.0-test').map(n => n.id)).not.toContain(NEWS[0].id)
    const fresh: WokeModulesConfig = { setupDone: false, off: [] }
    // Before setup's first Finish: nothing is new yet.
    expect(unseenNews(fresh, '0.0.0-test')).toEqual([])
    markAllNewsSeen(fresh)
    expect(unseenNews(fresh, '0.0.0-test')).toEqual([])
  })
})

describe("What's new switched off", () => {
  it('hides every line, marks them seen, and shows only later lines once back on', () => {
    const woke: WokeModulesConfig = { setupDone: true, off: [] }
    setNewsOff(woke, true)
    expect(woke.newsOff).toBe(true)
    expect(unseenNews(woke, '0.0.0-test')).toEqual([])
    expect(seenNewsIds(woke)).toEqual(NEWS.map(n => n.id))
    setNewsOff(woke, false)
    expect(woke.newsOff).toBeUndefined()
    // Everything there when it was switched off stays seen.
    expect(unseenNews(woke, '0.0.0-test')).toEqual([])
  })
})
