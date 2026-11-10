<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" readonly :removable="false">
    <WPanel ref="panel" size-key="site" title="poe.re" :scroll="false" max-height="none" width="60vw" height="80vh">
      <template #actions>
        <WButton size="sm" variant="primary" icon="fas fa-download" class="mr-1" data-qa="poe-re-save"
          title="Save the string poe.re has built to your Regex library" @click="startSave">Save to library</WButton>
        <button class="w-icon-btn mr-1" title="Reload" @click="reload"><i class="fas fa-sync-alt" /></button>
        <button class="w-icon-btn" title="Open in your browser" @click="openExternal"><i class="fas fa-external-link-alt" /></button>
      </template>
      <div class="flex flex-col w-full h-full min-h-0">
      <form v-if="pending" :class="$style.save" data-qa="poe-re-save-form" @submit.prevent="confirmSave" @keydown.enter.prevent="confirmSave">
        <span class="w-mono w-trunc" :class="$style.str" :title="pending.text">{{ pending.text }}</span>
        <WField v-model="pending.name" placeholder="Name" :clear-on-esc="false" :class="$style.name" data-qa="poe-re-name" />
        <WField v-model="pending.category" placeholder="Category" :clear-on-esc="false" :class="$style.cat" data-qa="poe-re-category" />
        <WButton size="sm" variant="primary" data-qa="poe-re-confirm" @click="confirmSave">Save</WButton>
        <WButton size="sm" variant="ghost" @click="pending = null">Cancel</WButton>
      </form>
      <webview v-if="started" ref="siteEl" :src="POE_RE_URL" class="pointer-events-auto w-full flex-1 min-h-0 flex" />
      </div>
    </WPanel>
  </Widget>
</template>

<script setup lang="ts">
// The poe.re window itself, loaded the first time it opens (WidgetPoeRe.vue).
import { computed, inject, ref, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WButton, WField, toast } from '../ui'
import { POE_RE_URL, READ_RESULT_JS, asResult, categoryFor, clipboardSearch, suggestName } from './poe-re-widget'
import type { PoeReWidget } from './poe-re'
import { SAVE_MESSAGE, saveToRegexLibrary } from './save'
import { MAX_SEARCH_LENGTH } from './widget'

const props = defineProps<{
  config: PoeReWidget
}>()

type WebviewEl = HTMLElement & {
  getURL: () => string
  reload: () => void
  executeJavaScript: (code: string) => Promise<unknown>
}

const wm = inject<WidgetManager>('wm')!

const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const siteEl = shallowRef<WebviewEl | null>(null)
// The site loads the first time the window is on screen, not at launch.
const started = shallowRef(false)
const pending = ref<{ text: string, name: string, category: string } | null>(null)

const onScreen = computed(() => props.config.wmWants === 'show' && wm.active.value)
watch(onScreen, (yes) => { if (yes) started.value = true }, { immediate: true })

// A webview throws if asked before it has attached.
function currentUrl (): string {
  try {
    const at = siteEl.value?.getURL()
    if (at && /^https:\/\//i.test(at)) return at
  } catch { /* Not attached yet. */ }
  return POE_RE_URL
}

function reload () {
  try { siteEl.value?.reload() } catch { /* Not attached yet. */ }
}

function openExternal () {
  window.open(currentUrl())
}

function note (text: string) {
  toast(text, { anchor: panel.value?.el })
}

// Reads poe.re's own result box. Only if poe.re changed its page and the box
// is gone does it take what its Copy button just put on the clipboard.
async function startSave () {
  let read = asResult(null)
  try { read = asResult(await siteEl.value?.executeJavaScript(READ_RESULT_JS)) } catch { /* Not loaded yet. */ }
  let path = read.path
  if (!path) {
    try { path = new URL(currentUrl()).pathname } catch { path = '/' }
  }
  let text = read.text
  if (!read.found) {
    try { text = clipboardSearch(await navigator.clipboard.readText(), MAX_SEARCH_LENGTH) } catch { text = '' }
  }
  if (!text) {
    note('Pick something on poe.re first: its search string is empty')
    return
  }
  pending.value = { text, name: suggestName(read.page, path), category: categoryFor(path) }
}

function confirmSave () {
  const p = pending.value
  if (!p) return
  const res = saveToRegexLibrary({ name: p.name.trim(), text: p.text, category: p.category.trim() }, props.config.libraryId)
  note(SAVE_MESSAGE[res])
  if (res !== 'module-off') pending.value = null
}
</script>

<style module>
.save {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px var(--w-pad);
  background: var(--w-panel-2);
  border-bottom: 1px solid var(--w-line);
}
.str { flex: 1 1 8rem; min-width: 0; font-size: var(--w-fs-sm); }
.name { flex: 0 1 12rem; }
.cat { flex: 0 1 8rem; }
</style>
