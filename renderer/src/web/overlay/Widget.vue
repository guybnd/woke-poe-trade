<template>
  <div @mousedown="handleMouseDown" @contextmenu="handleContextMenu">
    <div ref="widgetEl" :class="[$style.widget, { 'opacity-75': isMoving, [$style.draggable]: moveHandles !== 'none' }]" :style="widgetPosition"
      @animationend="handleAnimationEnd">
      <slot :isEditing="isEditing" :isMoving="isMoving" />
      <div v-if="isMoving">
        <div v-if="isHandleShown('tl')" :class="$style.mover" @mousedown="startMove('tl', $event)" style="left: -0.5rem; top: -0.5rem;"></div>
        <div v-if="isHandleShown('tc')" :class="$style.mover" @mousedown="startMove('tc', $event)" style="left: calc(50%  - 0.5rem); top: -0.5rem;"></div>
        <div v-if="isHandleShown('tr')" :class="$style.mover" @mousedown="startMove('tr', $event)" style="left: calc(100% - 0.5rem); top: -0.5rem;"></div>
        <div v-if="isHandleShown('cr')" :class="$style.mover" @mousedown="startMove('cr', $event)" style="left: calc(100% - 0.5rem); top: calc(50% - 0.5rem);"></div>
        <div v-if="isHandleShown('br')" :class="$style.mover" @mousedown="startMove('br', $event)" style="left: calc(100% - 0.5rem); top: calc(100% - 0.5rem);"></div>
        <div v-if="isHandleShown('bc')" :class="$style.mover" @mousedown="startMove('bc', $event)" style="left: calc(50%  - 0.5rem); top: calc(100% - 0.5rem);"></div>
        <div v-if="isHandleShown('bl')" :class="$style.mover" @mousedown="startMove('bl', $event)" style="left: -0.5rem; top: calc(100% - 0.5rem);"></div>
        <div v-if="isHandleShown('cl')" :class="$style.mover" @mousedown="startMove('cl', $event)" style="left: -0.5rem; top: calc(50%  - 0.5rem);"></div>
        <div v-if="isHandleShown('cc')" :class="$style.mover" @mousedown="startMove('cc', $event)" style="left: calc(50%  - 0.5rem); top: calc(50%  - 0.5rem);"></div>
      </div>
    </div>
    <div v-if="isMoving" :class="[$style.mover, $style.active]" :style="moverPosition" @mousedown="startMove(config.anchor.pos, $event)"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, inject, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue'
import { Widget, Anchor, WidgetManager } from './interfaces'
import { useI18n } from 'vue-i18n'
import { snapMove, clearGuides, clampDrag, releaseWebviewsForDrag, swallowNextClick } from '@/web/woke/ui/snap'
import { openMenu, toast } from '@/web/woke/ui/layer'
import type { MenuEntry } from '@/web/woke/ui/layer'
import { fitOffset } from '@/web/woke/ui/panel-fit'
import { minimizeAnchor, restoreAnchor } from '@/web/woke/ui/window-anchor'
import type { MinimizedState } from '@/web/woke/ui/window-anchor'

const DRAG_START_PX = 4
const MIN_ROOM_W_PX = 240
const MIN_ROOM_H_PX = 240

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default defineComponent({
  props: {
    config: {
      type: Object as PropType<Widget & { anchor: Anchor }>,
      required: true
    },
    moveHandles: {
      type: [String, Array] as PropType<string | string[]>,
      default: undefined
    },
    readonly: {
      type: Boolean,
      default: false
    },
    removable: {
      type: Boolean,
      default: true
    },
    hideable: {
      type: Boolean,
      default: true
    },
    inlineEdit: {
      type: Boolean,
      default: true
    }
  },
  // 'moved': the user dragged the widget to a new spot. Resizing can shift the
  // anchor too, but that isn't a move.
  emits: ['moved'],
  setup (props, { emit }) {
    const wm = inject<WidgetManager>('wm')!
    const { t } = useI18n()
    const isEditing = ref(false)
    const isMoving = ref(false)
    const widgetEl = ref<HTMLElement | null>(null)

    type WokeConfig = { wokeSizes?: Record<string, unknown>, wokeMinimized?: MinimizedState }
    const woke = () => props.config as unknown as WokeConfig

    // woke: panels that have a title bar, first one shows the window buttons.
    const panels = shallowRef<symbol[]>([])

    // Fixed-in-place widgets are given a copy of their config, so nothing
    // written here would stick.
    const canMinimize = computed(() => props.moveHandles !== 'none' && (panels.value.length > 0 || !!woke().wokeMinimized))
    const minimized = computed(() => canMinimize.value && !!woke().wokeMinimized)

    // ---- Staying on screen ----
    // A widget that overflows is drawn shifted back on screen when it opens,
    // changes size, or the window changes. The shift isn't saved: the overlay
    // window can be briefly small, and a panel's content can grow for a moment,
    // and neither should lose where the user put it. Moving or resizing the
    // widget by hand makes the shifted spot the real one.
    const fitShift = shallowRef({ x: 0, y: 0 })
    let fitHeld = false

    // Fixed-height panels can stick out of the widget's own box.
    function widgetBounds () {
      const el = widgetEl.value
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (!r.width && !r.height) return null
      const box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      for (const panel of el.querySelectorAll('[data-w-panel]')) {
        const p = panel.getBoundingClientRect()
        if (!p.width || !p.height) continue
        box.left = Math.min(box.left, p.left)
        box.top = Math.min(box.top, p.top)
        box.right = Math.max(box.right, p.right)
        box.bottom = Math.max(box.bottom, p.bottom)
      }
      return box
    }

    function fitToScreen () {
      if (fitHeld || isMoving.value) return
      const zero = { x: 0, y: 0 }
      if (props.moveHandles === 'none') { fitShift.value = zero; return }
      const box = widgetBounds()
      const W = window.innerWidth
      const H = window.innerHeight
      if (!box || !W || !H) return
      const { x, y } = fitShift.value
      const next = fitOffset({ left: box.left - x, right: box.right - x, top: box.top - y, bottom: box.bottom - y }, W, H)
      if (next.x !== x || next.y !== y) fitShift.value = next
    }

    function bakeFitShift () {
      const { x, y } = fitShift.value
      if (!x && !y) return
      props.config.anchor.x += x / window.innerWidth * 100
      props.config.anchor.y += y / window.innerHeight * 100
      fitShift.value = { x: 0, y: 0 }
    }

    function beginResize () {
      bakeFitShift()
      fitHeld = true
      return () => { fitHeld = false; fitToScreen() }
    }

    // Fires on opening too: a hidden widget has no size. Made on first use, as
    // the panels inside mount before this component does.
    let sizeObserver: ResizeObserver | null = null
    const observer = () => (sizeObserver ??= new ResizeObserver(fitToScreen))
    onMounted(() => {
      if (widgetEl.value) observer().observe(widgetEl.value)
      window.addEventListener('resize', fitToScreen)
    })
    onBeforeUnmount(() => {
      sizeObserver?.disconnect()
      window.removeEventListener('resize', fitToScreen)
    })
    watch(() => [props.config.anchor.pos, props.config.anchor.x, props.config.anchor.y], fitToScreen, { flush: 'post' })

    function toggleMinimize () {
      if (!widgetEl.value || !canMinimize.value) return
      const rect = widgetEl.value.getBoundingClientRect()
      const state = woke().wokeMinimized
      fitShift.value = { x: 0, y: 0 }
      if (state) {
        props.config.anchor = restoreAnchor(state, props.config.anchor, rect, window.innerWidth, window.innerHeight)
        woke().wokeMinimized = undefined
      } else {
        const next = minimizeAnchor(props.config.anchor, rect, window.innerWidth, window.innerHeight)
        props.config.anchor = { ...next.pinned }
        woke().wokeMinimized = next
      }
    }

    function hide () {
      wm.hide(props.config.wmId)
    }
    function toggleEdit () {
      isMoving.value = false
      if (props.inlineEdit) {
        isEditing.value = !isEditing.value
      } else {
        const settings = wm.widgets.value.find(w => w.wmType === 'settings')!
        wm.setFlag(settings.wmId, `settings::widget=${props.config.wmId}`, true)
        wm.show(settings.wmId)
      }
    }
    function toggleMove () {
      bakeFitShift()
      isMoving.value = !isMoving.value
      isEditing.value = false
      fitToScreen()
    }
    // No "are you sure": delete now, offer Undo (P9).
    function removeWidget () {
      const config = props.config
      wm.remove(config.wmId)
      toast(`${config.wmTitle || capitalize(config.wmType)} deleted`, { ms: 10000, undo: () => { wm.widgets.value.push(config) } })
    }

    // In title-bar order. Panels draw these as buttons; the right-click menu
    // lists the same ones, plus the options too rare to earn a button.
    const windowActions = computed(() => [
      ...(!props.readonly ? [{ id: 'edit', label: capitalize(t('widget.edit')), icon: 'fas fa-cog', active: isEditing.value, action: toggleEdit }] : []),
      ...(props.removable ? [{ id: 'delete', label: capitalize(t('widget.delete')), icon: 'fas fa-trash', danger: true, action: removeWidget }] : []),
      ...(canMinimize.value
        ? [{ id: 'minimize', label: minimized.value ? 'Restore' : 'Minimize', icon: minimized.value ? 'fas fa-window-maximize' : 'fas fa-minus', action: toggleMinimize }]
        : []),
      ...(props.hideable ? [{ id: 'hide', label: capitalize(t('widget.hide')), icon: 'fas fa-times', action: hide }] : [])
    ])

    function handleContextMenu (e: MouseEvent) {
      // A row inside already opened its own menu; text fields keep their own.
      if (e.defaultPrevented || !widgetEl.value?.contains(e.target as Node)) return
      if ((e.target as Element).closest('input, textarea, select, webview')) return

      const get = (id: string) => windowActions.value.find(a => a.id === id)
      const entry = (id: string) => {
        const a = get(id)
        return a ? [{ label: a.label, icon: a.icon, danger: a.danger, action: a.action }] : []
      }
      const sizes = woke().wokeSizes
      const items: MenuEntry[] = [
        ...entry('minimize'),
        ...entry('hide'),
        ...entry('edit'),
        // Dragging moves a widget; these handles only change the corner it
        // stays anchored to, which sets the way it grows.
        ...(props.moveHandles !== 'none'
          ? [{ label: isMoving.value ? 'Done choosing anchor' : 'Choose anchor corner', icon: 'fas fa-anchor', action: toggleMove }]
          : []),
        ...(sizes && Object.keys(sizes).length
          ? [{ label: 'Reset size', icon: 'fas fa-undo', action: () => { woke().wokeSizes = {} } }]
          : []),
        ...(get('delete') ? [{ separator: true as const }, ...entry('delete')] : [])
      ]
      if (items.length) openMenu(e, items)
    }

    // woke: panels inside read the widget config to remember their size.
    // Through getters: the config object is replaced whenever the whole
    // config is (settings changes), while this component stays mounted.
    provide('wokeWidgetConfig', {
      get anchor () { return props.config.anchor },
      get wokeSizes () { return woke().wokeSizes },
      set wokeSizes (v: Record<string, unknown> | undefined) { woke().wokeSizes = v },
      get canMove () { return props.moveHandles !== 'none' },
      get element () { return widgetEl.value },
      bounds: widgetBounds,
      beginResize,
      watchSize (el: Element) {
        observer().observe(el)
        return () => observer().unobserve(el)
      },
      get minimized () { return minimized.value },
      get canMinimize () { return canMinimize.value },
      get windowActions () { return windowActions.value },
      toggleMinimize,
      addPanel (id: symbol) { panels.value = [...panels.value, id] },
      removePanel (id: symbol) { panels.value = panels.value.filter(p => p !== id) },
      isPrimaryPanel (id: symbol) { return panels.value[0] === id }
    })

    const moverPosition = computed(() => {
      const { anchor, wmZorder } = props.config
      return {
        'top': `max(0%, min(calc(${anchor.y}% - (1rem/2)), calc(100% - 1rem)))`,
        'left': `max(0%, min(calc(${anchor.x}% - (1rem/2)), calc(100% - 1rem)))`,
        'z-index': (typeof wmZorder === 'number') ? wmZorder : undefined
      }
    })

    const widgetPosition = computed(() => {
      const { anchor, wmZorder } = props.config
      const shift = fitShift.value

      // <top, center, bottom><left, center, right>
      let translate: string | undefined
      let max = { w: 100, h: 100 }
      if (anchor.pos === 'tl') {
        translate = undefined
        max = { w: 100 - anchor.x, h: 100 - anchor.y }
      } else if (anchor.pos === 'tc') {
        translate = 'translate(-50%, 0%)'
        max = { w: 2 * Math.min(100 - anchor.x, anchor.x), h: 100 - anchor.y }
      } else if (anchor.pos === 'tr') {
        translate = 'translate(-100%, 0%)'
        max = { w: anchor.x, h: 100 - anchor.y }
      } else if (anchor.pos === 'cr') {
        translate = 'translate(-100%, -50%)'
        max = { w: anchor.x, h: 2 * Math.min(100 - anchor.y, anchor.y) }
      } else if (anchor.pos === 'br') {
        translate = 'translate(-100%, -100%)'
        max = { w: anchor.x, h: anchor.y }
      } else if (anchor.pos === 'bc') {
        translate = 'translate(-50%, -100%)'
        max = { w: 2 * Math.min(100 - anchor.x, anchor.x), h: anchor.y }
      } else if (anchor.pos === 'bl') {
        translate = 'translate(0%, -100%)'
        max = { w: 100 - anchor.x, h: anchor.y }
      } else if (anchor.pos === 'cl') {
        translate = 'translate(0%, -50%)'
        max = { w: 100 - anchor.x, h: 2 * Math.min(100 - anchor.y, anchor.y) }
      } else if (anchor.pos === 'cc') {
        translate = 'translate(-50%, -50%)'
        max = { w: 2 * Math.min(100 - anchor.x, anchor.x), h: 2 * Math.min(100 - anchor.y, anchor.y) }
      }

      return {
        'top': shift.y ? `calc(${anchor.y}% + ${shift.y}px)` : `${anchor.y}%`,
        'left': shift.x ? `calc(${anchor.x}% + ${shift.x}px)` : `${anchor.x}%`,
        // With a floor: near a screen edge the widget keeps a usable size and
        // fitToScreen moves it, instead of being crushed to nothing.
        'max-width': `max(${max.w}%, ${MIN_ROOM_W_PX}px)`,
        'max-height': `max(${max.h}%, ${MIN_ROOM_H_PX}px)`,
        'transform': translate,
        'z-index': (typeof wmZorder === 'number') ? wmZorder : undefined
      }
    })

    const shownHandles = computed(() => {
      if (Array.isArray(props.moveHandles)) {
        return props.moveHandles
      }
      if (!props.moveHandles) {
        return ['tl', 'tc', 'tr', 'cr', 'br', 'bc', 'bl', 'cl', 'cc']
      }
      if (props.moveHandles === 'center') {
        return ['cc']
      }
      if (props.moveHandles === 'corners') {
        return ['tl', 'tr', 'br', 'bl']
      }
      if (props.moveHandles === 'top-bottom') {
        return ['tl', 'tc', 'tr', 'br', 'bc', 'bl']
      }
      return []
    })

    function startMove (pos: string, e: MouseEvent) {
      const restoreWebviews = releaseWebviewsForDrag()
      fitShift.value = { x: 0, y: 0 }
      emit('moved')
      props.config.anchor.pos = pos
      updatePosition(e)
      document.addEventListener('mousemove', updatePosition)
      document.addEventListener('mouseup', endMove)

      function endMove () {
        restoreWebviews()
        document.removeEventListener('mousemove', updatePosition)
        document.removeEventListener('mouseup', endMove)
      }
    }

    // woke: drag a widget directly instead of going through its Move handles.
    // Woke panels drag by their title bar; other widgets by any part that isn't a control.
    function startDrag (e: MouseEvent) {
      if (e.button !== 0 || props.moveHandles === 'none' || isMoving.value || !widgetEl.value) return
      const target = e.target as Element
      if (target.closest('button, a, input, select, textarea, label, [role="button"]')) return
      if (target.closest('.w-surface') && !target.closest('[data-widget-drag]')) return
      e.preventDefault()

      const rect = widgetEl.value.getBoundingClientRect()
      // From where it's drawn, which can differ from the saved spot (see fitToScreen).
      const startX = props.config.anchor.x + fitShift.value.x / window.innerWidth * 100
      const startY = props.config.anchor.y + fitShift.value.y / window.innerHeight * 100
      const restoreWebviews = releaseWebviewsForDrag()
      let dragged = false

      function onMove (ev: MouseEvent) {
        const dx = ev.clientX - e.clientX
        const dy = ev.clientY - e.clientY
        if (!dragged && Math.hypot(dx, dy) < DRAG_START_PX) return
        if (!dragged) { fitHeld = true; fitShift.value = { x: 0, y: 0 }; emit('moved') }
        dragged = true
        // Snaps to screen edges and other panels (Alt moves freely), then
        // keeps it on screen (see clampDrag).
        const s = snapMove(rect, dx, dy, widgetEl.value, ev.altKey)
        const c = clampDrag(rect, s.dx, s.dy, window.innerWidth, window.innerHeight)
        props.config.anchor.x = startX + c.dx / window.innerWidth * 100
        props.config.anchor.y = startY + c.dy / window.innerHeight * 100
      }
      function onUp () {
        restoreWebviews()
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        clearGuides()
        // Stays where it was dropped, even partly off screen: a big panel can be
        // pushed aside (see clampDrag), and it comes back the next time it opens.
        fitHeld = false
        if (dragged) swallowNextClick()
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    function updatePosition (e: MouseEvent) {
      props.config.anchor.x = Math.min(Math.max(e.clientX / window.innerWidth, 0), 1) * 100
      props.config.anchor.y = Math.min(Math.max(e.clientY / window.innerHeight, 0), 1) * 100
    }

    return {
      moverPosition,
      widgetPosition,
      widgetEl,
      handleContextMenu,
      // Panels rise into place when they open, which throws off a measurement
      // taken during that.
      handleAnimationEnd (e: AnimationEvent) {
        if (e.animationName === 'w-enter') fitToScreen()
      },
      handleMouseDown (e: MouseEvent) {
        // @TODO: why null check?
        if (props.config.wmId != null) {
          wm.bringToTop(props.config.wmId)
        }
        startDrag(e)
      },
      startMove,
      isMoving,
      isEditing,
      isHandleShown (pos: string) {
        return props.config.anchor.pos !== pos &&
          shownHandles.value.includes(pos)
      }
    }
  }
})
</script>

<style lang="postcss" module>
.widget {
  position: absolute;
  display: flex;
}

.draggable :global([data-widget-drag]) {
  cursor: move;
}

.mover {
  position: absolute;
  /* top: max(0%, min(calc(y% - (1rem/2)), calc(100% - 1rem))); */
  /* left: max(0%, min(calc(x% - (1rem/2)), calc(100% - 1rem))); */
  width: 1rem;
  height: 1rem;
  border: 0.25rem solid rgba(0, 0, 0, 0.6);
  background: rgba(0,0,0,0.2);
  cursor: move;
  user-select: none;

  &.active {
    position: fixed;
    border-color: #fff;
    box-shadow: 0 1px 3px 0 rgb(0, 0, 0),
                0 1px 2px 0 rgb(0, 0, 0);
  }
}
</style>

<style lang="postcss">
.widget-default-style {
  @apply rounded;
  @apply bg-gray-900;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.75),
              0 1px 2px 0 rgba(0, 0, 0, 0.75);
}
</style>
