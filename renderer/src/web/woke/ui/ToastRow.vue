<template>
  <div ref="el" :class="[$style.toast, 'w-enter']" role="status">
    <span :class="$style.text">{{ toast.text }}</span>
    <button v-if="toast.undo" type="button" :class="$style.undo" @click="undoToast(toast.id)">Undo</button>
    <WKbd v-if="toast.undo" keys="Ctrl + Z" />
  </div>
</template>

<script setup lang="ts">
// One done/undo note. One from a dock menu takes the mouse while it's over it, so
// Undo can be clicked while the game has focus. Others don't: a note can come up
// on its own, and mustn't catch clicks meant for the game.
import { shallowRef } from 'vue'
import WKbd from './WKbd.vue'
import { undoToast, type Toast } from './layer'
import { useHoverZone } from '../shared/hover'

const props = defineProps<{ toast: Toast }>()

const el = shallowRef<HTMLElement | null>(null)
useHoverZone(el, { enabled: () => props.toast.clickable, activate: () => true })
</script>

<style module>
.toast {
  position: fixed; z-index: 1002; transform: translate(-50%, -100%);
  display: flex; align-items: center; gap: var(--w-s2); max-width: 360px;
  padding: 5px 6px 5px 10px; font-family: var(--w-body); font-size: var(--w-fs-sm); color: var(--w-fg);
  background: var(--w-panel-3); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5); pointer-events: auto;
  zoom: var(--w-ui-scale, 1);
}
/* A note is never cut short: long text wraps. */
.text { min-width: 0; overflow-wrap: anywhere; }
.undo { color: var(--w-accent); font-weight: 600; padding: 0 4px; }
.undo:hover { text-decoration: underline; }
</style>
