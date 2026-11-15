import { shallowRef } from 'vue'
import type { Widget, Anchor } from '@/web/overlay/widgets'
import type { CorruptedFilter } from './types'
import type { MarketSort } from './browser'

export const MARKET_TRACKER_TYPE = 'woke-market-tracker'
// A separate Market window existed briefly (2026-11-15) before the Prices tab;
// foldMarketWindow merges it back.
export const MARKET_BROWSER_TYPE = 'woke-market'

export type MoverPeriod = '6h' | '24h' | '7d'

export const PERIOD_MS: Record<MoverPeriod, number> = {
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000
}

export interface WatchedItem {
  type: string
  name: string
  variant: string
  // Alert when the price goes above / below these (chaos). null = off.
  above?: number | null
  below?: number | null
  // Which side of the thresholds the last snapshot was on, so an alert
  // fires once per crossing instead of on every snapshot.
  alertState?: 'above' | 'below' | null
}

// Which alert, if any, a new price triggers. Returns the new state and
// whether it is a fresh crossing worth telling the player about.
export function checkAlert (w: WatchedItem, price: number | null): { state: 'above' | 'below' | null, fire: boolean } {
  if (price == null) return { state: w.alertState ?? null, fire: false }
  let state: 'above' | 'below' | null = null
  if (w.above != null && w.above > 0 && price >= w.above) state = 'above'
  else if (w.below != null && w.below > 0 && price <= w.below) state = 'below'
  return { state, fire: state != null && state !== (w.alertState ?? null) }
}

export interface MarketTrackerWidget extends Widget {
  anchor: Anchor
  // Prices: every poe.ninja category (MarketPrices.vue). Unset on old configs: Movers.
  view: 'prices' | 'movers' | 'watchlist'
  period: MoverPeriod
  minChaos: number
  typeFilter: string
  watchlist: WatchedItem[]
  // Measure moves in chaos or in divines.
  unit?: 'chaos' | 'div'
  // Show items poe.ninja barely saw trade on.
  showThin?: boolean
  // Corrupted gems: all of them, only them, or none of them.
  corrupted?: CorruptedFilter
  // The Prices tab: poe.ninja category, sort, and leaving thin markets out.
  priceCategory?: string
  priceSort?: MarketSort
  priceDesc?: boolean
  priceSkipThin?: boolean
}

// Opens the tracker on a search, from the search palette.
export const marketSearchRequest = shallowRef<string | null>(null)

type WidgetRecord = Record<string, unknown> & { wmId: number, wmType: string }

// Once per config (WOKE_CONFIG_VERSION 3): Market is one window with Prices,
// Movers and Watchlist tabs. A separate Market window from a dev build folds
// into it, keeping its settings and its rail spot.
export function foldMarketWindow (widgets: WidgetRecord[]): void {
  const browserAt = widgets.findIndex(w => w.wmType === MARKET_BROWSER_TYPE)
  const browser = browserAt === -1 ? undefined : widgets[browserAt]
  let tracker = widgets.find(w => w.wmType === MARKET_TRACKER_TYPE)
  if (browser && !tracker) {
    // Only the price list was kept: it becomes the window.
    tracker = browser
    Object.assign(tracker, { wmType: MARKET_TRACKER_TYPE, view: 'prices', period: '24h', minChaos: 5, typeFilter: '', watchlist: [] })
  } else if (browser && tracker) {
    widgets.splice(browserAt, 1)
    const menu = widgets.find(w => w.wmType === 'menu') as { pinned?: number[] } | undefined
    if (menu?.pinned) {
      const pins = menu.pinned
      const at = pins.indexOf(browser.wmId)
      if (at !== -1) {
        if (pins.includes(tracker.wmId)) pins.splice(at, 1)
        else pins.splice(at, 1, tracker.wmId)
      }
    }
  }
  if (!tracker) return
  if (browser) {
    tracker.priceCategory = browser.category ?? browser.priceCategory
    tracker.priceSort = browser.sort ?? browser.priceSort
    tracker.priceDesc = browser.desc ?? browser.priceDesc
    tracker.priceSkipThin = browser.hideThin ?? browser.priceSkipThin
    delete tracker.category
    delete tracker.sort
    delete tracker.desc
    delete tracker.hideThin
  }
  // Opens on Prices after the fold; an old tracker stays on its tab.
  if (browser || tracker.wmTitle === 'Movers') tracker.view = 'prices'
  // A name you gave it stays.
  if (!tracker.wmTitle || tracker.wmTitle === 'Movers') tracker.wmTitle = 'Market'
}
