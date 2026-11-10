<template>
  <span>
    <span v-for="(part, idx) of parts" :key="idx"
      :class="{
        'text-white font-exo2 font-semibold': part.placeholder,
        'text-gray-200': !part.placeholder
      }"
      >{{ part.text }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue'

const props = defineProps<{
  text: string
  roll?: number
  /** woke: one value per #, in order ("Adds 30 to 60"), over roll for each. */
  rolls?: readonly number[]
}>()

const parts = computed(() => {
  const res = [] as Array<{ text: string, placeholder?: boolean }>
  let n = 0
  props.text.split(/(?<![#])[+-]?[#]/gm).forEach((text, idx, parts) => {
    if (text !== '') {
      res.push({ text })
    }
    if (idx !== (parts.length - 1)) {
      const own = props.rolls?.[n++]
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
    }
  })
  return res
})
</script>
