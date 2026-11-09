<template>
  <!-- woke: PoE mode (window-style.ts). An unpicked stat row drawn as a tooltip line;
       clicking it picks it, and FiltersBlock then draws it as a FilterModifier row. -->
  <div class="w-poe-line" :class="{ 'w-poe-child': isChild, 'w-poe-dimmed': isSplit }" :title="look.label">
    <span class="w-poe-tier" :class="{ 'w-poe-t1': tier === 'T1' }">{{ tier }}</span>
    <button type="button" class="w-poe-line-text" :class="`w-poe-k-${look.kind}`" @click="pick">
      <span v-if="look.corrupted" class="w-poe-corrupt" />
      <img v-else-if="look.icon" class="w-poe-icon" :src="look.icon" alt="">
      <img v-if="filter.mercenary?.icon" class="w-poe-icon" :src="filter.mercenary.icon" alt="">
      <span v-if="filter.not" class="w-poe-not">{{ t('filters.tag_not') }}</span>
      <item-modifier-text class="w-pc-modtext" :text="text" :roll="filter.roll?.value" />
    </button>
    <button v-if="canSplit" type="button" class="w-poe-ptag"
      :title="isSplit ? 'Fold its mods back into the total' : 'Split into the mods behind this total, each with its own min and ⇄'"
      @click="actions!.toggleSplit(filter)">Pseudo ×{{ filter.sources.length }} {{ isSplit ? '▴' : '▾' }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ItemModifierText from '@/web/ui/ItemModifierText.vue'
import { useStatActions } from '@/web/woke/price-insight/stat-actions'
import { poeLook, poeTier } from '@/web/woke/price-insight/poe-kind'
import { INTERNAL_TRADE_IDS, StatFilter } from './interfaces'

const props = defineProps<{ filter: StatFilter }>()
const { t } = useI18n()
const actions = useStatActions()

const look = computed(() => poeLook(props.filter))
const tier = computed(() => poeTier(props.filter))
const canSplit = computed(() => actions?.canSplit(props.filter) ?? false)
const isSplit = computed(() => actions?.isSplit(props.filter) ?? false)
const isChild = computed(() => actions?.isChild(props.filter) ?? false)
const text = computed(() => INTERNAL_TRADE_IDS.includes(props.filter.tradeId[0])
  ? t(props.filter.tradeId[0], ['#', '#'])
  : props.filter.text)

function pick () {
  props.filter.disabled = false
}
</script>
