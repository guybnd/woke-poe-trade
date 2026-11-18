<template>
  <WEmpty v-if="!searches" icon="fas fa-search">Add the Trade searches window to keep this build's searches here.</WEmpty>
  <div v-else :class="$style.wrap">
    <div :class="$style.pick">
      <span class="w-dim text-xs">Folder</span>
      <WSelect :model-value="folder ?? ''" :options="folderOptions" title="The saved-searches folder for this build" class="grow" @update:model-value="link" />
    </div>
    <template v-if="folder">
      <div v-for="e in list" :key="e.id" :class="$style.row" @contextmenu="rowMenu($event, e)">
        <button type="button" :class="$style.open" class="w-focusable" :title="`Open ${e.name || 'this search'} in the trade window`" @click="open(e, 'overlay')">
          <i v-if="e.pinned" class="fas fa-thumbtack text-xs w-faint" />
          <span class="w-trunc">{{ e.name || 'Untitled search' }}</span>
          <span v-if="subOf(e)" class="w-faint text-xs w-trunc" :class="$style.sub" :title="`In ${folder}/${subOf(e)}`"><i class="fas fa-folder" /> {{ subOf(e) }}</span>
          <span class="ml-auto w-faint text-xs whitespace-nowrap">{{ agoPhrase(e.lastOpened) }}</span>
        </button>
        <button type="button" class="w-icon-btn" title="Open in your browser" @click="open(e, 'external')"><i class="fas fa-external-link-alt" /></button>
      </div>
      <WEmpty v-if="!list.length" icon="fas fa-folder-open">
        No searches in {{ folder }} or its folders yet. Save one from the price check into this folder.
      </WEmpty>
    </template>
    <WEmpty v-else icon="fas fa-link">
      Pick a saved-searches folder for this build, or make one named after it.
      <template #actions><WButton size="sm" @click="makeFolder">New folder "{{ entry.name }}"</WButton></template>
    </WEmpty>
  </div>
</template>

<script setup lang="ts">
// The build's saved trade searches: a folder of the Trade searches window,
// linked to the build. Clicking a search runs it as that window does.
import { computed } from 'vue'
import { AppConfig, saveConfig } from '@/web/Config'
import { MainProcess } from '@/web/background/IPC'
import { cleanPath } from '../shared/saved-tree'
import { WButton, WEmpty, WSelect, agoPhrase, openMenu } from '../ui'
import { TRADE_SEARCHES_TYPE, ensureFolder, hotkeyTarget, linkableFolders, pinnedFirst, searchesIn, sortEntries } from '../trade-searches/widget'
import type { TradeSearchEntry, TradeSearchesWidget } from '../trade-searches/widget'
import type { PobBuildEntry, PobBuildsWidget } from './widget'

const props = defineProps<{ config: PobBuildsWidget, entry: PobBuildEntry }>()

const searches = computed(() => AppConfig<TradeSearchesWidget>(TRADE_SEARCHES_TYPE))

const folders = computed(() => searches.value ? linkableFolders(searches.value) : [])

const folder = computed(() => {
  const name = cleanPath(props.config.tradeFolders?.[props.entry.relPath])
  return name && folders.value.includes(name) ? name : null
})

const folderOptions = computed(() => [
  { value: '', label: 'No folder' },
  ...folders.value.map(n => ({ value: n, label: n }))
])

// The linked folder and every folder under it.
const found = computed(() => {
  const w = searches.value
  return w && folder.value ? searchesIn(w.entries, folder.value) : []
})
const list = computed(() => pinnedFirst(sortEntries(found.value.map(f => f.entry), 'opened')))
// The search's folder below the linked one ('' when it sits in it).
function subOf (e: TradeSearchEntry): string {
  const root = folder.value
  const at = cleanPath(e.category)
  return root && at.length > root.length ? at.slice(root.length + 1) : ''
}

function link (name: string) {
  const rest = Object.fromEntries(Object.entries(props.config.tradeFolders ?? {}).filter(([rel]) => rel !== props.entry.relPath))
  props.config.tradeFolders = name ? { ...rest, [props.entry.relPath]: name } : rest
  saveConfig()
}

function makeFolder () {
  const w = searches.value
  if (!w) return
  link(ensureFolder(w, props.entry.name).name)
}

// The Trade searches window opens it, as its own hotkeys do.
function open (e: TradeSearchEntry, where: 'overlay' | 'external') {
  const w = searches.value
  if (!w) return
  MainProcess.selfDispatch({ name: 'MAIN->CLIENT::widget-action', payload: { target: hotkeyTarget(w.wmId, e.id, where) } })
}

function rowMenu (ev: MouseEvent, e: TradeSearchEntry) {
  openMenu(ev, [
    { label: 'Open in the trade window', icon: 'fas fa-search', action: () => open(e, 'overlay') },
    { label: 'Open in your browser', icon: 'fas fa-external-link-alt', action: () => open(e, 'external') }
  ])
}
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 2px; }
.pick { display: flex; align-items: center; gap: 8px; padding: 4px 0 6px; }
.row {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--w-line-soft);
}
.row:hover { background: var(--w-accent-soft); }
.sub { flex-shrink: 1; max-width: 40%; }
.open { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; padding: 5px 4px; text-align: left; }
</style>
