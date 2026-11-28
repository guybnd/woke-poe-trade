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

    <h3 :class="$style.head">Your build</h3>
    <p class="text-xs w-dim">Picks the weapons and armour that show while levelling. Other builds' white and blue gear hides; their rares show Small.</p>
    <div :class="$style.row" data-levelling-build>
      <span :class="$style.lab">Build type</span>
      <WSegmented :model-value="w.archetype" :options="ARCH" role="group" aria-label="Build type" @update:model-value="setArchetype" />
    </div>
    <div :class="$style.row">
      <span :class="$style.lab">Weapons</span>
      <div :class="$style.chips" data-levelling-weapons>
        <WChip v-for="k in WEAPON_CLASSES" :key="k" clickable :active="kept.includes(k)" :aria-pressed="kept.includes(k)" @click="toggleWeapon(k)">{{ k }}</WChip>
      </div>
    </div>
    <div :class="$style.row">
      <span :class="$style.lab">Armour</span>
      <div :class="$style.chips" style="flex: 0 1 auto;" data-levelling-defences>
        <WChip v-for="d in DEFENCE_CHIPS" :key="d.bit" clickable :active="(defs & d.bit) !== 0" :aria-pressed="(defs & d.bit) !== 0" @click="toggleDef(d.bit)">{{ d.label }}</WChip>
      </div>
      <span class="text-xs w-dim">{{ buildNote }}</span>
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
      <li>5- and 6-links Big, 4-links Decent, 3-links Normal until Act 3, small R-G-B items Small until Act 3. Links in your build's colours stay on the Build tab, louder.</li>
      <li>Movement speed boots Decent with a sound: 10 to 15% until Act 5, 20% or more until maps.</li>
      <li>White and blue weapons of your build on a base that drops within 5 levels of the area at Normal.</li>
      <li>Every rare Normal until Act 3, then rares on a base within 10 levels of the area. Big rares (2x3 and up) one step quieter. Rare boots and jewellery always Normal.</li>
      <li>Every white and blue ring, amulet and belt until Act 2, then Ruby, Sapphire, Topaz and Two-Stone rings, Leather and Heavy belts, Amber, Jade, Lapis and Onyx amulets until Act 6.</li>
      <li>Life, mana and hybrid flasks: the two newest sizes for the area, the newest louder with a sound; older sizes without quality hide. Every utility flask, Quicksilver louder.</li>
      <li>Every unique at least Normal; prices make it louder.</li>
      <li>Every gem at least Normal before Act 4, gems with quality Small until maps. Your build's gems stay on the Build tab, louder.</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WChip, WIcon, WInfo, WSegmented, WToggle, vItemTip } from '../ui'
import { LV_CURRENCY, LV_GATES, isLvDefault, lvAdded, lvConds, lvCurrencyOf, lvEssences, lvGate, lvOn, setLvCurrency, setLvEssences, setLvGate, setLvOn } from './levelling'
import type { LvGate } from './levelling'
import type { LootFilterWidget } from './widget'
import type { LootFilterStore } from './store'
import { ARCHETYPES, archetypeClasses, toggleWeaponClass } from './presets'
import { WEAPON_CLASSES } from './build-rules'
import { DEFENCE_CHIPS, DEF_ALL, clearLvDefences, lvDefences, setLvDefences } from './levelling-gear'

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
  : layer.value ? 'On: supplies, uniques and gems below maps.' : 'Off: prices alone decide below maps.')

// The build template (pick "weapons" A and Guy's note: templates by build
// type). Shared with the Presets tab's "only weapons for" switch.
const ARCH = ARCHETYPES.filter(a => a.key !== 'custom').map(a => ({ value: a.key, label: a.key === 'auto' ? 'Auto (PoB)' : a.label === 'Melee attack' ? 'Melee' : a.label }))
const p = computed(() => props.config.presets)
const w = computed(() => p.value.weapons)
const build = props.store.buildInput
const kept = computed(() => archetypeClasses(p.value, build.value?.weaponClasses ?? null) ?? WEAPON_CLASSES)
const defs = computed(() => lvDefences(c.value, w.value, build.value?.rareBases ?? []))
function setArchetype (v: string) {
  const a = ARCHETYPES.find(x => x.key === v)
  if (!a || a.key === 'custom') return
  p.value.weapons = { on: w.value.on, archetype: a.key, classes: [] }
  clearLvDefences(c.value)
}
function toggleWeapon (k: string) {
  p.value.weapons = toggleWeaponClass(p.value, build.value?.weaponClasses ?? null, k)
}
function toggleDef (bit: number) {
  const next = defs.value ^ bit
  if (next) setLvDefences(c.value, next)
}
const buildNote = computed(() => {
  if (w.value.archetype === 'auto' && !build.value) return 'No PoB build yet: every weapon and armour type shows.'
  return defs.value === DEF_ALL ? 'Every armour type shows.' : ''
})

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
.chips { flex: 1 1 0; min-width: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.list { margin: 0; padding-left: 18px; color: var(--w-dim); display: grid; gap: 2px; }
</style>
