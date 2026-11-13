<template>
  <!-- Guy's pick "glyph + six pips": the altar's glyph, then a pip per tier up to Perfect. -->
  <span :class="[$style.mark, $style[source]]" :title="label">
    <span :class="$style.glyph" />
    <span :class="$style.pips"><i v-for="i in 6" :key="i" :class="{ [$style.on]: i <= rank }" /></span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ source: 'exarch' | 'eater', rank: number, label: string }>()
</script>

<style module>
.mark { display: inline-flex; align-items: center; gap: 4px; --c: #4fc2b0; }
.exarch { --c: #e8743a; }
.glyph { width: 10px; height: 10px; flex: none; }
/* Searing Exarch: a star of flame. Eater of Worlds: a hollow ring. */
.exarch .glyph { background: var(--c); clip-path: polygon(50% 0, 64% 34%, 100% 40%, 70% 62%, 80% 100%, 50% 78%, 20% 100%, 30% 62%, 0 40%, 36% 34%); }
.eater .glyph { border-radius: 50%; box-shadow: inset 0 0 0 3px var(--c); }
.pips { display: inline-flex; gap: 2px; }
.pips > i { width: 5px; height: 5px; border-radius: 1px; background: #2a2218; }
.pips > i.on { background: var(--c); }
</style>
