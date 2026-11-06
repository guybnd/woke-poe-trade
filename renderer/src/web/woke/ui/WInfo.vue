<template>
  <span :class="[$style.q, { [$style.on]: open }]" role="img" :aria-label="text" tabindex="0"
    @mouseenter="show" @mouseleave="hide" @focus="onFocus" @blur="hide" title="" @click.stop.prevent @mousedown.stop @dblclick.stop>?</span>
</template>

<script setup lang="ts">
// A long explanation, kept out of the panel until someone asks for it. A blank
// line in `text` starts a new paragraph.
import { computed, onBeforeUnmount } from 'vue'
import { helpTip, hideHelp, showHelp } from './help-tip'

const props = defineProps<{ text: string }>()

const owner = {}
const open = computed(() => helpTip.value?.owner === owner)
function show (e: Event) { showHelp(owner, e.currentTarget as HTMLElement, props.text) }
function hide () { hideHelp(owner) }
// Keyboard only: a clicked "?" keeps focus, and would reopen its card when the
// window gets focus back, with the mouse somewhere else.
function onFocus (e: FocusEvent) { if ((e.currentTarget as HTMLElement).matches(':focus-visible')) show(e) }
onBeforeUnmount(hide)
</script>

<style module>
.q {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: calc(15px * var(--w-text-scale, 1)); height: calc(15px * var(--w-text-scale, 1));
  border: 1px solid var(--w-line-strong); border-radius: 50%;
  color: var(--w-dim); font-size: var(--w-fs-xs); font-weight: 600; font-style: normal; line-height: 1;
  cursor: help; user-select: none;
}
.q:hover, .q:focus-visible, .on { color: var(--w-accent); border-color: var(--w-accent); background: var(--w-accent-soft); outline: none; }
</style>
