<template>
  <component :is="tag" v-item-tip="item" :type="tag === 'button' ? 'button' : undefined" :tabindex="clickable ? -1 : undefined"
    data-item-row :class="[$style.row, { [$style.click]: clickable }]" @click="onClick">
    <WIcon v-if="art !== false" :src="artSrc" size="sm" />
    <slot :art="artSrc" />
  </component>
</template>

<script setup lang="ts">
// One item in a list, the same in every list: its art, the game tooltip on
// hover, the item menu on right-click, and one left-click:
//   'price-check' opens the price check at the cursor,
//   'trade' opens the trade site,
//   'pick' is the list's own action (emits pick),
//   none does nothing.
// The row's layout is the list's: pass a class, put the cells in the slot.
// The art comes first; for art inside a cell, pass :art="false" and draw the
// slot's `art` prop where it goes (it is still looked up).
import { computed } from 'vue'
import type { BaseType } from '@/assets/data'
import WIcon from './WIcon.vue'
import { itemArt } from './game-icons'
import { vItemTip } from './tooltip/item-tip'
import type { ItemTipRef } from './tooltip/item-tip'
import { cursorPoint, openPriceCheck } from './tooltip/item-price-check'
import { openTrade } from './tooltip/item-menu'

export type ItemRowAction = 'price-check' | 'trade' | 'pick'

const props = withDefaults(defineProps<{
  // The tooltip and menu's item; null shows neither.
  item: ItemTipRef | null
  // Art: a source (null: a blank box), or looked up from `item` when left out.
  // false: no icon first; the slot's `art` has it.
  art?: string | null | false
  action?: ItemRowAction | null
  // The data item, when the list knows it (a unique on one of several bases).
  info?: BaseType
  disabled?: boolean
  // The element, for rows that must be one (a table row): 'tr'. A clickable
  // row is a button otherwise.
  as?: string
}>(), { art: undefined, action: null, info: undefined, disabled: false, as: undefined })

const emit = defineEmits<{ pick: [e: MouseEvent] }>()

const artSrc = computed(() => {
  if (props.art !== undefined && props.art !== false) return props.art ?? undefined
  return props.item ? itemArt(props.item) ?? undefined : undefined
})

const clickable = computed(() => props.action != null && !props.disabled)
const tag = computed(() => props.as ?? (clickable.value ? 'button' : 'div'))

async function onClick (e: MouseEvent) {
  if (!clickable.value) return
  if (props.action === 'pick') { emit('pick', e); return }
  const ref = props.item?.menu ?? (props.item ? { name: props.item.name, type: props.item.type, variant: props.item.variant } : null)
  if (!ref) return
  if (props.action === 'price-check') await openPriceCheck(ref, cursorPoint(e), props.info)
  else if (props.action === 'trade') openTrade(ref)
}
</script>

<style module>
.row { width: 100%; text-align: left; }
.click { cursor: pointer; }
.click:hover { background: var(--w-panel-2); }
</style>
