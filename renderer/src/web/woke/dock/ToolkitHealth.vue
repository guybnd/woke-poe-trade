<template>
  <DockItem :menu="dockMenu" :wake="lines.length" id="toolkit" icon="fas fa-exclamation" title="Toolkit" :show="lines.length > 0"
    :badge="lines.length" tone="down" led="error" card-width="22rem">
    <template #card>
      <div :class="$style.body">
        <div v-for="(l, i) in lines" :key="i" :class="$style.line"><i class="fas fa-exclamation-triangle" /> <span>{{ l }}</span></div>
        <div class="w-faint text-xs">Hotkey problems: Settings → Hotkey list.</div>
      </div>
    </template>
  </DockItem>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { copyText } from '../ui/copy'
import { openSettingsPage } from './dock'
import DockItem from './DockItem.vue'
import type { DockMenuAction } from './dock'
import { healthProblems } from './health'
import { useHotkeyHealth } from '../switchboard/hotkey-health'

const hotkeys = useHotkeyHealth()
const wm = inject<WidgetManager>('wm')!

const lines = computed(() => {
  const out: string[] = []
  if (hotkeys.summary.value) out.push(hotkeys.summary.value)
  out.push(...healthProblems.values())
  return out
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Copy the problems', icon: 'far fa-copy', action: () => { copyText(lines.value.join('\n')).catch(() => {}) } },
  { label: 'Open Hotkey list', icon: 'far fa-keyboard', action: () => { openSettingsPage(wm, 'Hotkey list') } }
])
</script>

<style module>
.body { display: flex; flex-direction: column; gap: 4px; padding: 6px var(--w-pad) 8px; }
.line { display: flex; gap: 6px; color: var(--w-down); }
.line i { margin-top: 3px; font-size: calc(11px * var(--w-text-scale, 1)); }
</style>
