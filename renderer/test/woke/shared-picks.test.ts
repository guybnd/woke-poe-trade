// One Ctrl/Shift picking for every list (shared/picks), and the loot filter's
// one tier move note.
import { describe, expect, it } from 'vitest'
import { runOf, selectPick, togglePick } from '@/web/woke/shared/picks'
import { pickBases } from '@/web/woke/loot-filter/groups'
import { movedNote } from '@/web/woke/loot-filter/tier-move'

const LIST = ['a', 'b', 'c', 'd', 'e']
const plain = { shift: false, ctrl: false }
const shift = { shift: true, ctrl: false }
const ctrl = { shift: false, ctrl: true }

describe('runOf', () => {
  it('is the rows between two, either way, or null when one left', () => {
    expect(runOf(LIST, 'b', 'd')).toEqual(['b', 'c', 'd'])
    expect(runOf(LIST, 'd', 'b')).toEqual(['b', 'c', 'd'])
    expect(runOf(LIST, 'x', 'b')).toBeNull()
  })
})

describe('togglePick (chips, lanes, check boxes)', () => {
  it('a click or Ctrl + click toggles one and keeps the rest', () => {
    expect(togglePick(LIST, ['a'], 'c', plain, 'a')).toEqual(['a', 'c'])
    expect(togglePick(LIST, ['a', 'c'], 'c', ctrl, 'a')).toEqual(['a'])
  })
  it('Shift adds the run from the anchor, and is a plain click without one', () => {
    expect(togglePick(LIST, ['e'], 'd', shift, 'b')).toEqual(['e', 'b', 'c', 'd'])
    expect(togglePick(LIST, [], 'd', shift, null)).toEqual(['d'])
    expect(togglePick(LIST, [], 'd', shift, 'gone')).toEqual(['d'])
  })
  it('is what loot filter chips do', () => {
    expect(pickBases(LIST, ['e'], 'd', true, 'b')).toEqual(togglePick(LIST, ['e'], 'd', shift, 'b'))
  })
})

describe('selectPick (file lists: Atlas strategies)', () => {
  it('a click opens one and drops the picks', () => {
    expect(selectPick(LIST, ['a', 'b'], 'd', plain, 'a')).toEqual({ picked: [], anchor: 'd' })
  })
  it('Ctrl starts from the open one, toggles, and opens what it picks', () => {
    expect(selectPick(LIST, [], 'c', ctrl, 'a')).toEqual({ picked: ['a', 'c'], anchor: 'c' })
    expect(selectPick(LIST, ['a', 'c'], 'c', ctrl, 'c')).toEqual({ picked: ['a'], anchor: 'c' })
    expect(selectPick(LIST, [], 'c', ctrl, 'gone')).toEqual({ picked: ['c'], anchor: 'c' })
  })
  it('Shift picks the run from the open one, which stays open', () => {
    expect(selectPick(LIST, ['e'], 'd', shift, 'b')).toEqual({ picked: ['b', 'c', 'd'], anchor: 'b' })
    expect(selectPick(LIST, [], 'd', shift, null)).toEqual({ picked: [], anchor: 'd' })
  })
})

describe('tier move note', () => {
  it('names one item, or counts several', () => {
    expect(movedNote(['Chaos Orb'], 'Tier 2')).toBe('Moved Chaos Orb to Tier 2')
    expect(movedNote(['A', 'B'], 'Tier 2')).toBe('Moved 2 items to Tier 2')
  })
})
