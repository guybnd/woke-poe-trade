<template>
  <!-- woke: Guy's pick F1. The weapon's or armour's numbers at the top of PoE mode's well.
       Clicking a number picks its filter (gold outline, its row opens under the header);
       clicking it again unpicks it. Never searches: Search stays manual.
       One click listener for the whole header. -->
  <div :class="$style.head" data-stat-header @click="onClick">
    <div :class="$style.top">
      <component :is="c.filter ? 'button' : 'span'" v-for="c of model.bigs" :key="c.key"
        :type="c.filter ? 'button' : undefined" :data-cell="c.key"
        :class="[$style.big, cellClass(c)]" :title="cellTitle(c)">
        <span><span :class="$style.v">{{ c.text }}</span> <span :class="$style.k">{{ c.label }}</span></span>
        <span :class="[$style.track, { [$style.off]: c.fill == null }]"><b :style="barStyle(c)" /></span>
      </component>
      <span v-if="model.chips.length" :class="$style.chips">
        <component :is="c.filter ? 'button' : 'span'" v-for="c of model.chips" :key="c.key"
          :type="c.filter ? 'button' : undefined" :data-cell="c.key"
          :class="[$style.chip, cellClass(c)]" :title="cellTitle(c)">
          <span>{{ c.text }} <span :class="$style.ck">{{ c.label }}</span></span>
          <span :class="[$style.track, { [$style.off]: c.fill == null }]"><b :style="barStyle(c)" /></span>
        </component>
      </span>
    </div>
    <div v-if="(model.split?.length ?? 0) > 1" :class="$style.split" aria-hidden="true">
      <span v-for="s of model.split" :key="s.key" :style="{ flexGrow: s.share, background: s.color }" />
    </div>
    <div v-if="model.legend?.length" :class="$style.legend">
      <component :is="c.filter ? 'button' : 'span'" v-for="c of model.legend" :key="c.key"
        :type="c.filter ? 'button' : undefined" :data-cell="c.key"
        :class="[$style.mini, cellClass(c)]" :title="cellTitle(c)">
        <span><i :class="$style.sw" :style="{ background: c.color }" /><span :class="$style.n">{{ c.text }}</span> {{ c.label }}</span>
        <span :class="[$style.track, { [$style.off]: c.fill == null }]"><b :style="barStyle(c)" /></span>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useCssModule } from 'vue'
import type { HeaderCell, HeaderModel } from './stat-header'
import { notePick, pickFixed } from './stat-header'

const props = defineProps<{ model: HeaderModel }>()
const $style = useCssModule()

const cells = computed(() => {
  const m = props.model
  return new Map([...m.bigs, ...m.chips, ...(m.legend ?? [])].map(c => [c.key, c]))
})

function cellClass (c: HeaderCell) {
  return { [$style.hit]: Boolean(c.filter), [$style.sel]: c.filter != null && !c.filter.disabled, [$style.ro]: !c.filter, [$style.fixed]: c.fixed }
}

function cellTitle (c: HeaderCell) {
  const name = c.name ?? c.label
  if (!c.filter) return `${name}: nothing on this item can change it`
  if (c.fixed && c.filter.disabled) return `${name} is the same on every copy unless a corruption, enchant or quality raised it. Click to search at least yours.`
  const bar = (c.fill == null) ? ' Grey bar: nothing on this item can roll it.' : ' Bar: how close its rolls came to their max.'
  return (c.filter.disabled
    ? `Click to search ${name}. Searches only when you press Search.`
    : `Click to stop searching ${name}.`) + bar
}

function barStyle (c: HeaderCell) {
  if (c.fill == null) return { width: '100%' }
  return { width: `${Math.round(c.fill * 100)}%`, ...(c.color ? { background: c.color } : {}) }
}

function onClick (e: MouseEvent) {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cell]')
  const c = el && cells.value.get(el.dataset.cell!)
  if (!c?.filter) return
  const f = c.filter
  if (f.disabled) {
    notePick(f)
    pickFixed(f)
  }
  f.disabled = !f.disabled
}
</script>

<style module>
.head {
  user-select: none;
  margin: 0 6px 4px;
  padding: 2px 6px 8px;
  border-bottom: 1px solid var(--w-gold-fade, var(--w-line));
  color: var(--w-fg);
}
.top {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 6px 10px;
}
.hit { cursor: pointer; border-radius: var(--w-r-sm, 2px); }
.hit:hover { background: var(--w-accent-soft); }
.sel, .sel:hover { box-shadow: inset 0 0 0 1px var(--w-gold-hi); background: var(--w-accent-soft); }
.big {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 90px;
  padding: 2px 4px;
  text-align: left;
}
.v {
  font: 500 calc(22px * var(--w-text-scale, 1)) var(--w-num);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: var(--w-gold-hi);
}
.k, .ck {
  font: 600 var(--w-fs-xs) var(--w-small);
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--w-dim);
}
.ck { letter-spacing: .05em; }
.chips { margin-left: auto; display: flex; gap: 6px; }
.chip {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 2px 7px;
  border: 1px solid var(--w-chip-line);
  font: 500 var(--w-fs-md) var(--w-num);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.chip.ro { border-color: transparent; opacity: .7; cursor: default; }
/* Nothing can roll it, so no roll bar either. */
.ro .track, .fixed .track { visibility: hidden; }
.track {
  position: relative;
  display: block;
  height: 3px;
  background: var(--w-chip-line);
}
.track > b {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #6b5636, var(--w-gold-hi));
}
.big .track { height: 4px; }
.track.off > b { background: var(--w-faint) !important; opacity: .45; }
/* PoE 1 / PoE 2 art: a sunken track and the stat's colour dyed down, with a lit
 * top edge, like the tooltip's roll bars. */
:global(:root[data-woke-art]) .track {
  height: 4px;
  background: #120d08;
  border-radius: 2px;
  box-shadow: inset 0 1px 2px #000, 0 0 0 1px #3a2c18;
}
:global(:root[data-woke-art]) .big .track { height: 5px; }
:global(:root[data-woke-art]) .track > b {
  border-radius: 2px;
  filter: saturate(0.7) brightness(0.85);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.split { display: flex; gap: 1px; height: 8px; margin-top: 9px; }
.split > span { display: block; height: 100%; flex-basis: 0; min-width: 2px; }
.legend {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 12px;
  margin-top: 7px;
  font: var(--w-fs-md) var(--w-small);
}
.mini { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 2px 3px; text-align: left; white-space: nowrap; }
.sw { display: inline-block; width: 8px; height: 8px; margin-right: 5px; }
.n { font-family: var(--w-num); font-variant-numeric: tabular-nums; color: var(--w-gold-hi); }
</style>
