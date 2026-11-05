<template>
  <span :class="$style.wrap">
    <button ref="btn" type="button" :class="[$style.cell, { [$style.rec]: recording, [$style.empty]: !modelValue, [$style.bad]: problem }]"
      :title="recording ? 'Press the new key. Esc cancels, Backspace clears.' : 'Click, then press a key'"
      @click="start" @blur="recording = false" @keydown="onKeydown" @keyup="onKeyup">
      <template v-if="recording">Press a key…</template>
      <w-kbd v-else-if="modelValue" :keys="modelValue" />
      <template v-else>{{ required ? 'Required' : 'No key' }}</template>
    </button>
    <span v-if="problem && !recording" :class="$style.note" :title="problem">{{ problem }}</span>
    <span v-else-if="gameNote && !recording" class="w-dim text-xs" :title="gameNote">{{ gameNote }}</span>
  </span>
</template>

<script setup lang="ts">
// Click, press a key. Esc cancels, Backspace clears (unless required).
// Inside the settings window it also says when the key clashes.
import { computed, shallowRef } from 'vue'
import { KeyToCode, hotkeyToString } from '@ipc/KeyToCode'
import WKbd from './WKbd.vue'
import { normalizeKey, poeBindNote, reservedKeyNote, useHotkeyContext } from './hotkey-context'

const props = withDefaults(defineProps<{
  modelValue: string | null | undefined
  required?: boolean
  noModKeys?: boolean
  // This action's name, so the clash note can name the other one.
  label?: string
  // Hide the clash note (the hotkey list shows its own).
  quiet?: boolean
}>(), { required: false, noModKeys: false, label: undefined, quiet: false })
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()

const recording = shallowRef(false)
const btn = shallowRef<HTMLButtonElement | null>(null)
const ctx = useHotkeyContext()

const problem = computed(() => {
  if (props.quiet || !props.modelValue) return null
  const reserved = reservedKeyNote(props.modelValue)
  if (reserved) return reserved
  if (!ctx) return null
  const norm = normalizeKey(props.modelValue)
  if (ctx.failed.value.has(norm)) return 'Another program holds this key'
  const uses = ctx.uses.value.get(norm) ?? []
  if (uses.length < 2) return null
  const others = props.label ? uses.filter(l => l !== props.label) : []
  return others.length ? `Same key as ${others.join(', ')}` : 'Used by another action too'
})

// Not a problem: taking a game key can be exactly what you meant.
const gameNote = computed(() => {
  if (props.quiet || !ctx || !props.modelValue) return null
  const action = ctx.poeBinds.value.get(normalizeKey(props.modelValue))
  return action ? poeBindNote(action) : null
})

function start () {
  recording.value = true
  btn.value?.focus()
}

function onKeydown (e: KeyboardEvent) {
  if (!recording.value) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start() }
    return
  }
  // Keep Esc and every other key away from the window while recording.
  e.preventDefault()
  e.stopPropagation()
}

function onKeyup (e: KeyboardEvent) {
  if (!recording.value) return
  e.preventDefault()
  e.stopPropagation()
  if (e.code === 'Escape') { recording.value = false; return }
  if (e.code === 'Backspace') {
    if (!props.required) emit('update:modelValue', null)
    recording.value = false
    return
  }
  let { code } = e
  if (code.startsWith('Key')) code = code.slice(3)
  else if (code.startsWith('Digit')) code = code.slice(5)
  else if (e.key === 'Cancel' && code === 'Pause') code = 'Cancel'
  if (!(KeyToCode as Record<string, number>)[code]) return
  const str = hotkeyToString([code], e.ctrlKey, e.shiftKey, e.altKey)
  if (str.includes('F12')) return
  if (props.noModKeys && str.includes('+')) return
  emit('update:modelValue', str)
  recording.value = false
}
</script>

<style module>
.wrap { display: inline-flex; align-items: center; gap: var(--w-s2); min-width: 0; }
.cell {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  min-width: 110px; height: calc(24px * var(--w-text-scale, 1)); padding: 0 8px;
  background: var(--w-panel-2); border: 1px solid var(--w-line); border-radius: var(--w-r-sm);
  font-size: var(--w-fs-sm); color: var(--w-fg); cursor: pointer;
}
.cell:hover { border-color: var(--w-line-strong); }
.cell:focus-visible { outline: none; border-color: var(--w-accent); }
.empty { color: var(--w-faint); }
.rec { border-color: var(--w-accent); color: var(--w-accent); }
.bad { border-color: var(--w-down); }
.note { font-size: var(--w-fs-xs); color: var(--w-down); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 16rem; }
</style>
