<template>
  <!-- A price text ("6.9 div", "1,436c", "281 per c") with each currency unit
       drawn as its icon. The unit text stays for screen readers and copying. -->
  <span><template v-for="(p, i) in parts" :key="i"><span v-if="p.unit" :class="$style.amt">{{ p.text }}<img :src="p.unit === 'div' ? '/images/divine.png' : '/images/chaos.png'" :class="$style.coin" alt="" :title="p.unit === 'div' ? 'divine' : 'chaos'"><span class="sr-only">{{ p.raw }}</span></span><template v-else>{{ p.text }}</template></template></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { splitPriceText } from './price-text'

const props = defineProps<{ text: string | null | undefined }>()

const parts = computed(() => splitPriceText(props.text ?? ''))
</script>

<style module>
.amt { white-space: nowrap; }
.coin { display: inline-block; width: 1em; height: 1em; min-width: 14px; min-height: 14px; margin-left: 0.08em; vertical-align: -0.15em; object-fit: contain; }
</style>
