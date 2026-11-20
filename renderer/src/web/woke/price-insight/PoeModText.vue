<template>
  <span>
    <span v-for="(part, idx) of parts" :key="idx"
      :class="{
        'text-white font-exo2 font-semibold': part.placeholder,
        'text-gray-200': !part.placeholder && !part.range,
        'w-roll-top': part.placeholder && top,
        'w-roll-range': part.range
      }"
      ><template v-if="part.placeholder || part.range">{{ part.text }}</template><template v-else><template v-for="(w, i) of elementParts(part.text)" :key="i"><span v-if="w.ele" class="w-ele" :data-ele="w.ele">{{ w.text }}</span><template v-else>{{ w.text }}</template></template></template></span>
  </span>
</template>

<script setup lang="ts">
// woke: ItemModifierText for PoE mode (poe-kit.ts), with a unique's ranges
// after each number as the game's Alt view shows them (WOKEPOET-420). Kept out
// of ItemModifierText so startup never loads it.
import { computed } from 'vue'
// woke: element words get a CSS hook (coloured only in PoE mode).
import { elementParts } from '@/web/woke/ui/element-words'

const props = defineProps<{
  text: string
  roll?: number
  /** woke: one value per #, in order ("Adds 30 to 60"), over roll for each. */
  rolls?: readonly number[]
  /** woke: each #'s range, shown after it as the game's Alt view does ("42(30-46)"). */
  ranges?: ReadonlyArray<{ min: number, max: number } | null>
  /** woke: the line rolled near the top of its range: its numbers read gold. */
  top?: boolean
}>()

const parts = computed(() => {
  const res = [] as Array<{ text: string, placeholder?: boolean, range?: boolean }>
  let n = 0
  props.text.split(/(?<![#])[+-]?[#]/gm).forEach((text, idx, parts) => {
    if (text !== '') {
      res.push({ text })
    }
    if (idx !== (parts.length - 1)) {
      const slot = n++
      const own = props.rolls?.[slot]
      if (own != null) {
        res.push({ text: String(own), placeholder: true })
      } else if (props.roll == null) {
        res.push({ text: '#' })
      } else {
        res.push({
          text: String(props.roll),
          placeholder: true
        })
      }
      const range = props.ranges?.[slot]
      if (range) res.push({ text: `(${range.min}-${range.max})`, range: true })
    }
  })
  return res
})
</script>
