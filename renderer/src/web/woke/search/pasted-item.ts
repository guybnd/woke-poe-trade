// Item text pasted into the overlay, made into the game's advanced copy format
// (Ctrl + Alt + C) so the price check reads it. Takes the game's own copies,
// copies from poe.ninja and trade sites (no "Item Class:" line, which the
// parser lets go, and plain mod lines with no "{ … Modifier }" headings), and
// Path of Building's item text (Ctrl+C on an item in PoB: no separators,
// "Implicits: N").
import { parseItemText } from '@ipc/pob-item'
import { pobItemText } from '../pob-builds/item-text'

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

  // PoB's text has no separators and starts at the rarity.
  if (RARITY.test(lines[0])) {
    const item = parseItemText(lines.join('\n'))
    if (!item.name || !POB_RARITIES.has(item.rarity)) return null
    return pobItemText(item)
  }
  return null
}

// The plain copy (Ctrl+C, and what sites copy) marks implicits "(implicit)"
// and leaves explicits bare; the parser only reads mods under headings. A
// heading goes on every line: lines under one heading are one mod, and the
// parser keeps one value per stat in a mod.
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
    const section = sections[i]
    if (!section.length) continue
    if (section.every(line => IMPLICIT.test(line.trimEnd()))) {
      sections[i] = section.flatMap(line => ['{ Implicit Modifier }', line.trimEnd().replace(IMPLICIT, '')])
    } else if (section.every(line => TAGGED.test(line.trimEnd()) || FLAG.test(line.trimEnd()))) {
      continue
    } else if (!explicitDone) {
      // The first other section is the explicits; a unique's flavour text and
      // notes come after it.
      explicitDone = true
      sections[i] = section.flatMap(line => {
        const bare = line.trimEnd()
        if (FLAG.test(bare)) return [line]
        if (bare.endsWith(' (crafted)')) return ['{ Master Crafted Prefix Modifier }', bare.slice(0, -' (crafted)'.length)]
        if (bare.endsWith(' (fractured)')) return ['{ Fractured Prefix Modifier }', bare.slice(0, -' (fractured)'.length)]
        return ['{ Unique Modifier }', bare]
      })
    }
  }
  return sections.flatMap((section, i) => i ? [SEPARATOR, ...section] : section)
}

function titleCase (s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
