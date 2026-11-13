// A trade listing's item, in the shape the shared game tooltip draws. The trade
// site already sends all of this with each listing, so showing it costs no
// extra requests. Pure functions.

import type { PobItem, PobRarity } from '../pob-builds/widget'

// The trade API sends explicitMods as objects that name their own kind: a
// fractured mod is in explicitMods with domain "fractured". Other lists can
// still hold plain text.
export type ListingMod = string | {
  description?: string
  domain?: string
  // The trade stat, "stat.implicit.stat_1880071428".
  hash?: string
  flags?: { fractured?: boolean, crafted?: boolean }
  // The mods behind this line: usually one, two when they share a stat. Uniques
  // and implicits have no name or tier. Tier is P1, S3, or R2 for a crafted mod.
  mods?: Array<{
    name?: string
    tier?: string
    magnitudes?: Array<{ min?: string | number, max?: string | number }>
  }>
}

export interface ListingItem {
  name?: string
  typeLine?: string
  baseType?: string
  frameType?: number
  ilvl?: number
  corrupted?: boolean
  mirrored?: boolean
  influences?: Record<string, boolean>
  implicitMods?: ListingMod[]
  enchantMods?: ListingMod[]
  utilityMods?: ListingMod[]
  fracturedMods?: ListingMod[]
  explicitMods?: ListingMod[]
  craftedMods?: ListingMod[]
  sockets?: Array<{ group: number, sColour: string }>
  fractured?: boolean
  synthesised?: boolean
  // Eldritch implicits: from the Searing Exarch's altar, the Eater of Worlds', or both.
  searing?: boolean
  tangled?: boolean
  scourgeMods?: ListingMod[]
  // Unrevealed: description "Prefix02", one mod named "Veiled" with tier P… or S….
  veiledMods?: ListingMod[]
  // In a value, the number says how the game colours it: 1 boosted, 4 fire,
  // 5 cold, 6 lightning, 7 chaos.
  properties?: Array<{ name?: string, type?: number, displayMode?: number, values: Array<[string, number]> }>
  requirements?: Array<{ name?: string, displayMode?: number, values: Array<[string, number]> }>
  // Defences and dps at 20% quality, the numbers the trade filters search on.
  extended?: {
    ar?: number
    ev?: number
    es?: number
    ward?: number
    dps?: number
    pdps?: number
    edps?: number
    base_defence_percentile?: number
  }
}

const RARITY: Record<number, PobRarity> = { 0: 'NORMAL', 1: 'MAGIC', 2: 'RARE', 3: 'UNIQUE', 9: 'RELIC' }

// Quality goes by type: its name varies, as in "Quality (Attack Modifiers)".
const QUALITY_TYPE = 6

// The trade site keeps the game's link markup: "[Intangibility|Intangibility]"
// shows as its second half, and "[Armour]" as its word.
export function stripLinks (text: string): string {
  return text.replace(/\[([^\]|]*)\|([^\]]*)\]/g, '$2').replace(/\[([^\]|]+)\]/g, '$1')
}

export function modText (mod: ListingMod): string {
  return stripLinks(typeof mod === 'string' ? mod : mod.description ?? '')
}

export function modDomain (mod: ListingMod): string {
  if (typeof mod === 'string') return ''
  if (mod.flags?.fractured) return 'fractured'
  if (mod.flags?.crafted) return 'crafted'
  return mod.domain ?? ''
}

/** A listing's sockets as traders say them, for the listings' Sockets column:
 *  6L (gold), 6S (blue: six sockets, not all linked), 5L, else the socket count. */
export function socketSummary (sockets: ListingItem['sockets']): { text: string, tone: 'l6' | 's6' | '' } {
  const groups = new Map<number, number>()
  for (const s of sockets ?? []) groups.set(s.group, (groups.get(s.group) ?? 0) + 1)
  const total = sockets?.length ?? 0
  const link = Math.max(0, ...groups.values())
  if (link >= 6) return { text: '6L', tone: 'l6' }
  if (total >= 6) return { text: '6S', tone: 's6' }
  if (link === 5) return { text: '5L', tone: '' }
  return { text: total ? `${total}S` : '', tone: '' }
}

function socketsText (sockets: ListingItem['sockets']): string {
  const groups = new Map<number, string[]>()
  for (const s of sockets ?? []) {
    groups.set(s.group, [...(groups.get(s.group) ?? []), s.sColour])
  }
  return Array.from(groups.values(), g => g.join('-')).join(' ')
}

function propNumber (item: ListingItem, match: (p: { name?: string, type?: number }) => boolean): number | undefined {
  const raw = item.properties?.find(p => match({ name: p.name && stripLinks(p.name), type: p.type }))?.values[0]?.[0]
  if (raw == null) return undefined
  const n = Number(raw.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function capitalize (s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Null for what has no mods to show: gems, currency and the like. */
export function listingTipItem (item: ListingItem): PobItem | null {
  const rarity = RARITY[item.frameType ?? -1]
  if (!rarity) return null

  const listed = item.explicitMods ?? []
  const ofDomain = (domain: string) => listed.filter(m => modDomain(m) === domain)
  const implicits = [
    ...(item.enchantMods ?? []), ...ofDomain('enchant'),
    ...(item.implicitMods ?? []), ...ofDomain('implicit')
  ]
  const fractured = [...(item.fracturedMods ?? []), ...ofDomain('fractured')]
  const crafted = [...(item.craftedMods ?? []), ...ofDomain('crafted')]
  const others = listed.filter(m => !['enchant', 'implicit', 'fractured', 'crafted'].includes(modDomain(m)))
  const plain = [...(item.utilityMods ?? []), ...others]

  const texts = (mods: ListingMod[]) => mods.map(modText).filter(Boolean)
  const fracturedText = texts(fractured)
  const plainText = texts(plain)
  const craftedText = texts(crafted)
  const implicitText = texts(implicits)
  const mods = [...fracturedText, ...plainText, ...craftedText]
  if (!mods.length && !implicitText.length) return null

  return {
    rarity,
    name: item.name ?? '',
    base: item.typeLine ?? item.baseType ?? '',
    sockets: socketsText(item.sockets),
    implicits: implicitText,
    mods,
    modKinds: [
      ...fracturedText.map(() => 'fractured' as const),
      ...plainText.map(() => '' as const),
      ...craftedText.map(() => 'crafted' as const)
    ],
    quality: propNumber(item, p => p.type === QUALITY_TYPE),
    armour: propNumber(item, p => p.name === 'Armour'),
    evasion: propNumber(item, p => p.name === 'Evasion Rating'),
    energyShield: propNumber(item, p => p.name === 'Energy Shield'),
    ward: propNumber(item, p => p.name === 'Ward'),
    itemLevel: item.ilvl,
    corrupted: item.corrupted,
    mirrored: item.mirrored,
    influences: Object.keys(item.influences ?? {}).map(capitalize)
  }
}
