<template>
  <div :class="[$style.row, { [$style.withBars]: bars }]">
    <span :class="$style.tags">
      <span v-for="(t, i) in line.tags" :key="i" class="w-num" :class="[$style.tag, gradeClass(t)]">{{ t }}</span>
    </span>
    <span :class="[kindClass, $style.text]">
      <template v-for="(p, i) in line.parts" :key="i"><span v-if="p.number" class="w-num" :class="$style.number">{{ p.text }}</span><span v-else-if="!p.range">{{ p.text }}</span><span v-else-if="!bars" class="w-num" :class="$style.range">{{ p.text }}</span></template>
    </span>
    <span v-if="bars" :class="$style.bars">
      <span v-for="(b, i) in line.bars" :key="i" class="w-num" :class="$style.bar">
        <span :class="$style.low">{{ b.low }}</span>
        <span :class="$style.track">
          <i :class="[$style.fill, heat(b.quality)]" :style="{ width: `${b.at}%` }" />
          <i :class="[$style.marker, heat(b.quality)]" :style="{ left: `${b.at}%` }" />
          <span :class="$style.barPct">{{ b.quality }}%</span>
        </span>
        <span :class="$style.high">{{ b.high }}</span>
      </span>
    </span>
    <span v-else class="w-num" :class="[$style.quality, line.quality != null && heat(line.quality)]">{{ line.quality != null ? `${line.quality}%` : '' }}</span>
  </div>
</template>

<script setup lang="ts">
// One mod of a trade listing: tier on the left, then either its range in the line
// with the roll % on the right, or a bar per roll with the % on the bar.
import { computed, useCssModule } from 'vue'
import type { ModLine } from '../../price-insight/listing-tip-detail'

const props = defineProps<{ line: ModLine, bars: boolean }>()
const $style = useCssModule()

const kindClass = computed(() => props.line.kind === 'crafted' ? $style.crafted : props.line.kind === 'fractured' ? $style.fractured : $style.mod)

function gradeClass (tag: string) {
  if (props.line.kind === 'crafted') return $style.craftedTag
  const n = Number(tag.replace(/\D/g, ''))
  return n === 1 ? $style.t1 : n <= 3 ? $style.t2 : n <= 6 ? $style.t3 : $style.t4
}

function heat (quality: number) {
  return quality === 100 ? $style.perfect : quality >= 67 ? $style.high2 : quality >= 34 ? $style.mid : $style.low2
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
.withBars { grid-template-columns: 3.5rem 1fr 8rem; gap: 0 8px; }
/* The side columns differ, so centred text would sit off the tooltip's middle. */
.withBars .text { text-align: left; }
.tags { display: inline-flex; gap: 2px; }
.tag {
  min-width: 1.5rem;
  padding: 0 3px;
  font-family: var(--w-num);
  font-size: var(--w-fs-sm);
  font-weight: 600;
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
.number { color: #fff; font-family: var(--w-num); font-size: var(--w-fs-md); font-weight: 600; }
.range { color: var(--tip-range); font-family: var(--w-num); font-size: var(--w-fs-md); }
.quality { justify-self: end; font-family: var(--w-num); font-size: var(--w-fs-md); font-weight: 600; }
.low2 { --heat: var(--w-down); color: var(--heat); }
.mid { --heat: var(--w-warn); color: var(--heat); }
.high2 { --heat: var(--w-up); color: var(--heat); }
.perfect { --heat: var(--w-accent); color: var(--w-accent-fg); background: var(--heat); border-radius: 2px; padding: 0 2px; }

.bars { display: flex; flex-direction: column; gap: 2px; }
.bar {
  display: grid;
  grid-template-columns: 1fr 3.5rem 1fr;
  gap: 4px;
  align-items: center;
  color: var(--tip-range);
  font-family: var(--w-num);
  font-size: var(--w-fs-sm);
  white-space: nowrap;
}
.low { text-align: right; }
.high { text-align: left; }
.track {
  position: relative;
  overflow: hidden;
  text-align: center;
  line-height: 1.35;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
/* These take the roll's colour only, never the perfect tag's block. */
.track .fill { position: absolute; inset: 0 auto 0 0; padding: 0; border-radius: 0; background: var(--heat); opacity: 0.4; }
.track .marker { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; padding: 0; border-radius: 0; background: var(--heat); }
.barPct { position: relative; color: #fff; font-weight: 600; }
</style>
