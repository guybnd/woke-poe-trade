<template>
  <!-- Pinned: only the tree, with the plan and the lit mechanics. -->
  <div v-if="bare" :class="$style.bare">
    <div ref="box" :class="$style.map">
      <canvas ref="base" :class="$style.layer" role="img" aria-label="Atlas passive tree" />
      <canvas ref="ring" :class="$style.layer" />
    </div>
  </div>
  <WPanel v-else title="Atlas tree" size-key="tree" width="44rem" height="36rem" max-height="85vh">
    <template #actions>
      <button class="w-icon-btn" :class="{ 'w-icon-btn--on': listOpen }" title="Mechanics: light a mechanic's passives" @click="emit('update:listOpen', !listOpen)"><i class="fas fa-list" /></button>
      <PinButton v-if="pin" :make="pin" title="Pin the tree over the game: clicks go through to the game's atlas" />
      <button class="w-icon-btn" title="Undo (Ctrl + Z)" :disabled="!undoStack.length" @click="undo"><i class="fas fa-undo" /></button>
      <button class="w-icon-btn" title="Redo (Ctrl + Y)" :disabled="!redoStack.length" @click="redo"><i class="fas fa-redo" /></button>
      <button class="w-icon-btn" title="Fit the allocated part (or double-click the tree)" @click="fit"><i class="fas fa-compress-arrows-alt" /></button>
      <button class="w-icon-btn" title="Hide the tree" @click="emit('close')"><i class="fas fa-times" /></button>
    </template>
    <template v-if="unreadable" #banner>
      <WBanner tone="warn">This tree can't be edited here: {{ unreadable }}. It stays as it is until you start over.
        <template #actions><WButton size="sm" @click="startOver">Start over</WButton></template>
      </WBanner>
    </template>
    <template v-if="dirty || savingAs" #meta>
      <div :class="$style.unsaved">
        <template v-if="savingAs">
          <span class="w-dim whitespace-nowrap">Save as</span>
          <input ref="nameField" v-model="newName" class="w-field" :class="$style.name" spellcheck="false" placeholder="New strategy name"
            @keydown.enter.prevent="saveAs" @keydown.esc.prevent="savingAs = false">
          <WButton size="sm" variant="primary" :disabled="!newName.trim()" @click="saveAs">Save</WButton>
          <WButton size="sm" variant="ghost" @click="savingAs = false">Cancel</WButton>
        </template>
        <template v-else>
          <span class="w-accent whitespace-nowrap" title="The tree has changes you haven't saved"><span :class="$style.dot" /> Unsaved changes</span>
          <WButton size="sm" variant="primary" icon="fas fa-save" title="Save the tree to this strategy (Ctrl + S)" @click="emit('save')">Save</WButton>
          <WButton size="sm" title="Save as a new strategy, leaving this one as it was" @click="startSaveAs">Save as…</WButton>
          <WButton size="sm" variant="ghost" title="Go back to the saved tree" @click="emit('discard')">Discard</WButton>
        </template>
      </div>
    </template>
    <template #toolbar>
      <span class="w-num text-xs whitespace-nowrap" :class="over ? 'w-down' : 'w-dim'" :title="over ? 'More points than the atlas has' : undefined">
        {{ used }} / {{ model.points }} points
      </span>
      <span v-for="w in warnings" :key="w" class="text-xs w-warn whitespace-nowrap" :class="$style.warn"><i class="fas fa-exclamation-triangle" /> {{ w }}</span>
      <div :class="$style.tools">
        <WField v-model="query" icon="fas fa-search" placeholder="Find a passive" :class="$style.find" />
        <WButton size="sm" :icon="copied === link ? 'fas fa-check' : 'far fa-copy'" :disabled="!link" @click="link && copy(link)">Copy link</WButton>
        <WButton v-if="link" size="sm" icon="fas fa-external-link-alt" title="Open on pathofexile.com" @click="openWeb">Website</WButton>
      </div>
    </template>

    <div ref="box" :class="$style.map" tabindex="0" @keydown="keys">
      <canvas ref="base" :class="$style.layer" role="img" aria-label="Atlas passive tree" />
      <canvas ref="ring" :class="$style.layer" :style="{ cursor: panning ? 'grabbing' : hovered ? 'pointer' : 'grab' }"
        @wheel.prevent="zoom" @mousedown="startPan" @mousemove="hover" @mouseleave="setHovered(null)" @dblclick="fit" @contextmenu.prevent />
      <!-- The mechanics (pick A): click to light a mechanic's passives in its own colour. -->
      <div v-if="listOpen" :class="$style.mechs" @wheel.stop>
        <div :class="$style.mechsHead">
          <span>Mechanics</span>
          <button v-if="lit.length" type="button" class="w-focusable" @click="emit('update:lit', [])">Clear</button>
        </div>
        <div :class="$style.mechsRows" class="w-scroll">
          <button v-for="m in mechanicRows" :key="m.name" type="button" :class="$style.mech" class="w-focusable"
            :aria-pressed="liveLit.includes(m.name)" :title="`${m.name}: ${m.taken} of ${m.total} passives taken`"
            @click="toggleLit(m.name)" @mouseenter="preview = m.name" @mouseleave="preview = ''">
            <span :class="$style.icon" :style="liveLit.includes(m.name) ? { borderColor: litColour(liveLit, m.name), boxShadow: `0 0 0 1px ${litColour(liveLit, m.name)}` } : undefined">
              <span v-if="model.mechanicArt.get(m.name)" :class="$style.art" :style="artStyle(m.name)" />
            </span>
            <span class="w-trunc">{{ m.name.replace(/^The /, '') }}</span>
            <span :class="$style.count" class="w-num"><span :class="m.taken ? 'w-accent' : ''">{{ m.taken }}</span>/{{ m.total }}</span>
          </button>
        </div>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// The atlas tree, drawn with the game's art, to edit a strategy's allocation:
// click to take the shortest path to a passive, click again to refund it and
// whatever hangs off it. Every edit writes the strategy's tree link.
import { computed, inject, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { WBanner, WButton, WField, WPanel, openMenu, useCopy } from '../ui'
import { hideTip, showTipAt, tip } from '../ui/tooltip/tooltip'
import { fitBox, nodeAt, NODE_RADIUS } from '../pob-builds/passive-tree'
import type { TreeNode, View } from '../pob-builds/passive-tree'
import { drawTree, loadSheets } from '../pob-builds/tree-draw'
import type { Sheets } from '../pob-builds/tree-draw'
import { decodeTree } from './tree'
import { encodeAtlasTree, pathTo, pointsUsed, refundSet } from './atlas-tree'
import type { AtlasTreeModel } from './atlas-tree'
import { treeWarnings } from './loadout'
import { litColour } from './mechanic-colours'
import { totalsHover } from './totals-hover'
import PinButton from '../pins/PinButton.vue'
import type { Pin } from '../pins/pins'
import type { ThreadSlot } from './widget'

// `lit`: mechanics lit, in picked order. `bare`: only the tree, for a pin.
const props = defineProps<{
  model: AtlasTreeModel
  treeUrl: string
  threads: ThreadSlot[]
  lit: string[]
  listOpen?: boolean
  bare?: boolean
  pin?: () => Omit<Pin, 'opacity' | 'spots'>
  // The tree differs from what's saved.
  dirty?: boolean
  // The name Save as suggests.
  name?: string
}>()
const emit = defineEmits<{
  (e: 'update:treeUrl' | 'save-as', text: string): void
  (e: 'update:lit', lit: string[]): void
  (e: 'update:listOpen', open: boolean): void
  (e: 'close' | 'save' | 'discard'): void
}>()

// ---- save, save as ----

const savingAs = shallowRef(false)
const newName = shallowRef('')
const nameField = shallowRef<HTMLInputElement | null>(null)
function startSaveAs () {
  newName.value = `${props.name || 'Untitled'} (new)`
  savingAs.value = true
  nextTick(() => { nameField.value?.focus(); nameField.value?.select() })
}
function saveAs () {
  const name = newName.value.trim()
  if (!name) return
  savingAs.value = false
  emit('save-as', name)
}

// ---- mechanics ----

// The mechanic under the mouse in the list: lit until it leaves.
const preview = shallowRef('')
const mechanicRows = computed(() => {
  const rows = new Map<string, { name: string, taken: number, total: number }>()
  for (const name of props.model.mechanics) rows.set(name, { name, taken: 0, total: 0 })
  for (const [id, name] of props.model.mechanicOf) {
    const r = rows.get(name)
    if (!r) continue
    r.total++
    if (alloc.value.nodes.has(id)) r.taken++
  }
  // What the plan uses first, then the biggest.
  return [...rows.values()].sort((a, b) => b.taken - a.taken || b.total - a.total || a.name.localeCompare(b.name))
})

// Lit mechanics this atlas has: an older league's names keep no colour slot.
const liveLit = computed(() => props.lit.filter(m => props.model.mechanics.includes(m)))

// The mastery icon, cut from its sheet and scaled to the row.
const ICON_PX = 26
function artStyle (name: string) {
  const a = props.model.mechanicArt.get(name)!
  return { width: `${a.w}px`, height: `${a.h}px`, backgroundImage: `url(${a.url})`, backgroundPosition: `-${a.x}px -${a.y}px`, zoom: ICON_PX / Math.max(a.w, a.h) }
}

function toggleLit (name: string) {
  const off = liveLit.value.includes(name)
  // Turning one off shows at once, not when the mouse leaves its row.
  if (off) preview.value = ''
  emit('update:lit', off ? liveLit.value.filter(m => m !== name) : [...liveLit.value, name])
}

const { copied, copy } = useCopy()

// ---- the allocation, read from and written to the link ----

interface Alloc { nodes: Set<number>, variants: Record<number, number> }

// Why the link can't be edited here, if it can't: another site's link, or
// passives this atlas no longer has. Editing it would throw it away.
const unreadable = shallowRef('')

function readLink (url: string): Alloc {
  const nodes = new Set<number>([props.model.start])
  const variants: Record<number, number> = {}
  unreadable.value = ''
  if (!url.trim()) return { nodes, variants }
  try {
    const t = decodeTree(url)
    let lost = 0
    for (const id of t.nodes) {
      if (props.model.nodes.has(id)) nodes.add(id)
      else lost++
    }
    for (const m of t.masteries) if (props.model.variants.get(m.node)?.some(v => v.effect === m.effect)) variants[m.node] = m.effect
    if (lost) unreadable.value = `${lost} of its passives aren't in this atlas (a link from an older league)`
  } catch {
    unreadable.value = 'it isn\'t a pathofexile.com atlas tree link'
  }
  return { nodes, variants }
}

const alloc = shallowRef<Alloc>(readLink(props.treeUrl))

// Throws the old link away for an empty tree, on purpose.
function startOver () {
  unreadable.value = ''
  commit({ nodes: new Set([props.model.start]), variants: {} })
}
// Our own writes come back as the prop: no need to read them again.
let lastWritten = props.treeUrl
watch(() => props.treeUrl, (url) => {
  if (url === lastWritten) return
  lastWritten = url
  alloc.value = readLink(url)
  undoStack.value = []
  redoStack.value = []
  nextTick(fit)
})

const link = computed(() => unreadable.value ? (/^https:\/\/(www\.)?pathofexile\.com\//i.test(props.treeUrl) ? props.treeUrl : '') : pointsUsed(props.model, alloc.value.nodes) ? lastWrittenLink.value : '')
const lastWrittenLink = computed(() => encodeAtlasTree([...alloc.value.nodes].filter(id => id !== props.model.start), alloc.value.variants))
const used = computed(() => pointsUsed(props.model, alloc.value.nodes))
const over = computed(() => used.value > props.model.points)
const warnings = computed(() => treeWarnings(props.model, alloc.value.nodes, props.threads))

const undoStack = shallowRef<Alloc[]>([])
const redoStack = shallowRef<Alloc[]>([])

function commit (next: Alloc) {
  undoStack.value = [...undoStack.value.slice(-49), alloc.value]
  redoStack.value = []
  apply(next)
}

function apply (next: Alloc) {
  alloc.value = next
  const url = pointsUsed(props.model, next.nodes) ? encodeAtlasTree([...next.nodes].filter(id => id !== props.model.start), next.variants) : ''
  lastWritten = url
  emit('update:treeUrl', url)
}

function undo () {
  if (unreadable.value) return
  const prev = undoStack.value.at(-1)
  if (!prev) return
  undoStack.value = undoStack.value.slice(0, -1)
  redoStack.value = [...redoStack.value, alloc.value]
  apply(prev)
}

function redo () {
  if (unreadable.value) return
  const next = redoStack.value.at(-1)
  if (!next) return
  redoStack.value = redoStack.value.slice(0, -1)
  undoStack.value = [...undoStack.value, alloc.value]
  apply(next)
}

function keys (e: KeyboardEvent) {
  if (!e.ctrlKey) return
  if (e.key === 's') { e.preventDefault(); if (props.dirty) emit('save'); return }
  if (e.key === 'z') { e.preventDefault(); undo() } else if (e.key === 'y') { e.preventDefault(); redo() }
}

function take (id: number) {
  const path = pathTo(props.model, alloc.value.nodes, id)
  if (!path.length) return
  const nodes = new Set(alloc.value.nodes)
  for (const p of path) nodes.add(p)
  const variants = { ...alloc.value.variants }
  for (const p of path) {
    const choices = props.model.variants.get(p)
    if (choices && variants[p] == null) variants[p] = choices[0].effect
  }
  commit({ nodes, variants })
}

function refund (id: number) {
  const gone = refundSet(props.model, alloc.value.nodes, id)
  if (!gone.length) return
  const nodes = new Set(alloc.value.nodes)
  for (const g of gone) nodes.delete(g)
  const variants = Object.fromEntries(Object.entries(alloc.value.variants).filter(([id]) => nodes.has(Number(id))))
  commit({ nodes, variants })
}

function pickVariant (id: number, effect: number) {
  commit({ nodes: alloc.value.nodes, variants: { ...alloc.value.variants, [id]: effect } })
}

// ---- drawing ----

const sheets = shallowRef<Sheets>(new Map())
watch(() => props.model, (m) => {
  sheets.value = new Map()
  loadSheets(m.art).then(loaded => { if (props.model === m) sheets.value = loaded }, () => {})
  alloc.value = readLink(props.treeUrl)
  nextTick(fit)
}, { immediate: true })

const query = shallowRef('')
const hits = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []
  const out: TreeNode[] = []
  for (const n of props.model.nodes.values()) {
    if (n.kind === 'mastery' || n.kind === 'start') continue
    const variantText = props.model.variants.get(n.id)?.map(v => v.text).join(' ') ?? ''
    if (n.name.toLowerCase().includes(q) || n.stats.some(s => s.toLowerCase().includes(q)) || variantText.toLowerCase().includes(q)) out.push(n)
  }
  return out
})

const box = shallowRef<HTMLElement | null>(null)
const base = shallowRef<HTMLCanvasElement | null>(null)
const ring = shallowRef<HTMLCanvasElement | null>(null)
const view = shallowRef<View>({ zoom: 0.05, ox: 0, oy: 0 })
const hovered = shallowRef<TreeNode | null>(null)
const panning = shallowRef(false)
const MIN_ZOOM = 0.02
const MAX_ZOOM = 0.7

// The path the hovered passive would take, drawn as new.
const pending = computed(() => hovered.value ? pathTo(props.model, alloc.value.nodes, hovered.value.id) : [])
const toSet = computed(() => pending.value.length ? new Set([...alloc.value.nodes, ...pending.value]) : alloc.value.nodes)

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
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  const css = getComputedStyle(canvas)
  const colour = (name: string) => css.getPropertyValue(name).trim()
  drawTree({
    ctx,
    width: canvas.width,
    height: canvas.height,
    view: view.value,
    px: pxRatio(),
    nodes: props.model.nodes,
    art: props.model.art,
    sheets: sheets.value,
    from: alloc.value.nodes,
    to: toSet.value,
    colours: { keep: colour('--w-accent'), add: colour('--w-info'), remove: colour('--w-down'), off: colour('--w-line-strong'), bg: colour('--w-panel-solid-base') }
  })
}

// Search hits and the hovered node on their own layer.
function drawRing () {
  const canvas = ring.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const px = pxRatio()
  const v = view.value
  const circle = (n: TreeNode, colour: string, grow: number, width: number) => {
    const r = NODE_RADIUS[n.kind]
    if (!r) return
    ctx.beginPath()
    ctx.arc(n.x * v.zoom + v.ox, n.y * v.zoom + v.oy, r * v.zoom + grow * px, 0, 2 * Math.PI)
    ctx.strokeStyle = colour
    ctx.lineWidth = width * px
    ctx.stroke()
  }
  const css = getComputedStyle(canvas)
  // Lit mechanics: a ring in the mechanic's colour round each of its passives.
  const showing = preview.value && !liveLit.value.includes(preview.value) ? [...liveLit.value, preview.value] : liveLit.value
  if (showing.length) {
    for (const [id, name] of props.model.mechanicOf) {
      if (!showing.includes(name)) continue
      const n = props.model.nodes.get(id)
      if (n) circle(n, litColour(showing, name), 2, 2.5)
    }
  }
  const found = css.getPropertyValue('--w-info').trim()
  for (const n of hits.value) circle(n, found, 3, 2.5)
  // A pinned tree doesn't follow the window's hover.
  for (const id of (props.bare ? null : totalsHover.value) ?? []) {
    const n = props.model.nodes.get(id)
    if (n) circle(n, css.getPropertyValue('--w-fg').trim(), 4, 2.5)
  }
  // A dot on each taken passive that needs a type, so a missing pick shows.
  for (const id of props.model.variants.keys()) {
    const n = props.model.nodes.get(id)
    if (n && alloc.value.nodes.has(id)) circle(n, css.getPropertyValue('--w-accent').trim(), 1, 1.5)
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
  const dx = (w - base.value.width) / 2
  const dy = (h - base.value.height) / 2
  for (const c of [base.value, ring.value]) { c.width = w; c.height = h }
  if (!fitted) fit()
  else view.value = { ...view.value, ox: view.value.ox + dx, oy: view.value.oy + dy }
  schedule()
}

let fitted = false
// Frames what's taken, or the whole atlas when nothing is.
function fit () {
  const canvas = base.value
  if (!canvas?.width) return
  fitted = true
  const taken = [...alloc.value.nodes].map(id => props.model.nodes.get(id)).filter((n): n is TreeNode => n != null)
  const all = [...props.model.nodes.values()]
  const b = (taken.length > 4 ? fitBox(taken) : null) ?? fitBox(all, 300) ?? { x: -7000, y: -14000, w: 14000, h: 14000 }
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(canvas.width / b.w, canvas.height / b.h)))
  view.value = { zoom: z, ox: canvas.width / 2 - (b.x + b.w / 2) * z, oy: canvas.height / 2 - (b.y + b.h / 2) * z }
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

watch([toSet, sheets, () => alloc.value], schedule)
watch([hits, preview, liveLit, totalsHover], drawRing)

const wm = inject<WidgetManager>('wm')
watch(() => wm?.active.value, (active) => { if (!active) endPan() })
watch(tip, (t) => {
  if (t || !hovered.value) return
  hovered.value = null
  schedule()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (frame) cancelAnimationFrame(frame)
  endPan()
  hideTip()
})

// ---- pan, zoom, hover, click ----

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

// A press that barely moves is a click; more is a drag.
let panFrom: { x: number, y: number, ox: number, oy: number, moved: boolean, button: number } | null = null

function startPan (e: MouseEvent) {
  e.preventDefault()
  box.value?.focus({ preventScroll: true })
  const p = canvasPoint(e)
  panFrom = { x: p.x, y: p.y, ox: view.value.ox, oy: view.value.oy, moved: false, button: e.button }
  window.addEventListener('mousemove', movePan)
  window.addEventListener('mouseup', endPan)
}

function movePan (e: MouseEvent) {
  if (!panFrom) return
  if (!e.buttons) { endPan(); return }
  const p = canvasPoint(e)
  const dx = p.x - panFrom.x
  const dy = p.y - panFrom.y
  if (!panFrom.moved && Math.abs(dx) + Math.abs(dy) < 5 * pxRatio()) return
  if (!panFrom.moved) {
    panFrom.moved = true
    panning.value = true
    setHovered(null)
  }
  view.value = { ...view.value, ox: panFrom.ox + dx, oy: panFrom.oy + dy }
  schedule()
}

function endPan (e?: MouseEvent) {
  const was = panFrom
  panFrom = null
  panning.value = false
  window.removeEventListener('mousemove', movePan)
  window.removeEventListener('mouseup', endPan)
  if (e && was && !was.moved) click(e, was.button)
}

function click (e: MouseEvent, button: number) {
  if (unreadable.value || props.bare) return
  const p = canvasPoint(e)
  const n = nodeAt(props.model.nodes.values(), p.x, p.y, view.value, 14 * pxRatio())
  if (!n || n.kind === 'mastery' || n.kind === 'start') return
  const choices = props.model.variants.get(n.id)
  const taken = alloc.value.nodes.has(n.id)
  if (taken && choices && button === 2) {
    variantMenu(e, n, choices)
    return
  }
  if (button !== 0) return
  if (taken) refund(n.id)
  else take(n.id)
  setHovered(null)
  hover(e)
}

function variantMenu (e: MouseEvent, n: TreeNode, choices: Array<{ effect: number, text: string }>) {
  hideTip()
  const picked = alloc.value.variants[n.id]
  openMenu(e, [
    ...choices.map(c => ({
      label: c.text,
      icon: c.effect === picked ? 'fas fa-check' : 'far fa-circle',
      action: () => pickVariant(n.id, c.effect)
    })),
    { separator: true as const },
    { label: 'Refund', icon: 'fas fa-undo', danger: true, action: () => refund(n.id) }
  ])
}

function setHovered (n: TreeNode | null) {
  if (n === hovered.value) return
  hovered.value = n
  schedule()
  if (!n || !ring.value) { hideTip(); return }
  const taken = alloc.value.nodes.has(n.id)
  const choices = props.model.variants.get(n.id)
  const picked = choices?.find(c => c.effect === alloc.value.variants[n.id])
  const stats = choices && picked ? [...n.stats.map(s => `${s}: ${picked.text}`)] : n.stats
  const cost = pending.value.length
  const note = taken
    ? (choices ? `Type: ${picked?.text ?? choices[0].text}. Right-click to change, click to refund` : 'Taken. Click to refund')
    : cost ? `Click to take: ${cost} ${cost === 1 ? 'point' : 'points'}` + (choices ? `. Types: ${choices.map(c => c.text).join(', ')}` : '') : 'Out of reach'
  showTipAt(ring.value, {
    kind: 'passive',
    name: n.name || 'Atlas passive',
    stats,
    frame: n.kind === 'key' ? 'unique' : n.kind === 'notable' || n.kind === 'wormhole' ? 'rare' : 'normal',
    note: [props.model.mechanicOf.get(n.id), note].filter(Boolean).join(' · ')
  })
}

function hover (e: MouseEvent) {
  if (panFrom?.moved) return
  const p = canvasPoint(e)
  const n = nodeAt(props.model.nodes.values(), p.x, p.y, view.value, 14 * pxRatio())
  setHovered(n && n.kind !== 'mastery' ? n : null)
}

function openWeb () {
  if (link.value) window.open(link.value)
}
</script>

<style module>
.map {
  position: relative;
  flex: 1;
  height: min(560px, 68vh);
  overflow: hidden;
  outline: none;
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.tools {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  flex: none;
}
.find { width: 11rem; }
.unsaved { display: flex; align-items: center; gap: 6px; width: 100%; flex-wrap: wrap; }
.dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: currentColor; vertical-align: middle; }
.name { flex: 1; min-width: 8rem; }
.bare { display: flex; width: 30rem; height: 26rem; }
.bare .map { height: 100%; }
.mechs {
  position: absolute;
  left: 8px;
  top: 8px;
  bottom: 8px;
  width: 12.5rem;
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--w-panel-solid-base) 88%, transparent);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.mechsHead {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  font-family: var(--w-caps-face);
  color: var(--w-faint);
  border-bottom: 1px solid var(--w-line);
}
.mechsHead button { color: var(--w-dim); text-transform: none; letter-spacing: 0; font-family: inherit; }
.mechsHead button:hover { color: var(--w-fg); }
.mechsRows { flex: 1; min-height: 0; overflow-y: auto; padding: 2px; }
.mech {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 2px 6px;
  border-radius: var(--w-r-sm);
  color: var(--w-dim);
  font-size: var(--w-fs-sm);
  text-align: left;
}
.mech:hover { color: var(--w-fg); background: var(--w-line-soft); }
.mech[aria-pressed="true"] { color: var(--w-fg); background: var(--w-panel-2); }
.icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  border-radius: 50%;
  overflow: hidden;
  background: var(--w-panel-solid-base);
}
.art { display: block; background-repeat: no-repeat; }
.mech:not([aria-pressed="true"]) .art { opacity: 0.6; }
.mech:hover .art { opacity: 1; }
.count { margin-left: auto; flex: none; color: var(--w-faint); font-size: var(--w-fs-sm); }
.warn { color: var(--w-warn, var(--w-accent)); }
</style>
