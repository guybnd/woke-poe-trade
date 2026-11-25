// Ctrl+Space keeps what you typed when it closed, opened or not.
import { describe, expect, it } from 'vitest'
import { addQuery, dropLine, QUERY_MAX, sameLine, saveLine, unsaveLine } from '@/web/woke/search/widget'

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

describe('Saved and Recent lines', () => {
  const tabula = { type: 'UniqueArmour', name: 'Tabula Rasa' }
  const base = () => ({ queries: ['taba', 'searcj'], recent: [tabula, { type: 'DivinationCard', name: 'The Doctor' }] })

  it('saving moves a line out of Recent to the top of Saved', () => {
    const w: Parameters<typeof saveLine>[0] = base()
    saveLine(w, { q: 'taba' })
    saveLine(w, tabula)
    expect(w.saved).toEqual([tabula, { q: 'taba' }])
    expect(w.queries).toEqual(['searcj'])
    expect(w.recent).toEqual([{ type: 'DivinationCard', name: 'The Doctor' }])
  })

  it('unsaving puts it back on top of Recent', () => {
    const w: Parameters<typeof saveLine>[0] = base()
    saveLine(w, tabula)
    unsaveLine(w, tabula)
    expect(w.saved).toEqual([])
    expect(w.recent![0]).toEqual(tabula)
    saveLine(w, { q: 'searcj' })
    unsaveLine(w, { q: 'searcj' })
    expect(w.queries).toEqual(['searcj', 'taba'])
  })

  it('removing takes a line out wherever it is', () => {
    const w: Parameters<typeof saveLine>[0] = base()
    dropLine(w, { q: 'searcj' })
    expect(w.queries).toEqual(['taba'])
    saveLine(w, tabula)
    dropLine(w, tabula)
    expect(w.saved).toEqual([])
    expect(w.recent).toEqual([{ type: 'DivinationCard', name: 'The Doctor' }])
  })

  it('a search and an item of the same name are different lines', () => {
    expect(sameLine({ q: 'Tabula Rasa' }, tabula)).toBe(false)
    expect(sameLine(tabula, { ...tabula })).toBe(true)
  })
})
