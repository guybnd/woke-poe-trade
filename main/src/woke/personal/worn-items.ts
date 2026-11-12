// What your character wears right now, from character-window/get-items with
// your pathofexile.com login, as PoB-shaped items so the price check compares
// against them the way it compares against a PoB set. Only the stash reader
// (personal) turns this on. One call per character at most every CACHE_MS.
import type { PobItem, PobModKind, PobRarity } from '../pob-parse'
import { RateLimiter } from './rate-limit'
import { POE_SITE, isSignedOut } from './stash-reader'
import type { Fetcher, HttpReply } from './stash-reader'

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

// 10: supporter foil uniques. A frame we don't know still counts as a unique,
// so the slot isn't taken for empty.
const RARITY: Record<number, PobRarity> = { 0: 'NORMAL', 1: 'MAGIC', 2: 'RARE', 3: 'UNIQUE', 9: 'RELIC', 10: 'UNIQUE' }

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

// The game marks some names with <<set:MS>> style tags.
const tagless = (s: string) => s.replace(/<<[^>]*>>/g, '').trim()

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

export function wornItem (raw: Raw): PobItem {
  const rarity = RARITY[typeof raw.frameType === 'number' ? raw.frameType : -1] ?? 'UNIQUE'
  const name = tagless(str(raw.name))
  const typeLine = tagless(str(raw.typeLine))
  const baseType = tagless(str(raw.baseType)) || typeLine
  const named = rarity === 'RARE' || rarity === 'UNIQUE' || rarity === 'RELIC'

  const enchants = lines(raw.enchantMods)
  const implicits = lines(raw.implicitMods)
  const fractured = lines(raw.fracturedMods)
  // Foulborn uniques' mutated mods count like any other.
  const explicit = [...lines(raw.explicitMods), ...lines(raw.mutatedMods)]
  const crafted = lines(raw.craftedMods)
  const mods = [...fractured, ...explicit, ...crafted]
  const modKinds: PobModKind[] = [...fractured.map(() => 'fractured' as const), ...explicit.map(() => '' as const), ...crafted.map(() => 'crafted' as const)]

  const influences = raw.influences && typeof raw.influences === 'object'
    ? Object.keys(raw.influences).filter(k => (raw.influences as Raw)[k] === true && INFLUENCE[k]).map(k => INFLUENCE[k])
    : []

  const item: PobItem = {
    rarity,
    // A normal item's typeLine may carry "Superior" or "Synthesised": the base reads surely.
    name: named ? name : rarity === 'NORMAL' ? baseType : typeLine,
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
    out.push({ slot, item: wornItem(raw) })
  }
  return out
}

// Gear is read again after a minute; the character list (to know which one
// you play) after five. A failed read is not tried again for a minute.
export const CACHE_MS = 60_000
export const CHARS_MS = 5 * 60_000
export const RETRY_MS = 60_000

// Longest wait between two calls of one read.
const MAX_WAIT_MS = 5_000

export const SIGNED_OUT = 'Signed out of pathofexile.com.'

// Which character to read, from a get-characters reply: the one the site
// marks as last played; else the game log's name if it is yours; else your
// highest level one in the league the app is set to, else in any league.
// null: the reply isn't a character list.
export function pickCharacter (body: string, hint: string, league: string | null): string | null {
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return null
  }
  const raw = Array.isArray(json) ? json : (json as Raw | null)?.characters
  if (!Array.isArray(raw)) return null
  const list = (raw as Raw[]).filter(c => c && typeof c.name === 'string')
  const active = list.find(c => c.lastActive === true)
  if (active) return active.name as string
  if (hint && list.some(c => c.name === hint)) return hint
  const level = (c: Raw) => typeof c.level === 'number' ? c.level : 0
  const best = (cs: Raw[]) => cs.slice().sort((x, y) => level(y) - level(x))[0]?.name as string | undefined
  return best(list.filter(c => league != null && c.league === league)) ?? best(list) ?? null
}

interface Deps {
  fetch: Fetcher
  now: () => number
  sleep?: (ms: number) => Promise<void>
  account: () => string | null
  // The league the app is set to, to pick a character when the site doesn't say.
  league?: () => string | null
  log?: (line: string) => void
  // A redirect, 401 or 403: the login has expired.
  signedOut: () => void
}

class Refused extends Error {}

export class WornReader {
  private limiter = new RateLimiter()
  private gear: (WornGear & { account: string }) | null = null
  private chars: { account: string, hint: string, at: number, name: string | null } | null = null
  private failed: { key: string, at: number, error: string } | null = null
  private running: Promise<WornReply> | null = null

  constructor (private deps: Deps) {}

  // hint: the character the game log last named, for when the site doesn't say.
  read (hint: string): Promise<WornReply> {
    if (this.running) return this.running
    const run = this.run(hint).finally(() => { this.running = null })
    this.running = run
    return run
  }

  private async run (hint: string): Promise<WornReply> {
    const account = this.deps.account()
    if (!account) return { error: SIGNED_OUT }
    const now = this.deps.now()
    const key = `${account}\n${hint}`
    if (this.failed?.key === key && now - this.failed.at < RETRY_MS) return { error: this.failed.error }
    try {
      let chars = this.chars
      if (!chars || chars.account !== account || chars.hint !== hint || now - chars.at > CHARS_MS) {
        const q = new URLSearchParams({ accountName: account, realm: 'pc' })
        const r = await this.get(`${POE_SITE}/character-window/get-characters?${q.toString()}`)
        const name = pickCharacter(r.body, hint, this.deps.league?.() ?? null)
        if (!name) this.deps.log?.(`warn [worn-items] no character in the get-characters reply: ${r.body.slice(0, 200)}`)
        chars = { account, hint, at: this.deps.now(), name }
        this.chars = chars
      }
      const character = chars.name ?? hint
      if (!character) throw new Refused("pathofexile.com didn't list your characters.")
      const g = this.gear
      if (g && g.account === account && g.character === character && this.deps.now() - g.readAt < CACHE_MS) {
        return { character: g.character, readAt: g.readAt, slots: g.slots }
      }
      const q = new URLSearchParams({ accountName: account, character, realm: 'pc' })
      const reply = await this.get(`${POE_SITE}/character-window/get-items?${q.toString()}`)
      const slots = parseWornItems(reply.body)
      if (!slots) throw new Refused(`Couldn't read ${character}'s gear.`)
      const gear = { character, readAt: this.deps.now(), slots }
      this.gear = { ...gear, account }
      this.failed = null
      return gear
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      this.failed = { key, at: this.deps.now(), error }
      return { error }
    }
  }

  // Waits a moment between its own calls, never longer: the price check
  // shows PoB meanwhile.
  private async get (url: string): Promise<HttpReply> {
    const wait = this.limiter.delay(this.deps.now())
    if (wait > MAX_WAIT_MS) throw new Refused('Too many gear reads; trying again soon.')
    if (wait > 0) await (this.deps.sleep ?? (async (ms) => { await new Promise(resolve => setTimeout(resolve, ms)) }))(wait)
    this.limiter.record(this.deps.now())
    const reply = await this.deps.fetch(url)
    this.limiter.update(reply.status, reply.headers, this.deps.now())
    if (isSignedOut(reply)) {
      this.deps.signedOut()
      throw new Refused(SIGNED_OUT)
    }
    if (reply.status !== 200) throw new Refused(`pathofexile.com answered ${reply.status}.`)
    return reply
  }
}
