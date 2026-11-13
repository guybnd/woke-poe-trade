<template>
  <div v-if="show" :class="$style.stack">
    <div v-if="updateReady" data-w-popup :class="$style.pill" role="status">
      <i class="fas fa-arrow-circle-up w-accent" />
      <span>Update {{ updateReady }} ready, installs when you quit</span>
      <w-button size="sm" @click="restartNow">Restart now</w-button>
      <button type="button" class="w-icon-btn" title="Hide" aria-label="Hide" @click="hiddenUpdate = updateReady"><i class="fas fa-times" /></button>
    </div>
    <div v-if="configNotice" data-w-popup :class="$style.pill" role="alert">
      <i class="fas fa-exclamation-circle w-down" />
      <span>{{ configNotice }}</span>
      <w-button size="sm" variant="ghost" @click="hiddenConfigNotice = true">Dismiss</w-button>
    </div>
    <div v-if="crash" data-w-popup :class="$style.pill" role="alert">
      <i class="fas fa-exclamation-circle w-down" />
      <span>{{ crash.count > 1 ? `The app ran into ${crash.count} problems last time` : 'The app closed unexpectedly last time' }}</span>
      <w-button size="sm" variant="primary" title="Opens a pre-filled GitHub issue you can read and edit before sending" @click="report">Report…</w-button>
      <w-button size="sm" variant="ghost" @click="dismiss">Dismiss</w-button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Small notices at the top of the overlay, shown only while it is open:
// an update waiting to install, and a crash from the last run to report.
import { computed, inject, shallowRef } from 'vue'
import { Host } from '@/web/background/IPC'
import type { ConfigNotice } from '@ipc/types'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { WButton } from '../ui'
import { hostRequest } from '../shared/host'
import { reportProblem } from './report'

interface PendingCrash { id: string, at: number, title: string, count: number }

const wm = inject<WidgetManager>('wm')!

const show = computed(() => wm.active.value && !wm.widgets.value.some(w => w.wmZorder === 'exclusive' && w.wmWants === 'show'))

const hiddenUpdate = shallowRef<string | null>(null)
const updateReady = computed(() => {
  const info = Host.updateInfo.value
  return info.state === 'update-downloaded' && info.version !== hiddenUpdate.value ? info.version : null
})

function restartNow () {
  Host.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'update-and-restart' } })
}

const CONFIG_NOTICES: Record<ConfigNotice, string> = {
  'restored': 'Your settings file was damaged, so settings came back from a backup. Recent changes may be missing.',
  'reset': 'Your settings file was damaged and there was no backup, so settings were reset. The old file is in the config folder.',
  'unreadable': 'Your settings file couldn\'t be read, so defaults are on for now and changes won\'t be kept. Restart the app to try again.',
  'newer': 'These settings come from a newer version, so changes won\'t be kept. Update the app to use them.',
  'port-busy': 'Another program is using this app\'s port, so your look settings and price log seem reset for now. Close that program and restart the app to get them back.',
  'upgrade-failed': 'Your settings couldn\'t be upgraded, so defaults are on for now and changes won\'t be kept. Your file is untouched.'
}
const hiddenConfigNotice = shallowRef(false)
const configNotice = computed(() => {
  const notice = Host.configNotice.value
  return notice && !hiddenConfigNotice.value ? CONFIG_NOTICES[notice] : null
})

const crash = shallowRef<PendingCrash | null>(null)
hostRequest('crash-pending', {}).then(c => { crash.value = c }).catch(() => {})

async function report () {
  const c = crash.value
  if (!c) return
  crash.value = null
  await reportProblem(c.id).catch(() => {})
  await hostRequest('crash-dismiss', {}).catch(() => {})
}

async function dismiss () {
  crash.value = null
  await hostRequest('crash-dismiss', {}).catch(() => {})
}
</script>

<style module>
.stack {
  position: absolute;
  left: 50%;
  top: 36px;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 12px;
  font-family: var(--w-body);
  font-size: var(--w-fs-sm);
  color: var(--w-fg);
  background: var(--w-panel);
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-pill);
  box-shadow: var(--w-shadow);
  white-space: nowrap;
}
</style>
