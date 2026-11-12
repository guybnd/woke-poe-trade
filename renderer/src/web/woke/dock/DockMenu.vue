<template>
  <div :class="$style.menu" role="menu" data-dock-menu @contextmenu.prevent>
    <button v-for="a in host.props.menu ?? []" :key="a.label" type="button" role="menuitem" :class="$style.item" :disabled="a.disabled" @click="run(a.action)">
      <i :class="[a.icon, $style.ic]" />
      <span class="w-trunc" :class="$style.label">{{ a.label }}</span>
      <i v-if="a.checked" class="fas fa-check w-accent" :class="$style.tick" />
    </button>
    <button type="button" role="menuitem" :class="$style.item" data-menu-pin-card @click="run(pinCard)">
      <i class="fas fa-thumbtack" :class="$style.ic" />
      <span class="w-trunc" :class="$style.label">{{ cardPinned ? 'Unpin card' : 'Pin card on screen' }}</span>
      <i v-if="cardPinned" class="fas fa-check w-accent" :class="$style.tick" />
    </button>
    <button v-if="host.props.wmId != null" type="button" role="menuitem" :class="$style.item" @click="run(openFull)">
      <i class="fas fa-expand-alt" :class="$style.ic" />
      <span class="w-trunc" :class="$style.label">Open {{ name }}</span>
    </button>
    <div :class="$style.sep" />
    <div :class="$style.head">Dismiss this icon</div>
    <div :class="$style.chips">
      <button v-for="c in chips" :key="c.what" type="button" role="menuitem" :class="$style.chip" @click="dismiss(c.what)">{{ c.label }}</button>
    </div>
    <template v-if="canPeek || offModule">
      <div :class="$style.sep" />
      <button v-if="canPeek" type="button" role="menuitem" :class="$style.item" @click="run(togglePeek)">
        <i class="fas fa-bell-slash" :class="$style.ic" />
        <span class="w-trunc" :class="$style.label">No pop-ups from this</span>
        <i v-if="peekOff" class="fas fa-check w-accent" :class="$style.tick" />
      </button>
      <button v-if="offModule" type="button" role="menuitem" :class="[$style.item, $style.danger]" @click="run(turnOff)">
        <i class="fas fa-power-off" :class="$style.ic" />
        <span class="w-trunc" :class="$style.label">Turn off {{ offModule.name }}</span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
// An icon's right-click menu: its own rows, then the ones every icon has.
import { computed } from 'vue'
import { AppConfig, pushHostConfig, saveConfig } from '@/web/Config'
import { useZone } from '../shared/zone'
import { MODULES, ensureWokeConfig, setModuleOn } from '../modules'
import { toast } from '../ui'
import { DOCK_NAMES, DOCK_PEEKS, dismissIcons, dockConfig, dockIcon, dockIconEl, dockPinId, ensureDockConfig, openOverlay, saveDock } from './dock'
import { addPin, isPinned, removePin } from '../pins/pins'
import type { DismissFor, DockEntry } from './dock'
import { hereScope } from './dismiss-rules'

const props = defineProps<{
  host: DockEntry
  extras: DockEntry[]
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const zone = useZone()
const id = computed(() => props.host.props.id)
const name = computed(() => DOCK_NAMES[id.value] ?? props.host.props.title)

// The icon's card as a pin, set beside the icon.
const cardPinned = computed(() => isPinned(dockPinId(id.value)))
function pinCard () {
  const pid = dockPinId(id.value)
  if (cardPinned.value) { removePin(pid); return }
  const r = dockIconEl(id.value)?.getBoundingClientRect()
  const at = r ? { x: r.left / window.innerWidth * 100, y: (r.bottom + 6) / window.innerHeight * 100 } : undefined
  props.host.pinned = null
  addPin({ id: pid, kind: 'dock', title: props.host.props.title, icon: dockIcon(props.host.props), data: { id: id.value }, at })
}

// Toolkit health only speaks up when something is wrong: never for good.
const chips = computed(() => {
  const phrase = hereScope(zone).phrase
  const out: Array<{ what: DismissFor, label: string }> = [
    { what: 'here', label: phrase.charAt(0).toUpperCase() + phrase.slice(1) },
    { what: '30min', label: '30 min' },
    { what: 'today', label: 'Today' }
  ]
  if (id.value !== 'toolkit') out.push({ what: 'always', label: 'Always' })
  return out
})

function run (action: () => void) {
  emit('close')
  action()
}

function openFull () {
  // A click here doesn't open the overlay, and the full window needs it.
  openOverlay()
  props.host.onClick()
}

function dismiss (what: DismissFor) {
  emit('close')
  // The note takes its place from the icon, still on screen until the next tick.
  const el = dockIconEl(id.value)
  const ids = [id.value, ...props.extras.map(e => e.props.id)]
  const title = props.host.props.title
  const done = dismissIcons(ids, what)
  toast(`${title} dismissed ${done.phrase}`, { anchor: el, dock: true, undo: done.restore })
}

const canPeek = computed(() => DOCK_PEEKS.has(id.value) && dockConfig().peeks)
const peekOff = computed(() => dockConfig().noPeek.includes(id.value))
function togglePeek () {
  const d = ensureDockConfig()
  d.noPeek = peekOff.value ? d.noPeek.filter(x => x !== id.value) : [...d.noPeek, id.value]
  saveDock()
}

// The module behind an icon, where it's named differently.
const MODULE_OF: Record<string, string> = { 'trade-live': 'trade-searches' }
const offModule = computed(() => {
  const moduleId = MODULE_OF[id.value] ?? id.value
  return MODULES.find(m => m.id === moduleId && m.group !== 'apt') ?? null
})
function turnOff () {
  const m = offModule.value
  if (!m) return
  const el = dockIconEl(id.value)
  const set = (on: boolean) => {
    setModuleOn(ensureWokeConfig(AppConfig()), m.id, on)
    saveConfig()
    pushHostConfig()
  }
  set(false)
  toast(`${m.name} turned off`, { anchor: el, dock: true, undo: () => { set(true) } })
}
</script>

<style module>
.menu { width: 17rem; padding: var(--w-s1); font-family: var(--w-body); font-size: var(--w-fs-md); color: var(--w-fg); }
.item {
  display: flex; align-items: center; gap: var(--w-s2); width: 100%; height: var(--w-row-h);
  padding: 0 var(--w-s2); border-radius: var(--w-r-sm); text-align: left; color: var(--w-fg);
}
.item:hover:not(:disabled) { background: var(--w-accent-soft); }
.item:disabled { opacity: 0.45; }
.ic { width: var(--w-icon-sm); flex: none; font-size: var(--w-fs-sm); text-align: center; color: var(--w-dim); }
.label { flex: 1; }
.tick { font-size: var(--w-fs-xs); flex: none; }
.danger, .danger .ic { color: var(--w-down); }
.sep { height: 1px; margin: var(--w-s1) 2px; background: var(--w-line); }
.head { padding: 2px var(--w-s2) 4px; font-size: var(--w-fs-sm); color: var(--w-dim); }
.chips { display: flex; gap: 4px; padding: 0 var(--w-s1) var(--w-s1); }
.chip {
  flex: 1 1 0; min-width: 0; height: 25px; padding: 0 2px;
  border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm);
  font-size: var(--w-fs-sm); white-space: nowrap; color: var(--w-fg);
}
.chip:hover { background: var(--w-accent-soft); border-color: var(--w-accent); }
</style>
