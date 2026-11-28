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
    <div :class="$style.tl" data-levelling-timeline>
      <span /><span />
      <div :class="$style.axis" aria-hidden="true"><span v-for="a in AXIS" :key="a">{{ a }}</span></div>
      <template v-for="r in TIMELINE" :key="r.name">
        <WIcon :item="r.art" size="sm" />
        <span :class="$style.tlName" :title="r.tip" :data-levelling-rule="r.name" data-no-item-tip="a levelling rule, not one item">{{ r.name }}</span>
        <div :class="$style.bar" :title="`${r.look}${r.sound ? ', with a sound' : ''}: ${r.tip}`">
          <div v-for="(s, i) in r.segs" :key="i" :class="[$style.seg, $style[s.look]]" :style="{ gridColumn: `${s.from} / ${s.to + 1}` }">{{ s.label ?? r.look }}{{ r.sound && i === 0 ? ' ♪' : '' }}</div>
        </div>
      </template>
    </div>

    <h3 :class="$style.head">Your build</h3>
    <BuildSection :config="config" :store="store" :class="$style.build" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WIcon, WInfo, WSegmented, WToggle, vItemTip } from '../ui'
import BuildSection from './BuildSection.vue'
import { LV_CURRENCY, LV_GATES, isLvDefault, lvAdded, lvConds, lvCurrencyOf, lvEssences, lvGate, lvOn, setLvCurrency, setLvEssences, setLvGate, setLvOn } from './levelling'
import type { LvGate } from './levelling'
import type { LootFilterWidget } from './widget'
import type { LootFilterStore } from './store'

const props = defineProps<{ config: LootFilterWidget, store: LootFilterStore }>()
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
  : layer.value ? 'On: below maps these rules replace NeverSink\'s levelling rules.' : 'Off: prices and NeverSink\'s levelling rules decide below maps.')

// "Also below maps" as an act timeline (Guy's pick B, 2026-11-28): one bar
// per rule across Act 1 to maps, coloured by look; the details on hover.
// Columns 1-10 are acts, 11 is maps.
type Look = 'big' | 'decent' | 'normal' | 'small' | 'green'
interface Seg { from: number, to: number, look: Look, label?: string }
interface TRow { name: string, art: string, look: string, tip: string, segs: Seg[], sound?: true }
const AXIS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Maps']
const all = (look: Look): Seg[] => [{ from: 1, to: 10, look }]
const TIMELINE: TRow[] = [
  { name: '5- and 6-links', art: 'Astral Plate', look: 'Big', segs: all('big'), tip: 'Any 5- or 6-link. Links in your build\'s colours stay on the Build tab, louder.' },
  { name: '4-links', art: 'Simple Robe', look: 'Decent', segs: all('decent'), tip: 'Any 4-link.' },
  { name: '3-links', art: 'Plate Vest', look: 'Normal', segs: [{ from: 1, to: 3, look: 'normal' }], tip: 'Any 3-link until Act 3.' },
  { name: 'Small R-G-B', art: 'Chromatic Orb', look: 'Small', segs: [{ from: 1, to: 3, look: 'small' }], tip: 'Small items with red, green and blue linked sockets, for the Chromatic recipe.' },
  { name: 'Speed boots 10-15%', art: 'Two-Toned Boots', look: 'Decent', sound: true, segs: [{ from: 1, to: 5, look: 'decent' }], tip: 'Boots with 10 or 15% movement speed until Act 5.' },
  { name: 'Speed boots 20%+', art: 'Two-Toned Boots', look: 'Decent', sound: true, segs: all('decent'), tip: 'Boots with 20% movement speed or more.' },
  { name: 'Your weapons', art: 'Rusted Sword', look: 'Normal', segs: all('normal'), tip: 'White and blue weapons of your build on a base that drops within 5 levels of the area.' },
  { name: 'Rares', art: 'Iron Hat', look: 'Normal', segs: [{ from: 1, to: 3, look: 'normal', label: 'All' }, { from: 4, to: 10, look: 'normal', label: 'New base' }], tip: 'Every rare until Act 3, then rares on a base within 10 levels of the area. Big rares (2x3 and up) one step quieter.' },
  { name: 'Older rares', art: 'Iron Hat', look: 'Small', segs: [{ from: 4, to: 10, look: 'small' }], tip: 'Rares on an older base, and other builds\' rares. Rare boots and jewellery always Normal.' },
  { name: 'Jewellery', art: 'Ruby Ring', look: 'Normal', segs: [{ from: 1, to: 2, look: 'normal', label: 'All' }, { from: 3, to: 6, look: 'normal', label: 'Useful' }], tip: 'Every white and blue ring, amulet and belt until Act 2, then Ruby, Sapphire, Topaz and Two-Stone rings, Leather and Heavy belts, Amber, Jade, Lapis and Onyx amulets.' },
  { name: 'Newest flask size', art: 'Small Life Flask', look: 'Decent', sound: true, segs: all('decent'), tip: 'The newest life, mana and hybrid flask size for the area.' },
  { name: 'Second-newest size', art: 'Small Mana Flask', look: 'Normal', segs: all('normal'), tip: 'The size before it. Older sizes without quality hide.' },
  { name: 'Utility flasks', art: 'Quicksilver Flask', look: 'Normal', segs: all('normal'), tip: 'Every utility flask and tincture; Quicksilver one step louder.' },
  { name: 'Your armour', art: 'Plate Vest', look: 'Small', segs: [{ from: 1, to: 1, look: 'small', label: 'All' }, { from: 2, to: 10, look: 'small', label: 'New base' }], tip: 'White and blue armour in your defences: every piece in Act 1, then on a base within 5 levels of the area. Other white and blue gear hides.' },
  { name: 'Uniques', art: 'Goldrim', look: 'Normal+', segs: all('normal'), tip: 'Every unique at least Normal; prices make it louder.' },
  { name: 'Gems', art: 'Arc', look: 'Normal', segs: [{ from: 1, to: 3, look: 'normal' }, { from: 4, to: 10, look: 'small', label: 'Quality' }], tip: 'Every gem before Act 4, then gems with quality Small. Your build\'s gems stay on the Build tab, louder.' },
  { name: 'Quest-like items', art: 'Treasure Key', look: 'Green', segs: [{ from: 1, to: 11, look: 'green' }], tip: 'Lab trinkets and keys, incursion items and heist targets: green with a moon on the minimap, everywhere.' }
]

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
.tl { display: grid; grid-template-columns: 22px minmax(8rem, 11rem) minmax(0, 1fr); gap: 3px 8px; align-items: center; }
.tlName { font-size: var(--w-fs-sm); color: #e2d3ad; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.axis { display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); font-size: var(--w-fs-xs); color: var(--w-dim); text-align: center; }
.bar { height: 18px; display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); background: rgba(0, 0, 0, 0.35); border: 1px solid var(--w-line); border-radius: 2px; }
.seg { height: 100%; font-size: 11px; line-height: 16px; text-align: center; font-weight: 600; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #120e0a; }
.seg + .seg { border-left: 1px solid rgba(0, 0, 0, 0.6); }
.big { background: #f0a848; }
.decent { background: #ddd3bf; }
.normal { background: #9d9586; }
.small { background: #4c463e; color: #d8cfc0; }
.green { background: #3f9a35; }
.build { margin: 0 calc(-1 * var(--w-pad)); }
</style>
