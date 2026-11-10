<template>
  <button v-if="target" ref="btn" type="button" @click="toggle" class="w-btn-soft w-dim rounded px-2"
    :title="justSaved ? 'Saved to your trade searches' : 'Save this search to your trade searches'">
    <i :class="justSaved ? 'fas fa-check' : 'far fa-bookmark'" class="text-xs" />
  </button>
  <Teleport to="body">
    <template v-if="open">
      <div :class="$style.backdrop" @mousedown="close" />
      <form ref="box" :class="[$style.box, 'w-surface', 'w-corners', 'w-enter']" :style="pos" @submit.prevent
        @keydown.esc.stop.prevent="close">
        <div class="w-group-label" :class="$style.head">{{ savedAs ? 'Saved search' : 'Save search' }}</div>
        <label :class="$style.row">
          <span :class="$style.label">Name</span>
          <input ref="nameInput" v-model="name" @keydown.enter.prevent="save" class="w-field" :class="$style.input" maxlength="120" spellcheck="false">
        </label>
        <label :class="$style.row">
          <span :class="$style.label">Folder</span>
          <input v-model="folder" @keydown.enter.prevent="save" class="w-field" :class="$style.input" :list="listId" :placeholder="SAVED_FROM_PRICE_CHECK" spellcheck="false">
          <datalist :id="listId">
            <option v-for="f in folders" :key="f" :value="f" />
          </datalist>
        </label>
        <div :class="$style.foot">
          <span v-if="savedAs" class="w-faint text-xs">Already saved. Saving renames it.</span>
          <span class="grow" />
          <WButton size="sm" variant="ghost" @click="close">Cancel</WButton>
          <WButton size="sm" variant="primary" :disabled="!name.trim()" @click="save">Save</WButton>
        </div>
      </form>
    </template>
  </Teleport>
</template>

<script setup lang="ts">
// Next to the Trade button: opens a small box to name the search and pick its
// folder, then saves it into the first Trade searches widget.
import { computed, inject, nextTick, onUnmounted, shallowRef, watch } from 'vue'
import { AppConfig, saveConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { WButton } from '../ui'
import { TRADE_SEARCHES_TYPE, SAVED_FROM_PRICE_CHECK, UNCATEGORIZED, emptyEntry, folderNames, isValidUrl, nameFromTradeUrl } from './widget'
import type { TradeSearchesWidget } from './widget'

const props = defineProps<{ getLink: () => string, suggestName?: () => string }>()

const target = computed(() => AppConfig<TradeSearchesWidget>(TRADE_SEARCHES_TYPE))
const open = shallowRef(false)
const justSaved = shallowRef(false)
const name = shallowRef('')
const folder = shallowRef('')
const url = shallowRef('')
const btn = shallowRef<HTMLElement | null>(null)
const box = shallowRef<HTMLElement | null>(null)
const nameInput = shallowRef<HTMLInputElement | null>(null)
const pos = shallowRef<Record<string, string>>({ visibility: 'hidden' })
const listId = `w-save-folders-${Math.random().toString(36).slice(2, 8)}`

// The link in the box, if it's saved already: saving then renames it.
const savedAs = computed(() => {
  const widget = target.value
  if (!widget || !url.value) return undefined
  return widget.entries.find(e => e.url === url.value)
})

// The rail's folders, empty ones too.
const folders = computed(() => {
  const widget = target.value
  const list = widget ? folderNames(widget).filter(f => f !== UNCATEGORIZED) : []
  return list.includes(SAVED_FROM_PRICE_CHECK) ? list : [...list, SAVED_FROM_PRICE_CHECK]
})

function proposedName (link: string): string {
  return props.suggestName?.() || nameFromTradeUrl(link) || 'Saved search'
}

async function toggle () {
  if (open.value) { close(); return }
  const link = props.getLink()
  if (!isValidUrl(link) || !target.value) return
  url.value = link
  const existing = savedAs.value
  name.value = existing?.name || proposedName(link)
  folder.value = existing ? existing.category : (target.value.lastFolder ?? SAVED_FROM_PRICE_CHECK)
  open.value = true
  await nextTick()
  place()
  // It's hidden until placed, and a hidden field can't take focus.
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}

// Under the button, right edges lined up, kept on screen. With CSS zoom, left
// and top are in zoomed units.
function place () {
  const b = btn.value?.getBoundingClientRect()
  const el = box.value
  if (!b || !el) return
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
  const r = el.getBoundingClientRect()
  const left = Math.max(4, Math.min(b.right - r.width, window.innerWidth - r.width - 4))
  const below = b.bottom + 4
  const top = below + r.height > window.innerHeight - 4 ? Math.max(4, b.top - r.height - 4) : below
  pos.value = { left: `${left / scale}px`, top: `${top / scale}px` }
}

function close () {
  open.value = false
  pos.value = { visibility: 'hidden' }
}

function save () {
  const widget = target.value
  const label = name.value.trim()
  if (!widget || !label || !open.value) return
  const category = folder.value.trim() || SAVED_FROM_PRICE_CHECK
  const existing = savedAs.value
  if (existing) {
    existing.name = label
    existing.category = category
  } else {
    widget.entries.push({ ...emptyEntry(widget.entries), name: label, url: url.value, category })
  }
  widget.lastFolder = category
  saveConfig()
  close()
  justSaved.value = true
  setTimeout(() => { justSaved.value = false }, 1500)
}

// The overlay gets no keys or clicks once the game has focus: never leave the
// box over the game.
const wm = inject<WidgetManager | undefined>('wm', undefined)
watch(() => wm?.active.value, (active) => { if (!active) close() })
const onBlur = () => { close() }
window.addEventListener('blur', onBlur)
onUnmounted(() => { window.removeEventListener('blur', onBlur) })
</script>

<style module>
.backdrop { position: fixed; inset: 0; z-index: 1000; }
.box {
  position: fixed; z-index: 1001; width: 20rem; padding: var(--w-s2) var(--w-s3) var(--w-s3);
  background: var(--w-panel); backdrop-filter: var(--w-blur);
  border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md); box-shadow: var(--w-shadow);
  font-family: var(--w-body); font-size: var(--w-fs-md); color: var(--w-fg);
  zoom: var(--w-ui-scale, 1);
  display: flex; flex-direction: column; gap: var(--w-s2);
}
.head { padding: 0; }
.row { display: flex; align-items: center; gap: var(--w-s2); }
.label { width: 3.5rem; flex: none; color: var(--w-dim); font-size: var(--w-fs-sm); }
.input { flex: 1; min-width: 0; height: calc(26px * var(--w-text-scale, 1)); padding: 0 8px; }
.foot { display: flex; align-items: center; gap: var(--w-s2); margin-top: var(--w-s1); }
</style>
