<template>
  <span ref="rootEl" :class="$style.root" :data-dock="host.props.id">
    <span ref="iconEl" :class="[$style.icon, { [$style.peek]: peekText, [$style.hot]: cardOpen, [$style.withRead]: readouts.length, [$style.glow]: host.props.glow }]"
      :title="wm.active.value ? `${host.props.title}${host.props.wmId != null ? ' · click to open' : ''}` : undefined"
      @click="click" @contextmenu.prevent="openIconMenu">
      <svg v-if="host.props.progress != null" :class="$style.ring" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r="16" :class="$style.ringTrack" />
        <circle cx="18" cy="18" r="16" :class="$style.ringFill" pathLength="100" :stroke-dasharray="`${Math.min(1, Math.max(0, host.props.progress)) * 100} 100`" transform="rotate(-90 18 18)" />
      </svg>
      <span :class="$style.glyph">
        <img v-if="dockArt(host.props) && !artFailed" :src="dockArt(host.props)!" alt="" draggable="false" :class="$style.art" @error="artFailed = true">
        <i v-else :class="dockIcon(host.props)" />
      </span>
      <span v-if="peekText" :class="$style.peekText">{{ peekText }}</span>
      <template v-else>
        <span v-for="r in readouts" :key="r.id" class="w-num" :class="[$style.read, r.tone && $style['read-' + r.tone]]">{{ r.text }}</span>
      </template>
      <span v-if="badge != null && badge !== ''" :class="[$style.badge, $style['tone-' + (host.props.tone ?? 'accent')]]">{{ badge }}</span>
      <span v-if="host.props.led" :class="[$style.led, $style['led-' + host.props.led]]" />
    </span>
    <div v-if="menuOpen" ref="menuEl" :class="[$style.card, placement]">
      <DockMenu :host="host" :extras="extras" @close="menuOpen = false" />
    </div>
    <div v-if="cardOpen" ref="cardEl" :class="[$style.card, placement]"
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
      <button v-if="host.props.wmId != null" type="button" :class="$style.open" data-dock-open @click="openFull">
        Open {{ DOCK_NAMES[host.props.id] ?? host.props.title }} <i class="fas fa-external-link-alt" />
      </button>
    </div>
  </span>
</template>

<script setup lang="ts">
import { computed, defineComponent, inject, onMounted, onUnmounted, shallowRef, useCssModule, watch } from 'vue'
import type { PropType } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { Host } from '@/web/background/IPC'
import { useHoverZone } from '../shared/hover'
import type { DockEntry } from './dock'
import { DOCK_NAMES, dockArt, dockCardOwner, dockConfig, dockIcon, openOverlay } from './dock'
import { clickWhilePlaying } from './click'
import DockMenu from './DockMenu.vue'

const props = defineProps<{
  host: DockEntry
  extras: DockEntry[]
  vertical: boolean
}>()

const wm = inject<WidgetManager>('wm')!

const rootEl = shallowRef<HTMLElement | null>(null)
const iconEl = shallowRef<HTMLElement | null>(null)
const cardEl = shallowRef<HTMLElement | null>(null)
const menuEl = shallowRef<HTMLElement | null>(null)

const badge = computed(() => props.host.props.badge)
const readouts = computed(() => props.host.props.readouts ?? [])

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
// The right-click menu takes the card's place while it's open.
const menuOpen = shallowRef(false)
// Open from hovering, or held open by a pin.
const cardOpen = computed(() => !menuOpen.value && (showCard.value || props.host.pinned != null))

// Hover works while the game has focus (main process watches the mouse).
// Both take the mouse while it's over them, so a click lands here instead of
// walking the character there.
const overIcon = useHoverZone(iconEl, { enabled: () => true, activate: () => true, onClick: pressedInGame, onRightClick: openIconMenu })
const overCard = useHoverZone(cardEl, { enabled: () => cardOpen.value, activate: () => true })
const overMenu = useHoverZone(menuEl, { enabled: () => menuOpen.value, activate: () => true })
const hovering = computed(() => overIcon.value || overCard.value || overMenu.value)

// Opens once the mouse rests on the icon, so sweeping past it doesn't pop the
// card; closes a moment after leaving so moving onto the card doesn't flicker.
const OPEN_AFTER_MS = 120
const CLOSE_AFTER_MS = 250
let timer: ReturnType<typeof setTimeout> | null = null
watch(hovering, (on) => {
  if (timer) { clearTimeout(timer); timer = null }
  if (menuOpen.value) return
  if (on === showCard.value) return
  if (on && dockConfig().hoverOpens === false) return
  timer = setTimeout(() => { showCard.value = on }, on ? OPEN_AFTER_MS : CLOSE_AFTER_MS)
})
function openCard () {
  if (timer) { clearTimeout(timer); timer = null }
  menuOpen.value = false
  showCard.value = true
}

// One at a time: a new card or menu closes the one before.
watch([showCard, menuOpen], ([card, menu]) => {
  if (card || menu) dockCardOwner.value = props.host.key
})
watch(dockCardOwner, (key) => {
  if (key === props.host.key) return
  if (timer) { clearTimeout(timer); timer = null }
  showCard.value = false
  menuOpen.value = false
})

// Goes when the mouse leaves it, like the card: nothing stays on screen.
let menuTimer: ReturnType<typeof setTimeout> | null = null
watch(hovering, (on) => {
  if (menuTimer) { clearTimeout(menuTimer); menuTimer = null }
  if (!on && menuOpen.value) menuTimer = setTimeout(() => { menuOpen.value = false }, CLOSE_AFTER_MS)
})
function openIconMenu () {
  if (timer) { clearTimeout(timer); timer = null }
  if (menuTimer) { clearTimeout(menuTimer); menuTimer = null }
  showCard.value = false
  place()
  menuOpen.value = true
}
// Entries told the card is open; extras can join or leave while it is.
const told = new Set<DockEntry>()
function tellOpen (open: boolean) {
  const now = open ? [props.host, ...props.extras] : []
  for (const e of told) if (!now.includes(e)) { e.onOpen(false); told.delete(e) }
  for (const e of now) if (!told.has(e)) { e.onOpen(true); told.add(e) }
}
watch(cardOpen, (open) => {
  if (open) place()
  tellOpen(open)
})
// Back after being unmounted (settings open) with a pinned card: nothing changed to trigger the watch.
onMounted(() => {
  if (!cardOpen.value) return
  place()
  tellOpen(true)
})
watch(() => [props.host, ...props.extras], () => { tellOpen(cardOpen.value) })
onUnmounted(() => {
  if (timer) clearTimeout(timer)
  if (menuTimer) clearTimeout(menuTimer)
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

// The card makes way for the window it opened.
function closeCard () {
  if (timer) { clearTimeout(timer); timer = null }
  showCard.value = false
  menuOpen.value = false
}
const windowUp = computed(() => wm.active.value &&
  wm.widgets.value.some(w => w.wmId === props.host.props.wmId && w.wmWants === 'show'))
watch(windowUp, (up) => { if (up) closeCard() })

// Clicked on purpose, so the overlay opens with it.
function openFull () {
  closeCard()
  props.host.pinned = null
  if (!wm.active.value) openOverlay()
  props.host.onClick()
}

// While playing, a click on the icon opens its full window, runs its gameClick if
// it has one, or else opens its card or closes it again. One click arrives twice:
// from main's mouse hook as the button goes down, and as a page click as it comes
// up (only if the mouse was taken, so not always). Only the hook counts, in the
// app; the browser demo has only the page click.
let hookOpened = false
function pressedInGame (taken: boolean) {
  hookOpened = false
  if (wm.active.value) { openCard(); return }
  const does = clickWhilePlaying(props.host.props, dockConfig().hoverOpens)
  if (does === 'card') {
    toggleCard()
    return
  }
  // Not taken: the game got this click too. It may be walking away from what
  // gameClick would act on, or a skill on its way past the window's icon, or not
  // even in focus.
  if (!taken) return
  if (does === 'window') {
    hookOpened = true
    openFull()
  } else {
    props.host.props.gameClick?.()
  }
}
function toggleCard () {
  if (!cardOpen.value) {
    openCard()
    return
  }
  if (timer) { clearTimeout(timer); timer = null }
  showCard.value = false
  props.host.pinned = null
}

function click () {
  // The other half of the click that just opened the overlay.
  if (hookOpened) { hookOpened = false; return }
  if (!wm.active.value) {
    if (!Host.isElectron) toggleCard()
    return
  }
  openCard()
  if (props.host.props.pinnable) props.host.pinned = props.host.pinned ? null : 'click'
  props.host.onClick()
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
/* A steady glow while something is running (P15: nothing pulses for attention). */
.glow { opacity: 1; box-shadow: 0 0 6px 1px color-mix(in srgb, var(--w-accent) 45%, transparent); }
.ring { position: absolute; left: -4px; top: -4px; pointer-events: none; }
.ringTrack { fill: none; stroke: var(--w-line); stroke-width: 2.5; }
.ringFill { fill: none; stroke: var(--w-accent); stroke-width: 2.5; }
.glyph { width: 28px; display: grid; place-items: center; font-size: calc(13px * var(--w-text-scale, 1)); }
.art { width: 20px; height: 20px; object-fit: contain; }
.icon.withRead { opacity: 0.85; }
.icon.withRead:hover, .icon.withRead.hot, .icon.withRead.peek { opacity: 1; }
.withRead { gap: 8px; padding-right: 12px; background: var(--w-panel); }
.read { font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-fg); white-space: nowrap; max-width: 18rem; overflow: hidden; text-overflow: ellipsis; }
.read-up { color: var(--w-up); }
.read-down { color: var(--w-down); }
.read-dim { color: var(--w-dim); }
.peekText { font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-fg); white-space: nowrap; max-width: 30rem; overflow: hidden; text-overflow: ellipsis; }
.badge {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font: 600 calc(10px * var(--w-text-scale, 1))/calc(16px * var(--w-text-scale, 1)) var(--w-num);
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
  font-size: var(--w-fs-md);
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
  font-size: var(--w-fs-md);
}
/* The game look (P5): bronze frame, centred small caps title over a gold fade line. */
/* Corner marks as background layers: a card scrolls, and an ::after overlay would scroll away with it. */
:global([data-woke-look="game"]) .card {
  font-family: var(--w-body); border-color: var(--w-frame); box-shadow: var(--w-frame-shadow);
  --c: linear-gradient(var(--w-frame-hi), var(--w-frame-hi));
  background-image: var(--c), var(--c), var(--c), var(--c), var(--c), var(--c), var(--c), var(--c);
  background-repeat: no-repeat;
  background-size: 10px 2px, 2px 10px, 10px 2px, 2px 10px, 10px 2px, 2px 10px, 10px 2px, 2px 10px;
  background-position: 0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%;
}
:global([data-woke-look="game"]) .cardHead :global(:is(.w-accent, .w-head-font):not(i)) { font-family: var(--w-label); letter-spacing: 0.04em; }
:global([data-woke-look="game"]) .cardHead :global(:is(.w-accent, .w-head-font)) { color: var(--w-gold); }
:global([data-woke-look="game"]) .cardHead {
  position: relative; justify-content: center; border-bottom-color: transparent;
  /* The top corner marks, since the header covers the card's own. */
  --c: linear-gradient(var(--w-frame-hi), var(--w-frame-hi));
  background: var(--c) 0 0 / 10px 2px no-repeat, var(--c) 0 0 / 2px 10px no-repeat,
    var(--c) 100% 0 / 10px 2px no-repeat, var(--c) 100% 0 / 2px 10px no-repeat, var(--w-head-ground);
  font-family: var(--w-label); font-size: var(--w-fs-lg); letter-spacing: 0.04em; color: var(--w-gold);
}
:global([data-woke-look="game"]) .cardHead::after {
  content: ""; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 1px; pointer-events: none; background: var(--w-gold-fade);
}
.extraHead {
  padding: 4px var(--w-pad) 2px;
  border-top: 1px solid var(--w-line);
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  font-family: var(--w-caps-face);
}
.open { display: block; width: 100%; padding: 4px var(--w-pad); text-align: left; font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-accent); border-top: 1px solid var(--w-line); }
.open i { font-size: 0.8em; margin-left: 2px; }
.open:hover { background: var(--w-accent-soft); }
.open:focus-visible { outline: 2px solid var(--w-accent); outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .icon { transition: none; } }
</style>
