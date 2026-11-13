<template>
  <canvas v-show="shown" ref="canvas" :class="$style.layer" data-tree-overlay aria-hidden="true" />
  <div v-if="shown && left != null" :class="$style.count">{{ left ? `${left} to take` : 'Tree done' }}</div>
</template>

<script setup lang="ts">
// The active PoB build drawn over the game's own passive tree, from a hotkey.
// Drawn over the game, so it never takes a click. Only what's still to take
// shows; lit (allocated) lines in game are left alone.
import { computed, inject, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { MainProcess } from '@/web/background/IPC'
import { hostRequest } from '../shared/host'
import { useZone } from '../shared/zone'
import { panelsHidden } from '../shared/hide-all'
import { toast } from '../ui'
import { useActiveBuild } from './active'
import { loadoutOf } from './build-model'
import { loadPassiveTree, passiveTreeArt, NODE_RADIUS } from './passive-tree'
import type { TreeNode } from './passive-tree'
import { buildPath, fitPoints, probesOf, takenNodes } from './tree-overlay'
import { markTreeOverlaySeen, registerTreeDrawer, treeOn, treeOverlaySeen } from './tree-toggle'
import type { BuildPath } from './tree-overlay'
import { isTreeHotkeyTarget, treeHotkeyOf } from './widget'

interface Fit { zoom: number, ox: number, oy: number }
type FitReply =
  | { ok: true, fit: Fit, lit: boolean[], width: number, height: number }
  | { ok: false, reason: string }

const canvas = shallowRef<HTMLCanvasElement>()
// Shared, so the dock card and menu show whether it's drawn.
const on = treeOn
const shown = shallowRef(false)
const left = shallowRef<number | null>(null)

let all: Map<number, TreeNode> | null = null
let sentPoints: Map<number, TreeNode> | null = null
let path: BuildPath | null = null
let probes: number[][] = []
let taken = new Set<number>()
// Screen pixels of the game window, as the fit gives them.
let view: Fit & { width: number, height: number } | null = null
let busy = false
// Something changed while a fit was running: fit once more after it.
let again = false

const active = useActiveBuild()

// quiet: no note when the tree isn't open (the dock icon then opens the
// window instead). Whether it drew.
async function start (quiet = false): Promise<boolean> {
  const d = active.details.value
  if (!d) { note('Pick an active build in PoB builds first.'); return false }
  const tree = loadoutOf(d, active.level.value, active.act.value, active.loadout.value).tree
  if (!tree?.nodes?.length) { if (!quiet) note('The active build has no passive tree.'); return false }
  try {
    all = await loadPassiveTree()
  } catch (err) {
    if (!quiet) note((err as Error).message)
    return false
  }
  const art = passiveTreeArt()
  if (!art) return false
  if (sentPoints !== all) {
    await hostRequest('tree-overlay-points', fitPoints(all))
    sentPoints = all
  }
  path = buildPath(all, tree.nodes, art)
  probes = probesOf(path, all)
  on.value = true
  // A quiet start (the dock icon while playing) mostly finds no tree: it
  // reads the screen as it is rather than blinking the whole overlay.
  const ok = await refit(true, !quiet)
  if (ok) markTreeOverlaySeen()
  if (!ok) {
    on.value = false
    if (!quiet) note('Open the passive tree first (no tree found on screen).')
  }
  return ok
}

function stop () {
  if (!on.value) return
  on.value = false
  shown.value = false
  left.value = null
  view = null
  hostRequest('tree-overlay-stop', null).catch(() => {})
}

// Off the screen first, so the capture only sees the game.
async function refit (fresh = false, hideOverlay = fresh): Promise<boolean> {
  if (!path) return true
  if (busy) { again = true; return true }
  busy = true
  again = false
  // A first read hides the whole overlay for a moment: a pinned card, a pin
  // or a toast over the tree would hide it from the capture.
  const hideAll = fresh && hideOverlay
  try {
    shown.value = false
    if (hideAll) document.body.style.visibility = 'hidden'
    await nextTick()
    await frames(2)
    const res = await (hostRequest('tree-overlay-fit', { probes, fresh }) as Promise<FitReply>)
    if (hideAll) document.body.style.visibility = ''
    if (!on.value) return true
    if (!res.ok) {
      // The tree closed (or something covers it): nothing to draw any more.
      if (!fresh) stop()
      return false
    }
    view = { ...res.fit, width: res.width, height: res.height }
    taken = takenNodes(path, res.lit)
    left.value = path.nodes.filter(n => !taken.has(n.id)).length
    shown.value = true
    draw()
    return true
  } catch (err) {
    note((err as Error).message)
    stop()
    return false
  } finally {
    if (hideAll) document.body.style.visibility = ''
    busy = false
    if (again && on.value) refit().catch(() => {})
  }
}

function draw () {
  const el = canvas.value
  if (!el || !view || !path || !all) return
  const W = Math.round(window.innerWidth * devicePixelRatio)
  const H = Math.round(window.innerHeight * devicePixelRatio)
  if (el.width !== W || el.height !== H) { el.width = W; el.height = H }
  const ctx = el.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  // Game pixels to canvas pixels: the overlay covers the game window.
  const k = W / view.width
  const z = view.zoom * k
  const X = (x: number) => x * z + view!.ox * k
  const Y = (y: number) => y * z + view!.oy * k
  const width = Math.max(2.5, 11 * z)

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(70, 215, 255, 0.9)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'
  ctx.shadowBlur = 4
  ctx.lineWidth = width
  ctx.beginPath()
  for (const l of path.lines) {
    if (taken.has(l.a) && taken.has(l.b)) continue
    const a = all.get(l.a)!
    const b = all.get(l.b)!
    ctx.moveTo(X(a.x), Y(a.y))
    if (l.arc) ctx.arc(X(l.arc.cx), Y(l.arc.cy), l.arc.r * z, l.arc.from, l.arc.to, l.arc.ccw)
    else ctx.lineTo(X(b.x), Y(b.y))
  }
  ctx.stroke()

  ctx.lineWidth = Math.max(2, 8 * z)
  for (const n of path.nodes) {
    if (taken.has(n.id)) continue
    const r = (NODE_RADIUS[n.kind] ?? 40) * 1.2 * z + 3
    ctx.strokeStyle = n.kind === 'notable' || n.kind === 'key' || n.kind === 'jewel' ? 'rgba(255, 220, 90, 0.95)' : 'rgba(70, 215, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(X(n.x), Y(n.y), r, 0, 2 * Math.PI)
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

const hotkey = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  if (!isTreeHotkeyTarget(e.target)) return
  if (on.value) stop()
  else start().catch(() => {})
})

const unregister = registerTreeDrawer({
  isOn: () => on.value,
  start,
  stop
})
// A one-time tip the first time you open the game's tree (P) with a build in
// use: how to draw it. Gone for good once shown, or once you've drawn it
// (treeOverlaySeen, which also clears the card's New and the panel tip).
// Only the default P: the game lets you rebind it, and then the card and
// panel are where you find it.
const TIP_KEY = 'woke-tree-overlay-tip'
const tipShown = shallowRef(readTip())
function readTip () { try { return localStorage.getItem(TIP_KEY) === '1' } catch { return true } }
const tipWanted = computed(() => !tipShown.value && !treeOverlaySeen.value && Boolean(active.details.value))
watch(tipWanted, (want) => { hostRequest('tree-overlay-tip', want).catch(() => {}) }, { immediate: true })
function showTip () {
  if (!tipWanted.value || on.value) return
  tipShown.value = true
  try { localStorage.setItem(TIP_KEY, '1') } catch {}
  const w = active.pobWidget.value
  const key = w ? treeHotkeyOf(w) : null
  toast(key
    ? `Tip: press ${key} to draw your build on the passive tree. Clicking the build's dock icon does it too.`
    : 'Tip: click the build\'s dock icon to draw your build on the passive tree.', { ms: 8000 })
}

const events = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic !== 'tree-overlay') return
  const e = data as { kind: 'move', dx: number, dy: number } | { kind: 'settle' } | { kind: 'hide' } | { kind: 'tree-key' }
  if (e.kind === 'tree-key') { showTip(); return }
  if (!on.value) return
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
// Opening the overlay brings panels up over the tree.
const wm = inject<WidgetManager>('wm')!
watch(() => wm.active.value, (a) => { if (a) stop() })
watch(panelsHidden, (h) => { if (h) stop() })

let onResize: (() => void) | undefined
onMounted(() => {
  onResize = () => { if (shown.value) draw() }
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  hotkey.abort()
  unregister()
  events.abort()
  if (onResize) window.removeEventListener('resize', onResize)
  stop()
})
</script>

<style module>
.layer { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 40; }
.count {
  position: fixed;
  left: 50%;
  /* Below the Skills header's buttons. */
  top: calc(100vh * 305 / 1440);
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
