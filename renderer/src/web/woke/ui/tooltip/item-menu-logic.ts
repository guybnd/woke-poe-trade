// What the right-click item menu does with an item, apart from the overlay:
// what the price check reads and what the trade site searches.
import { ITEM_BY_REF } from '@/assets/data'
import { StatBetter } from '@/assets/data/interfaces'
import type { BaseType } from '@/assets/data/interfaces'
import { createVirtualItem, ItemRarity } from '@/parser/ParsedItem'
import type { ParsedItem } from '@/parser/ParsedItem'
import { ItemCategory } from '@/parser/meta'
import { parseClipboard } from '@/parser/Parser'
import type { TipKind, TipUnique } from './tip-content'

export function kindOfName (name: string): TipKind {
  if (name.startsWith('Foulborn ') || ITEM_BY_REF('UNIQUE', name)?.length) return 'unique'
  if (ITEM_BY_REF('GEM', name)?.length) return 'gem'
  if (ITEM_BY_REF('DIVINATION_CARD', name)?.length) return 'card'
  return 'item'
}

export interface ItemMenuRef {
  // As the game names it: a unique's name, a gem, a card, a currency or a base.
  name: string
  // poe.ninja row type, when the screen has it.
  type?: string
  variant?: string
  // A rare or magic item's base, for the trade search and the wiki.
  base?: string
  // The item's full game text (a build's gear, a trade listing): the price
  // check reads it, and Copy item text copies it.
  text?: string
  rarity?: 'normal' | 'magic' | 'rare' | 'unique'
  // No price in the header (it isn't one item's price, or isn't the point).
  noPrice?: boolean
}

export const NS: Record<TipKind, BaseType['namespace']> = { unique: 'UNIQUE', gem: 'GEM', card: 'DIVINATION_CARD', item: 'ITEM' }

export function kindOf (ref: ItemMenuRef): TipKind {
  if (ref.rarity === 'unique') return 'unique'
  if (ref.rarity) return 'item'
  if (ref.type) {
    if (/^Unique/.test(ref.type)) return 'unique'
    if (/Gem/.test(ref.type)) return 'gem'
    if (ref.type === 'DivinationCard') return 'card'
    return 'item'
  }
  return kindOfName(ref.name)
}

// poe.ninja's Foulborn uniques share their unique's data.
export function plainName (name: string) {
  return name.replace(/^Foulborn /, '')
}

export function infoOf (ref: ItemMenuRef, kind: TipKind): BaseType | undefined {
  if (ref.base) return ITEM_BY_REF('ITEM', ref.base)?.[0]
  return ITEM_BY_REF(NS[kind], plainName(ref.name))?.[0]
}

const NAME_CLASS: Record<string, string> = {
  unique: 'w-rarity-unique',
  gem: 'w-rarity-gem',
  card: 'w-rarity-divination',
  rare: 'w-rarity-rare',
  magic: 'w-rarity-magic',
  normal: 'w-rarity-normal'
}

export function nameClass (ref: ItemMenuRef, kind: TipKind, info: BaseType | undefined): string {
  if (ref.rarity) return NAME_CLASS[ref.rarity]
  if (kind !== 'item') return NAME_CLASS[kind]
  return info?.tradeTag ? 'w-rarity-currency' : 'w-rarity-normal'
}

// ---- what the price check reads ----

// Game text for a stackable item, as Ctrl+C in game gives it (the parser only
// needs the class line, the rarity and the name).
export function stackText (name: string, rarity: 'Currency' | 'Divination Card', itemClass: string): string {
  return `Item Class: ${itemClass}\nRarity: ${rarity}\n${name}\n--------\nStack Size: 1/1\n`
}

export type PriceCheckInput = { clipboard: string, item?: ParsedItem }

// A unique as the price check gets it from game text: with its base and the
// base's category. Without the base the trade search sends the unique's name
// as the base type, and the trade site answers "Unknown item base type".
//
// With the tooltip data's mods (`mods`, English only), the unique also gets
// them as stat rows, at the bottom of each roll range: the price check can
// then filter by them though no rolls were copied. Every row starts unticked
// (`rollsFromData`), as a low roll could look like a best one.
export function virtualUnique (info: BaseType, mods?: UniqueModLines | null): ParsedItem {
  const uniqueBase = info.unique ? ITEM_BY_REF('ITEM', info.unique.base)?.[0] : undefined
  // The data has one base's mods for a unique on several (Grand Spectrum).
  if (mods && uniqueBase && mods.base === uniqueBase.refName) {
    const item = parseUniqueMods(info, uniqueBase, mods)
    if (item) return item
  }
  return createVirtualItem({ rarity: ItemRarity.Unique, info, uniqueBase, category: uniqueBase?.craftable?.category })
}

function parseUniqueMods (info: BaseType, uniqueBase: BaseType, mods: UniqueModLines): ParsedItem | null {
  const read = (lines: UniqueModLines) => {
    const parsed = parseClipboard(uniqueItemText(info.refName, uniqueBase.refName, uniqueBase.craftable?.category, lines))
    return (parsed.isOk() && parsed.value.info.refName === info.refName) ? parsed.value : null
  }
  const lines = {
    ...mods,
    implicits: mods.implicits.filter(plainRange),
    explicits: mods.explicits.filter(plainRange)
  }
  const first = read(lines)
  // One mod per line, in order, as the text was written.
  const all = [...lines.implicits, ...lines.explicits]
  if (!first || first.newMods.length !== all.length) return null
  // A stat on more than one line is a choice the data lists in full (1 or 2
  // abyssal sockets, increased or reduced): the item has one of them, so the
  // sum would be wrong. A stat that isn't a roll (a jewel's seed) has no
  // meaningful lowest value. Both stay out.
  // Counted per section: an implicit and an explicit of one stat (Headhunter's
  // life) are both on the item.
  const keyOf = (i: number, ref: string) => `${i < lines.implicits.length ? 'i' : 'e'}:${ref}`
  const lineCount = new Map<string, number>()
  first.newMods.forEach((mod, i) => {
    for (const ref of new Set(mod.stats.map(s => s.stat.ref))) lineCount.set(keyOf(i, ref), (lineCount.get(keyOf(i, ref)) ?? 0) + 1)
  })
  const keep = first.newMods.map((mod, i) => mod.stats.every(s =>
    lineCount.get(keyOf(i, s.stat.ref)) === 1 && s.stat.better !== StatBetter.NotComparable))
  const kept = keep.every(Boolean)
    ? first
    : read({
        ...lines,
        implicits: lines.implicits.filter((_, i) => keep[i]),
        explicits: lines.explicits.filter((_, i) => keep[lines.implicits.length + i])
      })
  if (!kept) return null
  // A line the parser can't read stays out: on a real copy it would be the
  // game's wording, here it is only the data's.
  return { ...kept, unknownModifiers: [], rollsFromData: true }
}

// A negative range ("-(30-20)%", "+(-13-13)%") has no lowest roll the parser
// reads the same way, so the line stays out.
function plainRange (line: string) {
  return !/-\(|\(-/.test(line)
}

// `base`: the base whose mods these are.
export interface UniqueModLines { base: string, implicits: string[], explicits: string[] }
const MOST_IMPLICITS = 4
const MOST_EXPLICITS = 12

// A unique's mods from the tooltip data. Without a known variant, only the
// mods every variant has, so none is claimed that the item may not have.
export function uniqueModLines (tip: TipUnique | undefined, variant?: string): UniqueModLines | null {
  if (!tip?.v.length) return null
  const rows = (variant && tip.v.find(r => r.n === variant)) ? [tip.v.find(r => r.n === variant)!] : tip.v
  const common = (pick: (r: TipUnique['v'][number]) => string[] | undefined) =>
    (pick(rows[0]) ?? []).filter(line => rows.every(r => pick(r)?.includes(line)))
  // Past these the data lists a pool to pick from (jewels, Watcher's Eye), not
  // what one item has (as tip-content.ts's tooltip cut).
  const implicits = common(r => r.i).length > MOST_IMPLICITS ? [] : common(r => r.i)
  const explicits = common(r => r.e).length > MOST_EXPLICITS ? [] : common(r => r.e)
  return implicits.length || explicits.length ? { base: tip.b, implicits, explicits } : null
}

// "[Keyword|Shown]" and "[Keyword]" are links in the data, plain text in game.
function unlink (line: string) {
  return line.replace(/\[([^\]|]*)\|([^\]]*)\]/g, '$2').replace(/\[([^\]]*)\]/g, '$1')
}

// A range "(75-100)" as the game's advanced copy writes a roll: "75(75-100)".
function lowestRoll (line: string) {
  return line.replace(/\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g, (range, low: string) => `${low}${range}`)
}

// Game text as Ctrl+Alt+C gives it, which the item parser reads.
export function uniqueItemText (name: string, base: string, category: string | undefined, mods: UniqueModLines): string {
  const section = (header: string, lines: string[]) =>
    lines.length ? ['--------', ...lines.flatMap(l => [header, ...unlink(lowestRoll(l)).split('\n')])] : []
  return [
    `Item Class: ${category ?? 'Unique'}`,
    'Rarity: Unique',
    name,
    base,
    ...section('{ Implicit Modifier }', mods.implicits),
    ...section('{ Unique Modifier }', mods.explicits)
  ].join('\n')
}

// `english`: the game text below is English, which the parser reads only with
// the English item data.
export function priceCheckInput (ref: ItemMenuRef, kind: TipKind, info: BaseType | undefined, english = true, mods?: UniqueModLines | null): PriceCheckInput | null {
  if (ref.text) return { clipboard: ref.text }
  if (!info) return null
  // The item data has no Foulborn uniques: it would price the plain one.
  if (ref.name.startsWith('Foulborn ')) return null
  if (kind === 'unique') {
    const item = virtualUnique(info, english ? mods : null)
    return { clipboard: item.rawText, item }
  }
  if (kind === 'gem') {
    // Vaal gems are always corrupted; searching uncorrupted ones finds none.
    const item = createVirtualItem({ category: ItemCategory.Gem, info, gemLevel: 1, isCorrupted: !!info.gem?.vaal })
    return { clipboard: item.rawText, item }
  }
  if (!english) return null
  if (kind === 'card') return { clipboard: stackText(info.refName, 'Divination Card', 'Divination Cards') }
  // Currency, scarabs, essences, fragments, tattoos: what trades in bulk.
  if (info.tradeTag) return { clipboard: stackText(info.refName, 'Currency', 'Stackable Currency') }
  return null
}

// ---- trade site ----

export type TradeType = string | { option: string, discriminator: string }

// A unique's one base. Some uniques (Grand Spectrum, Precursor's Emblem) come
// on several bases: searching the first would hide the others, so none.
export function uniqueBaseOf (name: string): string | undefined {
  const bases = new Set((ITEM_BY_REF('UNIQUE', name) ?? []).map(u => u.unique?.base))
  if (bases.size !== 1) return undefined
  return [...bases][0]
}

export function tradeQuery (ref: ItemMenuRef, kind: TipKind, info: BaseType | undefined, english = true): { name?: string, type?: TradeType } {
  if (kind === 'unique') {
    const name = info?.name ?? plainName(ref.name)
    // Other languages' trade sites take the name alone.
    const base = english ? uniqueBaseOf(info?.namespace === 'UNIQUE' ? info.refName : plainName(ref.name)) : undefined
    return base ? { name, type: base } : { name }
  }
  if (ref.base) return { type: info?.name ?? ref.base }
  // The trade site lists a transfigured gem as its plain gem plus which one.
  const plain = info?.gem?.transfigured && info.gem.normalVariant && info.tradeDisc
    ? ITEM_BY_REF('GEM', info.gem.normalVariant)?.[0]
    : undefined
  if (plain && info?.tradeDisc) return { type: { option: plain.name, discriminator: info.tradeDisc } }
  return { type: info?.name ?? ref.name }
}
