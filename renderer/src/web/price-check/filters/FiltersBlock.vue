<template>
  <div>
    <!-- The roll presets stay mounted without stats: they ask poeprices for the item. -->
    <div :class="hasStats ? [$style.statHead, { [$style.open]: !statsVisibility.disabled }] : 'hidden'">
      <w-segmented v-if="presets.length > 1"
        :model-value="activePreset" :options="presetOptions"
        @update:model-value="selectPreset" />
      <button type="button" :class="$style.statBtn" :aria-expanded="!statsVisibility.disabled"
        @click="statsVisibility.disabled = !statsVisibility.disabled">
        <span>{{ (totalSelectedMods > 0)
          ? t((presets.length > 1) ? 'filters.selected_some_short' : 'filters.selected_some', [totalSelectedMods, stats.length])
          : t('filters.selected_none') }}</span>
        <i class="pl-1 text-xs" :class="statsVisibility.disabled ? 'fas fa-chevron-down' : 'fas fa-chevron-up'" />
      </button>
      <slot name="rolls" />
    </div>
    <div v-if="!statsVisibility.disabled && hasStats" class="mb-3">
      <form @submit.prevent="handleStatsSubmit">
        <template v-for="filter of filteredStats">
          <filter-group v-if="filter.group" :key="`group_${filter.meta.tag}_${filter.meta.text}`"
            :group="filter"
            :item="item" />
          <filter-modifier v-else :key="`${filter.tag}_${filter.text}`"
            :filter="filter"
            :item="item"
            :show-sources="showFilterSources" />
        </template>
        <div v-if="!filteredStats.length && !showUnknownMods"
          class="border-b border-gray-700 py-2">{{ t('filters.empty') }}</div>
        <template v-if="showUnknownMods">
          <unknown-modifier v-for="stat of item.unknownModifiers" :key="stat.type + '/' + stat.text"
            :stat="stat" />
        </template>
        <input type="submit" class="hidden" />
      </form>
      <div class="flex gap-x-4">
        <button @click="statsVisibility.disabled = !statsVisibility.disabled" class="bg-gray-700 px-2 py-1 text-gray-400 leading-none rounded-b w-40"
          >{{ t('filters.collapse') }} <i class="fas fa-chevron-up pl-1 text-xs text-gray-600"></i></button>
        <ui-toggle v-if="filteredStats.length !== stats.length" title="List the filters the price check keeps out of the way, such as rolls that can't vary, in place of the others. Doesn't change the search."
          v-model="showHidden" class="text-gray-400 pt-2">{{ t('filters.hidden_toggle') }}</ui-toggle>
        <ui-toggle title="Under the filters, show the item's mods behind them where known: prefix or suffix, name, tier and what each adds. Doesn't change the search."
          v-model="showFilterSources" class="ml-auto text-gray-400 pt-2">{{ t('filters.mods_toggle') }}</ui-toggle>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch, shallowRef, shallowReactive, computed, PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import UiToggle from '@/web/ui/UiToggle.vue'
import FilterModifier from './FilterModifier.vue'
import FilterGroup from './FilterGroup.vue'
import UnknownModifier from './UnknownModifier.vue'
import { WSegmented } from '@/web/woke/ui'
import { ItemFilters, FilterOrGroup } from './interfaces'
import { ParsedItem, ItemRarity, ItemCategory } from '@/parser'

export default defineComponent({
  name: 'FiltersBlock',
  emits: ['submit', 'preset'],
  components: {
    FilterModifier,
    FilterGroup,
    UnknownModifier,
    WSegmented,
    UiToggle
  },
  props: {
    presets: {
      type: Array as PropType<Array<{ id: string, active: boolean }>>,
      required: true
    },
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true
    },
    stats: {
      type: Array as PropType<FilterOrGroup[]>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    }
  },
  setup (props, ctx) {
    const statsVisibility = shallowReactive({ disabled: false })
    const showHidden = shallowRef(false)
    const showFilterSources = shallowRef(false)

    watch(() => props.item, () => {
      showHidden.value = false
      statsVisibility.disabled = false
    })

    const showUnknownMods = computed(() =>
      props.item.unknownModifiers.length &&
      props.item.category !== ItemCategory.Sentinel &&
      props.item.category !== ItemCategory.Map
    )

    const { t } = useI18n()

    return {
      t,
      statsVisibility,
      showHidden,
      showFilterSources,
      totalSelectedMods: computed(() => {
        return props.stats.filter(stat => {
          if (stat.group) {
            return !stat.meta.disabled
          }
          return !stat.disabled
        }).length
      }),
      filteredStats: computed(() => {
        const show = showHidden.value
        return props.stats.filter(s => {
          if (s.group) {
            return Boolean(s.meta.hidden) === show
          }
          return Boolean(s.hidden) === show
        })
      }),
      activePreset: computed(() => props.presets.find(preset => preset.active)?.id ?? ''),
      presetOptions: computed(() => props.presets.map(preset => ({ value: preset.id, label: t(preset.id) }))),
      showUnknownMods,
      hasStats: computed(() =>
        props.stats.length ||
        (showUnknownMods.value && props.item.rarity === ItemRarity.Unique) ||
        props.presets.length > 1),
      handleStatsSubmit () {
        ctx.emit('submit')
      },
      selectPreset (id: string) {
        ctx.emit('preset', id)
      }
    }
  }
})
</script>

<style module>
.statHead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-height: calc(32px * var(--w-text-scale, 1));
  padding-bottom: 4px;
  margin-bottom: 8px;
}
.statHead.open {
  margin-bottom: 0;
  border-bottom: 1px solid var(--w-line);
}
.statBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  color: var(--w-fg);
}
.statBtn i { color: var(--w-dim); }
.statBtn:hover i { color: var(--w-fg); }
</style>
