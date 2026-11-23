// The currency chip in the price check results: All / Chaos / Divine, filtering what's loaded.
import { describe, expect, it } from 'vitest'
import { hasCurrencyChoice, nextCurrencyView, inCurrency, currencyTitle, chaosMayHide } from '@/web/woke/price-insight/price-currency'

describe('Price currency chip', () => {
  it('is offered when the search let both chaos and divine listings through', () => {
    expect(hasCurrencyChoice(null)).toBe(true)
    expect(hasCurrencyChoice('chaos_divine')).toBe(true)
    expect(hasCurrencyChoice('chaos')).toBe(false)
    expect(hasCurrencyChoice('divine')).toBe(false)
  })

  it('steps All, Chaos, Divine, All', () => {
    expect(nextCurrencyView('all')).toBe('chaos')
    expect(nextCurrencyView('chaos')).toBe('divine')
    expect(nextCurrencyView('divine')).toBe('all')
  })

  it('keeps listings in the picked currency', () => {
    expect(inCurrency({ priceCurrency: 'divine' }, 'all')).toBe(true)
    expect(inCurrency({ priceCurrency: 'exalted' }, 'all')).toBe(true)
    expect(inCurrency({ priceCurrency: 'divine' }, 'divine')).toBe(true)
    expect(inCurrency({ priceCurrency: 'chaos' }, 'divine')).toBe(false)
    expect(inCurrency({ priceCurrency: 'exalted' }, 'chaos')).toBe(false)
  })

  it('says what it shows and that it never searches', () => {
    expect(currencyTitle('all', 'chaos_divine')).toMatch(/^Showing listings in chaos and divines\./)
    expect(currencyTitle('all', null)).toMatch(/^Showing listings in every currency\./)
    expect(currencyTitle('divine', null)).toMatch(/only listings priced in divines.*without a new search/)
  })
})

describe('Chaos listings behind divine ones', () => {
  const d = { priceCurrency: 'divine' }
  const c = { priceCurrency: 'chaos' }
  it('keeps loading while a mixed search has shown only divines', () => {
    expect(chaosMayHide([d, d, null], 'chaos_divine')).toBe(true)
    expect(chaosMayHide([d, d], null)).toBe(true)
  })
  it('stops once a chaos listing shows, or when the search was one currency', () => {
    expect(chaosMayHide([d, c], 'chaos_divine')).toBe(false)
    expect(chaosMayHide([d, d], 'divine')).toBe(false)
    expect(chaosMayHide([], 'chaos_divine')).toBe(false)
    expect(chaosMayHide([c, c], 'chaos_divine')).toBe(false)
  })
})
