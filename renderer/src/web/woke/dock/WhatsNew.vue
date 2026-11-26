<template>
  <DockItem id="whats-new" icon="fas fa-gift" :art="gameIcon(DOCK_ART_ITEMS.whatsNew)" title="What's new" :show="count > 0"
    :badge="count" :wake="count" card-width="24rem" pinnable :menu="dockMenu">
    <template #card>
      <div :class="$style.body">
        <!-- A tool with one line shows it as before; more fold under a heading
          with a count and a × for the lot. One open at a time, the newest first. -->
        <div v-for="g in groups" :key="g.key" :class="$style.group" data-whats-new-group :data-open="g.lines.length > 1 && isOpen(g) ? '' : undefined">
          <div v-if="g.lines.length > 1" :class="$style.head">
            <button type="button" :class="$style.fold" :aria-expanded="isOpen(g)" :aria-controls="`whats-new-${g.key}`" data-whats-new-group-head @click="toggle(g)">
              <i :class="['fas fa-chevron-right', $style.chev, isOpen(g) && $style.chevOpen]" aria-hidden="true" />
              <span :class="$style.name" data-no-item-tip="A tool's name, not an item"><ToolIcon :art="artFor(g.wmType)" :icon="iconFor(g.wmType)" :class="$style.toolIcon" />{{ g.name }}<span v-if="g.topic" :class="$style.topic">· {{ g.topic }}</span></span>
              <span :class="$style.count">{{ g.lines.length }}</span>
              <!-- Folded: its newest line, to tell what's in it. -->
              <span v-if="!isOpen(g)" :class="$style.preview" data-whats-new-preview>{{ sentence(g.lines[0].note) }}</span>
            </button>
            <w-button size="sm" variant="ghost" icon="fas fa-times" :title="`Dismiss these ${g.lines.length}`" data-whats-new-dismiss-group @click="markSeen(g.lines)" />
          </div>
          <div :id="`whats-new-${g.key}`" v-show="g.lines.length === 1 || isOpen(g)" :class="$style.lines">
            <div v-for="n in g.lines" :key="n.id" :class="$style.line" data-whats-new-line>
              <div :class="$style.text">
                <span v-if="g.lines.length === 1" :class="$style.name" data-no-item-tip="A tool's name, not an item"><ToolIcon :art="artFor(n.wmType)" :icon="iconFor(n.wmType)" :class="$style.toolIcon" />{{ n.name }}</span>
                <span>{{ sentence(n.note) }}</span>
              </div>
              <w-button v-if="hasShowMe(n, byName, personalOn)" size="sm" variant="ghost" data-whats-new-show @click="show(n, $event)">Show me</w-button>
              <w-button size="sm" variant="ghost" icon="fas fa-times" title="Dismiss" data-whats-new-dismiss @click="markSeen([n])" />
            </div>
          </div>
        </div>
        <!-- Worth knowing (tab-bar/worth-knowing.ts): on its own, after the update's lines. -->
        <div v-if="worth" :class="$style.group" data-whats-new-group>
          <div :class="$style.lines">
            <div :class="$style.line" data-whats-new-line data-worth-knowing>
              <div :class="$style.text">
                <span :class="$style.name" data-no-item-tip="A tool's name, not an item"><ToolIcon :art="artFor(worth.wmType)" :icon="iconFor(worth.wmType)" :class="$style.toolIcon" />{{ worth.name }}<span :class="$style.topic">· Worth knowing</span></span>
                <span data-worth-note><template v-for="(b, i) in worthBits" :key="i"><template v-if="typeof b === 'string'">{{ b }}</template><span v-else :class="$style.keyBit"><i v-if="b.search" class="fas fa-search" :class="$style.searchIcon" aria-label="Search" /><WKbd :keys="b.kbd" /></span></template></span>
              </div>
              <w-button size="sm" variant="ghost" data-whats-new-show @click="show(worth, $event)">Show me</w-button>
              <w-button size="sm" variant="ghost" icon="fas fa-times" title="Dismiss" data-whats-new-dismiss @click="markSeen([worth])" />
            </div>
          </div>
        </div>
        <div :class="$style.foot">
          <span class="w-faint text-xs">With the overlay open, click the icon to keep this card up. Right-click it to turn What's new off.</span>
          <w-button size="sm" variant="ghost" data-whats-new-dismiss-all @click="markSeen(all)">Dismiss all</w-button>
        </div>
      </div>
    </template>
  </DockItem>
</template>

<script setup lang="ts">
// After an update, the dock lists what's new until each line is dismissed or
// shown (tab-bar/news.ts). A fresh install has seen it all, so it never shows there.
import { computed, inject, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { registry } from '@/web/overlay/widget-registry'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { AppConfig, pushHostConfig, saveConfigQuietly } from '@/web/Config'
import { MODULES, ensureWokeConfig, isWidgetTypeOn, setModuleOn } from '../modules'
import { markNewsSeen, unseenNews } from '../tab-bar/news'
import { MainProcess } from '@/web/background/IPC'
import { setNewsOff } from '../tab-bar/news-off'
import type { NewsItem } from '../tab-bar/news'
import { groupNews } from '../tab-bar/news-groups'
import type { NewsGroup } from '../tab-bar/news-groups'
import { WButton } from '../ui'
import { DOCK_ART_ITEMS, gameIcon } from '../ui/game-icons'
// Each line's title shows its tool's icon, as All tools and the dock do.
import ToolIcon from '../tab-bar/ToolIcon.vue'
import { artFor, iconFor } from '../tab-bar/tools'
import { personalOn } from '../personal'
import { requestGoto } from '../tab-bar/goto'
import { NEWS_SPOTS } from '../tab-bar/goto-targets'
import { NEWS_DEMOS, hasShowMe } from '../tab-bar/news-demos'
import { searchRequest } from '../search/widget'
import { elementPoint, openPriceCheck } from '../ui/tooltip/item-price-check'
import type { ItemMenuRef } from '../ui/tooltip/item-menu-logic'
import { uiTrace } from '../app/ui-trace'
import { WORTH_PREFIX, dayOf, noteBits, worthLine } from '../tab-bar/worth-knowing'
import WKbd from '../ui/WKbd.vue'
import { hintPlaceOk, holdTour, retireHint } from '../shared/hints'
import DockItem from './DockItem.vue'
import { openOverlay, openSettingsPage, showWithOverlay } from './dock'
import { moduleSettingsPage } from '../tab-bar/tools'
import type { DockMenuAction } from './dock'

const wm = inject<WidgetManager>('wm')!
const { t } = useI18n()
// The tool's name as Settings lists it (TabBar's typeName).
function typeName (wmType: string): string {
  const spec = registry.widgets.find(w => w.widget.type === wmType)?.widget
  return spec?.trNameKey ? t(spec.trNameKey) : wmType
}
const lines = computed(() => unseenNews(AppConfig().woke, MainProcess.version.value))
const groups = computed(() => groupNews(lines.value))
// The Worth knowing line of the day, if one is due (not in a map, not with
// What's new off). Shaped as a line, so Show me and dismiss work the same.
const worth = computed<NewsItem | null>(() => {
  const woke = AppConfig().woke
  if (!woke || woke.newsOff || !hintPlaceOk()) return null
  const l = worthLine(woke.hints, {
    unseenNews: new Set(lines.value.map(n => n.id)),
    byName: AppConfig().language === 'en',
    reader: personalOn.value,
    toolOn: t => isWidgetTypeOn(AppConfig(), t)
  })
  return l && hasShowMe(l, AppConfig().language === 'en', personalOn.value) ? { ...l, since: '' } : null
})
// Its note with key chips; Ctrl + Space reads the player's own search key.
const worthBits = computed(() => worth.value
  ? noteBits(worth.value.note, (AppConfig().widgets.find(w => w.wmType === 'woke-search') as { hotkey?: string | null } | undefined)?.hotkey)
  : [])
const all = computed(() => worth.value ? [...lines.value, worth.value] : lines.value)
const count = computed(() => all.value.length)
const isWorth = (n: NewsItem) => n.id.startsWith(WORTH_PREFIX)
// The open group: the first (newest) until one is picked, and again once
// the picked one is gone. '' is all folded (this time only).
const picked = ref<string | undefined>(AppConfig().woke?.newsOpen)
const openKey = computed(() => {
  const k = picked.value
  // A picked group down to one line has no fold: back to the newest.
  if (k === '' || groups.value.some(g => g.key === k && g.lines.length > 1)) return k
  return groups.value.find(g => g.lines.length > 1)?.key
})
function isOpen (g: NewsGroup) { return openKey.value === g.key }
function toggle (g: NewsGroup) {
  picked.value = isOpen(g) ? '' : g.key
  // An opened group is remembered; folding it all forgets, so the newest
  // opens next time.
  ensureWokeConfig(AppConfig()).woke.newsOpen = picked.value || undefined
  saveConfigQuietly()
  uiTrace(`What's new › ${picked.value ? 'open' : 'fold'} ${g.key}`)
}
// A sample price check goes by the item's English name.
const byName = computed(() => AppConfig().language === 'en')
// "New: a Planner tab…" reads "A Planner tab…" under the tool's name.
function sentence (note: string) {
  const s = note.replace(/^New: /, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Saved now: a click in game (its menu, a pinned card) has no blur to save
// on, and an open Settings window holds back the usual save.
function markSeen (items: NewsItem[]) {
  markNewsSeen(ensureWokeConfig(AppConfig()).woke, items.filter(n => !isWorth(n)).map(n => n.id))
  // A Worth knowing line goes like a tip: once (shared/hints.ts). The next one
  // comes tomorrow.
  for (const n of items) {
    if (!isWorth(n)) continue
    retireHint(n.id)
    const h = AppConfig().woke?.hints
    if (h?.wk?.id === n.id) h.wk = { id: n.id, day: dayOf(new Date()) }
  }
  saveConfigQuietly()
}

// Its window on the line's tab, placed first if it isn't yet. A switched-off
// tool is turned on, as the launcher does. Net worth's reader goes to its
// switch in Settings instead, since turning it on asks first.
function show (n: NewsItem, e?: MouseEvent) {
  markSeen([n])
  uiTrace(`What's new › Show me: ${n.id} (${n.wmType}${n.goto ? ` › ${n.goto}` : ''}${NEWS_SPOTS[n.id] ? ` › ${NEWS_SPOTS[n.id]}` : ''}${n.settingsPage ? `, Settings › ${n.settingsPage}` : ''})`)
  if (!n.settingsPage && n.wmType !== 'woke-net-worth' && !isWidgetTypeOn(AppConfig(), n.wmType)) {
    const config = ensureWokeConfig(AppConfig())
    for (const m of MODULES) if (m.widgetTypes.includes(n.wmType)) setModuleOn(config, m.id, true)
  }
  const demo = NEWS_DEMOS[n.id]
  if (demo) {
    // A dock card click in game doesn't open the overlay; the sample needs it.
    if (!wm.active.value) openOverlay()
    uiTrace(`What's new › Show me: ${n.id}, sample ${'check' in demo ? `price check of ${demo.check.name}` : `search "${demo.search}"`}`)
    if ('search' in demo) {
      const q = demo.search
      // After a switched-on Search mounts.
      nextTick(() => { searchRequest.value = { query: q } })
    } else runCheck(n, demo.check, demo.spot, e).catch(() => {})
    return
  }
  const off = !isWidgetTypeOn(AppConfig(), n.wmType) || (n.wmType === 'woke-net-worth' && !personalOn.value)
  if (n.settingsPage || off) {
    if (off) uiTrace(`What's new › Show me: ${n.wmType} is off, to Settings`)
    openSettingsPage(wm, n.settingsPage ?? 'All modules')
    return
  }
  let w = wm.widgets.value.find(w => w.wmType === n.wmType)
  // A dock-only tool has no window: its own page in Settings, as the rail does.
  if (w?.wmFlags.includes('menu::skip')) {
    uiTrace(`What's new › Show me: ${n.wmType} has no window, to its Settings page`)
    openSettingsPage(wm, moduleSettingsPage(n.wmType, typeName))
    return
  }
  if (!w) {
    wm.create(n.wmType)
    w = wm.widgets.value.reduce((a, b) => (a.wmId > b.wmId ? a : b))
    forgetRailSlot(w.wmId)
  }
  const wmId = w.wmId
  // On the tab the line is about (goto.ts).
  if (n.goto) requestGoto(wmId, n.goto, NEWS_SPOTS[n.id])
  nextTick(() => nextTick(() => {
    showWithOverlay(wm, wmId)
    pushHostConfig()
  }))
}

// A sample price check, then its spot flashed once the results draw.
async function runCheck (n: NewsItem, ref: ItemMenuRef, spot: string, e?: MouseEvent) {
  holdTour()
  const at = e?.currentTarget ? elementPoint(e) : { x: window.screenX + window.innerWidth / 2, y: window.screenY + window.innerHeight / 2 }
  if (!await openPriceCheck(ref, at)) {
    uiTrace(`What's new › Show me: can't price check ${ref.name}`)
    if (n.settingsPage) openSettingsPage(wm, n.settingsPage)
    return
  }
  const { flashSpot } = await import('../tab-bar/goto-flash')
  flashSpot(null, spot, 150)
}

// Ids get reused: a removed window's rail pin and label mustn't carry over
// (as TabBar's placeNew does).
function forgetRailSlot (wmId: number) {
  const rail = AppConfig().widgets.find(w => w.wmType === 'menu') as { pinned?: number[], labels?: Record<number, string> } | undefined
  if (!rail) return
  if (rail.pinned) rail.pinned = rail.pinned.filter(id => id !== wmId)
  if (rail.labels?.[wmId] != null) rail.labels = Object.fromEntries(Object.entries(rail.labels).filter(([id]) => Number(id) !== wmId))
}

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Dismiss all', icon: 'fas fa-check', action: () => { markSeen(all.value) } },
  { label: "Turn off What's new", icon: 'fas fa-bell-slash', action: turnOff }
])

// For players who update every day or two. Back on: Settings, Look & icon row.
function turnOff () {
  setNewsOff(ensureWokeConfig(AppConfig()).woke, true)
  saveConfigQuietly()
}
</script>

<style module>
.body { display: flex; flex-direction: column; gap: 6px; padding: 6px var(--w-pad) 8px; }
.group + .group { border-top: 1px solid var(--w-line-soft); padding-top: 6px; }
.head { display: flex; align-items: center; gap: 4px; }
.fold { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 1px 0; background: none; border: 0; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.fold:hover .name { filter: brightness(1.2); }
.chev { width: 10px; font-size: var(--w-fs-xs); color: var(--w-faint); transition: transform 0.12s; }
.chevOpen { transform: rotate(90deg); }
.topic { margin-left: 4px; opacity: 0.8; }
.preview { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--w-faint); font-size: var(--w-fs-sm); }
.count { font-size: var(--w-fs-xs); padding: 0 6px; border-radius: 8px; border: 1px solid var(--w-line); color: var(--w-fg); }
.lines { display: flex; flex-direction: column; gap: 6px; padding-left: 16px; }
.head + .lines { padding-top: 4px; }
.line { display: flex; align-items: center; gap: 4px; }
.text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.toolIcon { --w-icon-md: 16px; --w-fs-lg: var(--w-fs-md); }
.name { display: flex; align-items: center; gap: 5px; color: var(--w-accent); font-family: var(--w-head); letter-spacing: var(--w-head-track); }
.foot { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
.keyBit { display: inline-flex; align-items: center; gap: 4px; margin: 0 2px; vertical-align: 1px; }
.searchIcon { font-size: 0.85em; color: var(--w-accent); }
</style>
