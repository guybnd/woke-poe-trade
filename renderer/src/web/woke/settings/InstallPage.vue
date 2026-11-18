<template>
  <div :class="$style.page">
    <w-setting-section title="Updates">
      <w-setting-row label="Version"><span class="w-num">{{ prefs?.version ?? '…' }}</span></w-setting-row>
      <w-setting-row label="Update automatically" :disabled="prefs ? !prefs.canAutoUpdate : true"
        :show-hint="prefs != null && !prefs.canAutoUpdate" :hint="prefs && !prefs.canAutoUpdate ? 'This copy updates by hand (portable or development build).' : 'Downloads in the background and installs when Path of Exile is closed, or when you quit.'">
        <w-toggle :model-value="!!prefs?.autoUpdate" :disabled="!prefs?.canAutoUpdate" @update:model-value="set({ autoUpdate: $event })" />
      </w-setting-row>
    </w-setting-section>
    <w-setting-section title="Windows">
      <w-setting-row label="Start with Windows" :disabled="!prefs?.canOpenAtLogin">
        <w-toggle :model-value="!!prefs?.openAtLogin" :disabled="!prefs?.canOpenAtLogin" @update:model-value="set({ openAtLogin: $event })" />
      </w-setting-row>
    </w-setting-section>
    <w-setting-section title="Drawing">
      <w-setting-row label="Use the graphics card" :show-hint="restartNeeded"
        :hint="restartNeeded ? (prefs?.canRestart ? 'Takes effect after a restart.' : 'Takes effect when the development build restarts.') : 'Smoother dragging and scrolling of big windows, at some graphics memory. Turn it off from the tray icon if the game screen goes black.'">
        <w-toggle :model-value="!!prefs?.gpuDrawing" @update:model-value="set({ gpuDrawing: $event })" />
        <w-button v-if="restartNeeded && prefs?.canRestart" size="sm" @click="hostRequest('app-restart', null)">Restart now</w-button>
      </w-setting-row>
    </w-setting-section>
    <w-setting-section title="When something breaks">
      <w-setting-row label="Offer to report a crash" hint="After a crash, the next start asks whether to open a ready-made report. Nothing is sent by itself.">
        <w-toggle :model-value="!!prefs?.crashPrompt" @update:model-value="set({ crashPrompt: $event })" />
      </w-setting-row>
      <w-setting-row label="Crash reports folder">
        <w-button size="sm" @click="hostRequest('crash-folder', null)">Open folder</w-button>
      </w-setting-row>
    </w-setting-section>
    <w-setting-section title="Setup">
      <w-setting-row label="Setup window" hint="The first-run guide: finds the game log and picks modules. Opens as its own window.">
        <w-button size="sm" @click="hostRequest('setup-open', null)">Open setup again</w-button>
      </w-setting-row>
    </w-setting-section>
    <div v-if="error" class="w-dim">Couldn't read the app's settings: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { WButton, WSettingRow, WSettingSection, WToggle } from '../ui'
import { hostRequest } from '../shared/host'

interface Prefs {
  version: string
  autoUpdate: boolean
  crashPrompt: boolean
  openAtLogin: boolean
  canOpenAtLogin: boolean
  canAutoUpdate: boolean
  gpuDrawing: boolean
  gpuDrawingNow: boolean
  canRestart: boolean
}
const prefs = shallowRef<Prefs | null>(null)
const error = shallowRef<string | null>(null)
const restartNeeded = computed(() => prefs.value != null && prefs.value.gpuDrawing !== prefs.value.gpuDrawingNow)
;(hostRequest('setup-prefs', null) as Promise<Prefs>).then(p => { prefs.value = p }).catch(e => { error.value = String(e) })

async function set (patch: Partial<Prefs>) {
  try {
    prefs.value = await (hostRequest('setup-prefs-set', patch) as Promise<Prefs>)
  } catch (e) {
    error.value = String(e)
  }
}
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s5); }
</style>
