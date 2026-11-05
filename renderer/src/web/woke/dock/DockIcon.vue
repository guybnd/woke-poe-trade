<template>
  <span ref="rootEl" :class="$style.root" :data-dock="host.props.id">
    <span ref="iconEl" :class="[$style.icon, { [$style.peek]: peekText, [$style.hot]: showCard }]"
      :title="wm.active.value ? `${host.props.title}${host.props.wmId != null ? ' · click to open' : ''}` : undefined"
      @click="click">
      <span :class="$style.glyph">
        <img v-if="dockArt(host.props) && !artFailed" :src="dockArt(host.props)!" alt="" draggable="false" :class="$style.art" @error="artFailed = true">
        <i v-else :class="dockIcon(host.props)" />
      </span>
      <span v-if="peekText" :class="$style.peekText">{{ peekText }}</span>
      <span v-if="badge != null && badge !== ''" :class="[$style.badge, $style['tone-' + (host.props.tone ?? 'accent')]]">{{ badge }}</span>
      <span v-if="host.props.led" :class="[$style.led, $style['led-' + host.props.led]]" />
    </span>
    <div v-if="showCard" ref="cardEl" :class="[$style.card, placement]"
      :style="{ width: host.props.cardWidth ?? '20rem' }">
      <div :class="$style.cardHead">
        <i :class="dockIcon(host.props)" class="w-accent" />
        <span class="w-head-font w-accent w-trunc">{{ host.props.title }}</span>
      </div>
      <SlotOut :entry="host" />
      <template v-for="ex in extras" :key="ex.key">
        <div :class="$style.extraHead"><i :class="dockIcon(ex.props)" /> {{ ex.props.title }}</div>
        <SlotOut :entry="ex" />
      </template>
      <div v-if="!wm.active.value && host.props.wmId != null" :class="$style.foot">{{ overlayKey }} then click the icon for the full window</div>
    </div>
  </span>
</template>

<script setup lang="ts">
import { computed, defineComponent, inject, onUnmounted, shallowRef, useCssModule, watch } from 'vue'
import type { PropType } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig } from '@/web/Config'
import { useHoverZone } from '../shared/hover'
import type { DockEntry } from './dock'
import { dockArt, dockIcon } from './dock'

const props = defineProps<{
  host: DockEntry
  extras: DockEntry[]
  vertical: boolean
}>()

const wm = inject<WidgetManager>('wm')!
const overlayKey = computed(() => AppConfig().overlayKey)

const rootEl = shallowRef<HTMLElement | null>(null)
const iconEl = shallowRef<HTMLElement | null>(null)
const cardEl = shallowRef<HTMLElement | null>(null)

const badge = computed(() => props.host.props.badge)

// Game art, with the Font Awesome icon as fallback if it doesn't load.
const artFailed = shallowRef(false)
watch(() => dockArt(props.host.props), () => { artFailed.value = false })

// The peek line, while it lasts.
const now = shallowRef(Date.now())
const peekText = computed(() => {
  const p = props.host.peek
  return p && p.until > now.value ? p.text : null
})
watch(() => props.host.peek, (p) => {
  now.value = Date.now()
  if (p) setTimeout(() => { now.value = Date.now() }, Math.max(0, p.until - Date.now()) + 20)
})

const showCard = shallowRef(false)

// Hover works while the game has focus (main process watches the mouse).
const overIcon = useHoverZone(iconEl, { enabled: () => true, onClick: openCard })
const overCard = useHoverZone(cardEl, { enabled: () => showCard.value, activate: () => !!props.host.props.interactive })
const hovering = computed(() => overIcon.value || overCard.value)

// Opens once the mouse rests on the icon, so sweeping past it doesn't pop the
// card (a click opens it at once); closes a moment after leaving so moving
// onto the card doesn't flicker.
const OPEN_AFTER_MS = 120
const CLOSE_AFTER_MS = 250
let timer: ReturnType<typeof setTimeout> | null = null
watch(hovering, (on) => {
  if (timer) { clearTimeout(timer); timer = null }
  if (on === showCard.value) return
  timer = setTimeout(() => { showCard.value = on }, on ? OPEN_AFTER_MS : CLOSE_AFTER_MS)
})
function openCard () {
  if (timer) { clearTimeout(timer); timer = null }
  showCard.value = true
}
// Entries told the card is open; extras can join or leave while it is.
const told = new Set<DockEntry>()
function tellOpen (open: boolean) {
  const now = open ? [props.host, ...props.extras] : []
  for (const e of told) if (!now.includes(e)) { e.onOpen(false); told.delete(e) }
  for (const e of now) if (!told.has(e)) { e.onOpen(true); told.add(e) }
}
watch(showCard, (open) => {
  if (open) place()
  tellOpen(open)
})
watch(() => [props.host, ...props.extras], () => { tellOpen(showCard.value) })
onUnmounted(() => {
  if (timer) clearTimeout(timer)
  tellOpen(false)
})

// Card opens below (or beside, for a vertical dock), flipped when there's
// no room on that side.
const placement = shallowRef('')
function place () {
  const r = rootEl.value?.getBoundingClientRect()
  if (!r) return
  const cls: string[] = []
  if (props.vertical) {
    cls.push(r.left > window.innerWidth * 0.6 ? styles.left : styles.right)
    if (r.top > window.innerHeight * 0.55) cls.push(styles.up)
  } else {
    cls.push(r.top > window.innerHeight * 0.55 ? styles.above : styles.below)
    if (r.left > window.innerWidth * 0.6) cls.push(styles.alignEnd)
  }
  placement.value = cls.join(' ')
}

function click () {
  openCard()
  if (wm.active.value) props.host.onClick()
}

// Renders an item's card slot here; the slot still reads its widget's state.
const SlotOut = defineComponent({
  props: { entry: { type: Object as PropType<DockEntry>, required: true } },
  setup (p) {
    return () => p.entry.slots.card?.() ?? null
  }
})

const styles = useCssModule()
</script>

<style module>
.root { position: relative; display: inline-flex; flex: none; }
.icon {
  position: relative;
  height: 30px;
  min-width: 30px;
  display: inline-flex;
  align-items: center;
  border-radius: 15px;
  color: var(--w-accent);
  background: color-mix(in srgb, var(--w-panel) 55%, transparent);
  border: 1px solid var(--w-line);
  opacity: 0.6;
  transition: opacity 0.15s, background 0.15s;
  cursor: default;
}
.icon:hover, .hot, .peek { opacity: 1; }
.hot { box-shadow: 0 0 0 2px color-mix(in srgb, var(--w-accent) 35%, transparent); }
.peek { background: var(--w-panel); padding-right: 10px; }
.glyph { width: 28px; display: grid; place-items: center; font-size: 13px; }
.art { width: 20px; height: 20px; object-fit: contain; }
.peekText { font-size: 12px; color: var(--w-fg); white-space: nowrap; max-width: 30rem; overflow: hidden; text-overflow: ellipsis; }
.badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font: 600 10px/16px var(--w-num);
  text-align: center;
  white-space: nowrap;
  color: var(--w-accent-fg);
  background: var(--w-accent);
  pointer-events: none;
}
.tone-up { background: var(--w-up); color: #0d1f13; }
.tone-down { background: var(--w-down); color: #fff; }
.tone-warn { background: var(--w-warn); color: #1a1408; }
.led {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--w-panel);
}
.led-on { background: var(--w-up); box-shadow: 0 0 5px var(--w-up); }
.led-warn { background: var(--w-warn); }
.led-error { background: var(--w-down); box-shadow: 0 0 5px var(--w-down); }
.card {
  position: absolute;
  z-index: 10;
  max-height: 70vh;
  overflow: auto;
  background: var(--w-panel);
  border: 1px solid var(--w-line-strong, var(--w-line));
  border-radius: var(--w-radius);
  box-shadow: var(--w-shadow);
  color: var(--w-fg);
  font-size: 12.5px;
}
.below { top: calc(100% + 6px); left: 0; }
.above { bottom: calc(100% + 6px); left: 0; }
.alignEnd { left: auto; right: 0; }
.right { left: calc(100% + 6px); top: 0; }
.left { right: calc(100% + 6px); top: 0; }
.up { top: auto; bottom: 0; }
.cardHead {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px var(--w-pad);
  background: var(--w-header-bg);
  border-bottom: 1px solid var(--w-line);
  font-size: 13px;
}
.extraHead {
  padding: 4px var(--w-pad) 2px;
  border-top: 1px solid var(--w-line);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
.foot { padding: 3px var(--w-pad) 5px; font-size: 10.5px; color: var(--w-faint); border-top: 1px solid var(--w-line); }
@media (prefers-reduced-motion: reduce) { .icon { transition: none; } }
</style>
