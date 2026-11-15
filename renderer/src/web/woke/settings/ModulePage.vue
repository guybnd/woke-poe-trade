<template>
  <div :class="$style.page">
    <w-setting-section v-if="modules.length">
      <w-setting-row v-for="m in switchable" :key="m.id" :label="m.name" :hint="m.description">
        <w-toggle :model-value="isModuleOn(config, m.id)" @update:model-value="setOn(m.id, $event)" />
      </w-setting-row>
      <div v-if="uses.length" :class="$style.uses">
        <span class="w-dim">Uses</span>
        <button v-for="u in uses" :key="u.label" type="button" :class="$style.use" :title="`Set in ${u.pageName}`" @click="emit('open', u.page)">
          {{ u.label }}<span v-if="u.value" :class="u.warn ? $style.warn : 'w-dim'"> · {{ u.value }}</span> <i class="fas fa-arrow-right" />
        </button>
      </div>
    </w-setting-section>

    <template v-for="block in blocks" :key="block.key">
      <w-setting-section :title="block.title">
        <div v-if="block.widget && block.editor" :class="$style.editor">
          <component :is="block.editor" :config="config" :config-widget="block.widget" @open="emit('open', $event)" />
        </div>
        <div v-else-if="block.widget" class="w-dim" :class="$style.note">No settings of its own. Everything it needs is set above or in General.</div>
        <w-empty v-else icon="fas fa-plus-circle">
          Not on your overlay yet. Add it to set it up; it stays hidden until you open it.
          <template #actions>
            <w-button size="sm" variant="primary" @click="emit('add', block.type)">Add {{ block.title }}</w-button>
          </template>
        </w-empty>
      </w-setting-section>
    </template>

    <component :is="part" v-for="(part, i) in page.parts ?? []" :key="i" :config="config" @open="emit('open', $event)" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import type { Config } from '@/web/Config'
import type { Widget } from '@/web/overlay/widgets'
import SettingsStopwatch from '@/web/stopwatch/settings-stopwatch.vue'
import { WButton, WEmpty, WSettingRow, WSettingSection, WToggle } from '../ui'
import { MODULES, ensureWokeConfig, isModuleOn, setModuleOn } from '../modules'
import type { ModuleNeed } from '../modules'
import { wokeSettingsFor } from '../editors'
import type { SettingsPage } from './pages'
import { PAGE_BY_ID } from './pages'

const props = defineProps<{
  config: Config
  page: SettingsPage
  // A single widget instance (APT's stopwatch can have many).
  widgetId?: number
}>()
const emit = defineEmits<{ (e: 'open' | 'add', value: string): void }>()

const APT_EDITORS: Record<string, Component> = {
  timer: SettingsStopwatch
}
const editorFor = (type: string) => wokeSettingsFor(type) ?? APT_EDITORS[type]

const modules = computed(() => (props.page.modules ?? []).map(id => MODULES.find(m => m.id === id)!).filter(Boolean))
// An opt-in module's switch is in Settings > Modules.
const switchable = computed(() => modules.value.filter(m => !m.optIn))
function setOn (id: string, on: boolean) { setModuleOn(ensureWokeConfig(props.config), id, on) }

const titleFor = (type: string) => MODULES.find(m => m.widgetTypes.includes(type))?.name ?? 'Settings'

const blocks = computed(() => {
  const widgets = props.config.widgets as Widget[]
  if (props.widgetId != null) {
    const w = widgets.find(x => x.wmId === props.widgetId)
    return w ? [{ key: `w${w.wmId}`, type: w.wmType, title: '', widget: w, editor: editorFor(w.wmType) }] : []
  }
  const out: Array<{ key: string, type: string, title: string, widget: Widget | null, editor: Component | undefined }> = []
  const types = props.page.widgets ?? []
  for (const type of types) {
    const found = widgets.filter(w => w.wmType === type)
    const title = types.length > 1 ? titleFor(type) : ''
    if (!found.length) out.push({ key: type, type, title: title || titleFor(type), widget: null, editor: editorFor(type) })
    for (const w of found) {
      out.push({ key: `w${w.wmId}`, type, title: found.length > 1 ? `${title || titleFor(type)}: ${w.wmTitle || `#${w.wmId}`}` : title, widget: w, editor: editorFor(type) })
    }
  }
  return out
})

// C1: shared settings this module runs on, linked to where they're set.
const uses = computed(() => {
  const needs = new Set<ModuleNeed>(modules.value.flatMap(m => m.needs))
  const out: Array<{ label: string, value: string | null, page: string, pageName: string, warn?: boolean }> = []
  const name = (id: string) => PAGE_BY_ID.get(id)?.name ?? id
  if (needs.has('poll') || needs.has('prices')) out.push({ label: 'League', value: props.config.leagueId ?? null, page: 'game', pageName: name('game') })
  if (needs.has('account')) {
    const account = props.config.accountName.trim()
    out.push({ label: 'Account name', value: account || 'not set', warn: !account, page: 'game', pageName: name('game') })
  }
  if (needs.has('log')) out.push({ label: 'Game log', value: props.config.clientLog ? 'set' : 'automatic', page: 'game', pageName: name('game') })
  if (needs.has('ocr')) out.push({ label: 'Screen reading', value: null, page: 'screen', pageName: name('screen') })
  if (needs.has('hotkeys')) out.push({ label: 'Hotkeys', value: null, page: 'hotkeys', pageName: name('hotkeys') })
  return out
})
</script>

<style module>
.page { display: flex; flex-direction: column; gap: var(--w-s5); }
.warn { color: var(--w-warn); }
.uses { display: flex; align-items: center; gap: var(--w-s2); flex-wrap: wrap; padding-top: var(--w-s2); font-size: var(--w-fs-sm); }
.use {
  display: inline-flex; align-items: center; gap: 4px; padding: 0 var(--w-s2); line-height: calc(20px * var(--w-text-scale, 1));
  border: 1px solid color-mix(in srgb, var(--w-info) 50%, transparent); border-radius: var(--w-r-pill);
  color: var(--w-info); background: color-mix(in srgb, var(--w-info) 8%, transparent); font-size: var(--w-fs-xs);
}
.use:hover { background: color-mix(in srgb, var(--w-info) 16%, transparent); }
.use i { font-size: var(--w-fs-xs); }
/* Game look: a square link chip in small caps, like the other chips. */
:global([data-woke-look="game"]) .use {
  font-family: var(--w-label); font-size: var(--w-fs-md); letter-spacing: 0.03em; border-radius: var(--w-r-sm);
  border-color: var(--w-chip-line); background: var(--w-chip-ground); color: var(--w-gold);
}
:global([data-woke-look="game"]) .use:hover { border-color: var(--w-frame-hi); color: var(--w-gold-hi); background: var(--w-chip-on); }
.editor { padding-top: var(--w-s2); }
.note { font-size: var(--w-fs-sm); padding: var(--w-s2) 0; }
</style>
