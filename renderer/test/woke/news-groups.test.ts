import { describe, expect, it } from 'vitest'
import { groupNews } from '@/web/woke/tab-bar/news-groups'
import type { NewsItem } from '@/web/woke/tab-bar/news'

const line = (id: string, wmType: string, topic?: NewsItem['topic']): NewsItem =>
  ({ id, wmType, name: wmType, note: 'New: x', since: '1.330.21', topic })

describe("What's new groups", () => {
  it('groups by tool and topic, in the order lines come (newest first)', () => {
    const groups = groupNews([
      line('a', 'price-check', 'Tooltips'),
      line('b', 'woke-search'),
      line('c', 'price-check', 'Maps'),
      line('d', 'price-check', 'Tooltips'),
      line('e', 'woke-search')
    ])
    expect(groups.map(g => [g.key, g.lines.map(n => n.id)])).toEqual([
      ['price-check:Tooltips', ['a', 'd']],
      ['woke-search', ['b', 'e']],
      ['price-check:Maps', ['c']]
    ])
    expect(groups[0].topic).toBe('Tooltips')
  })

  it('has nothing for no lines', () => {
    expect(groupNews([])).toEqual([])
  })
})
