<template>
  <!-- Your build, on Loot › Levelling
       (Guy's pick X, 2026-11-28): the gear template for
       levelling (build type, weapon types, armour) and the PoB build rules. -->
  <div :class="$style.wrap" data-build-section>
    <div :class="$style.row" data-levelling-build>
      <span :class="$style.lab">Build type</span>
      <WSegmented :model-value="w.archetype" :options="ARCH" role="group" aria-label="Build type" @update:model-value="setArchetype" />
      <span :class="$style.lab" style="min-width: 0;">Armour</span>
      <div :class="$style.chips" style="flex: 0 1 auto;" data-levelling-defences>
        <WChip v-for="d in DEFENCE_CHIPS" :key="d.bit" clickable :active="(defs & d.bit) !== 0" :aria-pressed="(defs & d.bit) !== 0" @click="toggleDef(d.bit)">{{ d.label }}</WChip>
      </div>
      <WInfo text="The gear that shows while levelling.
- Other builds' white and blue gear hides; their rares show Small.
- Auto (PoB) reads your active PoB build." />
    </div>
    <div :class="$style.row">
      <span :class="$style.lab">Weapons</span>
      <div :class="$style.chips" data-levelling-weapons>
        <WChip v-for="k in WEAPON_CLASSES" :key="k" clickable :active="kept.includes(k)" :aria-pressed="kept.includes(k)" @click="toggleWeapon(k)">{{ k }}</WChip>
      </div>
    </div>

    <template v-if="input">
      <div class="w-dim text-sm flex items-center gap-2" :class="$style.intro">
        <span>Rules for <span class="w-accent">{{ input.buildName }}</span></span>
        <WInfo text="Rules for your active build's gems, link colours and uniques.
- They go at the top of your saved copy, ahead of NeverSink's.
- They show louder than the levelling looks above." />
      </div>
      <div v-for="r in buildRows" :key="r.key" :class="$style.ruleRow">
        <WChip clickable :active="config.buildRules[r.key]" :title="config.buildRules[r.key] ? 'Turn off' : 'Turn on'" @click="config.buildRules[r.key] = !config.buildRules[r.key]">
          {{ config.buildRules[r.key] ? 'On' : 'Off' }}
        </WChip>
        <span class="grow min-w-0 flex flex-col">
          <span>{{ r.label }}</span>
          <span class="w-dim text-xs w-trunc" :title="r.detail">{{ r.detail }}</span>
        </span>
        <LabelPreview v-if="r.block" :text="r.sample" :actions="r.block.actions" :visibility="r.block.visibility" />
        <span v-else-if="config.buildRules[r.key]" class="w-faint text-xs">nothing to add</span>
      </div>
    </template>
    <p v-else class="text-xs w-dim" :class="$style.intro">No PoB build in use. Press Use build in PoB builds to add rules for its gems, links and uniques.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WChip, WInfo, WSegmented } from '../ui'
import LabelPreview from './LabelPreview.vue'
import type { LootFilterWidget } from './widget'
import type { LootFilterStore } from './store'
import { ARCHETYPES, archetypeClasses, toggleWeaponClass } from './presets'
import { BUILD_RULE_TYPE, LEVELLING_BELOW, WEAPON_CLASSES } from './build-rules'
import type { BuildRuleSwitches } from './build-rules'
import { COLOUR_NAME } from '../pob-builds/build-model'
import { DEFENCE_CHIPS, clearLvDefences, lvDefences, setLvDefences } from './levelling-gear'

const props = defineProps<{ config: LootFilterWidget, store: LootFilterStore }>()
const c = computed(() => props.config.presets.currency)
const p = computed(() => props.config.presets)
const w = computed(() => p.value.weapons)
const input = computed(() => props.store.buildInput.value)

// The gear template (pick "weapons" A and Guy's note: templates by build
// type). Shared with the Presets tab's "only weapons for" switch.
const ARCH = ARCHETYPES.filter(a => a.key !== 'custom').map(a => ({ value: a.key, label: a.key === 'auto' ? 'Auto (PoB)' : a.label === 'Melee attack' ? 'Melee' : a.label }))
const kept = computed(() => archetypeClasses(p.value, input.value?.weaponClasses ?? null) ?? WEAPON_CLASSES)
const defs = computed(() => lvDefences(c.value, w.value, input.value?.rareBases ?? []))
function setArchetype (v: string) {
  const a = ARCHETYPES.find(x => x.key === v)
  if (!a || a.key === 'custom') return
  p.value.weapons = { on: w.value.on, archetype: a.key, classes: [] }
  clearLvDefences(c.value)
}
function toggleWeapon (k: string) {
  p.value.weapons = toggleWeaponClass(p.value, input.value?.weaponClasses ?? null, k)
}
function toggleDef (bit: number) {
  const next = defs.value ^ bit
  if (next) setLvDefences(c.value, next)
}

function buildBlock (tier: string) {
  return props.store.doc.value?.blocks.find(b => b.type === BUILD_RULE_TYPE && b.tier === tier) ?? null
}
const buildRows = computed(() => {
  const b = input.value
  if (!b) return []
  const list = (xs: string[]) => xs.length > 4 ? `${xs.slice(0, 4).join(', ')} +${xs.length - 4}` : xs.join(', ')
  const coloured = b.linkColours.filter(x => x !== 'w')
  const rows: Array<{ key: keyof BuildRuleSwitches, label: string, detail: string, tier: string, sample: string }> = [
    { key: 'gems', label: 'Show my gems', tier: 'gems', sample: b.gems[0] ?? 'Gem', detail: `${b.gems.length} gems, while levelling (area level below ${LEVELLING_BELOW})` },
    { key: 'links', label: 'Linked items in my colours', tier: coloured.length >= 4 ? 'links4' : 'links3', sample: 'Linked item', detail: coloured.length >= 2 ? `${coloured.map(x => COLOUR_NAME[x]).join('-')} main link, 3- and 4-links, while levelling` : 'The main link needs 2+ coloured gems' },
    { key: 'uniques', label: 'My uniques', tier: 'uniques', sample: b.uniqueBases[0] ?? 'Unique', detail: b.uniqueBases.length ? `Bases: ${list(b.uniqueBases)}` : 'No uniques in the build' },
    { key: 'bases', label: 'My rare bases', tier: 'bases', sample: b.rareBases[0] ?? 'Rare', detail: b.rareBases.length ? list(b.rareBases) : 'No rare items in the item set for your level' },
    { key: 'hideWeapons', label: 'Hide other weapon types while levelling', tier: 'otherweapons', sample: 'Other weapon', detail: b.weaponClasses.length ? `White and blue only; keeps ${b.weaponClasses.join(', ')} (${WEAPON_CLASSES.length - b.weaponClasses.length} types hidden)` : 'No weapon in the build' }
  ]
  return rows.map(r => ({ ...r, block: props.config.buildRules[r.key] ? buildBlock(r.tier) : null }))
})
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 0 var(--w-pad); }
.lab { font-size: var(--w-fs-sm); color: var(--w-dim); min-width: 6em; }
.chips { flex: 1 1 0; min-width: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.intro { padding: 8px var(--w-pad) 2px; max-width: 60rem; }
.ruleRow { display: flex; align-items: center; gap: 10px; padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line-soft); }
</style>
