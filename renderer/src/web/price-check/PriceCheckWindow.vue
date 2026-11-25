<template>
  <div
    style="top: 0; left: 0; height: 100%; width: 100%; position: absolute;"
    :style="floating ? { paddingTop: `${floating.top}px` } : undefined"
    class="flex grow h-full pointer-events-none" :class="{
    'flex-row': clickPosition === 'stash',
    'flex-row-reverse': clickPosition === 'inventory'
  }">
    <instant-ninja-card v-if="instant && item?.isOk()" :key="instantKey" :item="item.value" :at="instant"
      :active="config.wmWants === 'show'" :again-keys="config.hotkey && !advancedCheck ? `${config.hotkeyHold} + ${config.hotkey}` : null"
      @placed="instantPlaced" @live="openWindow(true, $event === true)" @close="closePriceCheck">
      <template #verdict>
        <div v-if="item.value.info.refName === 'Stacked Deck'" :class="$style.instantVerdict">
          <woke-deck-verdict-chip :item="item.value" />
        </div>
      </template>
      <related-items :class="[$style.zoomed, $style.instantSide]" :item="item.value" click-position="stash" @check="checkRelated" />
      <beast-altar v-if="isBeast" :class="[$style.zoomed, $style.instantSide]" :item="item.value" @check="checkRelated" />
    </instant-ninja-card>
    <template v-else>
    <div v-if="!isBrowserShown" class="layout-column shrink-0"
      :style="{ width: floating ? `${floating.gap}px` : 'var(--game-panel)' }">
    </div>
    <div id="price-window" ref="windowEl" class="layout-column shrink-0 text-gray-200 pointer-events-auto relative"
      :class="{ [$style.movable]: !isBrowserShown, 'w-poe': poeOn }" :style="windowStyle" @mousedown="startMove"
      v-on="poeOn ? { keydown: onEsc } : {}">
      <AppTitleBar :class="$style.zoomed" @close="closePriceCheck" @click="openLeagueSelection" :title="title">
        <button v-if="floating" data-testid="price-window-dock" title="Back to the side of the screen" @click="dock">
          <i class="fas fa-columns" />
        </button>
        <ui-popover v-if="stableOrbCost" trigger="click" boundary="#price-window" placement="bottom">
          <template #target>
            <button><i class="fas fa-exchange-alt" /> {{ stableOrbCost }}</button>
          </template>
          <template #content>
            <item-quick-price class="text-base"
              :price="{ min: stableOrbCost, max: stableOrbCost, currency: 'chaos' }"
              item-img="/images/divine.png"
            />
            <div v-for="i in 9" :key="i">
              <div class="pl-1">{{ i / 10 }} div ⇒ {{ Math.round(stableOrbCost * i / 10) }} c</div>
            </div>
          </template>
        </ui-popover>
        <i v-else-if="xchgRateLoading()" class="fas fa-dna fa-spin px-2" />
        <div v-else class="w-8" />
        <template #end><price-style-menu /></template>
      </AppTitleBar>
      <div class="grow layout-column min-h-0 bg-gray-800" :class="$style.zoomed">
        <background-info />
        <check-position-circle v-if="showCheckPos"
          :position="checkPosition" style="z-index: -1;" />
        <!-- woke: an item the data doesn't have yet is searched by name. -->
        <new-item-search v-if="newItem && leagues.selectedId.value"
          :query="newItem" :league="leagues.selectedId.value" />
        <template v-else-if="item?.isErr()">
          <ui-error-box class="m-4">
            <template #name>{{ t(item.error.name) }}</template>
            <p>{{ t(item.error.message) }}</p>
          </ui-error-box>
          <!-- woke: a way on from an item that can't be read -->
          <unreadable-item :raw-text="item.error.rawText" :league="leagues.selectedId.value ?? null" :unsupported="!!item.error.unsupported" />
          <pre class="bg-gray-900 rounded m-4 overflow-x-hidden p-2">{{ item.error.rawText }}</pre>
        </template>
        <template v-else-if="item?.isOk()">
          <unidentified-resolver :item="item.value" @identify="handleIdentification($event)" />
          <checked-item v-if="isLeagueSelected"
            :item="item.value" :advanced-check="advancedCheck" :live="liveCheck" />
        </template>
        <div v-if="isBrowserShown" class="bg-gray-900 px-6 py-2 truncate">
          <i18n-t keypath="app.toggle_browser_hint" tag="div">
            <span class="bg-gray-400 text-gray-900 rounded px-1">{{ overlayKey }}</span>
          </i18n-t>
        </div>
      </div>
      <template v-if="!isBrowserShown">
        <span :class="$style.edgeX" @mousedown.stop="startResize($event, true, false)" />
        <span :class="$style.edgeY" @mousedown.stop="startResize($event, false, true)" />
        <span :class="$style.corner" data-testid="price-window-resize" @mousedown.stop="startResize($event, true, true)" />
      </template>
      <!-- woke: a one-off tour of the window on the 3rd check (shared/hints.ts). -->
      <price-check-tour v-if="tourMay" :key="instantKey" />
    </div>
    <webview v-if="isBrowserShown" ref="iframeEl"
      class="pointer-events-auto flex-1"
      width="100%" height="100%" />
    <div v-else class="layout-column flex-1 min-w-0">
      <div class="flex" :class="{
        [$style.zoomed]: true,
        'flex-row': clickPosition === 'stash',
        'flex-row-reverse': clickPosition === 'inventory'
      }">
        <div v-if="item?.isOk()" class="layout-column">
          <related-items class="pointer-events-auto"
            :item="item.value" :click-position="clickPosition" @check="checkRelated" />
          <beast-altar v-if="isBeast" :item="item.value" @check="checkRelated" />
        </div>
        <rate-limiter-state class="pointer-events-auto" />
      </div>
    </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, inject, PropType, shallowRef, watch, computed, nextTick, provide } from 'vue'
import { Result, ok, err } from 'neverthrow'
import { useI18n } from 'vue-i18n'
import UiErrorBox from '@/web/ui/UiErrorBox.vue'
import UiPopover from '@/web/ui/Popover.vue'
import CheckedItem from './CheckedItem.vue'
import BackgroundInfo from './BackgroundInfo.vue'
import { MainProcess, Host } from '@/web/background/IPC'
import { usePoeninja } from '../background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { AppConfig, rootFontPx } from '@/web/Config'
import { ItemCategory, ItemRarity, parseClipboard, ParsedItem } from '@/parser'
import RelatedItems from './related-items/RelatedItems.vue'
import RateLimiterState from './trade/RateLimiterState.vue'
import CheckPositionCircle from './CheckPositionCircle.vue'
import UnreadableItem from '@/web/woke/new-item/UnreadableItem.vue'
import { newItemQuery } from '@/web/woke/new-item/query'
import AppTitleBar from '@/web/ui/AppTitlebar.vue'
import PriceStyleMenu from '@/web/woke/price-insight/PriceStyleMenu.vue'
import ItemQuickPrice from '@/web/ui/ItemQuickPrice.vue'
import { PriceCheckWidget, WidgetManager, WidgetSpec } from '../overlay/interfaces'
import { clampDrag, clearGuides, releaseWebviewsForDrag, snapEdge, snapMove, swallowNextClick } from '@/web/woke/ui/snap'
import { poeOn } from '@/web/woke/price-insight/window-style'
import { artShown, ART_FRAME_INSET } from '@/web/woke/ui/theme'
import { uiZoom } from '@/web/woke/ui/ui-size'
import '@/web/woke/price-insight/poe-mode.css'
import { floatingArea, floatingLayout, movedPosition, resizedPosition } from './window-position'
import { dispatchPriceCheck } from '@/web/woke/ui/tooltip/item-price-check'
import { exactDetailsId } from './trends/getDetailsId'
import { instantCardShown } from '@/web/woke/price-insight/view'
import { countPriceCheck, hintsOff, isHintDone } from '@/web/woke/shared/hints'
import { PRICE_CHECK_TOUR, TOUR_AT_CHECK, TOUR_SHOWS } from '@/web/woke/price-insight/tour-steps'
import { fixedPriceItem, chaosOrbRow } from '@/web/woke/price-insight/ninja-first'

type ParseError = { name: string; message: string; rawText: ParsedItem['rawText']; unsupported?: boolean }
const UNSUPPORTED = 'woke.unsupported'

const DRAG_START_PX = 4
// woke: how long the price check hotkey pressed again on the instant card's item means "live offers".
const AGAIN_MS = 15_000
const WINDOW_REM = 28.75
// The related items' column beside the window: 17.5rem and a margin (RelatedItems.vue).
const RELATED_REM = 18.5
// The game art keeps a buffer inside the frame; the window grows by it so the table keeps its room.
// Screen px: UI size zooms the title bar and body (.zoomed), not the frame.
function windowWidth () {
  return WINDOW_REM * rootFontPx() * uiZoom() + (artShown() ? 2 * ART_FRAME_INSET : 0)
}

export default defineComponent({
  widget: {
    type: 'price-check',
    instances: 'single',
    initInstance: (): PriceCheckWidget => {
      return {
        wmId: 0,
        wmType: 'price-check',
        wmTitle: '',
        wmWants: 'hide',
        wmZorder: 'exclusive',
        wmFlags: ['hide-on-blur', 'menu::skip'],
        showRateLimitState: false,
        apiLatencySeconds: 2,
        collapseListings: 'api',
        smartInitialSearch: true,
        lockedInitialSearch: true,
        activateStockFilter: false,
        builtinBrowser: false,
        hotkey: 'D',
        hotkeyHold: 'Ctrl',
        hotkeyLocked: 'Ctrl + Alt + D',
        showSeller: false,
        searchStatRange: 10,
        showCursor: true,
        requestPricePrediction: false,
        merchantOnly: true,
        defaultCurrency: null
      }
    }
  } satisfies WidgetSpec,
  components: {
    AppTitleBar,
    CheckedItem,
    // woke: loaded on the first price check, not at startup (it guesses from the art, WOKEPOET-481).
    UnidentifiedResolver: defineAsyncComponent(() => import('./unidentified-resolver/UnidentifiedResolver.vue')),
    BackgroundInfo,
    RelatedItems,
    RateLimiterState,
    CheckPositionCircle,
    ItemQuickPrice,
    UiErrorBox,
    // Only for items the game data doesn't know yet: loaded on first use.
    NewItemSearch: defineAsyncComponent(() => import('@/web/woke/new-item/NewItemSearch.vue')),
    InstantNinjaCard: defineAsyncComponent(() => import('@/web/woke/price-insight/InstantNinjaCard.vue')),
    // A captured beast's Blood Altar recipes (WOKEPOET-485).
    BeastAltar: defineAsyncComponent(() => import('@/web/woke/price-insight/BeastAltar.vue')),
    PriceCheckTour: defineAsyncComponent(() => import('@/web/woke/price-insight/PriceCheckTour.vue')),
    // A Stacked Deck's open-or-sell verdict on its instant card.
    WokeDeckVerdictChip: defineAsyncComponent(() => import('@/web/woke/stacked-decks/DeckVerdictChip.vue')),
    UnreadableItem,
    PriceStyleMenu,
    UiPopover
  },
  props: {
    config: {
      type: Object as PropType<PriceCheckWidget>,
      required: true
    }
  },
  setup (props) {
    const wm = inject<WidgetManager>('wm')!
    const { xchgRate, initialLoading: xchgRateLoading, queuePricesFetch } = usePoeninja()

    nextTick(() => {
      props.config.wmWants = 'hide'
      props.config.wmFlags = ['hide-on-blur', 'menu::skip']
    })

    const item = shallowRef<null | Result<ParsedItem, ParseError>>(null)
    const advancedCheck = shallowRef(false)
    const liveCheck = shallowRef(false)
    const checkPosition = shallowRef({ x: 1, y: 1 })

    MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
      if (e.target !== 'price-check') return

      // First, so the area below is for the window as it will show: an open
      // browser forces the docked layout.
      closeBrowser()
      // woke: an exchange item poe.ninja prices gets the small card by the item (instant check).
      const parsed = (e.item ? ok(e.item as ParsedItem) : parseClipboard(e.clipboard))
      // For both price check hotkeys (quick and locked). A check started in the overlay
      // (a menu, Ctrl+Space, a pasted item) comes with `live` and opens the window.
      // The hotkey again on the item the card shows: live offers, without moving to the card.
      // Only while the card is up: once it closed (the mouse moved away), the hotkey shows it again.
      const again = instant.value != null && props.config.wmWants === 'show' &&
        e.clipboard === instantText && Date.now() - instantAt < AGAIN_MS
      const quick = !again && !e.live && parsed.isOk() && instantCheck(parsed.value)
      instantText = quick ? e.clipboard : ''
      instantAt = Date.now()
      instantKey.value += 1
      instant.value = quick ? { x: e.position.x - window.screenX, y: e.position.y - window.screenY } : null
      trackFrom = e.position
      // The card's area is sent once it's placed (instantPlaced).
      if (Host.isElectron && !e.focusOverlay && !quick) {
        trackWindowArea(e.position)
      }
      wm.show(props.config.wmId)
      checkPosition.value = e.position
      advancedCheck.value = e.focusOverlay
      liveCheck.value = e.live === true || again

      item.value = parsed
        .andThen(item => (
          (item.category === ItemCategory.Sentinel && item.rarity !== ItemRarity.Unique))
          // woke: a known item that's not priced, so not searched by name either.
          ? err(UNSUPPORTED)
          : ok(item))
        .mapErr(err => ({
          name: err === UNSUPPORTED ? 'item.unknown' : `${err}`,
          message: err === UNSUPPORTED ? 'item.unknown_help' : `${err}_help`,
          unsupported: err === UNSUPPORTED,
          rawText: e.clipboard
        }))

      if (item.value.isOk()) {
        queuePricesFetch()
        if (!quick) countPriceCheck()
      }
    })

    // woke: the instant check (InstantNinjaCard.vue): where the card sits, or null for the window.
    const instant = shallowRef<{ x: number, y: number } | null>(null)
    let trackFrom = { x: 0, y: 0 }
    const poeninja = usePoeninja()
    function instantCheck (it: ParsedItem): boolean {
      const cfg = props.config
      if (cfg.wokeNinjaFirst === false || cfg.wokeNinjaInstant === false) return false
      if (!(it.info.tradeTag || fixedPriceItem(it)) || !leagues.selectedId.value) return false
      const q = exactDetailsId(it)
      return Boolean(chaosOrbRow(it, poeninja.xchgRate.value) ?? (q && (poeninja.findPriceByQuery(q)?.chaos ?? 0) > 0))
    }
    // A new card each check, so it measures itself and reports its area again.
    const instantKey = shallowRef(0)
    // A captured beast gets its Blood Altar recipes beside the check.
    const isBeast = computed(() => {
      const it = item.value
      return it != null && it.isOk() && it.value.info.namespace === 'CAPTURED_BEAST'
    })
    // woke: the overlay doesn't darken the game behind the card (OverlayWindow.vue), on the locked key too.
    watch(() => instant.value != null && props.config.wmWants === 'show', (on) => { instantCardShown.value = on }, { immediate: true })
    let instantText = ''
    let instantAt = 0
    function sendTrackArea (from: { x: number, y: number }, area: { x: number, y: number, width: number, height: number }) {
      MainProcess.sendEvent({
        name: 'OVERLAY->MAIN::track-area',
        payload: {
          holdKey: props.config.hotkeyHold,
          closeThreshold: 2.5 * rootFontPx() * uiZoom(),
          from,
          area,
          dpr: window.devicePixelRatio
        }
      })
    }
    // The mouse is tracked into the window (docked or where it was moved), everything in CSS pixels.
    function trackWindowArea (from: { x: number, y: number }) {
      const width = windowWidth()
      const screenX = ((from.x - window.screenX) > window.innerWidth / 2)
        ? (window.screenX + window.innerWidth) - wm.poePanelWidth.value - width
        : window.screenX + wm.poePanelWidth.value
      const placed = floating.value ? floatingArea(floating.value, screenSize()) : null
      const area = placed
        ? { ...placed, x: window.screenX + placed.x, y: window.screenY + placed.y }
        : { x: screenX, y: window.screenY, width, height: window.innerHeight }
      // woke: the related items beside the window count as the window, or moving onto
      // them hands the mouse back to the game and closes it. They sit on the screen's
      // middle side of it (clickPosition: 'inventory' puts them on the left).
      // Clipped short of where the item was checked, which stays the game's.
      const related = RELATED_REM * rootFontPx() * uiZoom()
      const clear = 2.5 * rootFontPx() * uiZoom()
      const leftSide = floating.value ? floating.value.side === 'inventory' : (from.x - window.screenX) > window.innerWidth / 2
      if (leftSide) {
        const edge = from.x < area.x ? Math.max(area.x - related, from.x + clear) : area.x - related
        const grow = Math.max(0, area.x - edge)
        area.x -= grow
        area.width += grow
      } else {
        const right = area.x + area.width
        const edge = from.x > right ? Math.min(right + related, from.x - clear) : right + related
        area.width += Math.max(0, edge - right)
      }
      sendTrackArea(from, area)
    }
    function instantPlaced (rect: DOMRect) {
      if (!Host.isElectron || advancedCheck.value || !rect.width || props.config.wmWants !== 'show') return
      sendTrackArea(trackFrom, { x: window.screenX + rect.x, y: window.screenY + rect.y, width: rect.width, height: rect.height })
    }
    // From the card to the window (live: with a search). The
    // mouse is tracked into the window now, or leaving the card would close it.
    // A click on the card already gave the overlay the mouse (and ended the
    // tracking), so only a key (Space) needs the window tracked from here.
    function openWindow (live: boolean, byKey = false) {
      liveCheck.value = live
      // woke: the small card opened into the window counts as a check there.
      if (instant.value != null) countPriceCheck()
      instant.value = null
      if (byKey && Host.isElectron && !advancedCheck.value) trackWindowArea(trackFrom)
    }

    function handleIdentification (identified: ParsedItem) {
      item.value = ok(identified)
    }
    // woke: a panel prices a version of the item it doesn't hold (a Viscera tier).
    provide<(other: ParsedItem) => void>('price-check-replace-item', (other) => { item.value = ok(other) })

    MainProcess.onEvent('MAIN->OVERLAY::hide-exclusive-widget', () => {
      wm.hide(props.config.wmId)
    })

    watch(() => props.config.wmWants, (state) => {
      if (state === 'hide') {
        closeBrowser()
      }
    })

    const leagues = useLeagues()
    const title = computed(() => leagues.selectedId.value || 'Awakened PoE Trade')
    const stableOrbCost = computed(() => (xchgRate.value) ? Math.round(xchgRate.value) : null)
    const isBrowserShown = computed(() => props.config.wmFlags.includes('has-browser'))

    // woke: the tour waits for the 3rd check in the window, and goes once done.
    // Mounted only while the window shows and the tour can still show (2 checks at most).
    const tourMay = computed(() => {
      const h = AppConfig().woke?.hints
      return props.config.wmWants === 'show' && !isBrowserShown.value && instant.value == null && item.value?.isOk() === true &&
        !hintsOff() && !isHintDone(PRICE_CHECK_TOUR) && (h?.checks ?? 0) >= TOUR_AT_CHECK && (h?.shows?.[PRICE_CHECK_TOUR] ?? 0) < TOUR_SHOWS
    })
    const overlayKey = computed(() => AppConfig().overlayKey)
    const showCheckPos = computed(() => wm.active.value && props.config.showCursor)
    const isLeagueSelected = computed(() => Boolean(leagues.selectedId.value))
    // woke: a new league's item, before the item data has it.
    const newItem = computed(() => {
      const res = item.value
      if (!res?.isErr() || res.error.name !== 'item.unknown' || res.error.unsupported || AppConfig().language !== 'en') return null
      return newItemQuery(res.error.rawText)
    })

    // woke: the window can be dragged and resized. A saved position replaces
    // the docked spot, except beside the built-in browser, which needs the
    // rest of the screen.
    function screenSize () {
      return { w: wm.size.value.width, h: wm.size.value.height }
    }
    const floating = computed(() => {
      const pos = props.config.wokeWindow
      if (!pos || isBrowserShown.value) return null
      return floatingLayout(pos, screenSize(), windowWidth())
    })
    const windowStyle = computed(() => {
      if (isBrowserShown.value) return { width: `${windowWidth()}px` }
      const f = floating.value
      return {
        width: `${f ? f.width : windowWidth()}px`,
        height: f?.height ? `${f.height}px` : 'auto',
        maxHeight: '100%',
        alignSelf: 'flex-start'
      }
    })

    const windowEl = shallowRef<HTMLElement | null>(null)

    function trackMouse (onMove: (ev: MouseEvent) => void, onEnd?: () => void) {
      const restoreWebviews = releaseWebviewsForDrag()
      function onUp () {
        restoreWebviews()
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        clearGuides()
        onEnd?.()
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    // By the title bar: its text still opens the league picker when clicked.
    function startMove (e: MouseEvent) {
      const el = windowEl.value
      const target = e.target as Element
      if (!el || e.button !== 0 || isBrowserShown.value || !target.closest('[data-price-title]')) return
      // Popovers (the divine rate) render inside the title bar but aren't part of it.
      if (target.closest('[data-tippy-root]')) return
      const button = target.closest('button')
      if (button && !button.hasAttribute('data-price-title-text')) return
      e.preventDefault()

      const rect = el.getBoundingClientRect()
      const startPos = props.config.wokeWindow
      let dragged = false
      trackMouse((ev) => {
        const dx = ev.clientX - e.clientX
        const dy = ev.clientY - e.clientY
        if (!dragged && Math.hypot(dx, dy) < DRAG_START_PX) return
        dragged = true
        const s = snapMove(rect, dx, dy, el, ev.altKey)
        const c = clampDrag(rect, s.dx, s.dy, window.innerWidth, window.innerHeight)
        props.config.wokeWindow = movedPosition(startPos, rect, c.dx, c.dy, screenSize())
      }, () => {
        if (dragged) swallowNextClick()
      })
    }

    function startResize (e: MouseEvent, x: boolean, y: boolean) {
      const el = windowEl.value
      if (!el || e.button !== 0) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const startPos = props.config.wokeWindow
      trackMouse((ev) => {
        const dw = x ? snapEdge('x', rect.right + ev.clientX - e.clientX, el, ev.altKey) - rect.right : null
        const dh = y ? snapEdge('y', rect.bottom + ev.clientY - e.clientY, el, ev.altKey) - rect.bottom : null
        props.config.wokeWindow = resizedPosition(startPos, rect, dw, dh, screenSize())
      }, swallowNextClick)
    }

    function dock () {
      props.config.wokeWindow = undefined
    }

    const clickPosition = computed(() => {
      if (isBrowserShown.value) {
        return 'inventory'
      } else if (floating.value) {
        return floating.value.side
      } else {
        return checkPosition.value.x > (window.screenX + window.innerWidth / 2)
          ? 'inventory'
          : 'stash'
          // or {chat, vendor, center of screen}
      }
    })

    watch(isBrowserShown, (isShown) => {
      if (isShown) {
        wm.setFlag(props.config.wmId, 'hide-on-blur', false)
        wm.setFlag(props.config.wmId, 'invisible-on-blur', true)
      } else {
        wm.setFlag(props.config.wmId, 'invisible-on-blur', false)
        wm.setFlag(props.config.wmId, 'hide-on-blur', true)
      }
    })

    watch(leagues.error, (value) => {
      if (value === null) {
        closeBrowser()
      }
    })

    // woke: PoE mode closes on Esc; in a box being typed in, Esc only leaves the box.
    function onEsc (e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const el = e.target as HTMLElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.blur()
        return
      }
      closePriceCheck()
    }

    function closePriceCheck () {
      if (isBrowserShown.value || !Host.isElectron) {
        wm.hide(props.config.wmId)
      } else {
        Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
      }
    }

    function openLeagueSelection () {
      const settings = wm.widgets.value.find(w => w.wmType === 'settings')!
      wm.setFlag(settings.wmId, `settings::widget=${props.config.wmId}`, true)
      wm.show(settings.wmId)
    }

    const iframeEl = shallowRef<HTMLIFrameElement | null>(null)

    function showBrowser (url: string) {
      wm.setFlag(props.config.wmId, 'has-browser', true)
      nextTick(() => {
        iframeEl.value!.src = url
      })
    }

    function closeBrowser () {
      wm.setFlag(props.config.wmId, 'has-browser', false)
    }

    provide<(url: string) => void>('builtin-browser', showBrowser)

    const { t } = useI18n()

    return {
      poeOn,
      onEsc,
      t,
      clickPosition,
      // woke: a family row price checks its item where this check was.
      checkRelated (input: { clipboard: string, item?: ParsedItem }) {
        dispatchPriceCheck(input, checkPosition.value)
      },
      isBrowserShown,
      iframeEl,
      floating,
      windowStyle,
      windowEl,
      startMove,
      startResize,
      dock,
      closePriceCheck,
      title,
      stableOrbCost,
      xchgRateLoading,
      showCheckPos,
      checkPosition,
      item,
      advancedCheck,
      liveCheck,
      instant,
      instantKey,
      tourMay,
      isBeast,
      instantPlaced,
      openWindow,
      handleIdentification,
      overlayKey,
      isLeagueSelected,
      openLeagueSelection,
      newItem,
      leagues
    }
  }
})
</script>

<style module>
.movable :global([data-price-title-text]) { cursor: move; }
/* With the style menu's own auto margin, the league sits centred between the side controls. */
:global(#price-window [data-price-title-text]) { margin-left: auto; }
.edgeX, .edgeY, .corner { position: absolute; z-index: 2; }
.zoomed { zoom: var(--w-ui-size, 1); }
/* Under the instant card, close to it. */
.zoomed.instantSide { margin-top: 6px; zoom: calc(var(--w-ui-size, 1) * var(--w-instant-scale, 1)); }
.instantVerdict { display: flex; }
.instantVerdict > * { margin-left: 0; }
.edgeX { top: 8px; bottom: 8px; right: 0; width: 5px; cursor: ew-resize; }
.edgeY { left: 8px; right: 8px; bottom: 0; height: 5px; cursor: ns-resize; }
.corner { right: 0; bottom: 0; width: 12px; height: 12px; cursor: nwse-resize; }
</style>
