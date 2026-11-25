// Ctrl+Space teaching itself (hidden-features audit, P5): "keys" lists every
// hotkey and mouse trick, the placeholder tries a real query, and examples for
// a tool that's off stay out.
import { describe, it, expect } from 'vitest'
import { GESTURES, keysLookup, wantsKeys } from '@/web/woke/search/lookups/keys'
import { EXAMPLES, PLACEHOLDER_TRIES, exampleCards, placeholderFor } from '@/web/woke/search/lookups/examples'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const ctx = {} as LookupContext

describe('keys', () => {
  const lookup = keysLookup(() => [{ label: 'Price check', group: 'Price check', keys: 'Ctrl + D' }])
  it('answers "keys", "hotkeys", "tips" and not item names', () => {
    for (const q of ['keys', 'Hotkeys', ' tips ', 'shortcuts']) expect(wantsKeys(q)).toBe(true)
    for (const q of ['key', 'ancient reliquary key', 'tip']) expect(wantsKeys(q)).toBe(false)
  })
  it('lists your hotkeys, then the mouse tricks', () => {
    const [card] = lookup('keys', ctx)
    expect(card.sections[0].rows).toEqual([{ label: 'Price check', value: 'Ctrl + D' }])
    expect(card.sections[1].rows).toHaveLength(GESTURES.length)
    expect(card.sub).toBe(`1 hotkeys set · ${GESTURES.length} mouse tricks`)
  })
  it('skips the hotkey section with none set', () => {
    const [card] = keysLookup(() => [])('keys', ctx)
    expect(card.sections).toHaveLength(1)
  })
})

describe('Things to try', () => {
  it('leaves out an example whose tool is off', () => {
    expect(exampleCards(() => null, new Set()).some(c => c.name === 'sold')).toBe(false)
    expect(exampleCards(() => null, new Set(['woke-net-worth'])).some(c => c.name === 'sold')).toBe(true)
    expect(EXAMPLES.some(e => e.query === 'keys')).toBe(true)
  })
  it('tries a new query in the placeholder each open', () => {
    expect(placeholderFor(0)).toBe(`Item, tool or setting. Try: ${PLACEHOLDER_TRIES[0]}`)
    expect(placeholderFor(1)).not.toBe(placeholderFor(0))
    expect(placeholderFor(PLACEHOLDER_TRIES.length)).toBe(placeholderFor(0))
  })
})
