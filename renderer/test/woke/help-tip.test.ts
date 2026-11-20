import { describe, expect, it } from 'vitest'
import { helpParagraphs, helpTip, hideHelp, placeHelp, showHelp } from '@/web/woke/ui/help-tip'
import { placeAtPointer } from '@/web/woke/ui/title-tip'

const screen = { width: 1000, height: 600 }
const card = { width: 300, height: 100 }

describe('placeHelp', () => {
  it('goes right of the ? when it fits', () => {
    expect(placeHelp({ left: 100, right: 115, top: 50 }, card, screen)).toEqual({ left: 123, top: 46 })
  })
  it('goes left when the right side has no room', () => {
    expect(placeHelp({ left: 900, right: 915, top: 50 }, card, screen).left).toBe(592)
  })
  it('stays in the window when neither side fits', () => {
    expect(placeHelp({ left: 100, right: 115, top: 50 }, { width: 950, height: 100 }, screen).left).toBe(8)
  })
  it('moves up from the bottom edge and down from the top edge', () => {
    expect(placeHelp({ left: 100, right: 115, top: 590 }, card, screen).top).toBe(492)
    expect(placeHelp({ left: 100, right: 115, top: 2 }, card, screen).top).toBe(8)
  })
})

describe('helpParagraphs', () => {
  it('splits on blank lines and drops empties', () => {
    expect(helpParagraphs('One.\n\nTwo.\n  \nThree.\n\n')).toEqual(['One.', 'Two.', 'Three.'])
  })
  it('keeps a single line break in its paragraph', () => {
    expect(helpParagraphs('One\nstill one')).toEqual(['One\nstill one'])
  })
})

describe('showHelp and hideHelp', () => {
  const target = { getBoundingClientRect: () => ({ left: 0, right: 0, top: 0 }) } as unknown as HTMLElement
  it('leaves another ?\'s card alone when an old one hides', () => {
    const a = {}
    const b = {}
    showHelp(a, target, 'a')
    showHelp(b, target, 'b')
    hideHelp(a)
    expect(helpTip.value?.text).toBe('b')
    hideHelp(b)
    expect(helpTip.value).toBeNull()
  })
  it('carries key rows with or without text', () => {
    showHelp({}, target, '', [{ keys: 'Alt + BracketLeft', label: 'Looser' }])
    expect(helpTip.value?.keys).toEqual([{ keys: 'Alt + BracketLeft', label: 'Looser' }])
    expect(helpParagraphs(helpTip.value!.text)).toEqual([])
    hideHelp()
  })
  it('closes whichever card is open with no owner', () => {
    showHelp({}, target, 'a')
    hideHelp()
    expect(helpTip.value).toBeNull()
  })
})

describe('placeAtPointer (title hovers)', () => {
  it('sits under the pointer', () => {
    expect(placeAtPointer({ x: 200, y: 100 }, card, screen)).toEqual({ left: 192, top: 120 })
  })
  it('goes above the pointer at the bottom edge', () => {
    expect(placeAtPointer({ x: 200, y: 550 }, card, screen).top).toBe(442)
  })
  it('stays inside the window at the right and top edges', () => {
    expect(placeAtPointer({ x: 990, y: 100 }, card, screen).left).toBe(692)
    expect(placeAtPointer({ x: 200, y: 40 }, { width: 300, height: 580 }, screen).top).toBe(8)
  })
})
