// Ctrl+Space keeps what you typed when it closed, opened or not.
import { describe, expect, it } from 'vitest'
import { addQuery, QUERY_MAX } from '@/web/woke/search/widget'

describe('addQuery', () => {
  it('puts the newest search first and keeps the last few', () => {
    let list: string[] | undefined
    for (const q of ['tabula', 'mageblood', 'divine', 'chaos']) list = addQuery(list, q) ?? list
    expect(list).toEqual(['chaos', 'divine', 'mageblood'])
    expect(list).toHaveLength(QUERY_MAX)
  })

  it('keeps a half-typed search too', () => {
    expect(addQuery([], 'tabula ras')).toEqual(['tabula ras'])
  })

  it('skips one letter, blanks and the help query', () => {
    expect(addQuery(['a1'], 'x')).toBeNull()
    expect(addQuery(['a1'], '   ')).toBeNull()
    expect(addQuery(['a1'], '?', ['?'])).toBeNull()
  })

  it('returns null when the search is already first', () => {
    expect(addQuery(['tabula', 'chaos'], ' tabula ')).toBeNull()
  })

  it('moves a repeat to the front without a copy', () => {
    expect(addQuery(['tabula', 'chaos', 'divine'], 'chaos')).toEqual(['chaos', 'tabula', 'divine'])
  })

  it('replaces a search this one grows from, and keeps longer ones', () => {
    expect(addQuery(['tab', 'chaos'], 'Tabula')).toEqual(['Tabula', 'chaos'])
    expect(addQuery(['tabula rasa', 'chaos'], 'ta')).toEqual(['ta', 'tabula rasa', 'chaos'])
  })

  it('tidies spaces', () => {
    expect(addQuery([], '  tabula   rasa ')).toEqual(['tabula rasa'])
  })
})
