<template>
  <!-- woke: PoE mode (window-style.ts). An unpicked stat row drawn as a tooltip line;
       clicking anywhere on it, empty space too, picks it, and FiltersBlock then draws it as a FilterModifier row. -->
  <div class="w-poe-line" :class="{ 'w-poe-child': isChild, 'w-poe-dimmed': isSplit, 'w-poe-hybrid': hybrid, 'w-poe-hybrid-first': hybrid?.first, 'w-poe-hybrid-last': hybrid?.last }"
    :title="hybrid ? 'One hybrid mod. Click to search it: each of its lines at the bottom of its tier.' : look.label"
    @click="onClick">
    <!-- A total opens from its tier (Guy's pick "tier opens it"), so no tag squeezes the text. -->
    <button v-if="canSplit" type="button" class="w-poe-tier w-poe-tier-open" :class="{ 'w-poe-t1': isTopTier(tier) }"
      :title="isSplit ? 'Fold its mods back into the total' : 'Show the mods behind this line'"
      @click="actions!.toggleSplit(filter)">{{ tier || `×${filter.sources.length}` }} {{ isSplit ? '▴' : '▾' }}</button>
    <span v-else-if="eldritch" class="w-poe-tier"><EldritchMark v-bind="eldritch" /></span>
    <span v-else class="w-poe-tier" :class="{ 'w-poe-t1': isTopTier(tier) }">{{ tier }}</span>
    <button type="button" class="w-poe-line-text" :class="`w-poe-k-${look.kind}`">
      <span v-if="look.corrupted" class="w-poe-corrupt" />
      <img v-else-if="look.icon" class="w-poe-icon" :src="look.icon" alt="">
      <img v-if="filter.mercenary?.icon" class="w-poe-icon" :src="filter.mercenary.icon" alt="">
      <span v-if="filter.not" class="w-poe-not">{{ t('filters.tag_not') }}</span>
      <item-modifier-text class="w-pc-modtext" :text="text" :roll="filter.roll?.value" :rolls="pair" />
    </button>
    <!-- A local line's own mod, once split out of the line two mods add up to. -->
    <span v-if="modName" class="w-poe-modname">{{ modName }}</span>
    <!-- The catalyst's Q tag, as on the picked row: it switches the catalyst quality filter, not the line. -->
    <button v-if="qTag != null" type="button" data-catalyst-tag
      class="w-poe-qtag" :class="{ on: qOn }"
      :title="qOn ? 'Only items with this catalyst quality or more. Click to search any quality.' : 'A catalyst raised this line. Click to only find items with the same catalyst quality.'"
      @click="catalyst!.toggle()">Q{{ qTag }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ItemModifierText from '@/web/ui/ItemModifierText.vue'
import { useStatActions } from '@/web/woke/price-insight/stat-actions'
import { poeLook, poeTier, isTopTier, eldritchMark } from '@/web/woke/price-insight/poe-kind'
import EldritchMark from '@/web/woke/price-insight/EldritchMark.vue'
import { tagQuality, useCatalystFilter } from '@/web/woke/price-insight/catalyst-filter'
import { rollPair } from '@/web/woke/price-insight/roll-pair'
import { INTERNAL_TRADE_IDS, StatFilter } from './interfaces'

const props = defineProps<{ filter: StatFilter }>()
const { t } = useI18n()
const actions = useStatActions()

const catalyst = useCatalystFilter()
const qTag = computed(() => catalyst?.filter.value ? tagQuality(props.filter, catalyst.filter.value) : undefined)
const qOn = computed(() => catalyst?.filter.value?.disabled === false)
const look = computed(() => poeLook(props.filter))
const tier = computed(() => poeTier(props.filter))
const eldritch = computed(() => eldritchMark(props.filter))
const canSplit = computed(() => actions?.canSplit(props.filter) ?? false)
const isSplit = computed(() => actions?.isSplit(props.filter) ?? false)
const isChild = computed(() => actions?.isChild(props.filter) ?? false)
const hybrid = computed(() => actions?.hybridPart(props.filter))
const pair = computed(() => rollPair(props.filter))
const modName = computed(() => {
  if (!props.filter.inTotal || !isChild.value) return ''
  const info = props.filter.sources[0]?.modifier.info
  if (!info?.name) return ''
  return hybrid.value?.first ? `${info.name} · hybrid` : info.name
})
const text = computed(() => INTERNAL_TRADE_IDS.includes(props.filter.tradeId[0])
  ? t(props.filter.tradeId[0], ['#', '#'])
  : props.filter.text)

// Anywhere on the line picks it, apart from its own Q tag and split buttons.
// No stopPropagation on those: the overlay's own click listeners must still see every click.
function onClick (e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('button')
  if (btn && !btn.classList.contains('w-poe-line-text')) return
  pick()
}

function pick () {
  // A line of a hybrid's box searches the whole mod.
  if (hybrid.value) actions!.searchMod(props.filter)
  else {
    // A total that's open shows its mods instead; picking it folds them back first.
    if (isSplit.value) actions!.toggleSplit(props.filter)
    props.filter.disabled = false
  }
}
</script>
