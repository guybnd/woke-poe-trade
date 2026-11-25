// Reads the Client.txt lines the trade assistant cares about: trade whispers
// (in and out), people joining or leaving your area, and trade results.
// English client lines only, like the other log readers.
import { lineTime } from '../campaign/log-tail'
import { parseChatLine } from '@/web/client-log/parse-chat'
import type { LogEntry } from '@/web/client-log/parse-chat'

export interface TradePrice {
  amount: number
  // Full currency name ("Divine Orb"), from a trade site tag or the bulk text.
  currency: string
}

export interface TradeOffer {
  // Item as written in the whisper ("Headhunter Leather Belt", "Divine Orb").
  item: string
  // Bulk offers: how many. Single items: 1.
  qty: number
  // Unpriced listings ("Hi, I would like to buy your X in League") have none.
  price: TradePrice | null
  league: string
  tab: { name: string, left: number, top: number } | null
  // Anything the buyer typed after the generated text.
  note: string
  bulk: boolean
}

export type TradeEvent =
  { kind: 'whisper-in', at: number, who: string, body: string, offer: TradeOffer | null } |
  { kind: 'whisper-out', at: number, who: string, body: string, offer: TradeOffer | null } |
  { kind: 'joined', at: number, who: string } |
  { kind: 'left', at: number, who: string } |
  // You changed area: nobody from before is with you now.
  { kind: 'entered', at: number } |
  { kind: 'trade-accepted', at: number } |
  { kind: 'trade-cancelled', at: number } |
  { kind: 'offline', at: number } |
  { kind: 'afk', at: number, on: boolean }

// Trade site tags (as in "listed for 120 divine") to item names. The first
// tag for a name is the trade site's own (APT's item data `tradeTag`), the
// others are short forms people type.
export const CURRENCY_TAGS: Record<string, string> = {
  'chaos': 'Chaos Orb',
  'divine': 'Divine Orb',
  'exalted': 'Exalted Orb',
  'exa': 'Exalted Orb',
  'mirror': 'Mirror of Kalandra',
  'mirror-shard': 'Mirror Shard',
  'alch': 'Orb of Alchemy',
  'alt': 'Orb of Alteration',
  'fusing': 'Orb of Fusing',
  'chrome': 'Chromatic Orb',
  'jewellers': "Jeweller's Orb",
  'jew': "Jeweller's Orb",
  'chance': 'Orb of Chance',
  'scour': 'Orb of Scouring',
  'regal': 'Regal Orb',
  'vaal': 'Vaal Orb',
  'gcp': "Gemcutter's Prism",
  'regret': 'Orb of Regret',
  'blessed': 'Blessed Orb',
  'annul': 'Orb of Annulment',
  'ancient-orb': 'Ancient Orb',
  'ancient': 'Ancient Orb',
  'orb-of-binding': 'Orb of Binding',
  'orb-of-horizons': 'Orb of Horizons',
  'harbingers-orb': "Harbinger's Orb",
  'awakened-sextant': 'Awakened Sextant',
  'wisdom': 'Scroll of Wisdom',
  'portal': 'Portal Scroll',
  'transmute': 'Orb of Transmutation',
  'aug': 'Orb of Augmentation',
  'stacked-deck': 'Stacked Deck',
  'veiled-chaos-orb': 'Veiled Chaos Orb'
}

export function currencyName (tag: string): string {
  const t = tag.trim()
  return CURRENCY_TAGS[t.toLowerCase()] ?? t
}

// "120 divine", "1.5 divine", "1450 Chaos Orb".
export function parsePrice (text: string): TradePrice | null {
  const m = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(text.trim())
  if (!m) return null
  const amount = Number(m[1].replace(',', '.'))
  if (!Number.isFinite(amount)) return null
  return { amount, currency: currencyName(m[2]) }
}

// "10 Divine Orb" → 10 × Divine Orb. Without a leading number: 1.
function splitQty (text: string): { qty: number, item: string } {
  const m = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(text.trim())
  if (!m) return { qty: 1, item: text.trim() }
  return { qty: Number(m[1].replace(',', '.')), item: m[2] }
}

// Item names can hold " in " ("A Note in the Wind"), so the priced forms take
// the item up to " listed for", and the unpriced ones up to the last " in ".
const SINGLE_RES = [
  /^Hi, I would like to buy your (?<item>.+?) listed for (?<price>.+?) in (?<league>.+?) \(stash tab "(?<tab>.*)"; position: left (?<left>\d+), top (?<top>\d+)\)(?<note>.*)$/,
  /^Hi, I would like to buy your (?<item>.+) in (?<league>.+?) \(stash tab "(?<tab>.*)"; position: left (?<left>\d+), top (?<top>\d+)\)(?<note>.*)$/
]
const SINGLE_NO_TAB_RES = [
  /^Hi, I would like to buy your (?<item>.+?) listed for (?<price>.+?)(?: in (?<league>[^()]+?))?\.?$/,
  /^Hi, I would like to buy your (?<item>.+) in (?<league>[^()]+?)\.?$/,
  /^Hi, I would like to buy your (?<item>.+?)\.?$/
]
const BULK_RE = /^Hi, I'd like to buy your (?<item>.+?) for my (?<price>.+?) in (?<league>.+?)\.(?<note>.*)$/

export function parseOffer (body: string): TradeOffer | null {
  let m = SINGLE_RES[0].exec(body) ?? SINGLE_RES[1].exec(body)
  if (m?.groups) {
    const g = m.groups
    return {
      item: g.item,
      qty: 1,
      price: g.price ? parsePrice(g.price) : null,
      league: g.league,
      tab: { name: g.tab, left: Number(g.left), top: Number(g.top) },
      note: g.note.trim(),
      bulk: false
    }
  }
  m = BULK_RE.exec(body)
  if (m?.groups) {
    const g = m.groups
    const { qty, item } = splitQty(g.item)
    return { item, qty, price: parsePrice(g.price), league: g.league, tab: null, note: g.note.trim(), bulk: true }
  }
  // Listings in a public tab without a position (older format, some items).
  m = SINGLE_NO_TAB_RES[0].exec(body) ?? SINGLE_NO_TAB_RES[1].exec(body) ?? SINGLE_NO_TAB_RES[2].exec(body)
  if (m?.groups) {
    const g = m.groups
    return { item: g.item, qty: 1, price: g.price ? parsePrice(g.price) : null, league: g.league ?? '', tab: null, note: '', bulk: false }
  }
  return null
}

const FROM_RE = /^@From (?:<(?<guild>.+?)> )?(?<who>[^:]+?): (?<body>.+)$/
const TO_RE = /^@To (?:<(?<guild>.+?)> )?(?<who>[^:]+?): (?<body>.+)$/
const JOINED_RE = /^: (?<who>\S+) has joined the area\.$/
const LEFT_RE = /^: (?<who>\S+) has left the area\.$/
const ENTERED_RE = /^: You have entered .+$/

// Other client languages: APT's chat parser knows every language's whisper
// and trade site formats.
function localizedWhisper (line: string, at: number, language: string): TradeEvent | null {
  let entry: LogEntry | null
  try { entry = parseChatLine(line, language) } catch { return null }
  if (!entry?.charName) return null
  const channel = entry.сhannel as string
  if (channel !== 'whisper.from' && channel !== 'whisper.to') return null
  const t = entry.trade
  const offer: TradeOffer | null = t
    ? {
        item: t.item.name,
        qty: t.item.amount ?? 1,
        price: Number.isFinite(t.price.amount) ? { amount: t.price.amount, currency: currencyName(t.price.name) } : null,
        league: '',
        tab: t.tab ?? null,
        note: '',
        bulk: t.item.amount != null
      }
    : parseOffer(entry.body)
  return { kind: channel === 'whisper.from' ? 'whisper-in' : 'whisper-out', at, who: entry.charName, body: entry.body, offer }
}

// `language`: the game client's (Settings → Game), for whispers in other languages.
export function parseTradeLine (line: string, fallbackAt = Date.now(), language = 'en'): TradeEvent | null {
  const cut = line.indexOf('] ')
  if (cut < 0) return null
  const text = line.slice(cut + 2).trimEnd()
  const at = lineTime(line) ?? fallbackAt
  let m: RegExpExecArray | null
  if (text.startsWith('@')) {
    if ((m = FROM_RE.exec(text))) {
      const body = m.groups!.body
      return { kind: 'whisper-in', at, who: m.groups!.who, body, offer: parseOffer(body) }
    }
    if ((m = TO_RE.exec(text))) {
      const body = m.groups!.body
      return { kind: 'whisper-out', at, who: m.groups!.who, body, offer: parseOffer(body) }
    }
    return localizedWhisper(line, at, language)
  }
  if (!text.startsWith(': ')) return null
  if ((m = JOINED_RE.exec(text))) return { kind: 'joined', at, who: m.groups!.who }
  if ((m = LEFT_RE.exec(text))) return { kind: 'left', at, who: m.groups!.who }
  if (ENTERED_RE.test(text)) return { kind: 'entered', at }
  if (text === ': Trade accepted.') return { kind: 'trade-accepted', at }
  if (text === ': Trade cancelled.') return { kind: 'trade-cancelled', at }
  if (text === ': That character is not online.') return { kind: 'offline', at }
  if (text.startsWith(': AFK mode is now ON')) return { kind: 'afk', at, on: true }
  if (text.startsWith(': AFK mode is now OFF')) return { kind: 'afk', at, on: false }
  return null
}

// What the offer is for, short: "Headhunter Leather Belt", "10 × Divine Orb".
export function offerLabel (o: { item: string, qty: number, bulk: boolean }): string {
  return o.bulk && o.qty !== 1 ? `${o.qty} × ${o.item}` : o.item
}

export function priceLabel (p: TradePrice | null): string {
  if (!p) return 'no price'
  const short = Object.entries(CURRENCY_TAGS).find(([, name]) => name === p.currency)
  const unit = p.currency === 'Divine Orb' ? 'div' : p.currency === 'Chaos Orb' ? 'c' : short ? short[0] : p.currency
  return `${+p.amount.toFixed(2)} ${unit}`
}

// Names to look a single item's art up by, longest first: whispers name a
// unique with its base ("Doedre's Damning, Paua Ring") and a gem with its level.
export function artNames (item: string): string[] {
  const words = item.replace(/^level \d+ \d+% /, '').replace(/,/g, '').split(' ')
  const out: string[] = []
  for (let n = words.length; n >= 1 && n >= words.length - 3; n--) out.push(words.slice(0, n).join(' '))
  return out
}
