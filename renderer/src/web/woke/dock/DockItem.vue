<script setup lang="ts">
// Adds an icon to the dock. Renders nothing where it's placed: the dock draws
// the icon, and the `card` slot when the mouse rests on it. The slot keeps
// using this widget's state, so a widget can stay hidden while its icon shows.
//
//   <DockItem id="farming" icon="fas fa-coins" title="Farming" :show="inMap" :badge="perHour">
//     <template #card>…</template>
//   </DockItem>
import { computed, inject, onUnmounted, useSlots, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { PEEK_MS, dockConfig, isDismissed, peeksOn, registerDockEntry, unregisterDockEntry, wakeIcon } from './dock'
import type { DockLed, DockMenuAction, DockTone } from './dock'

const props = withDefaults(defineProps<{
  id: string
  // Left out: the module's own icon (modules.ts), the same as everywhere else.
  icon?: string
  art?: string | null
  title: string
  show: boolean
  badge?: string | number | null
  tone?: DockTone
  led?: DockLed | null
  into?: string
  wmId?: number
  gameClick?: () => void
  cardWidth?: string
  progress?: number | null
  pinnable?: boolean
  readouts?: Array<{ id: string, text: string, tone: 'up' | 'down' | 'dim' | null }>
  menu?: DockMenuAction[]
  wake?: number
}>(), {
  icon: undefined,
  art: undefined,
  badge: null,
  tone: 'accent',
  led: null,
  into: undefined,
  wmId: undefined,
  gameClick: undefined,
  cardWidth: undefined,
  progress: null,
  pinnable: false,
  readouts: undefined,
  menu: undefined,
  wake: undefined
})

const emit = defineEmits<{
  (e: 'open-change', open: boolean): void
  // The icon was clicked with the overlay open.
  (e: 'activate'): void
}>()

const wm = inject<WidgetManager>('wm', null as unknown as WidgetManager)

const entry = registerDockEntry(props, useSlots(),
  (open) => emit('open-change', open),
  () => {
    emit('activate')
    if (props.wmId == null || !wm) return
    wm.show(props.wmId)
  })
onUnmounted(() => { unregisterDockEntry(entry) })

// New since the dock started: reading the log at start-up counts offers again
// that you'd already dismissed the icon over.
const WAKE_AFTER_MS = 20_000
const mountedAt = Date.now()
watch(() => props.wake, (n, old) => {
  if (n != null && old != null && n > old && Date.now() - mountedAt > WAKE_AFTER_MS) wakeIcon(props.id)
})

// Grow into one line for a few seconds (when peeks are on for this module).
function peek (text: string, ms = PEEK_MS) {
  if (!peeksOn(props.id) || !props.show) return
  entry.peek = { text, until: Date.now() + ms }
  setTimeout(() => {
    if (entry.peek && entry.peek.until <= Date.now()) entry.peek = null
  }, ms + 50)
}

function unpeek () {
  entry.peek = null
}

// Keep the card open until asked again. It never outlives the icon, and a
// click's pin ends with the overlay.
function togglePin () {
  // No icon to hold a card open on: don't arm it for later.
  if (!props.show || dockConfig().hidden.includes(props.id) || isDismissed(props.id)) return
  entry.pinned = entry.pinned ? null : 'key'
}
watch(() => props.show && !isDismissed(props.id), (show) => { if (!show) entry.pinned = null })
watch(() => wm?.active.value, (active) => { if (!active && entry.pinned === 'click') entry.pinned = null })

const clickPinned = computed(() => entry.pinned === 'click')
const pinned = computed(() => entry.pinned != null)

defineExpose({ peek, unpeek, togglePin, clickPinned, pinned })
</script>

<template>
  <!-- Nothing here: the dock draws this icon. -->
</template>
