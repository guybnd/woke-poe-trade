<template>
  <div v-if="groups.length || wm.active.value" :class="[$style.dock, { [$style.vertical]: cfg.vertical }]"
    :style="{ left: `${cfg.x}%`, top: `${cfg.y}%` }" data-w-panel>
    <!-- Always takes its space, so the icons don't move when the overlay opens. -->
    <span :class="$style.grip" :style="{ visibility: wm.active.value ? 'visible' : 'hidden' }" title="Drag to move the icon row. Double-click to stand it on its side. Right-click to bring back dismissed icons."
      @pointerdown="startDrag" @dblclick="flip" @contextmenu="gripMenu"><i class="fas fa-grip-vertical" /></span>
    <DockIcon v-for="g in groups" :key="g.host.key" :host="g.host" :extras="g.extras" :vertical="cfg.vertical" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onUnmounted, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import DockIcon from './DockIcon.vue'
import { dismissedIcons, dockConfig, dockGroups, ensureDockConfig, openSettingsPage, restoreIcon, runDismissals, saveDock } from './dock'
import { useZone } from '../shared/zone'
import { hoverZonesMoved } from '../shared/hover'
import { openMenu } from '../ui'
import type { MenuEntry } from '../ui/layer'

const wm = inject<WidgetManager>('wm')!

ensureDockConfig()
useZone()
onUnmounted(runDismissals())

function gripMenu (e: MouseEvent) {
  const items: MenuEntry[] = dismissedIcons().map(b => ({
    label: `${b.name} · ${b.left}`,
    icon: 'fas fa-eye',
    action: () => { restoreIcon(b.id) }
  }))
  if (items.length) items.push({ separator: true })
  items.push({ label: 'Icon row settings', icon: 'fas fa-cog', action: () => { openSettingsPage(wm, 'Icon row') } })
  openMenu(e, items)
}

const cfg = computed(() => dockConfig())

// Nothing over the settings window or another exclusive window.
const blocked = computed(() => wm.widgets.value.some(w => w.wmZorder === 'exclusive' && w.wmWants === 'show'))
const groups = computed(() => blocked.value ? [] : dockGroups.value)
watch(groups, hoverZonesMoved)

let drag: { dx: number, dy: number } | null = null
function startDrag (e: PointerEvent) {
  const el = (e.currentTarget as HTMLElement).parentElement
  if (!el) return
  const r = el.getBoundingClientRect()
  drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', endDrag, { once: true })
  e.preventDefault()
}
function onMove (e: PointerEvent) {
  if (!drag) return
  const d = ensureDockConfig()
  d.x = clamp((e.clientX - drag.dx) / window.innerWidth * 100, 0, 97)
  d.y = clamp((e.clientY - drag.dy) / window.innerHeight * 100, 0, 96)
}
function endDrag () {
  drag = null
  window.removeEventListener('pointermove', onMove)
  saveDock()
}
function flip () {
  const d = ensureDockConfig()
  d.vertical = !d.vertical
  saveDock()
}
function clamp (v: number, lo: number, hi: number) {
  return Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10
}
onUnmounted(() => { window.removeEventListener('pointermove', onMove) })
</script>

<style module>
.dock {
  position: absolute;
  z-index: 900;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--w-body);
}
.vertical { flex-direction: column; }
.grip {
  width: 16px;
  height: 30px;
  display: grid;
  place-items: center;
  color: var(--w-faint);
  cursor: grab;
  border-radius: var(--w-radius-sm);
}
.grip:hover { color: var(--w-fg); background: var(--w-panel); }
.vertical .grip { width: 30px; height: 16px; }
.vertical .grip i { transform: rotate(90deg); }
</style>
