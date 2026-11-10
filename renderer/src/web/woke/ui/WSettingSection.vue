<template>
  <section :class="$style.sec">
    <header v-if="title" :class="$style.head">
      <span :class="$style.title">{{ title }}</span>
      <span v-if="$slots.actions" :class="$style.actions"><slot name="actions" /></span>
    </header>
    <div v-if="hint" :class="$style.hint">{{ hint }}</div>
    <div :class="$style.body"><slot /></div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title?: string, hint?: string }>(), { title: undefined, hint: undefined })
</script>

<style module>
.sec { display: flex; flex-direction: column; }
.head {
  display: flex; align-items: center; gap: var(--w-s2);
  padding-bottom: var(--w-s1); border-bottom: 1px solid var(--w-line);
}
.title { flex: 1; font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.08em; text-transform: var(--w-caps-case); color: var(--w-accent); font-family: var(--w-caps-face); }
.actions { display: flex; gap: var(--w-s2); }
.hint { color: var(--w-dim); font-size: var(--w-fs-sm); padding-top: var(--w-s2); }
.body { display: flex; flex-direction: column; }
</style>
