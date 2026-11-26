<template>
  <section :class="[$style.box, { [$style.full]: full }]" data-testid="map-scan-box">
    <div class="flex items-center gap-2">
      <span class="w-group-label flex items-center gap-2" style="padding: 0;">
        Map scan
        <WInfo :text="HOW_IT_WORKS" />
      </span>
      <span class="flex-1" />
      <span :class="[$style.led, { [$style.on]: running && !paused }]" :title="running ? (paused ? 'Paused for the essence scan' : 'Scanning') : 'Off'" />
      <WButton size="sm" :variant="running && !paused ? 'default' : 'primary'" :icon="running && !paused ? 'fas fa-stop' : 'fas fa-crosshairs'"
        :title="config.scanHotkey ? `Scan mode on or off (${config.scanHotkey})` : 'Scan mode on or off'" @click="toggle">{{ running && !paused ? 'Stop' : 'Scan' }}</WButton>
      <WButton size="sm" :variant="rolling ? 'primary' : 'default'" icon="fas fa-dice"
        :title="config.scanRollHotkey ? `Rolling mode: lock onto the hovered map (${config.scanRollHotkey})` : 'Rolling mode: lock onto the hovered map'" @click="roll">{{ rolling ? 'Stop rolling' : 'Roll' }}</WButton>
    </div>
    <div v-if="message" class="w-warn text-xs">{{ message }}</div>
    <div v-else-if="setupProblem" class="w-warn text-xs" :title="setupProblem"><i class="fas fa-exclamation-triangle" /> {{ setupProblem }}</div>
    <div v-else-if="paused" class="w-dim text-xs">Paused while the essence scan runs. It resumes when that stops.</div>
    <div v-if="rolling" :class="$style.roll">
      <div class="flex items-center gap-2 text-xs">
        <i class="fas fa-dice" />
        <span class="font-semibold">Rolling</span>
        <span class="w-dim">{{ locked ? 'locked on tooltip' : 'hover the map…' }}</span>
        <span class="flex-1" />
        <span class="w-num">{{ rolls.length }}</span><span class="w-dim">rerolls</span>
      </div>
      <div v-if="rolls.length" class="flex flex-wrap gap-1">
        <span v-for="r in rolls.slice(-14)" :key="r.n" :class="[$style.rollTag, $style[r.verdict]]"
          :title="`Reroll ${r.n}: ${VERDICT_LABEL[r.verdict]}, juice ${r.juice}`">{{ r.n }}</span>
      </div>
    </div>
    <template v-if="entries.length">
      <MapScanTally />
      <div :class="$style.list">
        <MapScanEntry v-for="e in shown" :key="e.id" :entry="e" show-rerolls :detail="full" />
      </div>
      <div class="flex items-center gap-2 w-dim text-xs">
        <span class="flex-1">{{ entries.length }} scanned</span>
        <button ref="clearBtn" type="button" class="w-icon-btn" title="Clear the scan list. You can undo." @click="clear"><i class="fas fa-eraser" /></button>
      </div>
    </template>
    <div v-else class="w-dim text-xs">
      <template v-if="rolling">Hover the map you're rerolling.</template>
      <template v-else-if="running">Hover a map to see its verdict. Rerolled maps are read again.</template>
      <template v-else-if="config.scanHotkey">Press <WKbd :keys="config.scanHotkey" /> in game, then hover your maps: each gets a verdict from this build's ratings.</template>
      <template v-else>Start a scan, then hover your maps: each gets a verdict from this build's ratings.</template>
      <template v-if="!rolling && config.scanRollHotkey"> Rerolling one map? Hover it and press <WKbd :keys="config.scanRollHotkey" />.</template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { WButton, WInfo, WKbd, toast } from '../ui'
import MapScanTally from './MapScanTally.vue'
import MapScanEntry from './MapScanEntry.vue'
import type { MapModsWidget } from './widget'
import {
  VERDICT_LABEL, clearScan, entries, locked, message, paused, recent, rolling, rolls, running,
  setupProblem, probeOcr, toggleRoll, toggleScan
} from './scan-session'

const props = defineProps<{ config: MapModsWidget, full?: boolean }>()

// The Scan tab lists every map read, newest first; the short form the latest 8.
const shown = computed(() => props.full ? entries.value.slice().reverse() : recent.value)

probeOcr()

const HOW_IT_WORKS = 'Reads the tooltip of the map under your mouse with on-screen text recognition, so no key press is needed per map.\n' +
  '- It re-reads whenever the tooltip changes, so rerolling one map (chaos spamming) updates the verdict.\n' +
  '- **Roll**, for long reroll sessions: hover the map first. It finds the tooltip once, then reads only that box (faster) until you stop.\n' +
  '- It reads only once the cursor rests on a map, and stops by itself after 3 minutes with nothing to read.\n' +
  '- **?** instead of Safe: the map would pass, but some lines weren\'t clear. Use the map check hotkey on it for an exact read.\n' +
  '- Verdicts use this window\'s active build.\n\n' +
  'Needs Windows and the OCR files. Keys are in Settings › Map mods.'

const clearBtn = shallowRef<HTMLElement | null>(null)
function toggle () { toggleScan().catch(() => {}) }
function roll () { toggleRoll().catch(() => {}) }
function clear () {
  const undo = clearScan()
  toast('Scan list cleared', { anchor: clearBtn.value ?? undefined, undo })
}
</script>

<style module>
.box { display: flex; flex-direction: column; gap: 7px; padding: 10px var(--w-pad); border-bottom: 1px solid var(--w-line); }
.full { border-bottom: none; padding: 12px var(--w-pad); gap: 10px; }
.box :global(.w-group-label) { color: var(--w-dim); }
.led { width: 8px; height: 8px; border-radius: var(--w-r-sm); background: var(--w-faint); }
.led.on { background: var(--w-up); }
.list { display: flex; flex-direction: column; margin: 0 calc(-1 * var(--w-pad)); }
.roll {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 6px 8px;
  border-radius: var(--w-r-md);
  background: color-mix(in srgb, var(--w-accent) 8%, transparent);
}
.rollTag {
  min-width: 20px;
  text-align: center;
  font-size: var(--w-fs-xs);
  font-family: var(--w-num);
  border-radius: var(--w-r-sm);
  color: var(--w-accent-fg);
  background: var(--w-faint);
}
.rollTag.run { background: var(--w-up); }
.rollTag.careful { background: var(--w-warn); }
.rollTag.skip { background: var(--w-down); }
</style>
