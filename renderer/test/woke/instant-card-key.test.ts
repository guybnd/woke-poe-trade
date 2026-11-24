// Space or Enter on the instant price card opens Live offers, which runs a trade
// search. On a button reached with the keyboard the key is that button's: Enter on
// Details is Details, not a search.
import { describe, expect, it } from 'vitest'
import { instantCardKey, onKeyboardFocusedControl } from '@/web/woke/price-insight/instant-card-key'

// Stand-ins for elements (the tests run without a DOM).
const el = (opts: { control?: boolean, focusVisible?: boolean, noFocusVisible?: boolean }) => ({
  closest: (sel: string) => opts.control && sel.includes('button')
    ? {
        matches: (q: string) => {
          if (opts.noFocusVisible) throw new SyntaxError(q)
          return q === ':focus-visible' && opts.focusVisible === true
        }
      }
    : null
}) as unknown as Element

describe('instantCardKey', () => {
  it('opens Live offers on Space or Enter off a control', () => {
    expect(instantCardKey(' ', false)).toBe('live')
    expect(instantCardKey('Enter', false)).toBe('live')
  })

  it('leaves Space and Enter to a keyboard-focused button, so Details never runs a search', () => {
    expect(instantCardKey('Enter', true)).toBeNull()
    expect(instantCardKey(' ', true)).toBeNull()
  })

  it('closes on Escape, wherever focus is', () => {
    expect(instantCardKey('Escape', true)).toBe('close')
    expect(instantCardKey('Escape', false)).toBe('close')
  })

  it('ignores other keys', () => {
    expect(instantCardKey('a', false)).toBeNull()
  })
})

describe('onKeyboardFocusedControl', () => {
  it('is a control reached with the keyboard', () => {
    expect(onKeyboardFocusedControl(el({ control: true, focusVisible: true }))).toBe(true)
  })

  it('is not a button the mouse clicked, nor the page', () => {
    expect(onKeyboardFocusedControl(el({ control: true, focusVisible: false }))).toBe(false)
    expect(onKeyboardFocusedControl(el({}))).toBe(false)
    expect(onKeyboardFocusedControl(null)).toBe(false)
  })

  it('keeps a focused control\'s keys where :focus-visible is unknown', () => {
    expect(onKeyboardFocusedControl(el({ control: true, noFocusVisible: true }))).toBe(true)
  })
})
