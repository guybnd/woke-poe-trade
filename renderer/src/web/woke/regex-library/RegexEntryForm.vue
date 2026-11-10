<template>
  <!-- Mock A: an entry opens as a small form right where its row sits. -->
  <form :class="$style.form" data-qa="regex-entry-form" @submit.prevent="save" @keydown.enter.exact="onEnter">
    <WField v-model="draft.name" placeholder="Name" :clear-on-esc="false" class="w-full" data-qa="regex-name" />
    <WField v-model="draft.text" placeholder="Search string or regex" :clear-on-esc="false" class="w-full" :class="$style.mono"
      data-qa="regex-text" />
    <div :class="$style.two">
      <WField v-model="draft.category" placeholder="Category (e.g. Maps)" :clear-on-esc="false" data-qa="regex-category" />
      <WField v-model="tags" placeholder="Tags, comma separated" :clear-on-esc="false" data-qa="regex-tags" />
    </div>
    <WField v-if="showNotes" v-model="draft.notes" placeholder="Notes" :clear-on-esc="false" class="w-full" data-qa="regex-notes" />
    <div :class="$style.meta">
      <span :class="tooLong ? 'w-down' : 'w-faint'" data-qa="regex-length"
        :title="tooLong ? 'Too long: the game cuts the search off at 250 characters' : undefined">{{ length }}/{{ MAX_SEARCH_LENGTH }}</span>
      <label v-if="canNegate(draft.text)" class="flex items-center gap-1 cursor-pointer w-dim" title='Wraps the term as "!…" so the search highlights items WITHOUT it'>
        <input v-model="draft.negate" type="checkbox"> Exclude
      </label>
      <span class="flex items-center gap-1 w-dim">Hotkey <WHotkeyCell v-model="draft.hotkey" /></span>
      <button v-if="!showNotes" type="button" class="w-accent hover:underline ml-auto" @click="showNotes = true">+ Notes</button>
    </div>
    <div :class="$style.acts">
      <WButton size="sm" variant="ghost" data-qa="regex-cancel" @click="emit('cancel')">Cancel</WButton>
      <WButton size="sm" variant="primary" :disabled="!draft.text.trim()" data-qa="regex-save" @click="save">Save</WButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { WField, WButton, WHotkeyCell } from '../ui'
import { MAX_SEARCH_LENGTH, canNegate, effectiveText } from './widget'
import type { RegexEntry } from './widget'
import { parseTags } from '../shared/library'

const props = defineProps<{ entry: RegexEntry }>()
const emit = defineEmits<{
  (e: 'save', entry: RegexEntry): void
  (e: 'cancel'): void
}>()

// Edits a copy: nothing changes in the library until Save.
const draft = reactive<RegexEntry>({ ...props.entry, tags: [...props.entry.tags] })
const tags = shallowRef(props.entry.tags.join(', '))
const showNotes = shallowRef(!!props.entry.notes)

const length = computed(() => effectiveText(draft).length)
const tooLong = computed(() => length.value > MAX_SEARCH_LENGTH)

// Enter in a text box saves; the hotkey box and buttons keep their own Enter.
function onEnter (e: KeyboardEvent) {
  if ((e.target as HTMLElement).tagName !== 'INPUT') return
  if ((e.target as HTMLInputElement).type === 'checkbox') return
  e.preventDefault()
  save()
}

function save () {
  if (!draft.text.trim()) return
  emit('save', {
    ...draft,
    name: draft.name.trim(),
    category: draft.category.trim(),
    notes: draft.notes.trim(),
    tags: parseTags(tags.value),
    negate: canNegate(draft.text) ? draft.negate : undefined
  })
}
</script>

<style module>
.form {
  display: grid;
  gap: 5px;
  padding: 8px var(--w-pad) 10px;
  background: var(--w-panel-2);
  border-top: 1px solid var(--w-line);
  border-bottom: 1px solid var(--w-line);
}
.mono :global(input) { font-family: var(--w-mono); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 12px; font-size: var(--w-fs-sm); }
.acts { display: flex; justify-content: flex-end; gap: 6px; }
</style>
