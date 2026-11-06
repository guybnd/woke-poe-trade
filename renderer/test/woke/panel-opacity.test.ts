import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { MAX_BACKDROP, NO_BACKDROP, backdropColour, backdropPercent, parsePanelOpacity } from '@/web/woke/ui/see-through'

describe('darken strength', () => {
  it('reads APT colours by their alpha', () => {
    expect(backdropPercent('rgba(129, 139, 149, 0.15)')).toBe(15)
    expect(backdropPercent(NO_BACKDROP)).toBe(0)
    expect(backdropPercent('rgb(0 0 0 / 40%)')).toBe(40)
    expect(backdropPercent('transparent')).toBe(0)
    expect(backdropPercent('#000')).toBe(100)
  })

  it('writes black at the strength, and the old "none" colour at 0', () => {
    expect(backdropColour(30)).toBe('rgba(0, 0, 0, 0.3)')
    expect(backdropColour(0)).toBe(NO_BACKDROP)
    expect(backdropPercent(backdropColour(MAX_BACKDROP + 50))).toBe(MAX_BACKDROP)
  })
})

describe('panel opacity', () => {
  it('defaults to solid and clamps stored values', () => {
    expect(parsePanelOpacity(null)).toBe(100)
    expect(parsePanelOpacity('abc')).toBe(100)
    expect(parsePanelOpacity('5')).toBe(30)
    expect(parsePanelOpacity('72')).toBe(72)
  })

  it('themes only set the *-base colours, so the opacity rule can fade them', () => {
    const css = fs.readFileSync(path.join(__dirname, '../../src/web/woke/ui/theme.css'), 'utf8')
    const block = css.slice(css.indexOf('Panel opacity'))
    const before = css.slice(0, css.indexOf('Panel opacity'))
    for (const tok of ['panel', 'panel-2', 'panel-solid', 'pc-window', 'pc-well']) {
      expect(before).not.toMatch(new RegExp(`--w-${tok}:`))
      expect(block).toContain(`--w-${tok}: color-mix(`)
    }
  })
})
