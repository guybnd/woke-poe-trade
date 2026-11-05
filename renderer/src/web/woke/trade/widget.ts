// Trades: settings, reply texts and hotkey targets.
import type { Widget, Anchor } from '@/web/overlay/widgets'
import type { Offer, StepId } from './book'
import { offerLabel, priceLabel } from './whispers'

export const TRADE_TYPE = 'woke-trade'

export type ReplyId = StepId | 'busy' | 'sold' | 'still' | 'again'

export interface TradeReplies {
  invite: string
  trade: string
  thanks: string
  kick: string
  busy: string
  sold: string
  still: string
  hideout: string
  buyThanks: string
}

export const DEFAULT_REPLIES: TradeReplies = {
  invite: '/invite {who}',
  trade: '/tradewith {who}',
  thanks: '@{who} Thanks, have fun!',
  kick: '/kick {who}',
  busy: "@{who} Busy right now, I'll invite you in a minute.",
  sold: '@{who} Sorry, {item} is already sold.',
  still: '@{who} Still interested in {item} for {price}?',
  hideout: '/hideout {who}',
  buyThanks: '@{who} Thanks!'
}

export const REPLY_LABELS: Record<keyof TradeReplies, string> = {
  invite: 'Invite',
  trade: 'Trade',
  thanks: 'Thanks',
  kick: 'Kick',
  busy: 'Busy',
  sold: 'Sold',
  still: 'Still interested?',
  hideout: 'Visit hideout',
  buyThanks: 'Thanks (buying)'
}

// How closed offer rows look. 'hover': one line, next step button when the mouse
// is on it. 'button': one line, button always there. 'full': two lines, no button.
export type TradeRowStyle = 'hover' | 'button' | 'full'

export interface TradeWidget extends Widget {
  anchor: Anchor
  // One key: the next step for the offer in front (C1).
  stepHotkey: string | null
  busyHotkey: string | null
  skipHotkey: string | null
  replies: TradeReplies
  ping: boolean
  // Also follow trade whispers you send (E1).
  trackBuying: boolean
  tab: 'offers' | 'log'
  rowStyle?: TradeRowStyle
  // How long after the last trade activity the bubble and icon stay, in seconds.
  // 0: the bubble stays until no offers are open.
  bubbleSeconds?: number
}

export function hotkeyTarget (wmId: number, what: 'step' | 'busy' | 'skip'): string {
  return `woke-trade:${wmId}:${what}`
}

export function parseHotkeyTarget (target: string): { wmId: number, what: 'step' | 'busy' | 'skip' } | null {
  const m = /^woke-trade:(\d+):(step|busy|skip)$/.exec(target)
  return m ? { wmId: Number(m[1]), what: m[2] as 'step' | 'busy' | 'skip' } : null
}

// Template for a reply on this offer.
export function replyKey (o: Pick<Offer, 'dir'>, id: ReplyId): keyof TradeReplies | null {
  if (id === 'again') return null
  if (o.dir === 'buy' && id === 'thanks') return 'buyThanks'
  return id
}

// Fills {who}, {item} and {price}. Names can't hold spaces or braces, so a
// plain replace is safe.
export function fillReply (template: string, o: Pick<Offer, 'who' | 'item' | 'qty' | 'bulk' | 'price'>): string {
  return template
    .replace(/\{who\}/g, o.who)
    .replace(/\{item\}/g, offerLabel(o))
    .replace(/\{price\}/g, priceLabel(o.price))
}

// The chat line for a reply, or null if it's switched off (empty text).
export function replyText (replies: TradeReplies, o: Offer, id: ReplyId): string | null {
  if (id === 'again') return o.body ? `@${o.who} ${o.body}` : null
  const key = replyKey(o, id)
  const template = key ? (replies[key] ?? DEFAULT_REPLIES[key]) : ''
  if (!template.trim()) return null
  return fillReply(template, o)
}
