<template>
  <span v-item-tip="tipRef" :class="[$style.gem, `w-gem-${colour}`, { [$style.off]: off }]">
    <WIcon v-if="art" :src="art" :size="size" title="" /><span :class="[$style.name, { 'line-through': struck }]">{{ name }}</span><slot />
  </span>
</template>

<script setup lang="ts">
// A gem's name in its attribute's colour, with its art and tooltip.
import { computed, inject } from 'vue'
import WIcon from '../ui/WIcon.vue'
import { GEM_CLASS, gemData, gemWhere } from './gems'
import { gemArt } from './item-art'
import { vItemTip } from '../ui/tooltip/item-tip'
import type { ItemTipRef } from '../ui/tooltip/item-tip'

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
// Inside a build panel: where that build's class gets the gem.
const cls = inject(GEM_CLASS, null)
const where = computed(() => cls ? gemWhere(props.name, cls.value) || undefined : undefined)

// The game's full gem tooltip at this gem's level and quality, as other
// screens show it, with where to get it under; the short one if the data
// lacks the gem.
const tipRef = computed<ItemTipRef>(() => {
  const note = props.note ?? where.value
  const level = props.level ?? 1
  return {
    name: gemData(props.name)?.name ?? props.name,
    type: 'SkillGem',
    // Vaal gems are always corrupted.
    variant: (props.quality ? `${level}/${props.quality}` : String(level)) + (/^Vaal /.test(props.name) ? 'c' : ''),
    noPrice: true,
    // The menu as before: priced by name, PoB's levels aren't poe.ninja's.
    menu: { name: props.name },
    note,
    fallback: { kind: 'gem', name: props.name, level: props.level, quality: props.quality, note }
  }
})
</script>

<style module>
.gem { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.off { opacity: 0.5; }
</style>
