// What a loot filter can see about an item, read from APT's Ctrl+C copy.
//
// Since 3.29 the game always copies the advanced description, which carries
// "Item Class:" and the `{ Prefix Modifier "Name" }` mod names that filters
// match on. Anything the copy cannot tell (e.g. DropLevel for an unknown base)
// stays undefined, and the matcher treats conditions on it as unknown.
import type { ParsedItem } from '@/parser'
import { ItemRarity } from '@/parser'

export type FilterRarity = 'Normal' | 'Magic' | 'Rare' | 'Unique'

export interface ItemFacts {
  name: string
  itemClass?: string
  baseType?: string
  rarity?: FilterRarity
  itemLevel?: number
  dropLevel?: number
  quality?: number
  stackSize?: number
  mapTier?: number
  gemLevel?: number
  width?: number
  height?: number
  memoryStrands?: number
  // Socket colours, one letter each, grouped by link: ["RGB", "B"].
  socketGroups?: string[]
  identified?: boolean
  corrupted?: boolean
  mirrored?: boolean
  fractured?: boolean
  synthesised?: boolean
  replica?: boolean
  foulborn?: boolean
  vestigial?: boolean
  transfigured?: boolean
  imbued?: boolean
  crucibleTree?: boolean
  blightedMap?: boolean
  uberBlightedMap?: boolean
  anyEnchantment?: boolean
  hasImplicitMod?: boolean
  // Tier (1-6) of the Searing Exarch / Eater of Worlds implicit, 0 for none.
  exarchTier?: number
  eaterTier?: number
  corruptedMods?: number
  enchantmentPassiveNum?: number
  enchantPassiveNodes?: string[]
  enchantments?: string[]
  influences: string[]
  explicitModNames: string[]
  // Filled in by the caller from Client.txt; the item's own zone.
  areaLevel?: number
}

const RARITY: Partial<Record<string, FilterRarity>> = {
  [ItemRarity.Normal]: 'Normal',
  [ItemRarity.Magic]: 'Magic',
  [ItemRarity.Rare]: 'Rare',
  [ItemRarity.Unique]: 'Unique'
}

function sections (text: string): string[][] {
  return text.split(/\r?\n--------\r?\n/).map(s => s.split(/\r?\n/).map(l => l.trim()).filter(Boolean))
}

// Eldritch implicit ranks as the copy names them, tier 1 to 6.
const ELDRITCH_RANKS = ['Lesser', 'Greater', 'Grand', 'Exceptional', 'Exquisite', 'Perfect']

function num (text: string | undefined): number | undefined {
  if (text == null) return undefined
  const m = /-?\d+/.exec(text)
  return m ? Number(m[0]) : undefined
}

// Reads the facts straight from the clipboard text, using APT's parsed item
// for the base type when it has one (it knows magic item affixes and unique bases).
export function itemFacts (clipboard: string, parsed: ParsedItem | null): ItemFacts {
  const secs = sections(clipboard)
  const head = secs[0] ?? []
  const all = secs.flat()
  const line = (prefix: string) => all.find(l => l.startsWith(prefix))?.slice(prefix.length).trim()

  const itemClass = head.find(l => l.startsWith('Item Class:'))?.slice('Item Class:'.length).trim()
  const rarityText = head.find(l => l.startsWith('Rarity:'))?.slice('Rarity:'.length).trim()
  const nameLines = head.filter(l => !l.startsWith('Item Class:') && !l.startsWith('Rarity:'))

  let baseType: string | undefined
  if (parsed) {
    baseType = parsed.info.namespace === 'UNIQUE'
      ? parsed.uniqueBase?.refName
      : parsed.info.refName
  }
  if (!baseType) baseType = nameLines[nameLines.length - 1]?.replace(/^Superior /, '')
  // The parser's unique maps are just "Map"; filters match "Map (Tier 16)".
  const tier = parsed?.mapTier ?? num(all.find(l => l.startsWith('Map Tier:')))
  if (baseType === 'Map' && tier != null) baseType = `Map (Tier ${tier})`

  // Currency, gems and cards count as Normal for Rarity conditions.
  const textRarity = ['Normal', 'Magic', 'Rare', 'Unique'].includes(rarityText ?? '') ? rarityText as FilterRarity : 'Normal'
  const rarity: FilterRarity = (parsed?.rarity && RARITY[parsed.rarity]) || textRarity

  const socketsText = line('Sockets:')
  const socketGroups = socketsText
    ? socketsText.split(/\s+/).map(g => g.replace(/-/g, '').toUpperCase())
    : undefined

  const explicitModNames: string[] = []
  const enchantments: string[] = []
  let hasImplicit = false
  let corruptedMods = 0
  let exarchTier = 0
  let eaterTier = 0
  for (const l of all) {
    // Fractured mods are explicit mods too ("{ Fractured Prefix Modifier "Merciless" … }").
    const mod = /^\{ (?:Fractured )?(Prefix|Suffix) Modifier "([^"]+)"/.exec(l)
    if (mod) explicitModNames.push(mod[2])
    // Corrupted, eldritch, vestigial and synthesised implicits count as well.
    if (/^\{ (?:[\w' ]+ )?Implicit Modifier\b/.test(l)) hasImplicit = true
    const eldritch = /^\{ (Searing Exarch|Eater of Worlds) Implicit Modifier \((\w+)\)/.exec(l)
    if (eldritch) {
      const tier = ELDRITCH_RANKS.indexOf(eldritch[2]) + 1
      if (eldritch[1] === 'Searing Exarch') exarchTier = Math.max(exarchTier, tier)
      else eaterTier = Math.max(eaterTier, tier)
    }
    if (/\(enchant\)$/.test(l)) enchantments.push(l.replace(/\s*\(enchant\)$/, ''))
    if (/^\{ Corruption Implicit Modifier/.test(l)) corruptedMods++
  }

  const enchantPassiveNodes: string[] = []
  let enchantmentPassiveNum: number | undefined
  for (const e of enchantments) {
    const added = /^Adds (\d+) Passive Skills?/.exec(e)
    if (added) enchantmentPassiveNum = Number(added[1])
    const grant = /^Added Small Passive Skills grant: (.*)$/.exec(e)
    if (grant) enchantPassiveNodes.push(grant[1])
  }

  const name = nameLines.join(' ')
  const facts: ItemFacts = {
    name,
    itemClass,
    baseType,
    rarity,
    itemLevel: parsed?.itemLevel ?? num(line('Item Level:')),
    quality: parsed?.quality ?? num(line('Quality:')) ?? 0,
    stackSize: parsed?.stackSize?.value ?? num(line('Stack Size:')),
    mapTier: parsed?.mapTier ?? num(line('Map Tier:')),
    // Not from "Level:" on other items: that's the requirement.
    gemLevel: parsed?.gemLevel ?? (/Gem/.test(itemClass ?? '') ? num(line('Level:')) : undefined),
    width: parsed?.info.w,
    height: parsed?.info.h,
    memoryStrands: parsed?.memoryStrands ?? num(line('Memory Strands:')) ?? 0,
    socketGroups,
    identified: parsed ? !parsed.isUnidentified : !all.includes('Unidentified'),
    corrupted: parsed ? parsed.isCorrupted : all.includes('Corrupted'),
    mirrored: parsed ? !!parsed.isMirrored : all.includes('Mirrored'),
    fractured: parsed ? !!parsed.isFractured : all.includes('Fractured Item'),
    synthesised: parsed ? !!parsed.isSynthesised : all.includes('Synthesised Item'),
    replica: rarity === 'Unique' && /^Replica /.test(nameLines[0] ?? ''),
    foulborn: parsed ? !!parsed.isFoulborn : /^Foulborn /.test(name),
    vestigial: parsed ? !!parsed.isVestigial : undefined,
    transfigured: parsed ? Boolean(parsed.info.gem?.transfigured) : undefined,
    imbued: parsed?.imbuedGem ?? all.some(l => /^Imbued\b/.test(l)),
    // The copy doesn't show crucible trees; they only exist on legacy items.
    crucibleTree: false,
    blightedMap: itemClass === 'Maps' ? /\bBlighted\b/.test(name) && !/Blight-ravaged/.test(name) : false,
    uberBlightedMap: itemClass === 'Maps' ? /Blight-ravaged/.test(name) : false,
    anyEnchantment: enchantments.length > 0,
    hasImplicitMod: hasImplicit,
    exarchTier,
    eaterTier,
    corruptedMods,
    enchantmentPassiveNum,
    enchantPassiveNodes,
    enchantments,
    influences: parsed?.influences.map(i => String(i)) ?? [],
    explicitModNames
  }
  return facts
}
