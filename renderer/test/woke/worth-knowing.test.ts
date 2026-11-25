import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { NEWS } from '@/web/woke/tab-bar/news'
import { NEWS_DEMOS, hasShowMe } from '@/web/woke/tab-bar/news-demos'
import { gotoTargets } from '@/web/woke/tab-bar/goto-targets'
import { WORTH, WORTH_PREFIX, dayOf, noteBits, refreshWorth, worthLine } from '@/web/woke/tab-bar/worth-knowing'
import type { WorthContext } from '@/web/woke/tab-bar/worth-knowing'
import type { HintsConfig } from '@/web/woke/shared/hints'

const pagesSrc = readFileSync(fileURLToPath(new URL('../../src/web/woke/settings/pages.ts', import.meta.url)), 'utf8')
const PAGE_NAMES = new Set([...pagesSrc.matchAll(/^\s*(?:id|name): '([^']+)'/gm)].map(m => m[1]))

const ctx = (over: Partial<WorthContext> = {}): WorthContext => ({
  unseenNews: new Set(), byName: true, reader: true, toolOn: () => true, ...over
})

describe('Worth knowing lines', () => {
  it('are well formed, and each has a real Show me', () => {
    expect(new Set(WORTH.map(l => l.id)).size).toBe(WORTH.length)
    for (const l of WORTH) {
      expect(l.id.startsWith(WORTH_PREFIX), l.id).toBe(true)
      expect(NEWS.map(n => n.id)).not.toContain(l.id)
      expect(l.note).not.toMatch(/^New: /)
      expect(l.note.length).toBeLessThanOrEqual(90)
      expect(hasShowMe(l), `${l.id}: Show me must show it`).toBe(true)
      if (l.settingsPage) expect(PAGE_NAMES, l.id).toContain(l.settingsPage)
      if (l.goto) expect(Object.keys(gotoTargets(l.wmType) ?? {}), l.id).toContain(l.goto)
      if (l.sameAs) expect(NEWS.map(n => n.id), l.id).toContain(l.sameAs)
      const demo = NEWS_DEMOS[l.id]
      if (demo && 'check' in demo) expect(l.byName, `${l.id}: a sample check needs byName`).toBe(true)
    }
  })

  it('wait two days from the first run, then one a day, each until shown or dismissed', () => {
    const h: HintsConfig = {}
    expect(refreshWorth(h, '2026-11-25', ctx())).toBe(true)
    expect(h.since).toBe('2026-11-25')
    expect(worthLine(h)).toBeNull()
    expect(refreshWorth(h, '2026-11-26', ctx())).toBe(false)
    expect(worthLine(h)).toBeNull()
    // Day 3.
    expect(refreshWorth(h, '2026-11-27', ctx())).toBe(true)
    expect(worthLine(h)?.id).toBe(WORTH[0].id)
    // Not dismissed: it stays, nothing new tomorrow.
    refreshWorth(h, '2026-11-28', ctx())
    expect(worthLine(h)?.id).toBe(WORTH[0].id)
    // Dismissed: none more today, the next one tomorrow.
    h.done = [WORTH[0].id]
    expect(worthLine(h)).toBeNull()
    expect(refreshWorth(h, '2026-11-28', ctx())).toBe(false)
    expect(worthLine(h)).toBeNull()
    refreshWorth(h, '2026-11-29', ctx())
    expect(worthLine(h)?.id).toBe(WORTH[1].id)
  })

  it('skip what you already use, what can\'t be shown here, and what What\'s new already says', () => {
    const h: HintsConfig = { since: '2026-11-01', done: ['price-check-mod-keys'] }
    refreshWorth(h, '2026-11-25', ctx({ unseenNews: new Set(['search-keys-list']) }))
    expect(h.wk?.id).toBe('wk-search-sums')
    const fr: HintsConfig = { since: '2026-11-01' }
    refreshWorth(fr, '2026-11-25', ctx({ byName: false }))
    expect(fr.wk?.id).not.toBe('wk-mod-ctrl-click')
    // Used since it was picked: dropped from the card.
    const used: HintsConfig = { since: '2026-11-01', wk: { id: 'wk-mod-ctrl-click', day: '2026-11-25' }, done: ['price-check-mod-keys'] }
    expect(worthLine(used, ctx())).toBeNull()
    // No Net worth line without the stash reader.
    const all: HintsConfig = { since: '2026-11-01', done: WORTH.filter(l => l.id !== 'wk-own-price').map(l => l.id) }
    refreshWorth(all, '2026-11-25', ctx({ reader: false }))
    expect(worthLine(all)).toBeNull()
  })

  it('none with tips off', () => {
    const h: HintsConfig = { off: true, since: '2026-11-01' }
    expect(refreshWorth(h, '2026-11-25', ctx())).toBe(false)
    expect(worthLine({ ...h, wk: { id: WORTH[0].id, day: '2026-11-25' } })).toBeNull()
  })

  it('counts days by the local date', () => {
    expect(dayOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('shows key phrases as chips, Ctrl + Space as the search key', () => {
    expect(noteBits('Type 2 div + 30c in Ctrl + Space to add up prices', 'Alt + Space'))
      .toEqual(['Type 2 div + 30c in ', { kbd: 'Alt + Space', search: true }, ' to add up prices'])
    expect(noteBits('Ctrl + Click a mod. Right-click it', null))
      .toEqual([{ kbd: 'Ctrl + Click' }, ' a mod. ', { kbd: 'Right-click' }, ' it'])
    // No search key set: the words stay.
    expect(noteBits('in Ctrl + Space', null)).toEqual(['in ', 'Ctrl + Space'])
  })
})
