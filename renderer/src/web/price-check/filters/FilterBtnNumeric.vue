<template>
  <div :class="[$style.tile, { [$style.active]: !filter.disabled, [$style.dragging]: dragging }]"
    title="Scroll or drag up and down to change the value"
    @wheel.prevent.stop="handleWheel"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerEnd"
    @pointercancel="handlePointerEnd"
    @click.capture="swallowDragClick">
    <button type="button" :class="$style.label" @click="filter.disabled = !filter.disabled">{{ label }}</button>
    <div :class="$style.values">
    <input :class="$style.input" step="any" type="number"
      v-model.number="inputMin"
      @focus="inputFocus"
      @blur="inputMinBlur"
      :style="{ width: `${1.2 + Math.max(String(inputMin).length, 2)}ch` }"
    >
    <template v-if="'max' in filter">
      <span>–</span>
      <input :class="$style.input" step="any" type="number" data-bound="max"
        v-model.number="inputMax"
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
    }
  },
  setup (props) {
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
      set (value) {
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
      set (value) {
        _inputMax.value = value
        if (typeof value === 'number') {
          props.filter.max = value
        } else {
          props.filter.max = undefined
        }
      }
    })

    type Bound = 'min' | 'max'

    function boundAt (target: EventTarget | null): Bound {
      return (target as HTMLElement | null)?.dataset?.bound === 'max' ? 'max' : 'min'
    }

    // A changed value is a value you want searched, as with typing one in.
    function nudge (bound: Bound, by: number) {
      const min = (typeof inputMin.value === 'number') ? inputMin.value : 0
      const max = (typeof inputMax.value === 'number') ? inputMax.value : null
      if (bound === 'max') {
        inputMax.value = Math.max((max ?? min) + by, min)
      } else {
        const next = Math.max(min + by, 0)
        inputMin.value = (max != null) ? Math.min(next, max) : next
      }
      props.filter.disabled = false
    }

    const DRAG_START_PX = 3
    const DRAG_STEP_PX = 8
    const dragging = ref(false)
    let drag: { startY: number, bound: Bound, applied: number } | null = null
    let justDragged = false

    return {
      // Some of these strings are written for "Links: 6", and the value has its own line here.
      label: computed(() => props.name.replace(/[:：]\s*$/, '')),
      inputMin,
      inputMax,
      dragging,
      handleWheel (e: WheelEvent) {
        if (e.deltaY !== 0) nudge(boundAt(e.target), (e.deltaY < 0) ? 1 : -1)
      },
      handlePointerDown (e: PointerEvent) {
        justDragged = false
        drag = (e.button === 0) ? { startY: e.clientY, bound: boundAt(e.target), applied: 0 } : null
      },
      handlePointerMove (e: PointerEvent) {
        if (!drag) return
        // The press ended outside the tile, before a drag captured the pointer.
        if (!dragging.value && !(e.buttons & 1)) {
          drag = null
          return
        }
        const up = drag.startY - e.clientY
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
      handlePointerEnd () {
        justDragged = dragging.value
        dragging.value = false
        drag = null
      },
      // Letting go after a drag on the label mustn't also switch the filter off.
      swallowDragClick (e: MouseEvent) {
        if (justDragged) {
          justDragged = false
          e.stopPropagation()
        }
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
  cursor: ns-resize;

  &.active {
    background: var(--w-accent-soft);
    border-color: var(--w-line-strong);
    color: var(--w-dim);
  }

  &.dragging {
    user-select: none;
    border-color: var(--w-accent);
  }
}

.label {
  font-size: calc(12px * var(--w-text-scale, 1));
  line-height: calc(16px * var(--w-text-scale, 1));
  white-space: nowrap;

  &:hover { color: var(--w-fg); }
}

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

  &:hover,
  &:focus {
    background: var(--w-panel-3);
  }

  &::placeholder {
    color: var(--w-faint);
  }

  &:focus { cursor: none; }
}
</style>
