<template>
  <div ref="root" class="w-surface w-enter" :class="$style.panel" :style="boxStyle" data-w-panel
    @keydown="onKey">
    <div v-if="title || $slots.title || $slots.actions || icon" :class="$style.head" data-widget-drag
      :title="headTip" @dblclick="onHeadDblClick">
      <WIcon v-if="icon" v-bind="iconProps" size="md" :class="$style.icon" />
      <span :class="$style.title" class="w-trunc">
        <slot name="title">{{ title }}</slot>
      </span>
      <span v-if="!minimized && (updated != null || hotkey || $slots.actions)" :class="$style.actions">
        <span v-if="updated != null" :class="[$style.age, $style[fresh]]" :title="ageTitle">
          <span :class="$style.dot" />{{ busy ? 'refreshing' : ago(updated) }}
        </span>
        <WKbd v-if="hotkey" :keys="hotkey" :title="`Opens with ${hotkey}`" />
        <slot name="actions" />
      </span>
      <span v-if="primary && windowActions.length" :class="$style.controls">
        <button v-for="a in windowActions" :key="a.id" type="button" class="w-icon-btn"
          :class="[$style.control, { 'w-icon-btn--on': a.active, [$style.danger]: a.danger }]"
          :title="a.label" :aria-label="a.label" @click="a.action()"><i :class="a.icon" /></button>
      </span>
      <span v-if="busy" :class="$style.busy" aria-hidden="true" />
    </div>
    <div v-if="$slots.banner" v-show="!minimized"><slot name="banner" /></div>
    <div v-if="$slots.tabs" v-show="!minimized" :class="$style.tabs"><slot name="tabs" /></div>
    <div v-if="$slots.toolbar" v-show="!minimized" :class="$style.toolbar"><slot name="toolbar" /></div>
    <div v-if="$slots.meta" v-show="!minimized" :class="$style.meta"><slot name="meta" /></div>
    <div v-show="!minimized" :class="[$style.body, { 'w-scroll': scroll, 'w-stale': stale }]"><slot /></div>
    <div v-if="$slots.footer" v-show="!minimized" :class="$style.footer"><slot name="footer" /></div>
    <template v-if="canResize">
      <span :class="[$style.edgeX, hSide === 'left' ? $style.onLeft : $style.onRight]" @mousedown="startResize($event, true, false)" />
      <span :class="[$style.edgeY, vSide === 'top' ? $style.onTop : $style.onBottom]" @mousedown="startResize($event, false, true)" />
      <span :class="[$style.grip, hSide === 'left' ? $style.onLeft : $style.onRight, vSide === 'top' ? $style.onTop : $style.onBottom]"
        title="Drag to resize · right-click the panel to reset" @mousedown="startResize($event, true, true)" />
    </template>
  </div>
</template>

<script setup lang="ts">
// Widget shell for every woke module (pick H2): game icon, title, data age and
// the hotkey that opens it, then optional banner/tabs/toolbar/meta, a
// scrolling body and a footer. Keyboard (P8): arrow keys move between rows,
// "/" jumps to the first search field, Esc leaves a field.
import { computed, inject, onBeforeUnmount, ref, useSlots } from 'vue'
import { snapEdge, clearGuides, releaseWebviewsForDrag } from './snap'
import WIcon from './WIcon.vue'
import WKbd from './WKbd.vue'
import { ago, freshness } from './format'

const props = withDefaults(defineProps<{
  title?: string
  // Starting size. Pass these rather than an inline style, which would beat
  // the size the user dragged it to.
  width?: string
  height?: string
  maxHeight?: string
  scroll?: boolean
  // Game art for the header: a mechanic id ("essence", "lab"), a currency
  // ("divine"), or an image path.
  icon?: string
  // When the data was fetched (ms). Shows its age with a fresh/aging/stale dot.
  updated?: number | null
  // Fresh/stale thresholds in minutes for `updated`.
  freshMin?: number
  staleMin?: number
  hotkey?: string | null
  // A refresh is running: keeps the rows and shows a thin bar (pick L2).
  busy?: boolean
  // Rows are old data shown under an error banner: dims the body.
  stale?: boolean
  // Edge resize (pick R2), remembered in the widget config under sizeKey.
  // Give secondary panels in the same widget their own key.
  resizable?: boolean
  sizeKey?: string
}>(), {
  title: undefined,
  width: undefined,
  height: undefined,
  maxHeight: '75vh',
  scroll: true,
  icon: undefined,
  updated: undefined,
  freshMin: 15,
  staleMin: 120,
  hotkey: undefined,
  busy: false,
  stale: false,
  resizable: true,
  sizeKey: 'main'
})

const root = ref<HTMLElement | null>(null)

// ---- Size (P10, P17) ----
interface WindowAction { id: string, label: string, icon: string, active?: boolean, danger?: boolean, action: () => void }
interface SizedConfig {
  anchor?: { pos: string, y: number }
  wokeSizes?: Record<string, { w?: number, h?: number }>
  // From the surrounding Widget: its window buttons and minimized state.
  minimized?: boolean
  canMinimize?: boolean
  windowActions?: WindowAction[]
  toggleMinimize?: () => void
  addPanel?: (id: symbol) => void
  removePanel?: (id: symbol) => void
  isPrimaryPanel?: (id: symbol) => boolean
}
const cfg = inject<SizedConfig | null>('wokeWidgetConfig', null)

// ---- Window buttons ----
// The widget's first titled panel carries them. While the widget is minimized
// that panel shows only its title bar and the others hide. The contents stay
// mounted, so a running search or a typed filter is still there on restore.
const panelId = Symbol('panel')
const slots = useSlots()
if (props.title || props.icon || slots.title || slots.actions) {
  cfg?.addPanel?.(panelId)
  onBeforeUnmount(() => cfg?.removePanel?.(panelId))
}
const primary = computed(() => cfg?.isPrimaryPanel?.(panelId) ?? false)
const minimized = computed(() => !!cfg?.minimized)
const windowActions = computed(() => cfg?.windowActions ?? [])
const minimizesFromHead = computed(() => primary.value && !!cfg?.canMinimize)

const canResize = computed(() => props.resizable && !!cfg?.anchor && !minimized.value)
const saved = computed(() => cfg?.wokeSizes?.[props.sizeKey])
// Handles sit on the sides away from the widget's anchor, so the panel grows
// toward the mouse.
const hSide = computed(() => cfg?.anchor?.pos[1] === 'r' ? 'left' : 'right')
const vSide = computed(() => cfg?.anchor?.pos[0] === 'b' ? 'top' : 'bottom')

const MINIMIZED_WIDTH = '16rem'

const boxStyle = computed(() => {
  if (minimized.value) return primary.value ? { width: MINIMIZED_WIDTH, maxHeight: 'none' } : { display: 'none' }
  const s = saved.value
  const a = cfg?.anchor
  // A fixed height stops at the screen bottom, so the resize handle stays
  // reachable wherever the widget is dragged. Width shrinks by itself: the
  // widget has a max-width, and panels may go narrower than their content.
  const fixed = s?.h || props.height
  const fit = fixed && a?.pos[0] === 't' ? `calc(${100 - a.y}vh - 4px)` : undefined
  return {
    width: s?.w ? `${s.w}px` : props.width,
    height: s?.h ? `${s.h}px` : props.height,
    maxHeight: fit ?? (s?.h ? 'none' : props.maxHeight)
  }
})

function uiScale () {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
}

function startResize (e: MouseEvent, x: boolean, y: boolean) {
  const el = root.value
  if (!el || !cfg || e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  const r = el.getBoundingClientRect()
  const scale = uiScale()
  const pos = cfg.anchor?.pos ?? 'tl'
  const xGrow = (pos[1] === 'c' ? 2 : 1) * (hSide.value === 'left' ? -1 : 1)
  const yGrow = (pos[0] === 'c' ? 2 : 1) * (vSide.value === 'top' ? -1 : 1)
  const xEdge = hSide.value === 'left' ? r.left : r.right
  const yEdge = vSide.value === 'top' ? r.top : r.bottom
  const restoreWebviews = releaseWebviewsForDrag()

  function onMove (ev: MouseEvent) {
    const next = { ...(cfg!.wokeSizes?.[props.sizeKey] ?? {}) }
    if (x) {
      const edge = snapEdge('x', xEdge + ev.clientX - e.clientX, el, ev.altKey)
      const w = (r.width + (edge - xEdge) * xGrow) / scale
      next.w = Math.round(Math.min(Math.max(w, 200), (window.innerWidth - 16) / scale))
    }
    if (y) {
      const edge = snapEdge('y', yEdge + ev.clientY - e.clientY, el, ev.altKey)
      const h = (r.height + (edge - yEdge) * yGrow) / scale
      next.h = Math.round(Math.min(Math.max(h, 120), (window.innerHeight - 16) / scale))
    }
    cfg!.wokeSizes = { ...(cfg!.wokeSizes ?? {}), [props.sizeKey]: next }
  }
  function onUp () {
    restoreWebviews()
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    clearGuides()
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const headTip = computed(() => {
  if (minimizesFromHead.value) return minimized.value ? 'Double-click to restore' : 'Double-click to minimize'
  return canResize.value && saved.value ? 'Double-click to reset the size' : undefined
})

function onHeadDblClick (e: MouseEvent) {
  if ((e.target as Element).closest('button, a, input')) return
  if (minimizesFromHead.value) cfg!.toggleMinimize!()
  else resetSize()
}

function resetSize () {
  if (!cfg?.wokeSizes?.[props.sizeKey]) return
  cfg.wokeSizes = Object.fromEntries(Object.entries(cfg.wokeSizes).filter(([k]) => k !== props.sizeKey))
}

const iconProps = computed(() => {
  const i = props.icon!
  if (i.startsWith('/') || i.startsWith('http')) return { src: i }
  if (i === 'chaos' || i === 'divine' || i === 'exalted' || i === 'wisdom' || i === 'dust') return { currency: i }
  return { mechanic: i }
})

const fresh = computed(() => freshness(props.updated, props.freshMin, props.staleMin))
const ageTitle = computed(() => props.updated ? `Data from ${new Date(props.updated).toLocaleString()}` : 'No data yet')

const ROW_SELECTOR = 'button.w-row, a.w-row, .w-row[tabindex], .w-focusable, [data-nav]'

function onKey (e: KeyboardEvent) {
  const el = root.value
  if (!el) return
  const target = e.target as HTMLElement
  const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
  if (typing) {
    if (e.key === 'Escape' && target.tagName !== 'SELECT') target.blur()
    // Not in a number field: there ArrowDown steps the value down.
    else if (e.key === 'ArrowDown' && target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'number') { e.preventDefault(); focusRow(el, 0) }
    return
  }
  if (e.key === '/') {
    const field = el.querySelector<HTMLInputElement>('input:not([type=checkbox]):not([type=radio]):not([type=range])')
    if (field) { e.preventDefault(); field.focus(); field.select() }
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const rows = [...el.querySelectorAll<HTMLElement>(ROW_SELECTOR)].filter(r => r.offsetParent !== null)
    if (!rows.length) return
    e.preventDefault()
    const i = rows.indexOf(document.activeElement as HTMLElement)
    const next = i < 0 ? 0 : Math.min(rows.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))
    rows[next].focus()
    rows[next].scrollIntoView({ block: 'nearest' })
  }
}

function focusRow (el: HTMLElement, i: number) {
  const rows = [...el.querySelectorAll<HTMLElement>(ROW_SELECTOR)].filter(r => r.offsetParent !== null)
  rows[i]?.focus()
}

defineExpose({ el: root })
</script>

<style module>
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.head {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--w-s2);
  min-height: 32px;
  padding: 4px 6px 4px var(--w-pad);
  background: var(--w-header-bg);
  border-bottom: 1px solid var(--w-line);
}
.icon { margin-left: -2px; }
.title {
  flex: 1;
  font-family: var(--w-head);
  font-size: var(--w-head-size);
  letter-spacing: var(--w-head-track);
  color: var(--w-fg);
}
:global([data-woke-theme="native"]) .title { color: var(--w-accent); }
/* Diamond marker only when there's no game icon. */
:global(:root:not([data-woke-theme="native"]):not([data-woke-theme="modern"])) .head > .title:first-child::before {
  content: "";
  display: inline-block;
  width: 5px;
  height: 5px;
  margin-right: 9px;
  background: var(--w-accent);
  transform: translateY(-2px) rotate(45deg);
}
.actions { display: flex; align-items: center; gap: var(--w-s1); }
.controls { display: flex; align-items: center; flex: none; }
.control { width: 20px; height: 20px; font-size: var(--w-fs-xs); }
.danger:hover { color: var(--w-down); }
.age {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 2px;
  font-size: var(--w-fs-xs);
  color: var(--w-dim);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.fresh .dot { background: var(--w-up); }
.aging .dot { background: var(--w-warn); }
.stale { color: var(--w-faint); }
.stale .dot { background: var(--w-faint); }
.busy {
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 2px;
  width: 35%;
  background: var(--w-accent);
  animation: busy 1.3s ease-in-out infinite;
}
@keyframes busy { from { left: -35%; } to { left: 100%; } }
@media (prefers-reduced-motion: reduce) { .busy { animation: none; left: 0; width: 100%; opacity: 0.5; } }
.tabs { padding: 4px 8px 0; border-bottom: 1px solid var(--w-line); }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px; }
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  padding: 6px var(--w-pad);
  font-size: var(--w-fs-sm);
  color: var(--w-dim);
}
.toolbar + .meta { padding-top: 0; }
.body { min-height: 0; flex: 1; }

/* Resize handles: invisible edges, a small grip shows on hover. */
.edgeX, .edgeY, .grip { position: absolute; z-index: 2; }
.edgeX { top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
.edgeY { left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.edgeX.onRight { right: -3px; }
.edgeX.onLeft { left: -3px; }
.edgeY.onBottom { bottom: -3px; }
.edgeY.onTop { top: -3px; }
.grip { width: 12px; height: 12px; opacity: 0; transition: opacity var(--w-dur-in); }
.grip.onRight.onBottom { right: 1px; bottom: 1px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 0 50%, var(--w-line-strong) 50% 60%, transparent 60% 72%, var(--w-line-strong) 72% 82%, transparent 82%); }
.grip.onLeft.onBottom { left: 1px; bottom: 1px; cursor: nesw-resize; background: linear-gradient(225deg, transparent 0 50%, var(--w-line-strong) 50% 60%, transparent 60% 72%, var(--w-line-strong) 72% 82%, transparent 82%); }
.grip.onRight.onTop { right: 1px; top: 1px; cursor: nesw-resize; background: linear-gradient(45deg, transparent 0 50%, var(--w-line-strong) 50% 60%, transparent 60% 72%, var(--w-line-strong) 72% 82%, transparent 82%); }
.grip.onLeft.onTop { left: 1px; top: 1px; cursor: nwse-resize; background: linear-gradient(315deg, transparent 0 50%, var(--w-line-strong) 50% 60%, transparent 60% 72%, var(--w-line-strong) 72% 82%, transparent 82%); }
.panel:hover > .grip { opacity: 1; }
.footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px var(--w-pad);
  border-top: 1px solid var(--w-line);
  font-size: var(--w-fs-sm);
  color: var(--w-dim);
}
</style>
