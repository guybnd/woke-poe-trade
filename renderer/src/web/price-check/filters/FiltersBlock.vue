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
      <!-- woke: one right-click listener for every row (price-insight/stat-actions.ts). -->
      <form @submit.prevent="handleStatsSubmit" @contextmenu="openRowMenu" :class="{ 'w-poe-well': poeMode }">
        <template v-for="{ filter, i } of shownStats">
          <!-- woke: PoE mode's gold lines between properties, enchants, implicits and the rest. -->
          <div v-if="poeMode && sepBefore.has(i)" :key="`sep_${i}`" class="w-poe-sep" />
          <filter-group v-if="filter.group" :key="`group_${filter.meta.tag}_${filter.meta.text}`"
            :class="{ [$style.hiddenRow]: isHiddenRow(filter) }"
            :group="filter"
            :item="item" />
          <component :is="poeKit!.FilterLinePoe" v-else-if="poeMode && filter.disabled" :key="`line_${filter.tag}_${filter.text}`"
            :class="{ [$style.hiddenRow]: isHiddenRow(filter) }"
            :data-stat-row="i"
            :filter="filter" />
          <filter-modifier v-else :key="`${filter.tag}_${filter.text}_${poeMode}`"
            :class="{ [$style.hiddenRow]: isHiddenRow(filter) }"
            :data-stat-row="i"
            :filter="filter"
            :item="item"
            :poe="poeMode" />
          <filter-sources v-if="showFilterSources && !filter.group && hasSourceInfo(filter)"
            :key="`src_${filter.tag}_${filter.text}`"
            :class="{ [$style.hiddenRow]: isHiddenRow(filter) }"
            :filter="filter" />
        </template>
        <div v-if="!filteredStats.length && !showUnknownMods"
          class="border-b border-gray-700 py-2">{{ t('filters.empty') }}</div>
        <template v-if="showUnknownMods">
          <unknown-modifier v-for="stat of item.unknownModifiers" :key="stat.type + '/' + stat.text"
            :stat="stat" />
        </template>
        <input type="submit" class="hidden" />
      </form>
      <!-- woke: the toggles keep their label on one line; with no room one moves to a second line. -->
      <div class="w-pc-stat-foot flex flex-wrap gap-x-4" :class="$style.foot">
        <button @click="statsVisibility.disabled = !statsVisibility.disabled" class="w-pc-collapse bg-gray-700 px-2 py-1 text-gray-400 leading-none rounded-b w-40 whitespace-nowrap"
          >{{ t('filters.collapse') }} <i class="fas fa-chevron-up pl-1 text-xs text-gray-600"></i></button>
        <ui-toggle v-if="hiddenCount > 0" title="Show the filters the price check keeps out of the way, such as rolls that can't vary, faded in among the others. Doesn't change the search."
          v-model="showHidden" class="text-gray-400 pt-2 whitespace-nowrap">{{ t('filters.hidden_toggle') }}</ui-toggle>
        <ui-toggle v-if="hasAnySources" title="Under each line, show the mods behind it: prefix or suffix, name, tier and what each adds. Doesn't change the search."
          v-model="showFilterSources" class="ml-auto text-gray-400 pt-2 whitespace-nowrap">{{ t('filters.mods_toggle') }}</ui-toggle>
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
import FilterSources, { hasSourceInfo } from './FilterSources.vue'
import { poeOn as poeMode, poeKit } from '@/web/woke/price-insight/window-style'
import type { PoeSection } from '@/web/woke/price-insight/poe-kind'
import UnknownModifier from './UnknownModifier.vue'
import { WSegmented } from '@/web/woke/ui'
import { ItemFilters, FilterOrGroup } from './interfaces'
import { ParsedItem, ItemRarity, ItemCategory } from '@/parser'
import { useStatActions } from '@/web/woke/price-insight/stat-actions'

export default defineComponent({
  name: 'FiltersBlock',
  emits: ['submit', 'preset'],
  components: {
    FilterModifier,
    FilterGroup,
    FilterSources,
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
    const actions = useStatActions()

    function isHiddenRow (s: FilterOrGroup): boolean {
      if (s.group) return Boolean(s.meta.hidden)
      // A local mod already in a property total is a hidden row in Standard only.
      return Boolean(s.hidden || (s.inTotal && !poeMode.value))
    }
    const hiddenCount = computed(() => props.stats.filter(isHiddenRow).length)
    // "Hidden filters" shows the hidden rows faded in their place among the rest.
    const filteredStats = computed(() => showHidden.value
      ? props.stats
      : props.stats.filter(s => !isHiddenRow(s)))

    // PoE mode lists rows in the tooltip's order: properties, enchants, implicits, the rest.
    // `i` stays the row's place in filteredStats, which the right-click menu reads.
    const SECTION_ORDER = { property: 0, enchant: 1, implicit: 2, explicit: 3 }
    const shownStats = computed(() => {
      let parent: PoeSection = 'explicit'
      const rows = filteredStats.value.map((filter, i) => {
        // A split total's mods stay under it, whatever kind each one is.
        const kit = poeKit.value
        if (!kit) return { filter, i, section: parent }
        const section = (!filter.group && actions?.isChild(filter))
          ? parent
          : (parent = kit.poeSection(filter.group ? filter.meta : filter))
        return { filter, i, section }
      })
      if (!poeMode.value) return rows
      return rows.sort((a, b) => SECTION_ORDER[a.section] - SECTION_ORDER[b.section] || a.i - b.i)
    })
    // The rows a gold separator goes above.
    const sepBefore = computed(() => {
      const out = new Set<number>()
      const rows = shownStats.value
      for (let k = 1; k < rows.length; k++) {
        if (rows[k].section !== rows[k - 1].section) out.add(rows[k].i)
      }
      return out
    })

    return {
      t,
      poeMode,
      poeKit,
      shownStats,
      sepBefore,
      openRowMenu (e: MouseEvent) {
        const row = (e.target as HTMLElement).closest<HTMLElement>('[data-stat-row]')
        const filter = row && filteredStats.value[Number(row.dataset.statRow)]
        if (!actions || !filter || filter.group) return
        // Typing in a min or max keeps the usual text menu.
        if ((e.target as HTMLElement).closest('input')) return
        e.preventDefault()
        actions.menu(e, filter)
      },
      statsVisibility,
      showHidden,
      showFilterSources,
      isHiddenRow,
      hiddenCount,
      hasSourceInfo,
      hasAnySources: computed(() => filteredStats.value.some(s => !s.group && hasSourceInfo(s))),
      totalSelectedMods: computed(() => {
        return props.stats.filter(stat => {
          if (stat.group) {
            return !stat.meta.disabled
          }
          return !stat.disabled
        }).length
      }),
      filteredStats,
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
/* The toggles a step smaller than the window's text, so both fit beside Collapse. */
.foot > button + button { font-size: .85em; }
/* A row "Hidden filters" brought back: faded until pointed at. */
.hiddenRow { opacity: .5; transition: opacity .1s; }
.hiddenRow:hover { opacity: .85; }
</style>
