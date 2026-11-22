// Exchange items poe.ninja prices show that price first; the exchange search waits for a click.
import { describe, expect, it } from 'vitest'
import { holdBulkSearch } from '@/web/woke/price-insight/ninja-first'

const base = { api: 'bulk' as const, enabled: undefined, live: false, chaos: 34 }

describe('holdBulkSearch', () => {
  it('holds an exchange item poe.ninja prices, with the setting unset', () => {
    expect(holdBulkSearch(base)).toBe(true)
  })

  it('searches when the setting is off', () => {
    expect(holdBulkSearch({ ...base, enabled: false })).toBe(false)
    expect(holdBulkSearch({ ...base, enabled: true })).toBe(true)
  })

  it('searches when the check came from inside the overlay', () => {
    expect(holdBulkSearch({ ...base, live: true })).toBe(false)
  })

  it('searches when poe.ninja has no price', () => {
    expect(holdBulkSearch({ ...base, chaos: null })).toBe(false)
    expect(holdBulkSearch({ ...base, chaos: 0 })).toBe(false)
  })

  it('never holds an item search (rares, uniques)', () => {
    expect(holdBulkSearch({ ...base, api: 'trade' })).toBe(false)
  })
})
