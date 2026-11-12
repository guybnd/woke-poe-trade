import type { ShortcutAction } from '@ipc/types'
import type { Widget, Anchor } from '@/web/overlay/widgets'

export const NET_WORTH_TYPE = 'woke-net-worth'
export const NET_WORTH_MODULE = 'net-worth'

export interface NetWorthWidget extends Widget {
  anchor: Anchor
  hotkey: string | null
  dockIcon: boolean
  // "Hide < N div" and "Hide < N c" in the item table, each on or off. Defaults
  // 1 div and 10 c, both off. On a row's total, not each.
  hideBelowDiv?: number
  hideDivOn?: boolean
  hideBelowChaos?: number
  hideChaosOn?: boolean
  // A target on the chart, with an ETA at the current rate (D6).
  goal?: { name: string, div: number } | null
  // The item table's Each and Total columns: divines (d) or chaos (c).
  tableUnits?: { each: 'd' | 'c', total: 'd' | 'c' }
  // The summary's details and the tab row, open or folded (H1, T1).
  detailsOpen?: boolean
  tabsOpen?: boolean
  // Sections switched off in the ⚙ flyout or Settings.
  hiddenSections?: Section[]
}

export type Section = 'chart' | 'numbers' | 'moves' | 'changes' | 'where' | 'tabs'
export const SECTIONS: Array<{ id: Section, label: string }> = [
  { id: 'chart', label: 'Chart' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'moves', label: 'Price moves' },
  { id: 'changes', label: 'Since last refresh' },
  { id: 'where', label: 'Where it is' },
  { id: 'tabs', label: 'Tab labels' }
]
export const sectionOn = (w: NetWorthWidget, id: Section) => !w.hiddenSections?.includes(id)
export function setSection (w: NetWorthWidget, id: Section, on: boolean) {
  const rest = (w.hiddenSections ?? []).filter(s => s !== id)
  w.hiddenSections = on ? rest : [...rest, id]
}

export const hideBelowOf = (w: NetWorthWidget) => typeof w.hideBelowDiv === 'number' && w.hideBelowDiv >= 0 ? w.hideBelowDiv : 1
export const hideBelowChaosOf = (w: NetWorthWidget) => typeof w.hideBelowChaos === 'number' && w.hideBelowChaos >= 0 ? w.hideBelowChaos : 10

// The value floor in chaos: the higher of the chips that are on (the divine one
// only with a rate), and which one that is.
export function valueFloor (w: NetWorthWidget, divine: number | null): { minChaos: number, limiting: 'div' | 'chaos' | null } {
  const div = w.hideDivOn && divine ? hideBelowOf(w) * divine : null
  const chaos = w.hideChaosOn ? hideBelowChaosOf(w) : null
  if (div == null && chaos == null) return { minChaos: 0, limiting: null }
  if (chaos == null || (div != null && div >= chaos)) return { minChaos: div!, limiting: 'div' }
  return { minChaos: chaos, limiting: 'chaos' }
}

// A scroll step on a chip's number: small steps low down, bigger ones higher.
export function nudgeHide (value: number, by: 1 | -1, chaos: boolean): number {
  // Going down from 20 steps by 1, as going up to it did.
  const at = by < 0 ? value - 1e-9 : value
  const step = chaos ? (at < 20 ? 1 : at < 100 ? 5 : 25) : (at < 2 ? 0.5 : 1)
  const next = Math.round((value + by * step) / step) * step
  return Math.max(0, Number(next.toFixed(2)))
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
  // Remove-only tabs, always left out.
  skipped?: number
  // Tabs listed (remove-only aside) and how many are chosen (tab picker).
  listed?: number
  chosen?: number
  error: { kind: 'signed-out' | 'rate-limited' | 'failed' | 'pick-tabs', message: string, retryAt?: number } | null
}

export interface AuthStatus {
  signedIn: boolean
  account: string | null
}
