<template>
  <div :class="$style.empty">
    <WIcon v-if="art" v-bind="art" :fallback="icon" size="lg" />
    <i v-else-if="icon" :class="[icon, $style.icon]" />
    <div :class="$style.text"><slot /></div>
    <div v-if="$slots.actions" :class="$style.actions"><slot name="actions" /></div>
  </div>
</template>

<script setup lang="ts">
// Empty or failed state (P12): say what goes here and how to fill it, with an
// optional fix button in `actions`. `art` takes WIcon props for game art.
import WIcon from './WIcon.vue'

defineProps<{ icon?: string, art?: { currency?: string, item?: string, mechanic?: string, src?: string } }>()
</script>

<style module>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--w-s2);
  padding: var(--w-s5) var(--w-pad);
  text-align: center;
  color: var(--w-dim);
  font-size: var(--w-fs-md);
}
.icon { font-size: calc(18px * var(--w-text-scale, 1)); color: var(--w-faint); }
.text { max-width: 36ch; text-wrap: balance; }
.actions { display: flex; gap: var(--w-s2); }
</style>
