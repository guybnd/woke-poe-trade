// What the right-click item menu does with an item, apart from the overlay:
// what the price check reads and what the trade site searches.
import { ITEM_BY_REF } from '@/assets/data'
import type { BaseType } from '@/assets/data/interfaces'
import { createVirtualItem, ItemRarity } from '@/parser/ParsedItem'
import type { ParsedItem } from '@/parser/ParsedItem'
import { ItemCategory } from '@/parser/meta'
import type { TipKind } from './tip-content'

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

// `english`: the game text below is English, which the parser reads only with
// the English item data.
export function priceCheckInput (ref: ItemMenuRef, kind: TipKind, info: BaseType | undefined, english = true): PriceCheckInput | null {
  if (ref.text) return { clipboard: ref.text }
  if (!info) return null
  // The item data has no Foulborn uniques: it would price the plain one.
  if (ref.name.startsWith('Foulborn ')) return null
  if (kind === 'unique') {
    const item = createVirtualItem({ rarity: ItemRarity.Unique, info })
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
