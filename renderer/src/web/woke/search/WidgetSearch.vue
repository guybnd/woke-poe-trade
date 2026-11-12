<template>
  <Widget :config="config" move-handles="none" :removable="false" :inline-edit="false" :readonly="true">
    <WPanel v-if="open" width="66rem" max-height="72vh" :scroll="false" :resizable="false">
      <div :class="$style.root" data-search-palette @click="keepTyping" @keydown="onHotkey">
        <div v-if="pins.length" :class="$style.pins">
          <button v-for="(p, i) in pins" :key="key(p)" v-item-tip="p" :class="[$style.pin, { [$style.pinTop]: i === 0 && pins.length > 1 }]"
            title="Remove from the comparison" @click="togglePin(p)">
            <span class="w-trunc" :class="rarityClass(p.type)">{{ p.name }}<span v-if="p.variant" class="w-dim ml-1">{{ p.variant }}</span></span>
            <WPrice :chaos="p.chaos" :divine="divine" />
          </button>
        </div>
        <label :class="$style.find">
          <i class="fas fa-search" />
          <input ref="input" v-model="query" :class="$style.input" spellcheck="false" aria-label="Search"
            placeholder="Item, tool or setting. Or paste an item (Ctrl V)" @keydown="onKey" @paste="onPaste">
          <WCorruptedFilter v-model="corrupted" />
          <WKbd keys="Esc" />
        </label>
        <div :class="$style.panes">
          <div ref="listEl" :class="$style.list" class="w-scroll">
            <template v-for="section in sections" :key="section.label">
              <div :class="$style.head">{{ section.label }}<template v-if="section.capped"> · first {{ PRICE_GROUP_LIMIT }}, keep typing</template></div>
              <button v-for="e in section.entries" :key="e.id" v-item-tip="tipOf(e)" tabindex="-1" :class="[$style.res, { [$style.sel]: e === selected }]"
                :data-selected="e === selected || undefined" @click="selected = e" @dblclick="run(e)">
                <WIcon v-if="e.kind === 'price'" :src="ninjaIcon(e.group.type, e.group.name) ?? undefined" size="md" />
                <WIcon v-else-if="e.kind === 'item'" :src="e.info.icon" size="md" />
                <WIcon v-else-if="e.kind === 'lookup' && isImageIcon(e.icon)" :src="e.icon" size="md" />
                <i v-else :class="e.icon" :style="{ width: 'var(--w-icon-md)', textAlign: 'center' }" />
                <span :class="$style.resName">
                  <span class="w-trunc" :class="e.kind === 'price' ? rarityClass(e.group.type) : undefined">{{ e.name }}</span>
                  <span class="w-dim w-trunc" :class="$style.small">{{ e.sub }}</span>
                </span>
                <span v-if="e.kind === 'price'" :class="$style.range"><template v-if="e.group.low !== e.group.high"><WPrice :chaos="e.group.low" :divine="divine" /> to </template><WPrice :chaos="e.group.high" :divine="divine" /></span>
                <WKbd v-else-if="e.kind === 'command' && e.keys" :keys="e.keys" />
              </button>
            </template>
            <div v-if="!entries.length" :class="$style.none">Type an item, a tool or a setting. Items you look up show here next time.</div>
          </div>
          <div :class="$style.detail" class="w-scroll">
            <template v-if="selected?.kind === 'price'">
              <div :class="$style.title">
                <WIcon :src="ninjaIcon(selected.group.type, selected.group.name) ?? undefined" size="lg" />
                <span :class="rarityClass(selected.group.type)">{{ selected.group.name }}</span>
                <span class="w-dim" :class="$style.small">{{ typeLabel(selected.group.type) }}</span>
              </div>
              <div :class="[$style.grid, $style.gridHead]"><span>Variant</span><span class="text-right">Now</span><span class="text-right">24h ago</span><span class="text-right">7d ago</span><span class="text-right">24h</span><span class="text-right">7d</span><span /></div>
              <div v-for="v in selected.group.variants" :key="key(v)" v-item-tip="v" :class="[$style.grid, $style.row]">
                <span class="w-trunc">{{ v.variant || selected.group.name }}
                  <i v-if="isThin(v)" class="fas fa-exclamation-circle w-faint" :title="thinTitle(v)" /></span>
                <WPrice :chaos="v.chaos" :divine="divine" class="text-right" />
                <WPrice :chaos="v.d1" :divine="divine" class="text-right w-dim" />
                <WPrice :chaos="v.d7" :divine="divine" class="text-right w-dim" />
                <WDelta :value="changeSince(v.chaos, v.d1)" class="text-right" />
                <WDelta :value="changeSince(v.chaos, v.d7)" class="text-right" />
                <span :class="$style.rowBtns">
                  <button class="w-icon-btn" :class="{ 'w-icon-btn--on': isPinned(v) }" title="Pin to compare" aria-label="Pin to compare" @click="togglePin(v)"><i class="fas fa-thumbtack" /></button>
                  <button v-if="tracker" class="w-icon-btn" :class="{ 'w-icon-btn--on': isWatched(v) }" :title="isWatched(v) ? 'Stop watching' : 'Watch price'" :aria-label="isWatched(v) ? 'Stop watching' : 'Watch price'" @click="toggleWatch(v)"><i :class="isWatched(v) ? 'fas fa-star' : 'far fa-star'" /></button>
                </span>
              </div>
              <div :class="$style.acts">
                <WButton v-if="tracker" size="sm" @click="openInMarket(selected.group.name)">Open in Market</WButton>
                <WButton v-if="infoFor(selected)" size="sm" @click="openLookup(selected, 'wiki')">Wiki</WButton>
                <WButton v-if="infoFor(selected)" size="sm" @click="openLookup(selected, 'poedb')">poedb</WButton>
                <WButton v-if="canPriceCheck(selected)" size="sm" @click="priceCheck(selected, $event)">Live listings</WButton>
                <WButton size="sm" @click="openTrade(selected)">Trade site</WButton>
                <WButton size="sm" @click="findInStash(selected.name)">Find in stash</WButton>
                <WButton size="sm" @click="copyName(selected.name)">Copy name</WButton>
              </div>
            </template>
            <template v-else-if="selected?.kind === 'item'">
              <div :class="$style.title"><WIcon :src="selected.info.icon" size="lg" /><span>{{ selected.name }}</span></div>
              <p class="w-dim">{{ snapshot ? "poe.ninja has no price for this. Rares, bases, flasks and cluster jewels aren't in the saved prices." : 'No saved prices yet, so this has no price here.' }}</p>
              <div :class="$style.acts">
                <WButton size="sm" @click="openLookup(selected, 'wiki')">Wiki</WButton>
                <WButton size="sm" @click="openLookup(selected, 'poedb')">poedb</WButton>
                <WButton v-if="canPriceCheck(selected)" size="sm" @click="priceCheck(selected, $event)">Live listings</WButton>
                <WButton size="sm" @click="openTrade(selected)">Trade site</WButton>
                <WButton size="sm" @click="findInStash(selected.name)">Find in stash</WButton>
                <WButton size="sm" @click="copyName(selected.name)">Copy name</WButton>
              </div>
            </template>
            <LookupDetail v-else-if="selected?.kind === 'lookup'" :card="selected.card" :divine="divine" @act="act" />
            <template v-else-if="selected">
              <div :class="$style.title"><i :class="selected.icon" /><span>{{ selected.name }}</span></div>
              <p class="w-dim">{{ selected.about }}</p>
              <div :class="$style.acts"><WButton size="sm" @click="run(selected!)">{{ selected.verb }}</WButton></div>
            </template>
          </div>
        </div>
        <div :class="$style.foot">
          <span><WKbd keys="Up" /> <WKbd keys="Down" /> move</span>
          <span><WKbd keys="Enter" /> open</span>
          <span><WKbd keys="Ctrl + P" /> pin to compare</span>
          <span><WKbd keys="Esc" /> back to game</span>
          <span class="ml-auto">{{ dataNote }}</span>
        </div>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import { widgetSearchSpec } from '../widget-specs'

export default { widget: widgetSearchSpec }
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { WidgetManager } from '@/web/overlay/interfaces'
import type { Widget as WidgetT } from '@/web/overlay/widgets'
import Widget from '@/web/overlay/Widget.vue'
import { registry } from '@/web/overlay/widget-registry'
import { AppConfig } from '@/web/Config'
import { Host } from '@/web/background/IPC'
import { useLeagues } from '@/web/background/Leagues'
import { ITEM_BY_REF, ITEMS_ITERATOR } from '@/assets/data'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import type { BaseType } from '@/assets/data/interfaces'
import { createVirtualItem, ItemRarity } from '@/parser/ParsedItem'
import { WPanel, WButton, WPrice, WDelta, WIcon, WKbd, ninjaIcon, nowMinute, toast, vItemTip } from '../ui'
import WCorruptedFilter from '../ui/WCorruptedFilter.vue'
import { copyText } from '../ui/copy'
import { MODULES, isWidgetTypeOn } from '../modules'
import { pressedKeys, sortKeys } from '../loot-filter/hotkey-match'
import { whenIdle } from '../shared/perf'
import { PAGES } from '../settings/pages'
import { ICON_TOOL_NAMES, iconFor, looksLikeItem, parseWidgetTitle } from '../tab-bar/tools'
import { holdPricesForSearch, useSearchSnapshot } from '../market/price-index'
import { MARKET_TRACKER_TYPE, marketSearchRequest } from '../market/widget'
import type { MarketTrackerWidget } from '../market/widget'
import { isThin, itemKey, thinTitle } from '../market/types'
import type { CorruptedFilter, PriceItem } from '../market/types'
import { lookupRequest } from '../item-lookup/lookup'
import type { LookupTab } from '../item-lookup/lookup'
import { LOOT_FILTER_TYPE, reloadHotkeyTarget, strictnessHotkeyTarget } from '../loot-filter/widget'
import { MAP_SCAN_TYPE, scanHotkeyTarget } from '../map-mods/scan'
import { ESSENCE_SCAN_TYPE, essenceHotkeyTarget, essenceOnceTarget } from '../essence-scan/widget'
import { RUN_TIMER_TYPE, hotkeyTarget as timerTarget } from '../campaign/run-timer'
import { PRICE_GROUP_LIMIT, baseUniqueName, changeSince, groupKey, groupTip, rarityClass, searchNamed, searchPrices, tradeUrl, typeLabel } from './search'
import type { PriceGroup } from './search'
import LookupDetail from './LookupDetail.vue'
import { isImageIcon } from './lookups/types'
import type { LookupAction, LookupCard, LookupContext } from './lookups/types'
import { countdownLookup, currencyLookup, webLookup } from './lookups/answers'
import { bossLookup, dropLookup } from './lookups/bosses'
import { SEARCH_TARGET, searchRequest } from './widget'
import type { SearchWidget } from './widget'

const props = defineProps<{ config: SearchWidget }>()
const wm = inject<WidgetManager>('wm')!
const { t } = useI18n()
const leagues = useLeagues()
const snapshot = useSearchSnapshot()

interface Base { id: string, name: string, sub: string }
interface PriceEntry extends Base { kind: 'price', group: PriceGroup }
interface ItemEntry extends Base { kind: 'item', info: BaseType }
interface ActionEntry extends Base { kind: 'tool' | 'command' | 'setting', icon: string, about: string, verb: string, keys?: string | null, action: () => void }
interface LookupEntry extends Base { kind: 'lookup', icon: string, card: LookupCard }
type Entry = PriceEntry | ItemEntry | ActionEntry | LookupEntry

const query = shallowRef('')
const corrupted = shallowRef<CorruptedFilter>('any')
const input = shallowRef<HTMLInputElement | null>(null)
const listEl = shallowRef<HTMLElement | null>(null)
const pinKeys = shallowRef<string[]>([])

const divine = computed(() => snapshot.value?.divine ?? null)
// Pins follow the latest prices, and go if the item isn't in them (a new league).
const priceByKey = computed(() => new Map((snapshot.value?.items ?? []).map(i => [itemKey(i), i])))
const pins = computed(() => pinKeys.value
  .map(k => priceByKey.value.get(k))
  .filter((p): p is PriceItem => !!p)
  .sort((a, b) => b.chaos - a.chaos))
// Names with any price at all, whatever the filter or the list's limit.
const pricedNames = computed(() => new Set((snapshot.value?.items ?? []).map(i => baseUniqueName(i.name))))
const open = computed(() => props.config.wmWants === 'show')
const queryOk = computed(() => query.value.trim().length >= 2)
const key = itemKey

// ---- every item in the game, for the ones without a price ----
const NAMESPACES = new Set<BaseType['namespace']>(['ITEM', 'UNIQUE', 'GEM', 'DIVINATION_CARD'])
let allItems: BaseType[] | null = null
function gameItems (): BaseType[] {
  if (!allItems) {
    const byName = new Map<string, BaseType>()
    for (const item of ITEMS_ITERATOR('"namespace":"')) {
      if (NAMESPACES.has(item.namespace) && !byName.has(item.name)) byName.set(item.name, item)
    }
    // The data isn't loaded yet: try again on the next search.
    if (!byName.size) return []
    allItems = [...byName.values()]
  }
  return allItems
}

// poe.ninja's names and refName are English, as the tooltip's data is.
function tipOf (entry: Entry) {
  if (entry.kind === 'price') return groupTip(entry.group)
  if (entry.kind === 'item') return { name: entry.info.refName }
  if (entry.kind === 'lookup') return entry.card.tip ?? null
  return null
}

function priceEntry (group: PriceGroup): PriceEntry {
  return {
    kind: 'price',
    id: `p:${groupKey(group)}`,
    name: group.name,
    sub: group.variants.length > 1 ? `${group.variants.length} prices` : (group.variants[0].variant || typeLabel(group.type)),
    group
  }
}

// ---- tools, commands, settings ----
function toolEntries (): ActionEntry[] {
  return wm.widgets.value
    .filter(w => !w.wmFlags.includes('menu::skip') && w.wmType !== 'item-search' && w.wmType !== 'settings' && isWidgetTypeOn(AppConfig(), w.wmType))
    .map(w => {
      const mod = MODULES.find(m => m.widgetTypes.includes(w.wmType))
      const spec = registry.widgets.find(c => c.widget.type === w.wmType)?.widget
      const name = parseWidgetTitle(w.wmTitle).title || ICON_TOOL_NAMES[w.wmType] || mod?.name || (spec?.trNameKey ? t(spec.trNameKey) : w.wmType)
      return {
        kind: 'tool' as const,
        id: `t:${w.wmId}`,
        name,
        sub: 'Tool',
        icon: `fas ${iconFor(w.wmType)}`,
        about: mod?.description ?? '',
        verb: 'Open',
        action: () => { wm.show(w.wmId) }
      }
    })
}

function commandEntries (): ActionEntry[] {
  const out: ActionEntry[] = []
  const add = (w: WidgetT & Record<string, any>, name: string, prop: string, target: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    out.push({
      kind: 'command',
      id: `c:${target}`,
      name,
      sub: 'Do it now',
      icon: 'fas fa-bolt',
      keys: (w[prop] as string | null | undefined) ?? null,
      about: `${name}, then back to the game.`,
      verb: 'Do it',
      action: () => {
        Host.selfDispatch({ name: 'MAIN->CLIENT::widget-action', payload: { target } })
        close()
      }
    })
  }
  for (const w of wm.widgets.value as Array<WidgetT & Record<string, any>>) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!isWidgetTypeOn(AppConfig(), w.wmType)) continue
    if (w.wmType === LOOT_FILTER_TYPE && w.reloadViaChat) {
      add(w, 'Reload the saved loot filter in game', 'reloadHotkey', reloadHotkeyTarget(w.wmId))
    }
    if (w.wmType === LOOT_FILTER_TYPE && w.neversink?.on) {
      add(w, 'Make the loot filter stricter', 'stricterHotkey', strictnessHotkeyTarget(w.wmId, 'stricter'))
      add(w, 'Make the loot filter looser', 'looserHotkey', strictnessHotkeyTarget(w.wmId, 'looser'))
    } else if (w.wmType === MAP_SCAN_TYPE) {
      add(w, 'Map scan on or off', 'hotkey', scanHotkeyTarget(w.wmId))
    } else if (w.wmType === ESSENCE_SCAN_TYPE) {
      add(w, 'Essence scan on or off', 'hotkey', essenceHotkeyTarget(w.wmId))
      add(w, 'Read every essence once', 'onceHotkey', essenceOnceTarget(w.wmId))
    } else if (w.wmType === RUN_TIMER_TYPE) {
      add(w, 'Pause or resume the run timer', 'hotkeyPause', timerTarget(w.wmId, 'pause'))
    }
  }
  return out
}

function settingEntries (): ActionEntry[] {
  return PAGES.map(page => ({
    kind: 'setting' as const,
    id: `s:${page.id}`,
    name: page.name,
    sub: 'Settings page',
    icon: 'fas fa-cog',
    about: `The ${page.name} page in Settings.`,
    verb: 'Open settings',
    action: () => {
      const settings = wm.widgets.value.find(w => w.wmType === 'settings')
      if (!settings) return
      wm.setFlag(settings.wmId, `settings::page=${page.name}`, true)
      wm.show(settings.wmId)
    }
  }))
}

// ---- lookups: answers, facts and the web ----
const lookupContext = computed<LookupContext>(() => {
  // A name's plain row, else its cheapest variant; and each exact variant.
  const prices = new Map<string, { chaos: number, plain: boolean }>()
  const variants = new Map<string, number>()
  for (const i of snapshot.value?.items ?? []) {
    variants.set(`${i.name}\u0000${i.variant}`, i.chaos)
    const had = prices.get(i.name)
    // The plain row wins, a currency's over another type's; else the cheapest variant.
    if (!i.variant) {
      if (!had?.plain || i.type === 'Currency') prices.set(i.name, { chaos: i.chaos, plain: true })
    } else if (!had || (!had.plain && i.chaos < had.chaos)) prices.set(i.name, { chaos: i.chaos, plain: false })
  }
  const league = leagues.selectedId.value
  return {
    price: (name, variant) => name === 'Chaos Orb'
      ? 1
      : variant != null ? variants.get(`${name}\u0000${variant}`) ?? null : prices.get(name)?.chaos ?? null,
    tools: new Set<string>(),
    divine: divine.value,
    now: Date.now(),
    league: league ? { name: league, startedAt: leagues.startedAt.value } : null
  }
})
const currencyNames = computed(() => [...new Set((snapshot.value?.items ?? []).filter(i => i.type === 'Currency').map(i => i.name))])
const lookups = computed(() => [currencyLookup(currencyNames.value), countdownLookup, bossLookup, dropLookup, webLookup])

// Kept apart from the prices, so switching a tool doesn't rebuild them.
const lookupTools = computed(() => new Set(wm.widgets.value.filter(w => isWidgetTypeOn(AppConfig(), w.wmType)).map(w => w.wmType)))
function lookupCards (q: string): LookupCard[] {
  // Re-read every 30 s, so countdowns tick while the palette is open.
  const ctx = { ...lookupContext.value, tools: lookupTools.value, now: nowMinute.value }
  return lookups.value.flatMap(l => l(q, ctx))
}
// One section per card group, in the order they came; `only` keeps those
// groups, `skip` leaves them out.
function cardSections (cards: LookupCard[], only: string[] | null, skip: string[] = []) {
  const byGroup = new Map<string, Entry[]>()
  for (const card of cards) {
    if (only ? !only.includes(card.group) : skip.includes(card.group)) continue
    const list = byGroup.get(card.group) ?? []
    list.push({ kind: 'lookup', id: `l:${card.id}`, name: card.name, sub: card.sub, icon: card.icon, card })
    byGroup.set(card.group, list)
  }
  return [...byGroup].map(([label, entries]) => ({ label, entries }))
}
function act (action: LookupAction) {
  if ('url' in action) window.open(action.url)
  else if ('tool' in action) {
    const w = wm.widgets.value.find(w => w.wmType === action.tool)
    if (w) wm.show(w.wmId)
  } else if ('copy' in action) copyText(action.copy).then(ok => { if (ok) toast(`Copied ${action.copy}`, { ms: 1800 }) })
  else {
    query.value = action.search
    focusInput()
  }
}

// ---- results ----
const sections = computed<Array<{ label: string, entries: Entry[], capped?: boolean }>>(() => {
  if (!open.value) return []
  const items = snapshot.value?.items ?? []
  if (!queryOk.value) {
    const recent = recentGroups(items)
    return recent.length ? [{ label: 'Recent', entries: recent.map(priceEntry) }] : []
  }
  const q = query.value
  const groups = searchPrices(items, q, { corrupted: corrupted.value })
  const priced = pricedNames.value
  const other = searchNamed(gameItems().filter(i => !priced.has(i.refName)), q, i => i.name, 8)
    .map((info): ItemEntry => ({ kind: 'item', id: `i:${info.namespace}:${info.name}`, name: info.name, sub: snapshot.value ? 'No poe.ninja price' : 'No price', info }))
  const cards = lookupCards(q)
  const out = [
    ...cardSections(cards, ['Answer']),
    { label: 'Prices', entries: groups.map(priceEntry) as Entry[], capped: groups.length >= PRICE_GROUP_LIMIT },
    { label: 'Other items', entries: other as Entry[] },
    ...cardSections(cards, null, ['Answer', 'Search the web']),
    { label: 'Tools', entries: searchNamed(toolEntries(), q, e => e.name) as Entry[] },
    { label: 'Do it now', entries: searchNamed(commandEntries(), q, e => e.name) as Entry[] },
    { label: 'Settings', entries: searchNamed(settingEntries(), q, e => e.name) as Entry[] },
    ...cardSections(cards, ['Search the web'])
  ]
  return out.filter(s => s.entries.length)
})
const entries = computed(() => sections.value.flatMap(s => s.entries))

const selected = shallowRef<Entry | null>(null)
// The same result stays selected as you keep typing, while it still matches.
watch(entries, (list) => {
  const id = selected.value?.id
  selected.value = list.find(e => e.id === id) ?? list[0] ?? null
})

function move (dir: 1 | -1) {
  const list = entries.value
  if (!list.length) return
  const at = selected.value ? list.indexOf(selected.value) : -1
  selected.value = list[(at + dir + list.length) % list.length]
  nextTick(() => listEl.value?.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' }))
}

function onKey (e: KeyboardEvent) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    move(e.key === 'ArrowDown' ? 1 : -1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (selected.value) run(selected.value)
  } else if (e.key === 'Escape') {
    // Main takes Esc first in the app; this is for the browser.
    e.stopPropagation()
    close()
  } else if (e.key.toLowerCase() === 'p' && e.ctrlKey) {
    e.preventDefault()
    if (selected.value?.kind === 'price') togglePin(selected.value.group.variants[0])
  }
}

function run (entry: Entry) {
  remember(entry)
  if (entry.kind === 'price') {
    if (tracker.value) openInMarket(entry.group.name)
    else openTrade(entry)
  } else if (entry.kind === 'item') {
    openLookup(entry, 'wiki')
  } else if (entry.kind === 'lookup') {
    if (entry.card.actions[0]) act(entry.card.actions[0])
  } else {
    entry.action()
  }
}

// ---- recent lookups, saved with the window ----
const RECENT_MAX = 6
function recentGroups (items: readonly PriceItem[]): PriceGroup[] {
  const out: PriceGroup[] = []
  for (const r of props.config.recent ?? []) {
    const group = searchPrices(items.filter(i => i.type === r.type && i.name === r.name), r.name, { limit: 1 })[0]
    if (group) out.push(group)
  }
  return out
}
function remember (entry: Entry | null) {
  if (entry?.kind !== 'price') return
  const { type, name } = entry.group
  const rest = (props.config.recent ?? []).filter(r => r.type !== type || r.name !== name)
  props.config.recent = [{ type, name }, ...rest].slice(0, RECENT_MAX)
}

// ---- pins ----
const PIN_MAX = 5
function isPinned (item: PriceItem) { return pinKeys.value.includes(key(item)) }
function togglePin (item: PriceItem) {
  const k = key(item)
  pinKeys.value = isPinned(item) ? pinKeys.value.filter(p => p !== k) : [...pinKeys.value, k].slice(-PIN_MAX)
}

// ---- Market ----
const tracker = computed(() => wm.widgets.value.find(w => w.wmType === MARKET_TRACKER_TYPE && isWidgetTypeOn(AppConfig(), w.wmType)) as MarketTrackerWidget | undefined)
function isWatched (item: PriceItem) {
  return tracker.value?.watchlist?.some(w => itemKey(w) === key(item)) ?? false
}
function toggleWatch (item: PriceItem) {
  const w = tracker.value
  if (!w) return
  if (!w.watchlist) w.watchlist = []
  if (isWatched(item)) w.watchlist = w.watchlist.filter(x => itemKey(x) !== key(item))
  else w.watchlist.push({ type: item.type, name: item.name, variant: item.variant })
}
function openInMarket (name: string) {
  const w = tracker.value
  if (!w) return
  marketSearchRequest.value = name
  wm.show(w.wmId)
}

// ---- item actions ----
function nsOf (type: string): BaseType['namespace'] {
  return /^Unique/.test(type) ? 'UNIQUE' : /Gem/.test(type) ? 'GEM' : type === 'DivinationCard' ? 'DIVINATION_CARD' : 'ITEM'
}
function infoFor (entry: PriceEntry | ItemEntry): BaseType | undefined {
  if (entry.kind === 'item') return entry.info
  // poe.ninja's names are the English ones, whatever the game's language.
  return ITEM_BY_REF(nsOf(entry.group.type), baseUniqueName(entry.group.name))?.[0]
}
function canPriceCheck (entry: PriceEntry | ItemEntry) {
  return infoFor(entry)?.namespace === 'UNIQUE'
}
function openLookup (entry: PriceEntry | ItemEntry, tab: LookupTab) {
  remember(entry)
  const info = infoFor(entry)
  if (!info) return
  lookupRequest.value = { item: createVirtualItem({ rarity: info.namespace === 'UNIQUE' ? ItemRarity.Unique : ItemRarity.Normal, info }), tab }
}
function priceCheck (entry: PriceEntry | ItemEntry, e: MouseEvent) {
  remember(entry)
  const info = infoFor(entry)
  if (!info) return
  const item = createVirtualItem({ rarity: ItemRarity.Unique, info })
  Host.selfDispatch({
    name: 'MAIN->CLIENT::item-text',
    payload: { clipboard: item.rawText, item, position: { x: e.screenX, y: e.screenY }, focusOverlay: true, target: 'price-check' }
  })
}
function openTrade (entry: PriceEntry | ItemEntry) {
  remember(entry)
  const league = leagues.selectedId.value
  if (!league) {
    toast('Pick a league in the settings first')
    return
  }
  const info = infoFor(entry)
  const name = entry.kind === 'price' ? entry.group.name : entry.name
  const url = info?.namespace === 'UNIQUE'
    ? tradeUrl(league, { name: info.name, ...(AppConfig().language === 'en' ? { type: info.unique?.base } : {}) }, getTradeEndpoint())
    : tradeUrl(league, { type: info?.name ?? name }, getTradeEndpoint())
  window.open(url)
}
function findInStash (name: string) {
  Host.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'stash-search', text: JSON.stringify(name) } })
}
function copyName (name: string) {
  copyText(name).then(ok => { if (ok) toast(`Copied "${name}"`, { ms: 1800 }) })
}

function onPaste (e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain') ?? ''
  if (!looksLikeItem(text)) return
  e.preventDefault()
  Host.selfDispatch({
    name: 'MAIN->CLIENT::item-text',
    payload: { clipboard: text, position: { x: window.screenX + window.innerWidth / 2, y: window.screenY + 100 }, focusOverlay: true, target: 'price-check' }
  })
}

// ---- opening and closing ----
function focusInput (select = false) {
  nextTick(() => {
    input.value?.focus()
    if (select) input.value?.select()
  })
}
// Clicking a button mustn't take the keyboard away from the box.
function keepTyping (e: MouseEvent) {
  if ((e.target as Element).closest('button')) focusInput()
}
// Global hotkeys are off while the overlay has the keyboard, so the key that
// opened this has to be caught here to close it again.
function onHotkey (e: KeyboardEvent) {
  const key = props.config.hotkey
  if (key && pressedKeys(e) === sortKeys(key)) {
    e.preventDefault()
    // Still held from opening it.
    if (!e.repeat) close()
  }
}
function start (text: string) {
  holdPricesForSearch()
  query.value = text
  corrupted.value = 'any'
  selected.value = entries.value[0] ?? null
  wm.show(props.config.wmId)
  focusInput(true)
  whenIdle(gameItems)
}
function close () {
  wm.hide(props.config.wmId)
  if (Host.isElectron) Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
}

const hotkeys = Host.onEvent('MAIN->CLIENT::widget-action', (e) => {
  if (e.target !== SEARCH_TARGET) return
  if (open.value && wm.active.value) close()
  else start('')
})
onBeforeUnmount(() => { hotkeys.abort() })

watch(searchRequest, (request) => {
  if (!request) return
  searchRequest.value = null
  start(request.query)
})
// The hotkey can arrive before the overlay has the keyboard.
watch(wm.active, (active) => { if (active && open.value) focusInput(true) })
watch(open, (now) => {
  if (now) focusInput(true)
  else remember(queryOk.value ? selected.value : null)
})

const dataNote = computed(() => {
  const snap = snapshot.value
  if (!snap) return 'No saved prices yet'
  const min = Math.max(0, Math.round((Date.now() - snap.ts) / 60000))
  return `poe.ninja · ${snap.league} · ${min} min ago`
})
</script>

<style module>
.root { display: flex; flex-direction: column; min-height: 0; height: 100%; }
.pins { display: flex; gap: var(--w-s1); padding: var(--w-s2) var(--w-pad); border-bottom: 1px solid var(--w-line); }
.pin {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: flex-start;
  padding: 4px 8px;
  border-radius: var(--w-r-sm);
  border: 1px solid var(--w-line);
  background: var(--w-panel-2);
  text-align: left;
}
.pin:hover { border-color: var(--w-line-strong); }
.pinTop { border-color: var(--w-accent); background: var(--w-accent-soft); }
.find {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--w-s2);
  height: 46px;
  padding: 0 var(--w-pad);
  border-bottom: 1px solid var(--w-line);
  color: var(--w-dim);
}
.input {
  flex: 1;
  min-width: 0;
  background: none;
  border: 0;
  outline: 0;
  color: var(--w-fg);
  font: var(--w-fs-lg) var(--w-body);
}
.input::placeholder { color: var(--w-faint); }
.panes { flex: 1 1 26rem; min-height: 0; display: grid; grid-template-columns: 22rem minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
.list { border-right: 1px solid var(--w-line); padding-bottom: var(--w-s1); }
.head { padding: 8px var(--w-pad) 3px; font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); font-family: var(--w-caps-face); }
.res { display: flex; align-items: center; gap: var(--w-s2); width: 100%; min-height: 40px; padding: 2px var(--w-pad); text-align: left; }
.res:hover { background: var(--w-panel-2); }
.sel, .sel:hover { background: var(--w-accent-soft); box-shadow: inset 2px 0 0 var(--w-accent); }
.resName { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.small { font-size: var(--w-fs-sm); }
.range { flex: none; display: inline-flex; align-items: center; gap: 4px; }
.none { padding: var(--w-s3) var(--w-pad); color: var(--w-dim); }
.detail { padding: var(--w-s3) var(--w-s4); min-width: 0; }
.title { display: flex; align-items: center; gap: var(--w-s2); margin-bottom: var(--w-s2); font-size: var(--w-fs-lg); }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 76px 76px 76px 52px 52px 50px; column-gap: 6px; align-items: center; }
.gridHead { min-height: calc(24px * var(--w-text-scale, 1)); font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); border-bottom: 1px solid var(--w-line); font-family: var(--w-caps-face); }
.row { min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); }
.rowBtns { display: flex; justify-content: flex-end; gap: 2px; }
.acts { display: flex; flex-wrap: wrap; gap: var(--w-s1); margin-top: var(--w-s3); }
.foot { flex: none; display: flex; align-items: center; gap: var(--w-s3); padding: 7px var(--w-pad); border-top: 1px solid var(--w-line); font-size: var(--w-fs-sm); color: var(--w-dim); }
</style>
