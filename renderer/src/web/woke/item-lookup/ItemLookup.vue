<template>
  <WPanel ref="panel" size-key="item-lookup" :title="request.item?.info.name ?? 'Bookmarks'" :scroll="false"
    width="60vw" height="88vh" max-height="none">
    <template #actions>
      <span v-if="activeKey" class="flex items-center gap-1 w-dim text-xs whitespace-nowrap mr-1">
        <WKbd :keys="activeKey" /> Your browser
      </span>
      <span class="flex items-center gap-1 w-dim text-xs whitespace-nowrap mr-1">
        <WKbd keys="Esc" /> Back to game
      </span>
      <template v-if="tab !== 'bookmarks'">
        <button class="w-icon-btn" :class="{ 'w-icon-btn--on': starred }" :title="starTitle" :aria-label="starTitle" @click="toggleStar">
          <i :class="starred ? 'fas fa-star' : 'far fa-star'" />
        </button>
        <button class="w-icon-btn" :title="popOutTitle" :aria-label="popOutTitle" @click="popOut">
          <i class="fas fa-external-link-alt" />
        </button>
      </template>
      <button class="w-icon-btn" title="Back to game" aria-label="Back to game" @click="close">
        <i class="fas fa-times" />
      </button>
    </template>
    <template #tabs>
      <WTabs :model-value="tab" :options="tabOptions" @update:model-value="selectTab($event as PanelTab)" />
    </template>
    <!-- Tabs load when first opened and keep their place when you flip between them. -->
    <webview v-for="t in opened" :key="t" v-show="t === tab" :ref="(el: unknown) => setView(t, el)" :src="urls[t]"
      class="pointer-events-auto w-full h-full flex" width="100%" height="100%" />
    <div v-show="tab === 'bookmarks'" class="pointer-events-auto w-full h-full flex flex-col min-h-0">
      <div v-if="bookmarks.length" style="padding: 8px var(--w-pad);">
        <WSearchField v-model="filter" things="bookmarks" />
      </div>
      <div class="w-scroll flex-1 min-h-0">
        <WListItem v-for="b in shown" :key="b.id" :active="tab === 'bookmarks' && pageId === b.id" @select="openBookmark(b)">
          <span class="w-trunc">{{ b.name }}</span>
          <template #sub>{{ b.url }}</template>
          <template #actions>
            <button class="w-icon-btn" title="Open in your browser" aria-label="Open in your browser" @click="openExternal(b.url)">
              <i class="fas fa-external-link-alt" />
            </button>
            <button class="w-icon-btn" title="Remove" aria-label="Remove" @click="remove(b)">
              <i class="fas fa-trash" />
            </button>
          </template>
        </WListItem>
        <WNoMatch v-if="bookmarks.length && !shown.length" :query="filter" @clear="filter = ''" />
        <WEmpty v-else-if="!bookmarks.length" icon="far fa-star">
          No bookmarks yet. Press the star on a page to save it here.
        </WEmpty>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { Host, MainProcess } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'
import type { ItemCheckWidget } from '@/web/item-check/widget'
import { WEmpty, WKbd, WListItem, WPanel, WTabs, toast } from '../ui'
import WSearchField from '../ui/WSearchField.vue'
import WNoMatch from '../ui/WNoMatch.vue'
import {
  POP_OUT_GUARD_MS, TAB_LABELS, isWebUrl, lookupKeyAction, lookupTabs, lookupUrl, matchBookmarks, panelKey, popOutUrl, toggleBookmark
} from './lookup'
import type { Bookmark, LookupKeys, LookupRequest, PanelTab } from './lookup'

const props = defineProps<{
  request: LookupRequest
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

type ViewEl = HTMLElement & { src: string, getURL?: () => string, getTitle?: () => string }

const tab = shallowRef<PanelTab>(props.request.tab)
const opened = shallowRef<PanelTab[]>(props.request.tab === 'bookmarks' ? [] : [props.request.tab])
const views = new Map<PanelTab, ViewEl>()
const wired = new WeakSet<ViewEl>()
const currentUrls = shallowRef<Partial<Record<PanelTab, string>>>({})
let lastJumpAt = performance.now()
const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const filter = shallowRef('')
const page = shallowRef<Bookmark | null>(null)
const pageId = computed(() => page.value?.id)

// A webview throws if asked before it has attached.
function viewUrl (t: PanelTab) {
  try { return views.get(t)?.getURL?.() } catch { return undefined }
}
function viewTitle (t: PanelTab) {
  try { return views.get(t)?.getTitle?.() } catch { return undefined }
}

function setView (t: PanelTab, el: unknown) {
  if (!el) {
    views.delete(t)
    return
  }
  const view = el as ViewEl
  views.set(t, view)
  // An inline ref runs again on every render.
  if (wired.has(view)) return
  wired.add(view)
  const note = () => {
    currentUrls.value = { ...currentUrls.value, [t]: viewUrl(t) }
  }
  view.addEventListener('did-navigate', note)
  view.addEventListener('did-navigate-in-page', note)
}

const widget = computed(() => AppConfig('item-check') as ItemCheckWidget)
const bookmarks = computed(() => widget.value.bookmarks)
const shown = computed(() => matchBookmarks(bookmarks.value, filter.value))

const keys = computed<LookupKeys>(() => ({
  wiki: panelKey(widget.value.wikiKey),
  poedb: panelKey(widget.value.poedbKey),
  coe: panelKey(widget.value.craftOfExileKey),
  bookmarks: panelKey(widget.value.bookmarksKey)
}))
const activeKey = computed(() => tab.value === 'bookmarks' || tab.value === 'page' ? null : keys.value[tab.value])
const popOutTitle = computed(() => activeKey.value ? `Open in your browser (${activeKey.value})` : 'Open in your browser')

const itemTabs = computed(() => lookupTabs(props.request.item, props.request.tab))
const tabOptions = computed(() => [
  ...itemTabs.value.map(t => ({ value: t as PanelTab, label: TAB_LABELS[t], count: keys.value[t] ?? undefined })),
  ...(page.value ? [{ value: 'page' as PanelTab, label: page.value.name, count: undefined }] : []),
  { value: 'bookmarks' as PanelTab, label: 'Bookmarks', count: keys.value.bookmarks ?? (bookmarks.value.length || undefined) }
])

const urls = computed(() => {
  const language = AppConfig().language
  const out: Partial<Record<PanelTab, string>> = {}
  const { item } = props.request
  if (item) {
    for (const t of itemTabs.value) out[t] = lookupUrl(t, item, language)
  }
  if (page.value) out.page = page.value.url
  return out
})

const liveUrl = computed(() => currentUrls.value[tab.value] ?? urls.value[tab.value])
const starred = computed(() => bookmarks.value.some(b => b.url === liveUrl.value))
const starTitle = computed(() => starred.value ? 'Remove from bookmarks' : 'Save to bookmarks')

function selectTab (t: PanelTab) {
  if (t !== 'bookmarks' && !opened.value.includes(t)) opened.value = [...opened.value, t]
  tab.value = t
}

function toggleStar () {
  const url = viewUrl(tab.value) || urls.value[tab.value]
  widget.value.bookmarks = toggleBookmark(bookmarks.value, url, viewTitle(tab.value))
  currentUrls.value = { ...currentUrls.value, [tab.value]: url }
}

function openBookmark (b: Bookmark) {
  // The same link doesn't reload the view, so one you've browsed away from needs telling.
  const view = page.value?.id === b.id ? views.get('page') : undefined
  if (view && viewUrl('page') !== b.url) view.src = b.url
  page.value = b
  currentUrls.value = { ...currentUrls.value, page: undefined }
  selectTab('page')
}

// No "are you sure": remove now, offer Undo.
function remove (b: Bookmark) {
  const at = bookmarks.value.findIndex(o => o.id === b.id)
  widget.value.bookmarks = bookmarks.value.filter(o => o.id !== b.id)
  toast(`Removed "${b.name}"`, {
    anchor: panel.value?.el,
    undo: () => {
      const list = bookmarks.value
      if (list.some(o => o.url === b.url)) return
      widget.value.bookmarks = [...list.slice(0, at), b, ...list.slice(at)]
    }
  })
}

function openExternal (url: string) {
  if (!isWebUrl(url)) return
  window.open(url)
  emit('close')
}

function popOut () {
  const fallback = urls.value[tab.value]
  if (fallback) openExternal(popOutUrl(viewUrl(tab.value), fallback))
}

function close () {
  emit('close')
  Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
}

// With the overlay focused the game's hotkeys are off, so main passes these on.
const keyController = MainProcess.onEvent('MAIN->OVERLAY::woke-panel-key', ({ key }) => {
  const action = lookupKeyAction(key, tab.value, itemTabs.value, keys.value)
  if (!action) return
  if (action.type === 'switch') {
    selectTab(action.tab)
    lastJumpAt = performance.now()
  } else if (performance.now() - lastJumpAt >= POP_OUT_GUARD_MS) {
    popOut()
  }
})

function sendKeys (list: string[]) {
  Host.sendEvent({ name: 'OVERLAY->MAIN::woke-panel-keys', payload: { keys: list } })
}

onMounted(() => {
  sendKeys(Object.values(keys.value).filter((k): k is string => k != null))
})
onBeforeUnmount(() => {
  keyController.abort()
  sendKeys([])
})
</script>
