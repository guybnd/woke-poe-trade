import { describe, it, expect, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '' } }))

const { filterLoaded } = await import('../../main/src/woke/neversink')

describe('filterLoaded', () => {
  it('counts the filter name as loaded, which is what the game writes', () => {
    expect(filterLoaded('qX78lnfV', 'qX78lnfV')).toBe(true)
  })

  it('reads the older true and false', () => {
    expect(filterLoaded('true', 'x')).toBe(true)
    expect(filterLoaded('false', 'x')).toBe(false)
    expect(filterLoaded(true, 'x')).toBe(true)
    expect(filterLoaded(false, 'x')).toBe(false)
  })

  it('counts an empty value or another filter as not loaded', () => {
    expect(filterLoaded('', 'x')).toBe(false)
    expect(filterLoaded('other', 'x')).toBe(false)
  })

  it('matches the name with or without .filter, in any case', () => {
    expect(filterLoaded('MyFilter', 'MyFilter.filter')).toBe(true)
    expect(filterLoaded('myfilter.filter', 'MyFilter')).toBe(true)
    expect(filterLoaded('x', null)).toBe(false)
  })

  it('is unknown when the game wrote nothing', () => {
    expect(filterLoaded(undefined, 'x')).toBeNull()
  })
})
