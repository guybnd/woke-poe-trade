// Travel to an instant buyout seller's hideout, the trade site's own button.
//
// A signed-in /api/trade/fetch gives each instant buyout (merchant tab)
// listing a `hideout_token`: a JWT that expires about 5 minutes after the
// fetch. POST /api/trade/whisper { token } with it, and the game sends you to
// the seller's hideout. The site answers:
//   { success: true }   -> travelling
//   { success: false }  -> "item is in demand"; the site's next click adds
//                          continue: true, which travels anyway
//   { error: { code, message } } (also with HTTP 200) -> refused
// main/src/proxy.ts adds the Origin and Referer this endpoint wants.
import { shallowReactive } from 'vue'
import { Host } from '@/web/background/IPC'
import { getTradeEndpoint } from '@/web/price-check/trade/common'

export type TravelState =
  | { kind: 'sending' }
  | { kind: 'travelling' }
  | { kind: 'in-demand' }
  | { kind: 'expired' }
  | { kind: 'failed', reason: string }

// Seconds of margin before `exp`: the click, the request and a clock a little
// off from the site's.
const EXP_MARGIN_S = 10

// The token's `exp` in ms since the epoch, or null when it can't be read.
export function tokenExpiry (token: string): number | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(b64 + '='.repeat((4 - b64.length % 4) % 4))) as { exp?: unknown }
    return typeof json.exp === 'number' ? json.exp * 1000 : null
  } catch {
    return null
  }
}

export function tokenExpired (token: string, now = Date.now()): boolean {
  const exp = tokenExpiry(token)
  // Unreadable: let the site decide.
  return exp != null && now > exp - EXP_MARGIN_S * 1000
}

// Per token, not per listing: a listing keeps its id across searches, but each
// fetch gives it a new token, so a fresh search starts clean.
export const travelStates = shallowReactive(new Map<string, TravelState>())

export function travelState (token: string | undefined): TravelState | undefined {
  return token ? travelStates.get(token) : undefined
}

export type WhisperReply = { success?: boolean, error?: { code?: number, message?: string } | null }

// What a reply means. `status` is the HTTP status, `body` the parsed JSON (or
// null when it wasn't JSON).
export function readReply (status: number, body: WhisperReply | null, retryAfterS: number | null): TravelState {
  if (body?.error) {
    const msg = body.error.message?.trim()
    return { kind: 'failed', reason: msg || `Trade site error ${body.error.code ?? status}` }
  }
  if (status === 429) {
    return { kind: 'failed', reason: retryAfterS ? `Too many requests: wait ${retryAfterS}s` : 'Too many requests: wait a moment' }
  }
  if (status < 200 || status >= 300) return { kind: 'failed', reason: `Trade site answered ${status}` }
  if (body?.success === true) return { kind: 'travelling' }
  if (body?.success === false) return { kind: 'in-demand' }
  return { kind: 'failed', reason: 'Unexpected answer from the trade site' }
}

// One request per call. A second click on an in-demand row sends continue.
// Once the site has said yes, further clicks send nothing.
export async function travelToHideout (token: string): Promise<void> {
  const prev = travelStates.get(token)
  if (prev?.kind === 'sending' || prev?.kind === 'travelling') return
  if (tokenExpired(token)) {
    travelStates.set(token, { kind: 'expired' })
    return
  }
  const body: { token: string, continue?: boolean } = { token }
  if (prev?.kind === 'in-demand') body.continue = true
  travelStates.set(token, { kind: 'sending' })
  try {
    const res = await Host.proxy(`${getTradeEndpoint()}/api/trade/whisper`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(body)
    })
    let json: WhisperReply | null = null
    try { json = await res.json() as WhisperReply } catch { json = null }
    const retry = Number(res.headers.get('retry-after'))
    travelStates.set(token, readReply(res.status, json, Number.isFinite(retry) && retry > 0 ? retry : null))
  } catch (e) {
    travelStates.set(token, { kind: 'failed', reason: e instanceof Error && e.message ? e.message : 'No answer from the trade site' })
  }
}

// The short line shown in the row's age cell, and its hover text.
export function travelNote (s: TravelState | undefined): { text: string, title: string, tone: 'ok' | 'warn' } | null {
  switch (s?.kind) {
    case 'sending': return { text: 'Sending…', title: 'Asking the trade site', tone: 'ok' }
    case 'travelling': return { text: 'Travelling…', title: 'The trade site accepted it: the game loads the hideout', tone: 'ok' }
    case 'in-demand': return { text: 'In demand: click again', title: 'Others are buying this item too. Click the door again to go anyway.', tone: 'warn' }
    case 'expired': return { text: 'Too old: search again', title: 'The travel pass lasts about 5 minutes after the search. Nothing was sent.', tone: 'warn' }
    case 'failed': return { text: s.reason, title: s.reason, tone: 'warn' }
    default: return null
  }
}
