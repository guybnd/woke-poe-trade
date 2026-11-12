// What your character wears right now, from character-window/get-items with
// your pathofexile.com login, as PoB-shaped items so the price check compares
// against them the way it compares against a PoB set. Only the stash reader
// (personal) turns this on. One call per character at most every CACHE_MS.
import type { PobItem, PobModKind, PobRarity } from '../pob-parse'
import { RateLimiter } from './rate-limit'
import { POE_SITE, isSignedOut } from './stash-reader'
import type { Fetcher } from './stash-reader'

// The game's equipment slots, in PoB's names. Flasks, jewels and the
// second weapon set don't take part in the compare.
const SLOTS: Record<string, string> = {
  Helm: 'Helmet',
  BodyArmour: 'Body Armour',
  Gloves: 'Gloves',
  Boots: 'Boots',
  Belt: 'Belt',
  Amulet: 'Amulet',
  Ring: 'Ring 1',
  Ring2: 'Ring 2',
  Ring3: 'Ring 3',
  Weapon: 'Weapon 1',
  Offhand: 'Weapon 2'
}

const RARITY: Record<number, PobRarity> = { 0: 'NORMAL', 1: 'MAGIC', 2: 'RARE', 3: 'UNIQUE', 9: 'RELIC' }

const INFLUENCE: Record<string, string> = {
  shaper: 'Shaper', elder: 'Elder', crusader: 'Crusader', redeemer: 'Redeemer', hunter: 'Hunter', warlord: 'Warlord'
}

export interface WornSlot { slot: string, item: PobItem }

export interface WornGear {
  character: string
  readAt: number
  slots: WornSlot[]
}

export type WornReply = WornGear | { error: string }

type Raw = Record<string, unknown>

const str = (v: unknown) => typeof v === 'string' ? v : ''
const lines = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map(cleanMod).filter(Boolean) : []

// Newer replies mark terms up: "[ElementalDamage|Elemental Damage]" -> "Elemental Damage".
export function cleanMod (line: string): string {
  return line.replace(/\[([^\]|]*)\|([^\]]*)\]/g, '$2').replace(/\[([^\]|]*)\]/g, '$1').trim()
}

function property (item: Raw, name: string): number | undefined {
  const props = Array.isArray(item.properties) ? item.properties as Raw[] : []
  const p = props.find(x => x && x.name === name)
  const first = p && Array.isArray(p.values) ? (p.values as unknown[][])[0]?.[0] : undefined
  if (typeof first !== 'string') return undefined
  const m = /-?\d+/.exec(first)
  return m ? Number(m[0]) : undefined
}

// "R-G-B G": sockets in one group are linked.
function socketText (item: Raw): string {
  const sockets = Array.isArray(item.sockets) ? item.sockets as Raw[] : []
  let out = ''
  let group: unknown = null
  for (const s of sockets) {
    const colour = str(s?.sColour) || 'W'
    if (out) out += s?.group === group ? '-' : ' '
    out += colour === 'DV' ? 'A' : colour
    group = s?.group
  }
  return out
}

export function wornItem (raw: Raw): PobItem | null {
  const rarity = RARITY[typeof raw.frameType === 'number' ? raw.frameType : -1]
  if (!rarity) return null
  const name = str(raw.name)
  const typeLine = str(raw.typeLine)
  const baseType = str(raw.baseType) || typeLine
  const named = rarity === 'RARE' || rarity === 'UNIQUE' || rarity === 'RELIC'

  const enchants = lines(raw.enchantMods)
  const implicits = lines(raw.implicitMods)
  const fractured = lines(raw.fracturedMods)
  const explicit = lines(raw.explicitMods)
  const crafted = lines(raw.craftedMods)
  const mods = [...fractured, ...explicit, ...crafted]
  const modKinds: PobModKind[] = [...fractured.map(() => 'fractured' as const), ...explicit.map(() => '' as const), ...crafted.map(() => 'crafted' as const)]

  const influences = raw.influences && typeof raw.influences === 'object'
    ? Object.keys(raw.influences).filter(k => (raw.influences as Raw)[k] === true && INFLUENCE[k]).map(k => INFLUENCE[k])
    : []

  const item: PobItem = {
    rarity,
    name: named ? name : typeLine,
    base: named ? baseType : '',
    sockets: socketText(raw),
    // item-text.ts writes implicits PoB marks crafted as enchants.
    implicits: [...enchants, ...implicits],
    implicitKinds: [...enchants.map(() => 'crafted' as const), ...implicits.map(() => '' as const)],
    mods,
    modKinds,
    itemLevel: typeof raw.ilvl === 'number' ? raw.ilvl : undefined,
    quality: property(raw, 'Quality'),
    armour: property(raw, 'Armour'),
    evasion: property(raw, 'Evasion Rating'),
    energyShield: property(raw, 'Energy Shield'),
    ward: property(raw, 'Ward'),
    corrupted: raw.corrupted === true || undefined,
    mirrored: raw.duplicated === true || undefined,
    influences: influences.length ? influences : undefined
  }
  return item
}

// The worn gear in a get-items reply; null when it isn't one.
export function parseWornItems (body: string): WornSlot[] | null {
  let json: Raw
  try {
    json = JSON.parse(body) as Raw
  } catch {
    return null
  }
  if (!json || !Array.isArray(json.items)) return null
  const out: WornSlot[] = []
  for (const raw of json.items as Raw[]) {
    const slot = SLOTS[str(raw?.inventoryId)]
    if (!slot) continue
    const item = wornItem(raw)
    if (item) out.push({ slot, item })
  }
  return out
}

export const CACHE_MS = 60_000

export class WornReader {
  private limiter = new RateLimiter()
  private cache: WornGear | null = null
  private running: Promise<WornReply> | null = null
  private runningFor = ''

  constructor (private deps: { fetch: Fetcher, now: () => number, account: () => string | null }) {}

  // Fresh: skip the cache (you just swapped gear).
  read (character: string, fresh = false): Promise<WornReply> {
    const now = this.deps.now()
    const c = this.cache
    if (!fresh && c && c.character === character && now - c.readAt < CACHE_MS) return Promise.resolve(c)
    if (this.running && this.runningFor === character) return this.running
    this.runningFor = character
    const run = this.fetch(character).finally(() => { if (this.running === run) this.running = null })
    this.running = run
    return run
  }

  private async fetch (character: string): Promise<WornReply> {
    const account = this.deps.account()
    if (!account) return { error: 'Signed out of pathofexile.com.' }
    const now = this.deps.now()
    // Never wait in line: the price check shows PoB instead.
    if (this.limiter.delay(now) > 0) return { error: 'pathofexile.com asked us to slow down.' }
    this.limiter.record(now)
    const q = new URLSearchParams({ accountName: account, character, realm: 'pc' })
    const reply = await this.deps.fetch(`${POE_SITE}/character-window/get-items?${q.toString()}`)
    this.limiter.update(reply.status, reply.headers, this.deps.now())
    if (isSignedOut(reply)) return { error: 'Signed out of pathofexile.com.' }
    if (reply.status !== 200) return { error: `pathofexile.com answered ${reply.status}.` }
    const slots = parseWornItems(reply.body)
    if (!slots) return { error: `Couldn't read ${character}'s gear.` }
    const gear: WornGear = { character, readAt: this.deps.now(), slots }
    this.cache = gear
    return gear
  }
}
