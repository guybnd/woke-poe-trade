// Captured beasts' Bestiary group and family (mechanics/beast-kinds.ts).
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { beastKind, beastKindLabel } from '@/web/woke/mechanics/beast-kinds'

describe('beast kinds', () => {
  it('knows every captured beast in the item data', () => {
    const file = path.resolve(__dirname, '../../public/data/en/items.ndjson')
    const names = fs.readFileSync(file, 'utf-8').split('\n')
      .filter(l => l.includes('"CAPTURED_BEAST"'))
      .map(l => JSON.parse(l).name as string)
    expect(names.length).toBeGreaterThan(200)
    expect(names.filter(n => !beastKind(n))).toEqual([])
  })

  it('labels group and family', () => {
    expect(beastKindLabel('Craicic Croaker')).toBe('Amphibian · Deep')
    expect(beastKindLabel('Fenumal Plagued Arachnid')).toBe('Arachnid · Caverns')
    expect(beastKindLabel('Wild Bristle Matron')).toBe('Ursa · Wilds')
    expect(beastKindLabel('Vivid Vulture')).toBe('Avian · Sands')
    // poe.ninja and the game spell it with and without the accent.
    expect(beastKindLabel('Black Morrigan')).toBe('Unnatural · Wilds')
    expect(beastKindLabel('Mirror of Kalandra')).toBeUndefined()
  })
})
