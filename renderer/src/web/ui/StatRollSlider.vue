<template>
  <div :class="[$style.root, $style[state.mode]]"
    title="Left-click sets min, right-click sets max"
    @contextmenu.prevent>
    <span :class="[$style.bound, { [$style.inclusive]: state.minInclusive }]">{{ bounds.min }}</span>
    <div :class="$style.track" ref="rootEl" @mousedown="handleMousedown">
      <div v-for="(band, i) of bands" :key="i" :class="$style.catBand" data-catalyst-band
        :style="{ left: `${band.left}%`, right: `${band.right}%` }" />
      <div v-if="state.mode !== 'none'"
        :class="[$style.fill, { [$style.catOnly]: catOnly }]"
        :style="{ '--left': `${state.percentLeft}%`, '--right': `${state.percentRight}%` }"
      />
      <div :class="$style.tick" :style="{ left: `${percentRoll}%` }" />
      <div v-if="popupValue != null && popupValue !== ''"
        :class="$style.popup"
        :style="(editing === 'min') ? { '--left': `${state.percentLeft}%` } : { '--right': `${state.percentRight}%` }"
      >{{ popupValue }}</div>
    </div>
    <span :class="[$style.bound, { [$style.inclusive]: state.maxInclusive }]">{{ bounds.max }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType, shallowRef } from 'vue'
import { SliderEnd, editRange, sliderEnd, sliderValueAt } from './stat-roll-slider'
import { catalystBands, onlyCatalysed } from './catalyst-zone'

export default defineComponent({
  props: {
    modelValue: {
      type: Array as PropType<Array<number | '' | undefined>>,
      required: true
    },
    roll: { type: Number, required: true },
    dp: { type: Boolean, required: true },
    bounds: {
      type: Object as PropType<{ min: number, max: number }>,
      required: true
    },
    // woke: on a catalysed row, what an item without catalyst quality reaches.
    plain: {
      type: Object as PropType<{ min: number, max: number }>,
      default: undefined
    }
  },
  setup (props, ctx) {
    const rootEl = shallowRef<HTMLDivElement>(null!)

    const dirty = shallowRef<typeof props['modelValue'] | null>(null)
    const editing = shallowRef<SliderEnd>('min')

    const state = computed(() => {
      const min = (dirty.value) ? dirty.value[0] : props.modelValue[0]
      const max = (dirty.value) ? dirty.value[1] : props.modelValue[1]
      const { bounds } = props
      if (typeof min === 'number' && typeof max !== 'number') {
        return {
          mode: 'min',
          percentLeft: (min - bounds.min) / (bounds.max - bounds.min) * 100,
          maxInclusive: true
        }
      } else if (typeof min !== 'number' && typeof max === 'number') {
        return {
          mode: 'max',
          percentRight: (bounds.max - max) / (bounds.max - bounds.min) * 100,
          minInclusive: true
        }
      } else if (typeof min === 'number' && typeof max === 'number') {
        if (min > max) return { mode: 'none' }
        return {
          mode: 'range',
          percentLeft: (min - bounds.min) / (bounds.max - bounds.min) * 100,
          percentRight: (bounds.max - max) / (bounds.max - bounds.min) * 100,
          minInclusive: (min <= bounds.min),
          maxInclusive: (max >= bounds.max)
        }
      } else {
        return { mode: 'none' }
      }
    })

    function handleMousemove (e: MouseEvent) {
      e.preventDefault()
      const { bounds, dp } = props
      const rect = rootEl.value.getBoundingClientRect()
      const k = Math.max(0, Math.min((e.clientX - rect.x) / rect.width, 1))
      const value = sliderValueAt(k, bounds, editing.value, dp)
      dirty.value = editRange(props.modelValue, editing.value, value)
    }
    // A right-drag that ends off the bar would open the panel's (or the
    // browser's) menu where it lands; on Windows that menu comes after mouseup.
    function swallowMenu (e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()
    }
    let dragging = false
    function removeMousemove () {
      dragging = false
      setTimeout(() => document.removeEventListener('contextmenu', swallowMenu, true), 0)
      document.removeEventListener('mousemove', handleMousemove)
      document.removeEventListener('mouseup', removeMousemove)
      window.removeEventListener('blur', removeMousemove)
      ctx.emit('update:modelValue', dirty.value)
      dirty.value = null
    }

    return {
      rootEl,
      bands: computed(() => catalystBands(props.bounds, props.plain)),
      catOnly: computed(() => {
        const [min, max] = dirty.value ?? props.modelValue
        return onlyCatalysed(min, max, props.plain, props.bounds) != null
      }),
      percentRoll: computed(() => {
        const { bounds } = props
        // Corrupted and catalysed rolls can sit outside the range.
        return Math.min(Math.max((props.roll - bounds.min) / (bounds.max - bounds.min) * 100, 0), 100)
      }),
      editing,
      popupValue: computed(() => editing.value === 'min' ? dirty.value?.[0] : dirty.value?.[1]),
      handleMousedown (e: MouseEvent) {
        const end = sliderEnd(e.button)
        // A second button during a drag would switch ends and drop the first edit.
        if (!end || dragging) return
        dragging = true
        if (end === 'max') document.addEventListener('contextmenu', swallowMenu, true)
        editing.value = end
        handleMousemove(e)
        document.addEventListener('mousemove', handleMousemove)
        document.addEventListener('mouseup', removeMousemove)
        window.addEventListener('blur', removeMousemove)
      },
      state
    }
  }
})
</script>

<style lang="postcss" module>
.root {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 6rem;
  font-family: var(--w-body);
  font-size: var(--w-fs-xs);
  line-height: calc(14px * var(--w-text-scale, 1));
  font-variant-numeric: tabular-nums;
}
.track {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  height: 10px;
  border-radius: 2px;
  background: var(--w-panel-3);
  border: 1px solid var(--w-line);
  cursor: pointer;
}
/* Your roll. */
.tick {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--w-fg);
  pointer-events: none;
  z-index: 1;
}
/* What gets searched. */
.fill {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 2px;
  background: color-mix(in srgb, var(--w-accent) 32%, transparent);
  pointer-events: none;

  .min & {
    left: clamp(0%, var(--left), 100%);
    right: 0;
    border-left: 2px solid var(--w-accent);
  }

  .max & {
    left: 0;
    right: clamp(0%, var(--right), 100%);
    border-right: 2px solid var(--w-accent);
  }

  .range & {
    left: clamp(0%, var(--left), 100%);
    right: clamp(0%, var(--right), 100%);
    border-left: 2px solid var(--w-accent);
    border-right: 2px solid var(--w-accent);
  }
}
/* woke: only catalysed items reach this part, striped in quality blue. */
.catBand {
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
  background: repeating-linear-gradient(135deg,
    color-mix(in srgb, var(--w-r-magic) 30%, transparent) 0 3px,
    color-mix(in srgb, var(--w-r-magic) 10%, transparent) 3px 6px);
}
.fill.catOnly {
  background: color-mix(in srgb, var(--w-r-magic) 34%, transparent);
  border-color: var(--w-r-magic);
}
.bound {
  flex: none;
  min-width: 18px;
  font-weight: 600;
  color: var(--w-dim);
  user-select: none;

  &:last-child { text-align: right; }
  &.inclusive { color: var(--w-fg); }
}
.popup {
  position: absolute;
  bottom: calc(100% + 4px);
  padding: 0 4px;
  border-radius: var(--w-r-sm);
  background: var(--w-accent);
  color: var(--w-accent-fg);
  font-weight: 600;
  min-width: 1.8rem;
  text-align: center;
  z-index: 2;

  left: calc(var(--left) - 0.8rem);
  right: calc(var(--right) - 0.8rem);
}
</style>
