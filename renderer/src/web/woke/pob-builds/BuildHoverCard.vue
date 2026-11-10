<template>
  <div v-if="details" :class="$style.card">
    <div class="w-dim text-xs">
      {{ details.ascendClassName || details.className }}<template v-if="level != null"> · Level {{ level }}</template>
      <template v-if="set"> · <span class="w-accent">{{ set.title }}</span></template>
    </div>

    <template v-if="links.length">
      <div :class="$style.k">Your links</div>
      <div v-for="(g, i) in links" :key="i" :class="$style.link">
        <SocketDots :colours="linkColours(g)" />
        <span class="w-rarity-gem w-trunc">{{ orderedGems(g).map(x => x.name.replace(/ Support$/, '')).join(' · ') }}</span>
      </div>
    </template>

    <template v-if="nextTree">
      <div :class="$style.k">Next</div>
      <div class="flex">
        <span class="w-trunc">{{ nextTree.title }}</span>
        <span v-if="treeData" class="ml-auto pl-2 w-dim text-xs whitespace-nowrap"><span class="w-up">+{{ nextDiff.added }}</span> {{ nextDiff.added === 1 ? 'point' : 'points' }}</span>
      </div>
    </template>

    <template v-if="details.pantheonMajor || details.pantheonMinor">
      <div :class="$style.k">Pantheon</div>
      <div>{{ pantheon }}</div>
    </template>

    <template v-if="saved">
      <div :class="$style.k">Saved in PoB<template v-if="details.statsSet"> · {{ details.statsSet }}</template></div>
      <div class="w-dim text-xs">{{ saved }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
// The build in use, for the dock icon's hover card.
import { computed, shallowRef, watch } from 'vue'
import SocketDots from './SocketDots.vue'
import { useActiveBuild } from './active'
import { linkColours, linkGroups, loadoutOf, nextSet, orderedGems, realSets, shortNumber, statLine } from './build-model'
import { loadPassiveTree, treeDiff } from './passive-tree'
import type { TreeNode } from './passive-tree'

const build = useActiveBuild()
const details = build.details
const level = build.level

const loadout = computed(() => details.value ? loadoutOf(details.value, build.level.value, build.act.value, build.loadout.value) : null)
const set = computed(() => loadout.value?.skillSet?.item ?? null)
const links = computed(() => set.value ? linkGroups(set.value.groups, 3) : [])

const treeData = shallowRef<Map<number, TreeNode> | null>(null)
const nextTree = computed(() => nextSet(realSets(details.value?.trees ?? []), loadout.value?.tree))
watch(nextTree, (t) => {
  if (t) loadPassiveTree().then(data => { treeData.value = data }, () => {})
}, { immediate: true })
const nextDiff = computed(() => treeDiff(treeData.value, loadout.value?.tree?.nodes ?? [], nextTree.value?.nodes ?? []))

// PoB's ids run the words together: "TheBrineKing".
function godName (id: string) {
  return id.replace(/([a-z])([A-Z])/g, '$1 $2')
}

const pantheon = computed(() => [details.value?.pantheonMajor, details.value?.pantheonMinor]
  .filter((id): id is string => Boolean(id)).map(godName).join(' + '))

const saved = computed(() => {
  const st = details.value?.stats
  if (!st) return ''
  return [
    statLine(st),
    st.Life && st.Life > 1 ? `${shortNumber(st.Life)} life` : '',
    st.EnergyShield ? `${shortNumber(st.EnergyShield)} ES` : ''
  ].filter(Boolean).join(' · ')
})
</script>

<style module>
.card {
  padding: 6px var(--w-pad) 8px;
}
.k {
  padding-top: 7px;
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
.link {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
</style>
