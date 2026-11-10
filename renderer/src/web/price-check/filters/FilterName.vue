<template>
  <!-- woke: PoE mode puts the same parts in a 2x2 grid: name | poe.ninja, scope and chips | numbers. -->
  <div class="filter-name" :class="{ 'w-poe-head': poe }">
    <div class="filter-name-main">
      <div class="filter-name-title">
        <!-- woke: with a Generic/Base choice, clicking the name switches it: the category, or this base type. -->
        <button v-if="filters.searchRelaxed" type="button" class="filter-name-label filter-name-cycle" data-scope-cycle
          :data-rarity="item.rarity" :title="`${label}. Click to search ${filters.searchRelaxed.disabled ? 'any item of this category' : 'only this base type'}.`"
          @click="setScope(filters.searchRelaxed.disabled ? 'generic' : 'base')">{{ label }}<i class="fas fa-right-left filter-name-swap" aria-hidden="true" /></button>
        <span v-else class="filter-name-label" :data-rarity="item.rarity" :title="label">{{ label }}</span>
        <span v-if="baseName" class="filter-name-base">{{ baseName }}</span>
      </div>
      <div class="filter-name-chips">
        <button v-if="filters.corrupted" type="button" data-corrupted-chip
          class="filter-name-corrupted" :class="{ on: filters.corrupted.search === 'corrupted' }"
          title="Corrupted filter. Click to change: Any, Corrupted, Uncorrupted."
          @click="cycleCorrupted">
          <!-- The Vaal Orb says what the chip is about. Every label stays in the grid cell,
               so the chip keeps its width and stays under the mouse. -->
          <w-icon item="Vaal Orb" size="sm" title="" />
          <span class="filter-name-corrupted-labels">
            <span v-for="state of corruptedStates" :key="state.search"
              :class="{ shown: state.search === filters.corrupted.search }">{{ t(state.label) }}</span>
          </span>
        </button>
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
        <slot v-if="!poe" />
      </div>
      <div v-if="poe" class="w-poe-head-aside"><slot /></div>
    </div>
    <div class="filter-name-tiles">
      <filter-btn-numeric :chip="poe" v-if="filters.linkedSockets" :limit="NUMERIC_LIMITS.links"
        :filter="filters.linkedSockets" :name="t('item.linked_sockets')" />
      <filter-btn-numeric :chip="poe" v-if="filters.mapTier" :limit="NUMERIC_LIMITS.mapTier"
        :filter="filters.mapTier" :name="t('item.map_tier')" />
      <filter-btn-numeric :chip="poe" v-if="filters.areaLevel" :limit="NUMERIC_LIMITS.areaLevel"
        :filter="filters.areaLevel" :name="t('item.area_level')" />
      <filter-btn-numeric :chip="poe" v-if="filters.sentinelCharge"
        :filter="filters.sentinelCharge" :name="t('item.sentinel_charge')" />
      <filter-btn-numeric :chip="poe" v-if="filters.itemLevel" :limit="NUMERIC_LIMITS.itemLevel"
        :filter="filters.itemLevel" :name="t('trade_result.item_level')" />
      <filter-btn-numeric :chip="poe" v-if="filters.stackSize"
        :filter="filters.stackSize" :name="t('item.stock')" />
      <filter-btn-numeric :chip="poe" v-if="filters.whiteSockets" :limit="NUMERIC_LIMITS.sockets"
        :filter="filters.whiteSockets" :name="t('item.white_sockets')" />
      <filter-btn-numeric :chip="poe" v-if="filters.gemLevel" :limit="NUMERIC_LIMITS.gemLevel"
        :filter="filters.gemLevel" :name="t('item.gem_level')" />
      <filter-btn-numeric :chip="poe" v-if="filters.quality" :limit="NUMERIC_LIMITS.quality"
        :filter="filters.quality" :name="t('item.quality')" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ParsedItem } from '@/parser'
import type { CorruptedSearch, ItemFilters } from './interfaces'
import { CATEGORY_TO_TRADE_ID } from '../trade/pathofexile-trade'
import { WIcon } from '@/web/woke/ui'
import FilterBtnNumeric from './FilterBtnNumeric.vue'
import { NUMERIC_LIMITS } from './numeric-limits'
import FilterBtnLogical from './FilterBtnLogical.vue'
import { poeOn } from '@/web/woke/price-insight/window-style'

export default defineComponent({
  name: 'FilterName',
  components: { FilterBtnNumeric, FilterBtnLogical, WIcon },
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

    // The title is what the search looks for, so clicking it to switch scope changes it.
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

    const corruptedStates: Array<{ search: CorruptedSearch, label: string }> = [
      { search: 'any', label: 'item.corrupted_any' },
      { search: 'corrupted', label: 'item.corrupted' },
      { search: 'not-corrupted', label: 'item.not_corrupted' }
    ]
    function cycleCorrupted () {
      const filter = props.filters.corrupted!
      const at = corruptedStates.findIndex(state => state.search === filter.search)
      filter.search = corruptedStates[(at + 1) % corruptedStates.length].search
    }

    return {
      t,
      poe: poeOn,
      NUMERIC_LIMITS,
      label,
      baseName,
      setScope,
      corruptedStates,
      cycleCorrupted,
      searchSub: computed(() => activeSearch.value.sub)
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
/* woke: the name and its chips share one row, and wrap only when they don't fit. */
.filter-name-main {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px 12px;
  min-width: 0;
}
.filter-name-title {
  display: flex;
  flex: 0 1 auto;
  max-width: 100%;
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
.filter-name-cycle { cursor: pointer; text-align: left; min-width: 0; }
.filter-name-cycle:hover { text-decoration: underline dotted; text-underline-offset: 4px; }
/* The swap mark says the name is a switch; it lights with the name on hover. */
.filter-name-swap {
  margin-left: 6px;
  font-size: calc(10px * var(--w-text-scale, 1));
  vertical-align: middle;
  color: var(--w-faint);
}
.filter-name-cycle:hover .filter-name-swap { color: var(--w-dim); }
.filter-name-base {
  flex: none;
  font-size: calc(12px * var(--w-text-scale, 1));
  color: var(--w-dim);
}
/* Takes what the title leaves and wraps inside, so the first chips stay beside the title. */
.filter-name-chips {
  display: flex;
  flex: 1 1 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.filter-name-chips:empty { display: none; }
.filter-name-corrupted {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: calc(24px * var(--w-text-scale, 1));
  padding: 0 8px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-radius-sm);
  color: var(--w-dim);
  font-size: calc(13px * var(--w-text-scale, 1));
  white-space: nowrap;
}
/* The chip's own title shows over the orb too. */
.filter-name-corrupted img { pointer-events: none; }
.filter-name-corrupted-labels { display: inline-grid; justify-items: center; }
.filter-name-corrupted-labels > span { grid-area: 1 / 1; visibility: hidden; }
.filter-name-corrupted-labels > span.shown { visibility: visible; }
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
