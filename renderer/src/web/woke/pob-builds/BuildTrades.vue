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
          <span class="ml-auto w-faint text-xs whitespace-nowrap">{{ agoPhrase(e.lastOpened) }}</span>
        </button>
        <button type="button" class="w-icon-btn" title="Open in your browser" @click="open(e, 'external')"><i class="fas fa-external-link-alt" /></button>
      </div>
      <WEmpty v-if="!list.length" icon="fas fa-folder-open">
        No searches in {{ folder }} yet. Save one from the price check into this folder.
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
import { WButton, WEmpty, WSelect, agoPhrase, openMenu } from '../ui'
import { TRADE_SEARCHES_TYPE, ensureFolder, folderNames, folderOf, hotkeyTarget, pinnedFirst, sortEntries } from '../trade-searches/widget'
import type { TradeSearchEntry, TradeSearchesWidget } from '../trade-searches/widget'
import type { PobBuildEntry, PobBuildsWidget } from './widget'

const props = defineProps<{ config: PobBuildsWidget, entry: PobBuildEntry }>()

const searches = computed(() => AppConfig<TradeSearchesWidget>(TRADE_SEARCHES_TYPE))

const folder = computed(() => {
  const name = props.config.tradeFolders?.[props.entry.relPath]
  return name && searches.value && folderNames(searches.value).includes(name) ? name : null
})

const folderOptions = computed(() => [
  { value: '', label: 'No folder' },
  ...(searches.value ? folderNames(searches.value) : []).map(n => ({ value: n, label: n }))
])

const list = computed(() => {
  const w = searches.value
  if (!w || !folder.value) return []
  return pinnedFirst(sortEntries(w.entries.filter(e => folderOf(e) === folder.value), 'opened'))
})

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
.open { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; padding: 5px 4px; text-align: left; }
</style>
