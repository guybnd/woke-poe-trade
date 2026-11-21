<template>
  <component :is="tagName" ref="target" v-bind="$attrs">
    <slot name="target" />
  </component>
  <div ref="content">
    <slot name="content" />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref, PropType } from 'vue'
import tippy, { Instance, Placement } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'

// woke: Popper measures in screen px, but its offsets are applied inside the
// popover's parent, which a CSS zoom (UI size, Panel size) scales again.
// Dividing by that zoom keeps the popover on its target.
type Offsets = { x?: number, y?: number } | undefined
const UNZOOM = {
  name: 'unzoom',
  enabled: true,
  phase: 'main' as const,
  requires: ['popperOffsets'],
  requiresIfExists: ['offset', 'preventOverflow', 'arrow', 'flip'],
  fn ({ state }: { state: { elements: { popper: HTMLElement }, modifiersData: Record<string, Offsets> } }) {
    const parent = state.elements.popper.parentElement as (HTMLElement & { currentCSSZoom?: number }) | null
    const z = parent?.currentCSSZoom ?? 1
    if (z === 1 || !z) return
    const o = state.modifiersData.popperOffsets
    if (o && o.x != null && o.y != null) { o.x /= z; o.y /= z }
    const a = state.modifiersData.arrow
    if (a) { if (a.x != null) a.x /= z; if (a.y != null) a.y /= z }
  }
}

export default defineComponent({
  name: 'UiPopover',
  inheritAttrs: false,
  props: {
    trigger: {
      type: String,
      default: undefined
    },
    boundary: {
      type: String,
      default: undefined
    },
    // A selector for the popup's parent: lets it escape a faded or clipped row.
    appendTo: {
      type: String,
      default: undefined
    },
    placement: {
      type: String as PropType<Placement>,
      default: undefined
    },
    arrow: {
      type: Boolean,
      default: true
    },
    delay: {
      type: [Array, Number] as PropType<number | [number | null, number | null]>,
      default: 0
    },
    tagName: {
      type: String,
      default: 'span'
    }
  },
  setup (props) {
    const target = ref<HTMLElement>(null!)
    const content = ref<HTMLElement>(null!)
    let instance: Instance

    onMounted(() => {
      instance = tippy(target.value, {
        content: content.value,
        interactive: true,
        theme: 'light',
        trigger: props.trigger,
        placement: props.placement,
        arrow: props.arrow,
        delay: props.delay,
        maxWidth: 'none',
        ...(props.appendTo
          ? { appendTo: (ref: Element) => document.querySelector(props.appendTo!) ?? ref.parentNode as Element }
          : {}),
        popperOptions: {
          modifiers: [
            UNZOOM,
            ...(props.boundary
              ? [{
                  name: 'preventOverflow',
                  options: {
                    boundary: document.querySelector(props.boundary)
                  }
                }]
              : [])
          ]
        }
      })
    })

    onBeforeUnmount(() => {
      instance.destroy()
    })

    return {
      target,
      content,
      // woke: a menu inside closes itself after a pick.
      hide: () => { instance?.hide() }
    }
  }
})
</script>

<style lang="postcss">
.tippy-box {
  @apply rounded;
}

.tippy-content {
  @apply p-1;
}
</style>
