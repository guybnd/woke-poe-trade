// Turns character-window/get-stash-items replies into the small item records
// we keep. Pure, so it is tested with fixtures.

export interface StashTabInfo {
  id: string
  index: number
  name: string
  type: string
  colour: string | null
  hidden: boolean
}

export interface StashItem {
  name: string
  typeLine: string
  baseType: string
  // 0 normal, 1 magic, 2 rare, 3 unique, 4 gem, 5 currency, 6 card, 7 quest, 9 relic.
  frame: number
  stack: number
  icon: string
  ilvl?: number
  gemLevel?: number
  quality?: number
  mapTier?: number
  links?: number
  corrupted?: boolean
  unidentified?: boolean
  foulborn?: boolean
  // Kept for gear, so a later view can price rares.
  mods?: string[]
}

export interface StashReply {
  tabs: StashTabInfo[] | null
  items: StashItem[]
}

export class StashApiError extends Error {
  constructor (message: string, readonly code: number | null) { super(message) }
}

type Raw = Record<string, unknown>

const str = (v: unknown) => typeof v === 'string' ? v : ''
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : undefined

// "20 (Max)", "+20%", "16" -> the first number.
function firstNumber (text: string): number | undefined {
  const m = /-?\d+/.exec(text)
  return m ? Number(m[0]) : undefined
}

function property (item: Raw, name: string): number | undefined {
  const props = Array.isArray(item.properties) ? item.properties as Raw[] : []
  const p = props.find(x => x && x.name === name)
  const values = p && Array.isArray(p.values) ? p.values as unknown[][] : []
  const first = values[0]?.[0]
  return typeof first === 'string' ? firstNumber(first) : undefined
}

function linkCount (item: Raw): number | undefined {
  if (!Array.isArray(item.sockets) || !item.sockets.length) return undefined
  const groups = new Map<number, number>()
  for (const s of item.sockets as Raw[]) {
    const g = num(s?.group) ?? 0
    groups.set(g, (groups.get(g) ?? 0) + 1)
  }
  return Math.max(...groups.values())
}

// The game marks some names with <<set:MS>> style tags.
function clean (s: string) {
  return s.replace(/<<[^>]*>>/g, '').trim()
}

const GEAR_FRAMES = new Set([1, 2, 3])

export function parseItem (raw: unknown): StashItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Raw
  const typeLine = clean(str(item.typeLine))
  if (!typeLine) return null
  const frame = num(item.frameType) ?? 0
  const out: StashItem = {
    name: clean(str(item.name)),
    typeLine,
    baseType: clean(str(item.baseType)) || typeLine,
    frame,
    stack: Math.max(1, num(item.stackSize) ?? 1),
    icon: str(item.icon)
  }
  const ilvl = num(item.ilvl)
  if (ilvl) out.ilvl = ilvl
  if (frame === 4) {
    out.gemLevel = property(item, 'Level')
    out.quality = property(item, 'Quality') ?? 0
  }
  const tier = property(item, 'Map Tier')
  if (tier) out.mapTier = tier
  const links = linkCount(item)
  if (links) out.links = links
  if (item.corrupted === true) out.corrupted = true
  if (item.identified === false) out.unidentified = true
  if (item.mutated === true) out.foulborn = true
  if (GEAR_FRAMES.has(frame)) {
    const mods: string[] = []
    for (const key of ['enchantMods', 'implicitMods', 'fracturedMods', 'explicitMods', 'craftedMods']) {
      const list = item[key]
      if (Array.isArray(list)) for (const m of list) if (typeof m === 'string') mods.push(m)
    }
    if (mods.length) out.mods = mods
  }
  return out
}

function colourOf (tab: Raw): string | null {
  const c = tab.colour as Raw | undefined
  if (!c) return null
  const [r, g, b] = [num(c.r), num(c.g), num(c.b)]
  if (r == null || g == null || b == null) return null
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
}

export function parseTabs (list: unknown): StashTabInfo[] {
  if (!Array.isArray(list)) return []
  const out: StashTabInfo[] = []
  for (const t of list as Raw[]) {
    if (!t || typeof t !== 'object') continue
    const index = num(t.i)
    if (index == null) continue
    out.push({
      id: str(t.id) || `i${index}`,
      index,
      name: str(t.n) || `Tab ${index + 1}`,
      type: str(t.type),
      colour: colourOf(t),
      hidden: t.hidden === true
    })
  }
  return out
}

export function parseStashReply (body: string): StashReply {
  let json: Raw
  try {
    json = JSON.parse(body) as Raw
  } catch {
    throw new StashApiError('pathofexile.com sent something that isn\'t stash data.', null)
  }
  if (json?.error && typeof json.error === 'object') {
    const e = json.error as Raw
    throw new StashApiError(str(e.message) || 'pathofexile.com refused the read.', num(e.code) ?? null)
  }
  const items: StashItem[] = []
  if (Array.isArray(json.items)) {
    for (const raw of json.items) {
      const item = parseItem(raw)
      if (item) items.push(item)
    }
  }
  return { tabs: 'tabs' in json ? parseTabs(json.tabs) : null, items }
}

// Tabs never worth reading again on a quiet read: only things to take out.
export function isRemoveOnly (tab: StashTabInfo): boolean {
  return /\(Remove-only\)/i.test(tab.name)
}

// Hideout areas in Client.txt: `Generating level 1 area "HideoutCelestial"`.
const HIDEOUT_LINE = /Generating level \d+ area "Hideout[^"]*"/

export function entersHideout (lines: string[]): boolean {
  return lines.some(l => HIDEOUT_LINE.test(l))
}
