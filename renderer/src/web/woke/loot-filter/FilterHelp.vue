<template>
  <!-- How the filter works (Guy's pick C): a page over the window, under its
       title bar, of one tile per part: a small picture of the real control,
       one line, and Show me. Close, × or Esc closes it. -->
  <div :class="$style.page" :style="{ top: `${top}px` }" role="dialog" aria-label="How the filter works" data-filter-help data-no-item-tip="Tutorial text" @mousedown.stop>
    <div :class="$style.head">
      <span :class="$style.title">How the filter works</span>
      <span class="grow" />
      <WButton size="sm" icon="fas fa-redo" data-filter-help-replay @click="emit('replay')">Replay tour</WButton>
      <WButton size="sm" variant="ghost" data-filter-help-close @click="emit('close')">Close</WButton>
      <button type="button" :class="$style.x" title="Close" aria-label="Close" @click="emit('close')">×</button>
    </div>
    <div :class="$style.tiles">
      <div v-for="t in HELP_TILES" :key="t.id" :class="$style.tile" :data-help-tile="t.id">
        <b :class="$style.name">{{ t.name }}</b>
        <div v-if="t.picture === 'steps'" :class="$style.pic" aria-hidden="true">
          <LabelPreview v-for="s in PICTURE_STEPS" :key="s" :text="CSTEP_NAMES[s]" :actions="[]" :style-override="currencyFullLook(s, 'orbs', config.presets.currency)" visibility="Show" :extras="false" :scale="0.5" />
        </div>
        <div v-else-if="t.picture === 'mode'" :class="$style.pic" aria-hidden="true">
          <span :class="$style.mode"><i :class="$style.dot" />{{ MODE_WORDS.auto }} <i class="fas fa-caret-down" /></span>
        </div>
        <div v-else-if="t.picture === 'keys'" :class="$style.pic">
          <WKbd :keys="config.sampleHotkey || 'Alt + F'" /><span class="w-faint">then</span><WKbd keys="Ctrl + Z" />
        </div>
        <div :class="$style.text">{{ t.text }}</div>
        <WButton size="sm" variant="primary" :class="$style.show" data-help-show @click="emit('show', t)">Show me</WButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { WButton, WKbd } from '../ui'
import LabelPreview from './LabelPreview.vue'
import { CSTEP_NAMES, currencyFullLook } from './currency-weights'
import type { CStep } from './currency-weights'
import { MODE_WORDS } from './section-modes'
import { HELP_TILES } from './filter-tour'
import type { HelpTile } from './filter-tour'
import type { LootFilterWidget } from './widget'

defineProps<{
  config: LootFilterWidget
  // The window's title bar height: the page sits under it.
  top: number
}>()
const emit = defineEmits<{ (e: 'close' | 'replay'): void, (e: 'show', t: HelpTile): void }>()

const PICTURE_STEPS: CStep[] = [1, 2, 3, 4, 5]

// Esc closes the page, not the window.
function onKey (e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopImmediatePropagation()
  emit('close')
}
window.addEventListener('keydown', onKey, true)
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey, true) })
</script>

<style module>
.page {
  position: absolute;
  z-index: 55;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  padding: 10px var(--w-pad) 12px;
  background: var(--w-bg, var(--w-panel));
  border-top: 1px solid var(--w-accent);
}
.head { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.title { color: var(--w-accent); font-family: var(--w-head); letter-spacing: var(--w-head-track); font-size: var(--w-fs-lg); }
.x { padding: 0 6px; color: var(--w-dim); font-size: var(--w-fs-lg); }
.x:hover { color: var(--w-fg); }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); gap: 8px; }
.tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
  background: var(--w-panel-2);
}
.name { color: var(--w-accent); font-size: var(--w-fs-sm); }
.pic { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; min-height: 22px; font-size: var(--w-fs-xs); }
.mode { display: inline-flex; align-items: center; gap: 5px; padding: 1px 7px; border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); color: var(--w-fg); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--w-gold); }
.text { flex: 1; font-size: var(--w-fs-xs); line-height: 1.45; color: var(--w-fg); }
.show { align-self: flex-start; }
</style>
