<template>
  <div :class="$style.strip">
    <div :class="$style.controls">
      <span :class="$style.title">Look</span>
      <label v-for="c in CONTROLS" :key="c.key" :class="$style.ctl" :title="c.title">
        <span>{{ c.label }}</span>
        <input type="range" :min="c.min" :max="c.max" step="5" :value="draft[c.key]" :aria-label="c.label" :class="$style.range"
          @input="draft[c.key] = Number(($event.target as HTMLInputElement).value)"
          @change="commit">
        <span class="w-num" :class="[$style.val, { [$style.moved]: draft[c.key] !== 100 }]">{{ draft[c.key] }}%</span>
      </label>
      <WInfo text="Applies to every rule when the filter is written: NeverSink's, your own, presets and the safety net. Sizes stay between 18 and 45.

Colour makes every label's colours more muted or more vivid by the same amount, so tiers still read apart. Rule editors show each rule's own style, before this strip." />
      <span class="grow" />
      <WButton v-if="moved" size="sm" variant="ghost" icon="fas fa-undo" title="Every slider back to 100%" @click="reset">Reset</WButton>
    </div>
    <div :class="$style.samples" aria-label="Preview">
      <LabelPreview v-for="s in samples" :key="s.name" :text="s.name" :actions="s.actions" :visibility="s.visibility" :default-text="s.defaultText" :scale="1.15" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, watch } from 'vue'
import { WButton, WInfo } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { applyLook, ownMatchActions } from './look'
import type { Look } from './look'
import { matchItem } from './match'
import type { FilterBlock, FilterDoc } from './parse'
import { DEFAULT_BG, DEFAULT_FONT } from './edits'
import type { Colour } from './edits'
import type { ItemFacts } from './item-facts'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
}>()

type Key = 'size' | 'background' | 'colour' | 'volume'
const CONTROLS: Array<{ key: Key, label: string, min: number, max: number, title: string }> = [
  { key: 'size', label: 'Text size', min: 50, max: 150, title: 'Every label\'s text size' },
  { key: 'background', label: 'Background', min: 0, max: 100, title: 'How see-through label backgrounds are' },
  { key: 'colour', label: 'Colour', min: 0, max: 150, title: 'Muted to vivid, the same for every rule' },
  { key: 'volume', label: 'Volume', min: 5, max: 100, title: 'Every drop sound (the Drop sound volume preset)' }
]

// What the sliders show while dragging; the filter is rebuilt on release.
const draft = reactive<Record<Key, number>>({ size: 100, background: 100, colour: 100, volume: 100 })
function sync () {
  const p = props.config.presets
  draft.size = p.look.on ? p.look.size : 100
  draft.background = p.look.on ? p.look.background : 100
  draft.colour = p.look.on ? p.look.colour : 100
  draft.volume = p.volume.on ? p.volume.percent : 100
}
watch(() => [props.config.presets.look, props.config.presets.volume], sync, { deep: true, immediate: true })

const moved = computed(() => CONTROLS.some(c => draft[c.key] !== 100))

let timer: ReturnType<typeof setTimeout> | undefined
function commit () {
  clearTimeout(timer)
  timer = setTimeout(save, 250)
}
// Leaving the tab mid-wait still saves what you set.
onBeforeUnmount(() => { if (timer) save() })
function save () {
  clearTimeout(timer)
  timer = undefined
  const p = props.config.presets
  const look: Look = { on: draft.size !== 100 || draft.background !== 100 || draft.colour !== 100, size: draft.size, background: draft.background, colour: draft.colour }
  if (JSON.stringify(look) !== JSON.stringify(p.look)) p.look = look
  // 100% is the same as the preset off; any other value keeps it on.
  const shown = p.volume.on ? p.volume.percent : 100
  if (draft.volume !== shown) p.volume = draft.volume < 100 ? { on: true, percent: draft.volume } : { on: false, percent: p.volume.percent }
}
function reset () {
  draft.size = draft.background = draft.colour = draft.volume = 100
  clearTimeout(timer)
  save()
}

// ---- preview ----

// A few drops from top to bottom of a NeverSink filter, matched on your
// filter as it is now.
const SAMPLE_ITEMS: Array<Partial<ItemFacts> & { name: string }> = [
  { name: 'Divine Orb', itemClass: 'Stackable Currency', baseType: 'Divine Orb', rarity: 'Normal', stackSize: 1 },
  { name: 'Chaos Orb', itemClass: 'Stackable Currency', baseType: 'Chaos Orb', rarity: 'Normal', stackSize: 1 },
  { name: 'Orb of Alteration', itemClass: 'Stackable Currency', baseType: 'Orb of Alteration', rarity: 'Normal', stackSize: 1 },
  { name: 'Headhunter', itemClass: 'Belts', baseType: 'Leather Belt', rarity: 'Unique', width: 2, height: 1, identified: false },
  { name: 'Sapphire Ring', itemClass: 'Rings', baseType: 'Sapphire Ring', rarity: 'Rare', width: 1, height: 1, identified: false, itemLevel: 84 }
]
const RARITY_TEXT: Record<string, Colour> = {
  Normal: [200, 200, 200, 255],
  Magic: [136, 136, 255, 255],
  Rare: [255, 255, 119, 255],
  Unique: [175, 96, 37, 255]
}
const CURRENCY_TEXT: Colour = [170, 158, 130, 255]
const AREA_LEVEL = 83

function facts (s: Partial<ItemFacts> & { name: string }): ItemFacts {
  return {
    itemLevel: AREA_LEVEL,
    areaLevel: AREA_LEVEL,
    quality: 0,
    socketGroups: [],
    identified: true,
    corrupted: false,
    mirrored: false,
    influences: [],
    explicitModNames: [],
    enchantments: [],
    enchantPassiveNodes: [],
    ...s
  }
}

const matched = computed(() => {
  const doc = props.store.doc.value
  if (!doc) return []
  return SAMPLE_ITEMS.map(s => {
    const m = matchItem(doc, facts(s), { brief: true })
    return {
      name: s.name,
      visibility: m.visibility,
      own: ownMatchActions(m),
      // Bigger labels holds only for NeverSink's rules, as the save does it.
      neverSink: !m.final?.block.type?.startsWith('woke->'),
      defaultText: s.itemClass === 'Stackable Currency' ? CURRENCY_TEXT : RARITY_TEXT[s.rarity ?? 'Normal']
    }
  })
})

const samples = computed(() => {
  const look: Look = { on: true, size: draft.size, background: draft.background, colour: draft.colour }
  const bigger = props.config.presets.bigger
  return matched.value.map(s => {
    const block = { actions: s.own.map(a => ({ key: a.key, args: [...a.args] })), visibility: s.visibility, disabled: false, type: null } as unknown as FilterBlock
    const size = Number(block.actions.find(a => a.key === 'SetFontSize')?.args[0] ?? DEFAULT_FONT)
    // The defaults rule the save adds for labels with no size of their own.
    if (!block.actions.some(a => a.key === 'SetFontSize')) block.actions.unshift({ key: 'SetFontSize', args: [String(size)] })
    if (s.visibility !== 'Hide' && !block.actions.some(a => a.key === 'SetBackgroundColor')) block.actions.push({ key: 'SetBackgroundColor', args: DEFAULT_BG.map(String) })
    applyLook({ chunks: [], blocks: [block] } as unknown as FilterDoc, look, () => bigger.on && s.neverSink && s.visibility !== 'Hide' ? bigger.size : null)
    return { name: s.name, actions: block.actions, visibility: s.visibility, defaultText: s.defaultText }
  })
})
</script>

<style module>
.strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px var(--w-pad) 8px;
  border-bottom: 1px solid var(--w-line);
  background: var(--w-panel-2);
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  font-size: var(--w-fs-sm);
}
.title {
  font-weight: 600;
  color: var(--w-fg);
}
.ctl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--w-dim);
}
.range {
  width: 6.5rem;
}
.val {
  min-width: 2.8rem;
  text-align: right;
  color: var(--w-faint);
}
.moved {
  color: var(--w-fg);
}
.samples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 6px 8px;
  border-radius: var(--w-r-sm);
  /* The ground labels drop on, darker than the panel. */
  background: var(--w-well);
  overflow: hidden;
}
</style>
