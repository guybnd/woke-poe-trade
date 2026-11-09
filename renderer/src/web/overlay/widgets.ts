import type { PriceWindowPosition } from '@/web/price-check/window-position'

export interface Widget {
  wmId: number
  wmType: string
  wmTitle: string
  wmWants: 'show' | 'hide'
  wmZorder: number | 'exclusive' | null
  wmFlags: Array<WellKnownFlag | string>
}

export interface WidgetSpec {
  type: string
  instances: 'single' | 'multi'
  trNameKey?: string
  initInstance?: () => Widget
  defaultInstances?: () => Widget[]
}

export type WellKnownFlag =
  'uninitialized' |
  'menu::skip' |
  'has-browser' |
  'invisible-on-blur' |
  'hide-on-blur' |
  'hide-on-focus' |
  'ignore-ui-visibility'

export interface Anchor {
  pos: string
  x: number
  y: number
}

export interface WidgetMenu extends Widget {
  anchor: Anchor
  alwaysShow: boolean
}

export interface PriceCheckWidget extends Widget {
  // woke: where it was dragged or resized to. Unset, it stays docked.
  wokeWindow?: PriceWindowPosition
  hotkey: string | null
  hotkeyHold: string
  hotkeyLocked: string | null
  showSeller: false | 'account' | 'ign'
  searchStatRange: number
  showRateLimitState: boolean
  apiLatencySeconds: number
  collapseListings: 'api' | 'app'
  smartInitialSearch: boolean
  lockedInitialSearch: boolean
  activateStockFilter: boolean
  merchantOnly: boolean
  defaultCurrency: string | null
  showCursor: boolean
  requestPricePrediction: boolean
  builtinBrowser: boolean
  // woke: 'standard' is the window as it was; 'poe' (and unset) draws the filters like the game's tooltip (price-insight/window-style.ts).
  wokeWindowStyle?: 'standard' | 'poe'
}

export interface StopwatchWidget extends Widget {
  anchor: Anchor
  toggleKey: string | null
  resetKey: string | null
}

export interface DelveGridWidget extends Widget {
  toggleKey: string | null
}

export interface ImageStripWidget extends Widget {
  anchor: Anchor
  images: Array<{
    id: number
    url: string
  }>
}
