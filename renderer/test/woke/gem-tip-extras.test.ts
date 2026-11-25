// A gem tooltip's version prices and where to get it (tooltip audit pick I5).
import { describe, expect, it } from 'vitest'
import { gemLadder, gemSource } from '@/web/woke/ui/tooltip/gem-tip-extras'
import table from '@/web/woke/pob-builds/gem-sources.json'
import type { GemTable } from '@/web/woke/search/lookups/gems'

const fmt = (c: number) => `${c}c`
const text = (lines: ReturnType<typeof gemLadder>) => lines.map(l => l.map(p => p.text).join(''))
const gems = table as unknown as GemTable

describe('gem price ladder', () => {
  it('lists versions by level, quality and corruption, two to a line', () => {
    const lines = text(gemLadder([{ variant: '21/20c', chaos: 40 }, { variant: '20/20', chaos: 15 }, { variant: '1', chaos: 1 }], '20/20', fmt))
    expect(lines).toEqual(['1 1c   20/20 15c', '21/20 corrupted 40c'])
  })
  it('shows no ladder for a gem with one version', () => {
    expect(gemLadder([{ variant: '3', chaos: 700 }], undefined, fmt)).toEqual([])
  })
  it('says how many more versions it left out', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ variant: String(i + 1), chaos: i }))
    expect(text(gemLadder(rows, undefined, fmt)).at(-1)).toBe('and 2 more versions')
  })
})

describe('where a gem comes from', () => {
  it('a quest reward, a transfigured gem, a boss drop', () => {
    expect(gemSource('Leap Slam', gems)).toBe('Quest reward, Act 1 (The Caged Brute)')
    expect(gemSource('Ice Nova of Frostbolts', gems)).toBe('Transfigured Ice Nova: Divine Font in the Labyrinth')
    expect(gemSource('Awakened Empower Support', gems)).toBe('Drops from Uber Maven')
  })
  it('a vendor gem with no quest', () => {
    expect(gemSource('Fireball', gems)).toBe('Sold by Nessa, Act 1')
  })
})
