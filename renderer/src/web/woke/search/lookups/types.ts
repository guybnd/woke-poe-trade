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
  { label: string, search: string }

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
  // Price in chaos of a priced name, or null. Chaos Orb is always 1.
  price: (name: string) => number | null
  divine: number | null
  now: number
  // The league you picked, when the trade site gave its start.
  league: { name: string, startedAt: number | null } | null
}

export type Lookup = (query: string, ctx: LookupContext) => LookupCard[]

export function isImageIcon (icon: string): boolean {
  return /^(https?:|\/)/.test(icon)
}
