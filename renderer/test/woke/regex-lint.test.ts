import { describe, it, expect } from 'vitest'
import { regexLint } from '@/web/woke/regex-library/widget'

describe('regex library typo checks', () => {
  it('flags unbalanced quotes, edge spaces and doubled spaces', () => {
    expect(regexLint(String.raw`"[89]d% inc" "rare`)).toHaveLength(1)
    expect(regexLint('"tempest "')[0]).toMatch(/quoted term/)
    // Spaces outside quotes only separate terms.
    expect(regexLint(' "tempest" ')).toEqual([])
    expect(regexLint('"a"  "b"')[0]).toMatch(/Two spaces/)
  })

  it('leaves a clean search alone', () => {
    expect(regexLint('"!ele weak" "rare"')).toEqual([])
    expect(regexLint('')).toEqual([])
  })
})
