<template>
  <!-- A thin grab bar between two sections: drag it to resize them. -->
  <div :class="[$style.handle, dir === 'x' ? $style.x : $style.y, { [$style.active]: dragging }]"
    role="separator" :aria-orientation="dir === 'x' ? 'vertical' : 'horizontal'" :title="title"
    @pointerdown="down" @dblclick="emit('reset')" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue'

const props = withDefaults(defineProps<{ dir: 'x' | 'y', title?: string }>(), { title: 'Drag to resize · double-click to reset' })
// start: a drag begins; move: px since it started; end: it's over (save then).
const emit = defineEmits<{ (e: 'move', px: number): void, (e: 'start' | 'end' | 'reset'): void }>()

const dragging = shallowRef(false)
let start = 0
// A handle removed mid-drag (its column went away) still ends the drag.
let stop: (() => void) | null = null
onBeforeUnmount(() => { stop?.() })

function down (e: PointerEvent) {
  if (e.button !== 0) return
  e.preventDefault()
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  start = props.dir === 'x' ? e.clientX : e.clientY
  dragging.value = true
  emit('start')
  let done = false
  const up = () => {
    if (done) return
    done = true
    stop = null
    dragging.value = false
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
    el.removeEventListener('lostpointercapture', up)
    emit('end')
  }
  const move = (ev: PointerEvent) => {
    // The button came up without a pointerup reaching us (focus lost).
    if (!(ev.buttons & 1)) { up(); return }
    emit('move', (props.dir === 'x' ? ev.clientX : ev.clientY) - start)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  el.addEventListener('lostpointercapture', up)
  stop = up
}
</script>

<style module>
.handle { position: absolute; z-index: 3; touch-action: none; }
.x { top: 0; bottom: 0; width: 7px; margin-left: -3px; cursor: col-resize; }
.y { left: 0; right: 0; height: 7px; margin-top: -3px; cursor: row-resize; }
.handle::after { content: ''; position: absolute; background: transparent; transition: background .1s; }
.x::after { top: 0; bottom: 0; left: 3px; width: 1px; }
.y::after { left: 0; right: 0; top: 3px; height: 1px; }
.handle:hover::after, .active::after { background: var(--w-gold); }
</style>
