<template>
  <div
    style="top: 0; left: 0; height: 100%; width: 100%; position: absolute;"
    :style="floating ? { paddingTop: `${floating.top}px` } : undefined"
    class="flex grow h-full pointer-events-none" :class="{
    'flex-row': clickPosition === 'stash',
    'flex-row-reverse': clickPosition === 'inventory'
  }">
    <div v-if="!isBrowserShown" class="layout-column shrink-0"
      :style="{ width: floating ? `${floating.gap}px` : 'var(--game-panel)' }">
    </div>
    <div id="price-window" ref="windowEl" class="layout-column shrink-0 text-gray-200 pointer-events-auto relative"
      :class="{ [$style.movable]: !isBrowserShown, 'w-poe': poeOn }" :style="windowStyle" @mousedown="startMove"
      v-on="poeOn ? { keydown: onEsc } : {}">
      <AppTitleBar @close="closePriceCheck" @click="openLeagueSelection" :title="title">
        <button v-if="floating" data-testid="price-window-dock" title="Back to the side of the screen" @click="dock">
          <i class="fas fa-columns" />
        </button>
        <ui-popover v-if="stableOrbCost" trigger="click" boundary="#price-window">
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
      <div class="grow layout-column min-h-0 bg-gray-800">
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
          <pre class="bg-gray-900 rounded m-4 overflow-x-hidden p-2">{{ item.error.rawText }}</pre>
        </template>
        <template v-else-if="item?.isOk()">
          <unidentified-resolver :item="item.value" @identify="handleIdentification($event)" />
          <checked-item v-if="isLeagueSelected"
            :item="item.value" :advanced-check="advancedCheck" />
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
    </div>
    <webview v-if="isBrowserShown" ref="iframeEl"
      class="pointer-events-auto flex-1"
      width="100%" height="100%" />
    <div v-else class="layout-column flex-1 min-w-0">
      <div class="flex" :class="{
        'flex-row': clickPosition === 'stash',
        'flex-row-reverse': clickPosition === 'inventory'
      }">
        <related-items v-if="item?.isOk()" class="pointer-events-auto"
          :item="item.value" :click-position="clickPosition" />
        <rate-limiter-state class="pointer-events-auto" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, inject, PropType, shallowRef, watch, computed, nextTick, provide } from 'vue'
import { Result, ok, err } from 'neverthrow'
import { useI18n } from 'vue-i18n'
import UiErrorBox from '@/web/ui/UiErrorBox.vue'
import UiPopover from '@/web/ui/Popover.vue'
import CheckedItem from './CheckedItem.vue'
import BackgroundInfo from './BackgroundInfo.vue'
import { MainProcess, Host } from '@/web/background/IPC'
import { usePoeninja } from '../background/Prices'
import { useLeagues } from '@/web/background/Leagues'
import { AppConfig } from '@/web/Config'
import { ItemCategory, ItemRarity, parseClipboard, ParsedItem } from '@/parser'
import RelatedItems from './related-items/RelatedItems.vue'
import RateLimiterState from './trade/RateLimiterState.vue'
import UnidentifiedResolver from './unidentified-resolver/UnidentifiedResolver.vue'
import CheckPositionCircle from './CheckPositionCircle.vue'
import NewItemSearch from '@/web/woke/new-item/NewItemSearch.vue'
import { newItemQuery } from '@/web/woke/new-item/query'
import AppTitleBar from '@/web/ui/AppTitlebar.vue'
import PriceStyleMenu from '@/web/woke/price-insight/PriceStyleMenu.vue'
import ItemQuickPrice from '@/web/ui/ItemQuickPrice.vue'
import { PriceCheckWidget, WidgetManager, WidgetSpec } from '../overlay/interfaces'
import { clampDrag, clearGuides, releaseWebviewsForDrag, snapEdge, snapMove, swallowNextClick } from '@/web/woke/ui/snap'
import { poeOn } from '@/web/woke/price-insight/window-style'
import '@/web/woke/price-insight/poe-mode.css'
import { floatingArea, floatingLayout, movedPosition, resizedPosition } from './window-position'

type ParseError = { name: string; message: string; rawText: ParsedItem['rawText']; unsupported?: boolean }
const UNSUPPORTED = 'woke.unsupported'

const DRAG_START_PX = 4
const WINDOW_REM = 28.75

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
    UnidentifiedResolver,
    BackgroundInfo,
    RelatedItems,
    RateLimiterState,
    CheckPositionCircle,
    ItemQuickPrice,
    UiErrorBox,
    NewItemSearch,
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
    const checkPosition = shallowRef({ x: 1, y: 1 })

    MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
      if (e.target !== 'price-check') return

      // First, so the area below is for the window as it will show: an open
      // browser forces the docked layout.
      closeBrowser()
      if (Host.isElectron && !e.focusOverlay) {
        // everything in CSS pixels
        const width = WINDOW_REM * AppConfig().fontSize
        const screenX = ((e.position.x - window.screenX) > window.innerWidth / 2)
          ? (window.screenX + window.innerWidth) - wm.poePanelWidth.value - width
          : window.screenX + wm.poePanelWidth.value
        const placed = floating.value ? floatingArea(floating.value, screenSize()) : null
        MainProcess.sendEvent({
          name: 'OVERLAY->MAIN::track-area',
          payload: {
            holdKey: props.config.hotkeyHold,
            closeThreshold: 2.5 * AppConfig().fontSize,
            from: e.position,
            area: placed
              ? { ...placed, x: window.screenX + placed.x, y: window.screenY + placed.y }
              : { x: screenX, y: window.screenY, width, height: window.innerHeight },
            dpr: window.devicePixelRatio
          }
        })
      }
      wm.show(props.config.wmId)
      checkPosition.value = e.position
      advancedCheck.value = e.focusOverlay

      item.value = (e.item ? ok(e.item as ParsedItem) : parseClipboard(e.clipboard))
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
      }
    })

    function handleIdentification (identified: ParsedItem) {
      item.value = ok(identified)
    }

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
      return floatingLayout(pos, screenSize(), WINDOW_REM * AppConfig().fontSize)
    })
    const windowStyle = computed(() => {
      if (isBrowserShown.value) return { width: `${WINDOW_REM}rem` }
      const f = floating.value
      return {
        width: f ? `${f.width}px` : `${WINDOW_REM}rem`,
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
.edgeX { top: 8px; bottom: 8px; right: 0; width: 5px; cursor: ew-resize; }
.edgeY { left: 8px; right: 8px; bottom: 0; height: 5px; cursor: ns-resize; }
.corner { right: 0; bottom: 0; width: 12px; height: 12px; cursor: nwse-resize; }
</style>
