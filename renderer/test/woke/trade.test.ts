// Trades: reading trade whispers from Client.txt, following offers
// through invite → trade → thanks → kick, and the reply texts it types.
// Driven by testing/fixtures/client-logs/trade-hideout.txt.
import { describe, it, expect } from 'vitest'
import { fixture } from '../helpers/game-data'
import fs from 'fs'
import path from 'path'
import { artNames, CURRENCY_TAGS, parseOffer, parsePrice, parseTradeLine, offerLabel, priceLabel } from '@/web/woke/trade/whispers'
import { alreadyClosed, applyEvent, belongsInHistory, dismiss, front, markSent, markTraded, newBook, nextStep, prune, queue, recordFor, reopen, skip, OPEN_FOR_MS } from '@/web/woke/trade/book'
import type { Offer, TradeBook } from '@/web/woke/trade/book'
import { DEFAULT_REPLIES, fillReply, replyText } from '@/web/woke/trade/widget'
import { bulkDelta, priceChaos } from '@/web/woke/trade/value'
import { tradeTotals } from '@/web/woke/trade/log-store'

function logLines (name: string): string[] {
  return fixture(`client-logs/${name}`).split('\n').filter(l => l && !l.startsWith('#'))
}

function replay (lines: string[], book = newBook()) {
  const finished: Offer[] = []
  const added: Offer[] = []
  for (const line of lines) {
    const ev = parseTradeLine(line)
    if (!ev) continue
    const res = applyEvent(book, ev)
    if (res.finished) finished.push(res.finished)
    if (res.added) added.push(res.added)
  }
  return { book, finished, added }
}

describe('trade whispers', () => {
  it('reads a trade site whisper with price, league and stash spot', () => {
    const o = parseOffer('Hi, I would like to buy your Headhunter Leather Belt listed for 120 divine in Settlers (stash tab "Sale"; position: left 3, top 5)')
    expect(o).toEqual({
      item: 'Headhunter Leather Belt',
      qty: 1,
      price: { amount: 120, currency: 'Divine Orb' },
      league: 'Settlers',
      tab: { name: 'Sale', left: 3, top: 5 },
      note: '',
      bulk: false
    })
  })

  it('keeps what the buyer typed after the generated text', () => {
    const o = parseOffer('Hi, I would like to buy your Tabula Rasa Simple Robe listed for 5 chaos in Settlers (stash tab "~b/o 5 chaos"; position: left 12, top 1) can you do 4?')
    expect(o?.note).toBe('can you do 4?')
    expect(o?.tab).toEqual({ name: '~b/o 5 chaos', left: 12, top: 1 })
  })

  it('reads unpriced and private league listings', () => {
    const o = parseOffer('Hi, I would like to buy your Watcher\'s Eye Prismatic Jewel in Settlers (PL1234) (stash tab "Jewels"; position: left 2, top 9)')
    expect(o?.price).toBeNull()
    expect(o?.league).toBe('Settlers (PL1234)')
    expect(o?.item).toBe('Watcher\'s Eye Prismatic Jewel')
  })

  it('reads bulk (currency exchange) whispers', () => {
    const o = parseOffer("Hi, I'd like to buy your 10 Divine Orb for my 1450 Chaos Orb in Settlers.")
    expect(o).toMatchObject({ item: 'Divine Orb', qty: 10, price: { amount: 1450, currency: 'Chaos Orb' }, bulk: true, tab: null })
    expect(offerLabel(o!)).toBe('10 × Divine Orb')
  })

  it('reads a whisper without the stash part (older format)', () => {
    const o = parseOffer('Hi, I would like to buy your Tabula Rasa listed for 5 chaos')
    expect(o).toMatchObject({ item: 'Tabula Rasa', price: { amount: 5, currency: 'Chaos Orb' }, tab: null })
  })

  it('turns trade site tags into item names', () => {
    expect(parsePrice('1.5 divine')).toEqual({ amount: 1.5, currency: 'Divine Orb' })
    expect(parsePrice('3 exalted')).toEqual({ amount: 3, currency: 'Exalted Orb' })
    expect(parsePrice('40 Orb of Alchemy')).toEqual({ amount: 40, currency: 'Orb of Alchemy' })
    expect(priceLabel({ amount: 120, currency: 'Divine Orb' })).toBe('120 div')
    expect(priceLabel({ amount: 40, currency: 'Orb of Alchemy' })).toBe('40 alch')
  })

  it('ignores chat that is not a trade', () => {
    expect(parseTradeLine('2026/11/04 21:40:33 400727000 cff94598 [INFO Client 21088] #Spammer: WTS cheap carries pm')).toBeNull()
    const plain = parseTradeLine('2026/11/04 21:40:52 400746000 cff94598 [INFO Client 21088] @From Friend: you on?')
    expect(plain).toMatchObject({ kind: 'whisper-in', who: 'Friend', offer: null })
  })

  it('reads system lines: joined, left, trade accepted, not online, AFK', () => {
    const p = (t: string) => parseTradeLine(`2026/11/04 21:41:02 1 2 [INFO Client 21088] ${t}`)
    expect(p(': Kaltenhalt has joined the area.')).toMatchObject({ kind: 'joined', who: 'Kaltenhalt' })
    expect(p(': Kaltenhalt has left the area.')).toMatchObject({ kind: 'left', who: 'Kaltenhalt' })
    expect(p(': Trade accepted.')).toMatchObject({ kind: 'trade-accepted' })
    expect(p(': That character is not online.')).toMatchObject({ kind: 'offline' })
    expect(p(': AFK mode is now ON. Autoreply "brb"')).toMatchObject({ kind: 'afk', on: true })
  })
})

describe('currency tags', () => {
  // The trade site writes prices with its currency tags ("listed for 40
  // jewellers"); APT's item data has the same tags.
  it('knows the trade site tag of every currency it names', () => {
    const tags = new Map<string, string>()
    for (const line of fs.readFileSync(path.join(__dirname, '../../public/data/en/items.ndjson'), 'utf8').split('\n')) {
      if (!line.includes('"tradeTag"')) continue
      const item = JSON.parse(line) as { name: string, tradeTag: string }
      tags.set(item.name, item.tradeTag)
    }
    const wrong = [...new Set(Object.values(CURRENCY_TAGS))]
      .filter(name => tags.has(name) && CURRENCY_TAGS[tags.get(name)!] !== name)
      .map(name => `${name}: the site writes "${tags.get(name)}"`)
    expect(wrong).toEqual([])
    expect(parsePrice('40 jewellers')).toEqual({ amount: 40, currency: "Jeweller's Orb" })
    expect(priceLabel({ amount: 40, currency: "Jeweller's Orb" })).toBe('40 jewellers')
  })
})

describe('offer tracking', () => {
  it('follows a hideout session: repeat whisper, buyer joins, trade, buyer leaves', () => {
    const { book, finished, added } = replay(logLines('trade-hideout.txt'))
    // Three offers: Headhunter (whispered twice), the bulk buy, and our own purchase.
    expect(added.map(o => `${o.dir}:${o.who}`)).toEqual(['sell:Kaltenhalt', 'sell:xXLeagueStartXx', 'buy:Ozzy_Seller'])
    const hh = book.offers.find(o => o.who === 'Kaltenhalt')!
    expect(hh.repeats).toBe(1)
    expect(hh.traded).toBe(true)
    // Left after trading: done.
    expect(hh.closed).toBe('done')
    expect(finished.map(o => o.item)).toEqual(['Headhunter Leather Belt'])
    expect(book.afk).toBe(true)
    // What the keys act on next: the bulk buyer, then our purchase.
    expect(queue(book).map(o => o.who)).toEqual(['xXLeagueStartXx', 'Ozzy_Seller'])
  })

  it('walks the steps one key press at a time and closes after the kick', () => {
    const book = newBook()
    const at = Date.UTC(2026, 10, 4, 21, 40)
    const line = (t: string, s = 0) => `${new Date(at + s * 1000).toISOString().slice(0, 19).replace('T', ' ').replace(/-/g, '/')} 1 2 [INFO Client 1] ${t}`
    replay([line('@From Buyer: Hi, I would like to buy your Tabula Rasa Simple Robe listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)')], book)
    const o = front(book)!
    expect(nextStep(o)).toBe('invite')
    expect(replyText(DEFAULT_REPLIES, o, 'invite')).toBe('/invite Buyer')
    markSent(book, o, 'invite', at + 5000)
    expect(nextStep(o)).toBe('trade')
    replay([line(': Buyer has joined the area.', 20)], book)
    expect(o.inArea).toBe(true)
    expect(replyText(DEFAULT_REPLIES, o, 'trade')).toBe('/tradewith Buyer')
    markSent(book, o, 'trade', at + 25_000)
    const { finished } = replay([line(': Trade accepted.', 40)], book)
    expect(finished).toEqual([o])
    // Traded: the key moves on to thanks.
    expect(nextStep(o)).toBe('thanks')
    expect(replyText(DEFAULT_REPLIES, o, 'thanks')).toBe('@Buyer Thanks, have fun!')
    markSent(book, o, 'thanks', at + 45_000)
    expect(nextStep(o)).toBe('kick')
    markSent(book, o, 'kick', at + 50_000)
    expect(o.closed).toBe('done')
    expect(front(book)).toBeNull()
  })

  it('joining counts as invited, so the key goes straight to trade', () => {
    const book = newBook()
    replay([
      '2026/11/04 21:40:11 1 2 [INFO Client 1] @From Buyer: Hi, I would like to buy your Tabula Rasa listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)',
      '2026/11/04 21:40:30 1 2 [INFO Client 1] : Buyer has joined the area.'
    ], book)
    expect(nextStep(front(book)!)).toBe('trade')
  })

  it('a buyer in your hideout goes to the front of the queue', () => {
    const book = newBook()
    replay([
      '2026/11/04 21:40:11 1 2 [INFO Client 1] @From First: Hi, I would like to buy your A listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)',
      '2026/11/04 21:40:12 1 2 [INFO Client 1] @From Second: Hi, I would like to buy your B listed for 5 chaos in Settlers (stash tab "S"; position: left 2, top 1)',
      '2026/11/04 21:40:30 1 2 [INFO Client 1] : Second has joined the area.'
    ], book)
    expect(front(book)!.who).toBe('Second')
  })

  it('skip moves the top offer behind the others', () => {
    const book = newBook()
    replay([
      '2026/11/04 21:40:11 1 2 [INFO Client 1] @From First: Hi, I would like to buy your A listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)',
      '2026/11/04 21:40:12 1 2 [INFO Client 1] @From Second: Hi, I would like to buy your B listed for 5 chaos in Settlers (stash tab "S"; position: left 2, top 1)'
    ], book)
    skip(front(book)!, Date.now())
    expect(front(book)!.who).toBe('Second')
  })

  it('"Trade accepted" with nobody in the area goes to the purchase you just made', () => {
    const book: TradeBook = newBook()
    const { finished } = replay([
      '2026/11/04 21:45:00 1 2 [INFO Client 1] @To Seller: Hi, I would like to buy your Mageblood Heavy Belt listed for 310 divine in Settlers (stash tab "x"; position: left 1, top 1)',
      '2026/11/04 21:46:00 1 2 [INFO Client 1] : Trade accepted.'
    ], book)
    expect(finished.map(o => `${o.dir}:${o.item}`)).toEqual(['buy:Mageblood Heavy Belt'])
  })

  it('"That character is not online" marks the player you just whispered', () => {
    const book = newBook()
    replay([
      '2026/11/04 21:45:00 1 2 [INFO Client 1] @To Seller: Hi, I would like to buy your Mageblood Heavy Belt listed for 310 divine in Settlers (stash tab "x"; position: left 1, top 1)',
      '2026/11/04 21:45:02 1 2 [INFO Client 1] : That character is not online.'
    ], book)
    expect(book.offers[0].offline).toBe(true)
  })

  it('a plain whisper from a buyer sticks to their offer', () => {
    const { book } = replay([
      '2026/11/04 21:40:11 1 2 [INFO Client 1] @From Buyer: Hi, I would like to buy your A listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)',
      '2026/11/04 21:40:20 1 2 [INFO Client 1] @From Buyer: 4c?'
    ])
    expect(book.offers[0].messages).toEqual(['4c?'])
  })

  it('offers nobody touches expire, and closed ones drop off', () => {
    const { book } = replay(['2026/11/04 21:40:11 1 2 [INFO Client 1] @From Buyer: Hi, I would like to buy your A listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)'])
    const o = book.offers[0]
    prune(book, o.lastAt + OPEN_FOR_MS + 1)
    expect(o.closed).toBe('expired')
    prune(book, o.lastAt + OPEN_FOR_MS + 120_000)
    expect(book.offers).toEqual([])
  })

  it('marking a trade by hand logs it once', () => {
    const { book } = replay(['2026/11/04 21:40:11 1 2 [INFO Client 1] @From Buyer: Hi, I would like to buy your A listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)'])
    const o = book.offers[0]
    expect(markTraded(o, Date.now())).toBe(o)
    expect(markTraded(o, Date.now())).toBeNull()
  })
})

describe('replies and values', () => {
  const offer = { who: 'Buyer', item: 'Divine Orb', qty: 10, bulk: true, price: { amount: 1450, currency: 'Chaos Orb' } }

  it('fills {who}, {item} and {price}', () => {
    expect(fillReply('@{who} Still want {item} for {price}?', offer)).toBe('@Buyer Still want 10 × Divine Orb for 1450 c?')
  })

  it('an empty reply turns that button off', () => {
    const { book } = replay(['2026/11/04 21:40:11 1 2 [INFO Client 1] @From Buyer: Hi, I would like to buy your A listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)'])
    expect(replyText({ ...DEFAULT_REPLIES, busy: ' ' }, book.offers[0], 'busy')).toBeNull()
  })

  it('compares bulk offers with poe.ninja and values prices in chaos', () => {
    const px = { price: (n: string) => n === 'Divine Orb' ? 160 : null }
    // 1450c for 10 div worth 1600c: 9% under.
    expect(bulkDelta(offer, px)).toBeCloseTo(-0.094, 2)
    expect(priceChaos({ amount: 2, currency: 'Divine Orb' }, px)).toBe(320)
    expect(priceChaos({ amount: 2, currency: 'Mirror of Kalandra' }, px)).toBeNull()
  })

  it('log records have a stable id, so a replay after a restart does not log twice', () => {
    const { finished } = replay(logLines('trade-hideout.txt'))
    const again = replay(logLines('trade-hideout.txt')).finished
    expect(recordFor(finished[0], 1_700_000_000_000, 1, 1).id).toBe(recordFor(again[0], 1_700_000_000_000, 1, 1).id)
  })

  it('totals sales and purchases', () => {
    const t = tradeTotals([
      { id: 'a', dir: 'sell', who: 'x', item: 'A', qty: 1, price: null, chaos: 100, divine: 160, league: 'L', at: 1 },
      { id: 'b', dir: 'buy', who: 'y', item: 'B', qty: 1, price: null, chaos: 40, divine: 160, league: 'L', at: 2 },
      { id: 'c', dir: 'sell', who: 'z', item: 'C', qty: 1, price: null, chaos: null, divine: 160, league: 'L', at: 3 }
    ])
    expect(t).toEqual({ sold: 100, spent: 40, sales: 2, buys: 1, unpriced: 1 })
  })
})

describe('item names and repeat whispers', () => {
  const tab = '(stash tab "S"; position: left 1, top 1)'

  it('reads a priced item with " in " in its name', () => {
    const o = parseOffer(`Hi, I would like to buy your A Note in the Wind listed for 5 chaos in Settlers ${tab}`)!
    expect(o).toMatchObject({ item: 'A Note in the Wind', league: 'Settlers', price: { amount: 5, currency: 'Chaos Orb' } })
  })

  it('reads an unpriced item with " in " in its name', () => {
    const o = parseOffer(`Hi, I would like to buy your A Note in the Wind in Settlers ${tab}`)!
    expect(o).toMatchObject({ item: 'A Note in the Wind', league: 'Settlers', price: null })
  })

  it('reads the same item without a stash tab', () => {
    expect(parseOffer('Hi, I would like to buy your A Note in the Wind listed for 5 chaos in Settlers.')).toMatchObject({ item: 'A Note in the Wind', league: 'Settlers', tab: null })
    expect(parseOffer('Hi, I would like to buy your A Note in the Wind in Settlers.')).toMatchObject({ item: 'A Note in the Wind', league: 'Settlers', price: null })
    expect(parseOffer('Hi, I would like to buy your Tabula Rasa')).toMatchObject({ item: 'Tabula Rasa', league: '', price: null })
  })

  it('a repeat whisper at a new price replaces the old price', () => {
    const book = newBook()
    replay([
      `2026/11/04 21:40:11 1 2 [INFO Client 1] @From Buyer: Hi, I would like to buy your Tabula Rasa Simple Robe listed for 5 chaos in Settlers ${tab}`,
      '2026/11/04 21:40:30 1 2 [INFO Client 1] @From Buyer: Hi, I would like to buy your Tabula Rasa Simple Robe listed for 8 chaos in Settlers (stash tab "T"; position: left 2, top 3) hello'
    ], book)
    expect(book.offers).toHaveLength(1)
    expect(book.offers[0]).toMatchObject({ repeats: 1, price: { amount: 8 }, tab: { name: 'T', left: 2, top: 3 }, note: 'hello' })
  })
})

describe('skipping an offer', () => {
  const whisper = (who: string) => `2026/11/04 21:40:11 1 2 [INFO Client 1] @From ${who}: Hi, I would like to buy your ${who} Thing listed for 5 chaos in Settlers (stash tab "S"; position: left 1, top 1)`

  it('moves a buyer in your area behind one who is not', () => {
    const book = newBook()
    replay([whisper('Here'), whisper('Away'), '2026/11/04 21:40:12 1 2 [INFO Client 1] : Here has joined the area.'], book)
    expect(front(book)!.who).toBe('Here')
    skip(front(book)!, Date.now())
    expect(front(book)!.who).toBe('Away')
  })

  it('ends when the buyer joins your area', () => {
    const book = newBook()
    replay([whisper('First'), whisper('Second')], book)
    skip(front(book)!, Date.now())
    expect(front(book)!.who).toBe('Second')
    replay(['2026/11/04 21:40:20 1 2 [INFO Client 1] : First has joined the area.'], book)
    expect(front(book)!.who).toBe('First')
  })

  it('ends when the buyer writes again', () => {
    const book = newBook()
    replay([whisper('First'), whisper('Second')], book)
    skip(front(book)!, Date.now())
    replay(['2026/11/04 21:40:20 1 2 [INFO Client 1] @From First: still there?'], book)
    expect(front(book)!.who).toBe('First')
  })
})

describe('reopening closed offers', () => {
  const whisper = (book: TradeBook, who: string, at: number) => applyEvent(book, {
    kind: 'whisper-in',
    at,
    who,
    body: 'x',
    offer: { item: "Doedre's Damning, Paua Ring", qty: 1, bulk: false, price: { amount: 10, currency: 'Chaos Orb' }, league: 'Standard', tab: null, note: '' }
  }).added!

  it('puts a dismissed offer back at the step it reached', () => {
    const book = newBook()
    const o = whisper(book, 'Ignithor', 1000)
    markSent(book, o, 'invite', 2000)
    dismiss(o, 3000)
    expect(queue(book)).toEqual([])
    expect(belongsInHistory(o)).toBe(true)
    const open = reopen(book, o, 4000)
    expect(queue(book)[0].id).toBe(o.id)
    expect(open.step).toBe(1)
    expect(open.closed).toBe(null)
  })

  it('brings an offer back from the history alone, and it does not expire at once', () => {
    const book = newBook()
    const old = whisper(book, 'Ignithor', 1000)
    dismiss(old, 2000)
    const saved = JSON.parse(JSON.stringify(old))
    prune(book, 2000 + 200_000)
    expect(book.offers).toEqual([])
    const at = 10 * OPEN_FOR_MS
    reopen(book, saved, at)
    prune(book, at + 1000)
    expect(queue(book).map(o => o.who)).toEqual(['Ignithor'])
  })

  it('does not make a second copy when they already whispered again', () => {
    const book = newBook()
    const old = whisper(book, 'Ignithor', 1000)
    dismiss(old, 2000)
    const again = whisper(book, 'Ignithor', 3000)
    expect(reopen(book, old, 4000).id).toBe(again.id)
    expect(queue(book).length).toBe(1)
  })

  it('gives an offer closed past its last step something for the key to do', () => {
    const book = newBook()
    const o = whisper(book, 'Ignithor', 1000)
    markSent(book, o, 'kick', 2000)
    expect(o.closed).toBe('dismissed')
    expect(nextStep(reopen(book, o, 3000))).toBe('kick')
  })

  it('leaves traded offers to the sales log', () => {
    const book = newBook()
    const o = whisper(book, 'Ignithor', 1000)
    markTraded(o, 2000)
    expect(belongsInHistory(o)).toBe(false)
  })

  it('knows a replayed whisper was closed, but not a newer one', () => {
    const book = newBook()
    const o = whisper(book, 'Ignithor', 1000)
    dismiss(o, 2000)
    expect(alreadyClosed([o], { dir: 'sell', who: 'Ignithor', item: o.item, at: 1000 })).toBe(true)
    expect(alreadyClosed([o], { dir: 'sell', who: 'Ignithor', item: o.item, at: 3000 })).toBe(false)
    expect(alreadyClosed([o], { dir: 'sell', who: 'Someone', item: o.item, at: 1000 })).toBe(false)
  })
})

describe('item art names', () => {
  it('finds a unique named with a comma and its base', () => {
    expect(artNames("Doedre's Damning, Paua Ring")).toContain("Doedre's Damning")
  })
})
