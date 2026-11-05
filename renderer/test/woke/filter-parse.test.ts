// The parser and writer against NeverSink's real filters at every strictness
// level. The promise: an untouched filter comes back byte for byte, a block
// rewritten by an edit still means the same thing, and nothing the game reads
// is lost or misread on the way.
import { describe, it, expect } from 'vitest'
import { formatBlock, parseFilter, serializeFilter, ACTION_KEYS } from '@/web/woke/loot-filter/parse'
import type { FilterBlock, FilterDoc } from '@/web/woke/loot-filter/parse'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { applyEdits } from '@/web/woke/loot-filter/edits'
import { LEVELS, extraFilters, neverSink, neverSinkStyled } from '../helpers/neversink'

const FILTERS = [
  ...LEVELS.map(level => ({ name: level as string, text: neverSink(level) })),
  { name: 'VAAL style', text: neverSinkStyled() },
  ...extraFilters()
]

// What the game reads from a block, whichever way it is spelled.
function meaning (b: FilterBlock) {
  return {
    visibility: b.visibility,
    disabled: b.disabled,
    type: b.type,
    tier: b.tier,
    continue: b.continue,
    conditions: b.conditions,
    actions: b.actions
  }
}

// One rule line reduced to its tokens: no comment, no indent, single spaces.
function rawLineTokens (line: string): string {
  let inQuote = false
  let body = line
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQuote = !inQuote
    else if (line[i] === '#' && !inQuote) { body = line.slice(0, i); break }
  }
  return body.trim().replace(/\s+/g, ' ')
}

function ruleLines (b: FilterBlock, lines: string[]): string[] {
  return lines.slice(1).map(l => rawLineTokens(b.disabled ? l.replace(/^#/, '') : l)).filter(Boolean)
}

function rewriteAll (doc: FilterDoc): string {
  for (const b of doc.blocks) b.dirty = true
  return serializeFilter(doc)
}

describe.each(FILTERS)('$name', ({ text }) => {
  const doc = parseFilter(text)

  it('reads the NeverSink header', () => {
    expect(doc.isNeverSink).toBe(true)
    expect(doc.version).toMatch(/^\d+\.\d+/)
    expect(doc.strictness).toMatch(/^\d-/)
    expect(doc.eol).toBe('\r\n')
  })

  it('writes an untouched filter back byte for byte', () => {
    expect(serializeFilter(parseFilter(text))).toBe(text)
  })

  it('finds every live block in the file', () => {
    const live = text.split(/\r?\n/).filter(l => /^(Show|Hide|Minimal)\b/.test(l)).length
    expect(doc.blocks.filter(b => !b.disabled)).toHaveLength(live)
    expect(live).toBeGreaterThan(400)
  })

  it('tags every block with its group and tier', () => {
    const untagged = doc.blocks.filter(b => !b.disabled && (!b.type || !b.tier)).map(b => `${b.line}: ${b.raw[0]}`)
    expect(untagged).toEqual([])
  })

  it('reads every rule line of every block', () => {
    for (const b of doc.blocks) {
      expect(b.conditions.length + b.actions.length + (b.continue ? 1 : 0), `line ${b.line}`).toBe(ruleLines(b, b.raw).length)
    }
  })

  it('never takes a rule for the wrong kind', () => {
    for (const b of doc.blocks) {
      for (const c of b.conditions) {
        expect(ACTION_KEYS.has(c.key), `line ${b.line}: ${c.key}`).toBe(false)
        expect(c.values.length, `line ${b.line}: ${c.key}`).toBeGreaterThan(0)
        expect(c.values.join(' '), `line ${b.line}`).not.toMatch(/^[<>=!]/)
      }
    }
  })

  it('rewrites each rule line to what the file says', () => {
    const fresh = parseFilter(text)
    for (const b of fresh.blocks) {
      const before = ruleLines(b, b.raw)
      b.dirty = true
      // The writer puts conditions before actions; the game doesn't care.
      expect([...ruleLines(b, formatBlock(b))].sort(), `line ${b.line}`).toEqual([...before].sort())
    }
  })

  it('a block rewritten by an edit still means the same', () => {
    const again = parseFilter(rewriteAll(parseFilter(text)))
    expect(again.blocks.length).toBe(doc.blocks.length)
    for (let i = 0; i < doc.blocks.length; i++) {
      expect(meaning(again.blocks[i]), `line ${doc.blocks[i].line}`).toEqual(meaning(doc.blocks[i]))
    }
  })

  it('rewriting twice changes nothing more', () => {
    const once = rewriteAll(parseFilter(text))
    expect(rewriteAll(parseFilter(once))).toBe(once)
  })

  it('the save check accepts every real rule once it is edited', () => {
    const fresh = parseFilter(text)
    for (const b of fresh.blocks) b.dirty = true
    expect(validateFilter(fresh).map(p => `${p.block.line}: ${p.message}`)).toEqual([])
  })
})

describe('the save check', () => {
  const fix = (text: string, patch: (b: FilterBlock) => void = () => {}) => {
    const doc = parseFilter(text)
    for (const b of doc.blocks) { b.dirty = true; patch(b) }
    return validateFilter(doc).map(p => p.message)
  }

  it('knows every condition on the official list', () => {
    const keys = ['AlternateQuality', 'AlwaysShow', 'AnyEnchantment', 'ArchnemesisMod', 'AreaLevel', 'BaseArmour', 'BaseDefencePercentile', 'BaseEnergyShield', 'BaseEvasion', 'BaseType', 'BaseWard', 'BlightedMap', 'Class', 'Corrupted', 'CorruptedMods', 'DropLevel', 'ElderItem', 'ElderMap', 'EnchantmentPassiveNode', 'EnchantmentPassiveNum', 'Exceptional', 'Foulborn', 'FracturedItem', 'GemLevel', 'GemQualityType', 'HasCruciblePassiveTree', 'HasEaterOfWorldsImplicit', 'HasEnchantment', 'HasExplicitMod', 'HasImplicitMod', 'HasInfluence', 'HasSearingExarchImplicit', 'HasVaalUniqueMod', 'Height', 'Identified', 'Imbued', 'IsVaalUnique', 'ItemLevel', 'LinkedSockets', 'MapTier', 'MemoryStrands', 'MirageMap', 'Mirrored', 'Quality', 'Rarity', 'Replica', 'Scourged', 'ShapedMap', 'ShaperItem', 'SocketGroup', 'Sockets', 'StackSize', 'SynthesisedItem', 'TransfiguredGem', 'TwiceCorrupted', 'UberBlightedMap', 'UnidentifiedItemTier', 'Vestigial', 'WaystoneTier', 'Width', 'ZanaMemory']
    const own = (b: FilterBlock) => { b.raw = []; b.added = true }
    for (const key of keys) expect(fix(`Show\n\t${key} True\n`, own), key).toEqual([])
    expect(fix('Show\n\tNotAThing True\n', own)[0]).toMatch(/unknown condition/)
  })

  it('a keyword from the source filter never blocks a save', () => {
    expect(fix('Show\n\tBrandNewLeagueThing True\n\tSetFontSize 40\n')).toEqual([])
  })

  it('an own rule copied from a block with a new keyword can still be saved', () => {
    const doc = parseFilter('Show # $type->a $tier->b\n\tBrandNewLeagueThing True\n\tBaseType == "Chaos Orb"\n')
    applyEdits(doc, [{ id: 1, kind: 'item', type: 'a', tier: 'b', base: 'Chaos Orb', visibility: 'Show', patch: { fontSize: 40 } }])
    expect(doc.blocks[0].added).toBe(true)
    expect(validateFilter(doc)).toEqual([])
  })

  it('names the mistakes the game would refuse', () => {
    const bad = (line: string) => fix(`Show\n\t${line}\n`)
    expect(bad('SetFontSize 46')[0]).toMatch(/font size/)
    expect(bad('SetTextColor 300 0 0')[0]).toMatch(/0 to 255/)
    expect(bad('SetTextColor 1 2')[0]).toMatch(/0 to 255/)
    expect(bad('PlayAlertSound 17')[0]).toMatch(/isn't 1-16/)
    expect(bad('PlayAlertSound 1 301')[0]).toMatch(/volume/)
    expect(bad('PlayEffect Mauve')[0]).toMatch(/beam colour/)
    expect(bad('PlayEffect Red Forever')[0]).toMatch(/beam option/)
    expect(bad('MinimapIcon 3 Red Star')[0]).toMatch(/icon size/)
    expect(bad('MinimapIcon 1 Mauve Star')[0]).toMatch(/minimap colour/)
    expect(bad('MinimapIcon 1 Red Blob')[0]).toMatch(/minimap shape/)
    expect(bad('BaseType')[0]).toMatch(/no values/)
  })

  it('accepts the disabled forms the game documents', () => {
    for (const line of ['PlayAlertSound None', 'PlayEffect None', 'MinimapIcon -1', 'CustomAlertSound "None"', 'PlayEffect Red Temp', 'SetTextColor 1 2 3', 'SetTextColor 1 2 3 4', 'PlayAlertSoundPositional 16 50']) {
      expect(fix(`Show\n\t${line}\n`), line).toEqual([])
    }
  })
})

describe('hand-written filters', () => {
  const one = (text: string) => parseFilter(text).blocks

  it('keeps LF line ends and a missing last newline', () => {
    for (const text of ['Show\n\tRarity Rare', 'Show\n\tRarity Rare\n', '# top\n\nHide\n\tClass "Maps"\n\n\n']) {
      expect(parseFilter(text).eol).toBe('\n')
      expect(serializeFilter(parseFilter(text))).toBe(text)
    }
  })

  it('keeps a byte order mark and still sees a first-line block', () => {
    const text = '﻿Show\r\n\tRarity Rare\r\n'
    const doc = parseFilter(text)
    expect(doc.blocks).toHaveLength(1)
    expect(serializeFilter(doc)).toBe(text)
  })

  it('reads unindented rules and blocks with no blank line between', () => {
    const blocks = one('Show\nRarity Rare\nHide\nRarity Magic\nShow\n')
    expect(blocks.map(b => b.visibility)).toEqual(['Show', 'Hide', 'Show'])
    expect(blocks[1].conditions[0]).toMatchObject({ key: 'Rarity', values: ['Magic'] })
  })

  it('reads spaces around operators, and a count after one', () => {
    const [b] = one([
      'Show',
      '  ItemLevel>=75',
      '  Quality >= 20',
      '  HasExplicitMod >=2 "A" "B"',
      '  HasExplicitMod >= 3 "C" "D"',
      '  HasExplicitMod 2 "E" "F"',
      '  Class=="Rings" "Amulets"'
    ].join('\n'))
    expect(b.conditions).toMatchObject([
      { key: 'ItemLevel', op: '>=', count: null, values: ['75'] },
      { key: 'Quality', op: '>=', count: null, values: ['20'] },
      { key: 'HasExplicitMod', op: '>=', count: 2, values: ['A', 'B'] },
      { key: 'HasExplicitMod', op: '>=', count: 3, values: ['C', 'D'] },
      { key: 'HasExplicitMod', op: '', count: 2, values: ['E', 'F'] },
      { key: 'Class', op: '==', count: null, values: ['Rings', 'Amulets'] }
    ])
  })

  it('takes bare words as values and keeps the quoting when rewritten', () => {
    const [b] = one('Show\n\tClass Currency\n\tBaseType Orb "Divine Orb"\n\tRarity <= Rare\n\tSocketGroup "A"\n\tNewLeagueThing Foo\n')
    expect(b.conditions.map(c => c.values)).toEqual([['Currency'], ['Orb', 'Divine Orb'], ['Rare'], ['A'], ['Foo']])
    b.dirty = true
    expect(formatBlock(b).slice(1)).toEqual(['\tClass Currency', '\tBaseType "Orb" "Divine Orb"', '\tRarity <= Rare', '\tSocketGroup "A"', '\tNewLeagueThing Foo'])
  })

  it('quotes a name with a space added to a bare list', () => {
    const [b] = one('Show\n\tBaseType == Orb\n')
    b.conditions[0].values.push('Divine Orb')
    b.dirty = true
    expect(formatBlock(b)[1]).toBe('\tBaseType == "Orb" "Divine Orb"')
  })

  it('a restyle keeps comments and commented-out rules inside the block', () => {
    const doc = parseFilter('Show\n\tRarity Rare\n#\tClass "X"\n\t# why\n\tSetFontSize 40\nHide\n')
    doc.blocks[0].dirty = true
    expect(formatBlock(doc.blocks[0])).toEqual(['Show', '\tRarity Rare', '\tSetFontSize 40', '#\tClass "X"', '\t# why'])
  })

  it('a gap with a commented-out block or section title ends the block', () => {
    const blockGap = parseFilter('Show # $type->a $tier->1\n\tRarity Rare\n\n#Hide # $type->b $tier->2\n#\tClass "X"\n\n\tSetFontSize 40\nHide\n')
    expect(blockGap.blocks.map(b => b.type)).toEqual(['a', 'b', null])
    const section = parseFilter('#[[1000]] Top\nShow\n\tRarity Rare\n\n#[[2000]] Next\n#[2001] Sub\n\tSetFontSize 40\n\nHide\n\tRarity Magic\n')
    expect(section.blocks[1]).toMatchObject({ section: 'Next', subsection: 'Sub' })
  })

  it('a long run of comments takes no time', () => {
    const text = 'Show\n' + '# comment\n'.repeat(50000) + '\tSetFontSize 40\n'
    const at = Date.now()
    expect(parseFilter(text).blocks[0].actions).toHaveLength(1)
    expect(Date.now() - at).toBeLessThan(1000)
  })

  it('ignores comments after a rule but not a # inside quotes', () => {
    const [b] = one('Show # why\n\tBaseType "Weird#Name" # note\n\tSetFontSize 40 # big\n')
    expect(b.comment).toBe('why')
    expect(b.conditions[0].values).toEqual(['Weird#Name'])
    expect(b.actions[0]).toEqual({ key: 'SetFontSize', args: ['40'] })
  })

  it('does not read Import as part of the block above', () => {
    const doc = parseFilter('Show\n\tRarity Rare\nImport "Mine.filter" Optional\nHide\n')
    expect(doc.blocks[0].conditions).toHaveLength(1)
    expect(doc.blocks).toHaveLength(2)
    expect(serializeFilter(doc)).toContain('Import "Mine.filter" Optional')
  })

  it('reads a block on past blank lines and comments, as the game does', () => {
    const text = 'Show\n\tRarity Rare\n\n# big ones\n\tSetFontSize 40\n\nHide\n\tRarity Magic\n\n# the end\n'
    const doc = parseFilter(text)
    expect(doc.blocks.map(b => b.visibility)).toEqual(['Show', 'Hide'])
    expect(doc.blocks[0].actions[0]).toEqual({ key: 'SetFontSize', args: ['40'] })
    expect(serializeFilter(doc)).toBe(text)
  })

  it('a header indented by mistake still starts a block', () => {
    expect(one('Show\n\tRarity Rare\n  Hide\n\tRarity Magic\n').map(b => b.visibility)).toEqual(['Show', 'Hide'])
    expect(one('#Show\n#\tRarity Rare\n  Hide\n\tRarity Magic\n').map(b => [b.visibility, b.disabled])).toEqual([['Show', true], ['Hide', false]])
  })

  it('a save header goes above a byte order mark, which is then dropped', () => {
    expect(serializeFilter(parseFilter('\uFEFF# top\nShow\n'), ['# ours'])).toBe('# ours\n# top\nShow\n')
    // Even when a rule of ours went in front of a first-line block.
    const doc = parseFilter('\uFEFFShow # $type->a $tier->b\n\tRarity Rare\n')
    expect(applyEdits(doc, [{ id: 1, kind: 'item', type: 'a', tier: 'b', base: 'x', visibility: 'Show', patch: {} }])[0].ok).toBe(true)
    expect(serializeFilter(doc, ['# ours'])).not.toContain('\uFEFF')
  })

  it('a comment line in a block survives untouched and is not a rule', () => {
    const text = 'Show\n\t# only the good ones\n\tRarity Rare\n'
    const doc = parseFilter(text)
    expect(doc.blocks[0].conditions).toHaveLength(1)
    expect(serializeFilter(doc)).toBe(text)
  })

  it('a commented-out block is kept and disabled; prose is not a block', () => {
    const doc = parseFilter('#Show # $type->a $tier->b\n#\tRarity Rare\n\n# Show me the money\n# Hide\n\nShow\n')
    expect(doc.blocks.map(b => b.disabled)).toEqual([true, false])
    expect(doc.blocks[0]).toMatchObject({ type: 'a', tier: 'b' })
  })

  it('reads FilterBlade\'s online filter layout: unindented, actions first, no tags', () => {
    const text = [
      '#Online Item Filter', '#name:329', '#filterVersion:8.20.1d.2026.232.7', '',
      '#Show', '#\tBaseType == ', '#\tClass "Divination Card"', '',
      '# FilterBlade: Conditional Entry', 'Hide', 'SetFontSize 18', 'SetBackgroundColor 0 0 0 150', 'DisableDropSound True',
      'Class == "Stackable Currency"', 'BaseType == "Alteration Shard" "Alchemy Shard"', '', '',
      '# FilterBlade: Conditional Entry', 'Hide', 'SetFontSize 18', 'Class == "Map Fragments" "Misc Map Items"', ''
    ].join('\r\n')
    const doc = parseFilter(text)
    expect(serializeFilter(doc)).toBe(text)
    expect(doc.blocks.map(b => [b.disabled, b.visibility, b.type])).toEqual([[true, 'Show', null], [false, 'Hide', null], [false, 'Hide', null]])
    expect(doc.blocks[1].conditions.map(c => c.key)).toEqual(['Class', 'BaseType'])
    expect(doc.blocks[1].actions.map(a => a.key)).toEqual(['SetFontSize', 'SetBackgroundColor', 'DisableDropSound'])
    // The empty BaseType of a commented block stays commented when rewritten.
    doc.blocks[0].dirty = true
    expect(formatBlock(doc.blocks[0])[0]).toBe('#Show')
    expect(formatBlock(doc.blocks[0]).every(l => l.startsWith('#'))).toBe(true)
  })

  it('finds sections and subsections', () => {
    const doc = parseFilter('#[[1000]] Top\n#[1001] Sub\nShow\n\n#[[2000]] Next\nHide\n')
    expect(doc.blocks.map(b => [b.section, b.subsection])).toEqual([['Top', 'Sub'], ['Next', '']])
  })

  it('an empty file and a comments-only file are fine', () => {
    expect(serializeFilter(parseFilter(''))).toBe('')
    expect(parseFilter('# nothing\n').blocks).toEqual([])
  })
})
