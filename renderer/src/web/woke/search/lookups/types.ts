import type { PriceItem } from '../../market/types'

// Answers the search palette shows as cards: currency maths, countdowns, boss
// and recipe facts and the like. Each lookup is a plain function from the
// query to cards, so they can be tested without the palette.

// A line on a card. An `item` row shows that item's tooltip and price.
export interface LookupRow {
  label: string
  value?: string
  // A price in chaos, drawn as chaos or divines.
  chaos?: number | null
  item?: { name: string, type?: string }
  dim?: boolean
}

export interface LookupSection {
  label?: string
  rows?: LookupRow[]
  text?: string[]
}

// What a card's button does. Enter does the first one.
export type LookupAction =
  { label: string, url: string } |
  { label: string, copy: string } |
  { label: string, search: string } |
  // Opens a tool by its widget type, when it's switched on.
  { label: string, tool: string }

export interface LookupCard {
  // Unique within the palette's results.
  id: string
  // The result list heading it goes under, such as "Answer" or "Bosses".
  group: string
  name: string
  sub: string
  // A Font Awesome class, or an image url.
  icon: string
  // The card's title when it differs from the result's name.
  title?: string
  sections: LookupSection[]
  actions: LookupAction[]
  // Hovering the result shows this item's tooltip.
  tip?: { name: string, type?: string }
}

export interface LookupContext {
  // Price in chaos of a priced name, or null. Chaos Orb is always 1. Without
  // a variant: the plain row, else the cheapest variant.
  price: (name: string, variant?: string) => number | null
  // Every saved poe.ninja row, for lookups that price a kind of item.
  items: readonly PriceItem[]
  // Tools that are switched on, by widget type.
  tools: ReadonlySet<string>
  divine: number | null
  now: number
  // The league you picked, when the trade site gave its start.
  league: { name: string, startedAt: number | null } | null
}

export type Lookup = (query: string, ctx: LookupContext) => LookupCard[]

export function isImageIcon (icon: string): boolean {
  return /^(https?:|\/)/.test(icon)
}
