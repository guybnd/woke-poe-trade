<template>
  <ui-popover v-if="cand" ref="pop" trigger="click" placement="bottom-end" boundary="#price-window">
    <template #target>
      <button type="button" data-swap-element :class="[$style.pick, { [$style.on]: mode != null }]"
        title="Which element this row searches for">{{ label }} ▾</button>
    </template>
    <template #content>
      <div :class="$style.menu" role="menu">
        <button v-for="o of options" :key="o.mode" type="button" role="menuitemradio"
          :aria-checked="o.mode === (mode ?? 'this')" :class="{ [$style.sel]: o.mode === (mode ?? 'this') }"
          @click="choose(o.mode)">{{ o.label }}</button>
      </div>
    </template>
  </ui-popover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import UiPopover from '@/web/ui/Popover.vue'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { KEY_LABEL } from './families'
import { useSwap } from './useSwap'

// The element a swappable row searches for: the item's own, any, or another.
// Picking changes the row like any edit: the price check searches on Search.
const props = defineProps<{ filter: StatFilter }>()
const swap = useSwap()
const pop = ref<{ hide?: () => void } | null>(null)
const cand = computed(() => swap?.candidateFor(props.filter))
const mode = computed(() => cand.value ? swap!.pickOf(cand.value) : null)
const label = computed(() => {
  const c = cand.value
  if (!c) return ''
  if (mode.value == null) return KEY_LABEL[c.from]
  return mode.value === 'any' ? 'Any' : KEY_LABEL[mode.value]
})
const options = computed(() => {
  const c = cand.value
  if (!c) return []
  return [
    { mode: 'any', label: c.family.id === 'attribute' ? 'Any attribute' : 'Any element' },
    ...c.targets.map(t => ({ mode: t, label: KEY_LABEL[t] })),
    { mode: 'this', label: `${KEY_LABEL[c.from]} (this item)` }
  ]
})

function choose (m: string) {
  if (cand.value) swap!.pick(cand.value, m).catch(() => {})
  pop.value?.hide?.()
}
</script>

<style module>
.pick {
  align-self: center;
  font-size: var(--w-fs-sm);
  line-height: calc(16px * var(--w-text-scale, 1));
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background: var(--w-panel-2);
  color: var(--w-dim);
  white-space: nowrap;
}
.pick:hover { color: var(--w-fg); }
.on { border-color: var(--w-accent); color: var(--w-accent); }
.menu { display: flex; flex-direction: column; padding: var(--w-s1) 0; min-width: calc(140px * var(--w-text-scale, 1)); font-size: var(--w-fs-sm); }
.menu button { text-align: left; padding: 2px var(--w-s3); }
.menu button:hover { background: var(--w-panel-2); }
.sel { color: var(--w-accent); background: var(--w-accent-soft); }
</style>
