<template>
  <Widget :config="config" move-handles="none" :removable="false" :inline-edit="false" :readonly="true">
    <WPanel v-if="open" width="66rem" max-height="72vh" :scroll="false" :min-width="576" :min-height="288">
      <div :class="$style.root" data-search-palette @click="keepTyping" @keydown="onHotkey" @keyup="onHotkeyUp" @pointerdown="forgetHeld" @input="forgetHeld">
        <div v-if="pins.length" :class="$style.pins">
          <button v-for="(p, i) in pins" :key="key(p)" v-item-tip="p" :class="[$style.pin, { [$style.pinTop]: i === 0 && pins.length > 1 }]"
            title="Remove from the comparison" @click="togglePin(p)">
            <span class="w-trunc" :class="rarityClass(p.type)">{{ p.name }}<span v-if="p.variant" class="w-dim ml-1">{{ p.variant }}</span></span>
            <WPrice bulk :chaos="p.chaos" :divine="divine" />
          </button>
        </div>
        <label :class="$style.find">
          <i class="fas fa-search" />
          <input ref="input" v-model="query" :class="$style.input" spellcheck="false" aria-label="Search"
            placeholder="Item, tool or setting. Or paste an item (Ctrl V)" @keydown="onKey" @paste="onPaste">
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': helpOpen }" title="What can I search for?" aria-label="What can I search for?" @click="toggleHelp"><i class="fas fa-question" /></button>
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': groupsOpen }" title="What search shows" aria-label="What search shows" data-search-groups-btn @click="toggleGroups"><i class="fas fa-cog" /></button>
          <WCorruptedFilter v-model="corrupted" />
          <WKbd keys="Esc" />
        </label>
        <div v-if="chips.length && !groupsOpen" :class="$style.chips" data-search-chips>
          <button v-for="c in chips" :key="c.id" type="button" :class="[$style.chip, { [$style.chipOn]: c.id === chip }]" :aria-pressed="c.id === chip"
            :title="c.id === 'all' ? 'Everything, each group folded as the cog says' : `Only ${c.label.toLowerCase()}, every group in full`" @click="pickChip(c.id)">
            {{ c.label }}<span :class="$style.chipN">{{ c.count }}</span>
          </button>
          <span :class="$style.chipKeys"><WKbd keys="Ctrl + Left" /> <WKbd keys="Ctrl + Right" /></span>
        </div>
        <div :class="$style.panes">
          <div v-if="groupsOpen" :class="$style.list" class="w-scroll" data-search-groups>
            <SearchGroups v-model="groupModes" @done="toggleGroups" />
          </div>
          <div v-else ref="listEl" :class="$style.list" class="w-scroll">
            <template v-for="section in sections" :key="section.label">
              <div v-if="!section.more" :class="$style.head">{{ section.label }}<template v-if="section.capped"> · first {{ PRICE_GROUP_LIMIT }}, keep typing</template></div>
              <template v-for="e in section.entries" :key="e.id">
              <button v-if="e.kind === 'more'" tabindex="-1" :class="[section.more ? $style.fold : $style.more, { [$style.sel]: e === selected }]" data-search-more
                :data-selected="e === selected || undefined" :title="e.about" @click="run(e)">
                <span :class="section.more ? $style.foldName : undefined">{{ e.name }}</span><span class="w-dim ml-1">{{ section.more ? `${e.sub} · show` : e.sub }}</span>
              </button>
              <button v-else v-item-tip="tipOf(e)" :data-no-item-tip="e.kind === 'setting' ? 'a setting named after a mechanic or item, not the item itself' : undefined" tabindex="-1" :class="[$style.res, { [$style.sel]: e === selected }]"
                :data-selected="e === selected || undefined" @click="selected = e" @dblclick="run(e)">
                <WIcon v-if="e.kind === 'price'" :src="ninjaIcon(e.group.type, e.group.name) ?? ninjaArt(e.group.type, e.group.name)" size="md" />
                <WIcon v-else-if="e.kind === 'item'" :src="e.info.icon" size="md" />
                <WIcon v-else-if="e.kind === 'lookup' && isImageIcon(e.icon)" :src="e.icon" size="md" />
                <i v-else :class="e.icon" :style="{ width: 'var(--w-icon-md)', textAlign: 'center' }" />
                <span :class="$style.resName">
                  <span class="w-trunc" :class="e.kind === 'price' ? rarityClass(e.group.type) : undefined">{{ e.name }}</span>
                  <span class="w-dim w-trunc" :class="$style.small">{{ e.sub }}</span>
                </span>
                <span v-if="e.kind === 'price'" :class="$style.range"><template v-if="e.group.low !== e.group.high"><WPrice :bulk="e.group.high < 1" :chaos="e.group.low" :divine="divine" /> to </template><WPrice :bulk="e.group.high < 1" :chaos="e.group.high" :divine="divine" /></span>
                <WKbd v-else-if="e.kind === 'command' && e.keys" :keys="e.keys" />
              </button>
              </template>
            </template>
            <div v-if="!entries.length" :class="$style.none">Type an item, a tool or a setting, or ? for ideas. Items you look up show here next time.</div>
          </div>
          <div :class="$style.detail" class="w-scroll">
            <template v-if="selected?.kind === 'price'">
              <div v-item-tip="groupTip(selected.group)" :class="$style.title">
                <WIcon :src="ninjaIcon(selected.group.type, selected.group.name) ?? ninjaArt(selected.group.type, selected.group.name)" size="lg" />
                <span :class="rarityClass(selected.group.type)">{{ selected.group.name }}</span>
                <span class="w-dim" :class="$style.small">{{ kindLabel(selected.group.type, selected.group.name) }}</span>
              </div>
              <div :class="[$style.grid, $style.gridHead, { [$style.gridExtra]: extraRange }]"><span>Variant</span><span class="text-right">Now</span><span v-if="extraRange" class="text-right" :title="extraTitle">{{ extraRange.label }} ago</span><span class="text-right">24h ago</span><span class="text-right">7d ago</span><span v-if="extraRange" class="text-right" :title="extraTitle">{{ extraRange.label }}</span><span class="text-right">24h</span><span class="text-right">7d</span><span /></div>
              <div v-for="v in selected.group.variants" :key="key(v)" v-item-tip="v" :class="[$style.grid, $style.row, { [$style.rowPicked]: shownVariant != null && v.variant === shownVariant, [$style.gridExtra]: extraRange }]">
                <span class="w-trunc">{{ v.variant || selected.group.name }}
                  <i v-if="isThin(v)" class="fas fa-exclamation-circle w-faint" :title="thinTitle(v)" /></span>
                <WPrice bulk :chaos="v.chaos" :divine="divine" class="text-right" />
                <WPrice v-if="extraRange" bulk :chaos="extraThen(v)" :divine="divine" class="text-right w-dim" />
                <WPrice bulk :chaos="v.d1" :divine="divine" class="text-right w-dim" />
                <WPrice bulk :chaos="v.d7" :divine="divine" class="text-right w-dim" />
                <WDelta v-if="extraRange" :value="changeSince(v.chaos, extraThen(v))" class="text-right" />
                <WDelta :value="changeSince(v.chaos, v.d1)" class="text-right" />
                <WDelta :value="changeSince(v.chaos, v.d7)" class="text-right" />
                <span :class="$style.rowBtns">
                  <button class="w-icon-btn" :class="{ 'w-icon-btn--on': isPinned(v) }" title="Pin to compare" aria-label="Pin to compare" @click="togglePin(v)"><i class="fas fa-thumbtack" /></button>
                  <button v-if="tracker" class="w-icon-btn" :class="{ 'w-icon-btn--on': isWatched(v) }" :title="isWatched(v) ? 'Stop watching' : 'Watch price'" :aria-label="isWatched(v) ? 'Stop watching' : 'Watch price'" @click="toggleWatch(v)"><i :class="isWatched(v) ? 'fas fa-star' : 'far fa-star'" /></button>
                </span>
              </div>
              <!-- Rolled uniques drop unidentified: poe.ninja's row stands for that; a click checks real listings. -->
              <div v-if="unidName" :class="[$style.grid, $style.row, { [$style.gridExtra]: extraRange }]" :title="unidTitle">
                <span class="w-trunc">Unidentified on trade</span>
                <span v-if="extraRange" />
                <WPrice v-if="unidQuote" bulk :chaos="unidQuote.chaos" :divine="divine" class="text-right" />
                <span v-else-if="tradePrices.pending(unidName)" class="text-right w-faint">…</span>
                <span v-else class="text-right"><button class="w-icon-btn" title="Search trade for unidentified copies" aria-label="Search trade for unidentified copies" @click="lookUpUnid"><i class="fas fa-search" /></button></span>
              </div>
              <UniqueDetails v-if="details" v-model:variant="pickedVariant" v-model:foul="pickedFoul" v-bind="details" :divine="divine" />
              <BaseUniques v-if="baseUniques" v-bind="baseUniques" :divine="divine" no-price="No poe.ninja price" @pick="pickUnique" />
              <BeastRecipes v-if="beastBox" v-bind="beastBox" :price="beastPrice" :divine="divine" @recipe="openRecipe" @beast="openBeast" @trade="tradeBeast" />
              <CardDrops v-if="cardDropName" :name="cardDropName" />
              <div v-if="conv" :class="$style.convBox" :style="{ '--conv-cols': convCols }">
                <div :class="[$style.conv, $style.gridHead]"><span v-item-tip="{ name: selected.group.name, type: selected.group.type }">{{ selected.group.name }}</span><span v-if="conv.rows[0].chaos != null" class="text-right">Chaos</span><span v-if="conv.rows[0].div != null" class="text-right">Divines</span></div>
                <div v-for="r in conv.rows" :key="r.amount" :class="[$style.conv, $style.row]">
                  <span class="w-num">{{ convNumber(r.amount) }}</span>
                  <span v-if="r.chaos != null" class="w-num text-right">{{ convNumber(r.chaos) }} c</span>
                  <span v-if="r.div != null" class="w-num text-right">{{ convNumber(r.div) }} div</span>
                </div>
                <div v-if="conv.perDivine" class="w-dim" :class="$style.small">1 Divine Orb buys {{ convNumber(conv.perDivine) }}</div>
              </div>
              <ItemActions :name="selected.name" :lookups="!!infoFor(selected)" :can-price="canPriceCheck(selected)" :market="!!tracker"
                @trade="openTrade(selected)" @price="priceCheck(selected, cursorPoint($event))" @wiki="openLookup(selected, 'wiki')" @poedb="openLookup(selected, 'poedb')"
                @stash="findInStash(selected.name)" @copy="copyName(selected.name)" @market="openInMarket(selected.group.name)" />
            </template>
            <template v-else-if="selected?.kind === 'item'">
              <div v-item-tip="{ name: selected.info.refName }" :class="$style.title"><WIcon :src="selected.info.icon" size="lg" /><span>{{ selected.name }}</span></div>
              <p class="w-dim">{{ snapshot ? "poe.ninja has no price for this. Rares, bases, flasks and cluster jewels aren't in the saved prices." : 'No saved prices yet, so this has no price here.' }}</p>
              <BaseUniques v-if="baseUniques" v-bind="baseUniques" :divine="divine" :no-price="snapshot ? 'No poe.ninja price' : 'No price'" @pick="pickUnique" />
              <UniqueDetails v-if="details" v-model:variant="pickedVariant" v-model:foul="pickedFoul" v-bind="details" :divine="divine" />
              <BeastRecipes v-if="beastBox" v-bind="beastBox" :price="beastPrice" :divine="divine" @recipe="openRecipe" @beast="openBeast" @trade="tradeBeast" />
              <CardDrops v-if="cardDropName" :name="cardDropName" />
              <ItemActions :name="selected.name" lookups :can-price="canPriceCheck(selected)" :market="false"
                @trade="openTrade(selected)" @price="priceCheck(selected, cursorPoint($event))" @wiki="openLookup(selected, 'wiki')" @poedb="openLookup(selected, 'poedb')"
                @stash="findInStash(selected.name)" @copy="copyName(selected.name)" />
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
          <span><WKbd keys="Enter" /> {{ itemEntry() ? 'trade site' : 'open' }}</span>
          <span v-if="itemEntry()"><WKbd keys="Ctrl + F" /> find in stash</span>
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
import { ITEM_BY_REF, ITEMS_ITERATOR, STAT_BY_REF_V2, STATS_ITERATOR } from '@/assets/data'
import { notableOils, oilNames } from '@/web/price-check/filters/pseudo/anointments'
import { getTradeEndpoint } from '@/web/price-check/trade/common'
import type { BaseType } from '@/assets/data/interfaces'
import { createVirtualItem, ItemRarity } from '@/parser/ParsedItem'
import { WPanel, WButton, WPrice, WDelta, WIcon, WKbd, itemRefFromName, ninjaIcon, nowMinute, toast, vItemTip } from '../ui'
import { ninjaArt } from '../market/ninja-icons'
import WCorruptedFilter from '../ui/WCorruptedFilter.vue'
import { copyText } from '../ui/copy'
import { convNumber, currencyConversions } from './conversions'
import { MODULES, isModuleOn, isWidgetTypeOn } from '../modules'
import { pressedKeys, sortKeys, isHotkeyTail, isModifierCode } from '../loot-filter/hotkey-match'
import { whenIdle } from '../shared/perf'
import { nudgeUiSize, uiSize } from '../ui/ui-size'
import { PAGES } from '../settings/pages'
import { settingsHits } from './settings-index'
import { runUpdateCheck } from '../settings/update-check'
import { ICON_TOOL_NAMES, iconFor, parseWidgetTitle } from '../tab-bar/tools'
import { pastedItemText } from './pasted-item'
import { holdPricesForSearch, useSearchSnapshot } from '../market/price-index'
import { MARKET_TRACKER_TYPE, marketSearchRequest } from '../market/widget'
import type { MarketTrackerWidget } from '../market/widget'
import { isThin, itemKey, thinTitle } from '../market/types'
import { rangeInfo } from '../market/ranges'
import { savedPriceSeries } from '../market/db'
import type { CorruptedFilter, PriceItem } from '../market/types'
import { pickRow } from '../shared/price-row'
import { usePriceText } from '../shared/price'
import { lookupRequest } from '../item-lookup/lookup'
import { tradeSearch, virtualUnique } from '../ui/tooltip/item-menu-logic'
import { priceCheckTradeStatus } from '../shared/trade-status'
import { canPriceCheck as canCheckByName, cursorPoint, openPriceCheck } from '../ui/tooltip/item-price-check'
import type { ScreenPoint } from '../ui/tooltip/item-price-check'
import ItemActions from './ItemActions.vue'
import type { LookupTab } from '../item-lookup/lookup'
import { LOOT_FILTER_TYPE, reloadHotkeyTarget, strictnessHotkeyTarget } from '../loot-filter/widget'
import { rollHotkeyTarget, scanHotkeyTarget } from '../map-mods/scan'
import { MAP_MODS_TYPE } from '../map-mods/widget'
import { ESSENCE_SCAN_TYPE, essenceHotkeyTarget, essenceOnceTarget } from '../essence-scan/widget'
import { RUN_TIMER_TYPE, hotkeyTarget as timerTarget } from '../campaign/run-timer'
import { isFoulborn } from '../shared/item-identity'
import { CHIPS, GROUP_CAP, chipOf, groupMode, shapeSections } from './groups'
import type { ChipId, GroupMode } from './groups'
import SearchGroups from './SearchGroups.vue'
import { PRICE_GROUP_LIMIT, arrangeSections, baseUniqueName, bestName, changeSince, groupKey, groupTip, rarityClass, searchNamed, searchPrices, tradeUrl, typeLabel, uniquePrices } from './search'
import { basesOfUnique, hasUniques, uniquesOnBase } from '../shared/uniques-on-base'
import type { PriceGroup } from './search'
import LookupDetail from './LookupDetail.vue'
import BaseUniques from './BaseUniques.vue'
import BeastRecipes from './BeastRecipes.vue'
import CardDrops from '../card-drops/CardDrops.vue'
import { loadCardDrops } from '../card-drops/card-drops'
import type { CardDropData } from '../card-drops/card-drops'
import { beastKindLabel } from '../mechanics/beast-kinds'
import UniqueDetails from './UniqueDetails.vue'
import { uniqueDetails, uniqueFacts } from './unique-details'
import { isImageIcon } from './lookups/types'
import type { Lookup, LookupAction, LookupCard, LookupContext } from './lookups/types'
import { countdownLookup, currencyLookup, currencyNamer, webLookup } from './lookups/answers'
import { calcLookup } from './lookups/calc'
import { bossLookup, dropLookupWith } from './lookups/bosses'
import { nightmareLookup } from './lookups/nightmare'
import { BOSS_RUNS_TYPE } from '../boss-runs/widget'
import type { BossRunsWidget } from '../boss-runs/widget'
import { cardLookup } from './lookups/cards'
import { mapCardsLookup } from './lookups/card-drops'
import { recipeLookup } from './lookups/recipes'
import { craftLookup } from './lookups/craft'
import type { CraftData } from './lookups/craft'
import { bestiaryData, loadBestiary } from './lookups/bestiary-load'
import { BLOOD_ALTAR, bestiaryLookup, denOf, recipeTitle, recipesMaking, recipesWith } from './lookups/bestiary'
import type { BeastRecipe } from './lookups/bestiary'
import { gemLookup, transfiguredBase } from './lookups/gems'
import { vaalGemLookup } from './lookups/vaal-gem'
import { keystoneUniques, passiveList, treeLookup, withOils } from './lookups/tree'
import { megaloLookup } from './lookups/megalo'
import { ringAnointLookup, ringAnoints } from './lookups/rings'
import type { RingAnoint } from './lookups/rings'
import type { Passive } from './lookups/tree'
import { betrayalLookup } from './lookups/betrayal'
import { rewardCounts, zoneFacts, zoneLookup } from './lookups/zones'
import type { Zone } from './lookups/zones'
import { pantheonLookup } from './lookups/pantheon'
import type { PantheonData } from './lookups/pantheon'
import { savedItems, savedLookup } from './lookups/saved'
import { savedOpenRequest } from '../shared/saved-open'
import { REGEX_LIBRARY_TYPE } from '../regex-library/widget'
import type { RegexLibraryWidget } from '../regex-library/widget'
import { TRADE_SEARCHES_TYPE } from '../trade-searches/widget'
import type { TradeSearchesWidget } from '../trade-searches/widget'
import { POB_BUILDS_TYPE, lastBuildList, pobApi } from '../pob-builds/widget'
import type { PobBuildsWidget } from '../pob-builds/widget'
import { ATLAS_TYPE } from '../atlas/strategies'
import type { AtlasWidget } from '../atlas/strategies'
import { netWorthLookup } from './lookups/net-worth'
import { runsLookup } from './lookups/runs'
import { rateTime } from '../shared/rate-time-now'
import { isRunBoard, isRunGlance, runBoardKey, runGlanceKey } from '../net-worth/runs'
import type { RunBoard, RunGlance } from '../net-worth/runs'
import { salesLookup } from './lookups/sales'
import { listedLookup } from './lookups/listed'
import { isPendingDoc, pendingKey } from '../net-worth/pending'
import { cheapestKey, isCheapestDoc } from '../net-worth/cheapest'
import type { CheapestDoc } from '../net-worth/cheapest'
import type { PendingDoc } from '../net-worth/pending'
import type { Sale } from '../net-worth/sales'
import { mapsLookup, sessionStoryLookup } from './lookups/session-story'
import { useNights } from '../session-story/store'
import { SESSION_STORY_TYPE } from '../session-story/widget'
import { hostRequest } from '../shared/host'
import { NET_WORTH_TYPE } from '../net-worth/widget'
import { DOCS as NET_WORTH_DOCS, glanceKey, isGlance } from '../net-worth/glance'
import type { Glance } from '../net-worth/glance'
import { visceraLookup } from './lookups/viscera'
import { flipsLookup } from './lookups/flips'
import { SCARAB_FLIP_TYPE } from '../scarab-flip/widget'
import type { ScarabFlipWidget } from '../scarab-flip/widget'
import { vaultLookup } from './lookups/vaults'
import { loadVaults } from '../vaults/vaults'
import type { VaultTable } from '../vaults/vaults'
import { loadViscera, visceraByName, visceraItemText } from '../wickerman/viscera'
import type { VisceraTable } from '../wickerman/viscera'
import { HELP_QUERY, exampleCards } from './lookups/examples'
import { MECHANICS_TYPE } from '../mechanics/widget'
import type { MechanicsWidget } from '../mechanics/widget'
import { loadPassiveTree, passiveTreeClusters } from '../pob-builds/passive-tree'
import type { GemTable } from './lookups/gems'
import type { CardInfo } from './lookups/cards'
import { loadTipBases, loadTipDrops, loadTipItems, loadTipUniques, loadTipVestigial } from '../ui/tooltip/item-tip'
import { onSharedDataChange } from '../app/live-data'
import { openDiscord, openReportDialog } from '../app/report'
import { dropOf } from '../ui/tooltip/tip-content'
import type { TipItem, TipPack } from '../ui/tooltip/tip-content'
import { SEARCH_TARGET, searchRequest } from './widget'
import { VARIABLE_ITEMS, useTradePrices } from '../shared/unid-prices'
import { poeWebApi } from '@/web/Config'
import type { SearchWidget } from './widget'

const props = defineProps<{ config: SearchWidget }>()
const wm = inject<WidgetManager>('wm')!
const { t } = useI18n()
const leagues = useLeagues()
const tradePrices = useTradePrices()
const snapshot = useSearchSnapshot()

interface Base { id: string, name: string, sub: string }
interface PriceEntry extends Base { kind: 'price', group: PriceGroup }
interface ItemEntry extends Base { kind: 'item', info: BaseType }
interface ActionEntry extends Base { kind: 'tool' | 'command' | 'setting' | 'more', icon: string, about: string, verb: string, keys?: string | null, aliases?: string[], action: () => void }
interface LookupEntry extends Base { kind: 'lookup', icon: string, card: LookupCard }
type Entry = PriceEntry | ItemEntry | ActionEntry | LookupEntry

const query = shallowRef('')
const corrupted = shallowRef<CorruptedFilter>('any')
const input = shallowRef<HTMLInputElement | null>(null)
const listEl = shallowRef<HTMLElement | null>(null)
const pinKeys = shallowRef<string[]>([])

// The tooltip's divine rate, else the saved prices'.
const { divine } = usePriceText(snapshot)
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
let uniqueBases: BaseType[] = []
function gameItems (): BaseType[] {
  if (!allItems) {
    const byName = new Map<string, BaseType>()
    for (const item of ITEMS_ITERATOR('"namespace":"')) {
      if (NAMESPACES.has(item.namespace) && !byName.has(item.name)) byName.set(item.name, item)
    }
    // The data isn't loaded yet: try again on the next search.
    if (!byName.size) return []
    allItems = [...byName.values()]
    uniqueBases = allItems.filter(i => i.namespace === 'ITEM' && hasUniques(i.refName))
  }
  return allItems
}

// poe.ninja's names and refName are English, as the tooltip's data is.
function tipOf (entry: Entry) {
  if (entry.kind === 'price') return groupTip(entry.group)
  if (entry.kind === 'item') return { name: entry.info.refName }
  // A card about an item (a Viscera, a gem, a div card) shows that item.
  if (entry.kind === 'lookup') return entry.card.tip ?? itemRefFromName(entry.card.title ?? entry.card.name)
  return null
}

function priceEntry (group: PriceGroup): PriceEntry {
  return {
    kind: 'price',
    id: `p:${groupKey(group)}`,
    name: group.name,
    sub: group.variants.length > 1 ? `${group.variants.length} prices` : (group.variants[0].variant || kindLabel(group.type, group.name)),
    group
  }
}
// A unique found through its base says which base: one of `shown` if it's on
// several, in the game's language.
function onBaseEntry (group: PriceGroup, shown?: ReadonlySet<string>): PriceEntry {
  const entry = priceEntry(group)
  const bases = basesOfUnique(baseUniqueName(group.name))
  const ref = bases.find(b => shown?.has(b)) ?? bases[0]
  if (ref) {
    const base = ITEM_BY_REF('ITEM', ref)?.[0]?.name ?? ref
    entry.sub = group.variants.length > 1 ? `${base} · ${group.variants.length} prices` : base
  }
  return entry
}

// ---- a base's uniques ----
// Only a query naming a few bases: "shagreen" is three, "boots" is dozens.
const BASE_MATCH_MAX = 3
function basesWithUniques (q: string): BaseType[] {
  gameItems()
  const bases = searchNamed(uniqueBases, q, i => i.name, BASE_MATCH_MAX + 1)
  return bases.length > BASE_MATCH_MAX ? [] : bases
}
// A unique picked in a base's pane: its own row if the list has one, and it
// stays picked while the list refreshes, until the query changes.
let pickedId: string | null = null
function pickUnique (entry: { id: string }) {
  const own = entries.value.find(e => e.id === entry.id)
  if (own) selected.value = own
  else if ((entry as Entry).kind === 'price') {
    pickedId = entry.id
    selected.value = entry as PriceEntry
  }
  focusInput()
}
watch(query, () => { pickedId = null })

// ---- tools, commands, settings ----
// Old names of tools folded into another: searching one finds the tool now.
const TOOL_ALIASES: Record<string, string[]> = {
  [MAP_MODS_TYPE]: ['Map scan', 'Map check', 'Map planner']
}
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
        aliases: TOOL_ALIASES[w.wmType],
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
    } else if (w.wmType === MAP_MODS_TYPE && w.wmId === wm.widgets.value.find(_ => _.wmType === MAP_MODS_TYPE)?.wmId) {
      // Map scan runs in the first Map mods window only.
      add(w, 'Map scan on or off', 'scanHotkey', scanHotkeyTarget(w.wmId))
      add(w, 'Map scan: rolling mode on or off', 'scanRollHotkey', rollHotkeyTarget(w.wmId))
    } else if (w.wmType === ESSENCE_SCAN_TYPE) {
      add(w, 'Essence scan on or off', 'hotkey', essenceHotkeyTarget(w.wmId))
      add(w, 'Read every essence once', 'onceHotkey', essenceOnceTarget(w.wmId))
    } else if (w.wmType === RUN_TIMER_TYPE) {
      add(w, 'Pause or resume the run timer', 'hotkeyPause', timerTarget(w.wmId, 'pause'))
    }
  }
  // Check for updates: the Install & updates page shows the answer on its row.
  out.push({
    kind: 'command',
    id: 'c:check-updates',
    name: 'Check for updates',
    sub: `Version ${Host.version.value}`,
    icon: 'fas fa-download',
    about: 'Asks for a new version now and opens Settings > Install & updates with the answer.',
    verb: 'Check now',
    action: () => {
      runUpdateCheck().catch(() => {})
      const settings = wm.widgets.value.find(w => w.wmType === 'settings')
      if (!settings) return
      wm.setFlag(settings.wmId, 'settings::page=install', true)
      wm.setFlag(settings.wmId, 'settings::find=Check for updates', true)
      wm.show(settings.wmId)
    }
  })
  // UI size, one step at a time. The palette stays open: it grows with the
  // rest, so the next step is one Enter away.
  for (const [dir, steps] of [['bigger', 1], ['smaller', -1]] as const) {
    out.push({
      kind: 'command',
      id: `c:ui-size-${dir}`,
      name: `Make everything ${dir} (UI size)`,
      sub: `UI size ${uiSize.value}%`,
      icon: dir === 'bigger' ? 'fas fa-search-plus' : 'fas fa-search-minus',
      about: `UI size one step ${dir}: panels, the price check, pinned things, menus and tooltips. Fine-tune in Settings > Look & icon row.`,
      verb: 'Do it',
      action: () => {
        nudgeUiSize(steps)
        toast(`UI size ${uiSize.value}%`, { ms: 1800 })
      }
    })
  }
  // The palette steps aside; the overlay stays open for the form.
  out.push({
    kind: 'command',
    id: 'c:report-issue',
    name: 'Report an issue',
    sub: 'Bug or idea, on GitHub',
    icon: 'fas fa-bug',
    aliases: ['report', 'bug', 'issue', 'feedback', 'github', 'idea'],
    about: 'Write up a bug or an idea. Opens a pre-filled GitHub issue in your browser; nothing is sent by itself.',
    verb: 'Open',
    action: () => {
      wm.hide(props.config.wmId)
      openReportDialog()
    }
  })
  out.push({
    kind: 'command',
    id: 'c:discord',
    name: 'Join the Discord',
    sub: 'Questions and ideas, with other players',
    icon: 'fab fa-discord',
    aliases: ['discord', 'community', 'chat', 'help', 'support', 'server'],
    about: 'The Woke PoE Trade Discord server. Opens the invite in your browser.',
    verb: 'Open',
    action: () => {
      wm.hide(props.config.wmId)
      openDiscord()
    }
  })
  return out
}

function settingEntries (q: string): ActionEntry[] {
  return settingsHits(PAGES, q).map(hit => ({
    kind: 'setting' as const,
    id: hit.id,
    name: hit.name,
    sub: hit.sub,
    icon: hit.label ? 'fas fa-sliders' : 'fas fa-cog',
    about: hit.label
      ? `${hit.label}, on the ${hit.page!.name} page in Settings.`
      : hit.page ? `The ${hit.page.name} page in Settings. ${hit.page.description}` : 'The settings window, where you left it.',
    verb: hit.label ? 'Go to the setting' : 'Open settings',
    action: () => {
      const settings = wm.widgets.value.find(w => w.wmType === 'settings')
      if (!settings) return
      if (hit.page) wm.setFlag(settings.wmId, `settings::page=${hit.page.id}`, true)
      if (hit.label) wm.setFlag(settings.wmId, `settings::find=${hit.label}`, true)
      wm.show(settings.wmId)
    }
  }))
}

// ---- lookups: answers, facts and the web ----
const lookupContext = computed<LookupContext>(() => {
  // Each name's rows: an exact variant, else the row every window takes
  // (shared/price-row pickRow: plain, a currency's first, else the cheapest).
  const rows = new Map<string, PriceItem[]>()
  for (const i of snapshot.value?.items ?? []) {
    const list = rows.get(i.name)
    if (list) list.push(i)
    else rows.set(i.name, [i])
  }
  const league = leagues.selectedId.value
  return {
    price: (name, variant) => name === 'Chaos Orb'
      ? 1
      : variant != null
        ? rows.get(name)?.find(i => i.variant === variant)?.chaos ?? null
        : pickRow(rows.get(name) ?? [])?.chaos ?? null,
    tools: new Set<string>(),
    items: snapshot.value?.items ?? [],
    divine: divine.value,
    now: Date.now(),
    league: league ? { name: league, startedAt: leagues.startedAt.value } : null,
    unid: (name: string) => league ? tradePrices.get(league, name)?.chaos ?? null : null
  }
})
const currencyNames = computed(() => [...new Set((snapshot.value?.items ?? []).filter(i => i.type === 'Currency').map(i => i.name))])
// Card rewards and stack sizes load with the tooltips, once the palette opens.
const tipItems = shallowRef<Record<string, TipItem> | null>(null)
function loadCards () {
  if (!tipItems.value) loadTipItems().then(items => { if (items) tipItems.value = items })
}
const cards = computed(() => {
  const out = new Map<string, CardInfo>()
  const items = tipItems.value
  if (!items) return out
  for (const i of snapshot.value?.items ?? []) {
    const tip = i.type === 'DivinationCard' ? items[i.name] : undefined
    if (tip?.n && tip.d && !out.has(i.name)) out.set(i.name, { stack: tip.n, lines: tip.d.split('\n') })
  }
  return out
})
// Where cards drop (Divcord), fetched on first open: a map name lists its cards.
const cardDrops = shallowRef<CardDropData | null>(null)
function loadDrops () {
  if (!cardDrops.value) loadCardDrops().then(d => { if (d) cardDrops.value = d }).catch(() => {})
}
// The div card the detail shows, for where it drops.
const cardDropName = computed(() => {
  const e = selected.value
  if (e?.kind === 'price') return e.group.type === 'DivinationCard' ? e.group.name : null
  if (e?.kind === 'item') return e.info.namespace === 'DIVINATION_CARD' ? e.info.refName : null
  return null
})
// Campaign gem sources, from the PoB tool's data, loaded on first open.
const gemTable = shallowRef<GemTable | null>(null)
const gemNames = shallowRef<string[]>([])
function loadGems () {
  if (gemTable.value) return
  import('../pob-builds/gem-sources.json').then(m => {
    const table = m.default as unknown as GemTable
    const gems = gameItems().filter(i => i.namespace === 'GEM')
    // The item list isn't loaded yet: try again shortly while it's open.
    if (!gems.length) {
      if (open.value) setTimeout(loadGems, 2000)
      return
    }
    // Only gems in the game: the table also holds removed and test gems.
    gemNames.value = gems.filter(i => table[i.refName] || (i.gem?.transfigured && transfiguredBase(i.refName, table))).map(i => i.refName)
    gemTable.value = table
  }).catch(() => {})
}
// Crafting bench and Harvest crafts, from poedb, fetched on first open: a
// data file, not a JS chunk.
const craftData = shallowRef<CraftData | null>(null)
let craftLoading = false
function loadCrafts () {
  if (craftData.value || craftLoading) return
  craftLoading = true
  fetch(`${import.meta.env.BASE_URL}data/craft-data.json`)
    .then(r => r.json())
    .then(d => { craftData.value = d as CraftData })
    .catch(() => {})
    .finally(() => { craftLoading = false })
}
// What map mods give (map-mods/bonuses.ts, from poedb): the data file and the
// lookup, both fetched on first open.
// The lookup is built from the live data, so a newer download shows up.
const mapBonusMods = shallowRef<{ lookup: typeof import('./lookups/map-bonus'), bonuses: typeof import('../map-mods/bonuses') } | null>(null)
const noLookup: Lookup = () => []
let mapBonusLoading = false
function loadMapBonusLookup () {
  if (mapBonusMods.value || mapBonusLoading) return
  mapBonusLoading = true
  Promise.all([import('./lookups/map-bonus'), import('../map-mods/bonuses')])
    .then(async ([lookup, bonuses]) => {
      // A failed read is tried again on the next open.
      if (await bonuses.loadMapBonuses()) mapBonusMods.value = { lookup, bonuses }
    })
    .catch(() => {})
    .finally(() => { mapBonusLoading = false })
}
const mapBonusLookupFn = computed<Lookup>(() => {
  const mods = mapBonusMods.value
  const data = mods?.bonuses.mapBonusData.value
  return mods && data ? mods.lookup.mapBonusLookup(data) : noLookup
})
// Blood Altar recipes, from poedb, fetched on first open like the crafts (bestiary-load.ts).
// 3.30 Wickerman module: Viscera facts, a data file read on open while it's on.
const visceraTable = shallowRef<VisceraTable | null>(null)
function loadVisceraTable () {
  if (visceraTable.value || !isModuleOn(AppConfig(), 'wickerman')) return
  loadViscera().then(t => { visceraTable.value = t }).catch(() => {})
}
// Templar Vaults: rewards from a data file, read on open.
const vaultTable = shallowRef<VaultTable | null>(null)
function loadVaultTable () {
  if (vaultTable.value) return
  loadVaults().then(t => { vaultTable.value = t }).catch(() => {})
}
// Net worth's per hour numbers: its small saved glance, read on open while it's on.
const netWorthGlance = shallowRef<Glance | null>(null)
const runGlance = shallowRef<RunGlance | null>(null)
const runBoard = shallowRef<RunBoard | null>(null)
function loadNetWorthGlance () {
  const league = AppConfig().leagueId
  if (!league || !isWidgetTypeOn(AppConfig(), NET_WORTH_TYPE)) { netWorthGlance.value = null; runGlance.value = null; runBoard.value = null; return }
  hostRequest('doc-get', { collection: NET_WORTH_DOCS, key: runBoardKey(league) })
    .then((b) => { runBoard.value = isRunBoard(b) && b.league === league ? b : null })
    .catch(() => {})
  hostRequest('doc-get', { collection: NET_WORTH_DOCS, key: runGlanceKey(league) })
    .then((g) => { runGlance.value = isRunGlance(g) && g.league === league ? g : null })
    .catch(() => {})
  hostRequest('doc-get', { collection: NET_WORTH_DOCS, key: glanceKey(league) })
    .then((g) => { netWorthGlance.value = isGlance(g) && g.league === league ? g : null })
    .catch(() => {})
}
// Your sales (Net worth's trade history): the file main keeps, read on open
// while Net worth is on. The stash reader off: no answer, no card.
const salesList = shallowRef<Sale[] | null>(null)
// Your Faustus listings as Net worth last read them (Sales › Listed).
const listedDoc = shallowRef<PendingDoc | null>(null)
// Its Still cheapest? checks.
const cheapestChecks = shallowRef<CheapestDoc | null>(null)
function loadSales () {
  const league = AppConfig().leagueId
  if (!league || !isWidgetTypeOn(AppConfig(), NET_WORTH_TYPE)) { salesList.value = null; listedDoc.value = null; cheapestChecks.value = null; return }
  hostRequest('doc-get', { collection: NET_WORTH_DOCS, key: cheapestKey(league) })
    .then((d) => { cheapestChecks.value = isCheapestDoc(d) && d.league === league ? d : null })
    .catch(() => { cheapestChecks.value = null })
  hostRequest('doc-get', { collection: NET_WORTH_DOCS, key: pendingKey(league) })
    .then((d) => { listedDoc.value = isPendingDoc(d) && d.league === league ? d : null })
    .catch(() => { listedDoc.value = null })
  hostRequest('trade-history', { league, read: 'none' })
    .then((r) => {
      const list = r && typeof r === 'object' ? (r as { league?: unknown, sales?: unknown }) : null
      salesList.value = list?.league === league && Array.isArray(list.sales) ? list.sales as Sale[] : null
    })
    .catch(() => { salesList.value = null })
}
// Session story's nights: its store, shared with the dock icon. Loaded on
// open while it's on (the window loads it too).
const nights = useNights()
function loadNights () {
  if (!isWidgetTypeOn(AppConfig(), SESSION_STORY_TYPE)) return
  nights.load().catch(() => {})
  nights.loadMaps().catch(() => {})
}
// Keystones and notables with what they do, from the PoB tool's tree.
const passives = shallowRef<Passive[] | null>(null)
const keystoneGrants = shallowRef<ReadonlyMap<string, string[]>>(new Map())
let treeLoads = 0
function loadTree () {
  if (passives.value) return
  // A read started before a data update is dropped.
  const mine = ++treeLoads
  Promise.all([loadPassiveTree(), loadTipUniques().catch(() => null)]).then(([nodes, uniques]) => {
    if (mine !== treeLoads) return
    const list = passiveList(nodes.values(), passiveTreeClusters()?.named ?? null)
    keystoneGrants.value = uniques ? keystoneUniques(uniques, list.filter(p => p.kind === 'Keystone').map(p => p.name)) : new Map()
    passives.value = withOils(list, name => notableOils(name, STAT_BY_REF_V2))
  }).catch(() => {})
}
// Blight ring anoints, from the stat data. Read again when the data's
// language changes.
let ringAnointsFrom: typeof STATS_ITERATOR | null = null
let ringAnointCache: RingAnoint[] = []
function ringAnointList (): RingAnoint[] {
  if (ringAnointsFrom !== STATS_ITERATOR) {
    ringAnointsFrom = STATS_ITERATOR
    ringAnointCache = ringAnoints(STATS_ITERATOR('"anointments"'), oilNames)
  }
  return ringAnointCache
}
// Campaign zones, from the Campaign tool's levelling route, read on first open.
const zones = shallowRef<Zone[] | null>(null)
function loadZones () {
  if (zones.value) return
  import('../campaign/route-data').then(m => { zones.value = zoneFacts(m.routeSources, m.routeData) }).catch(() => {})
}
const gemRewards = computed(() => rewardCounts(gemTable.value))
// Pantheon gods and souls, a data file fetched on first open like the crafts.
const pantheonData = shallowRef<PantheonData | null>(null)
let pantheonLoading = false
function loadPantheon () {
  if (pantheonData.value || pantheonLoading) return
  pantheonLoading = true
  fetch(`${import.meta.env.BASE_URL}data/pantheon-data.json`)
    .then(r => r.json())
    .then(d => { pantheonData.value = d as PantheonData })
    .catch(() => {})
    .finally(() => { pantheonLoading = false })
}
// Your saved items, from the tools that are on. PoB builds are files: the
// list the PoB window last read, or read here at most every 5 minutes.
function toolOn<T> (type: string): T | undefined {
  return wm.widgets.value.find(w => w.wmType === type && isWidgetTypeOn(AppConfig(), w.wmType)) as T | undefined
}
const BUILD_LIST_MAX_AGE = 5 * 60_000
let buildsLoading = false
function loadBuildList () {
  const w = toolOn<PobBuildsWidget>(POB_BUILDS_TYPE)
  const last = lastBuildList.value
  if (!w || buildsLoading || (last && Date.now() - last.at < BUILD_LIST_MAX_AGE)) return
  buildsLoading = true
  const asked = Date.now()
  pobApi.list(w)
    // The PoB window may have read a newer list meanwhile.
    .then(res => { if ((lastBuildList.value?.at ?? 0) < asked) lastBuildList.value = { at: Date.now(), builds: res.builds } })
    .catch(() => {})
    .finally(() => { buildsLoading = false })
}
const saved = computed(() => savedItems({
  regex: toolOn<RegexLibraryWidget>(REGEX_LIBRARY_TYPE)?.entries,
  trade: toolOn<TradeSearchesWidget>(TRADE_SEARCHES_TYPE)?.entries,
  builds: toolOn<PobBuildsWidget>(POB_BUILDS_TYPE) ? lastBuildList.value?.builds : undefined,
  atlas: toolOn<AtlasWidget>(ATLAS_TYPE)?.strategies
}))
// Betrayal slots you edited in League mechanics.
function betrayalOverrides (): Record<string, string> {
  const w = wm.widgets.value.find(w => w.wmType === MECHANICS_TYPE) as MechanicsWidget | undefined
  return w?.betrayalOverrides ?? {}
}
// New tooltip files after a data update: read them on the next open.
const stopDataWatch = onSharedDataChange(() => {
  detailPack.value = null
  detailGen++
  detailLoading = false
  if (detailName.value) loadDetailPack()
  tipItems.value = null
  passives.value = null
  visceraTable.value = null
  vaultTable.value = null
  treeLoads++
})
onBeforeUnmount(stopDataWatch)
const knownItem = (ns: string, name: string) => !!ITEM_BY_REF(ns as BaseType['namespace'], name)?.length
// Boss runs' settings for the Nightmare cards; null with the module off.
const bossPrefs = computed(() => isModuleOn(AppConfig(), 'boss-runs') ? (toolOn<BossRunsWidget>(BOSS_RUNS_TYPE) ?? {} as BossRunsWidget) : null)
// The calculator takes only whole currency words: "50d / 7", never "50 har".
const exactCurrency = computed(() => { const n = currencyNamer(currencyNames.value); return (word: string) => n(word, true) })
// The Flips panel's settings, while it's switched on.
function flipsConfig (): ScarabFlipWidget | null {
  const config = AppConfig()
  if (!isWidgetTypeOn(config, SCARAB_FLIP_TYPE)) return null
  return (config.widgets.find(w => w.wmType === SCARAB_FLIP_TYPE) as ScarabFlipWidget | undefined) ?? null
}
const netWorthWidget = () => AppConfig().widgets.find(w => w.wmType === NET_WORTH_TYPE) as { staleDays?: number, countListed?: boolean } | undefined
const lookups = computed(() => [calcLookup(exactCurrency.value), currencyLookup(currencyNames.value), countdownLookup, bossLookup, nightmareLookup(bossPrefs.value, vaultTable.value), vaultLookup(vaultTable.value), dropLookupWith(bossPrefs.value), cardLookup(cards.value, knownItem), mapCardsLookup(cardDrops.value), recipeLookup, flipsLookup(flipsConfig()), craftLookup(craftData.value), mapBonusLookupFn.value, bestiaryLookup(bestiaryData.value), gemLookup(gemTable.value, gemNames.value), vaalGemLookup, treeLookup(passives.value, keystoneGrants.value), (q: string, c: LookupContext) => ringAnointLookup(ringAnointList())(q, c), megaloLookup, pantheonLookup(pantheonData.value, zones.value ?? []), zoneLookup(zones.value, gemRewards.value), savedLookup(saved.value), betrayalLookup(betrayalOverrides), visceraLookup(isModuleOn(AppConfig(), 'wickerman') ? visceraTable.value : null), netWorthLookup(netWorthGlance.value), runsLookup(runGlance.value, rateTime(), runBoard.value), salesLookup(salesList.value), listedLookup(listedDoc.value, salesList.value, netWorthWidget()?.staleDays, netWorthWidget()?.countListed !== false, cheapestChecks.value), sessionStoryLookup(isWidgetTypeOn(AppConfig(), SESSION_STORY_TYPE) ? nights.live.value : null, isWidgetTypeOn(AppConfig(), SESSION_STORY_TYPE) ? nights.nights.value[0] ?? null : null, rateTime()), mapsLookup(isWidgetTypeOn(AppConfig(), SESSION_STORY_TYPE) ? nights.maps.value : []), webLookup])

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
  } else if ('open' in action) {
    // The tool shows it; the palette steps aside. No window of that tool yet
    // (never placed): say so and stay open.
    if (!wm.widgets.value.some(w => w.wmType === action.open.tool)) {
      toast('Place that window from the dock first.', { ms: 2500 })
      return
    }
    savedOpenRequest.value = { ...action.open, at: Date.now() }
    wm.hide(props.config.wmId)
  } else if ('trade' in action) tradeBeast(action.trade)
  else if ('copy' in action) copyText(action.copy).then(ok => { if (ok) toast(`Copied ${action.copy}`, { ms: 1800 }) })
  else {
    showAnswer = true
    query.value = action.search
    focusInput()
  }
}

// ---- "?": things to try ----
const helpOpen = computed(() => query.value.trim() === HELP_QUERY)
function toggleHelp () {
  query.value = helpOpen.value ? '' : HELP_QUERY
  focusInput()
}

// An example's real answer: "1 mirror in div" shows today's divines.
function liveAnswer (q: string): string | null {
  return lookupCards(q).find(c => c.group === 'Answer')?.name ?? null
}

// ---- results ----
const rawSections = computed<Array<{ label: string, entries: Entry[], capped?: boolean }>>(() => {
  if (!open.value) return []
  if (helpOpen.value) return cardSections(exampleCards(liveAnswer), null)
  const items = snapshot.value?.items ?? []
  // Nothing typed yet: your recent lookups, then things to try.
  if (!queryOk.value) {
    const recent = recentGroups(items)
    return [...(recent.length ? [{ label: 'Recent', entries: recent.map(priceEntry) as Entry[] }] : []), ...cardSections(exampleCards(liveAnswer), null)]
  }
  const q = query.value
  const groups = searchPrices(items, q, { corrupted: corrupted.value })
  const priced = pricedNames.value
  const other = searchNamed(gameItems().filter(i => !priced.has(i.refName)), q, i => i.name, 8)
    .map((info): ItemEntry => ({ kind: 'item', id: `i:${info.namespace}:${info.name}`, name: info.name, sub: snapshot.value ? 'No poe.ninja price' : 'No price', info }))
  // A base brings its uniques: "shagreen" lists Three-step Assault.
  const bases = basesWithUniques(q)
  const listed = new Set(groups.map(groupKey))
  const onBase = uniquePrices(items, new Set(bases.flatMap(b => uniquesOnBase(b.refName))), { corrupted: corrupted.value })
    .filter(g => !listed.has(groupKey(g)))
  const shownBases = new Set(bases.map(b => b.refName))
  const cards = lookupCards(q)
  const commands = searchNamed(commandEntries(), q, e => bestName([e.name, ...(e.aliases ?? [])], q))
  // A command and a setting row of the same name ("Check for updates"): the command does more.
  const commandNames = new Set(commands.map(c => c.name.toLowerCase()))
  return arrangeSections<Entry>(q, {
    answer: cardSections(cards, ['Answer']),
    items: [
      { label: 'Prices', entries: groups.map(priceEntry) as Entry[], capped: groups.length >= PRICE_GROUP_LIMIT },
      { label: bases.length === 1 ? `Uniques on ${bases[0].name}` : 'Uniques on these bases', entries: onBase.map(g => onBaseEntry(g, shownBases)) as Entry[] },
      { label: 'Other items', entries: other as Entry[] }
    ],
    cards: cardSections(cards, null, ['Answer', 'Search the web']),
    tools: searchNamed(toolEntries(), q, e => bestName([e.name, ...(e.aliases ?? [])], q)),
    rest: [
      { label: 'Do it now', entries: commands as Entry[] },
      { label: 'Settings', entries: settingEntries(q).filter(e => !commandNames.has(e.name.toLowerCase())) as Entry[] }
    ],
    web: cardSections(cards, ['Search the web'])
  })
})
// What each group shows (groups.ts): its best rows, then a "+N more" row; a
// folded group is that one row. Groups you open stay open until the query changes.
const expanded = shallowRef<ReadonlySet<string>>(new Set())
watch(query, () => {
  expanded.value = new Set()
  groupsOpen.value = false
})
function expand (labels: string | string[], first: Entry | null) {
  if (first) wantEntry = e => e.id === first.id
  expanded.value = new Set([...expanded.value, ...(Array.isArray(labels) ? labels : [labels])])
  focusInput()
}
const groupsOpen = shallowRef(false)
const groupModes = computed({
  get: () => props.config.groups ?? {},
  set: (v: Record<string, GroupMode>) => { props.config.groups = Object.keys(v).length ? v : undefined }
})
function toggleGroups () {
  groupsOpen.value = !groupsOpen.value
  focusInput()
}
// The chip row (C): All, or one kind of result with every group under it in
// full. Ctrl + Left / Right steps through the chips.
const chip = shallowRef<ChipId>('all')
const chips = computed(() => {
  if (!queryOk.value || helpOpen.value) return []
  const counts = new Map<ChipId, number>()
  // All counts what All lists: groups switched off aren't in it.
  let all = 0
  for (const s of rawSections.value) {
    const c = chipOf(s.label)
    counts.set(c, (counts.get(c) ?? 0) + s.entries.length)
    if (groupMode(s.label, props.config.groups) !== 'off') all += s.entries.length
  }
  return CHIPS.filter(c => c.id === 'all' || counts.get(c.id))
    .map(c => ({ ...c, count: c.id === 'all' ? all : counts.get(c.id) ?? 0 }))
})
// A chip with nothing for the new query goes back to All, so the list is never
// empty while other results wait behind it.
watch(chips, (list) => {
  if (chip.value !== 'all' && list.length && !list.some(c => c.id === chip.value)) chip.value = 'all'
})
function stepChip (dir: 1 | -1) {
  const list = chips.value
  if (list.length < 2) return
  const at = Math.max(0, list.findIndex(c => c.id === chip.value))
  chip.value = list[(at + dir + list.length) % list.length].id
}
function pickChip (id: ChipId) {
  chip.value = id
  focusInput()
}
const sections = computed<Array<{ label: string, entries: Entry[], capped?: boolean, more?: boolean }>>(() => {
  const raw = rawSections.value
  // The empty box and "?" are short lists of their own.
  if (!queryOk.value || helpOpen.value) return raw
  if (chip.value !== 'all') return raw.filter(s => chipOf(s.label) === chip.value)
  const shaped = shapeSections(query.value, raw, props.config.groups, expanded.value)
  const out: Array<{ label: string, entries: Entry[], capped?: boolean, more?: boolean }> = shaped.sections.map(s => {
    if (!s.hidden) return s
    const more: ActionEntry = {
      kind: 'more',
      id: `more:${s.label}`,
      name: `+${s.hidden} more`,
      sub: s.label,
      icon: 'fas fa-angle-down',
      about: `${s.hidden} more under ${s.label}. The cog in the search bar sets which groups show in full, fold to the top ${GROUP_CAP}, or stay off.`,
      verb: 'Show them',
      action: () => { expand(s.label, s.firstHidden) }
    }
    return { label: s.label, entries: [...s.entries, more], capped: s.capped }
  })
  if (shaped.off.length) {
    const names = shaped.off.map(o => o.label)
    out.push({
      label: 'Off',
      more: true,
      entries: [{
        kind: 'more',
        id: 'more:off',
        name: `${names.length} group${names.length > 1 ? 's' : ''} off`,
        sub: names.join(', '),
        icon: 'fas fa-eye-slash',
        about: `Switched off in the cog: ${names.join(', ')}. ${shaped.off.reduce((n, o) => n + o.count, 0)} results there.`,
        verb: 'Show them',
        action: () => {
          const first = raw.find(r => r.label === names[0])?.entries[0] ?? null
          expand(names, first)
        }
      }]
    })
  }
  return out
})
const entries = computed(() => sections.value.flatMap(s => s.entries))

const selected = shallowRef<Entry | null>(null)

// Rolled uniques (jewels and the like) drop unidentified. poe.ninja's row is
// their price; a click checks the middle of the cheapest unidentified listings
// on trade, kept for an hour (shared with Boss runs). Never searched by itself.
const unidName = computed(() => {
  const e = selected.value
  const name = e?.kind === 'price' ? e.group.name : e?.kind === 'lookup' && e.card.id.startsWith('drop:') ? e.card.id.slice(5) : null
  return name && VARIABLE_ITEMS.has(name) ? name : null
})
const unidQuote = computed(() => {
  const league = leagues.selectedId.value
  return unidName.value && league ? tradePrices.get(league, unidName.value) : null
})
const unidTitle = computed(() => unidQuote.value
  ? `Middle of the cheapest 10 of ${unidQuote.value.listings} unidentified instant buyouts on trade.`
  : 'One trade search for unidentified copies.')
function lookUpUnid () {
  const league = leagues.selectedId.value
  const name = unidName.value
  // The queries use English names, which the regional trade sites won't match.
  if (poeWebApi() !== 'www.pathofexile.com') { toast('Needs the international trade site'); return }
  if (!name || !league || !divine.value) return
  tradePrices.ask(league, divine.value, name)
}
// A currency's round amounts in chaos and divines, under its prices.
const conv = computed(() => {
  const e = selected.value
  if (e?.kind !== 'price' || e.group.type !== 'Currency') return null
  const each = e.group.variants[0]?.chaos
  return each == null ? null : currencyConversions(e.group.name, each, divine.value)
})
// Every unique on a selected base, priced ones dearest first, then the rest by name.
// A base with no price, or one poe.ninja prices as a base type (Spine Bow).
const baseUniques = computed(() => {
  const e = selected.value
  const base = e?.kind === 'item' && e.info.namespace === 'ITEM'
    ? e.info.refName
    : e?.kind === 'price' && e.group.type === 'BaseType' ? e.group.name : null
  const names = base ? uniquesOnBase(base) : undefined
  if (!names?.length) return null
  const items = snapshot.value?.items ?? []
  const shown = new Set([base!])
  const priced = uniquePrices(items, new Set(names), { limit: 100, corrupted: corrupted.value }).map(g => onBaseEntry(g, shown))
  // Only names with no price at all, Foulborn rows aside, say so.
  const has = new Set(uniquePrices(items, new Set(names), { limit: 1000 }).map(g => g.name))
  const unpriced = names.filter(n => !has.has(n))
    .map(n => {
      const info = ITEM_BY_REF('UNIQUE', n)?.[0]
      return { name: info?.name ?? n, refName: n, icon: info?.icon }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  return { priced, unpriced }
})
// A unique's mods, Foulborn kinds, Vestigial mod and base facts under its
// prices. The tooltip files load the first time a unique is picked.
const detailPack = shallowRef<Pick<TipPack, 'uniques' | 'vestigial' | 'bases' | 'drops'> | null>(null)
let detailLoading = false
let detailGen = 0
function orNull<T> (p: Promise<T>): Promise<T | null> {
  return p.catch(() => null)
}
function loadDetailPack () {
  if (detailPack.value || detailLoading) return
  detailLoading = true
  // A read started before a data update is dropped.
  const mine = detailGen
  Promise.all([orNull(loadTipUniques()), orNull(loadTipVestigial()), orNull(loadTipBases()), orNull(loadTipDrops())])
    .then(([uniques, vestigial, bases, drops]) => {
      // Without the unique file there's nothing to show: the next pick tries again.
      if (mine !== detailGen || !uniques) return
      detailPack.value = { uniques: uniques ?? undefined, vestigial: vestigial ?? undefined, bases: bases ?? undefined, drops: drops ?? undefined }
    })
    .finally(() => { if (mine === detailGen) detailLoading = false })
}
const pickedVariant = shallowRef<string | null>(null)
const pickedFoul = shallowRef<string | null>(null)
const detailName = computed(() => {
  const e = selected.value
  if (e?.kind === 'price') return nsOf(e.group.type) === 'UNIQUE' ? baseUniqueName(e.group.name) : null
  return e?.kind === 'item' && e.info.namespace === 'UNIQUE' ? e.info.refName : null
})
watch(detailName, (name) => {
  pickedVariant.value = null
  pickedFoul.value = null
  if (name) loadDetailPack()
})
const found = computed(() => {
  const name = detailName.value
  const pack = detailPack.value
  return name && pack ? uniqueDetails(name, pack.uniques, pack.vestigial) : null
})
// The variant the details show, when the unique has several: its price row lights up.
const shownVariant = computed(() => {
  const list = found.value?.variants ?? []
  if (list.length < 2) return null
  return list.find(v => v.name === pickedVariant.value)?.name ?? list[0].name ?? null
})
const details = computed(() => {
  const name = detailName.value
  const pack = detailPack.value
  const d = found.value
  if (!name || !pack || !d) return null
  const tip = pack.uniques?.[name]
  const row = tip?.v.find(r => r.n === shownVariant.value) ?? tip?.v[0]
  const base = tip?.b ?? ITEM_BY_REF('UNIQUE', name)?.[0]?.unique?.base
  const foulGroup = d.foulborn.length
    ? uniquePrices(snapshot.value?.items ?? [], new Set([name]), { limit: 10, corrupted: corrupted.value }).find(g => g.name === `Foulborn ${name}`) ?? null
    : null
  const sel = selected.value
  return {
    details: d,
    foulGroup,
    facts: base ? uniqueFacts(base, pack.bases?.[base], row?.l, ITEM_BY_REF('UNIQUE', name)?.[0]?.unique?.disenchantValue) : [],
    drop: dropOf(pack.drops, name),
    // Only a unique poe.ninja prices by variant can be missing the shown one.
    priced: shownVariant.value == null || sel?.kind !== 'price' ||
      !sel.group.variants.some(v => v.variant) ||
      sel.group.variants.some(v => v.variant === shownVariant.value)
  }
})
const convCols = computed(() => conv.value ? (conv.value.rows[0].chaos != null ? 1 : 0) + (conv.value.rows[0].div != null ? 1 : 0) : 1)
// Each new query picks the top result, so Enter does what the first row says.
// After picking an example, its answer card is what it was picked for.
let showAnswer = false
// A jump from a beast's recipes picks this entry once the list has it.
let wantEntry: ((e: Entry) => boolean) | null = null
// The query the list was last built for, and the row picked only for being on top.
let listQuery = ''
let autoTop: Entry | null = null
watch(entries, (list) => {
  const id = selected.value?.id
  const want = wantEntry
  const wanted = want ? list.find(want) ?? reveal(want) : undefined
  wantEntry = null
  const isAnswer = (e: Entry) => e.kind === 'lookup' && !['Search the web', 'Things to try'].includes(e.card.group)
  const answer = showAnswer ? list.find(isAnswer) ?? reveal(isAnswer) : undefined
  showAnswer = false
  const picked = id != null && id === pickedId ? selected.value : null
  // Each keystroke picks the top result. A refresh with the same query
  // (prices landing, a ticking countdown) keeps a row you moved to, but not
  // one that was only on top: "50d/c" typed before prices load still ends
  // on its answer once they do.
  const typed = query.value !== listQuery
  listQuery = query.value
  const chosen = selected.value != null && selected.value !== autoTop
  const keep = typed || !chosen ? undefined : list.find(e => e.id === id)
  selected.value = wanted ?? answer ?? keep ?? picked ?? list[0] ?? null
  autoTop = !wanted && !answer && !keep && !picked ? selected.value : null
})

// A row a jump asks for in a folded or capped group: open that group. The
// list is built again with it; this pick is kept by its id.
function reveal (want: (e: Entry) => boolean): Entry | undefined {
  for (const s of rawSections.value) {
    const e = s.entries.find(want)
    if (e) {
      if (!expanded.value.has(s.label)) expanded.value = new Set([...expanded.value, s.label])
      if (chip.value !== 'all' && chipOf(s.label) !== chip.value) chip.value = 'all'
      return e
    }
  }
  return undefined
}

function move (dir: 1 | -1) {
  const list = entries.value
  if (!list.length) return
  const at = selected.value ? list.indexOf(selected.value) : -1
  // From a pick outside the list: its first or last row.
  selected.value = at < 0 ? list[dir > 0 ? 0 : list.length - 1] : list[(at + dir + list.length) % list.length]
  nextTick(() => listEl.value?.querySelector('[data-selected]')?.scrollIntoView({ block: 'nearest' }))
}

function onKey (e: KeyboardEvent) {
  // The cog's list covers the results: Enter or Esc closes it, and the hidden
  // list takes no keys meanwhile.
  if (groupsOpen.value) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      toggleGroups()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') e.preventDefault()
    return
  }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.ctrlKey && !e.shiftKey && !e.altKey && chips.value.length > 1) {
    e.preventDefault()
    stepChip(e.key === 'ArrowRight' ? 1 : -1)
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    e.stopPropagation()
    move(e.key === 'ArrowDown' ? 1 : -1)
  } else if (e.key === 'Enter' && e.ctrlKey && itemEntry()) {
    e.preventDefault()
    if (e.repeat) return
    const entry = itemEntry()!
    // From the keyboard there's no pointer: near the top of the window, as a paste opens it.
    if (canPriceCheck(entry)) priceCheck(entry, { x: window.screenX + window.innerWidth / 2, y: window.screenY + 100 })
  } else if (e.key === 'Enter') {
    e.preventDefault()
    // Held down: one trade tab, not one per repeat.
    if (selected.value && !e.repeat) run(selected.value)
  } else if (e.code === 'KeyF' && e.ctrlKey && !e.shiftKey && !e.altKey && itemEntry()) {
    e.preventDefault()
    if (!e.repeat) findInStash(itemEntry()!.name)
  } else if (e.code === 'KeyC' && e.ctrlKey && e.shiftKey && !e.altKey && itemEntry()) {
    e.preventDefault()
    if (!e.repeat) copyName(itemEntry()!.name)
  } else if (e.key === 'Escape') {
    // Main takes Esc first in the app; this is for the browser.
    e.stopPropagation()
    close()
  } else if (e.key.toLowerCase() === 'p' && e.ctrlKey) {
    e.preventDefault()
    if (selected.value?.kind === 'price') togglePin(selected.value.group.variants[0])
  }
}

// The selected row when it's an item, for the item actions' shortcuts.
function itemEntry (): PriceEntry | ItemEntry | null {
  const e = selected.value
  return e?.kind === 'price' || e?.kind === 'item' ? e : null
}

function run (entry: Entry) {
  remember(entry)
  // An item: Trade site, the detail pane's main button.
  if (entry.kind === 'price' || entry.kind === 'item') {
    openTrade(entry)
  } else if (entry.kind === 'lookup') {
    if (entry.card.actions[0]) act(entry.card.actions[0])
  } else {
    entry.action()
  }
}

// ---- Blood Altar ----
// A captured beast's type reads "Beast · Amphibian · Deep".
function kindLabel (type: string, name: string) {
  const kind = type === 'Beast' ? beastKindLabel(name) : undefined
  return kind ? `${typeLabel(type)} · ${kind}` : typeLabel(type)
}
const beastPrice = (name: string) => lookupContext.value.price(name)
// A beast's recipes, or for a spirit boss's unique the portal to its den.
const beastBox = computed(() => {
  const e = selected.value
  const data = bestiaryData.value
  if (!data) return null
  if (e?.kind === 'price' && e.group.type === 'Beast') {
    const recipes = recipesWith(data, e.group.name)
    if (!recipes.length) return null
    return {
      recipes,
      me: e.group.name,
      heading: `${BLOOD_ALTAR} · ${recipes.length} recipe${recipes.length > 1 ? 's' : ''}`,
      note: 'Since 3.30 a recipe needs only the beasts it names.'
    }
  }
  const unique = e?.kind === 'price' && nsOf(e.group.type) === 'UNIQUE'
    ? baseUniqueName(e.group.name)
    : e?.kind === 'item' && e.info.namespace === 'UNIQUE' ? e.info.refName : null
  const recipes = unique ? recipesMaking(data, unique) : []
  const den = recipes.length ? denOf(data, recipes[0]) : null
  if (!den) return null
  return { recipes, me: null, heading: 'From the Bestiary', note: `${den.boss} drops it in ${recipes[0].r.replace(/^to /, '')}, opened at the ${BLOOD_ALTAR}.` }
})
function jumpTo (q: string, want: (e: Entry) => boolean) {
  // The same query doesn't rebuild the list: pick from it now.
  if (query.value === q) {
    const own = entries.value.find(want)
    if (own) selected.value = own
    else {
      // In a folded group or behind a chip: open it, and pick it once the list is rebuilt.
      const hidden = reveal(want)
      if (hidden) { wantEntry = want; selected.value = hidden }
    }
  } else {
    wantEntry = want
    query.value = q
  }
  focusInput()
}
function openRecipe (rec: BeastRecipe) {
  const id = `l:beast:${bestiaryData.value?.recipes.indexOf(rec) ?? -1}`
  jumpTo(recipeTitle(rec), e => e.id === id)
}
function openBeast (name: string) {
  jumpTo(name, e => e.kind === 'price' && e.group.type === 'Beast' && e.group.name === name)
}
// Captured beasts list on trade by their name as the item type.
function tradeBeast (name: string) {
  const league = leagues.selectedId.value
  if (!league) {
    toast('Pick a league in the settings first')
    return
  }
  // The international site takes the English name, a regional one its own.
  const type = poeWebApi() === 'www.pathofexile.com' ? name : ITEM_BY_REF('CAPTURED_BEAST', name)?.[0]?.name ?? name
  window.open(tradeUrl(league, { type, status: priceCheckTradeStatus() }, getTradeEndpoint()))
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

// The Market Prices tab's range, as two more columns, when it's one this table
// doesn't already show (24h and 7d) and the app saved prices for it.
const extraRange = computed(() => {
  const r = rangeInfo(tracker.value?.priceRange)
  return r.local && r.id !== '24h' ? r : null
})
const extraTitle = computed(() => extraRange.value ? `${extraRange.value.long}, from the prices this app saves about every 30 minutes (the Market window's range)` : undefined)
const extraPrices = shallowRef<Record<string, number>>({})
let extraSeq = 0
watch([() => selected.value?.kind === 'price' ? selected.value.group : null, extraRange, () => snapshot.value?.ts, leagues.selectedId], async ([group, r]) => {
  const mine = ++extraSeq
  const league = leagues.selectedId.value
  if (!group || !r || !league) { extraPrices.value = {}; return }
  try {
    const got = await savedPriceSeries(league, group.type, r.ms, [group.name])
    if (mine !== extraSeq) return
    const out: Record<string, number> = {}
    for (const [k, line] of Object.entries(got.rows)) if (line[0] != null && line[0] > 0) out[k] = line[0]
    extraPrices.value = out
  } catch {
    if (mine === extraSeq) extraPrices.value = {}
  }
}, { immediate: true })
function extraThen (v: PriceItem): number | null {
  return extraPrices.value[`${v.name}\u0000${v.variant}`] ?? null
}
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
// The item as the item menu names it: a poe.ninja row with its type.
function menuRef (entry: PriceEntry | ItemEntry) {
  return entry.kind === 'price' ? { name: entry.group.name, type: entry.group.type } : { name: entry.info.refName }
}
// A Viscera and the version its name says (Wickerman module on). Its copy is
// written in English, which only an English client's price check reads.
function visceraOf (entry: PriceEntry | ItemEntry) {
  if (!visceraTable.value || !isModuleOn(AppConfig(), 'wickerman') || AppConfig().language !== 'en') return null
  const name = entry.kind === 'price' ? entry.group.name : entry.info.refName
  const effect = entry.kind === 'price' && entry.group.variants.length === 1 ? entry.group.variants[0].variant : undefined
  return visceraByName(visceraTable.value, name, effect)
}
function canPriceCheck (entry: PriceEntry | ItemEntry) {
  const info = infoFor(entry)
  return info?.namespace === 'UNIQUE' || visceraOf(entry) != null || canCheckByName(menuRef(entry), info)
}
function openLookup (entry: PriceEntry | ItemEntry, tab: LookupTab) {
  remember(entry)
  const info = infoFor(entry)
  if (!info) return
  lookupRequest.value = { item: info.namespace === 'UNIQUE' ? virtualUnique(info) : createVirtualItem({ rarity: ItemRarity.Normal, info }), tab }
}
async function priceCheck (entry: PriceEntry | ItemEntry, at: ScreenPoint) {
  remember(entry)
  // A Viscera: priced as a copy of that version, so its strip can switch versions.
  const viscera = visceraOf(entry)
  if (viscera) {
    // The name as listed: poe.ninja calls a pinnacle Uber version "Greater ...".
    const name = entry.kind === 'price' ? entry.group.name : entry.info.refName
    await openPriceCheck({ name, text: visceraItemText(viscera.v, viscera.tier, name) }, at)
    return
  }
  const info = infoFor(entry)
  if (info?.namespace !== 'UNIQUE') {
    // Gems, cards, currency, beasts: as the item menu's Price check does.
    await openPriceCheck(menuRef(entry), at, info)
    return
  }
  // Its mods as stat rows (English data only); one price row says which variant.
  // A Foulborn row is priced as its unique (the data has no Foulborn uniques).
  const variant = entry.kind === 'price' && entry.group.variants.length === 1 ? entry.group.variants[0].variant || undefined : undefined
  await openPriceCheck({ name: info.refName, rarity: 'unique', variant }, at, info)
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
  // The item menu's query: a transfigured gem as its plain gem plus which one,
  // and a unique on several bases by name alone.
  const ns = info?.namespace ?? (entry.kind === 'price' ? nsOf(entry.group.type) : 'ITEM')
  const kind = ns === 'UNIQUE' ? 'unique' : ns === 'GEM' ? 'gem' : ns === 'DIVINATION_CARD' ? 'card' : 'item'
  // A Foulborn row, or a Foulborn kind picked under the unique: Foulborn
  // copies only. Any other unique: none of them.
  const foulborn = isFoulborn(name) || (pickedFoul.value != null && detailName.value === baseUniqueName(name))
  const q = tradeSearch({ name }, kind, info, AppConfig().language === 'en', foulborn)
  window.open(tradeUrl(league, { ...q, status: priceCheckTradeStatus(info) }, getTradeEndpoint()))
}
function findInStash (name: string) {
  Host.sendEvent({ name: 'CLIENT->MAIN::user-action', payload: { action: 'stash-search', text: JSON.stringify(name) } })
}
function copyName (name: string) {
  copyText(name).then(ok => { if (ok) toast(`Copied "${name}"`, { ms: 1800 }) })
}

function onPaste (e: ClipboardEvent) {
  const text = pastedItemText(e.clipboardData?.getData('text/plain') ?? '')
  if (text == null) return
  e.preventDefault()
  Host.selfDispatch({
    name: 'MAIN->CLIENT::item-text',
    payload: { clipboard: text, position: { x: window.screenX + window.innerWidth / 2, y: window.screenY + 100 }, focusOverlay: true, target: 'price-check', live: true }
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
// Opened by the hotkey, its modifier may still be held: see isHotkeyTail.
let heldFromOpen = false
// The bare key went down: a tap closes on release, but a second keydown first
// is the opening press still held and repeating, which must not close it.
let tail: 'none' | 'tap' | 'held' = 'none'
function onHotkey (e: KeyboardEvent) {
  const key = props.config.hotkey
  if (!key) return
  if (pressedKeys(e) === sortKeys(key)) {
    e.preventDefault()
    // Still held from opening it.
    if (!e.repeat) close()
  } else if (heldFromOpen && query.value === '' && isHotkeyTail(e, key)) {
    e.preventDefault()
    tail = (tail === 'none' && !e.repeat) ? 'tap' : 'held'
  } else if (!isModifierCode(e.code)) {
    forgetHeld()
  }
}
function onHotkeyUp (e: KeyboardEvent) {
  const key = props.config.hotkey
  if (isModifierCode(e.code)) {
    heldFromOpen = false
  } else if (tail !== 'none' && key && isHotkeyTail(e, key)) {
    const tap = tail === 'tap'
    tail = 'none'
    if (tap) close()
  }
}
// A click or a paste is something other than the hotkey again.
function forgetHeld () {
  heldFromOpen = false
  tail = 'none'
}
function start (text: string) {
  forgetHeld()
  // An open asked for last time that no tool took.
  savedOpenRequest.value = null
  holdPricesForSearch()
  query.value = text
  corrupted.value = 'any'
  chip.value = 'all'
  // As a new query does: the same query again (an empty one, say) doesn't
  // fire the query watch, so groups opened last time would stay open.
  expanded.value = new Set()
  groupsOpen.value = false
  selected.value = entries.value[0] ?? null
  wm.show(props.config.wmId)
  focusInput(true)
  whenIdle(gameItems)
  whenIdle(loadCards)
  whenIdle(loadDrops)
  whenIdle(loadGems)
  whenIdle(loadCrafts)
  whenIdle(loadMapBonusLookup)
  whenIdle(loadBestiary)
  whenIdle(loadTree)
  whenIdle(loadVisceraTable)
  whenIdle(loadVaultTable)
  whenIdle(loadNetWorthGlance)
  whenIdle(loadSales)
  whenIdle(loadNights)
  whenIdle(loadZones)
  whenIdle(loadPantheon)
  whenIdle(loadBuildList)
}
function close () {
  forgetHeld()
  wm.hide(props.config.wmId)
  if (Host.isElectron) Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
}

const hotkeys = Host.onEvent('MAIN->CLIENT::widget-action', (e) => {
  if (e.target !== SEARCH_TARGET) return
  if (open.value && wm.active.value) close()
  else {
    start('')
    heldFromOpen = true
  }
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
/* A group's "+N more" row, and a folded group's one line. */
.more { display: block; width: 100%; padding: 2px var(--w-pad) 4px calc(var(--w-pad) + var(--w-icon-md) + var(--w-s2)); text-align: left; font-size: var(--w-fs-sm); color: var(--w-accent); }
.fold { display: block; width: 100%; padding: 6px var(--w-pad) 3px; text-align: left; font-size: var(--w-fs-caps); }
.foldName { font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); font-family: var(--w-caps-face); }
.more:hover, .fold:hover { background: var(--w-panel-2); }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: var(--w-s1); padding: var(--w-s1) var(--w-pad); border-bottom: 1px solid var(--w-line-soft); }
.chip { display: inline-flex; align-items: baseline; gap: 4px; padding: 0 8px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); font-family: var(--w-caps-face); font-size: var(--w-fs-sm); color: var(--w-dim); line-height: 1.7; }
.chip:hover { color: var(--w-text); border-color: var(--w-line-strong); }
.chipOn, .chipOn:hover { color: var(--w-text); border-color: var(--w-accent); background: var(--w-accent-soft); }
.chipN { font-family: var(--w-num); color: var(--w-faint); }
.chipKeys { margin-left: auto; color: var(--w-dim); }
.fold:hover .foldName { color: var(--w-text); }
.sel, .sel:hover { background: var(--w-accent-soft); box-shadow: inset 2px 0 0 var(--w-accent); }
.resName { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.small { font-size: var(--w-fs-sm); }
.range { flex: none; display: inline-flex; align-items: center; gap: 4px; }
.none { padding: var(--w-s3) var(--w-pad); color: var(--w-dim); }
.detail { padding: var(--w-s3) var(--w-s4); min-width: 0; }
.title { display: flex; align-items: center; gap: var(--w-s2); margin-bottom: var(--w-s2); font-size: var(--w-fs-lg); }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 88px 88px 88px 52px 52px 50px; column-gap: 6px; align-items: center; }
.gridExtra { grid-template-columns: minmax(0, 1fr) 88px 88px 88px 88px 52px 52px 52px 50px; }
.gridHead { min-height: calc(24px * var(--w-text-scale, 1)); font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); border-bottom: 1px solid var(--w-line); font-family: var(--w-caps-face); }
.row { min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); }
.rowPicked { background: var(--w-panel-2); }
.rowBtns { display: flex; justify-content: flex-end; gap: 2px; }
.acts { display: flex; flex-wrap: wrap; gap: var(--w-s1); margin-top: var(--w-s3); }
.convBox { margin-top: var(--w-s3); max-width: 320px; }
.conv { display: grid; grid-template-columns: minmax(0, 1fr) repeat(var(--conv-cols, 1), 90px); column-gap: 6px; align-items: center; }
.foot { flex: none; display: flex; align-items: center; gap: var(--w-s3); padding: 7px var(--w-pad); border-top: 1px solid var(--w-line); font-size: var(--w-fs-sm); color: var(--w-dim); }
</style>
