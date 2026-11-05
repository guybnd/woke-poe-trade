<template>
  <div :class="$style.row">
    <span :class="$style.tags">
      <span v-for="(t, i) in line.tags" :key="i" class="w-num" :class="[$style.tag, gradeClass(t)]">{{ t }}</span>
    </span>
    <span :class="[kindClass, $style.text]">
      <template v-for="(p, i) in line.parts" :key="i"><span v-if="p.range" :class="$style.range">{{ p.text }}</span><template v-else>{{ p.text }}</template></template>
    </span>
    <span class="w-num" :class="[$style.quality, { [$style.perfect]: line.quality === 100 }]">{{ line.quality != null ? `${line.quality}%` : '' }}</span>
  </div>
</template>

<script setup lang="ts">
// One mod of a trade listing: tier on the left, roll quality on the right.
import { computed, useCssModule } from 'vue'
import type { ModLine } from '../../price-insight/listing-tip-detail'

const props = defineProps<{ line: ModLine }>()
const $style = useCssModule()

const kindClass = computed(() => props.line.kind === 'crafted' ? $style.crafted : props.line.kind === 'fractured' ? $style.fractured : $style.mod)

function gradeClass (tag: string) {
  if (props.line.kind === 'crafted') return $style.craftedTag
  const n = Number(tag.replace(/\D/g, ''))
  return n === 1 ? $style.t1 : n <= 3 ? $style.t2 : n <= 6 ? $style.t3 : $style.t4
}
</script>

<style module>
.row {
  display: grid;
  grid-template-columns: 3.5rem 1fr 3.5rem;
  gap: 0 4px;
  align-items: center;
  margin: 0 -8px;
}
.tags { display: inline-flex; gap: 2px; }
.tag {
  min-width: 1.5rem;
  padding: 0 3px;
  font-family: var(--w-num);
  font-size: var(--w-fs-sm);
  line-height: 1.35;
  border-radius: 2px;
}
.t1 { background: var(--w-accent); color: var(--w-accent-fg); }
.t2 { color: var(--w-accent); box-shadow: inset 0 0 0 1px var(--w-accent); }
.t3 { color: var(--w-r-normal); box-shadow: inset 0 0 0 1px var(--w-faint); }
.t4 { color: var(--w-faint); }
.craftedTag { color: var(--w-mod-crafted); box-shadow: inset 0 0 0 1px var(--w-mod-crafted); }
.text { white-space: pre-line; }
.mod { color: var(--w-r-magic); }
.crafted { color: var(--w-mod-crafted); }
.fractured { color: var(--w-mod-fractured); }
.range { color: var(--w-dim); font-size: var(--w-fs-md); }
.quality { text-align: right; color: var(--w-dim); font-family: var(--w-num); font-size: var(--w-fs-md); }
.perfect { color: var(--w-accent); }
</style>
