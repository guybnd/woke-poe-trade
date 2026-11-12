<template>
  <!-- Pinned: only the tree, with what's still to take lit. -->
  <div v-if="bare" :class="$style.bare">
    <WEmpty v-if="error" icon="fas fa-exclamation-triangle">{{ error }}</WEmpty>
    <WEmpty v-else-if="!tree" icon="fas fa-spinner fa-spin">Loading…</WEmpty>
    <div v-else ref="box" :class="$style.map">
      <canvas ref="base" :class="$style.layer" role="img" :aria-label="`Passive tree for ${shown?.title}`" />
      <canvas ref="ring" :class="$style.layer" :style="{ cursor: panning ? 'grabbing' : hovered ? 'pointer' : 'grab' }"
        @wheel.prevent="zoom" @mousedown="startPan" @mousemove="moved" @mouseleave="left" @dblclick="fit" />
    </div>
  </div>
  <WPanel v-else title="Passive tree" size-key="tree" width="60rem" max-height="85vh">
    <template #actions>
      <PinButton v-if="pin" :make="pin" title="Pin the tree: keep it on screen while you allocate points" />
      <button class="w-icon-btn" title="Fit the build (or double-click the tree)" @click="fit"><i class="fas fa-compress-arrows-alt" /></button>
      <button v-if="webUrl" class="w-icon-btn" title="Open on the website" @click="openWeb"><i class="fas fa-external-link-alt" /></button>
      <button class="w-icon-btn" title="Close" @click="emit('close')"><i class="fas fa-times" /></button>
    </template>
    <template #toolbar>
      <div class="flex flex-wrap gap-1">
        <WChip v-for="(t, i) in trees" :key="i" clickable :active="i === at" @click="pick(i)">{{ t.title }}</WChip>
      </div>
      <div :class="$style.tools">
        <span class="w-num text-xs w-dim whitespace-nowrap">
          <template v-if="previous">
            <span class="w-up">+{{ diff.added }}</span><template v-if="diff.removed"> · <span class="w-down">-{{ diff.removed }} respec</span></template>
          </template>
          <template v-else>{{ diff.added }} {{ diff.added === 1 ? 'point' : 'points' }}</template>
          <template v-if="diff.addedAscendancy"> · {{ diff.addedAscendancy }} ascendancy</template>
        </span>
        <span v-if="earlier" :class="$style.changes">
          <button type="button" :class="$style.switch" class="w-focusable" role="switch" :aria-checked="changes" @click="changes = !changes">
            <i :class="changes ? 'fas fa-check-square' : 'far fa-square'" /> Changes from
          </button>
          <WSelect :model-value="String(fromIndex)" :options="fromOptions" title="Tree to compare against" @update:model-value="pickFrom" />
        </span>
        <WButton size="sm" :variant="sideOpen ? 'primary' : 'default'" icon="fas fa-list" :aria-pressed="sideOpen" @click="sideOpen = !sideOpen">Totals</WButton>
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
      <div v-if="sideOpen" :class="$style.side">
        <WField v-model="query" icon="fas fa-search" placeholder="Find a stat or passive" />
        <div v-if="searching" class="w-dim text-xs pt-1">{{ litCount }} {{ litCount === 1 ? 'node' : 'nodes' }} lit on the tree</div>
        <div :class="$style.totals" class="w-scroll">
          <template v-for="g in groups" :key="g.name">
            <div :class="$style.heading">{{ g.name }}</div>
            <div v-for="(r, i) in g.rows" :key="i" :class="$style.total" @mouseenter="rowIds = r.ids" @mouseleave="rowIds = null">
              <span :class="$style.amount" class="w-num">{{ r.amount }}</span>
              <span class="w-dim">{{ r.text }}</span>
            </div>
          </template>
          <div v-if="!groups.length" class="w-dim pt-2">Nothing in this tree says that.</div>
          <div class="w-faint text-xs pt-2">From this tree, its masteries, its jewels and their cluster passives: no gear or ascendancy. Timeless jewels' changes aren't counted yet.</div>
        </div>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// A build's passive tree inside the overlay, drawn with the game's art, with
// what a tree adds over the one before it. Saves opening a browser over the game.
import { computed, inject, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { WButton, WChip, WEmpty, WField, WPanel, WSelect } from '../ui'
import { hideTip, showTipAt, tip } from '../ui/tooltip/tooltip'
import { realSets } from './build-model'
import { fitBox, loadPassiveTree, nodeAt, nodeNote, nodeState, NODE_RADIUS, passiveTreeArt, passiveTreeClusters, treeDiff, withMasteries } from './passive-tree'
import { buildClusters } from './cluster-graph'
import type { TreeNode, View } from './passive-tree'
import { filterTotals, groupTotals, matchingNodes, treeTotals } from './tree-totals'
import { drawTree, loadSheets } from './tree-draw'
import { changedBy, isTimeless, jewelStats, nodesInRadius, socketedJewels } from './tree-jewels'
import type { Sheets } from './tree-draw'
import type { PobTreeSpec } from './widget'
import PinButton from '../pins/PinButton.vue'
import type { Pin } from '../pins/pins'

// A new `start` object means go to that tree, even if it's the same title again.
// `bare`: only the tree, for a pin. `from`: the tree to show changes from.
const props = defineProps<{ specs: PobTreeSpec[], start: { title: string }, bare?: boolean, from?: string, pin?: () => Omit<Pin, 'opacity' | 'spots'> }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const trees = computed(() => realSets(props.specs))
const at = shallowRef(0)
const shown = computed(() => trees.value[at.value] ?? trees.value[trees.value.length - 1] ?? null)
// The tree to compare against: the one picked in the dropdown, else the one
// before (or after, for the first tree).
const fromAt = shallowRef<number | null>(null)
const fromIndex = computed(() => {
  const n = trees.value.length
  if (n < 2) return -1
  // `shown` falls back to the last tree when saving in PoB dropped sets.
  const cur = Math.min(at.value, n - 1)
  if (fromAt.value != null && fromAt.value !== cur && fromAt.value < n) return fromAt.value
  return cur > 0 ? cur - 1 : 1
})
const earlier = computed(() => trees.value[fromIndex.value] ?? null)
const fromOptions = computed(() => trees.value
  .map((t, i) => ({ value: String(i), label: t.title }))
  .filter(o => Number(o.value) !== Math.min(at.value, trees.value.length - 1)))
// Off, the picked tree on its own. On, what it changes from the other tree.
// Only the switch or the dropdown turns it on: comparing is always asked for.
const changes = shallowRef(false)

function pickFrom (v: string) {
  fromAt.value = Number(v)
  changes.value = true
}
const previous = computed(() => changes.value ? earlier.value : null)

function pick (i: number) {
  at.value = i
}

// Only on being asked: PoB saving the build shouldn't move you off a tree.
watch(() => props.start, ({ title }) => {
  const i = trees.value.findIndex(t => t.title === title)
  at.value = i < 0 ? 0 : i
  const from = props.from != null ? trees.value.findIndex(t => t.title === props.from) : -1
  changes.value = from >= 0 && from !== at.value
  fromAt.value = changes.value ? from : null
}, { immediate: true })

const baseTree = shallowRef<Map<number, TreeNode> | null>(null)
// The shown tree's cluster jewels grow their own small trees off the outer
// sockets (cluster-graph.ts); they join the tree's nodes for everything else.
const clusterBuild = computed(() => {
  const t = baseTree.value
  const data = passiveTreeClusters()
  const art = passiveTreeArt()
  if (!t || !data || !art) return null
  const at = new Map((shown.value?.sockets ?? []).map(s => [s.node, s.item]))
  const built = buildClusters(data, t, node => at.get(node), art.groups.length)
  // Comparing: the other tree's clusters too, so points it has that this one
  // doesn't are drawn. Where both have a cluster in one socket, the shown
  // tree's jewel names the nodes (ids follow the socket, not the jewel).
  const other = previous.value
  if (other) {
    const was = new Map((other.sockets ?? []).map(s => [s.node, s.item]))
    const have = new Set(built.nodes.map(n => n.id))
    const more = buildClusters(data, t, node => was.get(node), art.groups.length + built.groups.length)
    built.nodes.push(...more.nodes.filter(n => !have.has(n.id)))
    built.groups.push(...more.groups)
  }
  return built
})
const tree = computed(() => {
  const t = baseTree.value
  const added = clusterBuild.value?.nodes
  if (!t || !added?.length) return t
  const all = new Map(t)
  for (const n of added) all.set(n.id, n)
  return all
})
const sheets = shallowRef<Sheets>(new Map())
const error = shallowRef('')
onMounted(() => {
  loadPassiveTree().then(t => {
    baseTree.value = t
    const art = passiveTreeArt()
    if (art) loadSheets(art).then(loaded => { sheets.value = loaded }, () => {})
  }, (err: Error) => { error.value = err.message })
})

const toIds = computed(() => shown.value?.nodes ?? [])
const fromIds = computed(() => previous.value?.nodes ?? shown.value?.nodes ?? [])
const toSet = computed(() => new Set(toIds.value))
const fromSet = computed(() => new Set(fromIds.value))
const diff = computed(() => treeDiff(tree.value, previous.value?.nodes ?? [], toIds.value))

// ---- totals and search ----

// Closed until asked for: the tooltips do the reading.
const sideOpen = shallowRef(false)
const query = shallowRef('')
// The nodes behind the total under the mouse.
const rowIds = shallowRef<number[] | null>(null)

// Jewels in this tree, by socket.
// Only jewels in allocated sockets do anything.
const jewels = computed(() => socketedJewels(shown.value?.sockets).filter(j => toSet.value.has(j.node)))
const jewelAt = computed(() => new Map(jewels.value.map(j => [j.node, j])))

// Picked masteries read as their effect, and a socket as its jewel's mods,
// in totals and tooltips.
const nodeOf = computed(() => {
  if (!tree.value) return () => undefined
  const base = withMasteries(tree.value, shown.value?.masteries)
  return (id: number) => {
    const n = base(id)
    const j = jewelAt.value.get(id)
    return n && j ? { ...n, stats: jewelStats(j.item) } : n
  }
})
const totals = computed(() => tree.value ? treeTotals(tree.value, toIds.value, nodeOf.value) : [])
const groups = computed(() => groupTotals(filterTotals(totals.value, query.value)))
const searching = computed(() => sideOpen.value && query.value.trim().length >= 2)
const searchHits = computed(() => (searching.value && tree.value) ? matchingNodes([...tree.value.keys()].map(id => nodeOf.value(id)!), query.value) : [])
const litCount = computed(() => searchHits.value.length)
const lit = computed(() => rowIds.value ?? searchHits.value)
// The row under the mouse can go with no mouseleave.
watch([query, sideOpen, () => shown.value?.title], () => { rowIds.value = null })

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
  const baseArt = passiveTreeArt()
  // The cluster rings' centres join the art's groups, for their orbit arcs.
  const art = baseArt && { ...baseArt, groups: [...baseArt.groups, ...(clusterBuild.value?.groups ?? [])] }
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
    colours: { keep: colour('--w-accent'), add: colour('--w-up'), remove: colour('--w-down'), off: colour('--w-line-strong'), bg: colour('--w-panel-solid-base') }
  })
  drawJewels(ctx, t, colour)
}

// Each jewel in its socket, its ring, and the passives it changes.
const RARITY_COLOUR: Record<string, string> = { UNIQUE: '#af6025', RELIC: '#82ad6a', RARE: '#e8e070', MAGIC: '#8888ff' }
function drawJewels (ctx: CanvasRenderingContext2D, t: Map<number, TreeNode>, colour: (name: string) => string) {
  const v = view.value
  const px = pxRatio()
  const X = (x: number) => x * v.zoom + v.ox
  const Y = (y: number) => y * v.zoom + v.oy
  for (const j of jewels.value) {
    const n = t.get(j.node)
    if (!n) continue
    if (j.radius != null) {
      ctx.beginPath()
      ctx.arc(X(n.x), Y(n.y), j.radius * v.zoom, 0, 2 * Math.PI)
      ctx.setLineDash([6 * px, 5 * px])
      ctx.strokeStyle = colour('--w-accent')
      ctx.globalAlpha = 0.7
      ctx.lineWidth = 1.5 * px
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }
    if (j.changes) {
      for (const c of nodesInRadius(t, j)) {
        if (!toSet.value.has(c.id)) continue
        ctx.beginPath()
        ctx.arc(X(c.x), Y(c.y), (NODE_RADIUS[c.kind] ?? 40) * v.zoom + 2 * px, 0, 2 * Math.PI)
        ctx.strokeStyle = RARITY_COLOUR.UNIQUE
        ctx.lineWidth = 2 * px
        ctx.stroke()
      }
    }
    // The jewel itself: a gem shape in its rarity's colour.
    const r = Math.max(5 * px, (NODE_RADIUS.jewel ?? 54) * 0.55 * v.zoom)
    ctx.beginPath()
    ctx.moveTo(X(n.x), Y(n.y) - r)
    ctx.lineTo(X(n.x) + r, Y(n.y))
    ctx.lineTo(X(n.x), Y(n.y) + r)
    ctx.lineTo(X(n.x) - r, Y(n.y))
    ctx.closePath()
    ctx.fillStyle = RARITY_COLOUR[j.item.rarity] ?? colour('--w-fg')
    ctx.fill()
  }
}

// The hover ring has its own layer, so hovering never redraws the tree.
function drawRing () {
  const canvas = ring.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const px = pxRatio()
  const circle = (n: TreeNode, colour: string, grow: number, width: number) => {
    const r = NODE_RADIUS[n.kind]
    if (!r) return
    ctx.beginPath()
    ctx.arc(n.x * view.value.zoom + view.value.ox, n.y * view.value.zoom + view.value.oy, r * view.value.zoom + grow * px, 0, 2 * Math.PI)
    ctx.strokeStyle = colour
    ctx.lineWidth = width * px
    ctx.stroke()
  }
  const css = getComputedStyle(canvas)
  const found = css.getPropertyValue('--w-info').trim()
  for (const id of lit.value) {
    const n = tree.value?.get(id)
    if (n) circle(n, found, 3, 2.5)
  }
  if (hovered.value) circle(hovered.value, css.getPropertyValue('--w-fg').trim(), 4, 2)
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

// Not when the switch flips: you may be looking at a part of the tree.
// The base tree only: a build's clusters rebuilding (PoB saved it) keeps the view.
watch([() => shown.value?.title, baseTree], () => { nextTick(fit) })
watch([fromSet, toSet, sheets, jewels], schedule)
watch(lit, drawRing)

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
  // A mastery shows the effect picked in the tree it's in; comparing, one
  // dropped or changed shows the earlier pick too.
  const before = n.kind === 'mastery' && previous.value && fromSet.value.has(n.id) && tree.value
    ? withMasteries(tree.value, previous.value.masteries)(n.id)
    : undefined
  const picked = n.kind === 'mastery' && toSet.value.has(n.id) ? nodeOf.value(n.id) : before
  const was = before?.stats.length && picked !== before && before.stats.join() !== picked?.stats.join()
    ? `Was: ${before.stats.join('; ')}`
    : undefined
  // A socket with a jewel shows the jewel.
  const jewel = jewelAt.value.get(n.id)
  if (jewel) {
    showTipAt(ring.value, { kind: 'item', item: jewel.item })
    return
  }
  const by = tree.value ? changedBy(tree.value, jewels.value, n) : null
  const changedNote = by
    ? isTimeless(by.item)
      ? `In the ring of ${by.item.name}, which changes this passive. Its new stats aren't shown yet.`
      : `In the ring of ${by.item.name}, which can change this passive.`
    : undefined
  showTipAt(ring.value, {
    kind: 'passive',
    name: n.name || (n.kind === 'start' ? 'Class start' : 'Passive'),
    stats: picked?.stats.length ? picked.stats : n.stats,
    frame: n.kind === 'key' ? 'unique' : n.kind === 'notable' || n.kind === 'jewel' ? 'rare' : 'normal',
    note: [nodeNote(nodeState(n.id, fromSet.value, toSet.value)), was, changedNote].filter(Boolean).join(' · ') || undefined
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
.bare { display: flex; width: 26rem; height: 20rem; }
.bare .map { border-right: 0; }
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.changes {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  white-space: nowrap;
  font-size: var(--w-fs-sm);
  color: var(--w-dim);
}
.switch { display: inline-flex; align-items: center; gap: 6px; }
.switch:hover { color: var(--w-fg); }
.changes :global(select) { max-width: 10rem; }
.tools {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex: none;
}
.side {
  display: flex;
  flex-direction: column;
  flex: 0 0 19rem;
  min-width: 0;
  padding: 8px var(--w-pad);
}
.totals {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overflow-wrap: anywhere;
  margin-top: 4px;
}
.total {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  line-height: 1.35;
}
.total:hover { background: var(--w-line-soft); }
.amount {
  flex: 0 0 3.2rem;
  text-align: right;
  font-weight: 600;
  color: var(--w-fg);
}
.heading {
  padding: 10px 0 2px;
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
</style>
