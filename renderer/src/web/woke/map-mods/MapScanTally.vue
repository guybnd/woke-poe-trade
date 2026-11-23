<template>
  <div :class="$style.tally" data-testid="map-scan-tally">
    <div title="Maps that passed your build's ratings"><span class="w-num w-up">{{ tally.run }}</span><span class="w-dim">safe</span></div>
    <div title="Maps with a mod you rated careful, or lines that couldn't be read clearly"><span class="w-num" style="color: var(--w-warn);">{{ tally.careful }}</span><span class="w-dim">risky</span></div>
    <div title="Maps with a mod you rated avoid"><span class="w-num w-down">{{ tally.skip }}</span><span class="w-dim">dangerous</span></div>
  </div>
</template>

<script setup lang="ts">
import { tally } from './scan-session'
</script>

<style module>
.tally {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 8px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
  text-align: center;
}
.tally > div { display: flex; flex-direction: column; font-size: var(--w-fs-sm); }
.tally :global(.w-num) { font-size: var(--w-fs-xl); }
</style>
