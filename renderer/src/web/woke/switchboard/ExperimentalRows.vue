<template>
  <div data-experimental>
    <claude-link-row />
    <div v-if="!personalForced" :class="$style.foot">
      <button type="button" :class="$style.hide" :disabled="busy" @click="hide">Hide experimental</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// The experimental rows under Economy (the AI link), shown once the Economy
// heading is clicked 5 times. Hiding them turns the AI link off; the stash
// reader has its own row (StashReaderRow) and stays as it is. With
// personal.flag the rows always show, so there's nothing to hide.
import { defineAsyncComponent, shallowRef } from 'vue'
import { personalForced } from '../personal'
import { setExperimentalUnlocked } from '../personal-switch'

const ClaudeLinkRow = defineAsyncComponent(() => import('../claude-link/ClaudeLinkRow.vue'))

const busy = shallowRef(false)

async function hide () {
  if (busy.value) return
  busy.value = true
  try {
    await setExperimentalUnlocked(false)
  } catch {} finally {
    busy.value = false
  }
}
</script>

<style module>
.foot {
  display: flex;
  justify-content: flex-end;
  padding: 4px var(--w-pad);
}
.hide {
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  text-decoration: underline;
  white-space: nowrap;
  cursor: pointer;
}
.hide:hover { color: var(--w-fg); }
</style>
