<template>
  <WPanel title="Compare builds" size-key="compare" width="32rem" max-height="70vh">
    <template #actions>
      <button class="w-icon-btn" title="Close" @click="emit('close')"><i class="fas fa-times" /></button>
    </template>
    <WEmpty v-if="error" icon="fas fa-exclamation-triangle">{{ error }}</WEmpty>
    <WEmpty v-else-if="!result" icon="fas fa-spinner fa-spin">Loading…</WEmpty>
    <div v-else :class="$style.body">
      <div :class="[$style.row, $style.head]">
        <span />
        <span class="w-trunc" :title="a.name">{{ a.name }}</span>
        <span class="w-trunc" :title="b.name">{{ b.name }}</span>
        <span />
      </div>
      <div v-for="s in result.stats" :key="s.label" :class="$style.row">
        <span class="w-dim">{{ s.label }}</span>
        <span class="w-num">{{ s.a }}</span>
        <span class="w-num">{{ s.b }}</span>
        <span class="w-num" :style="{ color: TONE[s.tone] }">{{ s.delta }}</span>
      </div>
      <div v-if="result.stats.length" class="pt-1"><WInfo text="Stats as PoB saved them, for each build's active sets." /></div>

      <div :class="$style.heading">Gear · {{ result.gear.length }} of {{ result.gearTotal }} differ</div>
      <div v-for="(g, i) in result.gear" :key="i" :class="$style.gear">
        <span class="w-dim">{{ g.slot }}</span>
        <span class="w-trunc" :class="rarity(g.a)">{{ itemName(g.a) }}</span>
        <span class="w-trunc" :class="rarity(g.b)">{{ itemName(g.a) === itemName(g.b) ? 'Same base, other mods' : itemName(g.b) }}</span>
      </div>

      <template v-if="result.gemsOnlyA.length || result.gemsOnlyB.length">
        <div :class="$style.heading">Gems</div>
        <div v-if="result.gemsOnlyA.length"><span class="w-dim">Only {{ a.name }}: </span><span class="w-rarity-gem">{{ result.gemsOnlyA.join(', ') }}</span></div>
        <div v-if="result.gemsOnlyB.length"><span class="w-dim">Only {{ b.name }}: </span><span class="w-rarity-gem">{{ result.gemsOnlyB.join(', ') }}</span></div>
      </template>

      <div :class="$style.heading">Tree</div>
      <div v-if="result.treeOnlyA || result.treeOnlyB">{{ result.treeOnlyA }} nodes only in {{ a.name }}, {{ result.treeOnlyB }} only in {{ b.name }}</div>
      <div v-else class="w-dim">The same tree.</div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { WEmpty, WInfo, WPanel } from '../ui'
import { compareBuilds } from './compare-builds'
import type { BuildCompare } from './compare-builds'
import { pobApi } from './widget'
import type { PobBuildEntry, PobBuildsWidget, PobItem } from './widget'

const props = defineProps<{ config: PobBuildsWidget, a: PobBuildEntry, b: PobBuildEntry }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const TONE = { up: 'var(--w-up)', down: 'var(--w-down)', dim: 'var(--w-dim)' }

const result = shallowRef<BuildCompare | null>(null)
const error = shallowRef('')

// Follows a save in PoB too, since the entries come from the refreshed list.
let latest = 0
watch(() => [props.a.relPath, props.a.mtime, props.b.relPath, props.b.mtime].join('\n'), async () => {
  const read = ++latest
  error.value = ''
  try {
    const [x, y] = await Promise.all([pobApi.read(props.config, props.a.relPath), pobApi.read(props.config, props.b.relPath)])
    if (read === latest) result.value = compareBuilds(x, y)
  } catch (err) {
    if (read === latest) error.value = (err as Error).message
  }
}, { immediate: true })

function itemName (item: PobItem | null) {
  if (!item) return 'nothing'
  return item.rarity === 'RARE' ? `${item.name === 'New Item' ? 'Rare' : item.name} ${item.base}` : item.name
}

function rarity (item: PobItem | null) {
  switch (item?.rarity) {
    case undefined: return 'w-dim'
    case 'UNIQUE':
    case 'RELIC': return 'w-rarity-unique'
    case 'RARE': return 'w-rarity-rare'
    case 'MAGIC': return 'w-rarity-magic'
    default: return 'w-rarity-normal'
  }
}
</script>

<style module>
.body {
  padding: 6px var(--w-pad) 10px;
}
.row {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr) minmax(0, 1fr) 4.5rem;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
.head {
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
}
.gear {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
.heading {
  padding: 10px 0 2px;
  font-size: var(--w-fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
</style>
