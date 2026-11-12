<template>
  <div :class="$style.body">
    <WEmpty v-if="problem" icon="fas fa-exclamation-triangle">{{ problem }}</WEmpty>
    <WEmpty v-else-if="!details" icon="fas fa-spinner fa-spin">Loading…</WEmpty>

    <BuildTree v-else-if="piece === 'tree'" bare :specs="details.trees" :start="treeStart" :from="loadout?.tree?.title" />

    <template v-else-if="piece === 'slot'">
      <template v-if="row">
        <GearRowHead :row="row" />
        <div v-if="row.groups.length" :class="$style.chains">
          <GemChain v-for="(g, i) in row.groups" :key="i" :group="g" />
        </div>
      </template>
      <WEmpty v-else icon="fas fa-tshirt">Nothing in this slot in {{ itemSet?.title ?? 'this gear set' }}.</WEmpty>
    </template>

    <template v-else-if="piece === 'gems'">
      <GemChain v-if="group" :group="group" />
      <WEmpty v-else icon="fas fa-gem">This gem chain isn't in {{ skillSet?.title ?? 'this skill set' }}.</WEmpty>
    </template>

    <template v-else-if="piece === 'next'">
      <NextSection v-if="pobWidget && (nextTree || nextGems || gearStep)" :config="pobWidget" always-open
        :tree="nextTree" :diff="treeData ? nextTreeDiff : null" :gems="nextGems" :gear="gearStep" />
      <WEmpty v-else icon="fas fa-check">Nothing left to change: this is the build's last stage.</WEmpty>
    </template>
  </div>
</template>

<script setup lang="ts">
// A pinned piece of a PoB build. It follows the build file and your level, so
// the gear set and next stage move on as you do, like the panel does.
import { computed, onUnmounted, provide, shallowRef, watch, defineAsyncComponent } from 'vue'
import { Host } from '@/web/background/IPC'
import { AppConfig } from '@/web/Config'
import { WEmpty } from '../ui'
import GearRowHead from '../pob-builds/GearRowHead.vue'
import GemChain from '../pob-builds/GemChain.vue'
import NextSection from '../pob-builds/NextSection.vue'
import { useActiveBuild } from '../pob-builds/active'
import { gearChange, gearLayout, gemChange, itemSetsOf, loadoutOf, nextSet, realSets, skillSetsOf } from '../pob-builds/build-model'
import type { GearRow } from '../pob-builds/build-model'
import { findGroup } from '../pob-builds/build-pins'
import { GEM_CLASS } from '../pob-builds/gems'
import { loadPassiveTree, treeDiff } from '../pob-builds/passive-tree'
import type { TreeNode } from '../pob-builds/passive-tree'
import { POB_BUILDS_TYPE, pobApi } from '../pob-builds/widget'
import type { PobBuildsWidget, PobDetails } from '../pob-builds/widget'
import type { Pin } from './pins'

// The tree loads on first open: it's big and most sessions never open it.
const BuildTree = defineAsyncComponent(() => import('../pob-builds/BuildTree.vue'))

const props = defineProps<{ pin: Pin }>()

const piece = computed(() => props.pin.kind.slice('pob-'.length))
const relPath = computed(() => props.pin.data.relPath ?? '')

const build = useActiveBuild()
const pobWidget = computed(() => AppConfig().widgets.find(w => w.wmType === POB_BUILDS_TYPE) as PobBuildsWidget | undefined)

// The active build is already read (and read again when PoB saves); any other
// build is read here, again whenever the overlay opens.
const ownDetails = shallowRef<PobDetails | null>(null)
const ownError = shallowRef('')
const isActive = computed(() => build.relPath.value === relPath.value)
let latest = 0
async function readOwn () {
  const cfg = pobWidget.value
  if (isActive.value || !cfg || !relPath.value) return
  const read = ++latest
  try {
    const d = await pobApi.read(cfg, relPath.value)
    if (read !== latest) return
    ownError.value = ''
    if (JSON.stringify(d) !== JSON.stringify(ownDetails.value)) ownDetails.value = d
  } catch (err) {
    if (read !== latest) return
    ownDetails.value = null
    ownError.value = (err as Error).message
  }
}
watch([relPath, isActive, () => pobWidget.value?.wmId], readOwn, { immediate: true })
// PoB may have saved it since: read again when the overlay opens.
const focus = Host.onEvent('MAIN->OVERLAY::focus-change', (state) => { if (state.overlay) readOwn() })
onUnmounted(() => { focus.abort() })

const details = computed(() => isActive.value ? build.details.value : ownDetails.value)
const problem = computed(() => {
  if (!pobWidget.value) return 'Turn on PoB builds to see this.'
  if (isActive.value) return !build.details.value && build.error.value ? build.error.value : ''
  return ownError.value
})

provide(GEM_CLASS, computed(() => build.className.value || details.value?.ascendClassName || details.value?.className || ''))

const loadout = computed(() => details.value
  ? loadoutOf(details.value, build.level.value, build.act.value, pobWidget.value?.loadouts?.[relPath.value])
  : null)
const skillSet = computed(() => loadout.value?.skillSet?.item ?? null)
const itemSet = computed(() => loadout.value?.itemSet?.item ?? null)

// ---- gear slot ----
const row = computed<GearRow | null>(() => {
  const slot = props.pin.data.slot
  const layout = gearLayout(itemSet.value?.slots ?? [], skillSet.value?.groups ?? [])
  return [layout.main, ...layout.linked, ...layout.plain].find(r => r?.slot === slot && r.item) ?? null
})

// ---- gem chain ----
const group = computed(() => skillSet.value ? findGroup(skillSet.value.groups, props.pin.data.group ?? '') : null)

// ---- tree: the next stage, lit against the tree you're on ----
const trees = computed(() => realSets(details.value?.trees ?? []))
const nextTree = computed(() => nextSet(trees.value, loadout.value?.tree))
// A new start object resets the tree's pan and zoom: only when the stage changes.
const startTitle = computed(() => (nextTree.value ?? loadout.value?.tree ?? trees.value[0])?.title ?? '')
const treeStart = shallowRef({ title: startTitle.value })
watch(startTitle, (title) => { treeStart.value = { title } })

// ---- next stage ----
const treeData = shallowRef<Map<number, TreeNode> | null>(null)
watch(nextTree, (t) => {
  if (t && piece.value === 'next') loadPassiveTree().then(data => { treeData.value = data }, () => {})
}, { immediate: true })
const nextTreeDiff = computed(() => treeDiff(treeData.value, loadout.value?.tree?.nodes ?? [], nextTree.value?.nodes ?? []))
const nextGems = computed(() => {
  const from = skillSet.value
  const to = details.value ? nextSet(skillSetsOf(details.value), from) : null
  if (!from || !to) return null
  const change = gemChange(from, to)
  return change.add.length || change.drop.length ? { title: to.title, change } : null
})
const gearStep = computed(() => {
  const from = itemSet.value
  const to = details.value ? nextSet(itemSetsOf(details.value), from) : null
  if (!from || !to) return null
  const changes = gearChange(from, to)
  return changes.length ? { title: to.title, changes } : null
})
</script>

<style module>
.body { padding: 4px var(--w-pad) 6px; display: grid; gap: 4px; }
.chains { display: grid; gap: 2px; padding-left: 4px; }
</style>
