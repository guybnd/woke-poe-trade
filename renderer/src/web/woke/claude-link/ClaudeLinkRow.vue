<template>
  <div data-claude-link>
    <div :class="$style.row">
      <w-toggle :model-value="state?.on ?? false" :disabled="busy" aria-label="Claude link" @update:model-value="setOn" />
      <div class="min-w-0">
        <div :class="$style.name">Claude link <span :class="$style.exp">EXP</span></div>
        <div :class="$style.desc">Lets Claude on this PC read app data and send suggestions.</div>
      </div>
    </div>
    <div v-if="state?.on" :class="$style.more">
      <w-banner v-if="state.error" tone="error">{{ state.error }}</w-banner>
      <div v-if="state.url" :class="$style.line"><span :class="$style.label">Address</span><code>{{ state.url }}</code></div>
      <div :class="$style.btns">
        <w-button size="sm" :disabled="!state.url" @click="copy(codeCommand, 'Claude Code command')">Copy for Claude Code</w-button>
        <w-button size="sm" :disabled="!state.url" @click="copy(desktopJson, 'Claude Desktop config')">Copy for Claude Desktop</w-button>
        <w-button size="sm" variant="ghost" :disabled="busy" @click="newKey">New key</w-button>
      </div>
      <div :class="$style.desc">Claude Code: paste the command in a terminal. Claude Desktop: the copy is a whole claude_desktop_config.json; if yours has other servers, add this one inside its mcpServers (needs Node.js). A new key cuts off every Claude using the old one.</div>
      <div v-if="state.calls.length" :class="$style.calls">
        <span :class="$style.label">Last calls</span>
        <span v-for="c in state.calls.slice(0, 8)" :key="c.at + c.tool" :class="!c.ok && $style.bad">{{ time(c.at) }} {{ c.tool }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// The Claude link's switch, under the experimental rows. Off by default; the
// server in main starts only when this is on.
import { computed, onMounted, shallowRef } from 'vue'
import { WBanner, WButton, WToggle } from '../ui'
import { toast } from '../ui/layer'
import { copyText } from '../ui/copy'
import { hostRequest } from '../shared/host'
import { linkState } from './suggestions'
import { claudeCodeCommand, claudeDesktopJson } from './setup-text'

const busy = shallowRef(false)
const state = linkState

onMounted(() => {
  hostRequest('claude-link-state', null).then(s => { linkState.value = s }).catch(() => {})
})

async function run (fn: () => Promise<void>) {
  busy.value = true
  try { await fn() } catch (e) { toast(e instanceof Error ? e.message : String(e)) } finally { busy.value = false }
}

function setOn (on: boolean) {
  run(async () => { linkState.value = await hostRequest('claude-link-set', { on }) }).catch(() => {})
}
function newKey () {
  run(async () => { linkState.value = await hostRequest('claude-link-new-key', null); toast('New key made. Copy the setup again.') }).catch(() => {})
}

const codeCommand = computed(() => state.value?.url ? claudeCodeCommand(state.value.url, state.value.token) : '')
const desktopJson = computed(() => state.value?.url ? claudeDesktopJson(state.value.url, state.value.token) : '')

function copy (text: string, what: string) {
  copyText(text).then(ok => { toast(ok ? `Copied the ${what}` : 'Couldn\'t copy') }).catch(() => {})
}

function time (at: number) {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style module>
.row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 6px var(--w-pad);
  border-bottom: 1px solid var(--w-line-soft);
}
.name { font-weight: 500; color: var(--w-fg); }
.desc { font-size: var(--w-fs-sm); color: var(--w-dim); }
.exp {
  margin-left: 4px;
  padding: 0 4px;
  font-size: var(--w-fs-xs);
  font-family: var(--w-num);
  color: var(--w-warn);
  border: 1px solid color-mix(in srgb, var(--w-warn) 45%, transparent);
  border-radius: var(--w-r-sm);
  vertical-align: 1px;
}
.more { display: flex; flex-direction: column; gap: 8px; padding: 8px var(--w-pad) 10px calc(var(--w-pad) + 44px); }
.line { display: flex; gap: 8px; align-items: baseline; min-width: 0; }
.line code { font-family: var(--w-num); color: var(--w-fg); overflow-wrap: anywhere; }
.label { color: var(--w-dim); font-size: var(--w-fs-sm); }
.btns { display: flex; flex-wrap: wrap; gap: var(--w-s1); }
.calls { display: flex; flex-wrap: wrap; gap: 4px 10px; font-family: var(--w-num); font-size: var(--w-fs-xs); color: var(--w-dim); }
.bad { color: var(--w-down); }
</style>
