<template>
  <div>
    <div :class="$style.title">
      <WIcon v-if="isImageIcon(card.icon)" :src="card.icon" size="lg" />
      <i v-else :class="card.icon" />
      <span>{{ card.title ?? card.name }}</span>
    </div>
    <div v-for="(section, i) in card.sections" :key="i" :class="$style.section">
      <div v-if="section.label" :class="$style.label">{{ section.label }}</div>
      <p v-for="(t, j) in section.text ?? []" :key="'t' + j" class="w-dim" :class="$style.text">{{ t }}</p>
      <div v-for="(row, j) in section.rows ?? []" :key="'r' + j" v-item-tip="row.item ?? null" :class="$style.row">
        <span class="w-trunc" :class="row.dim ? 'w-dim' : undefined">{{ row.label }}</span>
        <WPrice v-if="row.chaos !== undefined" :chaos="row.chaos" :divine="divine" />
        <span v-else-if="row.value" :class="[$style.value, row.dim ? 'w-dim' : undefined]">{{ row.value }}</span>
      </div>
    </div>
    <div v-if="card.actions.length" :class="$style.acts">
      <WButton v-for="a in card.actions" :key="a.label" size="sm" @click="$emit('act', a)">{{ a.label }}</WButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WButton, WIcon, WPrice, vItemTip } from '../ui'
import { isImageIcon } from './lookups/types'
import type { LookupAction, LookupCard } from './lookups/types'

defineProps<{ card: LookupCard, divine: number | null }>()
defineEmits<{ (e: 'act', action: LookupAction): void }>()
</script>

<style module>
.title { display: flex; align-items: center; gap: var(--w-s2); margin-bottom: var(--w-s2); font-size: var(--w-fs-lg); }
.section { margin-top: var(--w-s2); }
.label { font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); font-family: var(--w-caps-face); border-bottom: 1px solid var(--w-line); padding-bottom: 2px; }
.text { margin: 4px 0; }
.row { display: flex; align-items: center; justify-content: space-between; gap: var(--w-s3); min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); }
.value { text-align: right; min-width: 0; }
.acts { display: flex; flex-wrap: wrap; gap: var(--w-s1); margin-top: var(--w-s3); }
</style>
