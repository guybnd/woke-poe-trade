// Exchange items poe.ninja prices exactly (currency, fragments, scarabs…), and
// fixed items it prices by name (cards, beasts, keys: fixedPriceItem):
// the price check shows that cached price as its verdict and searches the
// exchange only on a click, so a check spends no trade search by itself.
// Pure: no Vue or IO.

// The poe.ninja row for the exact item is exactDetailsId (price-check/trends/getDetailsId.ts).

export interface HoldOptions {
  /** Which trade API the item is searched with. */
  api: 'trade' | 'bulk'
  /** The setting (unset counts as on). */
  enabled: boolean | undefined
  /** The check was asked for from inside the overlay ("Price check" in a menu, Ctrl+Space): it wants listings. */
  live: boolean
  /** poe.ninja's chaos price for the exact item, if it has one. */
  chaos: number | null | undefined
  /** Not on the exchange but priced as a whole by poe.ninja (fixedPriceItem): holds its trade search too. */
  fixed?: boolean
}

/** True when the first exchange search waits for a click. */
export function holdBulkSearch (o: HoldOptions): boolean {
  return o.enabled !== false && !o.live && (o.api === 'bulk' || o.fixed === true) && o.chaos != null && o.chaos > 0
}

export interface FixedItem {
  info: {
    namespace: string
    refName: string
    craftable?: unknown
    tradeTag?: string
  }
  // What the trade site prices some of them by, which poe.ninja's one row by name doesn't know.
  areaLevel?: number
  storedExperience?: number
  mapArea?: unknown
  itemLevel?: number
}

// Their price is in their text, not their name, so poe.ninja's price isn't theirs.
const PRICED_BY_TEXT = new Set(['Chronicle of Atzoatl', 'Expedition Logbook', 'Mercenary Warrant', 'Filled Coffin', 'Inscribed Ultimatum'])

/**
 * Not sold on the exchange, but one fixed thing poe.ninja prices by name
 * (Guy's picks, WOKEPOET-480): divination cards, captured beasts, and items
 * such as reliquary keys, Wombgifts and Ducats. Not one whose price follows an
 * area level (Forbidden Tome), stored experience (Facetor's Lens), map area
 * (Scrying Orb) or item level (corpses): poe.ninja's row by name isn't its price.
 */
export function fixedPriceItem (item: FixedItem): boolean {
  const { info } = item
  if (info.tradeTag || PRICED_BY_TEXT.has(info.refName)) return false
  // A beast's copy can show a level the search never uses.
  if (info.namespace === 'DIVINATION_CARD' || info.namespace === 'CAPTURED_BEAST') return true
  if (info.namespace !== 'ITEM' || info.craftable) return false
  if (item.areaLevel != null || (item.storedExperience ?? 0) > 0 || item.mapArea != null) return false
  // A Wombgift's level band is part of its poe.ninja row (getDetailsId).
  return item.itemLevel == null || info.refName.endsWith('Wombgift')
}

/** An unidentified unique jewel the price check has a unique for (picked or guessed, WOKEPOET-481). */
export function isUnidUniqueJewel (item: { rarity?: string, isUnidentified: boolean, uniqueBase?: unknown, category?: string }): boolean {
  return item.rarity === 'Unique' && item.isUnidentified && item.uniqueBase != null &&
    (item.category === 'Jewel' || item.category === 'Abyss Jewel')
}

// ---- How a poe.ninja price reads on the instant card and the verdict ----

function num (v: number): string {
  if (Math.round(v) >= 1000) return Math.round(v).toLocaleString('en-US')
  if (v >= 100) return String(Math.round(v))
  if (v >= 10) return String(Number(v.toFixed(1)))
  return String(Number(v.toPrecision(2)))
}

export interface NinjaPrice {
  /** "34c", "2.4 div", or "281 per c" for items under a chaos. */
  main: string
  /** `main` is the price of one ("each"); false for "N per c". */
  each: boolean
  /** The other way round: "225 per div", or "2,340c" for a div price. */
  sub: string | null
}

/** One item at `chaos`, with `rate` chaos to a divine (unknown: undefined). A Divine Orb reads in chaos. */
export function ninjaPrice (chaos: number, rate: number | undefined, divine = false): NinjaPrice {
  if (!(chaos > 0)) return { main: '—', each: false, sub: null }
  if (divine) return { main: `${num(chaos)}c`, each: true, sub: null }
  // Under a chaos "0c" says nothing: how many a chaos buys does.
  if (chaos < 1) return { main: `${num(1 / chaos)} per c`, each: false, sub: rate ? `${num(rate / chaos)} per div` : null }
  if (rate && chaos >= rate * 0.94) return { main: `${num(chaos / rate)} div`, each: true, sub: `${num(chaos)}c` }
  return { main: `${num(chaos)}c`, each: true, sub: rate ? `${num(rate / chaos)} per div` : null }
}

/** What a stack is worth: "238c", "1.4 div", "0.07c". */
export function ninjaTotal (chaos: number, rate: number | undefined): string {
  if (rate && chaos >= rate * 0.94) return `${num(chaos / rate)} div`
  if (chaos < 1) return `${num(chaos)}c`
  return `${num(chaos)}c`
}

/**
 * 0.1 to 1 divine in chaos, in tenths: the side panel of the Divine Orb and
 * Chaos Orb instant cards (Guy, 2026-11-23), for paying part of a divine.
 */
export function divineTenths (rate: number): Array<{ div: string, chaos: string }> {
  return Array.from({ length: 10 }, (_, i) => {
    const f = (i + 1) / 10
    return { div: `${i === 9 ? '1' : f.toFixed(1)} div`, chaos: `${num(Math.round(rate * (i + 1) / 10))}c` }
  })
}

/**
 * poe.ninja prices everything in chaos, so it has no row for a Chaos Orb
 * itself. This one lets it get the instant card (Guy, 2026-11-23): 1c, with
 * how many a divine buys and its fraction chips. Only once poe.ninja's divine
 * rate is known: without prices (not loaded yet, or a league poe.ninja doesn't
 * cover) a Chaos Orb checks like any other currency.
 */
export function chaosOrbRow (item: { info: { refName: string, namespace: string } }, divineRate: number | null | undefined) {
  if (!divineRate || item.info.namespace !== 'ITEM' || item.info.refName !== 'Chaos Orb') return null
  // No slug: poe.ninja has no saved line for it.
  return { name: 'Chaos Orb', variant: undefined, chaos: 1, graph: [] as Array<number | null>, slug: '', url: 'https://poe.ninja/poe1/economy/currency' }
}
