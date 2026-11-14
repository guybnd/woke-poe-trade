import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { attributeNeeds, buildTip, dropLines, gearStats, kindOfNinjaType, parseGemVariant, parseMarkup } from '@/web/woke/ui/tooltip/tip-content'
import type { TipLine, TipModel, TipPack } from '@/web/woke/ui/tooltip/tip-content'

const read = (file: string) => JSON.parse(readFileSync(join(__dirname, '../../public/data/tips', `${file}.json`), 'utf8'))
const pack: TipPack = { uniques: read('uniques'), gems: read('gems'), items: read('items'), bases: read('bases'), drops: read('drops') }

const text = (line: TipLine) => line.map(p => p.text).join('')
const all = (model: TipModel | null) => (model?.sections ?? []).flat().map(text)

describe('the rows in the market tracker', () => {
  it('shows a Foulborn unique with its mutated mod, stats and flavour', () => {
    const tip = buildTip(pack, { name: "Foulborn Kitava's Thirst", kind: 'unique', variant: 'Life Trigger' })!
    expect(tip.base).toBe('Zealot Helmet')
    expect(tip.frame).toBe('unique')
    const lines = all(tip)
    expect(lines).toContain('Armour: 202-247')
    expect(lines).toContain('Energy Shield: 43-52')
    expect(lines).toContain('Requires Level 44, 50 Str, 50 Int')
    expect(lines.some(l => l.includes('at least 200 Life on an Upfront Cost'))).toBe(true)
    expect(lines.every(l => !l.includes('\n'))).toBe(true)
    const mutated = tip.sections.flat().flat().find(p => p.tone === 'mutated')
    expect(mutated?.text).toContain('Trigger Socketed Spells')
  })

  it('shows a support gem at the level and quality of its row', () => {
    const tip = buildTip(pack, { name: 'Minion Life Support', kind: 'gem', variant: '21/20c' })!
    expect(tip.frame).toBe('gem-b')
    const lines = all(tip)
    expect(lines).toContain('Level: 21')
    expect(lines).toContain('Quality: +20%')
    expect(lines).toContain('Requires Level 72, 114 Int')
    expect(lines).toContain('Supported Skills have 50% more Minion maximum Life')
    expect(lines).toContain('Supported Skills have 20% increased Minion maximum Life')
    expect(lines).toContain('Corrupted')
  })

  it('leaves quality lines off a gem with no quality', () => {
    const lines = all(buildTip(pack, { name: 'Minion Life Support', kind: 'gem', variant: '1' }))
    expect(lines).toContain('Supported Skills have 30% more Minion maximum Life')
    expect(lines.some(l => l.includes('increased Minion'))).toBe(false)
    expect(lines.some(l => l.startsWith('Quality'))).toBe(false)
  })

  it('removes RePoE link markup from gem text', () => {
    const lines = all(buildTip(pack, { name: 'Pact of Lycia', kind: 'gem', variant: '1' }))
    expect(lines).toContain('Empowers the next 3 Channelling Spells you Cast')
    expect(lines.join(' ')).not.toMatch(/[[\]|]/)
    expect(lines).toContain('Cost: 16 Mana')
    expect(lines).toContain('Cast Time: 0.80 sec')
  })

  it('shows a card reward in its colours', () => {
    const tip = buildTip(pack, { name: 'A Chilling Wind', kind: 'card' })!
    expect(tip.frame).toBe('card')
    const lines = all(tip)
    expect(lines).toEqual(['Stack Size: 4', 'Level 21 Vaal Cold Snap', 'Quality: +20%', 'Corrupted'])
    expect(tip.sections[1][2][0].tone).toBe('corrupted')
  })

  it('shows a tattoo effect, from Path of Building', () => {
    const lines = all(buildTip(pack, { name: 'Tattoo of the Hinekora Warmonger', kind: 'item' }))
    expect(lines).toContain('Minions have 5% increased maximum Life')
  })

  it('shows what a scarab and an essence do', () => {
    expect(all(buildTip(pack, { name: 'Incursion Scarab of Champions', kind: 'item' })).join(' ')).toContain('35% chance for all Monsters')
    expect(all(buildTip(pack, { name: 'Shrieking Essence of Woe', kind: 'item' })).join(' ')).toContain('guaranteeing one property')
  })
})

describe('uniques with a pool of mods', () => {
  const unique = (name: string) => all(buildTip(pack, { name, kind: 'unique' }))

  it('counts a synthesised unique\'s implicits instead of listing them', () => {
    const lines = unique('Mask of the Tribunal')
    expect(lines).toContain('75 possible implicit mods')
    expect(lines).not.toContain('+(2-6)% to Quality of Socketed Aura Gems')
    expect(lines).toContain('+(25-30) to all Attributes')
  })
  it('leaves a pool out of the item\'s stats', () => {
    const row = pack.uniques!['Mask of the Tribunal'].v[0]
    const sure = gearStats(pack.bases!['Magistrate Crown'], row.e ?? []).map(text)
    expect(sure.length).toBeGreaterThan(0)
    expect(unique('Mask of the Tribunal')).toEqual(expect.arrayContaining(sure))
  })
  it('keeps the first mods of a long list and counts the rest', () => {
    const lines = unique("Watcher's Eye")
    expect(lines).toContain('(4-6)% increased maximum Life')
    expect(lines).toContain('and 84 more mods')
    // Its drop note (Elder only) comes on top of the cut list.
    const drop = dropLines(pack.drops!["Watcher's Eye"]).map(text)
    expect(lines.filter(l => !drop.includes(l)).length).toBeLessThan(12)
  })
  it('lists every mod of a unique that really has this many', () => {
    const lines = unique('The Dancing Duo')
    expect(lines.some(l => l.includes('more mods'))).toBe(false)
    expect(lines).toContain('Manifested Dancing Dervishes disables both weapon slots')
  })
})

describe('a long mod list and the stats', () => {
  it('still counts a fixed mod past the cut', () => {
    const lines = all(buildTip(pack, { name: 'Cane of Kulemak', kind: 'unique' }))
    const row = pack.uniques!['Cane of Kulemak'].v[0]
    const sure = gearStats(pack.bases![pack.uniques!['Cane of Kulemak'].b], row.e ?? []).map(text)
    expect(lines).toEqual(expect.arrayContaining(sure))
  })
})

describe('gaps', () => {
  it('falls back to the base for a unique with no text', () => {
    const tip = buildTip({ uniques: {}, bases: {} }, { name: 'Star of Wraeclast', kind: 'unique', base: 'Ruby Amulet' })
    expect(tip).toEqual({ name: 'Star of Wraeclast', base: 'Ruby Amulet', frame: 'unique', sections: [] })
  })

  it('heads a unique with the base it is looked at on', () => {
    const tip = buildTip(pack, { name: "Doryani's Delusion", kind: 'unique', atBase: 'Sharkskin Boots' })
    expect(tip?.base).toBe('Sharkskin Boots')
  })

  it('has nothing for an unknown name', () => {
    expect(buildTip(pack, { name: 'Not An Item', kind: 'item' })).toBeNull()
    expect(buildTip(pack, { name: 'Not An Item', kind: 'gem' })).toBeNull()
    expect(buildTip(pack, { name: 'Not An Item', kind: 'unique' })).toBeNull()
  })

  it('takes the first variant when the row names one the data lacks', () => {
    const tip = buildTip(pack, { name: "Foulborn Kitava's Thirst", kind: 'unique', variant: 'Not A Variant' })
    expect(all(tip)).toContain('15% reduced Cast Speed')
  })

  it('shows a corrupted level past the data at the highest it has', () => {
    const tip = buildTip({ gems: { G: { c: 'r', t: [], lv: { 1: { x: ['one'] }, 21: { x: ['top'] } } } } }, { name: 'G', kind: 'gem', variant: '23/20c' })
    expect(all(tip)).toContain('Level: 23')
    expect(all(tip)).toContain('top')
  })

  it('uses a plain base item when it is not a stackable', () => {
    const tip = buildTip(pack, { name: 'Zealot Helmet', kind: 'item' })!
    expect(tip.frame).toBe('normal')
    expect(all(tip)).toContain('Armour: 119-137')
  })
})

describe('what the review found', () => {
  const gems = pack.gems!
  const quality = (name: string, variant = '20/20') => all(buildTip(pack, { name, kind: 'gem', variant }))

  it('never shows a quality line with a wrong unit', () => {
    for (const name of Object.keys(gems)) {
      const fromQuality = (gems[name].q ?? []).map(q => q.t)
      expect(fromQuality.every(t => /#% (increased|reduced|more|less) /.test(t))).toBe(true)
      for (const line of quality(name).filter(l => !l.startsWith('Cost &'))) expect(line).not.toMatch(/\b1000\b.*(seconds|%)/)
    }
    expect(quality('Bear Trap').join(' ')).not.toContain('1000')
  })

  it('words negative quality as reduced', () => {
    const tip = buildTip({ gems: { G: { c: 'r', t: [], q: [{ t: 'Has #% increased Duration', v: [-1000] }], lv: { 1: {} } } } }, { name: 'G', kind: 'gem', variant: '1/20' })
    expect(all(tip)).toContain('Has 20% reduced Duration')
  })

  it('has no blank gem lines, and no cast time on attacks', () => {
    for (const name of Object.keys(gems)) expect(quality(name).every(l => l.trim())).toBe(true)
    expect(quality('Cleave').some(l => l.startsWith('Cast Time'))).toBe(false)
    expect(quality('Fireball').some(l => l.startsWith('Cast Time'))).toBe(true)
  })

  it('counts flat defence the base lacks, on armour only', () => {
    expect(gearStats({ ar: [100, 100] }, ['+50 to maximum Energy Shield']).map(text)).toEqual(['Armour: 100', 'Energy Shield: 50'])
    expect(gearStats({}, ['+50 to maximum Energy Shield'])).toEqual([])
  })

  it('leaves out physical damage a weapon has none of', () => {
    expect(gearStats({ ph: [10, 20] }, ['No Physical Damage'])).toEqual([])
  })

  it('prints a reduced range low to high', () => {
    expect(gearStats({ at: 1000 }, ['(15-20)% reduced Attack Speed']).map(text)).toEqual(['Attacks per Second: 0.80-0.85'])
  })

  it('applies mods to attribute requirements', () => {
    expect(attributeNeeds({ s: 50, i: 50 }, ['Has no Attribute Requirements'])).toEqual([])
    expect(attributeNeeds({ d: 100 }, ['+257 Intelligence Requirement'])).toEqual(['100 Dex', '257 Int'])
    expect(attributeNeeds({ s: 100 }, ['100% increased Attribute Requirements'])).toEqual(['200 Str'])
  })
})

describe('parseMarkup', () => {
  it('splits lines and keeps the tone of each tag', () => {
    const lines = parseMarkup('<gemitem>{Level 21}\r\n<default>{Quality:} <augmented>{+20%}')
    expect(lines.map(text)).toEqual(['Level 21', 'Quality: +20%'])
    expect(lines[1].map(p => p.tone)).toEqual(['label', 'gem', 'mod'])
  })

  it('keeps the tone through a size tag', () => {
    const [line] = parseMarkup('<size:30>{<uniqueitem>{Headhunter}}')
    expect(line).toEqual([{ text: 'Headhunter', tone: 'unique' }])
  })

  it('leaves stray braces and angle brackets as text', () => {
    expect(parseMarkup('a < b } c').map(text)).toEqual(['a < b } c'])
  })
})

describe('gearStats', () => {
  it('adds local flat and increased defence', () => {
    const lines = gearStats({ ar: [100, 100] }, ['+50 to Armour', '100% increased Armour']).map(text)
    expect(lines).toEqual(['Armour: 300'])
  })

  it('ignores conditional and global lines', () => {
    const lines = gearStats({ ar: [100, 100] }, ['50% increased Armour during Effect', '+50 to maximum Life']).map(text)
    expect(lines).toEqual(['Armour: 100'])
  })

  it('applies reduced, and drops what the item has none of', () => {
    expect(gearStats({ es: [100, 100] }, ['50% reduced Energy Shield']).map(text)).toEqual(['Energy Shield: 50'])
    expect(gearStats({ es: [100, 100] }, ['Has no Energy Shield'])).toEqual([])
  })

  it('works out weapon damage, crit and speed as ranges', () => {
    const lines = gearStats({ ph: [100, 200], cr: 500, at: 1000 }, [
      '(100-200)% increased Physical Damage', 'Adds 10 to 20 Physical Damage', '10% increased Attack Speed', '100% increased Critical Strike Chance'
    ]).map(text)
    expect(lines).toEqual(['Physical Damage: (220-330)-(440-660)', 'Critical Strike Chance: 10.00%', 'Attacks per Second: 1.10'])
  })
})

describe('parseGemVariant and kinds', () => {
  it('reads poe.ninja gem variants', () => {
    expect(parseGemVariant('21/20c')).toEqual({ level: 21, quality: 20, corrupted: true })
    expect(parseGemVariant('1')).toEqual({ level: 1, quality: 0, corrupted: false })
    expect(parseGemVariant('1/20')).toEqual({ level: 1, quality: 20, corrupted: false })
    expect(parseGemVariant(undefined)).toEqual({ level: 1, quality: 0, corrupted: false })
    expect(parseGemVariant('Anomalous')).toEqual({ level: 1, quality: 0, corrupted: false })
  })

  it('maps poe.ninja row types', () => {
    expect(kindOfNinjaType('UniqueArmour')).toBe('unique')
    expect(kindOfNinjaType('SkillGem')).toBe('gem')
    expect(kindOfNinjaType('DivinationCard')).toBe('card')
    expect(kindOfNinjaType('Tattoo')).toBe('item')
  })
})

describe('where a unique drops', () => {
  it('says a boss-only unique is a restricted drop, and where it comes from', () => {
    const lines = all(buildTip(pack, { name: 'Hand of Thought and Motion', kind: 'unique' }))
    expect(lines).toContain('Restricted drop: not a random drop on its base')
    expect(lines.some(l => /Esh|Tul|Genesis Tree/.test(l))).toBe(true)
  })

  it('says nothing for a unique that drops anywhere', () => {
    const lines = all(buildTip(pack, { name: 'Headhunter', kind: 'unique' }))
    expect(lines.some(l => /Restricted drop|No longer drops/.test(l))).toBe(false)
  })

  it('keeps a long source short', () => {
    const tip = buildTip({ ...pack, drops: { Headhunter: { r: 1, t: 'x'.repeat(400) } } }, { name: 'Headhunter', kind: 'unique' })
    expect(all(tip).every(l => l.length <= 180)).toBe(true)
  })
})
