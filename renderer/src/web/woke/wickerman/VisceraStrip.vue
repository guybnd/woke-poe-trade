<template>
  <div v-if="v" :class="$style.strip" data-woke-viscera>
    <div v-for="(t, i) in v.tiers" :key="t.label" :class="[$style.tier, i === held && $style.held]">
      <span :class="$style.label">{{ t.label }}</span>
      <span :class="[$style.text, i !== held && 'w-dim']">{{ t.text }}</span>
      <span v-if="i === held" :class="$style.yours">yours</span>
    </div>
    <div :class="$style.drops">
      <template v-if="v.act">
        <span class="w-dim">Act {{ v.act.n }}</span>
        <span :class="v.act.unsure && $style.unsure" :title="v.act.unsure ? 'Not confirmed' : undefined">{{ actLine(v) }}</span>
      </template>
      <template v-for="m in v.maps" :key="m.boss + m.map">
        <span class="w-dim">{{ m.kind === 'Map boss' ? 'Map' : m.kind }}</span>
        <span :class="m.unsure && $style.unsure" :title="m.unsure ? 'Not confirmed' : undefined">{{ m.boss }}, {{ m.map }}</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watchEffect } from 'vue'
import type { ParsedItem } from '@/parser'
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'
import { actLine, heldTier, loadViscera } from './viscera'
import type { VisceraTable } from './viscera'

const props = defineProps<{ item: ParsedItem }>()

const table = shallowRef<VisceraTable | null>(null)
const on = computed(() => isModuleOn(AppConfig(), 'wickerman'))

watchEffect(() => {
  if (on.value && !table.value) loadViscera().then(t => { table.value = t }).catch(() => {})
})

const lines = computed(() => props.item.rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l && l !== '--------'))
// The name as copied ("Greater Skeletal Warrior's Leg"): the first line after the header.
const copiedName = computed(() => lines.value.find(l => !/^(Item Class|Rarity):/.test(l)) ?? '')

const v = computed(() => {
  if (!on.value || !table.value) return null
  return table.value.byName.get(props.item.info.refName.toLowerCase()) ?? null
})

const held = computed(() => v.value ? heldTier(v.value, copiedName.value, lines.value) : null)
</script>

<style module>
.strip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: var(--w-r-md);
  border: 1px solid var(--w-line-strong);
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
}
.tier { display: flex; align-items: baseline; gap: 8px; padding: 1px 4px; margin: 0 -4px; border-radius: var(--w-r-sm); }
.held { background: var(--w-accent-soft); }
.label { flex: none; min-width: 3.5em; color: var(--w-gold); font-family: var(--w-caps-face); }
.text { min-width: 0; white-space: pre-line; color: var(--w-r-magic); }
.yours {
  flex: none;
  margin-left: auto;
  font-size: var(--w-fs-xs);
  padding: 0 5px;
  border-radius: var(--w-r-sm);
  background: var(--w-accent);
  color: var(--w-accent-fg);
}
.drops {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1px 10px;
  margin-top: 3px;
  padding-top: 4px;
  border-top: 1px solid var(--w-line);
}
.unsure { text-decoration: underline dotted; text-underline-offset: 2px; }
</style>
