// A price just under a divine, or a card just under a million, reads in the
// unit its rounded number belongs to.
import { describe, expect, it } from 'vitest'
import { formatChaos } from '@/web/woke/ui/format'
import { oneInText } from '@/web/woke/card-drops/card-drops'

describe('rounding at a unit boundary', () => {
  it('199.6c with divine at 200 reads 1 div, not 200 c', () => {
    expect(formatChaos(199.6, 200)).toBe('1 div')
    expect(formatChaos(-199.6, 200)).toBe('-1 div')
    expect(formatChaos(199.4, 200)).toBe('199 c')
    expect(formatChaos(200.4, 200)).toBe('1 div')
  })
  it('1 in 999,600 reads 1 in 1M, not 1000k', () => {
    expect(oneInText(999_600)).toBe('1 in 1M')
    expect(oneInText(999_400)).toBe('1 in 999k')
  })
})
