// Which row the search palette keeps picked as you type.
import { describe, it, expect } from 'vitest'
import { keepSelection } from '@/web/woke/search/search'

interface Row { id: string, group: string | null }
const group = (r: Row) => r.group
const web: Row = { id: 'web:poewiki', group: 'Search the web' }
const answer: Row = { id: 'answer:calc', group: 'Answer' }
const price: Row = { id: 'p:mageblood', group: null }

describe('keepSelection', () => {
  it('lets a new answer take over from the web row as you type', () => {
    expect(keepSelection(web, answer, true, group)).toBeUndefined()
  })
  it('never holds on to the web row while you type', () => {
    expect(keepSelection(web, price, true, group)).toBeUndefined()
  })
  it('lets a new answer take over from another row', () => {
    expect(keepSelection(price, answer, true, group)).toBeUndefined()
  })
  it('keeps a row that still matches when no answer leads', () => {
    expect(keepSelection(price, price, true, group)).toBe(price)
    expect(keepSelection(answer, answer, true, group)).toBe(answer)
  })
  it('keeps your row when the list refreshes for the same query', () => {
    expect(keepSelection(web, answer, false, group)).toBe(web)
    expect(keepSelection(price, answer, false, group)).toBe(price)
  })
})
