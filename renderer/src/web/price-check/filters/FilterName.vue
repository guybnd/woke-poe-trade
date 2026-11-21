<template>
  <!-- woke: PoE mode puts the same parts in a 2x2 grid: name | poe.ninja, scope and chips | numbers. -->
  <div class="filter-name" :class="{ 'w-poe-head': poe }">
    <div class="filter-name-main">
      <div class="filter-name-title">
        <!-- woke: with a Generic/Base choice, clicking the name switches it: the category, or this base type. -->
        <!-- woke: a cluster jewel's title picks another size and type (WOKEPOET-366). -->
        <cluster-type-pick v-if="clusterSize && stats" :item="item" :filters="filters" :stats="stats" :own-size="clusterSize" />
        <button v-else-if="filters.searchRelaxed" type="button" class="filter-name-label filter-name-cycle" data-scope-cycle
          :data-rarity="item.rarity" :title="`${label}. Click to search ${filters.searchRelaxed.disabled ? 'any item of this category' : 'only this base type'}.`"
          @click="setScope(filters.searchRelaxed.disabled ? 'generic' : 'base')">{{ label }}<i class="fas fa-right-left filter-name-swap" aria-hidden="true" /></button>
        <span v-else class="filter-name-label" :data-rarity="item.rarity" :title="label">{{ label }}</span>
        <span v-if="baseName" class="filter-name-base">{{ baseName }}</span>
      </div>
      <div class="filter-name-chips">
        <!-- The title's scope switch, moved here while the title picks the type. -->
        <button v-if="clusterSize && stats && filters.searchRelaxed" type="button" data-cluster-scope
          class="filter-name-corrupted" :class="{ on: !filters.searchRelaxed.disabled }"
          :title="filters.searchRelaxed.disabled ? 'Searching this size only. Click to search every size.' : 'Searching every size. Click to search this size only.'"
          @click="setScope(filters.searchRelaxed.disabled ? 'generic' : 'base')">{{ filters.searchRelaxed.disabled ? 'This size' : 'Any size' }}</button>
        <button v-if="filters.corrupted" type="button" data-corrupted-chip
          class="filter-name-corrupted" :class="{ on: filters.corrupted.search === 'corrupted' }"
          title="Corrupted filter. Click to change: Any, Corr (corrupted only), Not (uncorrupted only)."
          @click="cycleCorrupted">
          <!-- The Vaal Orb says what the chip is about. Every label stays in the grid cell,
               so the chip keeps its width and stays under the mouse. -->
          <w-icon item="Vaal Orb" size="sm" title="" />
          <span class="filter-name-corrupted-labels">
            <span v-for="state of corruptedStates" :key="state.search"
              :class="{ shown: state.search === filters.corrupted.search }">{{ state.label }}</span>
          </span>
        </button>
        <filter-btn-logical v-if="searchSub"
          :filter="searchSub" :text="searchSub.name ?? searchSub.baseType!" />
        <filter-btn-logical v-if="filters.mapCompletionReward && !filters.mapCompletionReward.disabled" readonly
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
      <!-- woke: right-click Links to show or hide the socket colour tiles. -->
      <span v-if="filters.linkedSockets" class="filter-name-links" data-links-tile
        :title="item.sockets?.colours ? 'Right-click: socket colours' : undefined"
        @contextmenu="toggleColourTiles">
        <filter-btn-numeric :chip="poe" :limit="NUMERIC_LIMITS.links"
          :filter="filters.linkedSockets" :name="t('item.linked_sockets')" />
      </span>
      <!-- woke: one tile per socket colour, each "at least this many" (Guy's pick B). -->
      <template v-if="filters.socketColours">
        <span v-for="c of SOCKET_COLOURS" :key="c" class="filter-name-scol" :class="c" :data-socket-colour="c">
          <filter-btn-numeric :chip="poe" :limit="NUMERIC_LIMITS.sockets"
            :filter="filters.socketColours[c]" :name="c.toUpperCase()" />
        </span>
      </template>
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
import { ItemCategory, ItemRarity, type ParsedItem } from '@/parser'
import type { CorruptedSearch, ItemFilters } from './interfaces'
import { CATEGORY_TO_TRADE_ID } from '../trade/pathofexile-trade'
import { WIcon } from '@/web/woke/ui'
import FilterBtnNumeric from './FilterBtnNumeric.vue'
import { NUMERIC_LIMITS } from './numeric-limits'
import { socketColourFilters } from './create-item-filters'
import FilterBtnLogical from './FilterBtnLogical.vue'
import { poeOn } from '@/web/woke/price-insight/window-style'
import type { FilterOrGroup } from './interfaces'
import { clusterSizeOf } from '@/web/woke/cluster-type/apply'
import ClusterTypePick from '@/web/woke/cluster-type/ClusterTypePick.vue'

const SOCKET_COLOURS = ['r', 'g', 'b', 'w'] as const

export default defineComponent({
  name: 'FilterName',
  components: { FilterBtnNumeric, FilterBtnLogical, WIcon, ClusterTypePick },
  props: {
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    },
    // woke: the search's mod rows, for the cluster jewel type picker.
    stats: {
      type: Array as PropType<FilterOrGroup[]>,
      default: undefined
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
        const tradeId = search.categoryTrade ?? CATEGORY_TO_TRADE_ID.get(search.category)!
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

    // Short labels keep the chip small; its title says what they mean.
    const corruptedStates: Array<{ search: CorruptedSearch, label: string }> = [
      { search: 'any', label: 'Any' },
      { search: 'corrupted', label: 'Corr' },
      { search: 'not-corrupted', label: 'Not' }
    ]
    // Any linked item: right-click Links shows its colour tiles, off; again hides them unless one is on.
    function toggleColourTiles (e: MouseEvent) {
      // Anywhere on the tile, the number too: copy / paste of a link count isn't worth a dead spot.
      e.preventDefault()
      e.stopPropagation()
      const { filters, item } = props
      if (!filters.socketColours) {
        if (item.sockets?.colours) filters.socketColours = socketColourFilters(item.sockets.colours, false)
      } else if (Object.values(filters.socketColours).every(tile => tile.disabled)) {
        delete filters.socketColours
      }
    }

    function cycleCorrupted () {
      const filter = props.filters.corrupted!
      const at = corruptedStates.findIndex(state => state.search === filter.search)
      filter.search = corruptedStates[(at + 1) % corruptedStates.length].search
    }

    // A non-unique cluster jewel's size: its title becomes the size and type picker.
    const clusterSize = computed(() => {
      const { item } = props
      if (item.category !== ItemCategory.ClusterJewel || item.rarity === ItemRarity.Unique) return null
      return clusterSizeOf(item.info.refName)
    })

    return {
      t,
      poe: poeOn,
      SOCKET_COLOURS,
      toggleColourTiles,
      clusterSize,
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
.filter-name-links, .filter-name-scol { display: inline-flex; }
/* The colour tiles' letters in their socket colour. */
.filter-name-scol.r :is(.w-poe-nlab, [class*="label"]) { color: #e0645c; }
.filter-name-scol.g :is(.w-poe-nlab, [class*="label"]) { color: #7fc94f; }
.filter-name-scol.b :is(.w-poe-nlab, [class*="label"]) { color: #6f9cf0; }
.filter-name-scol.w :is(.w-poe-nlab, [class*="label"]) { color: #ece8de; }
#price-window.w-poe .filter-name-scol.r .w-poe-nlab { color: #e0645c; }
#price-window.w-poe .filter-name-scol.g .w-poe-nlab { color: #7fc94f; }
#price-window.w-poe .filter-name-scol.b .w-poe-nlab { color: #6f9cf0; }
#price-window.w-poe .filter-name-scol.w .w-poe-nlab { color: #ece8de; }
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
