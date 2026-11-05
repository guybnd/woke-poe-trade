<template>
  <span :class="[$style.gem, `w-gem-${colour}`, { [$style.off]: off }]"
    @mouseenter="showTip($event, { kind: 'gem', name, level, quality, note })" @mouseleave="hideTip">
    <WIcon v-if="art" :src="art" :size="size" title="" /><span :class="[$style.name, { 'line-through': struck }]">{{ name }}</span><slot />
  </span>
</template>

<script setup lang="ts">
// A gem's name in its attribute's colour, with its art and tooltip.
import { computed } from 'vue'
import WIcon from '../ui/WIcon.vue'
import { gemData } from './gems'
import { gemArt } from './item-art'
import { hideTip, showTip } from './tooltip'

const props = withDefaults(defineProps<{
  name: string
  level?: number | null
  quality?: number | null
  note?: string
  size?: 'sm' | 'md'
  off?: boolean
  struck?: boolean
}>(), { level: undefined, quality: undefined, note: undefined, size: 'md', off: false, struck: false })

const colour = computed(() => gemData(props.name)?.colour ?? 'w')
const art = computed(() => gemArt(props.name))
</script>

<style module>
.gem { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.off { opacity: 0.5; }
</style>
