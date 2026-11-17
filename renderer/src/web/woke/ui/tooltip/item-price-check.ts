// Price checking an item: one path for every place that does it (the item
// menu's Price button, item rows, Search, build gear, the side window).
import type { BaseType } from '@/assets/data'
import { AppConfig } from '@/web/Config'
import { Host } from '@/web/background/IPC'
import { hideTip } from './tooltip'
import { infoOf, kindOf, priceCheckInput } from './item-menu-logic'
import type { ItemMenuRef, PriceCheckInput } from './item-menu-logic'

// `info`: the data item when the caller already knows it (a unique on one of
// several bases); otherwise it's looked up by name.
function resolve (ref: ItemMenuRef, info?: BaseType) {
  const kind = kindOf(ref)
  return { kind, info: info ?? infoOf(ref, kind), english: AppConfig().language === 'en' }
}

// Whether the item can be price checked by name at all.
export function canPriceCheck (ref: ItemMenuRef, info?: BaseType): boolean {
  const r = resolve(ref, info)
  return priceCheckInput(ref, r.kind, r.info, r.english) != null
}

// What the price check reads. A unique gets its mods as stat rows, once the
// tooltip data loads; without them it is priced by name.
export async function priceCheckRequest (ref: ItemMenuRef, info?: BaseType): Promise<PriceCheckInput | null> {
  const r = resolve(ref, info)
  if (!ref.text && r.kind === 'unique' && r.english && r.info) {
    try {
      const { loadUniqueMods } = await import('./item-tip')
      const withMods = priceCheckInput(ref, r.kind, r.info, r.english, await loadUniqueMods(r.info.refName, ref.variant))
      if (withMods) return withMods
    } catch {}
  }
  return priceCheckInput(ref, r.kind, r.info, r.english)
}

// ---- opening the price check ----

export interface ScreenPoint { x: number, y: number }

// Where the price check opens: at the cursor, or over the clicked control.
export function cursorPoint (e: MouseEvent): ScreenPoint {
  return { x: e.screenX, y: e.screenY }
}
export function elementPoint (e: MouseEvent): ScreenPoint {
  const from = (e.currentTarget as HTMLElement).getBoundingClientRect()
  return { x: window.screenX + from.x + from.width / 2, y: window.screenY + from.y + from.height / 2 }
}

// Hands the price check its input, as a game copy would.
export function dispatchPriceCheck (input: PriceCheckInput, position: ScreenPoint) {
  Host.selfDispatch({
    name: 'MAIN->CLIENT::item-text',
    payload: { clipboard: input.clipboard, item: input.item, position, focusOverlay: true, target: 'price-check' }
  })
}

// The one way to price check an item from a list, a menu or a build: by name
// (a unique gets its mods), or by its game text (`ref.text`). False when the
// item can't be price checked.
export async function openPriceCheck (ref: ItemMenuRef, at: ScreenPoint, info?: BaseType): Promise<boolean> {
  hideTip()
  const input = await priceCheckRequest(ref, info)
  if (!input) return false
  dispatchPriceCheck(input, at)
  return true
}
