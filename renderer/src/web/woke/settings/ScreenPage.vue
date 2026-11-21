<template>
  <div :class="$style.page">
    <w-setting-section title="Text recognition">
      <w-setting-row label="OCR engine" :show-hint="!ocr?.ok" :hint="ocr === null ? 'Checking…' : ocr.ok ? 'Loads on first use and closes again when idle.' : ocr.message ?? 'Not available'">
        <span v-if="ocr" :class="[$style.chip, ocr.ok ? $style.ok : $style.bad]">{{ ocr.ok ? 'Ready' : 'Problem' }}</span>
      </w-setting-row>
    </w-setting-section>

    <w-setting-section title="What reads the screen">
      <w-setting-row v-for="m in scanModules" :key="m.id" :label="m.name" :hint="m.description">
        <w-toggle :model-value="isModuleOn(config, m.id)" @update:model-value="setOn(m.id, $event)" />
      </w-setting-row>
    </w-setting-section>

    <w-setting-section title="Keys">
      <w-setting-row v-for="f in keys" :key="f.id" :label="f.label" show-hint :hint="f.off ? 'Module off' : undefined">
        <w-hotkey-cell :model-value="f.get()" :label="f.label" @update:model-value="f.set($event)" />
      </w-setting-row>
      <w-setting-row v-if="!keys.length" label="No scan keys yet" show-hint hint="Turn on Essence scan or Map mods above. Keys show here the next time settings opens." />
    </w-setting-section>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { Config } from '@/web/Config'
import { WHotkeyCell, WSettingRow, WSettingSection, WToggle } from '../ui'
import { MODULES, ensureWokeConfig, isModuleOn, setModuleOn } from '../modules'
import { hostRequest } from '../shared/host'
import { hotkeyFields } from './hotkey-fields'

const props = defineProps<{ config: Config }>()

// Map mods only reads the screen for map scan: its switch would turn off the
// whole tool, so it's left to the Map mods page (clear its scan keys below).
const scanModules = MODULES.filter(m => m.needs.includes('ocr') && m.id !== 'map-mods')
function setOn (id: string, on: boolean) { setModuleOn(ensureWokeConfig(props.config), id, on) }

// Essence scan's keys, and Map mods' scan keys (not its map check keys).
const keys = computed(() => hotkeyFields(props.config).filter(f => f.scan))

const ocr = shallowRef<{ ok: boolean, message: string | null } | null>(null)
hostRequest('ocr-check', null)
  .then(r => { ocr.value = r })
  .catch(e => { ocr.value = { ok: false, message: String(e) } })
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s5); }
.chip { font-size: var(--w-fs-xs); border: 1px solid currentColor; border-radius: var(--w-r-pill); padding: 0 8px; line-height: calc(18px * var(--w-text-scale, 1)); }
.ok { color: var(--w-up); }
.bad { color: var(--w-down); }
</style>
