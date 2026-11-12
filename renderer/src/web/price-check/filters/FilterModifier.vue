<template>
  <div :class="[$style.filter, { [$style.grouped]: grouped, [$style.splitChild]: splitChild, 'w-poe-row': poe, 'w-poe-child': poe && (splitChild || hybridPart) }]">
    <div class="flex flex-col min-w-0 flex-1">
      <div class="flex items-baseline">
        <div class="flex items-baseline min-w-0 mr-2">
          <span v-if="poe" class="w-poe-tier" :class="{ 'w-poe-t1': poeTierTop }">{{ poeTierText }}</span>
          <button :class="[$style.checkbox, { [$style.checked]: !isDisabled, [$style.uncheckedHint]: isDisabled && groupExpanded }, 'w-pc-check']"
            @click="toggleFilter" type="submit">
            <i :class="isDisabled ? 'far fa-square' : 'fas fa-check-square'" />
          </button>
          <button :class="$style.labelBtn" @click="smartToggle" type="submit">
            <img v-if="filter.mercenary?.icon"
              :src="filter.mercenary.icon">
            <span v-if="filter.not && miniFilter"
              :class="[$style.tag, $style['tag-not']]">{{ t('filters.tag_not') }}</span>
            <!-- woke: PoE mode wraps long mods in the game's colours, never cut short. -->
            <span v-if="poeKind" class="w-poe-row-text" :class="`w-poe-k-${poeKind.kind}`" :title="poeKind.label">
              <img v-if="poeKind.icon" class="w-poe-icon" :src="poeKind.icon" alt="">
              <span v-else-if="poeKind.corrupted" class="w-poe-corrupt" />
              <item-modifier-text class="w-pc-modtext" :text="text" :roll="roll?.value" />
            </span>
            <div v-else class="search-text flex-1 relative flex min-w-0" style="line-height: calc(1rem * var(--w-text-scale, 1));">
              <span class="truncate"><item-modifier-text :text="text" :roll="roll?.value" /></span>
              <span class="search-text-full whitespace-pre-wrap"><item-modifier-text :text="text" :roll="roll?.value" /></span>
            </div>
          </button>
          <button v-if="groupExpanded !== undefined"
            :class="$style.expandBtn" @click="toggleExpanded" type="button">
            <i :class="groupExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />
          </button>
        </div>
        <filter-modifier-tiers v-if="miniFilter && !showInputs && !poe"
          :filter="filter" :item="item"
          :class="{ 'mr-4': Boolean(rollOptions) }" />
        <slot name="inputs">
          <div v-if="showInputs"
            class="flex items-baseline gap-x-1 shrink-0 ml-auto">
            <div v-if="showQ20Notice"
              :class="$style.qualityLabel">{{ t('item.prop_quality', [calcQuality]) }}</div>
            <woke-swap-marker v-if="hasSwap" :filter="filter" />
            <woke-mod-worth-tag v-if="!filter.group" :stat-ref="filter.statRef" :item="item" />
            <button v-if="qTag != null" type="button" data-catalyst-tag
              class="w-num" :class="[$style.qTag, { [$style.qOn]: qOn }]"
              :title="qOn ? 'Only items with this catalyst quality or more. Click to search any quality.' : 'A catalyst raised this line. Click to only find items with the same catalyst quality.'"
              @click.stop="catalyst!.toggle()">Q{{ qTag }}</button>
            <img v-for="img of rollTags"
              :class="$style.rollTag" :src="img">
            <div class="flex gap-x-px">
              <input :class="[$style['rollInput'], 'w-roll-input', { 'w-poe-drag': poe, [$style.catOnly]: catOnly === 'above', 'w-roll-cat': catOnly === 'above' }]" :placeholder="t('min')" :min="roll?.bounds?.min" :max="roll?.bounds?.max" :step="changeStep" type="number"
                ref="inputMinEl"
                v-model.number="inputMin" @focus="inputFocus($event, 'min')" @mousewheel.stop
                v-on="minDrag ?? {}">
              <input :class="[$style['rollInput'], 'w-roll-input', { [$style.catOnly]: catOnly === 'below', 'w-roll-cat': catOnly === 'below' }]" :placeholder="t('max')" :min="roll?.bounds?.min" :max="roll?.bounds?.max" :step="changeStep" type="number"
                ref="inputMaxEl"
                v-model.number="inputMax" @focus="inputFocus($event, 'max')" @mousewheel.stop>
            </div>
          </div>
          <filter-modifier-options v-else-if="miniFilter && rollOptions"
            :class="$style.miniRollOptions"
            show-checked="currentDisabled"
            :options="rollOptions"
            :filter="filter" />
        </slot>
      </div>
      <div class="flex pt-px" v-if="!miniFilter">
        <div class="w-5 flex items-start">
          <ui-popover v-if="isHidden" tag-name="div" class="flex" placement="right-start" boundary="#price-window" append-to="#price-window">
            <template #target>
              <span class="text-xs leading-none text-gray-600 cursor-pointer">
                <i class="fas fa-eye-slash" :class="{ 'faa-ring': !isDisabled }"></i>
              </span>
            </template>
            <template #content>
              <div style="max-width: 18.5rem;">{{ hiddenReason }}</div>
            </template>
          </ui-popover>
        </div>
        <div class="min-w-0 flex items-start gap-x-2" :class="showSlider ? 'flex-initial overflow-hidden' : 'flex-1'">
          <span v-if="filter.not"
            :class="[$style['tag'], $style['tag-not']]">{{ t('filters.tag_not') }}</span>
          <button v-if="poe && fracIds" type="button" class="w-poe-chip" :class="{ on: fracOnly }"
            title="Search only items where this mod is fractured"
            @click="toggleFractured">Fractured only</button>
          <button v-if="poe && canSplit" type="button" class="w-poe-ptag"
            :title="isSplit ? 'Fold its mods back into the total' : 'Split into the mods behind this total, each with its own min and ⇄'"
            @click="actions!.toggleSplit(filter)">{{ filter.inTotal ? `${filter.sources.length} mods` : `${t('filters.tag_pseudo')} ×${filter.sources.length}` }} {{ isSplit ? '▴' : '▾' }}</button>
          <template v-else-if="poe" />
          <button v-else-if="showTag && canSplit" type="button"
            :class="[$style['tag'], $style[`tag-${tag}`], $style.splitTag]"
            :title="isSplit ? 'Fold its mods back into the total' : 'Split into the mods behind this total, each with its own min and ⇄'"
            @click="actions!.toggleSplit(filter)">{{ t(`filters.tag_${tag.replace('-', '_')}`) }}{{ filter.sources.length > 1 ? ` x ${filter.sources.length}` : '' }} <i :class="isSplit ? 'fas fa-caret-up' : 'fas fa-caret-down'" /></button>
          <span v-else-if="showTag"
            :class="[$style['tag'], $style[`tag-${tag}`]]">{{ t(`filters.tag_${tag.replace('-', '_')}`) }}{{ (filter.sources.length > 1) ? ` x ${filter.sources.length}` : null }}</span>
          <filter-modifier-tiers v-if="!showBounds() && !poe"
            :filter="filter" :item="item" />
          <filter-modifier-options v-if="rollOptions"
            show-checked="always"
            :options="rollOptions"
            :filter="filter" />
        </div>
        <stat-roll-slider v-if="roll && roll.bounds && showSlider"
          class="flex-1 min-w-0 mr-2" :class="{ 'ml-2': showBoundsTagGap }"
          v-model="sliderValue"
          :roll="roll.value"
          :dp="roll.dp"
          :bounds="roll.bounds"
          :plain="roll.plain"
        />
        <woke-roll-pick v-if="showRollPick" :filter="filter" />
        <div v-else style="width: calc(2*3rem + 1px)" />
      </div>
      <div v-if="catOnly && !miniFilter && roll?.plain" :class="$style.catHint" data-catalyst-hint>{{ catOnly === 'above'
        ? `Above ${roll.plain.max}: only catalysed items match.`
        : `Below ${roll.plain.min}: only catalysed items match.` }}</div>
    </div>
    <modifier-anointment class="self-center" :filter="filter" />
  </div>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent, PropType, computed, ref, nextTick, useCssModule, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import UiPopover from '@/web/ui/Popover.vue'
import StatRollSlider from '../../ui/StatRollSlider.vue'
import ItemModifierText from '../../ui/ItemModifierText.vue'
import ModifierAnointment from './FilterModifierAnointment.vue'
import FilterModifierOptions, { RollOption } from './FilterModifierOptions.vue'
import FilterModifierTiers from './FilterModifierTiers.vue'
import WokeModWorthTag from '@/web/woke/price-insight/ModWorthTag.vue'
import WokeRollPick from '@/web/woke/price-insight/RollPick.vue'
import { canPickRoll, isOpenBound } from '@/web/woke/price-insight/roll-presets'
import { useSwap } from '@/web/woke/harvest-swap/useSwap'
import { useStatActions } from '@/web/woke/price-insight/stat-actions'
import { tagQuality, useCatalystFilter } from '@/web/woke/price-insight/catalyst-filter'
import { onlyCatalysed } from '@/web/ui/catalyst-zone'
import { AppConfig } from '@/web/Config'
import { ItemCategory, ItemRarity, ParsedItem } from '@/parser'
import { getTradeMaxQuality } from '@/parser/calc-q20.js'
import { FilterTag, StatFilter, INTERNAL_TRADE_IDS, ItemHasEmptyModifier } from './interfaces'
import { SearchMode as MercSearchMode } from './pseudo/mercenary.js'
import { ModifierType } from '@/parser/modifiers'
import { poeKit } from '@/web/woke/price-insight/window-style'

export default defineComponent({
  components: { WokeModWorthTag, WokeSwapMarker: defineAsyncComponent(() => import('@/web/woke/harvest-swap/SwapMarker.vue')), WokeRollPick, ItemModifierText, ModifierAnointment, FilterModifierOptions, FilterModifierTiers, StatRollSlider, UiPopover },
  emits: ['update:groupExpanded'],
  props: {
    filter: {
      type: Object as PropType<StatFilter>,
      required: true
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true
    },
    groupExpanded: {
      type: Boolean,
      default: undefined
    },
    grouped: {
      type: Boolean
    },
    // woke: PoE mode (price-insight/window-style.ts).
    poe: {
      type: Boolean
    }
  },
  setup (props, ctx) {
    // woke: the ⇄ marker's code only loads for a mod that can be swapped.
    const swap = useSwap()
    const hasSwap = computed(() => !props.filter.group && swap?.candidateFor(props.filter) != null)
    // woke: pseudo split and the right-click menu (price-insight/stat-actions.ts).
    const actions = useStatActions()
    // woke: the Q tag on rows a catalyst raised (price-insight/catalyst-filter.ts).
    const catalyst = useCatalystFilter()
    const qTag = computed(() => catalyst?.filter.value ? tagQuality(props.filter, catalyst.filter.value) : undefined)
    const qOn = computed(() => catalyst?.filter.value?.disabled === false)
    // woke: the search leaves out every item without catalyst quality (Guy's pick B).
    const catOnly = computed(() => props.filter.roll && !props.filter.disabled
      ? onlyCatalysed(props.filter.roll.min, props.filter.roll.max, props.filter.roll.plain, props.filter.roll.bounds)
      : undefined)
    const canSplit = computed(() => actions?.canSplit(props.filter) ?? false)
    const isSplit = computed(() => actions?.isSplit(props.filter) ?? false)
    const splitChild = computed(() => actions?.isChild(props.filter) ?? false)
    // A hybrid's other line, moved under its split row: indented with it.
    const hybridPart = computed(() => actions?.hybridPart(props.filter) != null)
    const $style = useCssModule()

    watch(() => props.filter.disabled && props.groupExpanded, (uncheckedHint) => {
      if (!uncheckedHint) return

      const animations = document.getAnimations().filter(animation =>
        animation instanceof CSSAnimation &&
        animation.animationName === $style.uncheckedHintAnim)
      const time = animations.find(animation =>
        animation.currentTime !== 0)?.currentTime ?? 0
      for (const animation of animations) {
        animation.currentTime = time
      }
    }, { flush: 'post' })

    const showTag = computed(() =>
      props.filter.tag !== FilterTag.Property &&
      props.filter.tag !== FilterTag.MercenarySupport &&
      props.filter.tradeId[0] !== 'item.has_empty_modifier' &&
      props.item.info.refName !== 'Chronicle of Atzoatl' &&
      props.item.info.refName !== 'Mirrored Tablet' &&
      props.item.info.refName !== 'Filled Coffin' &&
      props.item.category !== ItemCategory.Gem &&
      !(props.item.rarity === ItemRarity.Unique && props.filter.tag === FilterTag.Explicit && (props.filter.roll?.bounds || props.filter.hidden) && !props.grouped)
    )

    const showQ20Notice = computed(() => {
      return [
        'item.armour',
        'item.evasion_rating',
        'item.energy_shield',
        'item.ward',
        'item.total_dps',
        'item.physical_dps'
      ].includes(props.filter.tradeId[0])
    })

    const calcQuality = computed(() => getTradeMaxQuality(props.item))

    const inputMinEl = ref<HTMLInputElement | null>(null)
    const inputMaxEl = ref<HTMLInputElement | null>(null)

    const sliderValue = computed<Array<number | '' | undefined>>({
      get () {
        const roll = props.filter.roll!
        return [roll.min, roll.max]
      },
      set (value) {
        const roll = props.filter.roll!
        const editedEl = (typeof value[0] === 'number' && value[0] !== roll.min)
          ? inputMinEl
          : (typeof value[1] === 'number' && value[1] !== roll.max) ? inputMaxEl : null
        roll.min = value[0]
        roll.max = value[1]
        if (editedEl) {
          nextTick(() => {
            editedEl.value!.focus()
          })
        }
        props.filter.disabled = false
      }
    })

    function inputFocus (e: FocusEvent, type: 'min' | 'max') {
      const target = e.target as HTMLInputElement
      if (target.value === '') {
        if (type === 'max') {
          props.filter.roll!.max = props.filter.roll!.default.max
        } else if (type === 'min') {
          props.filter.roll!.min = props.filter.roll!.default.min
        }
        nextTick(() => {
          target.select()
        })
      } else {
        target.select()
      }
      props.filter.disabled = false
    }

    function toggleFilter (e: MouseEvent) {
      if (e.detail === 0) return
      e.preventDefault()

      props.filter.disabled = !props.filter.disabled
    }

    function toggleExpanded () {
      ctx.emit('update:groupExpanded', !props.groupExpanded)
    }

    function smartToggle (e: MouseEvent) {
      if (e.detail === 0) return
      e.preventDefault()

      if (!props.filter.disabled && props.groupExpanded === true) {
        ctx.emit('update:groupExpanded', false)
      } else {
        props.filter.disabled = !props.filter.disabled

        if (!props.filter.disabled && props.groupExpanded === false) {
          ctx.emit('update:groupExpanded', true)
        }
      }
    }

    const { t } = useI18n()

    // woke: PoE mode's "Fractured only": the row searches the fractured copy of its mod.
    // PoE mode's code (poe-kit.ts) is loaded before a PoE row is drawn.
    const kit = props.poe ? poeKit.value : null
    const fracIds = computed(() => kit?.fracturedIds(props.filter))
    const fracOnly = computed(() => fracIds.value != null && props.filter.tradeId.join() === fracIds.value.join())
    function toggleFractured () {
      const ids = fracIds.value
      if (!ids) return
      props.filter.tradeId = fracOnly.value
        ? props.filter.sources[0].stat.stat.trade.ids[ModifierType.Explicit]
        : ids
      props.filter.disabled = false
    }

    // Only PoE rows listen for the drag.
    const drag = kit?.useDragNumber({
      get: () => {
        const roll = props.filter.roll!
        return typeof roll.min === 'number' ? roll.min : roll.value
      },
      set: (v) => {
        const max = props.filter.roll!.max
        props.filter.roll!.min = (typeof max === 'number') ? Math.min(v, max) : v
        props.filter.disabled = false
      },
      step: () => {
        const roll = props.filter.roll!
        if (roll.dp) return 0.1
        const b = roll.bounds
        return (b && b.max - b.min > 50) ? 5 : 1
      }
    })
    const minDrag = drag && {
      mousedown: drag.onMouseDown,
      pointerdown: drag.onPointerDown,
      pointermove: drag.onPointerMove,
      pointerup: drag.onPointerUp,
      pointercancel: drag.onPointerUp
    }

    return {
      catalyst,
      qTag,
      qOn,
      catOnly,
      fracIds,
      fracOnly,
      toggleFractured,
      minDrag,
      poeKind: computed(() => kit?.poeLook(props.filter)),
      poeTierText: computed(() => kit?.poeTier(props.filter) ?? ''),
      poeTierTop: computed(() => kit?.isTopTier(kit.poeTier(props.filter)) ?? false),
      actions,
      canSplit,
      isSplit,
      splitChild,
      hybridPart,
      hasSwap,
      t,
      showTag,
      showQ20Notice,
      calcQuality,
      inputMinEl,
      inputMaxEl,
      sliderValue,
      inputMin: computed({
        get () { return props.filter.roll!.min },
        set (value: '' | number | undefined) { props.filter.roll!.min = value }
      }),
      inputMax: computed({
        get () { return props.filter.roll!.max },
        set (value: '' | number | undefined) { props.filter.roll!.max = value }
      }),
      tag: computed(() => props.filter.tag),
      miniFilter: computed(() => !props.filter.hidden && (
        props.filter.tag === FilterTag.MercenarySupport ||
        (props.filter.tag === FilterTag.Property && props.item.info.refName === 'Mercenary Warrant') ||
        props.item.info.refName === 'Chronicle of Atzoatl' ||
        props.item.info.refName === 'Mirrored Tablet' ||
        props.item.info.refName === 'Filled Coffin' ||
        props.item.category === ItemCategory.Gem
      )),
      // TODO: change
      changeStep: computed(() => props.filter.roll!.dp ? 0.01 : 1),
      showInputs: computed(() => props.filter.roll != null && !props.filter.oils),
      rollOptions: computed<RollOption[] | undefined>(() => {
        if (props.filter.tag === FilterTag.MercenarySupport && props.filter.option) {
          return [
            { text: t('filters.option_merc_required'), value: MercSearchMode.Required },
            { text: t('filters.option_merc_optional'), value: MercSearchMode.Optional }
          ]
        } else if (props.filter.tradeId[0] === 'item.has_empty_modifier') {
          return [
            { text: t('filters.option_empty_affix'), value: ItemHasEmptyModifier.Any },
            { text: t('filters.option_empty_prefix'), value: ItemHasEmptyModifier.Prefix },
            { text: t('filters.option_empty_suffix'), value: ItemHasEmptyModifier.Suffix }
          ]
        }
      }),
      fontSize: computed(() => AppConfig().fontSize),
      isDisabled: computed(() => props.filter.disabled),
      text: computed(() => {
        if (!INTERNAL_TRADE_IDS.includes(props.filter.tradeId[0])) {
          return props.filter.text
        } else {
          return t(props.filter.tradeId[0], ['#', '#'])
        }
      }),
      roll: computed(() => props.filter.roll),
      isHidden: computed(() => props.filter.hidden != null),
      rollTags: computed(() => {
        const out: string[] = []
        for (const source of props.filter.sources) {
          if (source.stat.roll?.generation === 'volatile') {
            out.push('/images/VolatileVaalOrb.png'); break
          } else if (source.stat.roll?.generation === 'reflecting') {
            out.push('/images/ReflectingMist.png'); break
          }
        }
        const increased = props.filter.sources.some(source =>
          source.modifier.info.rollIncr &&
          source.stat.roll && !source.stat.roll.unscalable)
        if (increased && qTag.value == null) {
          out.push('/images/increased.png')
        }
        return out
      }),
      hiddenReason: computed(() => t(props.filter.hidden!)),
      showBounds: () => props.item.rarity === ItemRarity.Unique,
      // Map and heist stats have no real range to draw, only a placeholder top.
      showSlider: computed(() => {
        const bounds = props.filter.roll?.bounds
        return Boolean(bounds && bounds.max > bounds.min && !isOpenBound(bounds.min) && !isOpenBound(bounds.max))
      }),
      showBoundsTagGap: computed(() => Boolean(showTag.value || props.filter.not)),
      showRollPick: computed(() => canPickRoll(props.filter) && props.item.category !== ItemCategory.Map),
      inputFocus,
      toggleFilter,
      toggleExpanded,
      smartToggle
    }
  }
})
</script>

<style lang="postcss" module>
.filter.splitChild {
  padding-left: theme('spacing.5');
  border-bottom-style: dashed;
}

.splitTag {
  cursor: pointer;
  &:hover { filter: brightness(1.25); }
}

.filter {
  padding: theme('spacing.2') 0;
  border-bottom: 1px solid theme('colors.gray.700');
  display: flex;
  align-items: baseline;
  position: relative;
}
.filter.grouped {
  padding-left: theme('spacing.5');
}

.checkbox {
  display: flex;
  min-width: theme('width.5');
  margin-top: -99px; /* not allowed to extend baseline */

  &:not(.checked) {
    color: theme('colors.gray.500');
  }

  &.uncheckedHint {
    animation: uncheckedHintAnim 0.5s ease-out infinite alternate;
  }
}

@keyframes uncheckedHintAnim {
  from {
    color: theme('colors.gray.700');
  }
  to {
    color: theme('colors.gray.500');
  }
}

.labelBtn {
  display: flex;
  align-items: baseline;
  min-width: 0;
  text-align: left;

  & > img {
    width: theme('width.4');
    margin-right: theme('spacing.1');
    position: relative;
    top: 0.125rem;
    margin-top: -99px; /* not allowed to extend baseline */
  }

  & > .tag {
    margin-right: theme('spacing.1');
  }
}

.expandBtn {
  display: flex;
  min-width: theme('width.5');
  padding-left: theme('spacing[1.5]');
  color: theme('colors.gray.500');
  margin-top: -99px; /* not allowed to extend baseline */
}

.rollInput {
  background: var(--w-pc-well, theme('colors.gray.900'));
  @apply text-gray-300;
  @apply text-center;
  width: calc(3rem * (1 + (var(--w-text-scale, 1) - 1) / 2)); /* half the text growth: mod names need the room */
  @apply px-1;
  @apply border border-transparent;

  &:first-child { @apply rounded-l; }
  &:last-child { @apply rounded-r; }

  &::placeholder {
    @apply text-gray-700;
    font-size: calc(0.8125rem * var(--w-text-scale, 1));
  }

  /* &:not(:placeholder-shown) { @apply border-gray-600; } */

  &:focus {
    @apply border-gray-500;
    cursor: none;
  }
}

.qualityLabel {
  padding-right: theme('spacing.1');
  color: theme('colors.gray.500');
  font-size: calc(0.8125rem * var(--w-text-scale, 1));
  white-space: nowrap;
}

.miniRollOptions {
  margin: -99px 0; /* not allowed to extend baseline */
  margin-left: auto;
}

.tag {
  padding: 0 theme('spacing.1');
  border-radius: theme('borderRadius.DEFAULT');
  font-size: theme('fontSize.xs');
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}
.tag-variant {
  @apply bg-yellow-700 text-yellow-100; }
.tag-eldritch {
  background: linear-gradient(to right, theme('colors.red.700'), theme('colors.blue.700'));
}
.tag-explicit-shaper,
.tag-explicit-elder,
.tag-explicit-crusader,
.tag-explicit-hunter,
.tag-explicit-redeemer,
.tag-explicit-warlord,
.tag-explicit-delve,
.tag-explicit-veiled,
.tag-explicit-incursion,
.tag-explicit-infamous,
.tag-explicit-essence {
  display: flex;
  align-items: center;
  @apply -mx-1 pl-0.5 gap-x-0.5 text-gray-600;
  text-shadow: 0 0 4px var(--w-pc-well, theme('colors.gray.900'));
  overflow: clip visible;
  min-width: 0;

  &::before {
    background-size: contain;
    @apply w-5 h-5 -my-5;
    content: '';
    flex-shrink: 0;
  }
}
.tag-explicit-shaper::before {
  background-image: url('/images/influence-Shaper.png'); }
.tag-explicit-elder::before {
  background-image: url('/images/influence-Elder.png'); }
.tag-explicit-crusader::before {
  background-image: url('/images/influence-Crusader.png'); }
.tag-explicit-hunter::before {
  background-image: url('/images/influence-Hunter.png'); }
.tag-explicit-redeemer::before {
  background-image: url('/images/influence-Redeemer.png'); }
.tag-explicit-warlord::before {
  background-image: url('/images/influence-Warlord.png'); }
.tag-explicit-delve::before {
  background-image: url('/images/delve.png'); }
.tag-explicit-veiled::before {
  background-image: url('/images/veiled.png'); }
.tag-explicit-incursion::before {
  background-image: url('/images/incursion.png'); }
.tag-explicit-infamous::before {
  background-image: url('/images/mercenary.png'); }
.tag-explicit-essence::before {
  background-image: url('/images/essence.png'); }

.tag-corrupted,
.tag-brick {
  @apply bg-red-700 text-red-100; }
.tag-fractured {
  @apply bg-orange-300 text-black; }
.tag-crafted, .tag-synthesised {
  @apply bg-blue-600 text-blue-100; }
.tag-implicit,
.tag-explicit,
.tag-mercenary-primary,
.tag-mercenary-secondary,
.tag-mercenary-utility,
.tag-filter-group {
  @apply -mx-1 text-gray-600;
  text-shadow: 0 0 4px var(--w-pc-well, theme('colors.gray.900'));
}
.tag-scourge {
  @apply bg-orange-600 text-white; }
.tag-foulborn {
  @apply bg-pink-700 text-white; }
.tag-vestigial {
  @apply bg-purple-600 text-purple-100; }
.tag-enchant {
  @apply bg-indigo-200 text-black; }
.tag-pseudo,
.tag-not {
  @apply bg-gray-700 text-black; }

/* The catalyst's tag: blue like the game's quality, filled while it filters. */
/* woke: a min (or max) only catalysed items reach. */
.rollInput.catOnly {
  color: var(--w-r-magic);
  border-color: color-mix(in srgb, var(--w-r-magic) 55%, transparent);
}
.catHint {
  font-size: var(--w-fs-xs);
  color: var(--w-r-magic);
  padding-left: 1.25rem;
}
.qTag {
  font-size: var(--w-fs-xs); font-weight: 700; line-height: 1; align-self: center;
  padding: 1px 3px; border-radius: 2px;
  color: var(--w-r-magic); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--w-r-magic) 45%, transparent);
}
.qTag:hover { box-shadow: inset 0 0 0 1px var(--w-r-magic); }
.qOn { color: #fff; background: color-mix(in srgb, var(--w-r-magic) 45%, transparent); box-shadow: inset 0 0 0 1px var(--w-r-magic); }

.rollTag {
  width: theme('width.5');
  position: relative;
  top: 0.3125rem;
  margin-top: -99px; /* not allowed to extend baseline */
}
</style>

<style lang="postcss">
.search-text-full {
  position: absolute;
  left: 0px;
  right: 0px;
  top: -2px;
  padding-top: 2px;
  padding-bottom: 1px;
  z-index: 10;

  .search-text:not(:hover) & {
    display: none;
  }

  .search-text:hover & {
    @apply bg-gray-700;
  }
}
</style>
