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

// woke: a popover inside a CSS zoom (UI size, Panel size) that its offset
// parent is outside of: Popper reads the target in screen px but the popover
// in its own local px, and applies the result inside the zoom, which scales it
// again. ZOOM_RECTS measures the popover in screen px too (set, not scaled:
// a flip reruns it), UNZOOM turns the result back into local px, and
// computeStyles stays on left/top: its right/bottom maths mixes the two.
// A popover whose offset parent shares its zoom needs neither (f = 1).
type Offsets = { x?: number, y?: number } | undefined
type ZoomState = {
  elements: { popper: HTMLElement }
  rects: { popper: { width: number, height: number } }
  modifiersData: Record<string, Offsets>
}
function zoomOf (el: Element | null | undefined): number {
  return (el as (Element & { currentCSSZoom?: number }) | null | undefined)?.currentCSSZoom || 1
}
function zoomFactor (popper: HTMLElement) {
  return zoomOf(popper) / zoomOf(popper.offsetParent)
}
const ZOOM_RECTS = {
  name: 'zoomRects',
  enabled: true,
  phase: 'beforeRead' as const,
  fn ({ state }: { state: ZoomState }) {
    const pop = state.elements.popper
    if (zoomFactor(pop) === 1) return
    const r = pop.getBoundingClientRect()
    const zo = zoomOf(pop.offsetParent)
    state.rects.popper.width = r.width / zo
    state.rects.popper.height = r.height / zo
  }
}
const UNZOOM = {
  name: 'unzoom',
  enabled: true,
  phase: 'main' as const,
  requires: ['popperOffsets'],
  requiresIfExists: ['offset', 'preventOverflow', 'arrow', 'flip'],
  fn ({ state }: { state: ZoomState }) {
    const f = zoomFactor(state.elements.popper)
    if (f === 1) return
    const o = state.modifiersData.popperOffsets
    if (o && o.x != null && o.y != null) { o.x /= f; o.y /= f }
    const a = state.modifiersData.arrow
    if (a) { if (a.x != null) a.x /= f; if (a.y != null) a.y /= f }
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
            ZOOM_RECTS,
            UNZOOM,
            { name: 'computeStyles', options: { adaptive: false } },
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
