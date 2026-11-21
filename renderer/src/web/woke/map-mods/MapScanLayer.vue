<template>
  <DockItem :menu="dockMenu" id="map-scan" title="Map scan" :show="running || paused || !!message"
    :led="message ? 'error' : paused ? 'warn' : running ? 'on' : null" :badge="rolling ? rolls.length : null"
    :wm-id="config.wmId" card-width="18rem">
    <template #card>
      <div v-if="message" class="w-warn text-xs px-3 pt-2">{{ message }}</div>
      <div v-else-if="paused" class="w-dim text-xs px-3 pt-2">Paused while the essence scan runs. It resumes when that stops.</div>
      <div v-if="rolling" class="w-dim text-xs px-3 pt-2"><i class="fas fa-dice" /> Rolling · {{ rolls.length }} rerolls</div>
      <MapScanTally />
      <MapScanEntry v-for="e in recent.slice(0, 5)" :key="e.id" :entry="e" />
      <div v-if="config.scanHotkey" class="w-faint text-xs px-3 py-1"><WKbd :keys="config.scanHotkey" /> to stop</div>
    </template>
  </DockItem>
  <Teleport to="body">
    <div v-if="running" :class="$style.layer">
      <span v-for="e in entries" :key="e.id" :class="[$style.marker, $style[e.verdict]]"
        :style="{ left: `${e.at.x * 100}%`, top: `${e.at.y * 100}%` }" />
      <div v-if="current" :class="[$style.badge, $style[current.verdict], { [$style.flash]: current.flash }]"
        :style="badgeStyle" data-testid="map-scan-badge">
        <div class="flex items-center gap-2">
          <span :class="[$style.tag, $style[current.verdict]]">{{ VERDICT_LABEL[current.verdict] }}</span>
          <span class="flex-1" />
          <span class="w-dim text-xs">Juice</span>
          <span class="w-num w-accent font-semibold">{{ current.juice }}</span>
        </div>
        <div v-if="current.flash" class="w-up text-xs font-semibold">
          {{ current.rollN ? `Stop: reroll ${current.rollN} passes.` : 'This reroll passes. Stop here.' }}
        </div>
        <div v-if="current.unsure" class="w-warn text-xs">
          Couldn't read {{ current.unsure }} line{{ current.unsure > 1 ? 's' : '' }} clearly.
          <template v-if="config.hotkey">Press <WKbd :keys="config.hotkey" /> for an exact read.</template>
          <template v-else>Use the map check hotkey for an exact read.</template>
        </div>
        <div v-for="m in current.flagged" :key="m.matcher" class="flex items-center gap-1 text-xs">
          <span :class="[$style.dot, $style[m.rating]]" /><span>{{ m.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { WKbd, toast } from '../ui'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { dockIconEl } from '../dock/dock'
import MapScanTally from './MapScanTally.vue'
import MapScanEntry from './MapScanEntry.vue'
import { parseScanHotkeyTarget } from './scan'
import type { MapModsWidget } from './widget'
import {
  VERDICT_LABEL, clearScan, current, entries, message, onReading, onScanState, paused, probeScan, recent,
  rolling, rolls, running, stopScan, toggleRoll, toggleScan
} from './scan-session'
import type { ScanReading } from './scan-session'

// Mounted by the scan owner (the first Map mods window): dock icon, badge,
// hotkeys and main's scan events.
const props = defineProps<{ config: MapModsWidget }>()

probeScan()

const badgeStyle = computed(() => {
  const e = current.value
  if (!e) return {}
  // Map tooltips open above the item (and clear of it), so the badge stays level
  // with the cursor: left of it, or just under it when there's no room on the left.
  if (e.at.x > 0.2) {
    return { right: `${(1 - e.at.x) * 100 + 1.5}%`, top: `${e.at.y * 100}%` }
  }
  return { left: `${e.at.x * 100}%`, top: `${e.at.y * 100 + 3}%` }
})

const events = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
  if (topic !== 'map-scan') return
  const d = data as { type: string, running?: boolean, paused?: boolean, rolling?: boolean, locked?: boolean, message?: string, reading?: ScanReading }
  if (d.type === 'state') onScanState(d)
  else if (d.type === 'clear') current.value = null
  else if (d.type === 'reading' && d.reading) onReading(d.reading, props.config.scanAlertOnPass)
})

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const t = parseScanHotkeyTarget(e.target)
  if (t?.wmId !== props.config.wmId) return
  ;(t.roll ? toggleRoll() : toggleScan()).catch(() => {})
})

onUnmounted(() => {
  events.abort()
  hotkeys.abort()
  // Removed or switched off: its hotkey is gone too, so nothing could stop
  // the scan (screenshots several times a second) until its idle timeout.
  stopScan()
})

function clearFromIcon () {
  const undo = clearScan()
  toast('Scan list cleared', { anchor: dockIconEl('map-scan'), dock: true, undo })
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  { label: running.value && !paused.value ? 'Stop scanning' : 'Start scanning', icon: running.value && !paused.value ? 'fas fa-stop' : 'fas fa-play', action: () => { toggleScan().catch(() => {}) } },
  { label: rolling.value ? 'Stop rolling' : 'Start rolling', icon: 'fas fa-dice', action: () => { toggleRoll().catch(() => {}) } },
  { label: 'Clear the list', icon: 'fas fa-broom', disabled: !entries.value.length && !rolls.value.length, action: clearFromIcon }
])
</script>

<style module>
.tag {
  flex: none;
  min-width: 38px;
  text-align: center;
  font-size: var(--w-fs-xs);
  font-weight: 600;
  border-radius: var(--w-r-sm);
  color: var(--w-accent-fg);
  padding: 0 4px;
}
.tag.run { background: var(--w-up); }
.tag.unsure, .tag.careful { background: var(--w-warn); }
.tag.skip { background: var(--w-down); }

.layer { position: fixed; inset: 0; pointer-events: none; z-index: 1000; }
.marker {
  position: absolute;
  width: 2.2vh;
  height: 2.2vh;
  margin: -1.1vh 0 0 -1.1vh;
  border-radius: 50%;
  border: 2px solid var(--w-faint);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
}
.marker.run { border-color: var(--w-up); }
.marker.careful { border-color: var(--w-warn); }
.marker.unsure { border-color: var(--w-warn); border-style: dashed; }
.marker.skip { border-color: var(--w-down); }
.badge {
  position: absolute;
  min-width: 11rem;
  max-width: 16rem;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  background: var(--w-panel);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-md);
  box-shadow: var(--w-shadow);
}
.badge.skip { border-color: color-mix(in srgb, var(--w-down) 60%, transparent); }
.badge.run { border-color: color-mix(in srgb, var(--w-up) 60%, transparent); }
.flash { animation: flash 0.5s ease-in-out 4 alternate; }
@keyframes flash {
  from { box-shadow: 0 0 0 0 var(--w-up); }
  to { box-shadow: 0 0 0 6px color-mix(in srgb, var(--w-up) 40%, transparent); }
}
.dot { width: 7px; height: 7px; border-radius: var(--w-r-sm); background: var(--w-panel-3); flex: none; }
.dot.deadly { background: var(--w-down); }
.dot.warn { background: var(--w-warn); }
.dot.good { background: var(--w-up); }
</style>
