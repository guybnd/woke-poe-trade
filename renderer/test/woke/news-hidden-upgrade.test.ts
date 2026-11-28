// A player who dismissed the What's new icon for good (right-click › Always)
// kept getting NEW seals and the All tools count back with every update.
// Hiding the icon now counts as What's new off, and an update keeps it so.
import { describe, expect, it } from 'vitest'
import type { WokeModulesConfig } from '@/web/woke/modules'
import { NEWS, newsFor, newsIsOff, seenNewsIds, unseenNews } from '@/web/woke/tab-bar/news'
import { setNewsOff } from '@/web/woke/tab-bar/news-off'
import { iconHiddenIn } from '@/web/woke/dock/dismiss-rules'

// The settings file as an older release saved it: the icon hidden, the lines
// of that release seen, and the newest line not out yet.
function oldSettings (hidden: string[]): string {
  const woke: WokeModulesConfig = {
    setupDone: true,
    off: [],
    version: 1,
    seenNews: NEWS.slice(1).map(n => n.id),
    dock: { x: 35, y: 1.2, vertical: false, peeks: true, noPeek: [], hidden, dismissed: {} }
  }
  return JSON.stringify({ configVersion: 18, widgets: [], woke })
}

// The newer release reads that file back (Config.ts leaves woke.dock and
// woke.seenNews as they are), and its NEWS has NEWS[0] on top.
function afterUpdate (text: string): WokeModulesConfig {
  return (JSON.parse(text) as { woke: WokeModulesConfig }).woke
}

describe("What's new hidden for good, across an update", () => {
  it('keeps the icon hidden and shows no new lines, seals or count', () => {
    const woke = afterUpdate(oldSettings(['whats-new', 'drop-counter']))
    expect(woke.dock?.hidden).toEqual(['whats-new', 'drop-counter'])
    expect(newsIsOff(woke)).toBe(true)
    // The update brought NEWS[0]: still nothing new.
    expect(unseenNews(woke, '0.0.0-test')).toEqual([])
    expect(newsFor(NEWS[0].wmType, seenNewsIds(woke), '0.0.0-test')).toBeNull()
  })

  it('with the icon showing, the update still brings its new line', () => {
    const woke = afterUpdate(oldSettings(['drop-counter']))
    expect(newsIsOff(woke)).toBe(false)
    expect(unseenNews(woke, '0.0.0-test').map(n => n.id)).toEqual([NEWS[0].id])
  })

  it("switching What's new back on brings the icon back", () => {
    const woke = afterUpdate(oldSettings(['whats-new', 'drop-counter']))
    setNewsOff(woke, false)
    expect(woke.dock?.hidden).toEqual(['drop-counter'])
    expect(newsIsOff(woke)).toBe(false)
  })
})

describe('an icon folded into a hidden one', () => {
  it('stays hidden when it shows up later on its own', () => {
    expect(iconHiddenIn({ id: 'lab-gems', into: 'lab' }, ['lab'])).toBe(true)
    expect(iconHiddenIn({ id: 'lab-gems', into: 'lab' }, ['drop-counter'])).toBe(false)
    expect(iconHiddenIn({ id: 'lab' }, ['lab-gems'])).toBe(false)
  })
})
