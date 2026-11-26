// Tattoos: the vendor takes 3 Tattoos of one tribe for 1 random Tattoo of the
// same tribe (patch 3.22.1: "trade three Tattoos from a tribe for a random
// single Tattoo of that same tribe"). Ten tribes of six, from the game's item
// data. Journey, Honoured, Loyalty, Forbidden and Ancestral Tattoos have no
// tribe, so the recipe can't take them. No one has published the odds, so
// every Tattoo counts as equally likely unless you set your own weights.
import { isTraded } from './calc'
import type { ItemWeight, Quote } from './calc'

export const TATTOO_TRIBES = ['Arohongui', 'Hinekora', 'Kitava', 'Ngamahu', 'Ramako', 'Rongokurai', 'Tasalio', 'Tawhoa', 'Tukohama', 'Valako'] as const
export type TattooTribe = typeof TATTOO_TRIBES[number]

// Each tribe's six, from the game's item data (3.30).
const TRIBE_ROLES: Record<TattooTribe, string[]> = {
  Arohongui: ['Makanga', 'Moonwarden', 'Scout', 'Shaman', 'Warmonger', 'Warrior'],
  Hinekora: ['Deathwarden', 'Makanga', 'Shaman', 'Storyteller', 'Warmonger', 'Warrior'],
  Kitava: ['Blood Drinker', 'Heart Eater', 'Makanga', 'Rebel', 'Shaman', 'Warrior'],
  Ngamahu: ['Firewalker', 'Makanga', 'Shaman', 'Warmonger', 'Warrior', 'Woodcarver'],
  Ramako: ['Archer', 'Fleetfoot', 'Makanga', 'Scout', 'Shaman', 'Sniper'],
  Rongokurai: ['Brute', 'Goliath', 'Guard', 'Makanga', 'Turtle', 'Warrior'],
  Tasalio: ['Bladedancer', 'Makanga', 'Scout', 'Shaman', 'Tideshifter', 'Warrior'],
  Tawhoa: ['Herbalist', 'Makanga', 'Naturalist', 'Scout', 'Shaman', 'Warrior'],
  Tukohama: ['Brawler', 'Makanga', 'Shaman', 'Warcaller', 'Warmonger', 'Warrior'],
  Valako: ['Makanga', 'Scout', 'Shaman', 'Shieldbearer', 'Stormrider', 'Warrior']
}

export function tribeTattoos (tribe: TattooTribe): string[] {
  return TRIBE_ROLES[tribe].map(role => `Tattoo of the ${tribe} ${role}`)
}

const TRIBE_NAME = /^Tattoo of the (\S+) /

export function tattooTribe (name: string): TattooTribe | null {
  const tribe = TRIBE_NAME.exec(name)?.[1]
  return tribe && (TATTOO_TRIBES as readonly string[]).includes(tribe) ? tribe as TattooTribe : null
}

// The tribe's rare-art Tattoo, whose icon stands for the tribe.
export function tribeIconItem (tribe: TattooTribe): string {
  return `Tattoo of the ${tribe} Makanga`
}

export const TRIBE_INPUTS = 3

export interface TribeTattoo {
  name: string
  chaos: number
  // Chance of being the result, 0..1.
  share: number
  tradedChaos: number | null
  // No price: it counts at the tribe's cheapest price, so the average is a guess.
  unpriced?: boolean
}

export interface TribeRow {
  tribe: TattooTribe
  // Average result after your sell discount.
  average: number
  // Dearest first.
  tattoos: TribeTattoo[]
  // The cheapest one to put in; null when none trades.
  cheapest: TribeTattoo | null
  // Average result minus 3 of the cheapest, per Tattoo put in.
  profitEach: number | null
  // Cheapest Tattoos traded a day; null without the exchange feed.
  supplyPerDay: number | null
  // Tattoos of the tribe with no price. Such a row is never called best.
  unpriced: number
}

export function tribeRows (
  quotes: Map<string, Quote>,
  sellDiscount: number,
  weightOf: (name: string) => ItemWeight | null,
  hideUntraded: boolean
): TribeRow[] {
  const keep = 1 - sellDiscount
  const tribes = new Set<TattooTribe>()
  for (const name of quotes.keys()) {
    const tribe = tattooTribe(name)
    if (tribe) tribes.add(tribe)
  }
  const rows: TribeRow[] = []
  for (const tribe of tribes) {
    const names = tribeTattoos(tribe)
    const priced = names.flatMap(name => quotes.has(name) ? [quotes.get(name)!.chaos] : [])
    const floor = Math.min(...priced)
    // A weight that isn't a positive number counts as 1; all at 0 would leave no result.
    let list = names.map(name => {
      const quote = quotes.get(name)
      const weight = weightOf(name)?.weight
      return { name, chaos: quote?.chaos ?? floor, tradedChaos: quote?.tradedChaos ?? null, unpriced: !quote, weight: weight != null && weight >= 0 ? weight : 1 }
    })
    if (!list.some(t => t.weight > 0)) list = list.map(t => ({ ...t, weight: 1 }))
    const total = list.reduce((n, t) => n + t.weight, 0)
    const tattoos: TribeTattoo[] = list
      .map(t => ({ name: t.name, chaos: t.chaos, share: t.weight / total, tradedChaos: t.tradedChaos, ...(t.unpriced ? { unpriced: true } : {}) }))
      .sort((a, b) => b.chaos - a.chaos || a.name.localeCompare(b.name, 'en'))
    const average = tattoos.reduce((n, t) => n + t.share * t.chaos * keep, 0)
    const inputs = tattoos.filter(t => !t.unpriced && (!hideUntraded || isTraded(t)))
    const cheapest = inputs.length ? inputs[inputs.length - 1] : null
    rows.push({
      tribe,
      average,
      tattoos,
      cheapest,
      profitEach: cheapest ? (average - TRIBE_INPUTS * cheapest.chaos) / TRIBE_INPUTS : null,
      supplyPerDay: cheapest?.tradedChaos == null ? null : cheapest.tradedChaos / cheapest.chaos,
      unpriced: tattoos.filter(t => t.unpriced).length
    })
  }
  return rows.sort((a, b) => (b.profitEach ?? -Infinity) - (a.profitEach ?? -Infinity) || b.average - a.average)
}

// What one Tattoo makes put in with 2 more like it, per Tattoo.
export function tattooProfitEach (row: TribeRow, chaos: number): number {
  return (row.average - TRIBE_INPUTS * chaos) / TRIBE_INPUTS
}
