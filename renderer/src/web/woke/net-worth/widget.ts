import type { ShortcutAction } from '@ipc/types'
import type { Widget, Anchor } from '@/web/overlay/widgets'

export const NET_WORTH_TYPE = 'woke-net-worth'
export const NET_WORTH_MODULE = 'net-worth'

export interface NetWorthWidget extends Widget {
  anchor: Anchor
  hotkey: string | null
  dockIcon: boolean
}

export function hotkeyTarget (wmId: number): string {
  return `${NET_WORTH_TYPE}:${wmId}`
}

export function parseHotkeyTarget (target: string): number | null {
  const m = /^woke-net-worth:(\d+)$/.exec(target)
  return m ? Number(m[1]) : null
}

// The hotkey also gives the overlay focus, so you can click right away.
export function netWorthShortcuts (widget: Widget): ShortcutAction[] {
  const key = (widget as NetWorthWidget).hotkey
  if (!key) return []
  return [{ shortcut: key, keepModKeys: true, action: { type: 'trigger-event', target: hotkeyTarget(widget.wmId), focusOverlay: true } }]
}

// What main reports about reading (main/src/woke/personal/stash-reader.ts).
export interface ReaderStatus {
  running: boolean
  progress: { done: number, total: number } | null
  league: string | null
  account: string | null
  lastReadAt: number | null
  waiting: number
  error: { kind: 'signed-out' | 'rate-limited' | 'failed', message: string, retryAt?: number } | null
}

export interface AuthStatus {
  signedIn: boolean
  account: string | null
}
