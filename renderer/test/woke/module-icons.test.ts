// Every tool drawn with an item's art finds that art, uniques and gems too
// (the Watcher's Eye finder's icon was a plain eye).
import { beforeAll, describe, expect, it } from 'vitest'
import { loadGameData } from '../helpers/game-data'
import { MODULES } from '@/web/woke/modules'
import { moduleIcon } from '@/web/woke/ui/game-icons'

beforeAll(loadGameData)

describe('tool icons', () => {
  it('every tool with an item icon gets its art', () => {
    const missing = MODULES.filter(m => m.icon.item && !moduleIcon(m.id).art).map(m => `${m.id}: ${m.icon.item}`)
    expect(missing).toEqual([])
  })
  it("the Watcher's Eye finder uses the jewel's art", () => {
    expect(moduleIcon('watchers-eye').art).toMatch(/^https:\/\/web\.poecdn\.com\//)
  })
})
