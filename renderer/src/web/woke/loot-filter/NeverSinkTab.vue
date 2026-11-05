<template>
  <div :class="$style.wrap" class="w-scroll">
    <div :class="$style.card">
      <div class="flex items-center gap-3">
        <WToggle :model-value="ns.on" @update:model-value="store.useGitHub($event)">Get NeverSink from GitHub and keep it up to date</WToggle>
        <span class="grow" />
        <span v-if="ns.on && ns.version" class="w-dim text-xs w-num">
          Version {{ ns.version }}<template v-if="ns.checkedAt"> · checked {{ agoPhrase(ns.checkedAt) }}</template>
        </span>
        <WButton v-if="ns.on" size="sm" variant="ghost" icon="fas fa-sync" :disabled="store.checking.value" @click="store.checkForUpdate(true)">Check now</WButton>
      </div>
      <div class="w-faint text-xs">
        All seven strictness levels are downloaded into the app's own folder, so your game's filter list doesn't fill up. Your changes are saved to
        "{{ NEVERSINK_OUTPUT.replace('.filter', '') }}". If you customise on FilterBlade, leave this off and keep picking your own file.
      </div>
    </div>

    <template v-if="ns.on">
      <div v-if="store.updateReady.value" :class="[$style.card, $style.update]">
        <div class="flex items-center gap-2">
          <i class="fas fa-download" style="color: var(--w-accent);" />
          <b>NeverSink {{ store.updateReady.value.version }} is ready</b>
          <span class="w-dim text-sm">· {{ store.updateReady.value.ok }} of {{ store.updateReady.value.total }} of your changes fit
            <span v-if="store.updateReady.value.ok < store.updateReady.value.total" style="color: var(--w-warn);">({{ store.updateReady.value.total - store.updateReady.value.ok }} will need a new home)</span>
            <span v-if="store.updateReady.value.movesTotal > store.updateReady.value.movesFit"> · {{ store.updateReady.value.movesTotal - store.updateReady.value.movesFit }} price moves go back to NeverSink's tiers</span></span>
          <span class="grow" />
          <WButton size="sm" variant="primary" @click="update">Update</WButton>
        </div>
        <pre v-if="ns.latestChanges" :class="$style.log">{{ ns.latestChanges }}</pre>
      </div>

      <div class="w-group-label" :class="$style.label">Strictness</div>
      <div :class="$style.levels">
        <button v-for="(name, i) in LEVEL_NAMES" :key="name" type="button" class="w-focusable" :class="[$style.level, { [$style.on]: i === ns.level }]"
          :aria-pressed="i === ns.level" @click="pickLevel(i)">{{ name }}</button>
      </div>
      <div class="flex items-center gap-2 text-xs w-dim" :class="$style.row">
        <span v-if="config.stricterHotkey || config.looserHotkey">Step in game:</span>
        <WKbd v-if="config.looserHotkey" :keys="config.looserHotkey" /><span v-if="config.looserHotkey">looser</span>
        <WKbd v-if="config.stricterHotkey" :keys="config.stricterHotkey" /><span v-if="config.stricterHotkey">stricter</span>
      </div>

      <div class="w-group-label" :class="$style.label">Follow my maps</div>
      <div :class="$style.card">
        <div class="flex items-center gap-3">
          <WToggle v-model="config.strictAuto.on">Change strictness by the area level of my last {{ RECENT_MAPS }} maps</WToggle>
          <span class="grow" />
          <template v-if="config.strictAuto.on && config.strictAuto.paused">
            <span class="text-xs" style="color: var(--w-warn);">Paused after a manual change</span>
            <WButton size="sm" @click="store.resumeLadder()">Resume</WButton>
          </template>
        </div>
        <div :class="$style.ladder">
          <div v-for="(step, i) in sortedLadder" :key="i" :class="$style.step">
            <span class="w-dim text-xs">{{ stepLabel(config.strictAuto.ladder, i) }}<span class="w-faint"> · area {{ step.from }}+</span></span>
            <WSelect :model-value="String(step.level)" :options="levelOptions" @update:model-value="v => step.level = Number(v)" />
          </div>
        </div>
        <div class="w-faint text-xs">Switches only when you enter town or your hideout, never mid-map, and says so with Undo. Press Reload now to use the new strictness.</div>
      </div>

      <div class="w-group-label" :class="$style.label">Look</div>
      <div class="flex items-center gap-2" :class="$style.row">
        <span class="w-dim text-sm">NeverSink style</span>
        <WSelect :model-value="ns.style" :options="styleOptions" style="width: 12rem;" @update:model-value="v => store.setStyle(v)" />
        <span class="w-faint text-xs">Colour themes NeverSink publishes. Your restyles stay on top.</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WButton, WKbd, WSelect, WToggle, agoPhrase, toast } from '../ui'
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import { NEVERSINK_OUTPUT } from './widget'
import { LEVEL_NAMES, RECENT_MAPS, stepLabel } from './strictness'

const props = defineProps<{
  store: LootFilterStore
  config: LootFilterWidget
  anchor?: Element | null
}>()

const ns = computed(() => props.config.neversink)
const sortedLadder = computed(() => [...props.config.strictAuto.ladder].sort((a, b) => a.from - b.from))
const levelOptions = LEVEL_NAMES.map((name, i) => ({ value: String(i), label: name }))
const STYLES = ['', 'ABYSS', 'ALLOY', 'AZURITE', 'COBALT', 'CRIMSON', 'ELDER', 'GAIA', 'LUNARIS', 'NECROS', 'PURPLE', 'TABULA RASA', 'VAAL', 'VELVET', 'WOW']
const styleOptions = STYLES.map(s => ({ value: s, label: s ? s.charAt(0) + s.slice(1).toLowerCase() : 'Default' }))

async function pickLevel (i: number) {
  // woke: clicking the level you're on used to pause the ladder, silently.
  if (i === props.config.neversink.level) return
  const wasPaused = props.config.strictAuto.paused
  if (props.config.strictAuto.on) props.config.strictAuto.paused = true
  const undo = await props.store.setLevel(i)
  if (undo) {
    toast(`Loot filter: ${LEVEL_NAMES[i]}`, { anchor: props.anchor, undo: () => { props.config.strictAuto.paused = wasPaused; undo() } })
  }
}

async function update () {
  const undo = await props.store.updateNeverSink()
  toast(`Updated to NeverSink ${props.config.neversink.version}`, { anchor: props.anchor, undo })
}
</script>

<style module>
.wrap {
  max-height: min(36rem, calc(70vh / var(--w-ui-scale, 1)));
  padding: 8px var(--w-pad) 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: var(--w-panel-2);
  border-radius: var(--w-r-sm);
}
.update {
  border: 1px solid var(--w-line-strong);
}
.log {
  font-family: var(--w-body);
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  white-space: pre-wrap;
  max-height: 8rem;
  overflow: auto;
  margin: 0;
}
.label {
  padding: 10px 0 2px;
}
.row {
  padding: 2px 0;
}
.levels {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}
.level {
  padding: 5px 4px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
  color: var(--w-dim);
  font-size: var(--w-fs-sm);
  cursor: pointer;
}
.level:hover { color: var(--w-fg); border-color: var(--w-line-strong); }
.on {
  color: var(--w-accent-fg);
  background: var(--w-accent);
  border-color: var(--w-accent);
}
.on:hover { color: var(--w-accent-fg); }
.ladder {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.step {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
</style>
