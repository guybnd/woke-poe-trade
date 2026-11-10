<template>
  <div class="p-2 flex flex-col gap-3" style="max-width: 40rem;">
    <div class="flex items-start gap-3">
      <div class="flex-1">
        <div class="flex items-center gap-2">Modules <w-info text="A switched-off module keeps its widgets and settings but doesn't load, registers no hotkeys and stops anything it was polling." /></div>
      </div>
      <w-button size="sm" @click="runSetupAgain">Run setup again</w-button>
    </div>
    <div :class="$style.box">
      <preset-bar :config="woke" />
      <module-list :config="woke" show-status include-apt />
      <div class="w-group-label">Shared services</div>
      <div v-for="s in services" :key="s.name" :class="$style.svc">
        <span :class="[$style.dot, { [$style.dotOn]: s.on }]" />
        <div class="min-w-0">
          <div>{{ s.name }}</div>
          <div class="w-dim w-trunc" style="font-size: var(--w-fs-sm)">{{ s.detail }}</div>
        </div>
        <span class="w-dim" style="font-size: calc(11px * var(--w-text-scale, 1))">{{ s.on ? 'On' : 'Off' }}</span>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <div class="flex items-center gap-2">Hide all toolkit panels <w-info text="Press once to hide every panel, again to bring them back. While the game has focus, panels don't take clicks anyway; this is for clearing the screen." /></div>
      </div>
      <w-hotkey-cell v-model="hideAllHotkey" />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'Modules'
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { Config } from '@/web/Config'
import { WButton, WInfo } from '../ui'
import { hostRequest } from '../shared/host'
import { ensureWokeConfig, modulesNeeding } from '../modules'
import type { ModuleDef } from '../modules'
import WHotkeyCell from '../ui/WHotkeyCell.vue'
import ModuleList from './ModuleList.vue'
import PresetBar from './PresetBar.vue'

// `config` is the settings window's working copy; changes apply as you make them.
const props = defineProps<{ config: Config }>()

ensureWokeConfig(props.config)
const woke = computed(() => ensureWokeConfig(props.config))
const hideAllHotkey = computed({
  get: () => woke.value.woke.hideAllHotkey ?? null,
  set: (v: string | null) => { woke.value.woke.hideAllHotkey = v }
})

function names (list: ModuleDef[]) {
  return list.map(m => m.name).join(', ')
}

const services = computed(() => {
  const c = woke.value
  const log = modulesNeeding(c, 'log')
  const poll = modulesNeeding(c, 'poll')
  const prices = [...poll, ...modulesNeeding(c, 'prices')]
  const ocr = modulesNeeding(c, 'ocr')
  return [
    {
      name: 'Client.txt reader',
      on: log.length > 0,
      detail: log.length ? `Needed by ${names(log)}` : 'No module needs it, so the game log is not read'
    },
    {
      name: 'poe.ninja refresh every 10 min',
      on: poll.length > 0,
      detail: poll.length ? `Needed by ${names(poll)}` : 'Off; prices still load when you price check'
    },
    {
      name: 'Saved price snapshots',
      on: prices.length > 0,
      detail: prices.length ? `Used by ${names(prices)}` : 'Nothing is written to price history'
    },
    {
      name: 'OCR worker',
      on: ocr.length > 0,
      detail: ocr.length ? `Loads on first use by ${names(ocr)}` : 'Never loaded'
    }
  ]
})

// Opens the setup window (the same one as on first launch).
function runSetupAgain () {
  hostRequest('setup-open', null).catch(() => {})
}
</script>

<style module>
.box {
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  border-radius: var(--w-radius);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  padding-bottom: 6px;
}
.svc {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 6px var(--w-pad);
  border-bottom: 1px solid var(--w-line-soft);
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--w-faint); justify-self: center; }
.dotOn { background: var(--w-up); }
</style>
