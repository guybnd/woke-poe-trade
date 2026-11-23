import { describe, expect, it } from 'vitest'
import { NEWS, markAllNewsSeen, markNewsSeen, unseenNews } from '@/web/woke/tab-bar/news'
import type { WokeModulesConfig } from '@/web/woke/modules'

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

  it('players who update see every line until dismissed; a fresh install sees none', () => {
    const updated: WokeModulesConfig = { setupDone: true, off: [] }
    expect(unseenNews(updated)).toHaveLength(NEWS.length)
    markNewsSeen(updated, [NEWS[0].id])
    expect(unseenNews(updated).map(n => n.id)).not.toContain(NEWS[0].id)
    const fresh: WokeModulesConfig = { setupDone: false, off: [] }
    // Before setup's first Finish: nothing is new yet.
    expect(unseenNews(fresh)).toEqual([])
    markAllNewsSeen(fresh)
    expect(unseenNews(fresh)).toEqual([])
  })
})
