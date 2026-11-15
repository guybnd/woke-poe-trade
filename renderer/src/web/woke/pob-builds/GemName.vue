<template>
  <span v-item-tip="tipRef" :class="[$style.gem, `w-gem-${colour}`, { [$style.off]: off }]">
    <WIcon v-if="art" :src="art" :size="size" title="" /><span :class="[$style.name, { 'line-through': struck }]">{{ name }}</span><slot />
    <!-- Against your character (toggle on the Links heading): yours, only where lower or missing. Rows with a level column show it there instead. -->
    <span v-if="mine && !column && (mine.behind || !mine.have)" class="text-xs w-num whitespace-nowrap" :class="mine.have ? $style.low : $style.none">{{ mine.have ? mine.lq : 'none' }}</span>
  </span>
</template>

<script setup lang="ts">
// A gem's name in its attribute's colour, with its art and tooltip.
import { computed, inject } from 'vue'
import WIcon from '../ui/WIcon.vue'
import { GEM_CLASS, gemData, gemWhere } from './gems'
import { gemArt } from './item-art'
import { CHARACTER_GEMS_ON, character, gemHave } from './character'
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
  // The row has its own level/quality column, which shows yours.
  column?: boolean
}>(), { level: undefined, quality: undefined, note: undefined, size: 'md', off: false, struck: false, column: false })

const colour = computed(() => gemData(props.name)?.colour ?? 'w')
const art = computed(() => gemArt(props.name))
// Inside a build panel: where that build's class gets the gem.
const cls = inject(GEM_CLASS, null)
const where = computed(() => cls ? gemWhere(props.name, cls.value) || undefined : undefined)

// In a build window, with your character read: socketed, behind, or missing.
const compareOn = inject(CHARACTER_GEMS_ON, null)
const mine = computed(() => compareOn?.value && !props.off && !props.struck ? gemHave(props.name, props.level, props.quality) : null)
const charName = computed(() => character.value?.character.name ?? 'your character')
// The tooltip's foot line: yours, or that you don't socket it.
const yoursNote = computed(() => {
  const m = mine.value
  if (!m) return undefined
  if (!m.have) return `${charName.value} doesn't socket it`
  return `Yours (${charName.value}): ${m.yours || 'socketed'}${m.behind ? ` · ${m.behind}` : ''}`
})

// The game's full gem tooltip at this gem's level and quality, as other
// screens show it, with where to get it under; the short one if the data
// lacks the gem.
const tipRef = computed<ItemTipRef>(() => {
  // Its own line in the tooltip, under where to get it.
  const note = [props.note ?? where.value, yoursNote.value].filter(Boolean).join('\n') || undefined
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
.low { color: var(--w-warn, #e2b34a); }
.none { color: var(--w-accent); }
</style>
