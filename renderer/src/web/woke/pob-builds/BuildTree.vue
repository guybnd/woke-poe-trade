<template>
  <WPanel title="Passive tree" size-key="tree" width="60rem" max-height="85vh">
    <template #actions>
      <button class="w-icon-btn" title="Fit the build (or double-click the tree)" @click="fit"><i class="fas fa-compress-arrows-alt" /></button>
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
      <div ref="box" :class="$style.map">
        <canvas ref="base" :class="$style.layer" role="img" :aria-label="`Passive tree for ${shown?.title}`" />
        <canvas ref="ring" :class="$style.layer" :style="{ cursor: panning ? 'grabbing' : hovered ? 'pointer' : 'grab' }"
          @wheel.prevent="zoom" @mousedown="startPan" @mousemove="moved" @mouseleave="left" @dblclick="fit" />
      </div>
      <div :class="$style.side" class="w-scroll">
        <div v-if="previous" class="w-dim">{{ previous.title }} to <span class="w-accent">{{ shown?.title }}</span></div>
        <div v-else class="w-accent">{{ shown?.title }}</div>
        <div class="pt-1">
          <span class="w-up">{{ diff.added }} new {{ diff.added === 1 ? 'point' : 'points' }}</span><template v-if="diff.addedAscendancy">, {{ diff.addedAscendancy }} ascendancy</template><template v-if="diff.removed">, <span class="w-down">{{ diff.removed }} to respec</span></template>
        </div>
        <div v-if="!diff.added && !diff.removed" class="w-dim">Same as the tree before it.</div>

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
// A build's passive tree inside the overlay, drawn with the game's art, with
// what a tree adds over the one before it. Saves opening a browser over the game.
import { computed, inject, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { WChip, WEmpty, WPanel } from '../ui'
import { hideTip, showTipAt, tip } from '../ui/tooltip/tooltip'
import { realSets } from './build-model'
import { fitBox, loadPassiveTree, nodeAt, nodeNote, nodeState, NODE_RADIUS, passiveTreeArt, treeDiff } from './passive-tree'
import type { TreeNode, View } from './passive-tree'
import { drawTree, loadSheets } from './tree-draw'
import type { Sheets } from './tree-draw'
import type { PobTreeSpec } from './widget'

// A new `start` object means go to that tree, even if it's the same title again.
const props = defineProps<{ specs: PobTreeSpec[], start: { title: string } }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const trees = computed(() => realSets(props.specs))
const at = shallowRef(0)
const shown = computed(() => trees.value[at.value] ?? trees.value[trees.value.length - 1] ?? null)
const previous = computed(() => (at.value > 0 ? trees.value[at.value - 1] : null))

function pick (i: number) {
  at.value = i
}

// Only on being asked: PoB saving the build shouldn't move you off a tree.
watch(() => props.start, ({ title }) => {
  const i = trees.value.findIndex(t => t.title === title)
  at.value = i < 0 ? 0 : i
}, { immediate: true })

const tree = shallowRef<Map<number, TreeNode> | null>(null)
const sheets = shallowRef<Sheets>(new Map())
const error = shallowRef('')
onMounted(() => {
  loadPassiveTree().then(t => {
    tree.value = t
    const art = passiveTreeArt()
    if (art) loadSheets(art).then(loaded => { sheets.value = loaded }, () => {})
  }, (err: Error) => { error.value = err.message })
})

const toIds = computed(() => shown.value?.nodes ?? [])
const fromIds = computed(() => previous.value?.nodes ?? shown.value?.nodes ?? [])
const toSet = computed(() => new Set(toIds.value))
const fromSet = computed(() => new Set(fromIds.value))
const diff = computed(() => treeDiff(tree.value, previous.value?.nodes ?? [], toIds.value))

// ---- drawing ----

const box = shallowRef<HTMLElement | null>(null)
const base = shallowRef<HTMLCanvasElement | null>(null)
const ring = shallowRef<HTMLCanvasElement | null>(null)
const view = shallowRef<View>({ zoom: 0.1, ox: 0, oy: 0 })
const hovered = shallowRef<TreeNode | null>(null)
const panning = shallowRef(false)
const MIN_ZOOM = 0.03
const MAX_ZOOM = 0.7

// Canvas pixels per CSS pixel: the screen's, and the panel's own zoom.
function pxRatio () {
  const el = box.value
  if (!el || !el.clientWidth) return 1
  return el.getBoundingClientRect().width / el.clientWidth * (window.devicePixelRatio || 1)
}

let frame = 0
function schedule () {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    draw()
    drawRing()
  })
}

function draw () {
  const canvas = base.value
  const t = tree.value
  const art = passiveTreeArt()
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx || !t || !art) return
  const css = getComputedStyle(canvas)
  const colour = (name: string) => css.getPropertyValue(name).trim()
  drawTree({
    ctx,
    width: canvas.width,
    height: canvas.height,
    view: view.value,
    px: pxRatio(),
    nodes: t,
    art,
    sheets: sheets.value,
    from: fromSet.value,
    to: toSet.value,
    colours: { keep: colour('--w-accent'), add: colour('--w-up'), remove: colour('--w-down'), off: colour('--w-line-strong'), bg: colour('--w-panel-solid') }
  })
}

// The hover ring has its own layer, so hovering never redraws the tree.
function drawRing () {
  const canvas = ring.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const n = hovered.value
  const r = n && NODE_RADIUS[n.kind]
  if (!n || !r) return
  const px = pxRatio()
  ctx.beginPath()
  ctx.arc(n.x * view.value.zoom + view.value.ox, n.y * view.value.zoom + view.value.oy, r * view.value.zoom + 4 * px, 0, 2 * Math.PI)
  ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('--w-fg').trim()
  ctx.lineWidth = 2 * px
  ctx.stroke()
}

function resize () {
  const el = box.value
  if (!el || !base.value || !ring.value || !el.clientWidth) return
  const px = pxRatio()
  const w = Math.round(el.clientWidth * px)
  const h = Math.round(el.clientHeight * px)
  if (base.value.width === w && base.value.height === h) return
  // Keeps the same point in the middle.
  const dx = (w - base.value.width) / 2
  const dy = (h - base.value.height) / 2
  for (const c of [base.value, ring.value]) {
    c.width = w
    c.height = h
  }
  if (!fitted) fit()
  else view.value = { ...view.value, ox: view.value.ox + dx, oy: view.value.oy + dy }
  schedule()
}

// Frames this tree and the one before it.
let fitted = false
function fit () {
  const t = tree.value
  const canvas = base.value
  if (!t || !canvas?.width) return
  fitted = true
  const nodes = [...toIds.value, ...fromIds.value].map(id => t.get(id)).filter((n): n is TreeNode => n != null)
  const b = fitBox(nodes) ?? { x: -12000, y: -12000, w: 24000, h: 24000 }
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(canvas.width / b.w, canvas.height / b.h)))
  view.value = { zoom, ox: canvas.width / 2 - (b.x + b.w / 2) * zoom, oy: canvas.height / 2 - (b.y + b.h / 2) * zoom }
  schedule()
}

let observer: ResizeObserver | null = null
watch(box, (el) => {
  observer?.disconnect()
  if (!el) return
  observer = new ResizeObserver(resize)
  observer.observe(el)
  nextTick(resize)
})

watch([() => shown.value?.title, tree], () => { nextTick(fit) })
watch([fromSet, toSet, sheets], schedule)

// The overlay can close with no mouse event: leaving the game's focus ends a
// drag, and the tooltip going away with it ends the hover, so both start fresh.
const wm = inject<WidgetManager>('wm')
watch(() => wm?.active.value, (active) => { if (!active) endPan() })
watch(tip, (t) => {
  if (t || !hovered.value) return
  hovered.value = null
  drawRing()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (frame) cancelAnimationFrame(frame)
  endPan()
  hideTip()
})

// ---- pan, zoom, hover ----

// A mouse event as a point on the canvas.
function canvasPoint (e: MouseEvent) {
  const canvas = ring.value!
  const rect = canvas.getBoundingClientRect()
  return { x: (e.clientX - rect.left) / rect.width * canvas.width, y: (e.clientY - rect.top) / rect.height * canvas.height }
}

function zoom (e: WheelEvent) {
  const p = canvasPoint(e)
  const v = view.value
  const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * (e.deltaY > 0 ? 1 / 1.2 : 1.2)))
  const k = next / v.zoom
  view.value = { zoom: next, ox: p.x - (p.x - v.ox) * k, oy: p.y - (p.y - v.oy) * k }
  schedule()
  hover(e)
}

let panFrom: { x: number, y: number, ox: number, oy: number } | null = null

function startPan (e: MouseEvent) {
  // Or the drag selects the text beside it.
  e.preventDefault()
  const p = canvasPoint(e)
  panFrom = { x: p.x, y: p.y, ox: view.value.ox, oy: view.value.oy }
  panning.value = true
  setHovered(null)
  // On the window, so letting go outside the tree still ends it.
  window.addEventListener('mousemove', movePan)
  window.addEventListener('mouseup', endPan)
}

function movePan (e: MouseEvent) {
  if (!panFrom) return
  // Let go somewhere that never told us.
  if (!e.buttons) {
    endPan()
    return
  }
  const p = canvasPoint(e)
  view.value = { ...view.value, ox: panFrom.ox + p.x - panFrom.x, oy: panFrom.oy + p.y - panFrom.y }
  schedule()
}

function endPan () {
  panFrom = null
  panning.value = false
  window.removeEventListener('mousemove', movePan)
  window.removeEventListener('mouseup', endPan)
}

function setHovered (n: TreeNode | null) {
  if (n === hovered.value) return
  hovered.value = n
  drawRing()
  if (!n || !ring.value) {
    hideTip()
    return
  }
  showTipAt(ring.value, {
    kind: 'passive',
    name: n.name || (n.kind === 'start' ? 'Class start' : 'Passive'),
    stats: n.stats,
    frame: n.kind === 'key' ? 'unique' : n.kind === 'notable' || n.kind === 'jewel' ? 'rare' : 'normal',
    note: nodeNote(nodeState(n.id, fromSet.value, toSet.value))
  })
}

function hover (e: MouseEvent) {
  const t = tree.value
  if (!t || panFrom) return
  const p = canvasPoint(e)
  setHovered(nodeAt(t.values(), p.x, p.y, view.value, 14 * pxRatio()))
}

function moved (e: MouseEvent) {
  hover(e)
}

function left () {
  setHovered(null)
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
  height: min(620px, 72vh);
}
.map {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  border-right: 1px solid var(--w-line);
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.side {
  flex: 0 0 15rem;
  min-width: 0;
  padding: 8px var(--w-pad);
  overflow-y: auto;
  overflow-x: hidden;
  overflow-wrap: anywhere;
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
</style>
