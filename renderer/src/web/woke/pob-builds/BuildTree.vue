<template>
  <WPanel title="Passive tree" size-key="tree" width="56rem" max-height="85vh">
    <template #actions>
      <button v-if="webUrl" class="w-icon-btn" title="Open on the website" @click="openWeb"><i class="fas fa-external-link-alt" /></button>
      <button class="w-icon-btn" title="Close" @click="emit('close')"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <div class="flex flex-wrap gap-1">
        <WChip v-for="(t, i) in trees" :key="i" clickable :active="i === at" @click="pick(i)">{{ t.title }}</WChip>
      </div>
    </template>

    <WEmpty v-if="error" icon="fas fa-exclamation-triangle">{{ error }}</WEmpty>
    <WEmpty v-else-if="!tree" icon="fas fa-spinner fa-spin">Loading…</WEmpty>
    <div v-else :class="$style.wrap">
      <svg ref="svg" :class="$style.map" :viewBox="viewBox" role="img" :aria-label="`Passive tree for ${shown?.title}`"
        @wheel.prevent="zoom" @mousedown="startPan" @mousemove="movePan" @mouseup="endPan" @mouseleave="endPan" @mouseover="hover">
        <path :d="lines['']" :class="$style.dim" />
        <path :d="lines.remove" :class="$style.lineRemove" />
        <path :d="lines.keep" :class="$style.lineKeep" />
        <path :d="lines.add" :class="$style.lineAdd" />
        <circle v-for="n in drawn" :key="n.id" :data-id="n.id" :cx="n.x" :cy="n.y" :r="n.r" :class="$style[n.cls]" />
      </svg>
      <div :class="$style.side" class="w-scroll">
        <div v-if="previous" class="w-dim">{{ previous.title }} to <span class="w-accent">{{ shown?.title }}</span></div>
        <div v-else class="w-accent">{{ shown?.title }}</div>
        <div class="pt-1">
          <span class="w-up">{{ diff.added }} new {{ diff.added === 1 ? 'point' : 'points' }}</span><template v-if="diff.removed">, <span class="w-down">{{ diff.removed }} to respec</span></template>
        </div>
        <div v-if="!diff.added && !diff.removed" class="w-dim">Same as the tree before it.</div>

        <div v-if="hovered?.name" :class="$style.hovered">
          <div class="w-accent">{{ hovered.name }}</div>
          <div v-for="(line, i) in hovered.stats" :key="i" class="w-dim text-xs">{{ line }}</div>
        </div>

        <template v-if="diff.addedNames.length">
          <div :class="$style.heading">New</div>
          <div v-for="n in diff.addedNames" :key="n.id" :class="$style.row">
            <span>{{ n.name }}</span>
            <div v-for="(line, i) in n.stats" :key="i" class="w-dim text-xs">{{ line }}</div>
          </div>
        </template>
        <template v-if="diff.removedNames.length">
          <div :class="$style.heading">Goes away</div>
          <div v-for="n in diff.removedNames" :key="n.id" :class="$style.row">
            <span class="w-down">{{ n.name }}</span>
          </div>
        </template>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// A build's passive tree inside the overlay, with what a tree adds over the one
// before it. Saves opening a browser over the game.
import { computed, onMounted, shallowRef, watch } from 'vue'
import { WChip, WEmpty, WPanel } from '../ui'
import { realSets } from './build-model'
import { fitBox, linkState, loadPassiveTree, nodeState, treeDiff } from './passive-tree'
import type { Box, NodeState, TreeNode } from './passive-tree'
import type { PobTreeSpec } from './widget'

const props = defineProps<{ specs: PobTreeSpec[], start: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const trees = computed(() => realSets(props.specs))
const at = shallowRef(0)
const shown = computed(() => trees.value[at.value] ?? null)
const previous = computed(() => (at.value > 0 ? trees.value[at.value - 1] : null))

function pick (i: number) {
  at.value = i
}

watch(() => [props.start, trees.value] as const, ([title, list]) => {
  const i = list.findIndex(t => t.title === title)
  at.value = i < 0 ? 0 : i
}, { immediate: true })

const tree = shallowRef<Map<number, TreeNode> | null>(null)
const error = shallowRef('')
onMounted(() => {
  loadPassiveTree().then(t => { tree.value = t }, (err: Error) => { error.value = err.message })
})

const toIds = computed(() => shown.value?.nodes ?? [])
const fromIds = computed(() => previous.value?.nodes ?? shown.value?.nodes ?? [])
const toSet = computed(() => new Set(toIds.value))
const fromSet = computed(() => new Set(fromIds.value))
const diff = computed(() => treeDiff(tree.value, previous.value?.nodes ?? [], toIds.value))

// ---- drawing ----

const RADIUS: Partial<Record<TreeNode['kind'], number>> = { small: 26, notable: 48, key: 72, jewel: 48 }

const box = shallowRef<Box>({ x: -12000, y: -12000, w: 24000, h: 24000 })
const viewBox = computed(() => `${box.value.x} ${box.value.y} ${box.value.w} ${box.value.h}`)

const CLASS: Record<NodeState, string> = { 'keep': 'keep', 'add': 'add', 'remove': 'remove', '': 'off' }

const drawn = computed(() => {
  const out: Array<{ id: number, x: number, y: number, r: number, cls: string }> = []
  for (const n of tree.value?.values() ?? []) {
    const r = RADIUS[n.kind]
    if (r) out.push({ id: n.id, x: n.x, y: n.y, r, cls: CLASS[nodeState(n.id, fromSet.value, toSet.value)] })
  }
  return out
})

const lines = computed(() => {
  const out: Record<NodeState, string> = { 'keep': '', 'add': '', 'remove': '', '': '' }
  const t = tree.value
  if (!t) return out
  for (const n of t.values()) {
    if (!RADIUS[n.kind]) continue
    for (const id of n.out) {
      const m = t.get(id)
      if (!m || !RADIUS[m.kind]) continue
      const s = linkState(nodeState(n.id, fromSet.value, toSet.value), nodeState(m.id, fromSet.value, toSet.value))
      out[s] += `M${n.x} ${n.y}L${m.x} ${m.y}`
    }
  }
  return out
})

// Frame the build whenever the tree shown or the data changes.
watch([tree, () => shown.value], () => {
  const t = tree.value
  if (!t) return
  const nodes = [...toIds.value, ...fromIds.value].map(id => t.get(id)).filter((n): n is TreeNode => n != null)
  const fit = fitBox(nodes)
  if (fit) box.value = fit
})

// ---- pan and zoom ----

const svg = shallowRef<SVGSVGElement | null>(null)

function zoom (e: WheelEvent) {
  const rect = svg.value?.getBoundingClientRect()
  if (!rect || !rect.width) return
  const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2
  const b = box.value
  const w = Math.min(40000, Math.max(1500, b.w * factor))
  const h = b.h * (w / b.w)
  const px = (e.clientX - rect.left) / rect.width
  const py = (e.clientY - rect.top) / rect.height
  box.value = { x: b.x + (b.w - w) * px, y: b.y + (b.h - h) * py, w, h }
}

let panFrom: { x: number, y: number, box: Box } | null = null

function startPan (e: MouseEvent) {
  panFrom = { x: e.clientX, y: e.clientY, box: box.value }
}

function movePan (e: MouseEvent) {
  const rect = svg.value?.getBoundingClientRect()
  if (!panFrom || !rect || !rect.width) return
  const scale = panFrom.box.w / rect.width
  box.value = {
    ...panFrom.box,
    x: panFrom.box.x - (e.clientX - panFrom.x) * scale,
    y: panFrom.box.y - (e.clientY - panFrom.y) * scale
  }
}

function endPan () {
  panFrom = null
}

const hovered = shallowRef<TreeNode | null>(null)

function hover (e: MouseEvent) {
  const id = (e.target as Element).getAttribute('data-id')
  if (id) hovered.value = tree.value?.get(Number(id)) ?? null
}

// Tree links come from build files, which may be shared by others: web links only.
const webUrl = computed(() => {
  const url = shown.value?.url ?? ''
  return /^https?:\/\//i.test(url) ? url : undefined
})

function openWeb () {
  if (webUrl.value) window.open(webUrl.value)
}
</script>

<style module>
.wrap {
  display: flex;
  min-height: 0;
  height: min(600px, 70vh);
}
.map {
  flex: 1;
  min-width: 0;
  cursor: grab;
  border-right: 1px solid var(--w-line);
}
.side {
  width: 15rem;
  flex: none;
  padding: 8px var(--w-pad);
  overflow-y: auto;
}
.heading {
  padding: 10px 0 2px;
  font-size: var(--w-fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
.row {
  padding: 3px 0;
  border-bottom: 1px solid var(--w-line-soft);
}
.hovered {
  margin-top: 8px;
  padding: 6px 8px;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.dim { fill: none; stroke: var(--w-line); stroke-width: 10; }
.lineKeep { fill: none; stroke: var(--w-accent); stroke-width: 24; }
.lineAdd { fill: none; stroke: var(--w-up); stroke-width: 32; }
.lineRemove { fill: none; stroke: var(--w-down); stroke-width: 32; }
.off { fill: var(--w-panel-3); stroke: var(--w-line-strong); stroke-width: 6; }
.keep { fill: var(--w-accent); }
.add { fill: var(--w-up); }
.remove { fill: var(--w-down); }
</style>
