<template>
  <button :class="[$style.btn, 'w-logical', 'w-skin-chip', { [$style.active]: (active != null) ? active : !filter.disabled, on: (active != null) ? active : !filter.disabled }]"
    @click="toggle"
  >
    <img v-if="img" :src="img" class="w-5 h-5">
    <span>{{ t(text) }}</span>
  </button>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  filter: {
    type: Object as PropType<{ disabled: boolean }>, // will be mutated directly, instead of emit
    required: true
  },
  text: { type: String, required: true },
  img: { type: String, default: undefined },
  readonly: { type: Boolean, default: undefined },
  active: { type: Boolean, default: undefined }
})

const { t } = useI18n()

function toggle () {
  const { filter, readonly } = props
  if (!readonly) {
    filter.disabled = !filter.disabled
  }
}
</script>

<style module>
/* The plain look; the game look reskins .w-skin-chip (ui/controls.css). */
.btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  min-height: calc(24px * var(--w-text-scale, 1));
  padding: 0 8px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-radius-sm);
  color: var(--w-faint);
  font-size: calc(13px * var(--w-text-scale, 1));
  white-space: nowrap;
}
.btn:hover { color: var(--w-fg); }
.btn.active {
  background: var(--w-accent-soft);
  border-color: var(--w-line-strong);
  color: var(--w-fg);
}
</style>
