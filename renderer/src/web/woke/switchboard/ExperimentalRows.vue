<template>
  <div data-experimental>
    <div :class="$style.row">
      <w-toggle :model-value="personalOn || asking" :disabled="busy || personalForced" aria-label="Net worth" @update:model-value="onToggle" />
      <div class="min-w-0">
        <div :class="$style.name">Net worth <span :class="$style.exp">EXP</span></div>
        <div :class="$style.desc">{{ personalForced ? 'Reads your stash tabs. Kept on by personal.flag.' : 'Reads your stash tabs.' }}</div>
      </div>
      <button v-if="!personalForced" type="button" :class="$style.hide" :disabled="busy" @click="hide">Hide experimental</button>
    </div>
    <div v-if="asking" :class="$style.confirm" role="alertdialog" aria-labelledby="w-stash-confirm-title">
      <div id="w-stash-confirm-title" :class="$style.title">{{ COPY.confirmTitle }}</div>
      <div>{{ COPY.confirmBody }}</div>
      <div :class="$style.btns">
        <w-button size="sm" :disabled="busy" @click="cancel">Cancel</w-button>
        <w-button size="sm" variant="primary" :disabled="busy" @click="confirm">Turn on</w-button>
      </div>
    </div>
    <template v-if="personalOn">
      <w-banner tone="warn"><b>{{ COPY.warnTitle }}</b> {{ COPY.warnBody }}</w-banner>
      <div :class="$style.signIn"><stash-sign-in /></div>
    </template>
    <w-banner v-if="error" tone="error">{{ error }}</w-banner>
  </div>
</template>

<script setup lang="ts">
// The stash reader's row under Economy, shown once experimental settings are
// unlocked. Turning it on asks first; while it's on a warning stays under it.
import { defineAsyncComponent } from 'vue'
import { WBanner, WButton, WToggle } from '../ui'
import { personalForced, personalOn } from '../personal'
import { setExperimentalUnlocked, setStashReaderOn } from '../personal-switch'
import { COPY, stashSwitch } from './stash-switch'

// Loads with the reader's other code, never before it's on.
const StashSignIn = defineAsyncComponent(() => import('../net-worth/StashSignIn.vue'))

const { asking, busy, error, run, flip, cancel, confirm } = stashSwitch(setStashReaderOn)

function onToggle (on: boolean) {
  flip(on).catch(() => {})
}

function hide () {
  cancel()
  run(async () => { await setExperimentalUnlocked(false) }).catch(() => {})
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
.hide {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  text-decoration: underline;
  white-space: nowrap;
  cursor: pointer;
}
.hide:hover { color: var(--w-fg); }
.confirm {
  margin: 6px var(--w-pad);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: var(--w-fs-sm);
  color: var(--w-fg);
  border: 1px solid color-mix(in srgb, var(--w-warn) 55%, transparent);
  border-radius: var(--w-r-md);
  background: var(--w-panel-2);
}
.title { font-family: var(--w-head); font-size: var(--w-fs-md); color: var(--w-warn); }
.btns { display: flex; justify-content: flex-end; gap: var(--w-s1); }
.signIn { padding: 0 var(--w-pad); }
</style>
