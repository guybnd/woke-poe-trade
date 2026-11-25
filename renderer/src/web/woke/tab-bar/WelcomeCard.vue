<template>
  <div data-w-popup data-welcome-card :class="$style.wrap" :style="pos" data-no-item-tip="First-run help card, names no items">
    <w-panel title="Getting started">
      <div :class="$style.rows">
        <template v-if="priceKey">
          <w-kbd :keys="priceKey" /><span>Price the item under your cursor</span>
        </template>
        <template v-if="searchKey">
          <w-kbd :keys="searchKey" /><span>Search any price, tool or setting
            <w-button variant="ghost" size="sm" data-welcome-try @click="emit('try')">Try it</w-button></span>
        </template>
        <span :class="$style.ic"><i class="fas fa-th" /></span><span>All tools. Pin the ones you use to this rail.</span>
        <span :class="$style.ic"><i class="fas fa-cog" /></span><span>Settings: hotkeys, league, and which tools are on</span>
        <template v-if="!netWorthOn">
          <span :class="$style.ic"><i class="fas fa-wallet" /></span>
          <span>Net worth tracks what your stash is worth. It's off until you turn it on in Settings.
            <w-button variant="ghost" size="sm" data-welcome-net-worth @click="emit('net-worth')">Open in Settings</w-button></span>
        </template>
      </div>
      <template #footer>
        <div class="w-actions">
          <w-button variant="ghost" size="sm" icon="fas fa-book" @click="openHelp">Help</w-button>
          <w-button variant="ghost" size="sm" icon="fab fa-discord" @click="openDiscord()">Discord</w-button>
          <span class="grow" />
          <w-button variant="primary" size="sm" data-welcome-done @click="emit('done')">Got it</w-button>
        </div>
      </template>
    </w-panel>
  </div>
</template>

<script setup lang="ts">
// The first overlay open after setup: the keys that matter and where tools
// live, beside the rail. Shown once (welcome.ts).
import { computed } from 'vue'
import { AppConfig } from '@/web/Config'
import { WButton, WKbd, WPanel } from '../ui'
import { fieldKey, hotkeyFields } from '../settings/hotkey-fields'
import { SEARCH_TYPE } from '../search/widget'
import { openDiscord } from '../app/report'
import { personalOn } from '../personal'
import { HELP_URL } from './welcome'

defineProps<{ pos: Record<string, string> }>()
const emit = defineEmits<{ (e: 'done' | 'net-worth' | 'try'): void }>()

const priceKey = computed(() => {
  const pc = hotkeyFields(AppConfig()).find(f => f.id === 'pc' && !f.off)
  return pc ? fieldKey(pc) : null
})
const searchKey = computed(() => {
  const w = AppConfig().widgets.find(w => w.wmType === SEARCH_TYPE) as { hotkey?: string | null } | undefined
  return w?.hotkey ?? null
})
const netWorthOn = computed(() => personalOn.value)

function openHelp () { window.open(HELP_URL) }
</script>

<style module>
.wrap {
  position: fixed;
  z-index: 9998;
  width: 380px;
  max-width: calc(100vw - 16px);
}
.rows {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 12px;
  align-items: center;
  padding: 10px 12px;
  font-size: var(--w-fs-md);
}
.ic { text-align: center; color: var(--w-accent); }
</style>
