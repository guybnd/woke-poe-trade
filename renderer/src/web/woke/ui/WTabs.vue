<template>
  <div :class="[$style.tabs, 'w-tabs']" role="tablist">
    <button v-for="opt in options" :key="opt.value" type="button" role="tab"
      :aria-selected="opt.value === modelValue"
      :class="[$style.tab, { [$style.active]: opt.value === modelValue }]"
      @click="emit('update:modelValue', opt.value)">
      {{ opt.label }}<span v-if="opt.count != null" :class="$style.count">{{ opt.count }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  options: Array<{ value: string, label: string, count?: number | string }>
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<style module>
/* Stash tabs: boxed tabs on a gold baseline; the open one is lit and joins the
   panel below. Too many for the width wraps to a second row. */
.tabs {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 4px 3px;
  border-bottom: 1px solid var(--w-line-strong);
}
.tab {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
  font-size: var(--w-fs-md);
  font-weight: 500;
  color: var(--w-dim);
  padding: 5px 12px 6px;
  margin-bottom: -1px;
  background: linear-gradient(var(--w-panel-3), var(--w-panel-2));
  border: 1px solid var(--w-line);
  border-bottom-color: var(--w-line-strong);
  border-radius: var(--w-r-md) var(--w-r-md) 0 0;
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.06);
}
.tab:hover { color: var(--w-fg); border-color: var(--w-line-strong); }
.tab:focus-visible { outline: 1px solid var(--w-accent); outline-offset: -2px; }
.active, .active:hover {
  color: var(--w-tab-on, #f2d79e);
  padding-bottom: 7px;
  background: linear-gradient(color-mix(in srgb, var(--w-accent) 30%, var(--w-panel-solid)), var(--w-panel-solid) 85%);
  border-color: color-mix(in srgb, var(--w-accent) 65%, transparent);
  border-bottom-color: var(--w-panel-solid);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--w-accent) 55%, transparent), 0 -2px 8px var(--w-accent-soft);
}
.count { margin-left: 5px; font-size: var(--w-fs-xs); color: var(--w-faint); }
.active .count { color: color-mix(in srgb, var(--w-accent) 80%, var(--w-fg)); }
:global([data-woke-theme="native"]) .tab { font-family: var(--w-head); letter-spacing: 0.05em; }
:global([data-woke-theme="modern"]) .tabs { border: 0; }
:global([data-woke-theme="modern"]) .tab { border: 0; border-radius: 6px; padding: 3px 10px; margin: 0 0 4px; background: none; box-shadow: none; }
:global([data-woke-theme="modern"]) .active { background: var(--w-panel-3); color: var(--w-fg); }
</style>
