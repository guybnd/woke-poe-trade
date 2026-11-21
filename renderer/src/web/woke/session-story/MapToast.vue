<template>
  <Teleport to="body">
    <!-- Centred by the outer box, so the opening motion (which sets transform) can't move it. -->
    <div v-if="chip" :class="$style.place" :style="placeStyle">
    <!-- The hover zone. While you resize it grows a wide margin, so dragging out
         past the old edge doesn't hand the mouse back to the game mid-drag. -->
    <div ref="el" :class="[$style.zone, resizing && $style.resizing]" data-map-toast-zone>
    <div :class="[$style.toast, 'w-enter']" :style="{ '--toast-scale': String(scale) }" data-map-toast role="status"
      @pointerdown="onPointerDown" @click="onDomClick">
      <!-- The title bar is its handle: drag it to move the toast (the spot is kept). -->
      <div :class="$style.title" data-map-toast-handle title="Drag to move" @pointerdown="startMove">
        <span :class="$style.titleName">{{ chip.rec.name }}</span><small>{{ tierText(chip.rec.areaLevel) }}</small>
      </div>
      <div :class="$style.row">
        <div :class="$style.lead">
          <div :class="$style.time" class="w-num" data-map-toast-time>{{ formatClock(chip.rec.mapMs) }}</div>
          <div v-if="headDiff != null" :class="$style.delta" class="w-num">
            <span :class="tone(headDiff)">{{ signed(headDiff) }}</span> <span :class="$style.label">{{ headLabel }}</span>
          </div>
        </div>
        <div v-if="chip.cmp.runs.length > 1" :class="$style.bars">
          <i v-for="(ms, i) in chip.cmp.runs" :key="i" :class="{ [$style.now]: i === chip.cmp.runs.length - 1 }"
            :style="{ height: `${Math.max(8, ms / barTop * 100)}%` }" />
          <span v-if="chip.cmp.hourAvg != null" :class="$style.avg" :style="{ bottom: `${chip.cmp.hourAvg / barTop * 100}%` }" />
        </div>
        <div :class="$style.props" class="w-num">
          <div v-if="chip.cmp.hourAvg != null"><span :class="$style.label">1h avg ({{ chip.cmp.hourRuns }})</span><span>{{ formatClock(chip.cmp.hourAvg) }}</span></div>
          <div v-else-if="chip.cmp.usual != null"><span :class="$style.label">Usual</span><span>{{ formatClock(chip.cmp.usual) }}</span></div>
          <div v-if="chip.cmp.prev">
            <span :class="$style.label" :title="chip.cmp.prev.name !== chip.rec.name ? chip.cmp.prev.name : undefined">Last</span>
            <span>{{ formatClock(chip.cmp.prev.mapMs) }} <span :class="tone(chip.rec.mapMs - chip.cmp.prev.mapMs)">{{ signed(chip.rec.mapMs - chip.cmp.prev.mapMs) }}</span></span>
          </div>
          <div v-if="chip.cmp.runs.length > 1"><span :class="$style.label">Best</span><span>{{ formatClock(chip.cmp.best) }}</span></div>
        </div>
      </div>
      <div :class="$style.rule" />
      <div :class="$style.foot">
        <span :class="$style.chips">
          <span v-for="t in tags" :key="t.text" :class="[$style.chip, t.tone && $style[t.tone]]">{{ t.text }}</span>
        </span>
        <span :class="$style.close" data-map-toast-close>
          <template v-if="closeKey"><WKbd :keys="closeKey" /> Dismiss</template>
          <template v-else>Click to dismiss</template>
        </span>
      </div>
      <span :class="$style.grip" data-map-toast-grip title="Drag to resize" @pointerdown="startResize" @click.stop />
    </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// The line about a map you just left, in the middle of the screen, drawn as a
// small game window (carved title bar, bronze edge, stone): the time big, then against the hour and the run before,
// then what happened. It takes the mouse only once the pointer rests on it, so
// a click-to-move across it still reaches the game; a click on it closes it,
// and its corner resizes it.
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { formatClock } from '../ui/format'
import WKbd from '../ui/WKbd.vue'
import { hoverZonesMoved, useHoverZone } from '../shared/hover'
import { tierText } from './map-log'
import type { MapRecord } from './map-log'
import { clampScale } from './chip'
import type { MapCompare } from './chip'

const props = defineProps<{
  chip: { rec: MapRecord, cmp: MapCompare } | null
  // The close hotkey, shown on it; null when none is set.
  closeKey: string | null
  // Its saved size, 1 = as designed.
  scale: number
  // Where it sits: its top centre as a share of the screen; null: as designed.
  pos?: { x: number, y: number } | null
}>()
const emit = defineEmits<{
  close: []
  // The pointer is on it (its timer waits) or left it.
  hold: [on: boolean]
  // Resizing: the new size; `done` when the drag ends (save then).
  resize: [scale: number, done: boolean]
  // Dragged by its title bar: the new spot; `done` when the drag ends (save then).
  move: [pos: { x: number, y: number }, done: boolean]
}>()
const placeStyle = computed(() => props.pos
  ? { top: `${props.pos.y * 100}%`, left: `${props.pos.x * 100}%`, right: 'auto', transform: 'translateX(-50%)' }
  : undefined)

const el = shallowRef<HTMLElement | null>(null)
const resizing = shallowRef(false)
// Takes the mouse only after it rests here this long: a sweep across the
// middle of the screen (moving, aiming a skill) stays with the game.
const REST_MS = 250
const armed = shallowRef(false)
let armTimer: ReturnType<typeof setTimeout> | undefined
// It came up under a cursor that was already there (you stood still in the
// hideout): it doesn't arm or wait until the pointer leaves and comes back, or
// the next click on the stash under it would close it instead.
const UNDER_CURSOR_MS = 400
let shownAt = 0
let cameUnder = false
// When the page itself saw the left button go down on it (the overlay had the
// mouse), so main's report of the same press isn't acted on twice.
let domDownAt = 0

const inside = useHoverZone(el, {
  enabled: () => !!props.chip,
  activate: () => armed.value || resizing.value,
  // A press the overlay took is left to the page, which knows if it hit the
  // corner. One the game got too closes it, unless the page saw it as well
  // (the overlay was open): the short wait lets the page's own event land.
  onClick: (taken) => {
    if (taken) return
    setTimeout(() => {
      if (Date.now() - domDownAt > 500 && props.chip) emit('close')
    }, 60)
  }
})

watch(inside, (on) => {
  clearTimeout(armTimer)
  if (on && Date.now() - shownAt < UNDER_CURSOR_MS) cameUnder = true
  if (!on) cameUnder = false
  const real = on && !cameUnder
  if (real) armTimer = setTimeout(() => { armed.value = true }, REST_MS)
  else armed.value = false
  emit('hold', real)
})
watch(() => props.chip, (c, old) => {
  if (c && c !== old) {
    shownAt = Date.now()
    // A new toast in place of one under the pointer starts unarmed too.
    cameUnder = inside.value
    if (cameUnder) { clearTimeout(armTimer); armed.value = false; emit('hold', false) }
  }
  if (!c) {
    armed.value = false
    // Closed mid-drag (you went into a map): keep the size it had got to.
    if (resizing.value) { endResize?.(); emit('resize', props.scale, true) }
    resizing.value = false
  }
})
// The zone grows while resizing and shrinks back after; padding isn't seen by
// the size watcher, so send the new rect once the page has drawn it.
watch(resizing, () => { hoverZonesMoved() })
// Moved: main needs its new rect, or the pointer leaves the old one mid-drag.
watch(() => props.pos, () => { hoverZonesMoved() })
onUnmounted(() => { clearTimeout(armTimer); endResize?.() })

function onPointerDown (e: PointerEvent) {
  if (e.button === 0) domDownAt = Date.now()
}
function onDomClick (e: MouseEvent) {
  if (resizing.value || (e.target as HTMLElement).closest('[data-map-toast-grip]')) return
  emit('close')
}

let endResize: (() => void) | null = null
// Grows from the top centre, so both sides move: a sideways drag counts twice.
function startResize (e: PointerEvent) {
  e.preventDefault()
  e.stopPropagation()
  domDownAt = Date.now()
  const grip = e.currentTarget as HTMLElement
  const box = grip.parentElement!.getBoundingClientRect()
  const x0 = e.clientX
  const y0 = e.clientY
  const s0 = props.scale
  let s = s0
  resizing.value = true
  try { grip.setPointerCapture(e.pointerId) } catch {}
  const move = (ev: PointerEvent) => {
    const byW = (box.width + (ev.clientX - x0) * 2) / box.width
    const byH = (box.height + (ev.clientY - y0)) / box.height
    s = clampScale(s0 * Math.max(byW, byH))
    emit('resize', s, false)
  }
  const detach = () => {
    grip.removeEventListener('pointermove', move)
    grip.removeEventListener('pointerup', up)
    grip.removeEventListener('pointercancel', up)
    grip.removeEventListener('lostpointercapture', up)
    window.removeEventListener('pointerup', up)
    endResize = null
  }
  // pointerup, or the capture lost when the game took the mouse back.
  function up () {
    if (endResize !== detach) return
    detach()
    emit('resize', s, true)
    // The click that ends the drag comes after pointerup: keep it from closing.
    setTimeout(() => { resizing.value = false }, 0)
  }
  endResize = detach
  grip.addEventListener('pointermove', move)
  grip.addEventListener('pointerup', up)
  grip.addEventListener('pointercancel', up)
  grip.addEventListener('lostpointercapture', up)
  window.addEventListener('pointerup', up)
}

// The same as a resize for the zone (it grows, a click at the end doesn't close it).
function startMove (e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  domDownAt = Date.now()
  const handle = e.currentTarget as HTMLElement
  const box = handle.parentElement!.getBoundingClientRect()
  const dx = e.clientX - (box.left + box.width / 2)
  const dy = e.clientY - box.top
  const at = (ev: PointerEvent) => ({
    x: Math.min(1, Math.max(0, (ev.clientX - dx) / window.innerWidth)),
    y: Math.max(0, Math.min(1 - box.height / window.innerHeight, (ev.clientY - dy) / window.innerHeight))
  })
  const x0 = e.clientX
  const y0 = e.clientY
  let last: { x: number, y: number } | null = null
  resizing.value = true
  try { handle.setPointerCapture(e.pointerId) } catch {}
  // A press that barely moves is a click (it closes the toast, like anywhere else on it).
  const move = (ev: PointerEvent) => {
    if (!last && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return
    last = at(ev)
    emit('move', last, false)
  }
  const detach = () => {
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', up)
    handle.removeEventListener('pointercancel', up)
    handle.removeEventListener('lostpointercapture', up)
    window.removeEventListener('pointerup', up)
    endResize = null
  }
  function up () {
    if (endResize !== detach) return
    detach()
    if (!last) { resizing.value = false; return }
    emit('move', last, true)
    setTimeout(() => { resizing.value = false }, 0)
  }
  endResize = detach
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', up)
  handle.addEventListener('pointercancel', up)
  handle.addEventListener('lostpointercapture', up)
  window.addEventListener('pointerup', up)
}

const headDiff = computed(() => {
  const c = props.chip
  if (!c) return null
  const base = c.cmp.hourAvg ?? c.cmp.usual
  return base != null ? c.rec.mapMs - base : null
})
const headLabel = computed(() => props.chip?.cmp.hourAvg != null ? 'vs 1h avg' : 'vs usual')
const barTop = computed(() => Math.max(1, ...(props.chip?.cmp.runs ?? [1]), props.chip?.cmp.hourAvg ?? 0) * 1.05)

const tags = computed(() => {
  const r = props.chip?.rec
  if (!r) return []
  const out: Array<{ text: string, tone?: 'bad' }> = []
  if (r.deaths) out.push({ text: `${r.deaths} ${r.deaths === 1 ? 'death' : 'deaths'}`, tone: 'bad' })
  for (const n of r.npcs) out.push({ text: n })
  if (r.levelsGained && r.charLevel != null) out.push({ text: `Level ${r.charLevel + r.levelsGained}` })
  return out
})

function signed (diff: number): string {
  if (Math.abs(diff) < 1000) return '±0:00'
  return `${diff < 0 ? '−' : '+'}${formatClock(Math.abs(diff))}`
}
function tone (diff: number): string {
  return Math.abs(diff) < 1000 ? 'w-dim' : diff < 0 ? 'w-up' : 'w-down'
}
</script>

<style module>
.place {
  position: fixed; z-index: 1002; left: 0; right: 0; top: 30%;
  display: flex; justify-content: center; pointer-events: none;
}
.zone { pointer-events: auto; }
.resizing { padding: 400px; margin: -400px; }
/* A small game window: the carved stone title bar, the thin bronze edge, the
   stone floor. Game art, the same pieces as the game look's panels (poe-frame.css). */
.toast {
  position: relative; width: 380px; cursor: pointer; user-select: none;
  border: 10px solid transparent; border-image: url(/images/poe-ui/frame-thin.png) 11 / 10px round;
  background: url(/images/poe-ui/stone.png) center / cover, #221c15;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7), inset 0 0 22px 6px rgba(0, 0, 0, 0.6);
  color: #e8dcc4; font-family: Fontin, FrizQuadrataC, Georgia, serif; font-size: calc(14px * var(--w-text-scale, 1)); line-height: calc(20px * var(--w-text-scale, 1));
  zoom: calc(var(--w-ui-scale, 1) * var(--toast-scale, 1));
}
.title {
  height: 40px; margin: -10px -10px 0; padding: 0 76px; display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: calc(18px * var(--w-text-scale, 1)); color: #e7d3a8; text-shadow: 0 1px 2px #000; white-space: nowrap;
  background:
    url(/images/poe-ui/titlebar-left.png) left center / auto 100% no-repeat,
    url(/images/poe-ui/titlebar-right.png) right center / auto 100% no-repeat,
    url(/images/poe-ui/titlebar-middle.png) center / auto 100% repeat-x;
}
.title { cursor: move; }
.titleName { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.title small { flex: none; font-size: calc(13px * var(--w-text-scale, 1)); color: #a89670; }
.row { display: flex; align-items: center; gap: 14px; padding: 10px 6px 4px; }
.lead { flex: none; }
.time { font-family: Fontin, FrizQuadrataC, Georgia, serif; font-size: calc(44px * var(--w-text-scale, 1)); line-height: 1; color: #e3c27d; text-shadow: 0 2px 4px #000; }
.delta { font-size: calc(13px * var(--w-text-scale, 1)); margin-top: 2px; white-space: nowrap; }
.label { color: #a2927a; }
.bars { position: relative; display: flex; align-items: flex-end; gap: 3px; height: 40px; flex: none; }
.bars i { display: block; width: 9px; background: #5a4c3a; }
.bars i.now { background: #e3c27d; }
.avg { position: absolute; left: -3px; right: -3px; border-top: 1px dashed rgba(227, 194, 125, 0.7); }
.props { flex: 1; min-width: 0; }
.props > div { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; }
.props > div > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.rule { height: 1px; margin: 6px 24px 7px; background: linear-gradient(90deg, transparent, #8a7149, transparent); }
.foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 0 14px 2px 6px; font-size: calc(13px * var(--w-text-scale, 1)); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.chip { border: 1px solid #5c4d39; padding: 0 6px; color: #cdbb98; background: rgba(0, 0, 0, 0.3); }
.bad { color: var(--w-down, #e0675a); border-color: #6e3a32; }
.close { flex: none; margin-left: auto; color: #8f8270; display: flex; gap: 5px; align-items: center; }
.grip {
  position: absolute; right: 1px; bottom: 1px; width: 14px; height: 14px; cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 0 55%, rgba(227, 194, 125, 0.55) 55% 62%, transparent 62% 72%, rgba(227, 194, 125, 0.55) 72% 79%, transparent 79%);
}
</style>
