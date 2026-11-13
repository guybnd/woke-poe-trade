<template>
  <div :class="$style.wrap">
    <input class="w-mono" :class="$style.field" :value="modelValue ?? ''" :placeholder="placeholder" spellcheck="false"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).value.trim() || null)">
    <span v-if="status" :class="[$style.chip, $style[status.kind]]" :title="status.title">{{ status.text }}</span>
    <w-button size="sm" @click="browse">Browse</w-button>
    <slot />
  </div>
</template>

<script setup lang="ts">
// A file or folder path with a live "Found / Not found" check and Browse.
import { computed, shallowRef, watch } from 'vue'
import { hostRequest } from '../shared/host'
import WButton from './WButton.vue'

const props = withDefaults(defineProps<{
  modelValue: string | null | undefined
  kind?: 'file' | 'dir'
  placeholder?: string
  extensions?: string[]
  // Shown instead of "Not set" when empty (e.g. "Found automatically").
  emptyText?: string
}>(), { kind: 'file', placeholder: undefined, extensions: undefined, emptyText: undefined })
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()

interface Stat { exists: boolean, isDir: boolean }
const stat = shallowRef<Stat | null>(null)
let seq = 0
watch(() => props.modelValue, async (p) => {
  const my = ++seq
  stat.value = null
  if (!p) return
  try {
    const s = await hostRequest('path-stat', { path: p }, 5000)
    if (my === seq) stat.value = s
  } catch {}
}, { immediate: true })

const status = computed(() => {
  if (!props.modelValue) return props.emptyText ? { kind: 'auto', text: props.emptyText, title: '' } : null
  if (!stat.value) return null
  if (!stat.value.exists) return { kind: 'bad', text: 'Not found', title: 'Nothing at this path' }
  if ((props.kind === 'dir') !== stat.value.isDir) {
    return { kind: 'bad', text: props.kind === 'dir' ? 'Not a folder' : 'Not a file', title: '' }
  }
  return { kind: 'ok', text: 'Found', title: '' }
})

async function browse () {
  try {
    const p = await hostRequest('browse-path', {
      kind: props.kind, defaultPath: props.modelValue || undefined, extensions: props.extensions
    }, 10 * 60_000)
    if (p) emit('update:modelValue', p)
  } catch {}
}
</script>

<style module>
.wrap { display: flex; align-items: center; gap: var(--w-s2); width: 100%; min-width: 0; }
.field {
  flex: 1; min-width: 0; height: calc(26px * var(--w-text-scale, 1)); padding: 0 8px;
  font-family: var(--w-mono); font-size: var(--w-fs-sm); color: var(--w-fg);
  background: var(--w-panel-2); border: 1px solid var(--w-line); border-radius: var(--w-r-sm);
}
.field:focus { outline: none; border-color: var(--w-accent); }
.field::placeholder { color: var(--w-faint); font-family: var(--w-body); }
.chip { flex: none; font-size: var(--w-fs-xs); border-radius: var(--w-r-pill); padding: 0 8px; line-height: calc(18px * var(--w-text-scale, 1)); border: 1px solid currentColor; white-space: nowrap; }
/* The game look: a quiet note beside the field, not a boxed tag next to the buttons. */
:global([data-woke-look="game"]) .chip { border: 0; padding: 0 2px; font-style: italic; font-size: var(--w-fs-sm); opacity: 0.85; }
.ok { color: var(--w-up); }
.bad { color: var(--w-down); }
.auto { color: var(--w-dim); }
</style>
