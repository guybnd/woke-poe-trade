<template>
  <canvas v-show="shown" ref="canvas" :class="$style.layer" data-atlas-overlay aria-hidden="true" />
  <div v-if="shown && left != null" :class="$style.count" data-atlas-overlay-count>
    {{ left ? `${left} to take` : 'Strategy done' }}<span v-if="refundLeft" :class="$style.refund"> · {{ refundLeft }} to refund</span> · {{ title }}
  </div>
</template>

<script setup lang="ts">
// The selected atlas strategy drawn over the game's own atlas tree, from the
// tree hotkey (TreeOverlay.vue hands over when the atlas tree is open). The
// same reading and drawing as the passive tree's build: what's still to take,
// and points taken in game off the strategy marked to refund.
import { inject, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig } from '@/web/Config'
import { MainProcess } from '@/web/background/IPC'
import { hostRequest } from '../shared/host'
import { useZone } from '../shared/zone'
import { panelsHidden } from '../shared/hide-all'
import { toast } from '../ui'
import { NODE_RADIUS } from '../pob-builds/passive-tree'
import type { TreeNode } from '../pob-builds/passive-tree'
import type { BuildLine, BuildPath } from '../pob-builds/tree-overlay'
import type { AtlasTreeModel } from './atlas-tree'
import { decodeTree } from './tree'
import { ATLAS_TYPE, useAtlasData, workingTree } from './widget'
import type { AtlasStrategy, AtlasWidget } from './widget'
import { atlasOn, registerAtlasDrawer } from './atlas-overlay-toggle'

interface Fit { zoom: number, ox: number, oy: number }
type FitReply =
  | { ok: true, fit: Fit, lit: boolean[], extraLit?: boolean[], width: number, height: number }
  | { ok: false, reason: string }

const canvas = shallowRef<HTMLCanvasElement>()
const on = atlasOn
const shown = shallowRef(false)
const left = shallowRef<number | null>(null)
const refundLeft = shallowRef(0)
const title = shallowRef('')

let lib: typeof import('../pob-builds/tree-overlay') | null = null
let model: AtlasTreeModel | null = null
let sentPoints: AtlasTreeModel | null = null
let path: BuildPath | null = null
let probes: number[][] = []
let offLines: BuildLine[] = []
let offProbes: number[][] = []
let offSent = false
let keep = new Set<number>()
let taken = new Set<number>()
let refund = new Set<number>()
let refundLit: BuildLine[] = []
let view: Fit & { width: number, height: number } | null = null
let busy = false
let again = false

function atlasWidget (): AtlasWidget | undefined {
  return AppConfig().widgets.find(w => w.wmType === ATLAS_TYPE) as AtlasWidget | undefined
}

// The strategy picked in Atlas strategies, with its link (unsaved edits too).
function selected (): { w: AtlasWidget, s: AtlasStrategy, url: string } | null {
  const w = atlasWidget()
  const s = w?.strategies.find(s => s.id === w.selectedId)
  if (!w || !s) return null
  const url = workingTree(w, s).trim()
  return url ? { w, s, url } : null
}

// The atlas tree data, loaded the way the Atlas window loads it.
async function loadModel (dataUrl: string): Promise<AtlasTreeModel> {
  const { atlasTree, atlasTreeError, atlasDataError } = useAtlasData(dataUrl)
  if (atlasTree.value) return atlasTree.value
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stopWatch(); reject(new Error('The atlas tree data is still loading. Try again in a moment.')) }, 20_000)
    const stopWatch = watch([atlasTree, atlasTreeError, atlasDataError], ([tree, treeErr, dataErr]) => {
      if (!tree && !treeErr && !dataErr) return
      clearTimeout(timer)
      queueMicrotask(() => stopWatch())
      if (tree) resolve(tree)
      else reject(new Error(treeErr || dataErr))
    }, { immediate: true })
  })
}

async function start (quiet = false): Promise<boolean> {
  const sel = selected()
  if (!sel) { if (!quiet) note('Pick a strategy with an atlas tree in Atlas strategies first.'); return false }
  let ids: number[]
  try {
    lib ??= await import('../pob-builds/tree-overlay')
    model = await loadModel(sel.w.dataUrl ?? '')
    ids = decodeTree(sel.url).nodes.filter(id => model!.nodes.has(id) && id !== model!.start)
  } catch (err) {
    if (!quiet) note((err as Error).message)
    return false
  }
  if (!ids.length) { if (!quiet) note('The selected strategy has no atlas passives.'); return false }
  if (sentPoints !== model) {
    await hostRequest('atlas-overlay-points', lib.fitPoints(model.nodes))
    sentPoints = model
  }
  // The start is always taken: the plan's first lines leave from it.
  const withStart = [model.start, ...ids]
  path = lib.buildPath(model.nodes, withStart, model.art)
  probes = lib.probesOf(path, model.nodes)
  offLines = lib.offBuildLines(model.nodes, withStart, model.art)
  offProbes = lib.lineProbes(offLines, model.nodes)
  offSent = false
  keep = new Set(withStart)
  title.value = sel.s.name || 'Untitled'
  on.value = true
  const ok = await refit(true)
  if (!ok) {
    on.value = false
    if (!quiet) note('Open the atlas tree first (no tree found on screen).')
  }
  return ok
}

function stop () {
  if (!on.value) return
  on.value = false
  shown.value = false
  left.value = null
  refundLeft.value = 0
  refund = new Set()
  refundLit = []
  view = null
  hostRequest('atlas-overlay-stop', null).catch(() => {})
}

// Off the screen first, so the capture only sees the game. A first read
// hides the whole overlay for a moment: a pin over the tree would hide it.
async function refit (fresh = false): Promise<boolean> {
  if (!path || !model || !lib) return true
  if (busy) { again = true; return true }
  busy = true
  again = false
  try {
    shown.value = false
    if (fresh) document.body.style.visibility = 'hidden'
    await frames(2)
    const asked = path
    const extra = offSent ? undefined : offProbes
    const res = await (hostRequest('atlas-overlay-fit', { probes, extra, fresh }) as Promise<FitReply>)
    if (fresh) document.body.style.visibility = ''
    if (!on.value || path !== asked) return true
    if (!res.ok) {
      if (!fresh) stop()
      return false
    }
    view = { ...res.fit, width: res.width, height: res.height }
    taken = lib.takenNodes(path, res.lit)
    taken.add(model.start)
    offSent = true
    let extraLit = res.extraLit ?? []
    if (extraLit.length !== offLines.length) { offSent = false; extraLit = [] }
    // A plan node reached by another lit line is taken all the same.
    offLines.forEach((l, i) => {
      if (!extraLit[i]) return
      if (keep.has(l.a)) taken.add(l.a)
      if (keep.has(l.b)) taken.add(l.b)
    })
    left.value = path.nodes.filter(n => !taken.has(n.id)).length
    refund = offLines.length ? lib.refundNodes(offLines, extraLit, taken, keep) : new Set()
    refundLit = offLines.filter((l, i) => extraLit[i] && (refund.has(l.a) || refund.has(l.b)))
    refundLeft.value = refund.size
    shown.value = true
    draw()
    return true
  } catch (err) {
    note((err as Error).message)
    stop()
    return false
  } finally {
    if (fresh) document.body.style.visibility = ''
    busy = false
    if (again && on.value) refit().catch(() => {})
  }
}

const REFUND = 'rgba(235, 64, 52, 0.95)'

function draw () {
  const el = canvas.value
  if (!el || !view || !path || !model) return
  const nodes = model.nodes
  const W = Math.round(window.innerWidth * devicePixelRatio)
  const H = Math.round(window.innerHeight * devicePixelRatio)
  if (el.width !== W || el.height !== H) { el.width = W; el.height = H }
  const ctx = el.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const k = W / view.width
  const z = view.zoom * k
  const X = (x: number) => x * z + view!.ox * k
  const Y = (y: number) => y * z + view!.oy * k
  const width = Math.max(2.5, 11 * z)
  const trace = (l: BuildLine) => {
    const a = nodes.get(l.a)!
    const b = nodes.get(l.b)!
    ctx.moveTo(X(a.x), Y(a.y))
    if (l.arc) ctx.arc(X(l.arc.cx), Y(l.arc.cy), l.arc.r * z, l.arc.from, l.arc.to, l.arc.ccw)
    else ctx.lineTo(X(b.x), Y(b.y))
  }
  const radius = (n: TreeNode) => (NODE_RADIUS[n.kind] ?? 40) * 1.2 * z + 3

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(70, 215, 255, 0.9)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = 4
  ctx.lineWidth = width
  ctx.beginPath()
  for (const l of path.lines) if (!(taken.has(l.a) && taken.has(l.b))) trace(l)
  ctx.stroke()

  ctx.lineWidth = Math.max(2, 8 * z)
  for (const n of path.nodes) {
    if (taken.has(n.id)) continue
    const big = n.kind === 'notable' || n.kind === 'key'
    ctx.strokeStyle = big ? 'rgba(255, 220, 90, 0.95)' : 'rgba(70, 215, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(X(n.x), Y(n.y), radius(n), 0, 2 * Math.PI)
    ctx.stroke()
  }

  if (!refund.size) return
  ctx.strokeStyle = REFUND
  ctx.lineWidth = width
  ctx.beginPath()
  for (const l of refundLit) trace(l)
  ctx.stroke()
  ctx.lineWidth = Math.max(2, 8 * z)
  for (const id of refund) {
    const n = nodes.get(id)
    if (!n) continue
    const r = radius(n)
    const x = X(n.x)
    const y = Y(n.y)
    const d = r * 0.5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.moveTo(x - d, y - d)
    ctx.lineTo(x + d, y + d)
    ctx.moveTo(x + d, y - d)
    ctx.lineTo(x - d, y + d)
    ctx.stroke()
  }
}

function frames (n: number) {
  return new Promise<void>(resolve => {
    const step = () => { if (--n <= 0) resolve(); else requestAnimationFrame(step) }
    requestAnimationFrame(step)
  })
}

function note (text: string) {
  toast(text, { ms: 3000 })
}

const unregister = registerAtlasDrawer({
  isOn: () => on.value,
  ready: () => selected() != null,
  start,
  stop
})

const events = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic !== 'atlas-overlay' || !on.value) return
  const e = data as { kind: 'move', dx: number, dy: number } | { kind: 'settle' } | { kind: 'hide' }
  if (e.kind === 'move') {
    if (view && !busy) { view.ox += e.dx; view.oy += e.dy; draw() }
  } else if (e.kind === 'hide') {
    shown.value = false
  } else {
    refit().catch(() => {})
  }
})

const zone = useZone()
watch(() => zone.name, stop)
const wm = inject<WidgetManager>('wm')!
watch(() => wm.active.value, (a) => { if (a) stop() })
watch(panelsHidden, (h) => { if (h) stop() })
// Another strategy picked, or the drawn one edited: draw that instead.
watch(() => { const s = selected(); return s ? `${s.s.id} ${s.url}` : '' }, () => {
  if (!on.value) return
  stop()
  start(true).catch(() => {})
})

let onResize: (() => void) | undefined
onMounted(() => {
  onResize = () => { if (shown.value) draw() }
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  unregister()
  events.abort()
  if (onResize) window.removeEventListener('resize', onResize)
  stop()
})
</script>

<style module>
.layer { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 40; }
.refund { color: rgb(235, 64, 52); }
.count {
  position: fixed;
  left: 50%;
  /* Below the Atlas Skills header's Apply and Cancel buttons. */
  top: calc(100vh * 250 / 1440);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 40;
  padding: 1px 8px;
  border-radius: 3px;
  background: rgba(10, 10, 8, 0.85);
  color: rgb(70, 215, 255);
  font: 700 calc(13px * var(--w-text-scale, 1)) / 1.4 var(--w-num, sans-serif);
}
</style>
