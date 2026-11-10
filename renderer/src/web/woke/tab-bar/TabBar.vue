<template>
  <div ref="railEl" :class="[$style.rail, { [$style.atEdge]: atEdge && !flat, [$style.onRight]: onRight && !flat, [$style.flat]: flat }]" class="w-surface" :style="railStyle" data-widget-drag
    @mousedown="watchRailDrop" @wheel="onRailWheel">
    <!-- The mark gives way to the rail's settings while the mouse is on the rail. -->
    <span :class="$style.top">
      <img :src="markUrl" alt="" draggable="false" :class="$style.mark">
      <button :class="[$style.ic, $style.cfg]" aria-label="Rail layout and size"
        @click="openLayout" @mouseenter="showTip('Layout and size', false, $event)" @mouseleave="hideTip">
        <i class="fas fa-sliders-h" />
      </button>
    </span>
    <span :class="$style.sep" />
    <button :class="[$style.ic, $style.tools, { [$style.toolsOn]: popup?.kind === 'launcher' }]" aria-label="All tools"
      @click="openLauncher" @mouseenter="showTip('All tools', false, $event)" @mouseleave="hideTip">
      <i class="fas fa-th" />
    </button>

    <template v-if="fixedTabs.length">
      <span :class="$style.sep" />
      <button v-for="tab in fixedTabs" :key="tab.wmId" :class="[$style.ic, { [$style.open]: tab.open }]" :aria-label="tab.name"
        @click="toggle(tab)" @contextmenu.prevent="openMenu(tab, $event)"
        @mouseenter="showTip(tab.name, tab.open, $event)" @mouseleave="hideTip">
        <tool-icon :art="tab.art" :icon="tab.icon" />
      </button>
    </template>

    <template v-if="pinTabs.length">
      <span :class="$style.sep" />
      <button v-for="(tab, i) in pinTabs" :key="tab.wmId" :data-pin="tab.wmId"
        :class="[$style.ic, { [$style.open]: tab.open, [$style.dragged]: iconDrag?.active && iconDrag.id === tab.wmId, [$style.dropBefore]: iconDrag?.active && iconDrag.at === i, [$style.dropAfter]: iconDrag?.active && iconDrag.at === pinTabs.length && i === pinTabs.length - 1 }]"
        :aria-label="tab.name" @mousedown="startIconDrag(tab, $event)"
        @click="toggle(tab)" @contextmenu.prevent="openMenu(tab, $event)"
        @mouseenter="showTip(tab.name, tab.open, $event)" @mouseleave="hideTip">
        <tool-icon :art="tab.art" :icon="tab.icon" />
      </button>
    </template>

    <template v-if="openUnpinned.length">
      <span :class="$style.sep" />
      <button v-for="tab in openUnpinned" :key="tab.wmId" :class="[$style.ic, $style.open]" :aria-label="tab.name"
        @click="toggle(tab)" @contextmenu.prevent="openMenu(tab, $event)"
        @mouseenter="showTip(tab.name, true, $event)" @mouseleave="hideTip">
        <tool-icon :art="tab.art" :icon="tab.icon" />
      </button>
    </template>

    <template v-if="hotkeys.problems.value">
      <span :class="$style.sep" />
      <button :class="[$style.ic, $style.warn]" aria-label="Hotkey problems"
        @click="openHotkeyList" @mouseenter="showTip(`${hotkeys.summary.value}. Click for the hotkey list.`, false, $event)" @mouseleave="hideTip">
        <i class="fas fa-exclamation-triangle" />
        <span :class="$style.badge">{{ hotkeys.problems.value }}</span>
      </button>
    </template>

    <span :class="$style.grip" title="Drag to move the rail. To the top or bottom edge lays it flat, to a side stands it up. Right-click for layout and size."
      @contextmenu.prevent="openLayout"><i class="fas fa-grip-lines" /></span>

    <Teleport to="body">
      <div v-if="iconDrag?.active && draggedTab" :class="[$style.ic, $style.ghost]" :style="{ left: `${iconDrag.x}px`, top: `${iconDrag.y}px` }">
        <tool-icon :art="draggedTab.art" :icon="draggedTab.icon" />
      </div>

      <div v-if="tip && !popup && !iconDrag?.active" :class="[$style.tip, { [$style.tipLeft]: tip.left, [$style.tipFlat]: flat }]" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
        {{ tip.text }}<span v-if="tip.open" :class="$style.tipOpen">open</span>
      </div>

      <div v-if="popup" :class="$style.backdrop" @mousedown="closePopup" @contextmenu.prevent="closePopup" />

      <!-- Tools: every tool, one box for search and item paste -->
      <div v-if="popup?.kind === 'launcher'" ref="popupEl" :class="[$style.menu, $style.launcher]" :style="popupStyle" @contextmenu.prevent>
        <label :class="$style.find">
          <i class="fas fa-search" />
          <textarea ref="searchInput" v-model="query" :class="$style.findInput" rows="1" spellcheck="false"
            aria-label="Find a tool or an item, or paste an item" placeholder="Find a tool or an item, or paste an item (Ctrl V)"
            @paste="onBoxPaste" @keydown.enter.prevent="openFirstMatch" />
        </label>
        <div v-if="priceGroups.length" :class="$style.prices">
          <div :class="$style.head">Prices</div>
          <button v-for="g in priceGroups" :key="groupKey(g)" :class="$style.priceRow" @click="openSearch(g.name)">
            <WIcon :src="ninjaIcon(g.type, g.name) ?? undefined" size="md" />
            <span :class="[$style.rowName, rarityClass(g.type)]">{{ g.name }}</span>
            <span :class="$style.priceSub">{{ g.variants.length > 1 ? `${g.variants.length} prices` : g.variants[0].variant }}</span>
            <span :class="$style.priceNow"><template v-if="g.low !== g.high"><WPrice :chaos="g.low" :divine="divine" /> to </template><WPrice :chaos="g.high" :divine="divine" /></span>
          </button>
        </div>
        <div :class="$style.cols">
          <div v-for="(col, i) in launcherColumns" :key="i">
            <template v-for="group in col" :key="group.label">
              <div v-if="group.items.length" :class="$style.head">{{ group.label }}</div>
              <div v-for="entry in group.items" :key="entry.key"
                :class="[$style.row, { [$style.rowOpen]: entry.tab?.open, [$style.rowOff]: entry.state === 'off' }]"
                @contextmenu.prevent.stop="entry.tab && openMenu(entry.tab, $event)">
                <button :class="$style.rowMain" :aria-label="entry.name" :title="ENTRY_HINT[entry.state]" @click="activate(entry)">
                  <tool-icon :art="entry.art" :icon="entry.icon" />
                  <span :class="$style.rowName">{{ entry.name }}</span>
                  <span v-if="entry.tab && entry.tab.copies > 1" :class="$style.dup" title="Several copies of this tool">×{{ entry.tab.copies }}</span>
                </button>
                <span v-if="entry.state === 'off'" :class="$style.rowTag">Off</span>
                <span v-else-if="entry.state === 'dock'" :class="$style.rowTag">Icon row</span>
                <button v-else-if="entry.tab" :class="[$style.pin, { [$style.pinOn]: entry.tab.pinned }]"
                  :aria-label="entry.tab.pinned ? `Unpin ${entry.name} from the rail` : `Pin ${entry.name} to the rail`"
                  :title="entry.tab.pinned ? 'Unpin from the rail' : 'Pin to the rail'" @click="togglePin(entry.tab)">
                  <i class="fas fa-thumbtack" />
                </button>
              </div>
            </template>
          </div>
        </div>
        <div v-if="!launcherHasMatch && !priceGroups.length" :class="$style.none">Nothing matches "{{ launcherQuery }}"</div>
      </div>

      <!-- the rail's own layout and size -->
      <div v-if="popup?.kind === 'layout'" ref="popupEl" :class="[$style.menu, $style.layoutMenu]" :style="popupStyle" data-rail-layout @contextmenu.prevent>
        <div :class="$style.chipHead">Layout</div>
        <div :class="$style.chips">
          <button :class="[$style.chip, { [$style.chipOn]: !flat }]" @click="setFlat(false)">Vertical</button>
          <button :class="[$style.chip, { [$style.chipOn]: flat }]" @click="setFlat(true)">Horizontal</button>
        </div>
        <div :class="$style.chipHead">Size</div>
        <div :class="$style.chips">
          <button v-for="s in RAIL_SIZES" :key="s" :class="[$style.chip, { [$style.chipOn]: (config.railSize ?? RAIL_DEFAULT_SIZE) === s }]" @click="setSize(s)">{{ s.toUpperCase() }}</button>
        </div>
        <hr :class="$style.rule">
        <button :class="$style.item" @click="resetRail(); closePopup()"><i class="fas fa-undo" />Reset position and size</button>
        <div :class="$style.hint">Ctrl + scroll on the rail changes size. Drag icons to reorder.</div>
      </div>

      <!-- right-click menu -->
      <div v-if="popup?.kind === 'menu' && menuTab" ref="popupEl" :class="$style.menu" :style="popupStyle" @contextmenu.prevent>
        <div :class="$style.head">{{ menuTab.name }}</div>
        <button :class="$style.item" @click="toggle(menuTab); closePopup()">
          <i class="fas" :class="menuTab.open ? 'fa-eye-slash' : 'fa-eye'" />{{ menuTab.open ? 'Close window' : 'Open' }}
        </button>
        <button :class="$style.item" @click="togglePin(menuTab); closePopup()">
          <i class="fas fa-thumbtack" />{{ menuTab.pinned ? 'Unpin from the rail' : 'Pin to the rail' }}
        </button>
        <template v-if="menuTab.pinned && !menuTab.iconOnly">
          <button :class="$style.item" :disabled="!canShift(menuTab, -1)" @click="shift(menuTab, -1)"><i class="fas" :class="flat ? 'fa-chevron-left' : 'fa-chevron-up'" />{{ flat ? 'Move left' : 'Move up' }}</button>
          <button :class="$style.item" :disabled="!canShift(menuTab, 1)" @click="shift(menuTab, 1)"><i class="fas" :class="flat ? 'fa-chevron-right' : 'fa-chevron-down'" />{{ flat ? 'Move right' : 'Move down' }}</button>
        </template>
        <hr :class="$style.rule">
        <button v-if="menuTab.hasAnchor" :class="$style.item" @click="resetPosition(menuTab); closePopup()">
          <i class="fas fa-undo" />Reset window position
        </button>
        <div v-if="renaming" :class="$style.renameRow">
          <input ref="renameInput" v-model="renameValue" :class="$style.input" placeholder="Tool name"
            @keydown.enter="commitRename" @keydown.esc="closePopup">
          <button :class="$style.iconBtn" title="Save" @click="commitRename"><i class="fas fa-check" /></button>
        </div>
        <button v-else-if="!menuTab.iconOnly" :class="$style.item" @click="startRename"><i class="fas fa-pen" />Rename</button>
        <button v-if="canAddCopy(menuTab.wmType)" :class="$style.item" @click="placeNew(menuTab.wmType); closePopup()">
          <i class="fas fa-plus" />Add another copy
        </button>
        <template v-if="menuTab.removable">
          <hr :class="$style.rule">
          <button v-if="menuTab.copies > 1" :class="[$style.item, $style.danger]" @click="removeCopies(menuTab)">
            <i class="fas fa-clone" />Remove extra copies ({{ menuTab.copies - 1 }})
          </button>
          <button :class="[$style.item, $style.danger]" @click="removeTab(menuTab)">
            <i class="fas fa-trash" />{{ confirmRemove ? 'Click again to remove' : 'Remove from overlay' }}
          </button>
        </template>
      </div>

    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { registry } from '@/web/overlay/widget-registry'
import { AppConfig, pushHostConfig } from '@/web/Config'
import { appIconUrl } from '../ui/app-icon'
import { MODULES, ensureWokeConfig, isWidgetTypeOn, setModuleOn } from '@/web/woke/modules'
import { useI18n } from 'vue-i18n'
import { useHotkeyHealth } from '../switchboard/hotkey-health'
import ToolIcon from './ToolIcon.vue'
import { ICON_TOOL_NAMES, RAIL_DEFAULT_SIZE, RAIL_SIZES, RAIL_ZOOM, movePin, railAnchor, railDropEdge, stepRailSize, artFor, iconFor, allowsCopies, groupByModule, launcherEntries, looksLikeItem, migrateToRail, parseWidgetTitle } from './tools'
import type { LauncherEntry, LauncherState, RailSize, TabBarConfig } from './tools'
import { WIcon, WPrice, ninjaIcon } from '../ui'
import { holdPricesForSearch, useSearchSnapshot } from '../market/price-index'
import { groupKey, rarityClass, searchPrices } from '../search/search'
import { searchRequest } from '../search/widget'

const props = defineProps<{ config: TabBarConfig }>()
const emit = defineEmits<{ (e: 'paste', text: string, from: DOMRect): void }>()

const wm = inject<WidgetManager>('wm')!
const { t } = useI18n()
const markUrl = computed(() => appIconUrl(AppConfig().appIcon))

interface Tab {
  wmId: number
  wmType: string
  name: string
  icon: string
  art: string | null
  iconOnly: boolean
  open: boolean
  pinned: boolean
  copies: number
  removable: boolean
  hasAnchor: boolean
}

function typeName (wmType: string): string {
  const spec = registry.widgets.find(w => w.widget.type === wmType)?.widget
  return spec?.trNameKey ? t(spec.trNameKey) : wmType
}

const listed = computed(() => wm.widgets.value.filter(w =>
  !w.wmFlags.includes('menu::skip') && isWidgetTypeOn(AppConfig(), w.wmType)))

// All tools, even switched-off ones: their pins just don't show until they're on.
migrateToRail(props.config, wm.widgets.value.filter(w => !w.wmFlags.includes('menu::skip')))

const tabs = computed<Tab[]>(() => {
  const counts = new Map<string, number>()
  for (const w of listed.value) counts.set(w.wmType, (counts.get(w.wmType) ?? 0) + 1)
  const pinned = props.config.pinned ?? []
  return listed.value.map(w => {
    const parsed = parseWidgetTitle(w.wmTitle)
    const custom = props.config.labels?.[w.wmId]
    const title = custom || parsed.title
    return {
      wmId: w.wmId,
      wmType: w.wmType,
      name: title || ICON_TOOL_NAMES[w.wmType] || typeName(w.wmType) || `#${w.wmId}`,
      icon: parsed.icon ?? iconFor(w.wmType),
      art: artFor(w.wmType),
      iconOnly: !title && !!parsed.icon,
      open: w.wmWants === 'show',
      pinned: pinned.includes(w.wmId),
      copies: allowsCopies(w.wmType) ? 1 : counts.get(w.wmType)!,
      removable: w.wmType !== 'settings',
      hasAnchor: 'anchor' in w
    }
  })
})

// Which side of the screen the rail is on decides where things open from it.
const onRight = computed(() => {
  const { pos, x } = props.config.anchor
  return pos.endsWith('r') ? x > 50 : x >= 50
})
const atEdge = computed(() => props.config.anchor.pos.endsWith('l') && props.config.anchor.x <= 0)
const flat = computed(() => props.config.railFlat === true)
const railZoom = computed(() => RAIL_ZOOM[props.config.railSize ?? RAIL_DEFAULT_SIZE])

// Keep every icon reachable: it scrolls instead of running off the screen.
const railStyle = computed(() => {
  const { pos, x, y } = props.config.anchor
  // CSS zoom multiplies vh and vw too.
  const zoom = railZoom.value
  if (flat.value) {
    const room = pos.endsWith('l') ? 100 - x : pos.endsWith('r') ? x : 2 * Math.min(x, 100 - x)
    return { zoom, maxWidth: `max(calc(${room / zoom}vw - ${8 / zoom}px), 240px)` }
  }
  const room = pos.startsWith('t') ? 100 - y : pos.startsWith('b') ? y : 2 * Math.min(y, 100 - y)
  return { zoom, maxHeight: `max(calc(${room / zoom}vh - ${8 / zoom}px), 240px)` }
})

const pinnedTabs = computed(() => {
  const byId = new Map(tabs.value.map(tab => [tab.wmId, tab]))
  return (props.config.pinned ?? []).map(id => byId.get(id)).filter((x): x is Tab => !!x)
})
const fixedTabs = computed(() => pinnedTabs.value.filter(tab => tab.iconOnly))
const pinTabs = computed(() => pinnedTabs.value.filter(tab => !tab.iconOnly))
const openUnpinned = computed(() => tabs.value.filter(tab => !tab.pinned && tab.open))

// Two actions on one key, or a key another program holds: either way one
// of them silently does nothing, so say so where it's always seen.
const hotkeys = useHotkeyHealth()
function openHotkeyList () {
  const settings = wm.widgets.value.find(w => w.wmType === 'settings')
  if (!settings) return
  wm.setFlag(settings.wmId, 'settings::page=Hotkey list', true)
  wm.show(settings.wmId)
}

function toggle (tab: Tab) {
  hideTip()
  // The old item search's icon opens the search that replaced it.
  if (tab.wmType === 'item-search') {
    openSearch('')
    return
  }
  if (tab.open) wm.hide(tab.wmId)
  else wm.show(tab.wmId)
}

// Opens it from the launcher, whatever state it's in.
function toggleOpen (tab: Tab) {
  if (tab.wmType === 'item-search') openSearch('')
  else wm.show(tab.wmId)
}

function togglePin (tab: Tab) {
  const pinned = props.config.pinned ?? []
  props.config.pinned = tab.pinned ? pinned.filter(id => id !== tab.wmId) : [...pinned, tab.wmId]
}
function canShift (tab: Tab, dir: -1 | 1) {
  const i = pinTabs.value.findIndex(x => x.wmId === tab.wmId)
  return i >= 0 && i + dir >= 0 && i + dir < pinTabs.value.length
}
function shift (tab: Tab, dir: -1 | 1) {
  if (!canShift(tab, dir)) return
  // Swap with the neighbour shown on the rail, inside the full pinned list:
  // pins of switched-off modules (not shown) must survive the move.
  const shown = pinTabs.value.map(x => x.wmId)
  const other = shown[shown.indexOf(tab.wmId) + dir]
  const ids = [...(props.config.pinned ?? [])]
  const a = ids.indexOf(tab.wmId)
  const b = ids.indexOf(other)
  if (a < 0 || b < 0) return
  ;[ids[a], ids[b]] = [ids[b], ids[a]]
  props.config.pinned = ids
}

function resetPosition (tab: Tab) {
  const w = wm.widgets.value.find(x => x.wmId === tab.wmId) as (Widget & { anchor?: Anchor }) | undefined
  if (w?.anchor) w.anchor = popupAnchor()
  toggleOpen(tab)
}

function forget (wmId: number) {
  props.config.pinned = (props.config.pinned ?? []).filter(id => id !== wmId)
  setLabel(wmId, '')
  wm.remove(wmId)
}
const confirmRemove = ref(false)
function removeTab (tab: Tab) {
  if (!confirmRemove.value) { confirmRemove.value = true; return }
  forget(tab.wmId)
  closePopup()
}
function removeCopies (tab: Tab) {
  for (const w of listed.value) {
    if (w.wmType === tab.wmType && w.wmId !== tab.wmId) forget(w.wmId)
  }
  closePopup()
}

const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement>()
function startRename () {
  renaming.value = true
  renameValue.value = menuTab.value?.name ?? ''
  nextTick(() => renameInput.value?.select())
}
function commitRename () {
  const tab = menuTab.value
  if (tab) setLabel(tab.wmId, renameValue.value.trim())
  closePopup()
}
function setLabel (wmId: number, label: string) {
  const labels = Object.fromEntries(Object.entries(props.config.labels ?? {})
    .filter(([id]) => Number(id) !== wmId))
  if (label) labels[wmId] = label
  props.config.labels = labels
}

// Names on hover. Drawn on body so a window can't cover them.
const railEl = ref<HTMLElement | null>(null)
const tip = ref<{ text: string, open: boolean, x: number, y: number, left: boolean } | null>(null)
const TIP_ROOM = 100
function showTip (text: string, open: boolean, e: MouseEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const rail = railEl.value?.getBoundingClientRect() ?? r
  if (flat.value) {
    const below = rail.top < window.innerHeight / 2
    // It's centred on the icon: keep it off the screen's edges.
    const x = Math.max(TIP_ROOM, Math.min(window.innerWidth - TIP_ROOM, r.left + r.width / 2))
    tip.value = { text, open, left: !below, x, y: below ? rail.bottom + 18 : rail.top - 18 }
    return
  }
  tip.value = {
    text,
    open,
    left: onRight.value,
    x: onRight.value ? rail.left - 6 : rail.right + 6,
    y: r.top + r.height / 2
  }
}
function hideTip () { tip.value = null }

// popups
// y: where the popup's top goes when it opens downward; above: where its
// bottom goes when there is no room below and it opens upward instead.
type PopupKind = 'menu' | 'launcher' | 'layout'
const POPUP_WIDTH: Record<PopupKind, number> = { menu: 240, launcher: 900, layout: 240 }
const popup = ref<{ kind: PopupKind, x: number, y: number, above: number, up?: boolean, wmId?: number } | null>(null)
const popupEl = ref<HTMLElement | null>(null)
const menuTab = computed(() => tabs.value.find(tab => tab.wmId === popup.value?.wmId))
const popupStyle = computed(() => {
  if (!popup.value) return {}
  const x = Math.min(popup.value.x, window.innerWidth - POPUP_WIDTH[popup.value.kind] - 4)
  const left = `${Math.max(4, x)}px`
  return popup.value.up
    ? { left, bottom: `${window.innerHeight - popup.value.above}px`, maxHeight: `${popup.value.above - 4}px`, overflowY: 'auto' as const }
    : { left, top: `${popup.value.y}px`, maxHeight: `calc(100vh - ${popup.value.y + 4}px)`, overflowY: 'auto' as const }
})
// Flip upward when the popup would run off the bottom of the screen and
// there is more room above the click than below it.
function placePopup () {
  nextTick(() => {
    const p = popup.value
    const el = popupEl.value
    if (!p || !el) return
    const h = el.getBoundingClientRect().height
    const roomBelow = window.innerHeight - p.y - 4
    if (h > roomBelow && p.above > roomBelow) p.up = true
  })
}
function openMenu (tab: Tab, e: MouseEvent) {
  hideTip()
  confirmRemove.value = false
  renaming.value = false
  popup.value = { kind: 'menu', x: e.clientX, y: e.clientY, above: e.clientY, wmId: tab.wmId }
  placePopup()
}
// Beside the rail, on whichever side of it faces the screen.
function openBesideRail (kind: 'launcher' | 'layout') {
  hideTip()
  const r = railEl.value!.getBoundingClientRect()
  popup.value = flat.value
    ? { kind, x: r.left, y: r.bottom + 4, above: r.top - 4 }
    : {
        kind,
        x: onRight.value ? r.left - 4 - POPUP_WIDTH[kind] : r.right + 4,
        y: r.top,
        above: r.bottom
      }
  placePopup()
  if (kind !== 'launcher') return
  query.value = ''
  nextTick(() => searchInput.value?.focus())
}
function openLayout () { openBesideRail('layout') }

// ---- arranging the rail ----
// Where the buff row ends: lying along the top, the rail sits just under it.
const BELOW_BUFFS = railAnchor().y

// Lays out the rail's new shape and puts it where asked, kept on screen. How long
// the rail can be depends on where it's anchored, so it's measured from the start
// of the screen before it's placed. Before the next paint, so nothing flickers.
function reshape (change: () => void, place: { x: number, y: number, right: boolean, bottom: boolean }) {
  const c = props.config
  change()
  const w = window.innerWidth
  const h = window.innerHeight
  c.anchor = { pos: 'tl', x: flat.value ? 0 : place.x, y: flat.value ? place.y : 0 }
  nextTick(() => {
    const n = railEl.value?.getBoundingClientRect()
    if (!n) return
    const x = Math.min(place.x / 100 * w, w - n.width)
    const y = Math.min(place.y / 100 * h, h - n.height)
    c.anchor = {
      pos: 'tl',
      x: Math.max(0, place.right ? w - n.width : x) / w * 100,
      y: Math.max(0, place.bottom ? h - n.height : y) / h * 100
    }
    // Open popups sit beside the old shape.
    if (popup.value?.kind === 'layout') nextTick(openLayout)
  })
}

// Keeps its top-left corner unless told otherwise.
function setFlat (on: boolean, place: { x?: number, y?: number, right?: boolean, bottom?: boolean } = {}) {
  const r = railEl.value?.getBoundingClientRect()
  if (!r) return
  reshape(() => { props.config.railFlat = on }, {
    x: place.x ?? r.left / window.innerWidth * 100,
    y: place.y ?? r.top / window.innerHeight * 100,
    right: place.right === true,
    bottom: place.bottom === true
  })
}

// A rail against the right or bottom edge stays against it.
function setSize (size: RailSize) {
  const r = railEl.value?.getBoundingClientRect()
  if (!r || size === (props.config.railSize ?? RAIL_DEFAULT_SIZE)) return
  reshape(() => { props.config.railSize = size }, {
    x: r.left / window.innerWidth * 100,
    y: r.top / window.innerHeight * 100,
    right: r.left > window.innerWidth / 2 && r.right >= window.innerWidth - 2,
    bottom: r.top > window.innerHeight / 2 && r.bottom >= window.innerHeight - 2
  })
}

function resetRail () {
  const c = props.config
  c.railFlat = undefined
  c.railSize = undefined
  c.anchor = railAnchor()
}

function onRailWheel (e: WheelEvent) {
  if (e.ctrlKey) {
    e.preventDefault()
    setSize(stepRailSize(props.config.railSize, e.deltaY < 0 ? 1 : -1))
  } else if (flat.value && railEl.value) {
    // Scrolling reads as along the row.
    railEl.value.scrollLeft += e.deltaY
  }
}

// The rail itself is dragged by its widget. Dropped against an edge, it turns to
// lie along that edge. This runs before the widget's own mouseup.
function watchRailDrop (start: MouseEvent) {
  if (start.button !== 0 || (start.target as Element).closest('button')) return
  // Choosing an anchor corner in the widget's Move mode isn't a drag of the rail.
  if (railEl.value?.closest('.opacity-75')) return
  const onUp = (e: MouseEvent) => {
    document.removeEventListener('mouseup', onUp)
    if (Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY) < DRAG_PX) return
    const edge = railDropEdge(e.clientX, e.clientY, window.innerWidth, window.innerHeight)
    if (!edge) return
    const wantFlat = edge === 'top' || edge === 'bottom'
    if (wantFlat === flat.value) return
    if (edge === 'top') setFlat(true, { y: BELOW_BUFFS })
    else if (edge === 'bottom') setFlat(true, { bottom: true })
    else if (edge === 'left') setFlat(false, { x: 0, y: BELOW_BUFFS })
    else setFlat(false, { y: BELOW_BUFFS, right: true })
  }
  document.addEventListener('mouseup', onUp)
}

// Dragging a pinned icon along the rail. A plain click still opens the tool.
const DRAG_PX = 5
const iconDrag = ref<{ id: number, active: boolean, x: number, y: number, at: number } | null>(null)
const draggedTab = computed(() => pinTabs.value.find(tab => tab.wmId === iconDrag.value?.id))
let endIconDrag: (() => void) | null = null
function startIconDrag (tab: Tab, start: MouseEvent) {
  if (start.button !== 0) return
  const onMove = (e: MouseEvent) => {
    const d = iconDrag.value
    if (!d) return
    if (!d.active && Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY) < DRAG_PX) return
    d.active = true
    d.x = e.clientX
    d.y = e.clientY
    const cells = [...(railEl.value?.querySelectorAll<HTMLElement>('[data-pin]') ?? [])]
    d.at = cells.filter((el) => {
      const r = el.getBoundingClientRect()
      return flat.value ? r.left + r.width / 2 < e.clientX : r.top + r.height / 2 < e.clientY
    }).length
  }
  const stop = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    endIconDrag = null
    iconDrag.value = null
  }
  const onUp = () => {
    const d = iconDrag.value
    stop()
    if (!d?.active) return
    props.config.pinned = movePin(props.config.pinned ?? [], pinTabs.value.map(x => x.wmId), d.id, d.at)
    // The click that ends a drag doesn't open the tool. If none follows, the
    // next real one still counts.
    const swallow = (e: Event) => { e.stopPropagation(); e.preventDefault() }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => { window.removeEventListener('click', swallow, { capture: true }) }, 50)
  }
  iconDrag.value = { id: tab.wmId, active: false, x: start.clientX, y: start.clientY, at: 0 }
  endIconDrag = stop
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
onBeforeUnmount(() => { endIconDrag?.() })
function openLauncher () {
  holdPricesForSearch()
  openBesideRail('launcher')
}
function closePopup () {
  popup.value = null
  renaming.value = false
  confirmRemove.value = false
}
watch(() => wm.active.value, active => {
  if (!active) {
    closePopup()
    hideTip()
  }
})

const query = ref('')
const searchInput = ref<HTMLInputElement | HTMLTextAreaElement>()

// launcher
const launcherQuery = computed(() => query.value.trim().replace(/\s+/g, ' ').toLowerCase())
// Every tool: what's placed, what isn't yet, and what's switched off.
const launcherAll = computed(() => launcherEntries(
  registry.widgets
    .filter(({ widget }) => widget.instances === 'multi' && widget.type !== 'stash-search')
    .map(({ widget }) => ({ type: widget.type, name: typeName(widget.type) })),
  tabs.value,
  wmType => !isWidgetTypeOn(AppConfig(), wmType),
  wmType => AppConfig().widgets.some(w => w.wmType === wmType && w.wmFlags.includes('menu::skip'))
))
const ENTRY_HINT: Record<LauncherState, string | undefined> = {
  placed: undefined,
  available: undefined,
  off: 'Switched off. Click to turn it on and open it.',
  dock: 'Lives in the icon row. Click for its settings.'
}
const launcherMatches = computed(() => {
  const q = launcherQuery.value
  // Settings and search live on the rail; listed here only if taken off it,
  // so they can be put back.
  const shown = launcherAll.value.filter(entry => !(entry.tab?.iconOnly && entry.tab.pinned))
  return q ? shown.filter(entry => entry.name.toLowerCase().includes(q)) : shown
})
const launcherHasMatch = computed(() => launcherMatches.value.length > 0)
// One column per group; whatever is left shares the last one.
const launcherColumns = computed(() => {
  const groups = groupByModule(launcherMatches.value)
  return [[groups[0]], [groups[1]], [groups[2]], groups.slice(3)]
})
// Opening a tool is what the launcher is for, so it steps aside; closing one
// leaves it up for the next.
function onRowClick (tab: Tab) {
  toggle(tab)
  if (!tab.open) closePopup()
}
function activate (entry: LauncherEntry<Tab>) {
  if (entry.tab) {
    onRowClick(entry.tab)
    return
  }
  if (entry.state === 'dock') openModuleSettings(entry.wmType)
  else {
    if (entry.state === 'off') turnOn(entry.wmType)
    placeAndOpen(entry.wmType)
  }
  closePopup()
}
function openFirstMatch () {
  if (!launcherQuery.value) return
  const rows = launcherColumns.value.flat().flatMap(g => g.items)
  // A tool that's placed beats a price. Typing "essence" to price one shouldn't
  // switch on and place the Essence scan.
  const first = priceGroups.value.length ? rows.find(row => row.tab) : rows[0]
  if (!first) {
    if (priceGroups.value.length) openSearch(priceGroups.value[0].name)
    return
  }
  if (first.tab) toggleOpen(first.tab)
  else activate(first)
  closePopup()
}
function turnOn (wmType: string) {
  const config = ensureWokeConfig(AppConfig())
  for (const m of MODULES) {
    if (m.widgetTypes.includes(wmType)) setModuleOn(config, m.id, true)
  }
}
// A dock-only tool has no window to open, so its settings are the way in.
const DOCK_ONLY_PAGES: Record<string, string> = { 'woke-campaign': 'Campaign & run timer' }
function openModuleSettings (wmType: string) {
  const settings = wm.widgets.value.find(w => w.wmType === 'settings')
  if (!settings) return
  wm.setFlag(settings.wmId, `settings::page=${DOCK_ONLY_PAGES[wmType] ?? typeName(wmType)}`, true)
  wm.show(settings.wmId)
}
// Once it's mounted: its default hotkeys are set then, and whether a running
// module needs the game log depends on it being placed.
function afterMount (fn: () => void) {
  nextTick(() => nextTick(() => {
    fn()
    pushHostConfig()
  }))
}
// One that's already placed (a module just turned back on) comes back as it was.
function placeAndOpen (wmType: string) {
  const placed = AppConfig().widgets.find(w => w.wmType === wmType)
  if (!placed) placeNew(wmType)
  else if (placed.wmFlags.includes('menu::skip')) afterMount(() => openModuleSettings(wmType))
  else afterMount(() => wm.show(placed.wmId))
}
function placeNew (wmType: string) {
  wm.create(wmType)
  const created = wm.widgets.value.reduce((a, b) => (a.wmId > b.wmId ? a : b))
  // A window's own remove button leaves its id behind, and ids get reused.
  props.config.pinned = (props.config.pinned ?? []).filter(id => id !== created.wmId)
  setLabel(created.wmId, '')
  afterMount(() => wm.show(created.wmId))
}
// Only tools that can hold different content: a second Settings can't work.
function canAddCopy (wmType: string) {
  if (!allowsCopies(wmType) || wmType === 'stash-search') return false
  return registry.widgets.some(({ widget }) => widget.type === wmType && widget.instances === 'multi')
}

// Prices for what's typed. Clicking one opens the full search on it.
const snapshot = useSearchSnapshot()
const divine = computed(() => snapshot.value?.divine ?? null)
const priceGroups = computed(() => {
  if (popup.value?.kind !== 'launcher') return []
  return searchPrices(snapshot.value?.items ?? [], launcherQuery.value, { limit: 5 })
})
function openSearch (text: string) {
  closePopup()
  searchRequest.value = { query: text }
}

// An item pasted into the box, or anywhere in the overlay outside a text
// field, goes to the price check. Other text in the box is a search.
function sendItem (text: string, from: HTMLElement | null | undefined) {
  closePopup()
  const r = from?.getBoundingClientRect()
  // The rail is hidden while another exclusive window (a price check) is up.
  emit('paste', text, r?.width ? r : new DOMRect(onRight.value ? window.innerWidth : 0, 0, 0, 0))
}
function onBoxPaste (e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!looksLikeItem(text)) return
  e.preventDefault()
  const box = e.target as HTMLElement
  sendItem(text, box)
}
function onOverlayPaste (e: ClipboardEvent) {
  if (!wm.active.value) return
  // A price check would close Settings, which isn't what a stray paste there means.
  if (wm.widgets.value.some(w => w.wmType === 'settings' && w.wmWants === 'show')) return
  const target = e.target
  if (target instanceof Element && target.closest('input, textarea, [contenteditable]')) return
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!looksLikeItem(text)) return
  e.preventDefault()
  sendItem(text, railEl.value)
}
onMounted(() => document.addEventListener('paste', onOverlayPaste))
onBeforeUnmount(() => document.removeEventListener('paste', onOverlayPaste))

</script>

<style module>
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px;
  border-radius: var(--w-r-md);
  overflow-y: auto;
  scrollbar-width: none;
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
}
.rail.atEdge { border-left: 0; border-radius: 0 var(--w-r-md) var(--w-r-md) 0; }
.flat { flex-direction: row; overflow-x: auto; overflow-y: hidden; }
.ic {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 32px;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
}
.ic:hover { background: var(--w-panel-3); color: var(--w-fg); }
.ic.open { background: var(--w-accent-soft); color: var(--w-fg); }
.ic.open::after {
  content: "";
  position: absolute;
  right: 1px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: var(--w-r-sm);
  background: var(--w-accent);
}
.onRight .ic.open::after { right: auto; left: 1px; }
.flat .ic.open::after { left: 6px; right: 6px; top: auto; bottom: 1px; width: auto; height: 2px; }
.dragged { opacity: 0.35; }
.dropBefore { box-shadow: 0 -2px 0 var(--w-accent); }
.dropAfter { box-shadow: 0 2px 0 var(--w-accent); }
.flat .dropBefore { box-shadow: -2px 0 0 var(--w-accent); }
.flat .dropAfter { box-shadow: 2px 0 0 var(--w-accent); }
.ghost {
  position: fixed; z-index: 9999; transform: translate(-50%, -50%); pointer-events: none;
  color: var(--w-fg); background: var(--w-panel); border: 1px solid var(--w-accent); box-shadow: var(--w-shadow);
}
.tools { background: var(--w-panel-3); color: var(--w-fg); }
.tools:hover, .toolsOn { background: color-mix(in srgb, var(--w-accent) 22%, transparent); }
.warn { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 14%, transparent); }
.warn:hover { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 24%, transparent); }
.badge {
  position: absolute;
  right: 1px;
  top: 1px;
  min-width: 13px;
  height: calc(13px * var(--w-text-scale, 1));
  padding: 0 2px;
  border-radius: var(--w-r-sm);
  font: var(--w-fs-xs)/calc(13px * var(--w-text-scale, 1)) var(--w-num);
  text-align: center;
  color: var(--w-accent-fg);
  background: var(--w-warn);
}
.flat .grip { width: 14px; height: 32px; }
.flat .grip i { transform: rotate(90deg); }
.grip { flex: none; display: grid; place-items: center; width: 34px; height: 14px; color: var(--w-faint); font-size: var(--w-fs-xs); }
.grip:hover { color: var(--w-dim); }
.top { position: relative; flex: none; display: grid; place-items: center; width: 34px; }
.mark { width: var(--w-icon-md); height: var(--w-icon-md); margin: 3px 0 1px; pointer-events: none; }
.cfg { position: absolute; left: 0; top: 50%; transform: translateY(-50%); opacity: 0; pointer-events: none; }
.rail:hover .cfg, .cfg:focus-visible { opacity: 1; pointer-events: auto; }
.rail:hover .mark { visibility: hidden; }
.sep { flex: none; width: 22px; height: 1px; margin: 4px 0; background: var(--w-line); }
.flat .sep { width: 1px; height: 22px; margin: 0 4px; }

.tip {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: var(--w-s2);
  padding: 4px 10px;
  transform: translateY(-50%);
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-tip-bg);
  color: var(--w-fg);
  font-family: var(--w-head);
  font-size: var(--w-fs-lg);
  letter-spacing: var(--w-head-track);
  white-space: nowrap;
  pointer-events: none;
}
.tipLeft { transform: translate(-100%, -50%); }
.tipOpen { font: var(--w-fs-sm) var(--w-body); letter-spacing: 0; color: var(--w-accent); }

.dup {
  font: var(--w-fs-xs) var(--w-num);
  color: var(--w-down);
  border: 1px solid color-mix(in srgb, var(--w-down) 45%, transparent);
  border-radius: var(--w-r-sm);
  padding: 0 3px;
  letter-spacing: 0;
}
.iconBtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
}
.iconBtn:hover { background: var(--w-panel-3); color: var(--w-fg); }

.backdrop { position: fixed; inset: 0; z-index: 9998; }
.menu {
  position: fixed;
  z-index: 9999;
  min-width: 220px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  background: var(--w-panel);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-md);
  box-shadow: var(--w-shadow);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
}

.launcher { box-sizing: border-box; width: 900px; max-width: calc(100vw - 8px); padding: 10px; background: var(--w-panel-solid); }
.find {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 36px;
  flex: none;
  padding: 0 10px;
  margin-bottom: 10px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  color: var(--w-dim);
}
.findInput {
  flex: 1;
  min-width: 0;
  height: 18px;
  padding: 0;
  resize: none;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  outline: 0;
  background: none;
  color: var(--w-fg);
  font: var(--w-fs-md)/calc(18px * var(--w-text-scale, 1)) var(--w-body);
}
.findInput::placeholder { color: var(--w-dim); }
.prices { margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--w-line); }
.priceRow { display: flex; align-items: center; gap: 9px; width: 100%; height: 32px; padding: 0 7px; border-radius: var(--w-r-sm); text-align: left; }
.priceRow:hover { background: var(--w-accent-soft); }
.priceSub { color: var(--w-dim); font-size: var(--w-fs-sm); white-space: nowrap; }
.priceNow { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; }
.cols { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px 10px; align-items: start; }
.row {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 4px 0 7px;
  border-radius: var(--w-r-sm);
}
.row:hover { background: var(--w-accent-soft); }
.rowMain { flex: 1; min-width: 0; height: 100%; display: flex; align-items: center; gap: 9px; text-align: left; color: var(--w-fg); }
.rowMain > i { color: var(--w-dim); }
.rowName { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rowOpen .rowName { color: var(--w-accent); }
.pin {
  flex: none;
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
  opacity: 0;
}
.pin:hover { color: var(--w-fg); background: var(--w-panel-3); }
.pinOn, .pinOn:hover { color: var(--w-accent); }
.row:hover .pin, .pinOn, .pin:focus-visible { opacity: 1; }
.none { padding: 10px 8px; color: var(--w-dim); }
.rowTag { flex: none; padding: 0 4px; font-size: var(--w-fs-sm); color: var(--w-dim); }
.rowOff .rowName, .rowOff .rowMain > * { opacity: 0.55; }

.head {
  padding: 5px 8px 3px;
  font-size: var(--w-fs-caps);
  font-weight: var(--w-caps-weight);
  color: var(--w-dim);
  letter-spacing: 0.05em;
  text-transform: var(--w-caps-case);
  font-family: var(--w-caps-face);
}
.item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--w-r-sm);
  text-align: left;
  white-space: nowrap;
}
.item > i { width: 14px; text-align: center; font-size: var(--w-fs-md); color: var(--w-dim); }
.item:hover:not(:disabled) { background: var(--w-accent-soft); }
.item:disabled { color: var(--w-faint); }
.danger, .danger > i { color: var(--w-down); }
.rule { border: 0; border-top: 1px solid var(--w-line); margin: 4px 2px; }
.chipHead { padding: 5px 8px 3px; font-size: var(--w-fs-sm); color: var(--w-dim); }
.chips { display: flex; gap: 4px; padding: 0 6px 5px; }
.chip {
  flex: 1 1 0; min-width: 0; height: 26px; padding: 0 2px;
  border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
  font-size: var(--w-fs-sm); color: var(--w-fg);
}
.chip:hover { background: var(--w-accent-soft); }
.chipOn { background: var(--w-accent-soft); border-color: var(--w-accent); }
.layoutMenu { box-sizing: border-box; width: 240px; }
.hint { padding: 3px 8px 5px; font-size: var(--w-fs-xs); color: var(--w-faint); }
.tipFlat { transform: translate(-50%, -50%); }
.renameRow { display: flex; gap: 4px; padding: 2px; }
.input {
  flex: 1;
  min-width: 0;
  height: 26px;
  padding: 0 8px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  color: var(--w-fg);
}
</style>
