// The one tooltip the build panel shows, drawn by GameTooltip.vue.
import { shallowRef } from 'vue'
import type { PobItem } from './widget'

export interface GemTip {
  kind: 'gem'
  name: string
  level?: number | null
  quality?: number | null
  // Where to get it, shown at the bottom.
  note?: string
}

export interface ItemTip {
  kind: 'item'
  item: PobItem
}

export type TipContent = GemTip | ItemTip

export const tip = shallowRef<{ content: TipContent, anchor: DOMRect } | null>(null)

export function showTip (e: Event, content: TipContent) {
  const target = e.currentTarget as HTMLElement
  let anchor = target.getBoundingClientRect()
  // Items open beside their row: clear of the whole panel, not just the row.
  const panel = content.kind === 'item' ? target.closest('[data-w-panel]')?.getBoundingClientRect() : null
  if (panel) anchor = new DOMRect(panel.left, anchor.top, panel.width, anchor.height)
  tip.value = { content, anchor }
}

export function hideTip () {
  tip.value = null
}
