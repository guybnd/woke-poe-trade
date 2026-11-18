<template>
  <div v-if="rows.length" class="border border-gray-600 rounded p-2 whitespace-nowrap min-w-min w-72 mt-2">
    <div v-for="row in rows" :key="row.key" :class="$style.row">
      <div class="min-w-0">
        <p>{{ row.label }}</p>
        <p class="text-gray-500" :class="$style.sub">{{ row.sub }}</p>
      </div>
      <button v-if="row.action" class="btn" :disabled="busy" @click="row.action">{{ row.actionText }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Settings › About: going back to the previous release (WOKEPOET-53, pick A).
// Main does the work (main/src/woke/rollback.ts); the tray offers it too.
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { hostRequest } from '@/web/woke/shared/host'
import type { WokeOp, WokeRollbackState } from '@ipc/woke-ops'

interface Row { key: string, label: string, sub: string, action?: () => void, actionText?: string }

const state = shallowRef<WokeRollbackState | null>(null)
const busy = shallowRef(false)

async function send (op: Extract<WokeOp, `rollback-${string}`>) {
  busy.value = true
  try {
    state.value = await hostRequest(op, null)
  } catch {
    // An older main (or the test host) has no rollback: show nothing.
  } finally {
    busy.value = false
  }
}

const rows = computed<Row[]>(() => {
  const s = state.value
  if (!s) return []
  const out: Row[] = []
  if (s.offered) {
    switch (s.phase) {
      case 'downloading':
        out.push({
          key: 'going',
          label: `Going back to ${s.target ?? ''}`,
          sub: s.progress != null ? `Downloading, ${Math.floor(s.progress * 100)}%` : 'Downloading',
          action: () => { send('rollback-cancel').catch(() => {}) },
          actionText: 'Cancel'
        })
        break
      case 'ready':
        out.push({
          key: 'going',
          label: `Going back to ${s.target ?? ''}`,
          sub: 'Installs when Path of Exile is closed',
          action: () => { send('rollback-cancel').catch(() => {}) },
          actionText: 'Cancel'
        })
        break
      case 'installing':
        out.push({ key: 'going', label: `Going back to ${s.target ?? ''}`, sub: 'Installing' })
        break
      case 'failed':
        out.push({
          key: 'failed',
          label: `Couldn't go back to ${s.target ?? 'the previous version'}`,
          sub: s.error ?? '',
          action: () => { send('rollback-start').catch(() => {}) },
          actionText: 'Try again'
        })
        break
      case 'idle':
        if (s.previous) {
          out.push({
            key: 'previous',
            label: `Previous version ${s.previous}`,
            sub: 'Installs when Path of Exile is closed',
            action: () => { send('rollback-start').catch(() => {}) },
            actionText: 'Go back'
          })
        }
    }
  }
  // Not while going back: undoing then would let the skipped version straight back.
  if (s.skip && (s.phase === 'idle' || s.phase === 'failed')) {
    out.push({
      key: 'skip',
      label: `Skipping ${s.skip}`,
      sub: 'Updates resume from the next version',
      action: () => { send('rollback-undo-skip').catch(() => {}) },
      actionText: 'Undo'
    })
  }
  return out
})

let off: AbortController | undefined
onMounted(() => {
  off = MainProcess.onEvent('MAIN->CLIENT::woke-event', ({ topic, data }) => {
    if (topic === 'rollback-state') state.value = data as WokeRollbackState
  })
  send('rollback-state').catch(() => {})
})
onBeforeUnmount(() => { off?.abort() })
</script>

<style module>
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}
.row + .row {
  border-top: 1px solid var(--w-row-fade, rgba(138, 112, 64, 0.35));
}
.sub {
  font-size: var(--w-fs-sm);
  white-space: normal;
}
</style>
