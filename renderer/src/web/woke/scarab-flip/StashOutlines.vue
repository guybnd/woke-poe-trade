<template>
  <div v-if="stashMarks.length && !panelsHidden" :class="$style.layer" data-stash-outlines aria-hidden="true">
    <div v-for="m in stashMarks" :key="m.name" :class="$style.mark" :style="{
      left: `${m.x * 100}%`,
      top: `${m.y * 100}%`,
      width: `${m.width * 100}%`,
      height: `${m.height * 100}%`,
      borderColor: m.color
    }">
      <span :class="$style.text" :style="{ color: m.color }">{{ m.text }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
// Drawn over the game, so it never takes a click and needs the overlay closed.
import { inject, onUnmounted, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { MainProcess } from '@/web/background/IPC'
import { hostRequest } from '../shared/host'
import { useZone } from '../shared/zone'
import { panelsHidden } from '../shared/hide-all'
import { clearStashMarks, stashMarks } from './stash-marks'

// A last resort, in case something moved them without a click, scroll or key.
const TIMEOUT_MS = 60 * 1000
let timer: ReturnType<typeof setTimeout> | undefined

watch(stashMarks, (marks) => {
  clearTimeout(timer)
  if (marks.length) timer = setTimeout(clearStashMarks, TIMEOUT_MS)
  else hostRequest('stash-watch-stop', null).catch(() => {})
})

const zone = useZone()
watch(() => zone.name, clearStashMarks)

// Opening the overlay brings panels up where the outlines would sit on them.
const wm = inject<WidgetManager>('wm')!
watch(() => wm.active.value, (active) => { if (active) clearStashMarks() })

const cleared = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic }) => {
  if (topic === 'stash-clear') clearStashMarks()
})

onUnmounted(() => {
  clearTimeout(timer)
  cleared.abort()
})
</script>

<style module>
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 40; }
.mark { position: absolute; box-sizing: border-box; border: 3px solid; }
.text {
  position: absolute;
  right: -3px;
  bottom: -3px;
  padding: 0 3px;
  background: rgb(10, 10, 8);
  font: 700 calc(12px * var(--w-text-scale, 1)) / 1.25 var(--w-num, sans-serif);
  white-space: nowrap;
}
</style>
