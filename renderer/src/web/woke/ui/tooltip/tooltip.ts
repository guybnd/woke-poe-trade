// The one game-style tooltip, drawn by GameTooltip.vue (mounted once in the
// overlay). Screens use v-item-tip (item-tip.ts) from an item's name; the build
// panel passes its own gems and items.
import { shallowRef } from 'vue'
import type { PobItem } from '../../pob-builds/widget'
import type { ListingDetail } from '../../price-insight/listing-tip-detail'
import type { SwapResult } from '../../pob-builds/swap-check'
import type { TipModel } from './tip-content'

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
  // A trade listing also has its tiers, rolls and weapon stats.
  listing?: ListingDetail
}

// The market strip at the foot of a looked-up item.
export interface TipMarket {
  chaos: number
  // Which variant the price is for, when the caller didn't name one.
  variant?: string
  // Over the 7 days of the graph, as a ratio: 0.12 is +12%.
  change: number | null
  graph: number[]
  // How many the caller holds (a stack, a stash line): the strip adds their value.
  count?: number
  // A name with several prices: shown instead of the one price and its graph.
  range?: { low: number, high: number, count: number }
}

// One unique a base can drop as, for a base in a filter's unique tiers.
export interface TipBaseUnique {
  name: string
  chaos: number | null
  grade: 'high' | 'mid' | 'trash' | 'unknown'
  // Says what the price means: "worth it", "trash".
  label: string
  thin: boolean
}

export interface LookupTip {
  kind: 'lookup'
  model: TipModel
  market: TipMarket | null
  uniques?: TipBaseUnique[]
}

// A checked item against the one your build wears there.
export interface SwapTip {
  kind: 'swap'
  title: string
  // Where "Yours" came from: the game, or a PoB set.
  source?: string
  result: SwapResult
}

// A passive tree node, framed as the game frames its kind.
export interface PassiveTip {
  kind: 'passive'
  name: string
  stats: string[]
  frame: 'normal' | 'rare' | 'unique'
  note?: string
}

export type TipContent = GemTip | ItemTip | LookupTip | SwapTip | PassiveTip

export const tip = shallowRef<{ content: TipContent, anchor: DOMRect } | null>(null)

export function showTipAt (target: HTMLElement, content: TipContent) {
  tip.value = { content, anchor: target.getBoundingClientRect() }
}

export function showTip (e: Event, content: TipContent) {
  showTipAt(e.currentTarget as HTMLElement, content)
}

// A tooltip still on its way (item-tip.ts) must not appear after a hide: the
// overlay may have closed, and it would sit over the game.
let cancelPending: (() => void) | null = null
export function onTipHide (fn: () => void) {
  cancelPending = fn
}

export function hideTip () {
  cancelPending?.()
  tip.value = null
}

// A poe.ninja row as the price strip shows it: one's price, the change over
// its 7-day line (the last point is the % change over the whole line), and
// how many the caller holds.
export function marketFromRow (
  info: { chaos: number, variant?: string, graph?: Array<number | null> },
  ref: { variant?: string, count?: number }
): TipMarket {
  const graph = (info.graph ?? []).filter((v): v is number => v != null)
  return {
    chaos: info.chaos,
    variant: ref.variant ? undefined : info.variant,
    change: graph.length ? graph[graph.length - 1] / 100 : null,
    graph,
    count: ref.count && ref.count > 1 ? ref.count : undefined
  }
}
