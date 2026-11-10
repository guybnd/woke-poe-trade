<template>
  <component :is="href ? 'a' : 'button'" :type="href ? undefined : 'button'" :href="href" :target="href ? '_blank' : undefined"
    :class="['w-btn', `w-btn--${variant}`, { 'w-btn--sm': size === 'sm' }]">
    <i v-if="icon" :class="icon" />
    <slot />
  </component>
</template>

<script setup lang="ts">
// The look is in controls.css (.w-btn), shared with APT's .btn and the price check's buttons.
withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  icon?: string
  href?: string
}>(), { variant: 'default', size: 'md', icon: undefined, href: undefined })
</script>
