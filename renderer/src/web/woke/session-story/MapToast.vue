<template>
  <Teleport to="body">
    <!-- Centred by the outer box, so the opening motion (which sets transform) can't move it. -->
    <div v-if="chip" :class="$style.place">
    <!-- The hover zone. While you resize it grows a wide margin, so dragging out
         past the old edge doesn't hand the mouse back to the game mid-drag. -->
    <div ref="el" :class="[$style.zone, resizing && $style.resizing]" data-map-toast-zone>
    <div :class="[$style.toast, 'w-enter']" :style="{ '--toast-scale': String(scale) }" data-map-toast role="status"
      @click="onDomClick">
      <div :class="$style.title">
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
import { useHoverZone } from '../shared/hover'
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
}>()
const emit = defineEmits<{
  close: []
  // The pointer is on it (its timer waits) or left it.
  hold: [on: boolean]
  // Resizing: the new size; `done` when the drag ends (save then).
  resize: [scale: number, done: boolean]
}>()

const el = shallowRef<HTMLElement | null>(null)
const resizing = shallowRef(false)
// Takes the mouse only after it rests here this long: a sweep across the
// middle of the screen (moving, aiming a skill) stays with the game.
const REST_MS = 250
const armed = shallowRef(false)
let armTimer: ReturnType<typeof setTimeout> | undefined

const inside = useHoverZone(el, {
  enabled: () => !!props.chip,
  activate: () => armed.value || resizing.value,
  // A click the game also got (the mouse wasn't taken yet) still closes it. A
  // taken click is left to the page, which knows whether it hit the corner.
  onClick: (taken) => { if (!taken) emit('close') }
})

watch(inside, (on) => {
  clearTimeout(armTimer)
  if (on) armTimer = setTimeout(() => { armed.value = true }, REST_MS)
  else armed.value = false
  emit('hold', on)
})
watch(() => props.chip, (c) => { if (!c) { armed.value = false; resizing.value = false } })
onUnmounted(() => { clearTimeout(armTimer) })

function onDomClick (e: MouseEvent) {
  if (resizing.value || (e.target as HTMLElement).closest('[data-map-toast-grip]')) return
  emit('close')
}

// Grows from the top centre, so both sides move: a sideways drag counts twice.
function startResize (e: PointerEvent) {
  e.preventDefault()
  e.stopPropagation()
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
  const up = () => {
    grip.removeEventListener('pointermove', move)
    grip.removeEventListener('pointerup', up)
    grip.removeEventListener('pointercancel', up)
    emit('resize', s, true)
    // The click that ends the drag comes after pointerup: keep it from closing.
    setTimeout(() => { resizing.value = false }, 0)
  }
  grip.addEventListener('pointermove', move)
  grip.addEventListener('pointerup', up)
  grip.addEventListener('pointercancel', up)
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
  color: #e8dcc4; font-family: Fontin, FrizQuadrataC, Georgia, serif; font-size: 14px; line-height: 20px;
  zoom: calc(var(--w-ui-scale, 1) * var(--toast-scale, 1));
}
.title {
  height: 40px; margin: -10px -10px 0; padding: 0 76px; display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 18px; color: #e7d3a8; text-shadow: 0 1px 2px #000; white-space: nowrap;
  background:
    url(/images/poe-ui/titlebar-left.png) left center / auto 100% no-repeat,
    url(/images/poe-ui/titlebar-right.png) right center / auto 100% no-repeat,
    url(/images/poe-ui/titlebar-middle.png) center / auto 100% repeat-x;
}
.titleName { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.title small { flex: none; font-size: 13px; color: #a89670; }
.row { display: flex; align-items: center; gap: 14px; padding: 10px 6px 4px; }
.lead { flex: none; }
.time { font-family: Fontin, FrizQuadrataC, Georgia, serif; font-size: 44px; line-height: 1; color: #e3c27d; text-shadow: 0 2px 4px #000; }
.delta { font-size: 13px; margin-top: 2px; white-space: nowrap; }
.label { color: #a2927a; }
.bars { position: relative; display: flex; align-items: flex-end; gap: 3px; height: 40px; flex: none; }
.bars i { display: block; width: 9px; background: #5a4c3a; }
.bars i.now { background: #e3c27d; }
.avg { position: absolute; left: -3px; right: -3px; border-top: 1px dashed rgba(227, 194, 125, 0.7); }
.props { flex: 1; min-width: 0; }
.props > div { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; }
.rule { height: 12px; margin: 4px 30px; background: url(/images/poe-ui/rule-h.png) center / 100% 100% no-repeat; opacity: 0.8; }
.foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 0 6px 2px; font-size: 13px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.chip { border: 1px solid #5c4d39; padding: 0 6px; color: #cdbb98; background: rgba(0, 0, 0, 0.3); }
.bad { color: var(--w-down, #e0675a); border-color: #6e3a32; }
.close { flex: none; margin-left: auto; color: #8f8270; display: flex; gap: 5px; align-items: center; }
.grip {
  position: absolute; right: 1px; bottom: 1px; width: 14px; height: 14px; cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 0 55%, rgba(227, 194, 125, 0.55) 55% 62%, transparent 62% 72%, rgba(227, 194, 125, 0.55) 72% 79%, transparent 79%);
}
</style>
