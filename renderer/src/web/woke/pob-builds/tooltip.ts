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
  tip.value = { content, anchor: (e.currentTarget as HTMLElement).getBoundingClientRect() }
}

export function hideTip () {
  tip.value = null
}
