// Base ranks: dragging a base, or the picked set, onto another column.
import { describe, it, expect } from 'vitest'
import { canDrop, dragSet, dropMoves } from '@/web/woke/loot-filter/gear-drop'

describe('gear drag and drop', () => {
  it('drags the picked set when the card is in it, else the card alone', () => {
    expect(dragSet(['A', 'B'], 'B')).toEqual(['A', 'B'])
    expect(dragSet(['A', 'B'], 'C')).toEqual(['C'])
    expect(dragSet([], 'C')).toEqual(['C'])
  })

  it('drops anywhere but its own column and Exotic', () => {
    expect(canDrop('r1', 'r2')).toBe(true)
    expect(canDrop('exotic', 'never')).toBe(true)
    expect(canDrop('r1', 'r1')).toBe(false)
    expect(canDrop('r1', 'exotic')).toBe(false)
  })

  it('maps a drop to the pick bar\'s moves', () => {
    expect(dropMoves('r2', 'build')).toEqual(['build'])
    expect(dropMoves('none', 'r1')).toEqual(['r1'])
    expect(dropMoves('r3', 'never')).toEqual(['never'])
    // Out of Build: leaves the build and takes the rank.
    expect(dropMoves('build', 'r2')).toEqual(['unbuild', 'r2'])
    expect(dropMoves('build', 'never')).toEqual(['never'])
    expect(dropMoves('build', 'build')).toEqual([])
    expect(dropMoves('r1', 'exotic')).toEqual([])
    expect(dropMoves('exotic', 'exotichi')).toEqual(['exotichi'])
    expect(dropMoves('exotichi', 'exotic')).toEqual(['exotic'])
  })

  it('swaps bases between the two exotic columns only', () => {
    expect(canDrop('exotic', 'exotichi')).toBe(true)
    expect(canDrop('exotichi', 'exotic')).toBe(true)
    expect(canDrop('r1', 'exotichi')).toBe(false)
    expect(canDrop('none', 'exotic')).toBe(false)
    expect(canDrop('exotichi', 'r2')).toBe(true)
  })
})
