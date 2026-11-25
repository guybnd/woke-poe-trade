import { describe, expect, it } from 'vitest'
import { helpBlocks, helpParagraphs, helpPlain, helpTip, hideHelp, placeHelp, showHelp } from '@/web/woke/ui/help-tip'
import { fillTipCard, placeAtPointer } from '@/web/woke/ui/title-tip'

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

describe('fillTipCard', () => {
  // A stand-in for the few DOM calls the card makes (tests run without a DOM).
  class FakeEl {
    children: FakeEl[] = []
    attrs: Record<string, string> = {}
    ownerDocument = { createElement: (tag: string) => new FakeEl(tag) }
    tag: string
    private text = ''
    constructor (tag: string) { this.tag = tag }
    setAttribute (k: string, v: string) { this.attrs[k] = v }
    appendChild (c: FakeEl) { this.children.push(c) }
    get textContent () { return this.text }
    set textContent (v: string) { this.text = v; this.children = [] }
  }
  const el = (tag: string) => new FakeEl(tag)
  it('shows only the text without a shortcut', () => {
    const card = el('div')
    fillTipCard(card as unknown as HTMLElement, ' Open the poedb page. ', null)
    expect(card.textContent).toBe('Open the poedb page.')
    expect(card.children).toHaveLength(0)
  })
  it('adds the shortcut as boxed keys', () => {
    const card = el('div')
    fillTipCard(card as unknown as HTMLElement, 'Copy the name.', 'Ctrl + Shift + C')
    expect(card.children).toHaveLength(1)
    expect(card.children[0].children.map(k => [k.tag, k.textContent])).toEqual([['kbd', 'Ctrl'], ['kbd', 'Shift'], ['kbd', 'C']])
  })
})

describe('helpBlocks (help text format)', () => {
  it('keeps plain text as one paragraph', () => {
    expect(helpBlocks('One line.\nStill one.')).toEqual([{ k: 'p', parts: [{ k: 'text', v: 'One line. Still one.' }] }])
  })
  it('reads a lead line, bullets, bold names and keys', () => {
    const b = helpBlocks('Tunes the search.\n- **Has** finds maps with it.\n- [[Right-click]] marks it.\n\nNothing is searched.')
    expect(b.map(x => x.k)).toEqual(['p', 'ul', 'p'])
    expect(b[1]).toEqual({
      k: 'ul',
      items: [
        [{ k: 'b', v: 'Has' }, { k: 'text', v: ' finds maps with it.' }],
        [{ k: 'kbd', v: 'Right-click' }, { k: 'text', v: ' marks it.' }]
      ]
    })
  })
  it('ends a list at a plain line', () => {
    expect(helpBlocks('- One\nAfter.').map(x => x.k)).toEqual(['ul', 'p'])
  })
  it('strips the markup for screen readers', () => {
    expect(helpPlain('Lead.\n- **Has** with it\n- [[Shift + Click]] range')).toBe('Lead. Has with it. Shift + Click range.')
    expect(helpPlain('Counts, first to last:\n- Typed\n- Estimates\n\nPrices from poe.ninja.')).toBe('Counts, first to last: Typed. Estimates. Prices from poe.ninja.')
    expect(helpPlain('One.\n- Ends here.\n- Also.')).toBe('One. Ends here. Also.')
  })
})
