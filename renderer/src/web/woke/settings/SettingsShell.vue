<template>
  <div ref="winEl" class="w-corners" :class="$style.window" :style="sizeStyle" data-w-settings @keydown="onKeydown">
    <header :class="$style.bar">
      <span :class="$style.title">Settings</span>
      <label :class="[$style.search, { [$style.searchOn]: query }]">
        <i class="fas fa-search" />
        <input ref="searchEl" v-model="query" placeholder="Find a setting, module or key" spellcheck="false"
          @keydown.enter.prevent="results[0] && go(results[0])" @keydown.esc.stop.prevent="query = ''">
        <w-kbd v-if="!query" keys="Ctrl + F" />
        <button v-else type="button" class="w-icon-btn" title="Clear" @click="query = ''"><i class="fas fa-times" /></button>
      </label>
      <span :class="$style.barEnd">
        <span class="w-dim" :class="$style.small">Changes save as you go</span>
        <w-kbd keys="Esc" />
        <button type="button" class="w-icon-btn" title="Close" @click="close"><i class="fas fa-times" /></button>
      </span>
    </header>

    <div :class="$style.body">
      <nav :class="$style.nav">
        <template v-for="g in nav" :key="g.id">
          <div :class="$style.group">{{ g.label }}</div>
          <template v-for="item in g.items" :key="item.page.id">
            <div v-if="item.sub" :class="$style.sub">{{ item.sub }}</div>
            <div :class="[$style.item, { [$style.active]: item.page.id === pageId, [$style.dim]: item.off }]"
              role="button" tabindex="0" @click="open(item.page.id)" @keydown.enter="open(item.page.id)">
              <span :class="$style.icon"><w-icon :src="item.page.icon.art ?? undefined" :item="item.page.icon.item" :fallback="item.page.icon.fa" size="md" /></span>
              <span :class="$style.name">{{ item.page.name }}</span>
              <span v-if="item.page.id === 'hotkeys' && hotkeyProblems" :class="$style.badge" :title="`${hotkeyProblems} hotkey problem${hotkeyProblems > 1 ? 's' : ''}`">{{ hotkeyProblems }}</span>
              <w-toggle v-if="item.switchIds.length && clone" :model-value="!item.off" :title="item.off ? 'Turn on' : 'Turn off'"
                @click.stop @update:model-value="setPageOn(item.switchIds, $event)" />
            </div>
          </template>
        </template>
        <button type="button" :class="$style.quit" @click="quit">Quit the app</button>
      </nav>

      <main ref="mainEl" :class="$style.main">
        <template v-if="query">
          <div :class="$style.head"><div><div :class="$style.pageTitle">Search</div><div class="w-dim" :class="$style.small">{{ results.length ? `${results.length} match${results.length > 1 ? 'es' : ''}. Enter opens the first.` : 'Nothing matches. Try a shorter word.' }}</div></div></div>
          <div :class="$style.results">
            <button v-for="(r, i) in results" :key="i" type="button" :class="$style.result" @click="go(r)">
              <span :class="$style.icon"><w-icon :src="r.page.icon.art ?? undefined" :item="r.page.icon.item" :fallback="r.page.icon.fa" size="sm" /></span>
              <span :class="$style.rLabel">{{ r.label }}</span>
              <span class="w-dim" :class="$style.small">{{ r.label === r.page.name ? groupLabel(r.page) : r.page.name }}</span>
            </button>
          </div>
        </template>
        <template v-else-if="clone && current">
          <div :class="$style.head">
            <span :class="$style.headIcon"><w-icon :src="current.icon.art ?? undefined" :item="current.icon.item" :fallback="current.icon.fa" size="lg" /></span>
            <div>
              <div :class="$style.pageTitle">{{ current.name }}</div>
              <div class="w-dim" :class="$style.small">{{ current.description }}</div>
            </div>
          </div>
          <module-page :key="current.id" :config="clone" :page="current" :widget-id="currentWidgetId" @open="open" @add="addWidget" />
        </template>
      </main>
    </div>

    <span :class="[$style.grip, $style.gripE]" @pointerdown="startResize($event, 'e')" />
    <span :class="[$style.grip, $style.gripS]" @pointerdown="startResize($event, 's')" />
    <span :class="[$style.grip, $style.gripSE]" @pointerdown="startResize($event, 'se')" />
  </div>
</template>

<script setup lang="ts">
// The settings window (L1): General / Modules / App in a sidebar, search over
// every page, changes applied as you make them with Undo (S1), resizable (W1).
import { computed, inject, nextTick, onMounted, onUnmounted, reactive, shallowRef, watch } from 'vue'
import { AppConfig, updateConfig, saveConfig, saveConfigQuietly, beforeQuitSave, pushHostConfig } from '@/web/Config'
import type { Config } from '@/web/Config'
import type { Widget, WidgetManager } from '@/web/overlay/interfaces'
import { Host } from '@/web/background/IPC'
import { WIcon, WKbd, WToggle, provideHotkeyContext, toast } from '../ui'
import { ensureWokeConfig, isModuleOn, setModuleOn } from '../modules'
import { useHotkeyHealth } from '../switchboard/hotkey-health'
import { allowsCopies } from '../tab-bar/tools'
import { hotkeyFields, hotkeyUses } from './hotkey-fields'
import { PAGES, PAGE_BY_ID, pageByName, pageForWidgetType } from './pages'
import type { SettingsPage } from './pages'
import ModulePage from './ModulePage.vue'

const props = defineProps<{ widget: Widget }>()
const wm = inject<WidgetManager>('wm')!

// ---------- working copy, applied as you go ----------
const clone = shallowRef<Config | null>(null)
let lastApplied = ''
let timer: ReturnType<typeof setTimeout> | null = null
let restoring = false
// Pages fill in missing defaults when they open; that isn't the user's change.
let quietUntil = 0
const winEl = shallowRef<HTMLElement | null>(null)

function snapshot (): string { return JSON.stringify(clone.value) }

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => v != null && typeof v === 'object' && !Array.isArray(v)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const copy = <T>(v: T): T => v === undefined ? v : JSON.parse(JSON.stringify(v))

// Three-way: what this window changed since its last commit wins; everything
// else takes the live value. Widgets keep saving their own state while the
// window is open (runs, sessions, steps, saved searches), and our copy of it
// is stale.
function merge3 (mine: unknown, base: unknown, live: unknown): unknown {
  if (same(mine, base)) return copy(live)
  if (isObj(mine) && isObj(base) && isObj(live)) {
    const out: Obj = {}
    for (const k of new Set([...Object.keys(mine), ...Object.keys(live)])) {
      const v = merge3(mine[k], base[k], live[k])
      if (v !== undefined) out[k] = v
    }
    return out
  }
  return mine
}

function mergeLive (next: Config, since: Config): Config {
  const live = AppConfig()
  const noWidgets = (c: Config): Obj => { const o: Obj = { ...c }; delete o.widgets; return o }
  const merged = merge3(noWidgets(next), noWidgets(since), noWidgets(live)) as Omit<Config, 'widgets'>
  // Live order and membership: a widget removed while the window was open
  // stays removed, one added joins.
  const widgets = live.widgets.map(l => {
    const mine = next.widgets.find(w => w.wmId === l.wmId)
    if (!mine) return copy(l)
    const base = since.widgets.find(w => w.wmId === l.wmId)
    const w = (base ? merge3(mine, base, l) : mine) as Widget
    // Window-manager state lives in the live config, not in our copy.
    w.wmWants = l.wmWants
    w.wmZorder = l.wmZorder
    w.wmFlags = [...l.wmFlags]
    return w
  })
  return { ...merged, widgets } as Config
}

// Widgets created while the window is open (Add buttons) join our copy.
function adoptNewWidgets () {
  if (!clone.value) return
  for (const l of AppConfig().widgets) {
    if (l.wmFlags.includes('uninitialized')) continue
    if (!clone.value.widgets.some(w => w.wmId === l.wmId)) clone.value.widgets.push(JSON.parse(JSON.stringify(l)))
  }
}

function commit (snap: string, since: string) {
  const next = mergeLive(JSON.parse(snap) as Config, JSON.parse(since) as Config)
  updateConfig(next)
  pushHostConfig()
  // On disk now, so "Change saved" is true whatever happens next.
  saveConfigQuietly()
}

function apply (silent = false) {
  if (timer) { clearTimeout(timer); timer = null }
  if (!clone.value) return
  adoptNewWidgets()
  const snap = snapshot()
  if (snap === lastApplied) return
  const prev = lastApplied
  lastApplied = snap
  commit(snap, prev)
  if (!silent && !restoring && Date.now() > quietUntil) toast('Change saved', { undo: () => restore(prev), anchor: winEl.value })
}

function restore (snap: string) {
  restoring = true
  const since = lastApplied
  clone.value = reactive(JSON.parse(snap)) as Config
  lastApplied = snap
  commit(snap, since)
  nextTick(() => { restoring = false })
}

watch(clone, () => {
  if (restoring || !clone.value) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => apply(), 250)
}, { deep: true })

watch(() => props.widget.wmWants, (wants) => {
  if (wants === 'show') {
    clone.value = reactive(JSON.parse(JSON.stringify(AppConfig()))) as Config
    ensureWokeConfig(clone.value)
    lastApplied = snapshot()
    quietUntil = Date.now() + 800
    nextTick(() => searchEl.value?.focus())
  } else if (clone.value) {
    apply(true)
    clone.value = null
    query.value = ''
    nextTick(() => saveConfig())
  }
}, { immediate: true })

function close () { wm.hide(props.widget.wmId) }

// Quitting goes through main's save step; a change still on its timer joins it.
const applyBeforeQuit = () => { apply(true) }
beforeQuitSave.add(applyBeforeQuit)
onUnmounted(() => { beforeQuitSave.delete(applyBeforeQuit) })

function quit () {
  Host.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'quit' } })
}

// ---------- pages and sidebar ----------
const pageId = shallowRef('game')

// APT's stopwatch can be placed many times: one page each. (Stash search
// strings live in the Regex library.)
const dynamicPages = computed<SettingsPage[]>(() => (clone.value?.widgets ?? [])
  .filter(w => w.wmType === 'timer')
  .map(w => ({
    id: `widget:${w.wmId}`,
    name: w.wmTitle || 'Stopwatch',
    description: 'A stopwatch on the overlay.',
    group: 'modules',
    sub: 'Tools',
    icon: { fa: 'fas fa-stopwatch' },
    find: ['Stopwatch']
  })))

const allPages = computed(() => [...PAGES, ...dynamicPages.value])
const current = computed(() => allPages.value.find(p => p.id === pageId.value) ?? PAGES[0])
const currentWidgetId = computed(() => pageId.value.startsWith('widget:') ? Number(pageId.value.slice(7)) : undefined)

const GROUPS = [{ id: 'general', label: 'General' }, { id: 'modules', label: 'Modules' }, { id: 'app', label: 'App' }] as const
const nav = computed(() => GROUPS.map(g => {
  let lastSub: string | undefined
  const items = allPages.value.filter(p => p.group === g.id).map(page => {
    const sub = page.sub !== lastSub ? page.sub : undefined
    lastSub = page.sub
    // Pages of a module get its switch; APT features keep theirs on the page.
    const switchIds = page.group === 'modules' ? (page.modules ?? []).filter(id => !id.startsWith('apt-')) : []
    const off = !!clone.value && switchIds.length > 0 && switchIds.every(id => !isModuleOn(clone.value!, id))
    return { page, sub, switchIds, off }
  })
  return { ...g, items }
}))

function setPageOn (ids: string[], on: boolean) {
  if (!clone.value) return
  const c = ensureWokeConfig(clone.value)
  for (const id of ids) setModuleOn(c, id, on)
}

function open (id: string) {
  query.value = ''
  if (id.startsWith('widget:') || PAGE_BY_ID.has(id)) {
    if (pageId.value !== id) quietUntil = Date.now() + 800
    pageId.value = id
  }
  mainEl.value?.scrollTo({ top: 0 })
}

function groupLabel (p: SettingsPage) { return GROUPS.find(g => g.id === p.group)?.label ?? '' }

// Other windows open a page by flag: a widget's gear, or the hotkey warning.
watch(() => props.widget.wmFlags, (flags) => {
  const pageFlag = flags.find(f => f.startsWith('settings::page='))
  if (pageFlag) {
    const page = pageByName(pageFlag.slice('settings::page='.length))
    if (page) open(page.id)
    wm.setFlag(props.widget.wmId, pageFlag, false)
  }
  const widgetFlag = flags.find(f => f.startsWith('settings::widget='))
  if (widgetFlag) {
    const wmId = Number(widgetFlag.split('=')[1])
    const w = AppConfig().widgets.find(x => x.wmId === wmId)
    if (w) {
      const page = pageForWidgetType(w.wmType) ??
        (w.wmType === 'price-check' ? PAGE_BY_ID.get('price-check') : w.wmType === 'item-check' ? PAGE_BY_ID.get('item-info') : undefined)
      open(page ? page.id : `widget:${wmId}`)
    }
    wm.setFlag(props.widget.wmId, widgetFlag, false)
  }
}, { deep: true, immediate: true })

// ---------- adding a module's widget from its page ----------
function addWidget (wmType: string) {
  if (!clone.value) return
  // A woke window has one copy: one placed meanwhile (the stash reader turned
  // on) joins this window's copy instead of a second one being added.
  if (!allowsCopies(wmType) && AppConfig().widgets.some(w => w.wmType === wmType)) {
    adoptNewWidgets()
    return
  }
  const page = pageForWidgetType(wmType)
  for (const id of page?.modules ?? []) setModuleOn(ensureWokeConfig(clone.value), id, true)
  apply(true)
  wm.create(wmType)
  // The new widget fills in its defaults when it mounts; take it then.
  let tries = 0
  const poll = setInterval(() => {
    tries++
    const before = clone.value?.widgets.length ?? 0
    adoptNewWidgets()
    if ((clone.value?.widgets.length ?? 0) > before || tries > 40) {
      clearInterval(poll)
      lastApplied = snapshot()
    }
  }, 50)
}

// ---------- hotkeys: clashes for every key cell on every page ----------
const health = useHotkeyHealth()
const uses = computed(() => clone.value ? hotkeyUses(hotkeyFields(clone.value)) : new Map<string, string[]>())
provideHotkeyContext({ uses, failed: health.failedNorm, poeBinds: health.poeBinds })
const hotkeyProblems = computed(() => {
  let n = 0
  for (const [norm, labels] of uses.value) if (labels.length > 1 || health.failedNorm.value.has(norm)) n++
  return n
})

// ---------- search ----------
const query = shallowRef('')
const searchEl = shallowRef<HTMLInputElement | null>(null)
const mainEl = shallowRef<HTMLElement | null>(null)

interface Result { page: SettingsPage, label: string, highlight: string | null }
const results = computed<Result[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const out: Result[] = []
  for (const page of allPages.value) {
    if (page.name.toLowerCase().includes(q) || page.description.toLowerCase().includes(q)) out.push({ page, label: page.name, highlight: null })
    for (const label of page.find) if (label.toLowerCase().includes(q)) out.push({ page, label, highlight: label })
  }
  const hk = PAGE_BY_ID.get('hotkeys')!
  if (clone.value) {
    for (const f of hotkeyFields(clone.value)) {
      const key = f.get() ?? ''
      if (f.label.toLowerCase().includes(q) || key.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))) {
        out.push({ page: hk, label: key ? `${f.label} (${key})` : f.label, highlight: f.label })
      }
    }
  }
  return out.slice(0, 40)
})

function go (r: Result) {
  open(r.page.id)
  if (!r.highlight) return
  const needle = r.highlight.toLowerCase()
  // Pages render on the next tick; find the row by its label and flash it.
  setTimeout(() => {
    const root = mainEl.value
    if (!root) return
    let el: Element | null = [...root.querySelectorAll('[data-setting]')]
      .find(e => (e.getAttribute('data-setting') ?? '').toLowerCase().includes(needle)) ?? null
    if (!el) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let n: Node | null
      while ((n = walker.nextNode())) {
        if ((n.textContent ?? '').toLowerCase().includes(needle)) { el = n.parentElement; break }
      }
    }
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    el.classList.remove('w-flash')
    el.getBoundingClientRect()
    el.classList.add('w-flash')
  }, 60)
}

function onKeydown (e: KeyboardEvent) {
  if (e.defaultPrevented) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    searchEl.value?.focus()
    searchEl.value?.select()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

// Esc also works when nothing inside the window has focus.
function onWindowKey (e: KeyboardEvent) {
  if (props.widget.wmWants !== 'show' || e.defaultPrevented) return
  if (winEl.value?.contains(document.activeElement)) return
  onKeydown(e)
}
onMounted(() => window.addEventListener('keydown', onWindowKey))
onUnmounted(() => window.removeEventListener('keydown', onWindowKey))

// ---------- size (W1): drag the right or bottom edge; remembered ----------
const SIZE_KEY = 'woke.settings.size'
const size = shallowRef<{ w: number, h: number }>({ w: 60, h: 42 })
try {
  const saved = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null')
  if (saved && typeof saved.w === 'number' && typeof saved.h === 'number') size.value = saved
} catch {}
const sizeStyle = computed(() => ({
  width: `min(${size.value.w}rem, calc(100vw - 2rem))`,
  height: `min(${size.value.h}rem, calc(100vh - 2rem))`
}))

function startResize (e: PointerEvent, edge: 'e' | 's' | 'se') {
  e.preventDefault()
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const start = { x: e.clientX, y: e.clientY, w: size.value.w, h: size.value.h }
  const move = (ev: PointerEvent) => {
    // The window is centred, so an edge moves half as far as the size grows.
    const w = edge !== 's' ? start.w + (2 * (ev.clientX - start.x)) / rem : start.w
    const h = edge !== 'e' ? start.h + (2 * (ev.clientY - start.y)) / rem : start.h
    size.value = { w: Math.max(40, Math.min(w, window.innerWidth / rem)), h: Math.max(28, Math.min(h, window.innerHeight / rem)) }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    try { localStorage.setItem(SIZE_KEY, JSON.stringify(size.value)) } catch {}
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
</script>

<style module>
.window {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--w-panel-solid); color: var(--w-fg);
  border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md); box-shadow: var(--w-shadow);
  font-family: var(--w-body); font-size: var(--w-fs-md);
  animation: woke-settings-in var(--w-dur-in) var(--w-ease);
}
@keyframes woke-settings-in { from { opacity: 0; margin-top: var(--w-rise); } }
.bar {
  display: flex; align-items: center; gap: var(--w-s3); flex: none;
  padding: var(--w-s2) var(--w-s3); border-bottom: 1px solid var(--w-line); background: var(--w-header-bg);
}
.title { font-family: var(--w-head); font-size: var(--w-fs-lg); color: var(--w-accent); letter-spacing: var(--w-head-track); }
.search {
  flex: 1; max-width: 26rem; display: flex; align-items: center; gap: var(--w-s2); height: 28px; padding: 0 var(--w-s2);
  background: var(--w-panel-2); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); color: var(--w-dim);
}
.search:focus-within, .searchOn { border-color: var(--w-accent); }
.search input { flex: 1; min-width: 0; background: transparent; color: var(--w-fg); font-size: var(--w-fs-md); outline: none; }
.search input::placeholder { color: var(--w-faint); }
.barEnd { margin-left: auto; display: flex; align-items: center; gap: var(--w-s2); }
.small { font-size: var(--w-fs-sm); }
.body { flex: 1; min-height: 0; display: flex; }
.nav {
  width: 15rem; flex: none; overflow-y: auto; padding: var(--w-s1) var(--w-s2) var(--w-s3);
  border-right: 1px solid var(--w-line); background: var(--w-panel-2); display: flex; flex-direction: column; gap: 1px;
}
.group { font-size: var(--w-fs-caps); font-weight: 600; letter-spacing: 0.08em; text-transform: var(--w-caps-case); color: var(--w-faint); padding: var(--w-s3) var(--w-s2) var(--w-s1); font-family: var(--w-caps-face); }
.sub { font-size: var(--w-fs-xs); color: var(--w-faint); padding: var(--w-s2) var(--w-s2) 2px var(--w-s3); }
.item {
  display: flex; align-items: center; gap: var(--w-s2); min-height: var(--w-row-h); padding: 0 var(--w-s2);
  border-radius: var(--w-r-sm); color: var(--w-dim); cursor: pointer;
}
.item:hover { color: var(--w-fg); background: var(--w-panel-3); }
.item:focus-visible { outline: 1px solid var(--w-accent); }
.active { color: var(--w-fg); background: var(--w-panel-3); box-shadow: inset 2px 0 0 var(--w-accent); }
.dim .name { color: var(--w-faint); }
.icon { width: var(--w-icon-md); height: var(--w-icon-md); flex: none; display: grid; place-items: center; }
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { font-size: var(--w-fs-xs); font-weight: 600; color: #fff; background: var(--w-down); border-radius: var(--w-r-pill); padding: 0 6px; line-height: calc(16px * var(--w-text-scale, 1)); }
/* The game look (P5): bronze frame, dark header with a gold fade line, small caps
   group labels, the open page pressed in. */
:global([data-woke-look="game"]) .window { border-color: var(--w-frame); box-shadow: var(--w-frame-shadow); }
:global([data-woke-look="game"]) .bar { position: relative; background: var(--w-head-ground); border-bottom-color: transparent; }
:global([data-woke-look="game"]) .bar::after {
  content: ""; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 1px; pointer-events: none; background: var(--w-gold-fade);
}
:global([data-woke-look="game"]) .title { font-family: var(--w-label); color: var(--w-gold-hi); letter-spacing: 0.04em; }
:global([data-woke-look="game"]) .search { background: var(--w-well); border-color: var(--w-well-line); box-shadow: var(--w-well-shadow); }
:global([data-woke-look="game"]) .search:focus-within, :global([data-woke-look="game"]) .searchOn { border-color: var(--w-frame-hi); }
:global([data-woke-look="game"]) .search input { font-family: var(--w-num); }
:global([data-woke-look="game"]) .group {
  font-family: var(--w-label); font-size: var(--w-fs-md); font-weight: 400; text-transform: none; letter-spacing: 0.04em; color: var(--w-gold);
}
:global([data-woke-look="game"]) .nav { border-right-color: var(--w-well-line); }
:global([data-woke-look="game"]) .active { color: var(--w-gold-hi); background: var(--w-pressed); box-shadow: inset 0 1px 3px #000, inset 2px 0 0 var(--w-frame-lit); }
:global([data-woke-look="game"]) .pageTitle { font-family: var(--w-label); color: var(--w-gold-hi); }
.quit {
  margin-top: var(--w-s4); padding: var(--w-s1) var(--w-s2); text-align: left; color: var(--w-faint); font-size: var(--w-fs-sm);
  border-radius: var(--w-r-sm);
}
.quit:hover { color: var(--w-down); }
.main { flex: 1; min-width: 0; overflow-y: auto; padding: var(--w-s4) var(--w-s5) var(--w-s6); display: flex; flex-direction: column; gap: var(--w-s4); }
.head { display: flex; align-items: center; gap: var(--w-s3); }
.headIcon { width: var(--w-icon-lg); height: var(--w-icon-lg); display: grid; place-items: center; flex: none; }
.pageTitle { font-family: var(--w-head); font-size: var(--w-fs-xl); color: var(--w-fg); line-height: 1.2; }
.results { display: flex; flex-direction: column; gap: 1px; }
.result {
  display: flex; align-items: center; gap: var(--w-s2); min-height: var(--w-row-h); padding: 0 var(--w-s2);
  text-align: left; border-radius: var(--w-r-sm); color: var(--w-fg);
}
.result:hover, .result:focus-visible { background: var(--w-panel-3); outline: none; }
.rLabel { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.grip { position: absolute; z-index: 2; }
.gripE { top: 0; right: 0; bottom: 0; width: 6px; cursor: ew-resize; }
.gripS { left: 0; right: 0; bottom: 0; height: 6px; cursor: ns-resize; }
.gripSE { right: 0; bottom: 0; width: 14px; height: 14px; cursor: nwse-resize; }
</style>
