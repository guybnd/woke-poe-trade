<template>
  <div>
    <div class="flex items-center gap-2 pt-1">
      <span v-if="snapshot" class="w-trunc">
        {{ snapshot.character.name }} · {{ snapshot.character.class }}<template v-if="snapshot.character.level != null"> {{ snapshot.character.level }}</template>
        <span class="w-faint text-xs"> · read {{ ago }}</span>
      </span>
      <span v-else-if="status.pending" class="w-dim">Reading your character…</span>
      <span v-else class="w-dim">Your character hasn't been read yet.</span>
      <WButton size="sm" class="ml-auto" icon="fas fa-sync-alt" :disabled="status.pending" title="Read your character from pathofexile.com" @click="readNow">Read now</WButton>
    </div>
    <div v-if="status.error" class="w-down text-xs pt-1">{{ status.error }}</div>
    <div class="w-faint text-xs pt-1">Kept apart from the build: reading your character never changes it.</div>

    <template v-if="diff">
      <!-- Tree -->
      <div :class="$style.heading">Passive tree<template v-if="diff.treeTitle"> · {{ diff.treeTitle }}</template></div>
      <template v-if="diff.tree">
        <div class="flex items-center gap-2 flex-wrap">
          <span :class="$style.take">{{ diff.tree.added }} to take</span>
          <span class="w-down">{{ diff.tree.removed }} to refund</span>
          <WButton v-if="diff.treeTitle" size="sm" class="ml-auto" icon="fas fa-project-diagram" @click="emit('tree', diff.treeTitle)">Show on tree</WButton>
        </div>
        <div v-if="diff.tree.addedNames.length" class="text-xs pt-1"><span class="w-faint">Take: </span><span :class="$style.take">{{ names(diff.tree.addedNames) }}</span></div>
        <div v-if="diff.tree.removedNames.length" class="text-xs pt-1"><span class="w-faint">Refund: </span><span class="w-down">{{ names(diff.tree.removedNames) }}</span></div>
      </template>
      <div v-else class="w-dim text-xs">The build has no passive tree to compare.</div>

      <!-- Gear -->
      <div :class="$style.heading">Gear</div>
      <div v-if="!diff.gear.length" class="w-dim text-xs">No gear in the build's item set.</div>
      <div v-for="r in diff.gear" :key="r.slot" :class="$style.gear">
        <span class="w-faint">{{ slotLabel(r.slot) }}</span>
        <span class="w-trunc" :class="rarityClass(r.build)" :title="r.build ? itemTitle(r.build) : ''">{{ r.build ? r.build.name : '—' }}</span>
        <span class="w-trunc" :class="rarityClass(r.worn)" :title="r.worn ? itemTitle(r.worn) : ''">{{ r.worn ? r.worn.name : 'empty' }}</span>
        <span :class="[$style.state, stateTone(r.state)]">{{ STATE[r.state] }}</span>
      </div>

      <!-- Gems -->
      <div :class="$style.heading">Gems</div>
      <div v-if="!diff.gems.length" class="w-dim text-xs">No gem links in the build's skill set.</div>
      <div v-for="(g, i) in diff.gems" :key="i" :class="$style.gems">
        <span class="w-faint text-xs">{{ slotLabel(g.slot) }}</span>
        <span v-for="x in g.gems" :key="x.name" :class="[$style.gem, x.have ? 'w-rarity-gem' : $style.missing]" :title="x.have ? 'Socketed' : 'Missing on your character'">{{ x.name.replace(/ Support$/, '') }}</span>
        <span v-for="x in g.extra" :key="'x' + x" :class="[$style.gem, $style.extra]" title="Socketed with these, not in the build">{{ x.replace(/ Support$/, '') }}</span>
      </div>
    </template>
    <div v-else-if="snapshot && !details" class="w-dim pt-2">Loading the build…</div>
  </div>
</template>

<script setup lang="ts">
// The Character tab: this build against your character, slot by slot.
import { computed, onBeforeUnmount, shallowRef, toRef } from 'vue'
import { WButton } from '../ui'
import { useActiveBuild } from './active'
import { slotLabel } from './build-model'
import { characterStatus, readAgo, readCharacterNow, useCharacterDiff } from './character'
import type { GearState } from './character'
import type { TreeNode } from './passive-tree'
import type { LoadoutPick, PobDetails, PobItem } from './widget'

const props = defineProps<{ details: PobDetails | null, pick: LoadoutPick | undefined }>()
const emit = defineEmits<{ (e: 'tree', title: string): void }>()

const build = useActiveBuild()
const status = characterStatus
const snapshot = computed(() => status.value.snapshot)
const diff = useCharacterDiff(toRef(props, 'details'), build.level, build.act, toRef(props, 'pick'))

const now = shallowRef(Date.now())
const tick = setInterval(() => { now.value = Date.now() }, 30_000)
onBeforeUnmount(() => clearInterval(tick))
const ago = computed(() => snapshot.value ? readAgo(snapshot.value.readAt, now.value) : '')

const STATE: Record<GearState, string> = { match: 'match', base: 'same base', differs: 'differs', missing: 'missing', extra: 'not in build' }
function stateTone (s: GearState) {
  return s === 'match' || s === 'base' ? 'w-up' : s === 'extra' ? 'w-faint' : 'w-down'
}
function rarityClass (item: PobItem | null) {
  if (!item) return 'w-faint'
  return `w-rarity-${item.rarity === 'RELIC' ? 'unique' : item.rarity.toLowerCase()}`
}
function itemTitle (item: PobItem) {
  return [item.name, item.base].filter(Boolean).join('\n')
}
function names (nodes: TreeNode[]) {
  const shown = nodes.slice(0, 8).map(n => n.name)
  return shown.join(', ') + (nodes.length > shown.length ? ` and ${nodes.length - shown.length} more` : '')
}
function readNow () {
  readCharacterNow(build.charName.value)
}
</script>

<style module>
.heading {
  padding: 8px 0 2px;
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
.take {
  color: var(--w-accent);
}
.gear {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 6px;
  align-items: baseline;
  padding: 1px 0;
}
.state {
  font-size: var(--w-fs-xs);
  white-space: nowrap;
}
.gems {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
  padding: 2px 0;
}
.gem {
  padding: 0 4px;
  border: 1px solid var(--w-border, #333);
  border-radius: 2px;
}
.missing {
  border-style: dashed;
  border-color: var(--w-accent);
  color: var(--w-accent);
}
.extra {
  color: var(--w-down);
  text-decoration: line-through;
}
</style>
