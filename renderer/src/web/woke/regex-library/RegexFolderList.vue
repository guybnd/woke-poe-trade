<template>
  <div class="flex flex-col gap-1">
    <div v-for="r in regexes" :key="r.id" :class="$style.row" @contextmenu="menu($event, r)">
      <span class="w-trunc" :title="r.name">{{ r.name || 'Regex' }}</span>
      <code class="w-trunc" :class="$style.code" :title="r.text">{{ r.text }}</code>
      <button class="w-icon-btn" :title="copied === r.text ? 'Copied' : 'Copy'" @click="copy(r.text)"><i :class="copied === r.text ? 'fas fa-check' : 'far fa-copy'" /></button>
      <button class="w-icon-btn" title="Type it into the in-game search box" @click="search(r.text)"><i class="fas fa-search" /></button>
    </div>
    <div v-if="adding" class="flex flex-col gap-1">
      <input ref="nameField" v-model="newName" class="w-field" placeholder="Name, e.g. Gear to buy" spellcheck="false" @keydown.esc="adding = false">
      <div class="flex gap-1">
        <input v-model="newText" class="w-field grow" :class="$style.code" placeholder='"t: \+([5-9]\d)% to f"' spellcheck="false" @keydown.enter="save" @keydown.esc="adding = false">
        <WButton size="sm" variant="primary" :disabled="!newText.trim()" @click="save">Add</WButton>
      </div>
    </div>
    <div v-if="!on" class="w-faint text-xs">Turn on the Regex library in Settings → Modules to keep regexes here.</div>
    <div v-else class="flex items-center gap-2">
      <span class="w-faint text-xs w-trunc">{{ regexes.length ? '' : 'None yet. ' }}In the Regex library under {{ folder.split('/').join(' › ') }}</span>
      <WButton v-if="!adding" size="sm" class="ml-auto shrink-0" icon="fas fa-plus" @click="adding = true">Add</WButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// The regexes filed in one Regex library folder, with Add, Copy and Search.
// The entries live in the library: an edit there shows here at once.
import { computed, nextTick, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { WButton, openMenu, toast, useCopy } from '../ui'
import { SAVE_MESSAGE } from './save'
import { addRegex, libraryOn, regexesIn, removeRegex } from './folders'
import type { RegexEntry } from './widget'

const props = defineProps<{ folder: string }>()

const on = computed(() => libraryOn())
const regexes = computed(() => regexesIn(props.folder))
const { copied, copy } = useCopy()
const adding = shallowRef(false)
const newName = shallowRef('')
const newText = shallowRef('')
const nameField = shallowRef<HTMLInputElement | null>(null)
watch(adding, (v) => { if (v) nextTick(() => nameField.value?.focus()) })
watch(() => props.folder, () => { adding.value = false })

function save () {
  const text = newText.value.trim()
  if (!text) return
  const res = addRegex(props.folder, newName.value.trim() || 'Regex', text)
  if (res !== 'saved') toast(SAVE_MESSAGE[res])
  newName.value = ''
  newText.value = ''
  adding.value = false
}

function search (text: string) {
  MainProcess.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'stash-search', text } })
}

function menu (e: MouseEvent, r: RegexEntry) {
  openMenu(e, [
    { label: 'Copy', icon: 'far fa-copy', action: () => { copy(r.text).catch(() => {}) } },
    { label: 'Search with it', icon: 'fas fa-search', action: () => search(r.text) },
    { separator: true },
    { label: 'Remove', icon: 'fas fa-trash', danger: true, action: () => toast(`Removed "${r.name || r.text}" from the Regex library`, { undo: removeRegex(r.id, props.folder) }) }
  ])
}
</script>

<style module>
.row {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) auto auto;
  align-items: center;
  gap: 4px;
}
.code { font-family: var(--w-num); font-size: var(--w-fs-sm); color: var(--w-dim); }
</style>
