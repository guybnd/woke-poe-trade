// The poe.re window: what it reads from the page, and how it names a saved string.
import { describe, it, expect } from 'vitest'
import { POE_RE_TYPE, anchorBeside, asResult, clipboardSearch, categoryFor, initPoeReWidget, isDefaultAnchor, suggestName } from '@/web/woke/regex-library/poe-re-widget'

describe('poe.re window config', () => {
  it('is kept out of the tab bar and the launcher', () => {
    const w = initPoeReWidget(7)
    expect(w.wmId).toBe(7)
    expect(w.wmType).toBe(POE_RE_TYPE)
    expect(w.wmWants).toBe('hide')
    expect(w.wmFlags).toContain('menu::skip')
    expect(w.wmFlags).toContain('invisible-on-blur')
  })
})

describe('reading poe.re', () => {
  it('trims what the page gives back', () => {
    expect(asResult({ found: true, text: '  "y: (n|m)" \n', page: ' Vendor Regex ', path: '/vendor' }))
      .toEqual({ found: true, text: '"y: (n|m)"', page: 'Vendor Regex', path: '/vendor' })
  })

  it('treats anything else as empty', () => {
    expect(asResult(null)).toEqual({ found: false, text: '', page: '', path: '' })
    expect(asResult('nope')).toEqual({ found: false, text: '', page: '', path: '' })
    expect(asResult({ text: 5, page: null })).toEqual({ found: false, text: '', page: '', path: '' })
  })

  it('only offers clipboard text that could be a search string', () => {
    expect(clipboardSearch('  "!eflec"  ', 250)).toBe('"!eflec"')
    expect(clipboardSearch('Item Class: Rings\nRarity: Rare', 250)).toBe('')
    expect(clipboardSearch('x'.repeat(251), 250)).toBe('')
    expect(clipboardSearch('   ', 250)).toBe('')
  })
})

describe('naming a saved string', () => {
  it('files it under the poe.re page it came from', () => {
    expect(categoryFor('/maps')).toBe('Maps')
    expect(categoryFor('/vendor')).toBe('Vendor')
    expect(categoryFor('/beast')).toBe('Bestiary')
    expect(categoryFor('/Maps/')).toBe('Maps')
    expect(categoryFor('/maps?x=1')).toBe('Maps')
  })

  it('falls back to "poe.re" for pages it does not know', () => {
    expect(categoryFor('/')).toBe('poe.re')
    expect(categoryFor('/favorites')).toBe('poe.re')
    expect(categoryFor('')).toBe('poe.re')
  })

  it('names it after the page heading, without "Regex"', () => {
    expect(suggestName('Vendor Regex', '/vendor')).toBe('Vendor')
    expect(suggestName('Optimized Map Modifiers Regex', '/maps')).toBe('Optimized Map Modifiers')
    expect(suggestName('', '/maps')).toBe('Maps')
  })
})

describe('where the window first opens', () => {
  it('knows a window that was never placed', () => {
    expect(isDefaultAnchor(initPoeReWidget(1).anchor)).toBe(true)
    expect(isDefaultAnchor({ pos: 'tl', x: 40, y: 12 })).toBe(false)
  })

  it('goes right of a library on the left half', () => {
    expect(anchorBeside({ left: 192, top: 130, right: 542 }, 1920, 1080)).toEqual({ pos: 'tl', x: 550 / 1920 * 100, y: 130 / 1080 * 100 })
  })

  it('goes left of a library on the right half', () => {
    expect(anchorBeside({ left: 1400, top: 100, right: 1750 }, 1920, 1080)).toEqual({ pos: 'tr', x: 1392 / 1920 * 100, y: 100 / 1080 * 100 })
  })
})
