import { describe, it, expect, vi, beforeEach } from 'vitest'

const proxy = vi.fn()
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: (...a: unknown[]) => proxy(...a) } }))
vi.mock('@/web/price-check/trade/common', () => ({ getTradeEndpoint: () => 'www.pathofexile.com' }))

const { tokenExpiry, tokenExpired, readReply, travelToHideout, travelStates, travelState } = await import('@/web/woke/hideout-travel/travel')

// A same-shape stand-in for the site's JWT: only the payload is read.
function fakeToken (payload: object): string {
  const b64u = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${b64u({ alg: 'HS256' })}.${b64u(payload)}.sig`
}
const fresh = () => fakeToken({ exp: Math.floor(Date.now() / 1000) + 240 })
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

beforeEach(() => {
  proxy.mockReset()
  travelStates.clear()
})

describe('token expiry', () => {
  it('reads exp from the payload', () => {
    expect(tokenExpiry(fakeToken({ exp: 1700000000 }))).toBe(1700000000 * 1000)
  })
  it('is null for a token it cannot read', () => {
    expect(tokenExpiry('nope')).toBeNull()
    expect(tokenExpiry('a.%%%.c')).toBeNull()
    expect(tokenExpiry(fakeToken({ iat: 1 }))).toBeNull()
  })
  it('counts a token inside the margin as expired', () => {
    const exp = 1700000000
    expect(tokenExpired(fakeToken({ exp }), exp * 1000 - 20_000)).toBe(false)
    expect(tokenExpired(fakeToken({ exp }), exp * 1000 - 5_000)).toBe(true)
  })
  it('lets the site decide on an unreadable token', () => {
    expect(tokenExpired('nope')).toBe(false)
  })
})

describe('readReply', () => {
  it('maps the site answers', () => {
    expect(readReply(200, { success: true }, null)).toEqual({ kind: 'travelling' })
    expect(readReply(200, { success: false }, null)).toEqual({ kind: 'in-demand' })
    expect(readReply(200, { error: { code: 2, message: 'Resource not found' } }, null)).toEqual({ kind: 'failed', reason: 'Resource not found' })
    expect(readReply(400, { error: { code: 2 } }, null)).toEqual({ kind: 'failed', reason: 'Trade site error 2' })
    expect(readReply(429, null, 30)).toEqual({ kind: 'failed', reason: 'Too many requests: wait 30s' })
    expect(readReply(503, null, null)).toEqual({ kind: 'failed', reason: 'Trade site answered 503' })
    expect(readReply(200, {}, null).kind).toBe('failed')
  })
})

describe('travelToHideout', () => {
  it('posts the token once and records travelling', async () => {
    const token = fresh()
    proxy.mockResolvedValueOnce(json({ success: true }))
    await travelToHideout(token)
    expect(proxy).toHaveBeenCalledTimes(1)
    const [url, init] = proxy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('www.pathofexile.com/api/trade/whisper')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ token })
    expect((init.headers as Record<string, string>)['X-Requested-With']).toBe('XMLHttpRequest')
    expect(travelStates.get(token)).toEqual({ kind: 'travelling' })
  })

  it('sends continue on the click after in demand', async () => {
    const token = fresh()
    proxy.mockResolvedValueOnce(json({ success: false })).mockResolvedValueOnce(json({ success: true }))
    await travelToHideout(token)
    expect(travelStates.get(token)).toEqual({ kind: 'in-demand' })
    await travelToHideout(token)
    expect(JSON.parse((proxy.mock.calls[1][1] as RequestInit).body as string)).toEqual({ token, continue: true })
    expect(travelStates.get(token)).toEqual({ kind: 'travelling' })
  })

  it('sends nothing more once travelling', async () => {
    const token = fresh()
    proxy.mockResolvedValueOnce(json({ success: true }))
    await travelToHideout(token)
    await travelToHideout(token)
    expect(proxy).toHaveBeenCalledTimes(1)
  })

  it('starts clean for the same listing after a new search', async () => {
    const old = fakeToken({ exp: Math.floor(Date.now() / 1000) + 100 })
    proxy.mockResolvedValueOnce(json({ success: false })).mockResolvedValueOnce(json({ success: false }))
    await travelToHideout(old)
    const renewed = fresh()
    expect(travelState(renewed)).toBeUndefined()
    await travelToHideout(renewed)
    expect(JSON.parse((proxy.mock.calls[1][1] as RequestInit).body as string)).toEqual({ token: renewed })
  })

  it('sends nothing for an expired token', async () => {
    const token = fakeToken({ exp: Math.floor(Date.now() / 1000) - 1 })
    await travelToHideout(token)
    expect(proxy).not.toHaveBeenCalled()
    expect(travelStates.get(token)).toEqual({ kind: 'expired' })
  })

  it('ignores a second click while the first is in flight', async () => {
    let answer!: (r: Response) => void
    proxy.mockReturnValueOnce(new Promise<Response>(r => { answer = r }))
    const token = fresh()
    const first = travelToHideout(token)
    await travelToHideout(token)
    expect(proxy).toHaveBeenCalledTimes(1)
    answer(json({ success: true }))
    await first
    expect(travelStates.get(token)).toEqual({ kind: 'travelling' })
  })

  it('shows a network failure and a non-JSON answer', async () => {
    proxy.mockRejectedValueOnce(new Error('net::ERR_FAILED'))
    const token = fresh()
    await travelToHideout(token)
    expect(travelStates.get(token)).toEqual({ kind: 'failed', reason: 'net::ERR_FAILED' })
    proxy.mockResolvedValueOnce(new Response('<html>', { status: 403 }))
    const token2 = fakeToken({ exp: Math.floor(Date.now() / 1000) + 200 })
    await travelToHideout(token2)
    expect(travelStates.get(token2)).toEqual({ kind: 'failed', reason: 'Trade site answered 403' })
  })
})
