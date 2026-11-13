// What a trade listing can't say outright about its mods: which altar an
// eldritch implicit came from and its tier, and which mods came from Delve,
// Incursion, an Essence, Betrayal or an influence. The trade site only flags the
// item (searing / tangled) and names each mod, so these are read from the mod's
// trade stat, roll range and name.
import { shallowRef } from 'vue'
import type { ListingItem, ListingMod } from './listing-tip'

export interface EldritchKey {
  stat: string
  low: number
  high: number
  altars: Array<'exarch' | 'eater'>
}

export interface EldritchMark {
  source: 'exarch' | 'eater'
  // 1 Lesser … 6 Perfect; 0 when the tier can't be told.
  rank: number
  label: string
}

/** The implicit's lookup key, when the item has eldritch implicits. */
export function eldritchKey (item: ListingItem, mod: ListingMod): EldritchKey | undefined {
  if (!item.searing && !item.tangled) return undefined
  if (typeof mod === 'string') return undefined
  const stat = /stat_(\d+)$/.exec(mod.hash ?? '')?.[1]
  const range = mod.mods?.[0]?.magnitudes?.[0]
  if (!stat || !range) return undefined
  const [low, high] = [Math.abs(Number(range.min)), Math.abs(Number(range.max))].sort((a, b) => a - b)
  const altars: EldritchKey['altars'] = []
  if (item.searing) altars.push('exarch')
  if (item.tangled) altars.push('eater')
  return { stat, low, high, altars }
}

/** A corrupted item's implicit, to check against the corruption implicits' ranges. */
export function corruptionKey (item: ListingItem, mod: ListingMod): EldritchKey | undefined {
  if (!item.corrupted || item.searing || item.tangled) return undefined
  const key = eldritchKey({ searing: true }, mod)
  return key && { ...key, altars: [] }
}

// Built from the game's mod data (scripts/gen-implicit-sources.py). Per trade stat:
// eldritch rows are [low, high, altar (0 Exarch, 1 Eater), lowest rank, highest rank],
// ranks that share a range can't be told apart; corruption rows are [low, high].
type Row = [number, number, 0 | 1, number, number]
export interface ImplicitTable {
  eldritch: Record<string, Row[]>
  corrupted: Record<string, Array<[number, number]>>
}
export const implicitTable = shallowRef<ImplicitTable | null>(null)
let loading = false

export function loadImplicitTable () {
  if (loading || implicitTable.value) return
  loading = true
  fetch(`${import.meta.env.BASE_URL}data/implicit-sources.json`)
    .then(r => r.json())
    .then(d => { implicitTable.value = d })
    .catch(() => { loading = false })
}

/** Whether the implicit is one corruption gives, by its stat and roll range. */
export function isCorruption (key: EldritchKey, table: ImplicitTable | null): boolean {
  return (table?.corrupted[key.stat] ?? []).some(([low, high]) => low === key.low && high === key.high)
}

const TIERS = ['Lesser', 'Greater', 'Grand', 'Exceptional', 'Exquisite', 'Perfect']
const ALTAR = { exarch: 'Searing Exarch', eater: 'Eater of Worlds' }

export function eldritchMark (key: EldritchKey, table: ImplicitTable | null): EldritchMark | null {
  const rows = (table?.eldritch[key.stat] ?? []).filter(r =>
    r[0] === key.low && r[1] === key.high && key.altars.includes(r[2] ? 'eater' : 'exarch'))
  const only = rows.length === 1 ? rows[0] : null
  if (only) {
    const source = only[2] ? 'eater' : 'exarch'
    const tier = only[3] === only[4] ? TIERS[only[3] - 1] : `${TIERS[only[3] - 1]} or ${TIERS[only[4] - 1]}`
    return { source, rank: only[3], label: `${tier} ${ALTAR[source]} implicit` }
  }
  // A roll the data doesn't have (or the table hasn't loaded): the altar still
  // shows when the item has one, or when the stat only ever comes from one.
  const altars = new Set((table?.eldritch[key.stat] ?? []).map(r => r[2] ? 'eater' as const : 'exarch' as const))
  const source = key.altars.length === 1
    ? key.altars[0]
    : altars.size === 1 ? [...altars][0] : null
  return source && key.altars.includes(source) ? { source, rank: 0, label: `${ALTAR[source]} implicit` } : null
}

export interface ModSource {
  icon: string
  label: string
}

const INFLUENCE: Array<[RegExp, string]> = [
  [/Shaper|Shaping/, 'Shaper'],
  [/Elder/, 'Elder'],
  [/Crusade/, 'Crusader'],
  [/Redeem|Redemption/, 'Redeemer'],
  [/Hunt/, 'Hunter'],
  [/Warlord|Conquest/, 'Warlord']
]
const INCURSION = /\b(?:Citaqualotl|Guatelitzi|Matatl|Puhuarte|Tacati|Topotante|Xopec)/
const BETRAYAL = /^(?:Chosen|of the Order)$|\b(?:Aisling|Cameria|Elreon|Gravicius|Guff|Haku|Hillock|It That Fled|Janus|Jorgin|Korell|Leo|Riker|Rin|Tora|Vagan|Vorici)\b/

/** A mod from a league mechanic or an influence, by its name, as the price check marks it. */
export function modSource (mod: ListingMod): ModSource | undefined {
  if (typeof mod === 'string') return undefined
  const name = mod.mods?.[0]?.name
  if (!name) return undefined
  if (name === 'Veiled') return { icon: '/images/veiled.png', label: 'Veiled modifier' }
  if (/^Subterranean$|^of the Underground$/.test(name)) return { icon: '/images/delve.png', label: 'Delve modifier' }
  if (/^of the Essence$|^Essences$/.test(name)) return { icon: '/images/essence.png', label: 'Essence modifier' }
  if (INCURSION.test(name)) return { icon: '/images/incursion.png', label: 'Incursion modifier' }
  if (BETRAYAL.test(name)) return { icon: '/images/veiled.png', label: 'Veiled modifier' }
  for (const [re, influence] of INFLUENCE) {
    if (re.test(name)) return { icon: `/images/influence-${influence}.png`, label: `${influence} modifier` }
  }
  return undefined
}
