<template>
  <!-- Levelling on the Loot tab (Guy's picks, 2026-11-28, levelling.ts):
       where the Loot rules apply, the levelling layer's switch, and the
       currency that shows while levelling whatever it's worth. -->
  <div :class="$style.wrap" class="w-scroll" data-loot-levelling>
    <div :class="$style.top">
      <WToggle v-model="c.on">Prices decide endgame loot</WToggle>
      <span :class="$style.beta">Beta</span>
      <WInfo :text="INFO" />
    </div>
    <div :class="$style.row">
      <span :class="$style.lab">Loot looks apply</span>
      <WSegmented :model-value="String(gate)" :options="GATES" role="group" aria-label="Where the Loot looks apply" data-levelling-gate @update:model-value="v => setLvGate(c, Number(v) as LvGate)" />
    </div>
    <p class="text-xs w-dim">{{ gateNote }}</p>
    <div :class="$style.row">
      <WToggle :model-value="layer" :disabled="gate === 0" data-levelling-on @update:model-value="v => setLvOn(c, v)">Levelling rules</WToggle>
      <span class="text-xs w-dim">{{ layerNote }}</span>
    </div>

    <h3 :class="$style.head">Currency while levelling</h3>
    <p class="text-xs w-dim">At least Normal below maps, whatever it's worth. Alt+F on any currency adds it or takes it off.</p>
    <div :class="$style.grid">
    <div v-for="r in rows" :key="r.name" :class="$style.item" :data-levelling-item="r.name">
      <WIcon :item="r.art" size="sm" />
      <span v-if="r.tip" v-item-tip="{ name: r.name }" :class="$style.name">{{ r.name }}</span>
      <span v-else :class="$style.name" data-no-item-tip="a group of essences, not one item">{{ r.name }}</span>
      <span class="text-xs w-dim">{{ r.stack ? `Normal, ${r.stack}+ Decent` : 'Normal' }}</span>
      <span class="grow" />
      <input type="checkbox" :checked="r.on" :disabled="!lvOk" :aria-label="`${r.name} while levelling`" @change="toggle(r, !r.on)">
    </div>
    </div>

    <h3 :class="$style.head">Also below maps</h3>
    <ul :class="$style.list" class="text-sm">
      <li>Every unique at least Normal; prices make it louder.</li>
      <li>Every gem at least Normal before Act 4, gems with quality Small until maps. Your build's gems stay on the Build tab, louder.</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WIcon, WInfo, WSegmented, WToggle, vItemTip } from '../ui'
import { LV_CURRENCY, LV_GATES, isLvDefault, lvAdded, lvConds, lvCurrencyOf, lvEssences, lvGate, lvOn, setLvCurrency, setLvEssences, setLvGate, setLvOn } from './levelling'
import type { LvGate } from './levelling'
import type { LootFilterWidget } from './widget'

const props = defineProps<{ config: LootFilterWidget }>()
const c = computed(() => props.config.presets.currency)
const INFO = `The Loot tab's rules for acts 1 to 10 and the hideout, which is always area level 60.
- Everywhere: one look from Act 1 to the endgame.
- Levelling rules keep supplies, uniques and gems visible below maps when their price would hide them.
- They stop at area level 68 by themselves: no filter to switch.`
const GATES = LV_GATES.map(g => ({ value: String(g.value), label: g.label }))
const gate = computed(() => lvGate(c.value))
const gateNote = computed(() => LV_GATES.find(g => g.value === gate.value)!.note)
const layer = computed(() => lvOn(c.value))
const lvOk = computed(() => lvConds(c.value) != null)
const layerNote = computed(() => gate.value === 0
  ? 'Only with the Loot looks below maps.'
  : layer.value ? 'On: supplies, uniques and gems below maps.' : 'Off: prices alone decide below maps.')

interface Row { name: string, art: string, tip: boolean, stack?: number, on: boolean, essence?: true }
const ESSENCE = 'Low essences (Whispering to Wailing)'
const rows = computed<Row[]>(() => {
  const cfg = c.value
  const listed: Row[] = LV_CURRENCY.map(x => ({ name: x.name, art: x.name, tip: true, stack: x.stack, on: !!lvCurrencyOf(cfg, x.name) }))
  const ess: Row = { name: ESSENCE, art: 'Wailing Essence of Greed', tip: false, on: lvEssences(cfg), essence: true }
  const added: Row[] = lvAdded(cfg).filter(n => !isLvDefault(n)).map(n => ({ name: n, art: n, tip: true, on: true }))
  return [...listed, ess, ...added]
})
function toggle (r: Row, on: boolean) {
  if (r.essence) setLvEssences(c.value, on)
  else setLvCurrency(c.value, r.name, on)
}
</script>

<style module>
.wrap { flex: 1 1 auto; min-width: 0; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 6px; }
.top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.beta { font-size: var(--w-fs-xs); color: var(--w-dim); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); padding: 0 4px; }
.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lab { font-size: var(--w-fs-sm); color: var(--w-dim); min-width: 8em; }
.head { margin: 10px 0 0; font-size: var(--w-fs-sm); color: #e2d3ad; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 4px; }
.item { display: flex; align-items: center; gap: 10px; padding: 3px 10px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.name { color: #e2d3ad; font-size: var(--w-fs-sm); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list { margin: 0; padding-left: 18px; color: var(--w-dim); display: grid; gap: 2px; }
</style>
