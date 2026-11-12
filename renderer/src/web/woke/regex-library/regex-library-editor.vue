<template>
  <div class="max-w-xl p-2">
    <input class="w-input rounded px-1 w-48 mb-2" placeholder="Widget title"
      v-model="title" />
    <w-toggle v-model="enableHotkeys" class="mb-2">Use each entry's hotkey</w-toggle>
    <dnd-container tag="div" class="flex flex-col gap-y-3"
      v-model="entries" item-key="id"
      handle="[data-qa=drag-handle]" :animation="200" :force-fallback="true">
      <template #item="{ element: entry }">
        <div class="grid gap-0.5" style="grid-template-columns: auto 1fr 1fr auto;">
          <button class="leading-none cursor-move w-btn-soft rounded-l w-6 h-6" data-qa="drag-handle">
            <i class="fas fa-grip-vertical w-dim" />
          </button>
          <input :value="entry.text" placeholder="search string or regex"
            @input="entry.text = ($event.target as HTMLInputElement).value; entry.patch = GAME_PATCH"
            class="px-1 col-span-2 leading-6"
            :class="(effectiveText(entry).length > MAX_SEARCH_LENGTH) ? 'w-input w-input-bad' : 'w-input'">
          <button class="leading-none rounded-r w-btn-soft w-6 h-6" @click="removeEntry(entry.id)">
            <i class="fas fa-times w-dim" />
          </button>
          <input v-model="entry.name" placeholder="name"
            class="w-input px-1 col-start-2 leading-6 rounded">
          <input v-model="entry.category" placeholder="category (e.g. Maps, Vendor)"
            class="w-input px-1 leading-6 rounded">
          <input :value="entry.tags.join(', ')" @change="setTags(entry, $event)" placeholder="tags, comma separated"
            class="w-input px-1 col-start-2 leading-6 rounded">
          <w-hotkey-cell v-model="entry.hotkey" />
          <input v-model="entry.notes" placeholder="notes"
            class="w-input px-1 col-start-2 col-span-2 leading-6 rounded">
          <div class="col-start-2 col-span-2 flex items-center gap-x-3 text-xs">
            <span :class="effectiveText(entry).length > MAX_SEARCH_LENGTH ? 'text-red-400' : 'w-dim'">
              {{ effectiveText(entry).length }}/{{ MAX_SEARCH_LENGTH }} characters<template v-if="effectiveText(entry).length > MAX_SEARCH_LENGTH">: too long, the game cuts it off. Drop terms, or build map strings with the Map regex builder.</template>
            </span>
            <label v-if="canNegate(entry.text)" class="flex items-center gap-x-1 w-dim cursor-pointer" title='Wraps the term as "!…" so the search highlights items WITHOUT it'>
              <input type="checkbox" v-model="entry.negate"> Exclude (highlight items without it)
            </label>
          </div>
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
        {{ ioMode === 'export' ? 'Copy this JSON to back up or share your library.' : 'Paste one search string per line (optionally "name = string"), or a JSON export. They are added after your existing ones.' }}
      </div>
      <textarea v-model="ioText" rows="8" class="w-input rounded p-1 font-mono text-xs"
        :readonly="ioMode === 'export'" />
      <div class="flex gap-x-2 items-center">
        <button v-if="ioMode === 'import'" class="btn" @click="doImport">Add entries</button>
        <button class="btn" @click="ioMode = null">Close</button>
        <span v-if="ioError" class="text-red-400 text-sm">{{ ioError }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, shallowRef } from 'vue'
import DndContainer from 'vuedraggable'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import WToggle from '../ui/WToggle.vue'
import { configProp, configModelValue } from '@/web/settings/utils'
import { GAME_PATCH, MAX_SEARCH_LENGTH, canNegate, effectiveText, emptyEntry, exportEntries, parseImport } from './widget'
import type { RegexEntry, RegexLibraryWidget } from './widget'
import { parseTags } from '../shared/library'

export default defineComponent({
  name: 'Regex library',
  components: { DndContainer, WHotkeyCell, WToggle },
  props: configProp<RegexLibraryWidget>(),
  setup (props) {
    const ioMode = shallowRef<'import' | 'export' | null>(null)
    const ioText = shallowRef('')
    const ioError = shallowRef('')

    return {
      MAX_SEARCH_LENGTH,
      GAME_PATCH,
      enableHotkeys: configModelValue(() => props.configWidget, 'enableHotkeys'),
      canNegate,
      effectiveText,
      title: configModelValue(() => props.configWidget, 'wmTitle'),
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
      setTags (entry: RegexEntry, e: Event) {
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
          ioError.value = `Added ${added.length} entries`
          ioText.value = ''
        } catch (err) {
          ioError.value = (err as Error).message
        }
      }
    }
  }
})
</script>
