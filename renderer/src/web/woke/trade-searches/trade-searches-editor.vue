<template>
  <div class="max-w-xl p-2">
    <input class="w-input rounded px-1 w-48 mb-2" placeholder="Widget title"
      v-model="title" />
    <div class="w-dim text-sm mb-2 flex items-center gap-2">
      Paste a pathofexile.com/trade search link
      <w-info text="Live searches end in /live. Each search can have one hotkey for the overlay browser and one for your normal browser." />
    </div>
    <w-toggle v-model="enableHotkeys" class="mb-2">Use each search's hotkey</w-toggle>
    <w-toggle v-model="followLeague" class="mb-2">Open searches in the league picked in price check settings, even if they were saved in an older league</w-toggle>
    <dnd-container tag="div" class="flex flex-col gap-y-3"
      v-model="entries" item-key="id"
      handle="[data-qa=drag-handle]" :animation="200" :force-fallback="true">
      <template #item="{ element: entry }">
        <div class="grid gap-0.5 items-center" style="grid-template-columns: auto 1fr 1fr auto;">
          <button class="leading-none cursor-move w-btn-soft rounded-l w-6 h-6" data-qa="drag-handle">
            <i class="fas fa-grip-vertical w-dim" />
          </button>
          <input v-model="entry.url" placeholder="https://www.pathofexile.com/trade/search/…"
            class="px-1 col-span-2 leading-6"
            :class="(entry.url && !isValidUrl(entry.url)) ? 'w-input w-input-bad' : 'w-input'">
          <button class="leading-none rounded-r w-btn-soft w-6 h-6" @click="removeEntry(entry.id)">
            <i class="fas fa-times w-dim" />
          </button>
          <input v-model="entry.name" placeholder="name"
            class="w-input px-1 col-start-2 leading-6 rounded">
          <input v-model="entry.category" placeholder="category (e.g. Flips, Gear)"
            class="w-input px-1 leading-6 rounded">
          <input :value="entry.tags.join(', ')" @change="setTags(entry, $event)" placeholder="tags, comma separated"
            class="w-input px-1 col-start-2 col-span-2 leading-6 rounded">
          <input v-model="entry.notes" placeholder="notes"
            class="w-input px-1 col-start-2 col-span-2 leading-6 rounded">
          <div class="col-start-2 text-sm w-dim">Overlay browser key</div>
          <w-hotkey-cell v-model="entry.hotkeyOverlay" />
          <div class="col-start-2 text-sm w-dim">Your browser key</div>
          <w-hotkey-cell v-model="entry.hotkeyExternal" />
        </div>
      </template>
    </dnd-container>
    <div class="flex gap-x-2 mt-3">
      <button class="btn" style="min-width: 6rem;" @click="addEntry">Add</button>
      <button class="btn" @click="openExport">Export</button>
      <button class="btn" @click="openImport">Import</button>
    </div>
    <div v-if="ioMode" class="mt-2 flex flex-col gap-1">
      <div class="w-dim text-sm">
        {{ ioMode === 'export' ? 'Copy this JSON to back up or share your searches.' : 'Paste a JSON array of searches. They are added after your existing ones.' }}
      </div>
      <textarea v-model="ioText" rows="8" class="w-input rounded p-1 font-mono text-xs"
        :readonly="ioMode === 'export'" />
      <div class="flex gap-x-2 items-center">
        <button v-if="ioMode === 'import'" class="btn" @click="doImport">Add searches</button>
        <button class="btn" @click="ioMode = null">Close</button>
        <span v-if="ioError" class="text-red-400 text-sm">{{ ioError }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import WToggle from '../ui/WToggle.vue'
import { computed, defineComponent, shallowRef } from 'vue'
import DndContainer from 'vuedraggable'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WInfo from '../ui/WInfo.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { parseTags } from '../shared/library'
import { emptyEntry, exportEntries, isValidUrl, parseImport } from './widget'
import type { TradeSearchEntry, TradeSearchesWidget } from './widget'

export default defineComponent({
  name: 'Trade searches',
  components: { WToggle, DndContainer, WHotkeyCell, WInfo },
  props: configProp<TradeSearchesWidget>(),
  setup (props) {
    const ioMode = shallowRef<'import' | 'export' | null>(null)
    const ioText = shallowRef('')
    const ioError = shallowRef('')

    return {
      isValidUrl,
      title: configModelValue(() => props.configWidget, 'wmTitle'),
      enableHotkeys: computed({
        get: () => props.configWidget.enableHotkeys,
        set: (v: boolean) => { props.configWidget.enableHotkeys = v }
      }),
      followLeague: computed({
        get: () => props.configWidget.followLeague !== false,
        set: (v: boolean) => { props.configWidget.followLeague = v }
      }),
      entries: configModelValue(() => props.configWidget, 'entries'),
      ioMode,
      ioText,
      ioError,
      removeEntry (id: number) {
        props.configWidget.entries = props.configWidget.entries.filter(e => e.id !== id)
      },
      addEntry () {
        props.configWidget.entries.push(emptyEntry(props.configWidget.entries))
      },
      setTags (entry: TradeSearchEntry, e: Event) {
        entry.tags = parseTags((e.target as HTMLInputElement).value)
      },
      openExport () {
        ioMode.value = 'export'
        ioError.value = ''
        ioText.value = exportEntries(props.configWidget.entries)
      },
      openImport () {
        ioMode.value = 'import'
        ioError.value = ''
        ioText.value = ''
      },
      doImport () {
        try {
          const added = parseImport(ioText.value, props.configWidget.entries)
          props.configWidget.entries.push(...added)
          ioError.value = `Added ${added.length} searches`
          ioText.value = ''
        } catch (err) {
          ioError.value = (err as Error).message
        }
      }
    }
  }
})
</script>
