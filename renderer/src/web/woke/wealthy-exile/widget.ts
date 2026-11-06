import type { ShortcutAction } from '@ipc/types'
import type { Widget, Anchor } from '@/web/overlay/widgets'

export const WEALTHY_EXILE_TYPE = 'woke-wealthy-exile'

// Wealthy Exile tracks net worth from your stash. We can't read the stash
// ourselves yet, so this shows their site. Editable in settings in case it moves.
export const DEFAULT_SITE_URL = 'https://wealthyexile.com/'

export interface WealthyExileWidget extends Widget {
  anchor: Anchor
  url: string
  hotkey: string | null
  // An icon in the dock that opens the window (off by default).
  dockIcon: boolean
}

export function siteUrl (custom: string | undefined): string {
  const url = (custom ?? '').trim()
  return /^https:\/\//i.test(url) ? url : DEFAULT_SITE_URL
}

export function hotkeyTarget (wmId: number): string {
  return `${WEALTHY_EXILE_TYPE}:${wmId}`
}

export function parseHotkeyTarget (target: string): number | null {
  const m = /^woke-wealthy-exile:(\d+)$/.exec(target)
  return m ? Number(m[1]) : null
}

// The hotkey also gives the overlay focus, so you can click and scroll at once.
export function wealthyExileShortcuts (widget: WealthyExileWidget): ShortcutAction[] {
  if (!widget.hotkey) return []
  return [{ shortcut: widget.hotkey, keepModKeys: true, action: { type: 'trigger-event', target: hotkeyTarget(widget.wmId), focusOverlay: true } }]
}
