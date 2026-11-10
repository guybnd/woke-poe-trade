<template>
  <div>
    <template v-for="group in groups" :key="group.id">
      <div class="w-group-label">{{ group.label }}</div>
      <div v-for="m in group.modules" :key="m.id" :class="$style.row">
        <button type="button" role="switch" :aria-checked="isOn(m)" :aria-label="m.name"
          :class="[$style.switch, { [$style.on]: isOn(m) }]" @click="toggle(m)" />
        <div class="min-w-0">
          <div :class="$style.name">{{ m.name }}</div>
          <div :class="$style.desc" class="w-trunc">{{ showStatus ? statusLine(m) : m.description }}</div>
        </div>
        <div :class="$style.tags">
          <span v-if="showStatus" :class="$style.live">
            <i :class="$style[status(m)]" />{{ m.group === 'apt' ? (isOn(m) ? 'On' : 'Off') : STATUS_LABEL[status(m)] }}
          </span>
          <template v-else>
            <span v-for="n in visibleNeeds(m)" :key="n" :class="[$style.need, $style[`need-${n}`]]">{{ NEED_LABEL[n] }}</span>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  MODULES, MODULE_GROUPS, isModuleOn, isModuleRunning, setModuleOn, widgetCount
} from '../modules'
import type { ModuleDef, ModuleNeed, WokeModulesConfig } from '../modules'

const props = defineProps<{
  config: { woke: WokeModulesConfig, widgets: Array<{ wmType: string }> }
  // Settings shows live status; setup shows what each module costs to run.
  showStatus?: boolean
  // Setup hides APT feature rows to keep the first screen short.
  includeApt?: boolean
}>()

const NEED_LABEL: Partial<Record<ModuleNeed, string>> = {
  poll: 'poe.ninja',
  prices: 'prices',
  log: 'Client.txt',
  ocr: 'OCR',
  hotkeys: 'hotkeys',
  account: 'account name'
}
const STATUS_LABEL = { running: 'Running', idle: 'Not placed', off: 'Off' } as const

const groups = computed(() => MODULE_GROUPS
  .filter(g => props.includeApt || g.id !== 'apt')
  .map(g => ({ ...g, modules: MODULES.filter(m => m.group === g.id) })))

function isOn (m: ModuleDef) { return isModuleOn(props.config, m.id) }
function toggle (m: ModuleDef) { setModuleOn(props.config, m.id, !isOn(m)) }

function visibleNeeds (m: ModuleDef) {
  return m.needs.filter(n => NEED_LABEL[n])
}

function status (m: ModuleDef): keyof typeof STATUS_LABEL {
  if (!isOn(m)) return 'off'
  return isModuleRunning(props.config, m) ? 'running' : 'idle'
}

function statusLine (m: ModuleDef) {
  if (m.group === 'apt') return m.description
  const n = widgetCount(props.config, m)
  const placed = n === 0 ? 'no widget placed' : n === 1 ? '1 widget' : `${n} widgets`
  return `${m.description} · ${placed}`
}
</script>

<style module>
.row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 6px var(--w-pad);
  border-bottom: 1px solid var(--w-line-soft);
}
.name { font-weight: 500; color: var(--w-fg); }
.desc { font-size: var(--w-fs-sm); color: var(--w-dim); }
.tags { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
.switch {
  width: 30px;
  height: 16px;
  border-radius: var(--w-r-pill);
  background: var(--w-panel-3);
  border: 1px solid var(--w-line-strong);
  position: relative;
  cursor: pointer;
}
.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--w-faint);
  transition: left .12s;
}
.switch.on { background: var(--w-accent); border-color: var(--w-accent); }
.switch.on::after { left: 16px; background: var(--w-accent-fg); }
.switch:focus-visible { outline: 2px solid var(--w-accent); outline-offset: 2px; }
.need {
  font-size: var(--w-fs-xs);
  line-height: calc(15px * var(--w-text-scale, 1));
  padding: 0 6px;
  border-radius: var(--w-r-pill);
  border: 1px solid var(--w-line-strong);
  color: var(--w-dim);
  white-space: nowrap;
}
.need-poll { color: var(--w-info); border-color: color-mix(in srgb, var(--w-info) 35%, transparent); }
.need-log { color: var(--w-corrupt); border-color: color-mix(in srgb, var(--w-corrupt) 35%, transparent); }
.need-ocr { color: var(--w-warn); border-color: color-mix(in srgb, var(--w-warn) 40%, transparent); }
.live { display: inline-flex; align-items: center; gap: 5px; font-size: var(--w-fs-xs); color: var(--w-dim); white-space: nowrap; }
.live i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.running { background: var(--w-up); }
.idle { background: var(--w-warn); }
.off { background: var(--w-faint); }
</style>
