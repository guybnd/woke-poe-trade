<template>
  <component :is="clickable ? 'button' : 'span'" :type="clickable ? 'button' : undefined"
    :class="['w-chip', { on: active }]">
    <slot />
  </component>
</template>

<script setup lang="ts">
// The look is in controls.css (.w-chip).
withDefaults(defineProps<{ active?: boolean, clickable?: boolean }>(), { active: false, clickable: false })
</script>
