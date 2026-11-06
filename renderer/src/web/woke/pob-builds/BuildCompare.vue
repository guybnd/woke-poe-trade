<template>
  <WPanel title="Compare builds" size-key="compare" width="36rem" max-height="70vh">
    <template #actions>
      <button class="w-icon-btn" title="Close" @click="emit('close')"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <div :class="$style.pick">
        <WSelect :model-value="a?.relPath ?? ''" :options="options" aria-label="First build" @update:model-value="emit('pick', $event, b?.relPath ?? '')" />
        <button v-if="a && b" class="w-icon-btn" title="Swap them" @click="emit('pick', b.relPath, a.relPath)"><i class="fas fa-exchange-alt" /></button>
        <span v-else class="w-dim text-xs">and</span>
        <WSelect :model-value="b?.relPath ?? ''" :options="options" aria-label="Second build" @update:model-value="emit('pick', a?.relPath ?? '', $event)" />
      </div>
    </template>

    <WEmpty v-if="!a || !b" icon="fas fa-balance-scale">Pick two builds to compare.</WEmpty>
    <WEmpty v-else-if="a === b" icon="fas fa-balance-scale">That's the same build twice. Pick another.</WEmpty>
    <WEmpty v-else-if="error" icon="fas fa-exclamation-triangle">{{ error }}</WEmpty>
    <WEmpty v-else-if="!result" icon="fas fa-spinner fa-spin">Loading…</WEmpty>
    <div v-else :class="$style.body">
      <template v-if="result.stats.length">
        <div :class="$style.heading">Numbers saved in PoB</div>
        <div :class="[$style.row, $style.head]">
          <span />
          <span class="w-trunc" :title="a.name">{{ a.name }}</span>
          <span class="w-trunc" :title="b.name">{{ b.name }}</span>
          <span>Difference</span>
        </div>
        <div v-for="s in result.stats" :key="s.label" :class="$style.row">
          <span class="w-dim">{{ s.label }}</span>
          <span class="w-num">{{ s.a }}</span>
          <span class="w-num">{{ s.b }}</span>
          <span class="w-num" :style="{ color: TONE[s.tone] }">{{ s.delta }}</span>
        </div>
      </template>

      <template v-if="result.gear.length">
        <div :class="$style.heading">Gear that's different</div>
        <div :class="[$style.gear, $style.head]">
          <span />
          <span class="w-trunc">{{ a.name }}</span>
          <span class="w-trunc">{{ b.name }}</span>
        </div>
        <div v-for="(g, i) in result.gear" :key="i" :class="$style.gear">
          <span class="w-dim">{{ g.slot }}</span>
          <span class="w-trunc" :class="rarity(g.a)" :title="itemName(g.a)">{{ itemName(g.a) }}</span>
          <span class="w-trunc" :class="rarity(g.b)" :title="itemName(g.b)">{{ itemName(g.a) === itemName(g.b) ? 'Same base, other mods' : itemName(g.b) }}</span>
        </div>
        <div v-if="result.gear.length < result.gearTotal" class="w-dim pt-1">All the other gear is the same.</div>
      </template>
      <div v-else :class="$style.line" class="w-dim">All the gear is the same.</div>

      <template v-if="result.gemsOnlyA.length || result.gemsOnlyB.length">
        <div :class="$style.heading">Skill gems in only one build</div>
        <div v-if="result.gemsOnlyA.length"><span class="w-dim">Only in {{ a.name }}: </span><span class="w-rarity-gem">{{ result.gemsOnlyA.join(', ') }}</span></div>
        <div v-if="result.gemsOnlyB.length"><span class="w-dim">Only in {{ b.name }}: </span><span class="w-rarity-gem">{{ result.gemsOnlyB.join(', ') }}</span></div>
      </template>

      <div :class="$style.heading">Passive tree</div>
      <div>{{ treeSentence(result, a.name, b.name) }}</div>
      <div v-if="result.stats.length" class="pt-2"><WInfo text="Numbers are as PoB saved them, for the set each build was saved on." /></div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { WEmpty, WInfo, WPanel, WSelect } from '../ui'
import { compareBuilds, treeSentence } from './compare-builds'
import { loadPassiveTree } from './passive-tree'
import type { BuildCompare } from './compare-builds'
import { pobApi } from './widget'
import type { PobBuildEntry, PobBuildsWidget, PobItem } from './widget'

// Either side may be unpicked yet.
const props = defineProps<{ config: PobBuildsWidget, builds: PobBuildEntry[], a?: PobBuildEntry, b?: PobBuildEntry }>()
const emit = defineEmits<{ (e: 'close'): void, (e: 'pick', a: string, b: string): void }>()

const options = computed(() => [
  { value: '', label: 'Pick a build…' },
  ...props.builds.map(x => ({ value: x.relPath, label: x.folder ? `${x.name} (${x.folder})` : x.name }))
])

const TONE = { up: 'var(--w-up)', down: 'var(--w-down)', dim: 'var(--w-dim)' }

const result = shallowRef<BuildCompare | null>(null)
const error = shallowRef('')

// Follows a save in PoB too, since the entries come from the refreshed list.
let latest = 0
async function compare () {
  const read = ++latest
  error.value = ''
  result.value = null
  const { a, b } = props
  if (!a || !b || a === b) return
  try {
    const [x, y, tree] = await Promise.all([
      pobApi.read(props.config, a.relPath),
      pobApi.read(props.config, b.relPath),
      loadPassiveTree().catch(() => null)
    ])
    // Starts and ascendancy aren't passive points.
    const isPoint = (id: number) => !['asc', 'ascstart', 'start'].includes(tree?.get(id)?.kind ?? '')
    if (read === latest) result.value = compareBuilds(x, y, isPoint)
  } catch (err) {
    if (read === latest) error.value = (err as Error).message
  }
}

watch(() => [props.a?.relPath, props.a?.mtime, props.b?.relPath, props.b?.mtime].join('\n'), compare, { immediate: true })
// A reload may fix a read that failed, with the file's date unchanged.
watch(() => props.builds, () => { if (error.value) compare() })

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
  grid-template-columns: 11.5rem minmax(0, 1fr) minmax(0, 1fr) 4.5rem;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
.pick {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
  width: 100%;
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
