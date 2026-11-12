<template>
  <div class="max-w-xl p-2 flex flex-col gap-3">
    <input class="w-input rounded px-1 w-48" placeholder="Widget title" v-model="title" />
    <dnd-container tag="div" class="flex flex-col gap-y-4"
      v-model="strategies" item-key="id"
      handle="[data-qa=drag-handle]" :animation="200" :force-fallback="true">
      <template #item="{ element: s }">
        <div class="grid gap-1" style="grid-template-columns: auto 1fr 1fr auto;">
          <button class="leading-none cursor-move w-btn-soft rounded w-6 h-6" data-qa="drag-handle">
            <i class="fas fa-grip-vertical w-dim" />
          </button>
          <input v-model="s.name" placeholder="Strategy name" class="w-input rounded px-1 leading-6">
          <input v-model="s.league" placeholder="League (optional)" class="w-input rounded px-1 leading-6">
          <button class="leading-none rounded w-btn-soft w-6 h-6" @click="remove(s.id)">
            <i class="fas fa-times w-dim" />
          </button>
          <input :value="s.treeUrl" @input="setTree(s, $event)" placeholder="Atlas tree link (pathofexile.com/fullscreen-atlas-skill-tree/…)"
            class="rounded px-1 leading-6 col-start-2 col-span-2"
            :class="(s.treeUrl && !treeOk(s.treeUrl)) ? 'w-input w-input-bad' : 'w-input'">
          <input :value="s.tags.join(', ')" @change="setTags(s, $event)" placeholder="tags, comma separated"
            class="w-input rounded px-1 leading-6 col-start-2 col-span-2">
          <textarea v-model="s.scarabs" rows="2" placeholder="Scarabs, one per line"
            class="w-input rounded px-1 col-start-2" />
          <textarea v-model="s.device" rows="2" placeholder="Map device, crafting, sextants"
            class="w-input rounded px-1" />
          <input v-model="s.regex" placeholder="Map mod regex" class="w-input rounded px-1 leading-6 col-start-2 col-span-2">
          <textarea v-model="s.notes" rows="2" placeholder="Notes" class="w-input rounded px-1 col-start-2 col-span-2" />
        </div>
      </template>
    </dnd-container>
    <div class="flex gap-x-2">
      <button class="btn" style="min-width: 6rem;" @click="add">Add</button>
      <button class="btn" @click="openExport">Export</button>
      <button class="btn" @click="openImport">Import</button>
    </div>
    <div v-if="ioMode" class="flex flex-col gap-1">
      <div class="w-dim text-sm">
        {{ ioMode === 'export' ? 'Copy this JSON to back up or share your strategies.' : 'Paste exported strategies (JSON). They are added after your existing ones.' }}
      </div>
      <textarea v-model="ioText" rows="8" class="w-input rounded p-1 font-mono text-xs" :readonly="ioMode === 'export'" />
      <div class="flex gap-x-2 items-center">
        <button v-if="ioMode === 'import'" class="btn" @click="doImport">Add strategies</button>
        <button class="btn" @click="ioMode = null">Close</button>
        <span v-if="ioError" class="text-red-400 text-sm">{{ ioError }}</span>
      </div>
    </div>
    <label class="flex flex-col gap-1">
      <span class="w-dim text-sm">Atlas tree data URL (leave empty for GGG's atlastree-export)</span>
      <input v-model="dataUrl" class="w-input rounded px-1 leading-6" :placeholder="DEFAULT_ATLAS_DATA_URL">
    </label>
  </div>
</template>

<script lang="ts">
import { defineComponent, shallowRef } from 'vue'
import DndContainer from 'vuedraggable'
import { configProp, configModelValue } from '@/web/settings/utils'
import { parseTags } from '../shared/library'
import { dropDraft, emptyStrategy, exportStrategies, parseStrategiesImport, takeDrafts } from './widget'
import type { AtlasStrategy, AtlasWidget } from './widget'
import { DEFAULT_ATLAS_DATA_URL, decodeTree } from './tree'
import { claimNewRegexFolder } from './strategy-ops'

export default defineComponent({
  name: 'Atlas strategies',
  components: { DndContainer },
  props: configProp<AtlasWidget>(),
  setup (props) {
    const ioMode = shallowRef<'import' | 'export' | null>(null)
    const ioText = shallowRef('')
    const ioError = shallowRef('')

    return {
      DEFAULT_ATLAS_DATA_URL,
      title: configModelValue(() => props.configWidget, 'wmTitle'),
      dataUrl: configModelValue(() => props.configWidget, 'dataUrl'),
      strategies: configModelValue(() => props.configWidget, 'strategies'),
      ioMode,
      ioText,
      ioError,
      treeOk (url: string) {
        try { decodeTree(url); return true } catch { return false }
      },
      add () {
        const s = emptyStrategy(props.configWidget.strategies)
        // Its own regex folder, so it never shares or inherits regexes.
        claimNewRegexFolder(s, props.configWidget.strategies)
        props.configWidget.strategies.push(s)
        props.configWidget.selectedId ??= s.id
      },
      remove (id: number) {
        props.configWidget.strategies = props.configWidget.strategies.filter(s => s.id !== id)
        if (props.configWidget.selectedId === id) props.configWidget.selectedId = null
        // Its unsaved tree goes too: a strategy added next gets the same id.
        takeDrafts(props.configWidget, [id])
      },
      // A link typed here replaces any unsaved tree edit, which would hide it.
      setTree (s: AtlasStrategy, e: Event) {
        s.treeUrl = (e.target as HTMLInputElement).value
        dropDraft(props.configWidget, s)
      },
      setTags (s: AtlasStrategy, e: Event) {
        s.tags = parseTags((e.target as HTMLInputElement).value)
      },
      openExport () {
        ioMode.value = 'export'
        ioError.value = ''
        ioText.value = exportStrategies(props.configWidget.strategies)
      },
      openImport () {
        ioMode.value = 'import'
        ioError.value = ''
        ioText.value = ''
      },
      doImport () {
        try {
          const added = parseStrategiesImport(ioText.value, props.configWidget.strategies)
          for (const s of added) {
            claimNewRegexFolder(s, props.configWidget.strategies)
            props.configWidget.strategies.push(s)
          }
          ioError.value = `Added ${added.length} strategies`
          ioText.value = ''
        } catch (err) {
          ioError.value = (err as Error).message
        }
      }
    }
  }
})
</script>
