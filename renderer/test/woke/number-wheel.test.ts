import { describe, it, expect } from 'vitest'
import { wheelValue } from '@/web/woke/ui/number-wheel'

describe('wheelValue', () => {
  it('steps by one with no step set, or step any', () => {
    expect(wheelValue({ value: '34' }, 1)).toBe('35')
    expect(wheelValue({ value: '34' }, -1)).toBe('33')
    expect(wheelValue({ value: '1.5', step: 'any' }, 1)).toBe('2.5')
  })
  it('steps decimals without drift', () => {
    expect(wheelValue({ value: '0.29', step: '0.01' }, 1)).toBe('0.3')
    expect(wheelValue({ value: '0.1', step: '0.1' }, 1)).toBe('0.2')
  })
  it('stays inside min and max, and leaves a typed value past them alone', () => {
    expect(wheelValue({ value: '40', min: '30', max: '40' }, 1)).toBeNull()
    expect(wheelValue({ value: '30', min: '30', max: '40' }, -1)).toBeNull()
    expect(wheelValue({ value: '45', min: '30', max: '40' }, 1)).toBeNull()
    expect(wheelValue({ value: '0', min: '0' }, -1)).toBeNull()
  })
  it('snaps an off-grid value to the next step', () => {
    expect(wheelValue({ value: '34.4', step: '1' }, 1)).toBe('35')
    expect(wheelValue({ value: '34.4', step: '1' }, -1)).toBe('34')
  })
  it('starts an empty box from data-wheel-from, else the bound it leaves', () => {
    expect(wheelValue({ value: '', from: '37', min: '30', max: '40' }, 1)).toBe('37')
    expect(wheelValue({ value: '', from: '37', min: '30', max: '40' }, -1)).toBe('37')
    expect(wheelValue({ value: '', min: '30', max: '40' }, 1)).toBe('30')
    expect(wheelValue({ value: '', min: '30', max: '40' }, -1)).toBe('40')
    expect(wheelValue({ value: '' }, 1)).toBe('0')
  })
  it('never wheels a box with no min below 0, but steps a typed negative', () => {
    expect(wheelValue({ value: '0' }, -1)).toBeNull()
    expect(wheelValue({ value: '0.5', step: 'any' }, -1)).toBe('0')
    expect(wheelValue({ value: '-2' }, -1)).toBe('-3')
  })
  it('handles negative ranges', () => {
    expect(wheelValue({ value: '-5', min: '-10', max: '-1' }, 1)).toBe('-4')
  })
})
