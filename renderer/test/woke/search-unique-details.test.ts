// Search's unique details: variants, Foulborn kinds with what they replace,
// and the Vestigial implicit, from the shipped tooltip data.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { modShape, uniqueDetails } from '@/web/woke/search/unique-details'
import { vestigialByUnique } from '../../scripts/build-vestigial-data.mjs'
import type { TipUnique } from '@/web/woke/ui/tooltip/tip-content'

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../public/data/tips/${f}`, import.meta.url), 'utf8'))
const uniques: Record<string, TipUnique> = read('uniques.json')
const vestigial: Record<string, string[][]> = read('vestigial.json')

describe('uniqueDetails', () => {
  it("Utula's Hunger: Foulborn swaps the life line, Vestigial leaves +250 life", () => {
    const d = uniqueDetails("Utula's Hunger", uniques, vestigial)!
    expect(d.variants).toHaveLength(1)
    expect(d.variants[0].differs).toEqual([])
    expect(d.foulborn).toEqual([{
      name: 'No Defence ES',
      adds: ['+(1200-1800) to maximum Energy Shield if there are no Defence Modifiers on other Equipped Items'],
      replaces: ['+(704-1000) to maximum Life if there are no Life Modifiers on other Equipped Items']
    }])
    expect(d.vestigial).toEqual([['+250 to maximum Life if there are no Life Modifiers on other Equipped Items']])
  })

  it("Berek's Grip: each Foulborn kind replaces its own lines, not a reroll range", () => {
    const d = uniqueDetails("Berek's Grip", uniques, vestigial)!
    const byName = Object.fromEntries(d.foulborn.map(f => [f.name, f.replaces]))
    expect(byName['Freeze Damage']).toEqual(['1% of Damage Leeched as Energy Shield against Frozen Enemies'])
    expect(byName['Shock Debilitate']).toEqual(['1% of Damage Leeched as Life against Shocked Enemies'])
    expect(byName['Shock Debilitate, Freeze Damage']).toHaveLength(2)
    expect(d.vestigial).toEqual([])
  })

  it("Atziri's Splendour: variants list only the lines that differ", () => {
    const d = uniqueDetails("Atziri's Splendour", uniques, vestigial)!
    expect(d.variants.length).toBeGreaterThan(5)
    const armour = d.variants.find(v => v.name === 'Armour')!
    expect(armour.differs).toContain('(386-420)% increased Armour')
    expect(armour.differs).not.toContain('Gain 100 Life per Enemy Killed')
    expect(d.foulborn).toEqual([])
  })

  it('a pool of mods (Watcher\'s Eye) is left out, and an unknown name has nothing', () => {
    expect(uniqueDetails("Watcher's Eye", uniques, vestigial)?.variants ?? []).toEqual([])
    expect(uniqueDetails('Not A Unique', uniques, vestigial)).toBeNull()
    expect(uniqueDetails("Utula's Hunger", null, null)).toBeNull()
  })

  it('review cases: same-named variant, a same-shaped implicit, the vendor note, accented names', () => {
    const mb = uniqueDetails('Mageblood', uniques, vestigial)!
    const three = mb.foulborn.find(f => f.name === '3 Flasks')!
    expect(three.replaces.join()).toContain('Leftmost 3 Magic Utility Flasks')
    expect(mb.foulborn.flatMap(f => f.replaces)).not.toContain('Item sells for much more to vendors')
    const gifts = uniqueDetails('Gifts from Above', uniques, vestigial)!.foulborn.find(f => f.name === 'Consecrated')!
    expect(gifts.replaces).toEqual(['(30-42)% increased Global Critical Strike Chance'])
    const lion = uniqueDetails("Lioneye's Remorse", uniques, vestigial)!.foulborn.find(f => f.name === 'Life as Armour')!
    expect(lion.replaces).toEqual(['+(160-180) to maximum Life'])
    expect(uniqueDetails('Doppelgänger Guise', uniques, vestigial)!.vestigial.length).toBe(1)
  })

  it('modShape ignores numbers and wiki links', () => {
    expect(modShape('(25-33)% increased Cold Damage')).toBe(modShape('(25-36)% increased [Cold] Damage'))
    expect(modShape('+250 to maximum Life')).toBe(modShape('+(704-1000) to maximum Life'))
  })
})

describe('vestigialByUnique', () => {
  it('reads mod lines by id and joins names, skipping empty and duplicate mods', () => {
    const vest = 'return {\n\t["DivergentA__1"] = {\n\t\t"Goldrim",\n\t},\n\t["DivergentB__1"] = {\n\t},\n\t["DivergentC__1"] = {\n\t\t"Volkuur\'s Guidance",\n\t},\n\t["DivergentC__2"] = {\n\t\t"Volkuur\'s Guidance",\n\t},\n}'
    const mods = [
      '\t["DivergentA__1"] = { affix = "", "+20% to all Elemental Resistances", statOrder = { 1 }, level = 1 },',
      '\t["DivergentB__1"] = { affix = "", "Unused", statOrder = { 1 }, level = 1 },',
      '\t["DivergentC__1"] = { affix = "", "Your Cold Damage can Poison", "50% less Poison Duration", statOrder = { 1, 2 }, level = 1 },',
      '\t["DivergentC__2"] = { affix = "", "Your Cold Damage can Poison", "50% less Poison Duration", statOrder = { 1, 2 }, level = 1 },'
    ].join('\n')
    expect(vestigialByUnique(vest, mods)).toEqual({
      'Goldrim': [['+20% to all Elemental Resistances']],
      "Volkuur's Guidance": [['Your Cold Damage can Poison', '50% less Poison Duration']]
    })
  })
})
