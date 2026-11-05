<template>
  <div class="filter-name">
    <div class="filter-name-main">
      <div class="filter-name-title">
        <span class="filter-name-label" :data-rarity="item.rarity" :title="label">{{ label }}</span>
        <span v-if="baseName" class="filter-name-base">{{ baseName }}</span>
      </div>
      <div class="filter-name-chips">
        <w-segmented v-if="filters.searchRelaxed" data-search-scope
          :model-value="filters.searchRelaxed.disabled ? 'base' : 'generic'"
          :options="scopeOptions"
          title="What the search looks for. Generic: any item of this category. Base: only this base type."
          @update:model-value="setScope" />
        <button v-if="filters.corrupted" type="button"
          class="filter-name-corrupted" :class="{ on: corrupted }"
          @click="corrupted = !corrupted">{{ t(corrupted ? 'item.corrupted' : 'item.not_corrupted') }}</button>
        <filter-btn-logical v-if="searchSub"
          :filter="searchSub" :text="searchSub.name ?? searchSub.baseType!" />
        <filter-btn-logical v-if="filters.mapCompletionReward" readonly
          :filter="{ disabled: false }" :text="t('item.map_foil_reward', [filters.mapCompletionReward.name])" />
        <template v-if="filters.influences">
          <filter-btn-logical v-for="influence of filters.influences" :key="influence.value"
            :filter="influence" :text="influence.value" :img="`/images/influence-${influence.value}.png`" />
        </template>
        <filter-btn-logical v-if="filters.rarity?.value === 'magic'"
          :filter="filters.rarity" text="Magic" />
        <filter-btn-logical v-if="filters.unidentified"
          :filter="filters.unidentified" :text="t('item.unidentified')" />
        <filter-btn-logical v-if="filters.veiled"
          :filter="filters.veiled" :text="t('item.veiled')" />
        <filter-btn-logical v-if="filters.foil"
          :filter="filters.foil" :text="t('item.foil_unique')" />
        <filter-btn-logical v-if="filters.mirrored && !filters.mirrored.hidden" active
          :filter="filters.mirrored" :text="t(filters.mirrored.disabled ? 'item.not_mirrored' : 'item.mirrored')" />
        <filter-btn-logical v-if="filters.split && !filters.split.hidden" active
          :filter="filters.split" :text="t(filters.split.disabled ? 'item.not_split' : 'item.split')" />
        <slot name="meta" />
        <slot />
      </div>
    </div>
    <div class="filter-name-tiles">
      <filter-btn-numeric v-if="filters.linkedSockets"
        :filter="filters.linkedSockets" :name="t('item.linked_sockets')" />
      <filter-btn-numeric v-if="filters.mapTier"
        :filter="filters.mapTier" :name="t('item.map_tier')" />
      <filter-btn-numeric v-if="filters.areaLevel"
        :filter="filters.areaLevel" :name="t('item.area_level')" />
      <filter-btn-numeric v-if="filters.sentinelCharge"
        :filter="filters.sentinelCharge" :name="t('item.sentinel_charge')" />
      <filter-btn-numeric v-if="filters.itemLevel"
        :filter="filters.itemLevel" :name="t('trade_result.item_level')" />
      <filter-btn-numeric v-if="filters.stackSize"
        :filter="filters.stackSize" :name="t('item.stock')" />
      <filter-btn-numeric v-if="filters.whiteSockets"
        :filter="filters.whiteSockets" :name="t('item.white_sockets')" />
      <filter-btn-numeric v-if="filters.gemLevel"
        :filter="filters.gemLevel" :name="t('item.gem_level')" />
      <filter-btn-numeric v-if="filters.quality"
        :filter="filters.quality" :name="t('item.quality')" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from './interfaces'
import { CATEGORY_TO_TRADE_ID } from '../trade/pathofexile-trade'
import { WSegmented } from '@/web/woke/ui'
import FilterBtnNumeric from './FilterBtnNumeric.vue'
import FilterBtnLogical from './FilterBtnLogical.vue'

export default defineComponent({
  name: 'FilterName',
  components: { FilterBtnNumeric, FilterBtnLogical, WSegmented },
  props: {
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    }
  },
  setup (props) {
    const { t } = useI18n()

    const activeSearch = computed(() => {
      const { filters } = props
      return (filters.searchRelaxed && !filters.searchRelaxed.disabled)
        ? filters.searchRelaxed
        : filters.searchExact
    })

    // The title is what the search looks for, so the switch below it changes the title.
    const label = computed(() => {
      const search = activeSearch.value

      if (search.name) {
        return search.name
      }
      if (search.baseType) {
        return search.baseType
      }
      if (search.category) {
        const tradeId = CATEGORY_TO_TRADE_ID.get(search.category)!
        return t(`item_category.${tradeId.replace('.', '_')}`)
      }

      return '??? Report if you see this text'
    })

    const baseName = computed(() => {
      const { item, filters } = props
      if (item.uniqueBase) return item.uniqueBase.name
      if (filters.searchRelaxed) return ''
      return (item.info.name !== label.value) ? item.info.name : ''
    })

    function setScope (scope: string) {
      const { filters } = props
      if (filters.searchRelaxed) {
        filters.searchRelaxed.disabled = (scope === 'base')
      }
    }

    const corrupted = computed<boolean>({
      get () { return props.filters.corrupted!.value },
      set (value) { props.filters.corrupted!.value = value }
    })

    return {
      t,
      label,
      baseName,
      setScope,
      corrupted,
      searchSub: computed(() => activeSearch.value.sub),
      scopeOptions: [
        { value: 'generic', label: 'Generic' },
        { value: 'base', label: 'Base' }
      ]
    }
  }
})
</script>

<style lang="postcss">
.filter-name {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 0.5rem;
}
.filter-name-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.filter-name-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}
.filter-name-label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: calc(18px * var(--w-text-scale, 1));
  line-height: calc(24px * var(--w-text-scale, 1));
}
.filter-name-base {
  flex: none;
  font-size: calc(12px * var(--w-text-scale, 1));
  color: var(--w-dim);
}
.filter-name-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.filter-name-chips:empty { display: none; }
.filter-name-corrupted {
  min-height: calc(24px * var(--w-text-scale, 1));
  padding: 0 8px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-radius-sm);
  color: var(--w-dim);
  font-size: calc(13px * var(--w-text-scale, 1));
  white-space: nowrap;
}
.filter-name-corrupted:hover { color: var(--w-fg); }
.filter-name-corrupted.on {
  border-color: var(--w-down);
  color: var(--w-down);
}
.filter-name-tiles {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  max-width: 60%;
}
.filter-name-tiles:empty { display: none; }

/* woke: the title is the top of the window, in the game's rarity colours. */
:root:not([data-woke-theme="classic"]) .filter-name-label { color: var(--w-fg); }
:root:not([data-woke-theme="classic"]) .filter-name-label[data-rarity="Normal"] { color: var(--w-r-normal); }
:root:not([data-woke-theme="classic"]) .filter-name-label[data-rarity="Magic"] { color: var(--w-r-magic); }
:root:not([data-woke-theme="classic"]) .filter-name-label[data-rarity="Rare"] { color: var(--w-r-rare); }
:root:not([data-woke-theme="classic"]) .filter-name-label[data-rarity="Unique"] { color: #d98a4a; }
</style>
