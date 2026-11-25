// What a captured beast's tooltip says it does: its Blood Altar recipes, from
// the same table as its price page.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { beastCraftLines } from '@/web/woke/ui/tooltip/beast-crafts'
import type { BestiaryData } from '@/web/woke/search/lookups/bestiary'

const data = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/bestiary-data.json'), 'utf8')) as BestiaryData

describe('beast crafts', () => {
  it('says what the Farric Alphas beside Exalted Orb do', () => {
    expect(beastCraftLines(data, 'Farric Lynx Alpha').map(l => l.text)).toEqual(['Modify Mods on an Item: Add a Suffix, Remove a Random Prefix', 'Only works on rare items'])
    expect(beastCraftLines(data, 'Farric Lynx Alpha').map(l => l.recipe)).toEqual([true, false])
  })

  it('spells Modifier right and lists every recipe a beast is in', () => {
    const lines = beastCraftLines(data, 'Fenumal Plagued Arachnid').map(l => l.text)
    expect(lines.some(l => l.startsWith('Fracture two Modifiers:'))).toBe(true)
    expect(lines.join('\n')).not.toMatch(/Modifer/)
    expect(beastCraftLines(data, 'No Such Beast')).toEqual([])
  })
})
