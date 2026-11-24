<template>
  <!-- A number in a profit line (pick A4): click to change it. Yours (pick E2)
       shows in gold with a pin; a left-out line's number is struck (S1). -->
  <button v-if="editable && !out" type="button" :class="[$style.num, { [$style.mine]: mine }]" :title="title" :aria-label="label" @click.stop="emit('edit')"><i v-if="mine" class="fas fa-thumbtack" :class="$style.pin" aria-hidden="true" /><slot /></button>
  <span v-else :class="[$style.plain, { [$style.mine]: mine && !out, [$style.out]: out }]" :title="title"><i v-if="mine && !out" class="fas fa-thumbtack" :class="$style.pin" aria-hidden="true" /><slot /></span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  editable?: boolean
  // Your number, not the one read (pick E2).
  mine?: boolean
  out?: boolean
  title?: string
  // What a click changes, for screen readers: "Change The Apothecary's price".
  label?: string
}>(), { editable: true, mine: false, out: false, title: undefined, label: undefined })
const emit = defineEmits<{ (e: 'edit'): void }>()
</script>

<style module>
.num { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: text; border-bottom: 1px dashed var(--w-line-strong); line-height: 1.15; white-space: nowrap; }
.num:hover, .num:focus-visible { border-bottom-color: var(--w-gold); color: var(--w-gold); outline: none; }
.plain { white-space: nowrap; }
.mine { color: var(--w-gold); }
.out { text-decoration: line-through; color: var(--w-dim); }
.pin { font-size: 0.75em; margin-right: 3px; opacity: .85; }
</style>
