<template>
  <div v-if="menu" :class="$style.backdrop" @mousedown="closeMenu" @contextmenu.prevent="closeMenu" />
  <div v-if="menu" ref="menuEl" :class="[$style.menu, 'w-enter', { [$style.withItem]: menu.item }]" :style="menuPos" role="menu" tabindex="-1"
    @keydown="onMenuKey" @contextmenu.prevent>
    <template v-if="menu.item">
      <div :class="$style.head">
        <img v-if="menu.item.art" :src="menu.item.art" class="w-game-icon" :class="$style.art" alt="">
        <span class="w-trunc" :class="[$style.name, menu.item.nameClass]">{{ menu.item.name }}</span>
        <span v-if="menu.item.price" class="w-num" :class="$style.price">{{ menu.item.price }}</span>
      </div>
      <div :class="$style.strip" data-strip role="group" :aria-label="menu.item.name">
        <button v-for="(a, i) in menu.item.actions" :key="i" type="button" role="menuitem" :class="$style.act"
          :disabled="a.disabled" :title="a.title" :aria-label="a.title ?? a.label" @click="pickAction(a)">
          <i :class="a.icon" />
          <span>{{ a.label }}</span>
        </button>
      </div>
      <div v-if="menu.items.length" :class="$style.sep" role="separator" />
    </template>
    <template v-for="(item, i) in menu.items" :key="i">
      <div v-if="'separator' in item" :class="$style.sep" role="separator" />
      <button v-else type="button" role="menuitem" :disabled="item.disabled"
        :class="[$style.item, { [$style.danger]: item.danger, [$style.hl]: i === hl }]"
        @mouseenter="hl = i" @click="pick(item)">
        <img v-if="item.gameIcon" :src="item.gameIcon" class="w-game-icon" :class="$style.ic" alt="">
        <i v-else :class="[item.icon, $style.ic]" />
        <span class="w-trunc" :class="$style.label"><span :class="{ [$style.drawn]: item.labelStyle }" :style="item.labelStyle">{{ item.label }}</span></span>
        <WKbd v-if="item.keys" :keys="item.keys" :class="$style.keys" />
      </button>
    </template>
  </div>

  <div v-for="(g, i) in guides" :key="`g${i}`" :class="[$style.guide, g.axis === 'x' ? $style.gx : $style.gy]"
    :style="g.axis === 'x' ? { left: `${g.at}px` } : { top: `${g.at}px` }" />

  <ToastRow v-for="t in list" :key="t.id" :toast="t" />
</template>

<script setup lang="ts">
// Mounted once in the overlay. Renders the shared menu and done/undo notes.
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import WKbd from './WKbd.vue'
import ToastRow from './ToastRow.vue'
import { closeMenu, menuState, toasts, undoToast, type MenuEntry, type MenuItemAction } from './layer'
import { snapGuides } from './snap'

const menu = menuState
const list = toasts
const guides = snapGuides
const menuEl = ref<HTMLElement | null>(null)
const hl = ref(-1)
const size = ref({ w: 0, h: 0 })
// Menus and notes follow the panel size setting like panels do. With CSS zoom,
// left/top are in zoomed units, so screen coordinates are divided by it.
const scale = ref(1)
function readScale () {
  scale.value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')) || 1
}

watch(toasts, readScale)
watch(menu, async (m) => {
  hl.value = -1
  if (!m) return
  readScale()
  await nextTick()
  const el = menuEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  size.value = { w: r.width, h: r.height }
  el.focus({ preventScroll: true })
})

// Keep the menu inside the window.
const menuPos = computed(() => {
  const m = menu.value
  if (!m) return {}
  const x = Math.max(8, Math.min(m.x, window.innerWidth - size.value.w - 8))
  const y = m.y + size.value.h > window.innerHeight - 8 ? Math.max(8, m.y - size.value.h) : m.y
  return { left: `${x / scale.value}px`, top: `${y / scale.value}px` }
})

function pick (item: MenuEntry) {
  if ('separator' in item || item.disabled) return
  closeMenu()
  item.action()
}

function pickAction (a: MenuItemAction) {
  if (a.disabled) return
  closeMenu()
  a.action()
}

function move (dir: 1 | -1) {
  const items = menu.value?.items ?? []
  // Nothing highlighted yet: Down starts at the top, Up at the bottom (it
  // used to skip the last item).
  const start = hl.value < 0 ? (dir === 1 ? -1 : items.length) : hl.value
  for (let n = 0, i = start; n < items.length; n++) {
    i = (i + dir + items.length) % items.length
    const it = items[i]
    if (!('separator' in it) && !it.disabled) { hl.value = i; return }
  }
}

// Left and Right walk the item strip; with no list under it, Up and Down too.
function stripKey (e: KeyboardEvent): boolean {
  if (!menu.value?.item) return false
  const listEmpty = !menu.value.items.some(it => !('separator' in it) && !it.disabled)
  const dir = e.key === 'ArrowRight' || (listEmpty && e.key === 'ArrowDown') ? 1 : e.key === 'ArrowLeft' || (listEmpty && e.key === 'ArrowUp') ? -1 : 0
  if (!dir) return false
  const buttons = [...(menuEl.value?.querySelectorAll<HTMLButtonElement>('[data-strip] button:not(:disabled)') ?? [])]
  if (!buttons.length) return false
  e.preventDefault()
  const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = at < 0 ? (dir === 1 ? 0 : buttons.length - 1) : (at + dir + buttons.length) % buttons.length
  hl.value = -1
  buttons[next].focus()
  return true
}

function onMenuKey (e: KeyboardEvent) {
  if (stripKey(e)) return
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) } else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) } else if (e.key === 'Escape') { e.preventDefault(); closeMenu() } else if (e.key === 'Enter' && hl.value >= 0) {
    e.preventDefault()
    pick(menu.value!.items[hl.value])
  }
}

function onKey (e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && undoToast()) e.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style module>
.drawn {
  padding: 0 6px;
  font-family: FontinSmallCaps, FrizQuadrataC, Georgia, serif;
}
.backdrop { position: fixed; inset: 0; z-index: 1000; }
.menu {
  position: fixed; z-index: 1001; min-width: 200px; max-width: 320px; padding: var(--w-s1);
  background: var(--w-panel); backdrop-filter: var(--w-blur);
  border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md); box-shadow: var(--w-shadow);
  font-family: var(--w-body); font-size: var(--w-fs-md); color: var(--w-fg);
  outline: none;
  zoom: var(--w-ui-scale, 1);
}
.item {
  display: flex; align-items: center; gap: var(--w-s2); width: 100%; height: var(--w-row-h);
  padding: 0 var(--w-s2); border-radius: var(--w-r-sm); text-align: left; color: var(--w-fg);
}
.item:disabled { opacity: 0.45; }
.hl { background: var(--w-accent-soft); }
.ic { width: var(--w-icon-sm); height: var(--w-icon-sm); flex: none; display: inline-grid; place-items: center; font-size: calc(12px * var(--w-text-scale, 1)); color: var(--w-dim); }
.label { flex: 1; }
.keys { margin-left: var(--w-s3); }
.danger, .danger .ic { color: var(--w-down); }
.withItem { min-width: 320px; max-width: 420px; }
.head { display: flex; align-items: center; gap: var(--w-s2); padding: var(--w-s1) var(--w-s2) var(--w-s2); }
.art { width: 22px; height: 22px; flex: none; object-fit: contain; }
.name { flex: 1; font-family: FontinSmallCaps, FrizQuadrataC, Georgia, serif; font-size: var(--w-fs-lg); }
.price { color: var(--w-dim); flex: none; }
.strip { display: flex; gap: 2px; }
.act {
  flex: 1 1 0; min-width: 44px; display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: var(--w-s2) 2px; border-radius: var(--w-r-sm); color: var(--w-fg); font-size: var(--w-fs-md);
}
.act i { font-size: calc(16px * var(--w-text-scale, 1)); color: var(--w-accent); }
.act:hover:not(:disabled), .act:focus-visible { background: var(--w-accent-soft); outline: none; }
.act:disabled { opacity: 0.4; }
.sep { height: 1px; margin: var(--w-s1) 2px; background: var(--w-line); }
.guide { position: fixed; z-index: 999; pointer-events: none; }
.gx { top: 0; bottom: 0; width: 0; border-left: 1px dashed var(--w-info); }
.gy { left: 0; right: 0; height: 0; border-top: 1px dashed var(--w-info); }
</style>
