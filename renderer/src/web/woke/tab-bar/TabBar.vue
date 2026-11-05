<template>
  <div :class="$style.bar" class="w-surface" :style="barStyle" data-widget-drag>
    <template v-for="(tab, i) in pinnedTabs" :key="tab.wmId">
      <span v-if="i > 0 && !tab.iconOnly && pinnedTabs[i - 1].iconOnly" :class="$style.sep" />
      <button
        :class="[$style.tab, { [$style.open]: tab.open, [$style.iconOnly]: tab.iconOnly }]"
        :title="tab.iconOnly ? tab.name : undefined"
        @click="toggle(tab)" @auxclick.prevent="onAux(tab, $event)" @contextmenu.prevent="openMenu(tab, $event)">
        <i class="fas" :class="tab.icon" />
        <span v-if="!tab.iconOnly">{{ tab.name }}</span>
        <span v-if="tab.copies > 1" :class="$style.dup" title="Several copies of this tool">×{{ tab.copies }}</span>
        <span v-if="!tab.iconOnly" :class="$style.x" title="Remove from bar" @click.stop="dismiss(tab)"><i class="fas fa-times" /></span>
      </button>
    </template>
    <span v-if="pinnedTabs.length" :class="$style.sep" />
    <button v-for="tab in openUnpinned" :key="tab.wmId"
      :class="[$style.tab, $style.open]"
      @click="toggle(tab)" @auxclick.prevent="onAux(tab, $event)" @contextmenu.prevent="openMenu(tab, $event)">
      <i class="fas" :class="tab.icon" />
      <span>{{ tab.name }}</span>
      <span v-if="tab.copies > 1" :class="$style.dup">×{{ tab.copies }}</span>
      <span :class="$style.x" title="Remove from bar" @click.stop="dismiss(tab)"><i class="fas fa-times" /></span>
    </button>
    <button v-if="closedUnpinned.length" :class="$style.more" @click="openPopup('more', $event)">
      More <span :class="$style.count">{{ closedUnpinned.length }}</span> <i class="fas fa-chevron-down" />
    </button>
    <button :class="$style.iconBtn" title="Add a tool" @click="openPopup('add', $event)"><i class="fas fa-plus" /></button>
    <button v-if="hotkeys.problems.value" :class="$style.warnBtn" :title="`${hotkeys.summary.value}. Click for the hotkey list.`" @click="openHotkeyList">
      <i class="fas fa-exclamation-triangle" /> Hotkeys <span :class="$style.count">{{ hotkeys.problems.value }}</span>
    </button>
    <textarea :class="$style.paste" rows="1" spellcheck="false"
      placeholder="Paste item (Ctrl V)" @input="$emit('paste', $event)" />

    <Teleport to="body">
      <div v-if="popup" :class="$style.backdrop" @mousedown="closePopup" @contextmenu.prevent="closePopup" />

      <!-- right-click menu -->
      <div v-if="popup?.kind === 'menu' && menuTab" ref="popupEl" :class="$style.menu" :style="popupStyle" @contextmenu.prevent>
        <div :class="$style.head">{{ menuTab.name }}</div>
        <button :class="$style.item" @click="toggle(menuTab); closePopup()">
          <i class="fas" :class="menuTab.open ? 'fa-eye-slash' : 'fa-eye'" />{{ menuTab.open ? 'Close window' : 'Open' }}
        </button>
        <button v-if="!menuTab.iconOnly" :class="$style.item" @click="dismiss(menuTab); closePopup()">
          <i class="fas fa-times" />Remove from bar
          <span :class="$style.hint">×, middle click</span>
        </button>
        <button :class="$style.item" @click="togglePin(menuTab); closePopup()">
          <i class="fas fa-thumbtack" />{{ menuTab.pinned ? 'Unpin from bar' : 'Pin to bar' }}
        </button>
        <template v-if="menuTab.pinned">
          <button :class="$style.item" :disabled="!canShift(menuTab, -1)" @click="shift(menuTab, -1)"><i class="fas fa-chevron-left" />Move left</button>
          <button :class="$style.item" :disabled="!canShift(menuTab, 1)" @click="shift(menuTab, 1)"><i class="fas fa-chevron-right" />Move right</button>
        </template>
        <hr :class="$style.rule">
        <button v-if="menuTab.hasAnchor" :class="$style.item" @click="resetPosition(menuTab); closePopup()">
          <i class="fas fa-undo" />Reset window position
        </button>
        <div v-if="renaming" :class="$style.renameRow">
          <input ref="renameInput" v-model="renameValue" :class="$style.input" placeholder="Tab name"
            @keydown.enter="commitRename" @keydown.esc="closePopup">
          <button :class="$style.iconBtn" title="Save" @click="commitRename"><i class="fas fa-check" /></button>
        </div>
        <button v-else-if="!menuTab.iconOnly" :class="$style.item" @click="startRename"><i class="fas fa-pen" />Rename</button>
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

      <!-- More: added but not pinned -->
      <div v-if="popup?.kind === 'more'" ref="popupEl" :class="$style.menu" :style="popupStyle" @contextmenu.prevent>
        <div :class="$style.head">Not pinned</div>
        <button v-for="tab in closedUnpinned" :key="tab.wmId" :class="$style.item"
          @click="show(tab); closePopup()" @contextmenu.prevent.stop="openMenu(tab, $event)">
          <i class="fas" :class="tab.icon" />{{ tab.name }}
          <span v-if="tab.copies > 1" :class="$style.dup">×{{ tab.copies }}</span>
        </button>
        <div :class="$style.foot">Right-click a tool to pin it</div>
      </div>

      <!-- Add a tool -->
      <div v-if="popup?.kind === 'add'" ref="popupEl" :class="[$style.menu, $style.addList]" :style="popupStyle" @contextmenu.prevent>
        <div :class="$style.search">
          <i class="fas fa-search" />
          <input ref="searchInput" v-model="query" :class="$style.searchInput" placeholder="Find a tool"
            @keydown.esc="closePopup" @keydown.enter="addFirstMatch">
        </div>
        <div :class="$style.scroll">
          <template v-for="group in addGroups" :key="group.label">
            <div :class="$style.head">{{ group.label }}</div>
            <button v-for="spec in group.types" :key="spec.type" :class="$style.item" @click="add(spec.type)">
              <i class="fas" :class="iconFor(spec.type)" />{{ spec.name }}
              <span :class="[$style.state, { [$style.stateOn]: stateOf(spec.type) === 'Pinned' }]">{{ stateOf(spec.type) }}</span>
            </button>
          </template>
          <template v-if="removedTabs.length">
            <div :class="$style.head">Removed from bar</div>
            <button v-for="tab in removedTabs" :key="tab.wmId" :class="$style.item" @click="restore(tab)">
              <i class="fas" :class="tab.icon" />{{ tab.name }}
              <span :class="$style.state">Put back</span>
            </button>
          </template>
          <div v-if="!addGroups.length && !removedTabs.length" :class="$style.foot">No tool matches "{{ query }}"</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { computed, inject, nextTick, ref, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import type { Widget, Anchor } from '@/web/overlay/widgets'
import { registry } from '@/web/overlay/widget-registry'
import { AppConfig } from '@/web/Config'
import { isWidgetTypeOn } from '@/web/woke/modules'
import { useI18n } from 'vue-i18n'
import { useHotkeyHealth } from '../switchboard/hotkey-health'
import { iconFor, allowsCopies, groupTypes } from './tools'
import type { TabBarConfig } from './tools'

const props = defineProps<{ config: TabBarConfig }>()
defineEmits<{ (e: 'paste', ev: Event): void }>()

const wm = inject<WidgetManager>('wm')!
const { t } = useI18n()

interface Tab {
  wmId: number
  wmType: string
  name: string
  icon: string
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

// First run on this config: keep everything that was in the old bar pinned.
if (!props.config.pinned) {
  props.config.pinned = listed.value.map(w => w.wmId)
}

const tabs = computed<Tab[]>(() => {
  const counts = new Map<string, number>()
  for (const w of listed.value) counts.set(w.wmType, (counts.get(w.wmType) ?? 0) + 1)
  const pinned = props.config.pinned ?? []
  return listed.value.map(w => {
    const m = w.wmTitle.match(/^(?:\{icon=(?<icon>[^}]+)\}\s*)?(?<title>.*)$/)
    const custom = props.config.labels?.[w.wmId]
    const title = custom || m?.groups?.title || ''
    return {
      wmId: w.wmId,
      wmType: w.wmType,
      name: title || typeName(w.wmType) || `#${w.wmId}`,
      icon: m?.groups?.icon ?? iconFor(w.wmType),
      iconOnly: !title && !!m?.groups?.icon,
      open: w.wmWants === 'show',
      pinned: pinned.includes(w.wmId),
      copies: allowsCopies(w.wmType) ? 1 : counts.get(w.wmType)!,
      removable: w.wmType !== 'settings',
      hasAnchor: 'anchor' in w
    }
  })
})

// Keep the bar on screen: it wraps onto a second row instead of running past
// the right edge, with a margin beside it.
const barStyle = computed(() => {
  const { pos, x } = props.config.anchor
  const room = pos.endsWith('l') ? 100 - x : pos.endsWith('r') ? x : 2 * Math.min(x, 100 - x)
  return { maxWidth: `calc(${room}vw - 96px)` }
})

const pinnedTabs = computed(() => {
  const byId = new Map(tabs.value.map(tab => [tab.wmId, tab]))
  return (props.config.pinned ?? []).map(id => byId.get(id)).filter((x): x is Tab => !!x)
})
// Removed with ×: off the bar until put back from the add list. A removed
// tool that gets opened another way (e.g. its hotkey) still shows while open.
const isDismissed = (wmId: number) => (props.config.dismissed ?? []).includes(wmId)
const openUnpinned = computed(() => tabs.value.filter(tab => !tab.pinned && tab.open))
const closedUnpinned = computed(() => tabs.value.filter(tab => !tab.pinned && !tab.open && !isDismissed(tab.wmId)))
const removedTabs = computed(() => {
  const q = query.value.trim().toLowerCase()
  return tabs.value.filter(tab => !tab.pinned && !tab.open && isDismissed(tab.wmId) &&
    (!q || tab.name.toLowerCase().includes(q)))
})

// Two actions on one key, or a key another program holds: either way one
// of them silently does nothing, so say so where it's always seen.
const hotkeys = useHotkeyHealth()
function openHotkeyList () {
  const settings = wm.widgets.value.find(w => w.wmType === 'settings')
  if (!settings) return
  wm.setFlag(settings.wmId, 'settings::page=Hotkey list', true)
  wm.show(settings.wmId)
}

function show (tab: Pick<Tab, 'wmId'>) { wm.show(tab.wmId) }
function close (tab: Pick<Tab, 'wmId'>) { wm.hide(tab.wmId) }
function toggle (tab: Tab) {
  if (tab.open) close(tab)
  else show(tab)
}
function onAux (tab: Tab, e: MouseEvent) { if (e.button === 1 && !tab.iconOnly) dismiss(tab) }
function dismiss (tab: Pick<Tab, 'wmId'>) {
  close(tab)
  props.config.pinned = (props.config.pinned ?? []).filter(id => id !== tab.wmId)
  if (!isDismissed(tab.wmId)) props.config.dismissed = [...(props.config.dismissed ?? []), tab.wmId]
}
function restore (tab: Pick<Tab, 'wmId'>) {
  props.config.dismissed = (props.config.dismissed ?? []).filter(id => id !== tab.wmId)
  if (!(props.config.pinned ?? []).includes(tab.wmId)) props.config.pinned = [...(props.config.pinned ?? []), tab.wmId]
  show(tab)
  closePopup()
}

function togglePin (tab: Tab) {
  const pinned = props.config.pinned ?? []
  props.config.dismissed = (props.config.dismissed ?? []).filter(id => id !== tab.wmId)
  props.config.pinned = tab.pinned ? pinned.filter(id => id !== tab.wmId) : [...pinned, tab.wmId]
}
function canShift (tab: Tab, dir: -1 | 1) {
  const i = pinnedTabs.value.findIndex(x => x.wmId === tab.wmId)
  return i + dir >= 0 && i + dir < pinnedTabs.value.length
}
function shift (tab: Tab, dir: -1 | 1) {
  if (!canShift(tab, dir)) return
  // Swap with the neighbour shown on the bar, inside the full pinned list:
  // pins of switched-off modules (not shown) must survive the move.
  const shown = pinnedTabs.value.map(x => x.wmId)
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
  show(tab)
}

function forget (wmId: number) {
  props.config.pinned = (props.config.pinned ?? []).filter(id => id !== wmId)
  props.config.dismissed = (props.config.dismissed ?? []).filter(id => id !== wmId)
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
  if (!props.config.pinned!.includes(tab.wmId)) props.config.pinned!.push(tab.wmId)
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

// popups
// y: where the popup's top goes when it opens downward; above: where its
// bottom goes when there is no room below and it opens upward instead.
const popup = ref<{ kind: 'menu' | 'more' | 'add', x: number, y: number, above: number, up?: boolean, wmId?: number } | null>(null)
const popupEl = ref<HTMLElement | null>(null)
const menuTab = computed(() => tabs.value.find(tab => tab.wmId === popup.value?.wmId))
const popupStyle = computed(() => {
  if (!popup.value) return {}
  const x = Math.min(popup.value.x, window.innerWidth - (popup.value.kind === 'add' ? 290 : 240))
  const left = `${Math.max(4, x)}px`
  return popup.value.up
    ? { left, bottom: `${window.innerHeight - popup.value.above}px`, maxHeight: `${popup.value.above - 4}px`, overflowY: 'auto' as const }
    : { left, top: `${popup.value.y}px` }
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
  confirmRemove.value = false
  renaming.value = false
  popup.value = { kind: 'menu', x: e.clientX, y: e.clientY, above: e.clientY, wmId: tab.wmId }
  placePopup()
}
function openPopup (kind: 'more' | 'add', e: MouseEvent) {
  if (popup.value?.kind === kind) { closePopup(); return }
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  popup.value = { kind, x: r.left, y: r.bottom + 4, above: r.top - 4 }
  placePopup()
  if (kind === 'add') {
    query.value = ''
    nextTick(() => searchInput.value?.focus())
  }
}
function closePopup () {
  popup.value = null
  renaming.value = false
  confirmRemove.value = false
}
watch(() => wm.active.value, active => { if (!active) closePopup() })

// add list
const query = ref('')
const searchInput = ref<HTMLInputElement>()
const addable = computed(() => registry.widgets
  .filter(({ widget }) => widget.instances === 'multi' && widget.type !== 'stash-search' && isWidgetTypeOn(AppConfig(), widget.type))
  .map(({ widget }) => ({ type: widget.type, name: typeName(widget.type) })))
const addGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  return groupTypes(q ? addable.value.filter(s => s.name.toLowerCase().includes(q)) : addable.value)
})
function stateOf (wmType: string): string {
  const mine = tabs.value.filter(tab => tab.wmType === wmType)
  if (allowsCopies(wmType)) return mine.length ? `${mine.length} placed · Add another` : 'Add'
  if (!mine.length || mine.every(tab => isDismissed(tab.wmId) && !tab.open)) return 'Add'
  return mine.some(tab => tab.pinned) ? 'Pinned' : 'In bar'
}
function add (wmType: string) {
  const existing = tabs.value.find(tab => tab.wmType === wmType)
  if (existing && !allowsCopies(wmType)) {
    restore(existing)
    return
  }
  wm.create(wmType)
  const created = wm.widgets.value.reduce((a, b) => (a.wmId > b.wmId ? a : b))
  props.config.pinned = [...(props.config.pinned ?? []), created.wmId]
  closePopup()
  // The widget initialises on mount; show it once that has happened.
  nextTick(() => nextTick(() => wm.show(created.wmId)))
}
function addFirstMatch () {
  const first = addGroups.value[0]?.types[0]
  if (first) add(first.type)
}
</script>

<style module>
.bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: var(--w-r-md);
  flex-wrap: wrap;
  white-space: nowrap;
  font-family: var(--w-body);
  font-size: var(--w-text);
}
.warnBtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--w-r-sm);
  color: var(--w-warn);
  background: color-mix(in srgb, var(--w-warn) 14%, transparent);
}
.warnBtn:hover { background: color-mix(in srgb, var(--w-warn) 24%, transparent); }
.sep { width: 1px; height: 20px; background: var(--w-line); margin: 0 3px; flex: none; }
.tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 6px 0 8px;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
  font-family: var(--w-head);
  font-size: var(--w-head-size);
  letter-spacing: var(--w-head-track);
}
.tab:hover { background: var(--w-panel-3); color: var(--w-fg); }
.tab.open { color: var(--w-fg); background: var(--w-accent-soft); }
.tab.open::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 1px;
  height: 2px;
  border-radius: var(--w-r-sm);
  background: var(--w-accent);
}
.tab.iconOnly { padding: 0 8px; }
.tab > i { font-size: var(--w-fs-md); opacity: 0.85; }
.x {
  display: inline-grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: var(--w-r-sm);
  font-size: var(--w-fs-xs);
  color: var(--w-faint);
  visibility: hidden;
}
.tab:hover .x, .tab.open .x { visibility: visible; }
.x:hover { color: var(--w-down); background: color-mix(in srgb, var(--w-down) 18%, transparent); }
.dup {
  font: var(--w-fs-xs) var(--w-num);
  color: var(--w-down);
  border: 1px solid color-mix(in srgb, var(--w-down) 45%, transparent);
  border-radius: var(--w-r-sm);
  padding: 0 3px;
  letter-spacing: 0;
}
.more, .iconBtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
}
.more:hover, .iconBtn:hover { background: var(--w-panel-3); color: var(--w-fg); }
.more i { font-size: var(--w-fs-xs); }
.count {
  font: var(--w-fs-xs) var(--w-num);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  padding: 0 4px;
  background: var(--w-panel-3);
}
.paste {
  width: 150px;
  height: 26px;
  margin-left: 4px;
  padding: 4px 8px;
  resize: none;
  overflow: hidden;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background: var(--w-panel-2);
  color: var(--w-fg);
  font-size: var(--w-text-sm);
  line-height: 16px;
}
.paste::placeholder { color: var(--w-faint); }

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
  font-size: var(--w-text);
}
.head {
  padding: 5px 8px 3px;
  font-size: var(--w-text-sm);
  font-weight: 600;
  color: var(--w-faint);
  letter-spacing: 0.05em;
  text-transform: uppercase;
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
.hint, .state { margin-left: auto; padding-left: 16px; font-size: var(--w-text-sm); color: var(--w-faint); }
.stateOn { color: var(--w-accent); }
.rule { border: 0; border-top: 1px solid var(--w-line); margin: 4px 2px; }
.foot { padding: 6px 8px 4px; font-size: var(--w-text-sm); color: var(--w-faint); }
.renameRow { display: flex; gap: 4px; padding: 2px; }
.input, .searchInput {
  flex: 1;
  min-width: 0;
  height: 26px;
  padding: 0 8px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel-2);
  color: var(--w-fg);
}
.addList { width: 280px; }
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 2px 6px 8px;
  color: var(--w-faint);
}
.searchInput { border-color: var(--w-line); }
.scroll { max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; }
</style>
