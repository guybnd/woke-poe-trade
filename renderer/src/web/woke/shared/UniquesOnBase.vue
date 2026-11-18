<template>
  <div :class="$style.list">
    <div :class="[$style.row, $style.head]">
      <span>{{ title }}</span>
      <span class="text-right"><slot name="aside">Price</slot></span>
    </div>
    <template v-for="(u, i) in shown" :key="u.key">
      <div v-if="u.restricted && (i === 0 || !shown[i - 1].restricted)" :class="$style.split" data-testid="restricted-split">
        Not a random drop · {{ restrictedCount }}
      </div>
      <WItemRow :item="u.tip ?? { name: u.refName }" :art="false" :info="u.info" :action="u.pick ? 'pick' : u.check ? 'price-check' : null"
        :class="[$style.row, { [$style.own]: u.own, [$style.restricted]: u.restricted }]" data-testid="unique-on-base" @pick="emit('pick', u)">
        <template #default="{ art }">
          <span :class="$style.name">
            <WIcon :src="u.art ?? art" size="sm" />
            <span class="w-trunc w-rarity-unique">{{ u.name }}</span>
            <span v-if="u.restricted" :class="$style.source" :title="u.restricted.title" data-testid="drop-source">{{ u.restricted.label }}</span>
            <span v-if="u.setsTier" :class="$style.tag" title="Your price tiers moved this base to its tier for this unique's price">sets tier</span>
          </span>
          <span v-if="u.price" :class="[$style.range, { 'w-faint': u.price.thin }]" :title="u.price.thin ? 'Few listings: poe.ninja often had no price for it this week' : undefined">
            <template v-if="u.price.low !== u.price.high"><WPrice :bulk="u.price.bulk" :chaos="u.price.low" :divine="divine" /> to </template><WPrice :bulk="u.price.bulk" :chaos="u.price.high" :divine="divine" />
          </span>
          <span v-else class="w-dim text-right">{{ noPrice }}</span>
          <span v-if="u.foulborn" :class="$style.foulborn">
            Foulborn up to <WPrice :chaos="u.foulborn.max" :divine="divine" />{{ u.foulborn.thin ? ', few listings' : '' }}
          </span>
        </template>
      </WItemRow>
    </template>
    <button v-if="limit && (all || rows.length > shown.length)" type="button" class="w-focusable" :class="$style.more" @click="all = !all">
      {{ all ? 'Fewer' : `${rows.length - shown.length} more` }}
    </button>
  </div>
</template>

<script setup lang="ts">
// A base's uniques, the same list in Search and on the Alt+F card: art,
// tooltip and item menu on every row, price or range, and the extras a list
// has (the unique that set the base's tier, the Foulborn range, the copy you
// hold). A click opens the row (`pick`) or price checks it (`check`).
import { computed, ref, watch } from 'vue'
import WIcon from '../ui/WIcon.vue'
import WItemRow from '../ui/WItemRow.vue'
import WPrice from '../ui/WPrice.vue'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import type { BaseType } from '@/assets/data'
import type { DropSource } from '../ui/tooltip/tip-content'

export interface UniqueOnBaseRow {
  key: string
  // As shown (the game's language), and the English name the data knows.
  name: string
  refName: string
  // Tooltip and menu item, when the list has a better one than the name.
  tip?: ItemTipRef
  art?: string
  price: { low: number, high: number, bulk?: boolean, thin?: boolean } | null
  setsTier?: boolean
  own?: boolean
  foulborn?: { max: number, thin: boolean } | null
  // Not a random drop on this base: where it comes from. Pass these rows
  // last (randomDropsFirst); a divider goes above the first.
  restricted?: DropSource | null
  // Click: the list's own action (`pick`), or a price check of the unique
  // (`check`, on this base: `info`).
  pick?: boolean
  check?: boolean
  info?: BaseType
}

const props = withDefaults(defineProps<{
  rows: UniqueOnBaseRow[]
  title: string
  divine: number | null
  noPrice?: string
  // Rows shown before "N more".
  limit?: number
  // Folds back to `limit` when this changes (a new base).
  resetKey?: string
}>(), { noPrice: 'no price', limit: 0, resetKey: '' })

const emit = defineEmits<{ pick: [row: UniqueOnBaseRow] }>()

const all = ref(false)
watch(() => props.resetKey, () => { all.value = false })
// The unique that set the tier and the copy you hold stay in view past the cut.
const shown = computed(() => (!props.limit || all.value) ? props.rows : props.rows.filter((u, i) => i < props.limit || u.setsTier || u.own))
const restrictedCount = computed(() => props.rows.filter(u => u.restricted).length)
</script>

<style module>
.list { display: flex; flex-direction: column; }
.row { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 6px; align-items: center; width: 100%; min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); }
.head { margin-top: var(--w-s3); min-height: calc(24px * var(--w-text-scale, 1)); font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); border-bottom: 1px solid var(--w-line); font-family: var(--w-caps-face); }
.name { display: flex; align-items: center; gap: var(--w-s2); min-width: 0; }
.range { flex: none; display: inline-flex; align-items: center; gap: 4px; }
.own { background: var(--w-accent-soft); }
.tag { flex: none; font-size: var(--w-fs-xs); color: var(--w-accent); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); padding: 0 4px; line-height: 1.3; }
.split { margin-top: var(--w-s2); padding: 2px 0; font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); font-family: var(--w-caps-face); color: var(--w-faint); border-bottom: 1px solid var(--w-line); }
.restricted { opacity: 0.6; }
.restricted:hover, .restricted:focus-visible { opacity: 1; }
.source { flex: none; font-size: var(--w-fs-xs); line-height: 1.3; padding: 0 4px; border-radius: var(--w-r-sm); color: var(--w-mod-corrupted); border: 1px solid color-mix(in srgb, var(--w-mod-corrupted) 55%, transparent); max-width: 14em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.foulborn { grid-column: 1 / -1; padding-left: calc(var(--w-icon-sm) + var(--w-s2)); font-size: var(--w-fs-xs); color: var(--w-faint); }
.more { align-self: flex-start; padding: 2px 0; font-size: var(--w-fs-xs); color: var(--w-dim); text-align: left; }
.more:hover { color: var(--w-fg); }
</style>
