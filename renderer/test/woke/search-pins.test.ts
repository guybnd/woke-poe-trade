// Pick pin-compare: Ctrl + P pins are saved with the window, so a restart
// keeps them until you clear them.
import { describe, it, expect } from 'vitest'
import { PIN_MAX, isPinned, togglePin } from '@/web/woke/search/widget'
import type { SearchWidget } from '@/web/woke/search/widget'

const row = (name: string, variant = '') => ({ type: 'Currency', name, variant, chaos: 1 })

describe('pins to compare', () => {
  it('pins and unpins, keeping only the row fields in the saved config', () => {
    const w: Pick<SearchWidget, 'pins'> = {}
    togglePin(w, row('Divine Orb'))
    togglePin(w, row('Mirror of Kalandra'))
    expect(w.pins).toEqual([{ type: 'Currency', name: 'Divine Orb', variant: '' }, { type: 'Currency', name: 'Mirror of Kalandra', variant: '' }])
    expect(isPinned(w, row('Divine Orb'))).toBe(true)
    // A variant is its own row.
    expect(isPinned(w, row('Divine Orb', 'x'))).toBe(false)
    togglePin(w, row('Divine Orb'))
    togglePin(w, row('Mirror of Kalandra'))
    expect(w.pins).toBeUndefined()
  })

  it('survives a save and load (plain JSON), and drops the oldest past the limit', () => {
    const w: Pick<SearchWidget, 'pins'> = {}
    for (let i = 0; i <= PIN_MAX; i++) togglePin(w, row(`Item ${i}`))
    const back = JSON.parse(JSON.stringify(w)) as Pick<SearchWidget, 'pins'>
    expect(back.pins).toHaveLength(PIN_MAX)
    expect(back.pins![0].name).toBe('Item 1')
    expect(isPinned(back, row(`Item ${PIN_MAX}`))).toBe(true)
  })
})
