// The Path of Building readers behind tips/base-extras.json and
// tips/unique-extras.json, on small samples in Path of Building's format.
import { describe, expect, it } from 'vitest'
import { baseExtras } from '../../scripts/build-base-extras.mjs'
import { parseUnique, uniquesIn } from '../../scripts/build-unique-extras.mjs'

const BASES = `itemBases["Amethyst Ring"] = {
\tbaseId = "Metadata/Items/Rings/Ring10",
\ttype = "Ring",
\timplicit = "+(13-19)% to Chaos Resistance",
\treq = { level = 30, },
}
itemBases["Large Hybrid Flask"] = {
\ttype = "Flask",
\tflask = { life = 510, mana = 140, duration = 5, chargesUsed = 20, chargesMax = 40, },
\treq = { level = 30, },
}
itemBases["Quicksilver Flask"] = {
\ttype = "Flask",
\tflask = { duration = 6, chargesUsed = 30, chargesMax = 60, buff = { "40% increased Movement Speed" }, },
}
itemBases["Ashbark Tincture"] = {
\timplicit = "25% chance to Ignite with Melee Weapons\\n(60-90)% increased Damage with Ignite from Melee Weapons",
\ttincture = { manaBurn = 0.6, cooldown = 7 },
}
itemBases["Plain Jewel"] = {
\ttype = "Jewel",
}`

describe('base extras', () => {
  const out = baseExtras(BASES)
  it('reads an implicit, split into lines', () => {
    expect(out['Amethyst Ring'].im).toEqual(['+(13-19)% to Chaos Resistance'])
    expect(out['Ashbark Tincture'].im).toHaveLength(2)
  })
  it('reads a flask and a tincture', () => {
    expect(out['Large Hybrid Flask'].fl).toEqual({ l: 510, m: 140, d: 5, u: 20, x: 40 })
    expect(out['Quicksilver Flask'].fl).toEqual({ d: 6, u: 30, x: 60, b: ['40% increased Movement Speed'] })
    expect(out['Ashbark Tincture'].tc).toEqual({ mb: 0.6, cd: 7 })
  })
  it('leaves out a base with nothing to add', () => {
    expect(out['Plain Jewel']).toBeUndefined()
  })
})

describe('unique extras', () => {
  it('splits implicits from mods and drops the headers', () => {
    const u = parseUnique(`Corpse Rose
Imbued Wand
League: Covens
Source: Drops from a boss
Implicits: 1
(33-37)% increased Spell Damage
{tags:caster}(20-30)% increased Cast Speed`)!
    expect(u).toEqual({ name: 'Corpse Rose', b: 'Imbued Wand', i: ['(33-37)% increased Spell Damage'], e: ['(20-30)% increased Cast Speed'] })
  })
  it("keeps the last variant's lines and the lines every variant has", () => {
    const u = parseUnique(`Old Thing
Leather Belt
Variant: Pre 3.0
Variant: Current
Implicits: 0
{variant:1}10% old line
{variant:2}20% new line
Fixed line
Corrupted`)!
    expect(u.e).toEqual(['20% new line', 'Fixed line'])
  })
  it('finds every block in a file', () => {
    expect(uniquesIn('return {\n[[\nA\nRing\nImplicits: 0\nx\n]], [[\nB\nBelt\nImplicits: 0\ny\n]]\n}').map(u => u.name)).toEqual(['A', 'B'])
  })
})
