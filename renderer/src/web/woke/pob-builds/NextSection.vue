<template>
  <div :class="$style.wrap">
    <button type="button" :class="$style.nextHead" class="w-focusable" :aria-expanded="!folded" @click="toggle">
      <i class="fas text-xs" :class="folded ? 'fa-chevron-right' : 'fa-chevron-down'" />
      <span>Next · <span class="w-accent">{{ stage }}</span></span>
      <span v-if="folded" class="ml-auto w-dim text-xs w-trunc">{{ summary }}</span>
    </button>
    <template v-if="!folded">
      <!-- Tree -->
      <div v-if="tree" :class="$style.row">
        <button type="button" :class="$style.nextLabel" class="w-focusable" :title="`Show ${tree.title} on the tree`" @click="emit('tree', tree.title)">Tree</button>
        <span v-if="diff" class="w-num whitespace-nowrap">
          <span class="w-up">+{{ diff.added }}</span><span v-if="diff.addedAscendancy" class="w-dim"> · {{ diff.addedAscendancy }} asc</span><span v-if="diff.removed" class="w-down"> · −{{ diff.removed }}</span>
        </span>
        <span v-for="n in shownNodes" :key="n.id" :class="$style.named" @mouseenter="nodeTip($event, n)" @mouseleave="hideTip" @click="emit('tree', tree.title)">
          <PassiveIcon :node="n" /><span :class="[$style.name, { 'w-accent': n.kind === 'asc' || n.kind === 'key' }]">{{ n.name }}</span>
        </span>
        <button v-if="hiddenNodes" type="button" :class="$style.more" class="w-focusable" @click="allNodes = true">+{{ hiddenNodes }}</button>
        <span v-if="tree.title !== stage" :class="$style.stage">{{ tree.title }}</span>
      </div>
      <!-- Gems -->
      <div v-if="gems" :class="$style.row">
        <span :class="$style.label">Gems</span>
        <template v-if="gems.change.add.length"><span class="w-up">+</span><GemName v-for="g in gems.change.add" :key="g" :name="g" size="sm" /></template>
        <template v-if="gems.change.drop.length"><span class="w-down">−</span><GemName v-for="g in gems.change.drop" :key="g" :name="g" size="sm" off /></template>
        <span v-if="gems.title !== stage" :class="$style.stage">{{ gems.title }}</span>
      </div>
      <!-- Gear -->
      <div v-if="gear" :class="$style.row">
        <span :class="$style.label">Gear</span>
        <span v-for="c in gear.changes" :key="c.slot" :class="$style.named"
          @mouseenter="c.now && showTip($event, { kind: 'item', item: c.now })" @mouseleave="hideTip">
          <img v-if="c.now && itemArt(c.now)" :src="itemArt(c.now)!" alt="" :class="['w-game-icon', $style.art]" loading="lazy" draggable="false">
          <span :class="[$style.name, c.now ? rarityClass(c.now) : 'w-dim']">{{ c.now ? itemLabel(c.now) : `no ${slotLabel(c.slot).toLowerCase()}` }}</span>
        </span>
        <span v-if="gear.title !== stage" :class="$style.stage">{{ gear.title }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// What the build's next stage changes: one line each for the tree, gems and
// gear, with the game's art. Every name hovers; the heading folds it away.
import { computed, shallowRef, watch } from 'vue'
import { saveConfig } from '@/web/Config'
import GemName from './GemName.vue'
import PassiveIcon from './PassiveIcon.vue'
import { itemArt } from './item-art'
import { slotLabel } from './build-model'
import type { GearChange, GemChange } from './build-model'
import type { TreeDiff, TreeNode } from './passive-tree'
import type { PobBuildsWidget, PobItem, PobTreeSpec } from './widget'
import { hideTip, showTip } from '../ui/tooltip/tooltip'

const props = defineProps<{
  config: PobBuildsWidget
  tree: PobTreeSpec | null
  diff: TreeDiff | null
  gems: { title: string, change: GemChange } | null
  gear: { title: string, changes: GearChange[] } | null
}>()
const emit = defineEmits<{ (e: 'tree', title: string): void }>()

const folded = computed(() => props.config.nextFolded === true)
function toggle () {
  hideTip()
  props.config.nextFolded = !folded.value
  saveConfig()
}

const stage = computed(() => props.tree?.title ?? props.gems?.title ?? props.gear?.title ?? '')

const summary = computed(() => [
  props.diff && props.tree ? `+${props.diff.added} tree` : '',
  props.gems ? `${props.gems.change.add.length ? `+${props.gems.change.add.length}` : ''}${props.gems.change.drop.length ? ` −${props.gems.change.drop.length}` : ''} gems`.trim() : '',
  props.gear ? `${props.gear.changes.length} ${props.gear.changes.length === 1 ? 'item' : 'items'}` : ''
].filter(Boolean).join(' · '))

// A few passives on the line; the rest when asked.
const FIRST_NODES = 3
const allNodes = shallowRef(false)
watch(() => props.tree, () => { allNodes.value = false })
const nodes = computed(() => {
  // Keystones and ascendancy first: they change how the build plays.
  const rank = (n: TreeNode) => n.kind === 'key' ? 0 : n.kind === 'asc' ? 1 : 2
  return [...(props.diff?.addedNames ?? [])].sort((a, b) => rank(a) - rank(b))
})
const shownNodes = computed(() => allNodes.value ? nodes.value : nodes.value.slice(0, FIRST_NODES))
const hiddenNodes = computed(() => nodes.value.length - shownNodes.value.length)

function nodeTip (e: Event, n: TreeNode) {
  showTip(e, {
    kind: 'passive',
    name: n.name,
    stats: n.stats,
    frame: n.kind === 'key' ? 'unique' : n.kind === 'notable' || n.kind === 'jewel' ? 'rare' : 'normal',
    note: `New at ${props.tree?.title ?? 'the next stage'}`
  })
}

function itemLabel (item: PobItem): string {
  return item.rarity === 'UNIQUE' || item.rarity === 'RELIC' ? item.name : item.base || item.name
}
function rarityClass (item: PobItem): string {
  return item.rarity ? `w-rarity-${item.rarity.toLowerCase()}` : ''
}
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
.nextHead {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 2px 0;
  text-align: left;
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
.nextHead:hover { color: var(--w-fg); }
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 8px;
  min-width: 0;
}
.label, .nextLabel { width: 2.6rem; flex: none; text-align: left; color: var(--w-dim); font-size: var(--w-fs-sm); }
button.nextLabel:hover { color: var(--w-fg); text-decoration: underline; }
.named { display: inline-flex; align-items: center; gap: 5px; min-width: 0; max-width: 100%; cursor: default; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.art { max-width: 22px; max-height: 22px; object-fit: contain; flex: none; }
.more { color: var(--w-dim); font-size: var(--w-fs-sm); }
.more:hover { color: var(--w-fg); }
.stage { margin-left: auto; color: var(--w-faint); font-size: var(--w-fs-sm); white-space: nowrap; }
</style>
