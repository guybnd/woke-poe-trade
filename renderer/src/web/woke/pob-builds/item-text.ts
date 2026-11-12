// A PoB item as the game's advanced item text (Ctrl + Alt + C), so the price
// check can read it like any item you copied: its filters, pseudo totals and
// listings all come from there. PoB's mod lines are always in English.
import type { PobItem } from './widget'

const RARITY: Record<PobItem['rarity'], string> = {
  'NORMAL': 'Normal',
  'MAGIC': 'Magic',
  'RARE': 'Rare',
  'UNIQUE': 'Unique',
  'RELIC': 'Unique',
  '': 'Normal'
}

// PoB doesn't say which mods are prefixes, and the price check doesn't need to
// know, so plain ones go under "Unique Modifier" on every rarity.
const MOD_HEADING = {
  '': '{ Unique Modifier }',
  'crafted': '{ Master Crafted Prefix Modifier }',
  'fractured': '{ Fractured Prefix Modifier }'
} as const

export function pobItemText (item: PobItem): string {
  const sections: string[][] = []
  sections.push([
    // The parser only needs the label; the category comes from the base.
    'Item Class: Build item',
    `Rarity: ${RARITY[item.rarity]}`,
    item.name.replace(/\^x[0-9a-fA-F]{6}|\^\d/g, ''),
    // PoB tells some bases apart in brackets: "Two-Stone Ring (Fire/Cold)".
    ...(item.base ? [item.base.replace(/\s*\([^)]*\)$/, '')] : [])
  ])

  const props: string[] = []
  if (item.quality) props.push(`Quality: +${item.quality}% (augmented)`)
  if (item.armour) props.push(`Armour: ${item.armour}`)
  if (item.evasion) props.push(`Evasion Rating: ${item.evasion}`)
  if (item.energyShield) props.push(`Energy Shield: ${item.energyShield}`)
  if (item.ward) props.push(`Ward: ${item.ward}`)
  if (props.length) sections.push(props)

  if (item.sockets) sections.push([`Sockets: ${item.sockets} `])
  if (item.itemLevel) sections.push([`Item Level: ${item.itemLevel}`])
  // PoB lists enchants with the implicits, marked crafted. Anoints may not be.
  const isEnchant = (line: string, i: number) => item.implicitKinds?.[i] === 'crafted' || line.startsWith('Allocates ')
  const enchants = item.implicits.filter(isEnchant)
  const implicits = item.implicits.filter((line, i) => !isEnchant(line, i))
  if (enchants.length) sections.push(enchants.map(line => `${line} (enchant)`))
  if (implicits.length) sections.push(['{ Implicit Modifier }', ...implicits])

  // A heading on every line: the parser reads lines under one heading as one
  // mod, and keeps one value per stat in it, so two "% increased Energy
  // Shield" lines would lose one.
  const mods: string[] = []
  item.mods.forEach((line, i) => {
    mods.push(MOD_HEADING[item.modKinds?.[i] ?? ''], line)
  })
  if (mods.length) sections.push(mods)

  if (item.influences?.length) sections.push(item.influences.map(name => `${name} Item`))
  if (item.corrupted) sections.push(['Corrupted'])
  if (item.mirrored) sections.push(['Mirrored'])

  return sections.map(lines => lines.join('\n')).join('\n--------\n') + '\n'
}
