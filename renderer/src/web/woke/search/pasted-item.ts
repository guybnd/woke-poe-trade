// Item text pasted into the overlay, made into the game's advanced copy format
// (Ctrl + Alt + C) so the price check reads it. Takes the game's own copies,
// copies from poe.ninja and trade sites (no "Item Class:" line, which the
// parser lets go, and plain mod lines with no "{ … Modifier }" headings), and
// Path of Building's item text (Ctrl+C on an item in PoB: no separators,
// "Implicits: N").
import { parseItemText } from '@ipc/pob-item'
import { pobItemText } from '../pob-builds/item-text'
import { CLIENT_STRINGS as _$ } from '@/assets/data'
import { ModifierType } from '@/parser/modifiers'
import { tryParseTranslation } from '@/parser/stat-translations'

const SEPARATOR = '--------'
const RARITY = /^Rarity:\s*(\S.*)$/i
// PoB only writes these; any other "Rarity:" text isn't PoB's.
const POB_RARITIES = new Set(['NORMAL', 'MAGIC', 'RARE', 'UNIQUE', 'RELIC'])
// Rarities whose sections the parser reads as mods.
const MOD_RARITIES = new Set(['Normal', 'Magic', 'Rare', 'Unique'])
// A heading line of the advanced copy: "{ Prefix Modifier "Hale" (Tier: 1) }".
const MOD_HEADING = /^\{ .* \}$/
const IMPLICIT = / \(implicit\)$/
const TAGGED = / \((?:enchant|scourge)\)$/
const KIND = / \((crafted|fractured)\)$/
// Stands in for an unrevealed mod and has no stat.
const VEILED = /^Veiled (?:Prefix|Suffix)$/
// Longest stat text, in lines, tried when grouping plain mod lines.
const MAX_STAT_LINES = 4
const NEWLINE = String.fromCharCode(10)
// One-line sections that aren't mods.
const FLAG = /^(?:Corrupted|Mirrored|Split|Unidentified|Unmodifiable|Foulborn|Synthesised Item|(?:Shaper|Elder|Crusader|Hunter|Redeemer|Warlord|Searing Exarch|Eater of Worlds|Fractured) Item)$/

// The game's copy text, or null when the paste isn't an item.
export function pastedItemText (text: string): string | null {
  // Pasted out of chat or a code block, lines can come indented, and web
  // pages copy non-breaking spaces.
  const lines = text.replaceAll(String.fromCharCode(160), ' ').split(/\r?\n/).map(line => line.trimStart())
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  if (lines.length < 2) return null

  if (lines.some(line => line.trimEnd() === SEPARATOR)) {
    const normal = lines.map(line => {
      if (line.trimEnd() === SEPARATOR) return SEPARATOR
      // "Rarity: RARE" as PoB and some sites write it.
      const r = RARITY.exec(line)
      return r && r[1].trim() === r[1].trim().toUpperCase() ? `Rarity: ${titleCase(r[1].trim())}` : line
    })
    return withModHeadings(normal).join('\n')
  }

  // PoB's text has no separators, starts at the rarity and always counts its
  // implicits.
  if (RARITY.test(lines[0]) && lines.some(line => /^Implicits:\s*\d+$/.test(line.trimEnd()))) {
    const item = parseItemText(lines.join('\n'))
    if (!item.name || !POB_RARITIES.has(item.rarity)) return null
    return pobItemText(item)
  }
  return null
}

// The plain copy (Ctrl+C, and what sites copy) marks implicits "(implicit)"
// and leaves explicits bare; the parser only reads mods under headings. Each
// stat gets its own heading (lines under one heading are one mod, and the
// parser keeps one value per stat in a mod), and a stat whose text runs over
// two lines keeps them together.
function withModHeadings (lines: string[]): string[] {
  if (lines.some(line => MOD_HEADING.test(line.trimEnd()))) return lines
  const rarity = lines.map(line => RARITY.exec(line)?.[1].trim()).find(Boolean)
  if (!rarity || !MOD_RARITIES.has(rarity)) return lines

  const sections: string[][] = [[]]
  for (const line of lines) {
    if (line === SEPARATOR) sections.push([])
    else sections[sections.length - 1].push(line)
  }
  // Mods come after the item level.
  const start = sections.findIndex(s => s.some(line => line.startsWith('Item Level:')))
  if (start < 0) return lines

  let explicitDone = false
  for (let i = start + 1; i < sections.length; i++) {
    const section = sections[i].map(line => line.trimEnd())
    if (!section.length) continue
    if (section.every(line => IMPLICIT.test(line))) {
      const stats = statGroups(section.map(line => line.replace(IMPLICIT, '')), ModifierType.Implicit)
      sections[i] = stats.groups.flatMap(group => ['{ Implicit Modifier }', ...group])
    } else if (section.every(line => TAGGED.test(line) || FLAG.test(line))) {
      continue
    } else if (!explicitDone) {
      // The explicits are the first section with a stat in it. Before them may
      // be "Monster Level" on a map; without them, a flask's or jewel's
      // description; after them, a unique's flavour text and notes.
      const flags = section.filter(line => FLAG.test(line))
      const kinds = new Map<string, string>()
      const mods = section.filter(line => !FLAG.test(line) && !VEILED.test(line)).map(line => {
        const kind = KIND.exec(line)
        if (!kind) return line
        const bare = line.slice(0, -kind[0].length)
        kinds.set(bare, kind[1] === 'crafted' ? '{ Master Crafted Prefix Modifier }' : '{ Fractured Prefix Modifier }')
        return bare
      })
      const stats = statGroups(mods, ModifierType.Explicit)
      if (!stats.matched) continue
      explicitDone = true
      sections[i] = [
        ...stats.groups.flatMap(group => [kinds.get(group[0]) ?? '{ Unique Modifier }', ...group]),
        ...flags
      ]
    }
  }
  return sections.flatMap((section, i) => i ? [SEPARATOR, ...section] : section)
}

// Lines grouped into stats as the parser will match them, and how many matched.
function statGroups (lines: string[], type: ModifierType): { groups: string[][], matched: number } {
  const groups: string[][] = []
  let matched = 0
  for (let start = 0; start < lines.length;) {
    let end = start
    for (; end < Math.min(lines.length, start + MAX_STAT_LINES); end++) {
      let string = lines.slice(start, end + 1).join(NEWLINE)
      const unscalable = string.endsWith(_$.UNSCALABLE_VALUE)
      if (unscalable) string = string.slice(0, -_$.UNSCALABLE_VALUE.length)
      if (tryParseTranslation({ string, unscalable }, type, undefined)) break
    }
    if (end < Math.min(lines.length, start + MAX_STAT_LINES)) {
      matched++
      groups.push(lines.slice(start, end + 1))
      start = end + 1
    } else {
      groups.push([lines[start]])
      start++
    }
  }
  return { groups, matched }
}

function titleCase (s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
