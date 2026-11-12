<template>
  <template v-if="!blocked">
    <PinFrame v-for="s in shown" :key="s.pin.id" :pin="s.pin" :index="s.index">
      <DockPin v-if="s.dock" :host="s.dock.host" :extras="s.dock.extras" />
      <PobPin v-else-if="isPobPin(s.pin)" :pin="s.pin" />
    </PinFrame>
  </template>
</template>

<script setup lang="ts">
// Everything you pinned, on screen whether the overlay is open or not.
import { computed, inject, nextTick, onUnmounted, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { dockConfig, dockEntries, isDismissed } from '../dock/dock'
import type { DockEntry } from '../dock/dock'
import { hoverZonesMoved } from '../shared/hover'
import { pins, place } from './pins'
import type { Pin } from './pins'
import PinFrame from './PinFrame.vue'
import DockPin from './DockPin.vue'
import PobPin from './PobPin.vue'

const wm = inject<WidgetManager>('wm')!

// Nothing over the settings window or another exclusive window, like the dock.
const blocked = computed(() => wm.widgets.value.some(w => w.wmZorder === 'exclusive' && w.wmWants === 'show'))

function isPobPin (p: Pin) {
  return p.kind.startsWith('pob-')
}

// A pinned card shows while its icon could: its module is on and has
// something to show here. It comes back on its own when the icon does.
function dockGroup (id: string): { host: DockEntry, extras: DockEntry[] } | null {
  const hidden = dockConfig().hidden
  const live = dockEntries.value.filter(e => e.props.show && !hidden.includes(e.props.id) && !isDismissed(e.props.id))
  const host = live.find(e => e.props.id === id)
  if (!host) return null
  return { host, extras: live.filter(e => e !== host && e.props.into === id) }
}

interface Shown { pin: Pin, index: number, dock: { host: DockEntry, extras: DockEntry[] } | null }
const shown = computed(() => pins.value.flatMap((pin, index): Shown[] => {
  if (pin.kind === 'dock') {
    const dock = dockGroup(pin.data.id ?? '')
    return dock ? [{ pin, index, dock }] : []
  }
  return [{ pin, index, dock: null }]
}))
// Pins move without changing size: tell main where their mouse zones went.
watch([() => shown.value.length, place], () => { nextTick(hoverZonesMoved).catch(() => {}) })
window.addEventListener('resize', hoverZonesMoved)
onUnmounted(() => { window.removeEventListener('resize', hoverZonesMoved) })
</script>
