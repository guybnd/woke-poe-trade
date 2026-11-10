<template>
  <div :class="$style.titlebar" data-price-title>
    <slot />
    <button @click="emit('click')" class="truncate" data-price-title-text>{{ title }}</button>
    <slot name="end" />
    <button @click.stop="emit('close')" tabindex="-1" data-price-close
      :class="[$style.button, $style.close]" title="Close"><i class="fas fa-window-close"></i></button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
}>()

const emit = defineEmits<{
  (e: 'click' | 'close'): void
}>()
</script>

<style lang="postcss" module>
.titlebar {
  @apply bg-gray-900 text-gray-600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: calc(1.5rem * var(--w-text-scale, 1));
  line-height: calc(1.5rem * var(--w-text-scale, 1));
  /* woke: a full-height window must not squeeze the bar, which nudged everything below it. */
  flex-shrink: 0;

  button {
    @apply px-2 pt-px;

    &:hover {
      @apply text-gray-400;
      background: linear-gradient(to top, theme('colors.gray.900'), theme('colors.gray.700'))
    }

    &.close:hover {
      @apply text-red-200;
      background: theme('colors.red.500');
    }
  }
}
</style>
