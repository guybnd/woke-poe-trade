<template>
  <div v-if="result" :class="[$style.strip, isUnsure(result) ? $style.unknown : $style[result.verdict.verdict]]">
    <button type="button" :class="$style.row" @click="open = !open"
      :aria-expanded="open" aria-label="Show map mod ratings">
      <span :class="$style.badge">{{ isUnsure(result) ? '?' : VERDICT_LABEL[result.verdict.verdict] }}</span>
      <span :class="$style.headline" class="w-trunc">{{ headline }}</span>
      <span class="flex-1" />
      <template v-if="result.juice">
        <span class="w-dim text-xs">Juice</span>
        <span class="w-num w-accent font-semibold">{{ result.juice.score }}</span>
      </template>
      <i class="fas w-dim text-xs" :class="open ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </button>
    <div :class="$style.chips">
      <span v-for="p in result.props" :key="p.label" :class="$style.chip" class="w-num">{{ p.label }} {{ p.value }}%</span>
      <span v-if="result.verdict.warn.length" :class="[$style.chip, $style.warnChip]">{{ warnText }}</span>
    </div>
    <div v-if="open" :class="$style.list">
      <div v-for="(mod, i) in result.verdict.mods" :key="`${i}:${mod.matcher}`" :class="$style.mod">
        <span :class="[$style.dot, $style[mod.rating]]" />
        <span :class="{ 'w-dim': mod.rating === 'ok' }">{{ mod.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { ParsedItem } from '@/parser'
import { shortLabel } from './rules'
import type { Verdict } from './rules'
import { checkMap, findMapModsConfig, isMapLike, isUnsure } from './check'

const props = defineProps<{ item: ParsedItem }>()

const VERDICT_LABEL: Record<Verdict, string> = { skip: 'SKIP', careful: 'CARE', run: 'RUN' }

const open = shallowRef(false)

const result = computed(() => {
  const config = findMapModsConfig()
  if (!config || !config.stripOnPriceCheck || !isMapLike(props.item) || props.item.isUnidentified) return null
  return checkMap(props.item, config)
})

const headline = computed(() => {
  const v = result.value!.verdict
  if (v.deadly.length) return v.deadly.map(m => shortLabel(m.matcher)).join(' · ')
  if (v.warn.length) return 'Careful'
  if (result.value!.unknown.length) return "Couldn't read every mod"
  return 'Safe for your build'
})

const warnText = computed(() => result.value!.verdict.warn.map(m => shortLabel(m.matcher)).join(' · '))
</script>

<style module>
.strip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border-radius: var(--w-r-md);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
}
.skip { border-color: color-mix(in srgb, var(--w-down) 55%, transparent); }
.careful { border-color: color-mix(in srgb, var(--w-warn) 45%, transparent); }
.row { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; }
.badge {
  flex: none;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--w-r-sm);
  color: var(--w-accent-fg);
}
.skip .badge { background: var(--w-down); }
.careful .badge { background: var(--w-warn); }
.run .badge { background: var(--w-up); }
.unknown .badge { background: var(--w-panel-3); color: var(--w-dim); }
.headline { font-weight: 500; min-width: 0; }
.skip .headline { color: var(--w-down); }
.careful .headline { color: var(--w-warn); }
.run .headline { color: var(--w-up); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip {
  font-size: var(--w-fs-sm);
  padding: 0 7px;
  border-radius: var(--w-r-pill);
  background: var(--w-panel-2);
  color: var(--w-dim);
}
.warnChip { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 12%, transparent); }
.list { display: flex; flex-direction: column; gap: 2px; padding-top: 4px; border-top: 1px solid var(--w-line); }
.mod { display: flex; align-items: center; gap: 6px; font-size: var(--w-fs-sm); }
.dot { flex: none; width: 7px; height: 7px; border-radius: var(--w-r-sm); background: var(--w-panel-3); }
.dot.deadly { background: var(--w-down); }
.dot.warn { background: var(--w-warn); }
.dot.good { background: var(--w-up); }
</style>
