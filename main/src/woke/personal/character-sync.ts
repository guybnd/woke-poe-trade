// The character you play, read from pathofexile.com in the background and kept
// as its own record: gear, socketed gems and the passive tree. It never
// touches a PoB build; the overlay compares the two when you ask it to.
//
// Three calls per read (character list, get-items, get-passive-skills), on
// "Read now" at most every MANUAL_MS, and, only if turned on, on entering an
// area at most every AUTO_MS. Only the stash reader (personal) turns this on, and it reads
// with that sign-in.
//
// The last read is saved to <userData>/woke-character/current.json (and one
// file per character beside it), so other tools on this PC, such as the MCP
// server, can read it too. Shape: CharacterSnapshot, `version` 1.
import fs from 'fs/promises'
import path from 'path'
import type { PobItem } from '../pob-parse'
import { RateLimiter } from './rate-limit'
import { POE_SITE, isSignedOut } from './stash-reader'
import type { Fetcher, HttpReply } from './stash-reader'
import { SIGNED_OUT, characterEntry, cleanMod, socketColour, wornItem } from './worn-items'

// 2: mods read from 3.30's { description } objects. A version 1 read lost
// every mod: it is read again from the saved replies, or dropped.
export const SNAPSHOT_VERSION = 2
export const AUTO_MS = 5 * 60_000
export const MANUAL_MS = 30_000
const MAX_WAIT_MS = 10_000

export interface CharacterInfo {
  name: string
  league: string
  // The ascendancy when there is one ("Slayer"), else the class ("Duelist").
  class: string
  level: number | null
}

export interface CharacterGem {
  name: string
  level: number | null
  quality: number | null
  support: boolean
  // Socket colour: R, G, B, W, A (abyss).
  colour: string
}

// Gems in one linked group of one item.
export interface CharacterGemGroup {
  slot: string
  gems: CharacterGem[]
}

export interface CharacterTree {
  // Allocated passives, as PoB's tree ids.
  nodes: number[]
  // Passives on cluster jewels (ids not in the main tree).
  clusterNodes: number[]
  // Mastery node id -> chosen effect id.
  masteries: Record<number, number>
  // Socketed jewels; x is GGG's jewel slot index (tree.json's jewelSlots order).
  jewels: Array<{ x: number, item: PobItem }>
}

export interface CharacterSnapshot {
  version: number
  account: string
  readAt: number
  character: CharacterInfo
  // Every equipped slot in PoB's names, flasks and the swap weapons included.
  gear: Array<{ slot: string, item: PobItem }>
  gems: CharacterGemGroup[]
  tree: CharacterTree
}

export interface CharacterSyncStatus {
  snapshot: CharacterSnapshot | null
  error: string | null
  pending: boolean
  auto: boolean
  // When an area change may next read (0: any time).
  nextAutoAt: number
}

type Raw = Record<string, unknown>
const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null

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
  Offhand: 'Weapon 2',
  Weapon2: 'Weapon 1 Swap',
  Offhand2: 'Weapon 2 Swap'
}

function slotName (raw: Raw): string | null {
  const id = str(raw.inventoryId)
  if (id === 'Flask') {
    const x = num(raw.x)
    return x != null && x >= 0 && x < 5 ? `Flask ${x + 1}` : null
  }
  return SLOTS[id] ?? null
}

function firstNumber (item: Raw, name: string): number | null {
  const props = Array.isArray(item.properties) ? item.properties as Raw[] : []
  const p = props.find(x => x && x.name === name)
  const first = p && Array.isArray(p.values) ? (p.values as unknown[][])[0]?.[0] : undefined
  if (typeof first !== 'string') return null
  const m = /-?\d+/.exec(first)
  return m ? Number(m[0]) : null
}

// A gem's name: typeLine, without "Superior"/"Anomalous" style prefixes the
// game adds for alternate quality (baseType has the plain name).
function gemName (raw: Raw): string {
  return cleanMod(str(raw.baseType) || str(raw.typeLine)).replace(/<<[^>]*>>/g, '').trim()
}

// Linked groups of gems in one item, in socket order.
export function gemGroups (slot: string, raw: Raw): CharacterGemGroup[] {
  const sockets = Array.isArray(raw.sockets) ? raw.sockets as Raw[] : []
  const socketed = Array.isArray(raw.socketedItems) ? raw.socketedItems as Raw[] : []
  const byGroup = new Map<number, CharacterGem[]>()
  for (const g of socketed) {
    // Gems only (frame 4); abyss jewels sit in sockets too.
    if (!g || g.frameType !== 4) continue
    const at = num(g.socket)
    const socket = at != null ? sockets[at] : undefined
    const group = num(socket?.group) ?? 0
    const colour = socketColour(socket)
    const list = byGroup.get(group) ?? []
    list.push({
      name: gemName(g),
      level: firstNumber(g, 'Level'),
      quality: firstNumber(g, 'Quality'),
      support: g.support === true,
      colour
    })
    byGroup.set(group, list)
  }
  return [...byGroup.keys()].sort((a, b) => a - b).map(k => ({ slot, gems: byGroup.get(k)! }))
}

export function parseCharacterItems (body: string): Pick<CharacterSnapshot, 'gear' | 'gems'> | null {
  let json: Raw
  try {
    json = JSON.parse(body) as Raw
  } catch {
    return null
  }
  if (!json || !Array.isArray(json.items)) return null
  const gear: CharacterSnapshot['gear'] = []
  const gems: CharacterGemGroup[] = []
  for (const raw of json.items as Raw[]) {
    if (!raw) continue
    const slot = slotName(raw)
    if (!slot) continue
    gear.push({ slot, item: wornItem(raw) })
    gems.push(...gemGroups(slot, raw))
  }
  return { gear, gems }
}

// Masteries come as { "nodeId": effectId } or, in older replies, as a list of
// numbers packing the node in the low 16 bits and the effect above them.
function masteries (v: unknown): Record<number, number> {
  const out: Record<number, number> = {}
  if (Array.isArray(v)) {
    for (const x of v) {
      const n = typeof x === 'string' ? Number(x) : x
      if (typeof n === 'number' && Number.isInteger(n) && n > 0) out[n & 0xffff] = Math.floor(n / 0x10000)
    }
  } else if (v && typeof v === 'object') {
    for (const [k, e] of Object.entries(v as Raw)) {
      const node = Number(k)
      const effect = typeof e === 'string' ? Number(e) : e
      if (Number.isInteger(node) && typeof effect === 'number' && Number.isInteger(effect)) out[node] = effect
    }
  }
  return out
}

const ids = (v: unknown): number[] => Array.isArray(v)
  ? [...new Set(v.map(x => typeof x === 'string' ? Number(x) : x).filter((x): x is number => typeof x === 'number' && Number.isInteger(x)))]
  : []

export function parsePassives (body: string): CharacterTree | null {
  let json: Raw
  try {
    json = JSON.parse(body) as Raw
  } catch {
    return null
  }
  if (!json || !Array.isArray(json.hashes)) return null
  const jewels: CharacterTree['jewels'] = []
  for (const raw of Array.isArray(json.items) ? json.items as Raw[] : []) {
    const x = num(raw?.x)
    if (raw && x != null) jewels.push({ x, item: wornItem(raw) })
  }
  return {
    nodes: ids(json.hashes),
    clusterNodes: ids(json.hashes_ex),
    masteries: masteries(json.mastery_effects),
    jewels
  }
}

export function characterInfo (entry: Raw): CharacterInfo {
  return {
    name: str(entry.name),
    league: str(entry.league),
    class: str(entry.class),
    level: num(entry.level)
  }
}

// File name for a character: letters, digits, _ and - only.
export const fileSafe = (name: string) => name.replace(/[^\w-]/g, '_').slice(0, 64) || '_'

export interface CharacterStore {
  load: () => Promise<CharacterSnapshot | null>
  save: (s: CharacterSnapshot) => Promise<void>
  // The site's last replies as they came, to check the parsing against.
  saveRaw?: (name: 'items' | 'passives', body: string) => Promise<void>
}

// <dir>/current.json plus <dir>/characters/<name>.json, each written whole
// through a temp file so a reader never sees half a file.
export function fileStore (dir: string): CharacterStore {
  const write = async (file: string, data: string) => {
    await fs.mkdir(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    await fs.writeFile(tmp, data, 'utf8')
    try {
      await fs.rename(tmp, file)
    } catch {
      // Windows refuses while another program has the file open: once more, then give up.
      await new Promise(resolve => setTimeout(resolve, 150))
      await fs.rename(tmp, file).catch(async (e: Error) => { await fs.rm(tmp, { force: true }).catch(() => {}); throw e })
    }
  }
  const store: CharacterStore = {
    load: async () => {
      try {
        const s = JSON.parse(await fs.readFile(path.join(dir, 'current.json'), 'utf8')) as CharacterSnapshot
        const ok = s && typeof s.account === 'string' && s.character && typeof s.character.name === 'string' &&
          Array.isArray(s.gear) && Array.isArray(s.gems) && s.tree && Array.isArray(s.tree.nodes)
        if (!ok) return null
        if (s.version === SNAPSHOT_VERSION) return s
        if (s.version !== 1) return null
        // The replies saved beside it, only if they are that read's: a later
        // read that failed partway leaves newer ones (written before readAt is
        // taken), or another character's.
        const itemsFile = path.join(dir, 'last-items-reply.json')
        const passivesFile = path.join(dir, 'last-passives-reply.json')
        const [itemsAt, passivesAt] = await Promise.all([fs.stat(itemsFile), fs.stat(passivesFile)])
        if (itemsAt.mtimeMs > s.readAt + 1000 || passivesAt.mtimeMs > s.readAt + 1000) return null
        const itemsBody = await fs.readFile(itemsFile, 'utf8')
        const named = (JSON.parse(itemsBody) as { character?: { name?: unknown } }).character?.name
        if (typeof named === 'string' && named !== s.character.name) return null
        const items = parseCharacterItems(itemsBody)
        const tree = parsePassives(await fs.readFile(passivesFile, 'utf8'))
        if (!items || !tree) return null
        const rebuilt: CharacterSnapshot = { ...s, version: SNAPSHOT_VERSION, ...items, tree }
        // Written back, so the next start (and other readers of the file) have it.
        await store.save(rebuilt).catch(() => {})
        return rebuilt
      } catch {
        return null
      }
    },
    saveRaw: async (name, body) => { await write(path.join(dir, `last-${name}-reply.json`), body) },
    save: async (s) => {
      const data = JSON.stringify(s, null, 1)
      await write(path.join(dir, 'characters', `${fileSafe(s.character.name)}.json`), data)
      await write(path.join(dir, 'current.json'), data)
    }
  }
  return store
}

interface Deps {
  fetch: Fetcher
  now: () => number
  sleep?: (ms: number) => Promise<void>
  account: () => string | null
  league?: () => string | null
  store: CharacterStore
  onStatus: (s: CharacterSyncStatus) => void
  log?: (line: string) => void
  signedOut: () => void
}

class Refused extends Error {}

export class CharacterSync {
  private limiter = new RateLimiter()
  private snapshot: CharacterSnapshot | null = null
  private error: string | null = null
  private running: Promise<CharacterSyncStatus> | null = null
  private lastTry = 0
  private loaded: Promise<void>
  private stopped = false
  // The character Client.txt or the overlay named last, for when the site doesn't mark one.
  hint = ''
  // Off until the overlay says otherwise: Read now only (Guy's pick).
  auto = false

  constructor (private deps: Deps) {
    this.loaded = deps.store.load().then((s) => {
      if (s && !this.snapshot) this.snapshot = s
    }).catch(() => {})
  }

  get status (): CharacterSyncStatus {
    const account = this.deps.account()
    // A read of another account isn't yours.
    const snapshot = this.snapshot && account && this.snapshot.account.toLowerCase() === account.toLowerCase() ? this.snapshot : null
    return {
      snapshot,
      error: account ? this.error : SIGNED_OUT,
      pending: this.running != null,
      auto: this.auto,
      nextAutoAt: this.lastTry ? this.lastTry + AUTO_MS : 0
    }
  }

  async current (): Promise<CharacterSyncStatus> {
    await this.loaded
    return this.status
  }

  stop () { this.stopped = true }

  // 'area': entered an area (only when auto is on, at most every AUTO_MS).
  // 'manual': Read now (at most every MANUAL_MS).
  read (reason: 'area' | 'manual'): Promise<CharacterSyncStatus> {
    if (this.running) return this.running
    const gap = reason === 'area' ? AUTO_MS : MANUAL_MS
    if ((reason === 'area' && !this.auto) || !this.deps.account()) return this.current()
    const wait = this.lastTry ? this.lastTry + gap - this.deps.now() : 0
    if (wait > 0) {
      // Read now too soon: say so, without keeping it as the read's error.
      if (reason === 'manual') return this.current().then(s => ({ ...s, error: `Read just now; again in ${Math.ceil(wait / 1000)} s.` }))
      return this.current()
    }
    this.lastTry = this.deps.now()
    const run = this.run().finally(() => {
      this.running = null
      if (!this.stopped) this.deps.onStatus(this.status)
    })
    this.running = run
    if (!this.stopped) this.deps.onStatus(this.status)
    return run
  }

  private async run (): Promise<CharacterSyncStatus> {
    await this.loaded
    const account = this.deps.account()
    if (!account) return this.status
    try {
      const chars = await this.get(`${POE_SITE}/character-window/get-characters?${new URLSearchParams({ accountName: account, realm: 'pc' }).toString()}`)
      const entry = characterEntry(chars.body, this.hint, this.deps.league?.() ?? null)
      if (!entry) throw new Refused("pathofexile.com didn't list your characters.")
      const info = characterInfo(entry)
      const q = new URLSearchParams({ accountName: account, character: info.name, realm: 'pc' }).toString()
      const itemsBody = (await this.get(`${POE_SITE}/character-window/get-items?${q}`)).body
      await this.deps.store.saveRaw?.('items', itemsBody).catch(() => {})
      const items = parseCharacterItems(itemsBody)
      if (!items) throw new Refused(`Couldn't read ${info.name}'s gear.`)
      const passivesBody = (await this.get(`${POE_SITE}/character-window/get-passive-skills?${q}`)).body
      await this.deps.store.saveRaw?.('passives', passivesBody).catch(() => {})
      const tree = parsePassives(passivesBody)
      if (!tree) throw new Refused(`Couldn't read ${info.name}'s passive tree.`)
      if (this.stopped) return this.status
      const snapshot: CharacterSnapshot = { version: SNAPSHOT_VERSION, account, readAt: this.deps.now(), character: info, ...items, tree }
      this.snapshot = snapshot
      this.error = null
      await this.deps.store.save(snapshot).catch((e: Error) => this.deps.log?.(`warn [character-sync] couldn't save: ${e.message}`))
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e)
      if (!(e instanceof Refused) || this.error !== SIGNED_OUT) this.deps.log?.(`warn [character-sync] ${this.error}`)
    }
    return this.status
  }

  private async get (url: string): Promise<HttpReply> {
    const wait = this.limiter.delay(this.deps.now())
    if (wait > MAX_WAIT_MS) throw new Refused('pathofexile.com asked to slow down; reading again later.')
    if (wait > 0) await (this.deps.sleep ?? (async (ms) => { await new Promise(resolve => setTimeout(resolve, ms)) }))(wait)
    this.limiter.record(this.deps.now())
    const reply = await this.deps.fetch(url)
    this.limiter.update(reply.status, reply.headers, this.deps.now())
    if (isSignedOut(reply)) {
      this.deps.signedOut()
      throw new Refused(SIGNED_OUT)
    }
    if (reply.status === 429) throw new Refused('pathofexile.com asked to slow down; reading again later.')
    if (reply.status !== 200) throw new Refused(`pathofexile.com answered ${reply.status}.`)
    return reply
  }
}
