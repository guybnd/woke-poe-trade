// Your sales from pathofexile.com's trade history (main/src/woke/personal/
// trade-history.ts): the reply parser, the merge, and how often it calls. No
// live calls.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { AUTO_EVERY_MS, MANUAL_GAP_MS, TradeHistory, mergeSales, parseHistory, parseSale } from '../../main/src/woke/personal/trade-history'
import type { Sale } from '../../main/src/woke/personal/trade-history'
import type { HttpReply } from '../../main/src/woke/personal/stash-reader'

const entry = (id: string, time: string, item: Record<string, unknown>, amount = 10, currency = 'chaos') =>
  ({ time, item_id: id, item, price: { amount, currency } })

const REPLY = JSON.stringify({
  result: [
    entry('a', '2026-11-21T10:07:21+00:00', { name: '', typeLine: 'Empower Support', baseType: 'Empower Support', frameType: 4, icon: 'i.png', properties: [{ name: 'Level', values: [['4', 0]] }, { name: 'Quality', values: [['+20%', 1]] }] }, 44),
    entry('b', '2026-11-20T09:00:00+00:00', { name: '<<set:MS>><<set:M>><<set:S>>Headhunter', typeLine: 'Leather Belt', frameType: 3, icon: 'h.png', corrupted: true }, 38, 'divine'),
    entry('c', '2026-11-19T09:00:00+00:00', { typeLine: "Maven's Writ", frameType: 0, stackSize: 12 }, 14, 'divine'),
    { time: 'nope', item_id: 'd', item: {}, price: { amount: 1, currency: 'chaos' } },
    entry('e', '2026-11-19T09:00:00+00:00', { typeLine: 'Free' }, 0)
  ]
})

const LIMITS = {
  'x-rate-limit-rules': 'Account',
  'x-rate-limit-account': '5:60:60,10:600:120,15:10800:3600',
  'x-rate-limit-account-state': '1:60:0,1:600:0,1:10800:0'
}

let dir = ''
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-sales-')) })

function setup (replies: HttpReply[]) {
  let t = Date.parse('2026-11-21T12:00:00Z')
  const calls: string[] = []
  let signedOut = 0
  const th = new TradeHistory({
    fetch: async (url) => { calls.push(url); return replies.shift() ?? { status: 500, headers: {}, body: '' } },
    now: () => t,
    dir: () => dir,
    signedOut: () => { signedOut++ }
  })
  return { th, calls, advance: (ms: number) => { t += ms }, signedOut: () => signedOut }
}

const ok = (body = REPLY): HttpReply => ({ status: 200, headers: LIMITS, body })

describe('parse', () => {
  it('reads each sale, cleaning names and reading gem level and quality', () => {
    const list = parseHistory(REPLY)!
    expect(list.map(s => s.id)).toEqual(['a', 'b', 'c'])
    expect(list[0]).toMatchObject({ typeLine: 'Empower Support', frameType: 4, gemLevel: 4, quality: 20, price: { amount: 44, currency: 'chaos' } })
    expect(list[1]).toMatchObject({ name: 'Headhunter', frameType: 3, corrupted: true, price: { amount: 38, currency: 'divine' } })
    expect(list[2]).toMatchObject({ stack: 12, baseType: "Maven's Writ" })
    expect(list[0].at).toBe(Date.parse('2026-11-21T10:07:21Z'))
  })

  it("keeps gear's mods for its tooltip, not a gem's or currency's", () => {
    const list = parseHistory(JSON.stringify({ result: [
      entry('r', '2026-11-21T10:00:00Z', {
        name: 'Vengeance Crown', typeLine: 'Prophet Crown', frameType: 2, rarity: 'Rare', icon: 'x.png', w: 2, h: 2, flavourText: ['x'],
        explicitMods: [{ description: '+80 to maximum Life', domain: 'item', mods: [{ name: 'Fecund', tier: 'S1', magnitudes: [{ min: 80, max: 89 }] }] }],
        properties: [{ name: 'Quality', type: 6, values: [['+20%', 1]] }, { name: 'Armour', type: 16, values: [['800', 1]] }],
        extended: { text: 'big', mods: {}, hashes: {} }
      }),
      entry('g', '2026-11-21T10:00:00Z', { typeLine: 'Empower Support', frameType: 4, explicitMods: ['x'] }),
      entry('w', '2026-11-21T10:00:00Z', { typeLine: 'Superior Leviathan Gauntlets', frameType: 0 })
    ] }))!
    expect(list[0].tip).toEqual({
      name: 'Vengeance Crown', typeLine: 'Prophet Crown', frameType: 2, rarity: 'Rare',
      explicitMods: [{ description: '+80 to maximum Life', domain: 'item' }],
      properties: [{ name: 'Quality', type: 6, values: [['+20%', 1]] }]
    })
    expect(list[1].tip).toBeUndefined()
    // No mods: the name's tooltip, nothing kept.
    expect(list[2].tip).toBeUndefined()
  })

  it('says null for a reply that is not trade history', () => {
    expect(parseHistory('<html>')).toBeNull()
    expect(parseHistory('{"error":{"code":2}}')).toBeNull()
    expect(parseSale(null)).toBeNull()
  })

  it('merges by id, newest first', () => {
    const s = (id: string, at: number) => ({ id, at } as Sale)
    expect(mergeSales([s('a', 1), s('b', 3)], [s('b', 3), s('c', 2)]).map(x => x.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('reads', () => {
  it('keeps every sale it has seen in a file per league', async () => {
    const { th } = setup([ok(), ok(JSON.stringify({ result: [entry('z', '2026-11-21T11:00:00Z', { typeLine: 'Divine Orb', frameType: 5 })] }))])
    const first = await th.read('Covens', 'manual')
    expect(first.sales).toHaveLength(3)
    expect(first.error).toBeNull()
    const again = await th.read('Covens', 'none')
    expect(again.sales).toHaveLength(3)
    expect(fs.readdirSync(dir)).toEqual(['Covens.json'])
  })

  it('a manual read within 5 minutes of the last answers from the file', async () => {
    const { th, calls, advance } = setup([ok(), ok()])
    await th.read('Covens', 'manual')
    advance(MANUAL_GAP_MS - 1000)
    await th.read('Covens', 'manual')
    expect(calls).toHaveLength(1)
  })

  it('a quiet read runs at most every 30 minutes', async () => {
    const { th, calls, advance } = setup([ok(), ok(), ok()])
    await th.read('Covens', 'auto')
    advance(10 * 60_000)
    await th.read('Covens', 'auto')
    expect(calls).toHaveLength(1)
    advance(AUTO_EVERY_MS)
    await th.read('Covens', 'auto')
    expect(calls).toHaveLength(2)
    expect(calls[0]).toBe('https://www.pathofexile.com/api/trade/history/Covens')
  })

  it('stays within half of each window the site reports', async () => {
    const { th, calls, advance } = setup(Array.from({ length: 20 }, () => ok()))
    for (let i = 0; i < 20; i++) {
      await th.read('Covens', 'manual')
      advance(MANUAL_GAP_MS + 1000)
    }
    // 10 in 10 minutes allowed: 5 used; 15 in 3 hours: 7.
    expect(calls.length).toBeLessThanOrEqual(7)
    const last = await th.read('Covens', 'manual')
    expect(last.error?.kind).toBe('rate-limited')
    expect(last.error?.retryAt).toBeGreaterThan(Date.parse('2026-11-21T12:00:00Z'))
  })

  it('a hideout right after a Refresh does not call again', async () => {
    const { th, calls, advance } = setup([ok(), ok()])
    await th.read('Covens', 'manual')
    advance(MANUAL_GAP_MS + 1000)
    await th.read('Covens', 'auto')
    expect(calls).toHaveLength(1)
  })

  it("a read under way for another league never answers this league's", async () => {
    let release: (r: HttpReply) => void = () => {}
    const t = Date.parse('2026-11-21T12:00:00Z')
    const th = new TradeHistory({ fetch: async () => await new Promise<HttpReply>(resolve => { release = resolve }), now: () => t, dir: () => dir })
    const a = th.read('Covens', 'manual')
    const b = await th.read('Standard', 'manual')
    expect(b.league).toBe('Standard')
    expect(b.sales).toEqual([])
    release(ok())
    expect((await a).league).toBe('Covens')
  })

  it('a 403 from this call is a failure, not a sign-out', async () => {
    const { th, signedOut } = setup([{ status: 403, headers: {}, body: '{"error":{"code":6,"message":"Forbidden"}}' }])
    const r = await th.read('Covens', 'manual')
    expect(r.error?.kind).toBe('failed')
    expect(signedOut()).toBe(0)
  })

  it('an item sold again is another sale', () => {
    const s = (at: number) => ({ id: 'a', at } as Sale)
    expect(mergeSales([s(1)], [s(2)])).toHaveLength(2)
  })

  it('signed out: says so and tells the reader', async () => {
    const { th, signedOut } = setup([{ status: 401, headers: {}, body: '' }])
    const r = await th.read('Covens', 'manual')
    expect(r.error?.kind).toBe('signed-out')
    expect(signedOut()).toBe(1)
  })

  it('a 429 is rate-limited, a 400 names the league', async () => {
    const a = setup([{ status: 429, headers: { 'retry-after': '120' }, body: '' }])
    expect((await a.th.read('Covens', 'manual')).error?.kind).toBe('rate-limited')
    const b = setup([{ status: 400, headers: {}, body: '{"error":{"code":2,"message":"Invalid query"}}' }])
    expect((await b.th.read('Nope', 'manual')).error?.message).toContain('Nope')
  })

  it('stopped: no more calls', async () => {
    const { th, calls } = setup([ok()])
    th.stop()
    await th.read('Covens', 'manual')
    expect(calls).toHaveLength(0)
  })
})
