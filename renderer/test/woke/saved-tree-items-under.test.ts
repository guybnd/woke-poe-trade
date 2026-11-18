import { describe, expect, it } from 'vitest'
import { itemsUnder } from '@/web/woke/shared/saved-tree'

describe('itemsUnder', () => {
  const items = [
    { id: 1, f: 'A' }, { id: 2, f: 'A/B' }, { id: 3, f: ' A // B / C ' }, { id: 4, f: 'AB' }, { id: 5, f: '' }
  ]
  it('takes the folder and every folder under it, with the path below it', () => {
    expect(itemsUnder(items, i => i.f, 'A').map(x => [x.item.id, x.sub])).toEqual([[1, ''], [2, 'B'], [3, 'B/C']])
    expect(itemsUnder(items, i => i.f, 'A/B/').map(x => x.item.id)).toEqual([2, 3])
  })
  it('matches nothing for the top level', () => {
    expect(itemsUnder(items, i => i.f, '')).toEqual([])
  })
})
