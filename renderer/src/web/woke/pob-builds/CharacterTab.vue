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
          <button v-if="diff.tree.addedNames.length || diff.tree.removedNames.length" type="button" class="w-focusable flex items-center gap-2"
            :aria-expanded="namesOpen" :title="namesOpen ? 'Hide the notables' : 'Show which notables'" @click="namesOpen = !namesOpen">
            <i class="fas text-xs w-faint" :class="namesOpen ? 'fa-chevron-down' : 'fa-chevron-right'" />
            <span :class="$style.take">{{ diff.tree.added }} to take</span>
            <span class="w-down">{{ diff.tree.removed }} to refund</span>
          </button>
          <template v-else>
            <span :class="$style.take">{{ diff.tree.added }} to take</span>
            <span class="w-down">{{ diff.tree.removed }} to refund</span>
          </template>
          <WButton v-if="diff.treeTitle" size="sm" class="ml-auto" icon="fas fa-project-diagram" @click="emit('tree', diff.treeTitle)">Show on tree</WButton>
        </div>
        <div v-if="namesOpen && diff.tree.addedNames.length" class="text-xs pt-1"><span class="w-faint">Take: </span><span :class="$style.take">{{ names(diff.tree.addedNames) }}</span></div>
        <div v-if="namesOpen && diff.tree.removedNames.length" class="text-xs pt-1"><span class="w-faint">Refund: </span><span class="w-down">{{ names(diff.tree.removedNames) }}</span></div>
      </template>
      <div v-else class="w-dim text-xs">The build has no passive tree to compare.</div>

      <!-- Next to buy -->
      <template v-if="upgrades.rows.length">
        <div :class="$style.heading" class="flex">
          <span>Next to buy</span>
          <span v-if="upgrades.chaos" class="ml-auto normal-case tracking-normal">{{ upgrades.atLeast ? 'from ' : '' }}<WPrice :chaos="upgrades.chaos" :divine="divine" /> to finish</span>
        </div>
        <button v-for="(u, i) in upgrades.rows" :key="u.slot" type="button" :class="$style.buy" class="w-focusable"
          :title="`Price check ${u.item.name}${u.unique ? '' : ' with its stats'}`" @click="openPriceCheck(u.item, $event)"
          @mouseenter="showTip($event, { kind: 'item', item: u.item })" @mouseleave="hideTip">
          <span class="w-faint w-num">{{ i + 1 }}.</span>
          <span class="w-trunc" :class="rarityClass(u.item)">{{ upgradeName(u.item) }}</span>
          <span class="w-faint text-xs">{{ slotLabel(u.slot) }}</span>
          <span class="ml-auto whitespace-nowrap">
            <template v-if="u.price"><WPrice :chaos="u.price.chaos" :divine="divine" /><template v-if="u.price.high != null"><span class="w-dim text-xs"> to </span><WPrice :chaos="u.price.high" :divine="divine" /></template></template>
            <span v-else class="w-dim text-xs">{{ u.unique ? (divine == null ? 'pricing…' : 'no price') : 'price check' }}</span>
          </span>
        </button>
      </template>

      <!-- Gear -->
      <div :class="$style.heading">Gear</div>
      <div v-if="!diff.gear.length" class="w-dim text-xs">No gear in the build's item set.</div>
      <div v-for="r in diff.gear" :key="r.slot" :class="$style.gear">
        <span class="w-faint">{{ slotLabel(r.slot) }}</span>
        <span class="w-trunc" :class="rarityClass(r.build)" @mouseenter="r.build && showTip($event, { kind: 'item', item: r.build })" @mouseleave="hideTip">{{ r.build ? r.build.name : '—' }}</span>
        <span class="w-trunc" :class="rarityClass(r.worn)" @mouseenter="r.worn && showTip($event, { kind: 'item', item: r.worn })" @mouseleave="hideTip">{{ r.worn ? r.worn.name : 'empty' }}</span>
        <span :class="[$style.state, stateTone(r.state)]">{{ STATE[r.state] }}</span>
      </div>

      <!-- Jewels -->
      <template v-if="diff.jewels.length">
        <div :class="$style.heading">Jewels</div>
        <div v-for="r in diff.jewels" :key="r.node" :class="$style.gear">
          <span class="w-faint w-trunc" :title="r.socket || 'A socket on a cluster jewel'">{{ shortSocket(r.socket) }}</span>
          <span class="w-trunc" :class="rarityClass(r.build)" @mouseenter="r.build && showTip($event, { kind: 'item', item: r.build })" @mouseleave="hideTip">{{ r.build ? r.build.name : '—' }}</span>
          <span class="w-trunc" :class="rarityClass(r.worn)" @mouseenter="r.worn && showTip($event, { kind: 'item', item: r.worn })" @mouseleave="hideTip">{{ r.worn ? r.worn.name : 'empty' }}</span>
          <span :class="[$style.state, stateTone(r.state)]">{{ STATE[r.state] }}</span>
        </div>
      </template>

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
import { computed, onBeforeUnmount, onMounted, shallowRef, toRef } from 'vue'
import { WButton, WPrice } from '../ui'
import { openPriceCheck } from './open-price-check'
import { useUniquePrice } from './unique-price'
import { hideTip, showTip } from '../ui/tooltip/tooltip'
import { useActiveBuild } from './active'
import { slotLabel } from './build-model'
import { characterStatus, readAgo, readCharacterNow, upgradeList, useCharacterDiff } from './character'
import type { GearState } from './character'
import type { TreeNode } from './passive-tree'
import type { LoadoutPick, PobDetails, PobItem } from './widget'

const props = defineProps<{ details: PobDetails | null, pick: LoadoutPick | undefined }>()
const emit = defineEmits<{ (e: 'tree', title: string): void }>()

const build = useActiveBuild()
const status = characterStatus
const snapshot = computed(() => status.value.snapshot)
const diff = useCharacterDiff(toRef(props, 'details'), build.level, build.act, toRef(props, 'pick'))

// Next to buy: what differs, cheapest unique first.
const prices = useUniquePrice()
const divine = prices.divine
onMounted(prices.fetch)
// Rows show at once; prices and the total once poe.ninja's rates are in.
const upgrades = computed(() => diff.value
  ? upgradeList(diff.value.gear, item => divine.value != null ? prices.priceOf(item) : null)
  : { rows: [], chaos: 0, atLeast: false })
function upgradeName (item: PobItem) {
  if (item.rarity === 'UNIQUE' || item.rarity === 'RELIC') return item.name
  const base = item.base || item.name
  return item.rarity === 'RARE' ? `Rare ${base}` : item.rarity === 'MAGIC' ? `Magic ${base}` : base
}

// The notables to take and refund fold under their counts.
const namesOpen = shallowRef(false)

const now = shallowRef(Date.now())
const tick = setInterval(() => { now.value = Date.now() }, 30_000)
onBeforeUnmount(() => { clearInterval(tick); hideTip() })
const ago = computed(() => snapshot.value ? readAgo(snapshot.value.readAt, now.value) : '')

const STATE: Record<GearState, string> = { match: 'match', base: 'same base', differs: 'differs', missing: 'missing', extra: 'not in build' }
function stateTone (s: GearState) {
  return s === 'match' || s === 'base' ? 'w-up' : s === 'extra' ? 'w-faint' : 'w-down'
}
function rarityClass (item: PobItem | null) {
  if (!item) return 'w-faint'
  return `w-rarity-${item.rarity === 'RELIC' ? 'unique' : item.rarity.toLowerCase()}`
}
// "Large Jewel Socket" -> "Large"; a socket on a cluster jewel has no name.
function shortSocket (name: string) {
  return name ? name.replace(/\s*Jewel Socket$/i, '') || 'Socket' : 'Cluster'
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
.buy {
  display: flex;
  align-items: baseline;
  gap: 6px;
  width: 100%;
  padding: 1px 0;
  text-align: left;
  min-width: 0;
}
.buy:hover {
  background: var(--w-hover, rgba(255, 255, 255, 0.04));
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
