<template>
  <!-- woke: PoE mode's number chip. The label switches the filter; the number types,
       scrolls or drags sideways, and changing it switches the filter on. -->
  <span v-if="chip" class="w-poe-nchip" :class="{ on: !filter.disabled, suggested: filter.suggested && filter.disabled, dragging }"
    :data-numeric-chip="label"
    @wheel.prevent.stop="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerEnd"
    @pointercancel="handlePointerEnd"
    @mousedown="handleMouseDown"
    @dragstart.prevent>
    <button type="button" class="w-poe-nlab" :aria-pressed="!filter.disabled"
      @pointerdown="pressLabel"
      @click="toggleFromLabel">{{ label }}</button>
    <button type="button" class="w-poe-arr" tabindex="-1" aria-label="Less" @click="nudge('min', -1)">‹</button>
    <input class="w-poe-ninp" step="any" type="number" :aria-label="label"
      v-model.number="inputMin"
      @input="showClamped"
      @focus="inputFocus"
      @blur="inputMinBlur"
      @keydown.up.prevent="nudge('min', 1)"
      @keydown.down.prevent="nudge('min', -1)"
      :style="{ width: `${0.6 + Math.max(String(inputMin).length, 1)}ch` }"
    >
    <template v-if="'max' in filter">
      <span class="w-poe-ndash">–</span>
      <input class="w-poe-ninp" step="any" type="number" data-bound="max" :aria-label="`${label} max`"
        v-model.number="inputMax"
        @input="showClamped"
        @focus="inputFocus"
        :style="{ width: `${0.6 + Math.max(String(inputMax).length, 1)}ch` }"
        placeholder="…"
      >
    </template>
    <button type="button" class="w-poe-arr" tabindex="-1" aria-label="More" @click="nudge('min', 1)">›</button>
  </span>
  <div v-else :class="[$style.tile, { [$style.active]: !filter.disabled, [$style.suggested]: filter.suggested && filter.disabled, [$style.dragging]: dragging }]"
    title="Click to turn on or off. Scroll, or drag a number up and down, to change it"
    @wheel.prevent.stop="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerEnd"
    @pointercancel="handlePointerEnd"
    @mousedown="handleMouseDown"
    @dragstart.prevent
    role="button" tabindex="0" :aria-pressed="!filter.disabled"
    @keydown.enter.space="handleKey"
    @click="handleClick">
    <span :class="$style.label">{{ label }}</span>
    <div :class="$style.values">
    <input :class="$style.input" step="any" type="number"
      v-model.number="inputMin"
      @input="showClamped"
      @focus="inputFocus"
      @blur="inputMinBlur"
      :style="{ width: `${1.2 + Math.max(String(inputMin).length, 2)}ch` }"
    >
    <template v-if="'max' in filter">
      <span>–</span>
      <input :class="$style.input" step="any" type="number" data-bound="max"
        v-model.number="inputMax"
        @input="showClamped"
        @focus="inputFocus"
        :style="{ width: `${1.2 + Math.max(String(inputMax).length, 2)}ch` }"
        placeholder="…"
      >
    </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, ref, watch } from 'vue'
import { FilterNumeric } from './interfaces'
import { clampToLimit, filterCeiling } from './numeric-limits'

export default defineComponent({
  emits: [], // mutates filter
  props: {
    filter: {
      type: Object as PropType<FilterNumeric>,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    // Highest value the game has for this filter. Stock and the like have none.
    limit: {
      type: Number,
      default: undefined
    },
    // woke: PoE mode's inline chip, dragged sideways.
    chip: {
      type: Boolean
    }
  },
  setup (props) {
    let ceiling = filterCeiling(props.limit, props.filter)
    watch(() => [props.filter, props.limit] as const, () => {
      ceiling = filterCeiling(props.limit, props.filter)
    })

    const _inputMin = ref<number | ''>('')
    watch(() => props.filter, (filter) => {
      _inputMin.value = filter.value
    }, { immediate: true })

    const _inputMax = ref<number | ''>('')
    watch(() => props.filter, (filter) => {
      _inputMax.value = filter.max ?? ''
    }, { immediate: true })

    const inputMin = computed<number | ''>({
      get () { return _inputMin.value },
      set (raw) {
        const value = (typeof raw === 'number') ? clampToLimit(raw, ceiling) : raw
        _inputMin.value = value
        if (typeof value === 'number') {
          props.filter.value = value
        } else {
          props.filter.value = 0
        }
      }
    })
    const inputMax = computed<number | ''>({
      get () { return _inputMax.value },
      set (raw) {
        const value = (typeof raw === 'number') ? clampToLimit(raw, ceiling) : raw
        _inputMax.value = value
        if (typeof value === 'number') {
          props.filter.max = value
        } else {
          props.filter.max = undefined
        }
      }
    })

    type Bound = 'min' | 'max'

    function restingInputAt (target: EventTarget | null): HTMLInputElement | null {
      return (target instanceof HTMLInputElement && document.activeElement !== target) ? target : null
    }

    function boundAt (target: EventTarget | null): Bound {
      return (target as HTMLElement | null)?.dataset?.bound === 'max' ? 'max' : 'min'
    }

    // A changed value is a value you want searched, as with typing one in.
    function nudge (bound: Bound, by: number) {
      const min = (typeof inputMin.value === 'number') ? inputMin.value : 0
      const max = (typeof inputMax.value === 'number') ? inputMax.value : null
      const before = [props.filter.value, props.filter.max]
      if (bound === 'max') {
        // An empty max means no upper limit, and going down from there isn't asking for one.
        if (max == null && by < 0) return
        inputMax.value = Math.max((max ?? min) + by, min)
      } else {
        const next = Math.max(min + by, 0)
        inputMin.value = (max != null) ? Math.min(next, max) : next
      }
      if (before[0] !== props.filter.value || before[1] !== props.filter.max) props.filter.disabled = false
    }

    const DRAG_START_PX = 3
    const DRAG_STEP_PX = props.chip ? 8 : 20
    const dragging = ref(false)
    // `input` is the number you pressed, if it wasn't being typed in: letting go without a drag opens it.
    let drag: { startX: number, startY: number, bound: Bound, applied: number, input: HTMLInputElement | null } | null = null
    let justDragged = false
    // How the press began: on a number (types or drags, never switches), and the filter's state then.
    // Pressing elsewhere blurs a number being typed in, and an emptied one switches the filter off on blur.
    let press: { onInput: boolean, wasDisabled: boolean } | null = null

    // The state when the label was pressed: pressing it blurs an emptied box, which
    // switches the filter off before the click lands.
    let labelWasDisabled: boolean | null = null

    return {
      pressLabel () { labelWasDisabled = props.filter.disabled },
      toggleFromLabel () {
        const was = labelWasDisabled ?? props.filter.disabled
        labelWasDisabled = null
        props.filter.disabled = !was
      },
      // Some of these strings are written for "Links: 6", and the value has its own line here.
      label: computed(() => props.name.replace(/[:：]\s*$/, '')),
      inputMin,
      inputMax,
      dragging,
      nudge,
      handleWheel (e: WheelEvent) {
        if (e.deltaY !== 0) nudge(boundAt(e.target), (e.deltaY < 0) ? 1 : -1)
      },
      // Only the numbers drag. The rest of the box is a switch for the filter.
      handlePointerDown (e: PointerEvent) {
        justDragged = false
        press = (e.button === 0)
          ? { onInput: e.target instanceof HTMLInputElement, wasDisabled: props.filter.disabled }
          : null
        drag = (e.button === 0 && e.target instanceof HTMLInputElement)
          ? { startX: e.clientX, startY: e.clientY, bound: boundAt(e.target), applied: 0, input: restingInputAt(e.target) }
          : null
      },
      // Pressing a number would focus it and start selecting text, which is no use if this becomes a drag.
      // Typing starts on release instead; a number already being typed in keeps its caret and selection.
      handleMouseDown (e: MouseEvent) {
        if (e.button === 0 && restingInputAt(e.target)) {
          e.preventDefault()
          // That also keeps focus where it was, so a number being typed in elsewhere has to let go here.
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        }
      },
      handlePointerMove (e: PointerEvent) {
        if (!drag) return
        // The press ended where this tile couldn't see it: outside it, or with the overlay closing mid-drag.
        if (!(e.buttons & 1)) {
          dragging.value = false
          drag = null
          return
        }
        // The chip drags sideways, the tile up and down.
        const up = props.chip ? e.clientX - drag.startX : drag.startY - e.clientY
        if (!dragging.value) {
          if (Math.abs(up) < DRAG_START_PX) return
          dragging.value = true
          const tile = e.currentTarget as HTMLElement
          tile.setPointerCapture(e.pointerId)
          // Done with typing: the focused input would otherwise keep its selection under the drag.
          const focused = document.activeElement
          if (focused instanceof HTMLElement && tile.contains(focused)) focused.blur()
        }
        const steps = Math.trunc(up / DRAG_STEP_PX)
        if (steps !== drag.applied) {
          nudge(drag.bound, steps - drag.applied)
          drag.applied = steps
        }
      },
      handlePointerEnd (e: PointerEvent) {
        if (e.type === 'pointerup' && drag?.input && !dragging.value) drag.input.focus()
        justDragged = dragging.value
        dragging.value = false
        drag = null
      },
      // Pressing a number types in it or drags it, so only the rest of the box switches the filter.
      // Letting go of a drag lands on the box (it holds the pointer), and mustn't switch it either.
      // A press that began on a number and was let go elsewhere in the box still lands here, so it's the
      // press that counts, not where the click ended up.
      handleClick (e: MouseEvent) {
        const began = press
        press = null
        if (justDragged) {
          justDragged = false
          return
        }
        if (e.target instanceof HTMLInputElement || !began || began.onInput) return
        props.filter.disabled = !began.wasDisabled
      },
      handleKey (e: KeyboardEvent) {
        if (e.target !== e.currentTarget) return
        e.preventDefault()
        props.filter.disabled = !props.filter.disabled
      },
      // A capped value that doesn't change the model (6, then typing 67) wouldn't redraw the box.
      showClamped (e: Event) {
        const el = e.target as HTMLInputElement
        const value = (el.dataset.bound === 'max') ? _inputMax.value : _inputMin.value
        if (typeof value === 'number' && el.valueAsNumber !== value) el.value = String(value)
      },
      inputFocus (e: FocusEvent) {
        const target = e.target as HTMLInputElement
        target.select()
        props.filter.disabled = false
      },
      inputMinBlur () {
        if (typeof _inputMin.value !== 'number') {
          _inputMin.value = 0
          props.filter.disabled = true
        }
      }
    }
  }
})
</script>

<style lang="postcss" module>
.tile {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: calc(46px * var(--w-text-scale, 1));
  min-height: calc(50px * var(--w-text-scale, 1));
  padding: 2px 6px;
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-radius-sm);
  color: var(--w-faint);
  cursor: pointer;
  user-select: none;

  &.active {
    background: var(--w-accent-soft);
    border-color: var(--w-line-strong);
    color: var(--w-dim);
  }

  /* A suggested value, not the item's own. */
  &.suggested { border-style: dashed; }

  &.dragging {
    cursor: ns-resize;
    border-color: var(--w-accent);
  }
}

.label {
  font-size: calc(12px * var(--w-text-scale, 1));
  line-height: calc(16px * var(--w-text-scale, 1));
  white-space: nowrap;
}

.tile:hover .label { color: var(--w-fg); }

.values {
  display: flex;
  align-items: center;
  font-size: calc(17px * var(--w-text-scale, 1));
  line-height: calc(24px * var(--w-text-scale, 1));
}

.active .values { color: var(--w-fg); }

.input {
  @apply text-center;
  @apply bg-transparent;
  @apply select-all;
  color: inherit;
  cursor: ns-resize;

  &:hover,
  &:focus {
    background: var(--w-panel-3);
  }

  &::placeholder {
    color: var(--w-faint);
  }

  &:focus { cursor: text; }
}
</style>
