<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- In a boss arena: what can drop and how often, then your own runs if you log any. Click: this boss's drops. -->
    <DockItem :menu="dockMenu" id="boss-runs" title="Boss runs" :show="arenaBosses.length > 0"
      :badge="arenaBosses.length === 1 && arenaBosses[0].kills ? arenaBosses[0].kills : null" :wm-id="config.wmId" card-width="22rem" @activate="openArenaBoss">
      <template #card>
        <div style="padding: 4px var(--w-pad) 6px;" class="flex flex-col gap-2">
          <div v-for="r in arenaBosses" :key="r.boss.id" class="flex flex-col gap-0.5 w-num">
            <div class="w-head-font w-accent w-trunc">{{ r.boss.name }}</div>
            <div v-for="d in cardDrops(r.drops, CARD_DROPS)" :key="d.name" :class="$style.cardDrop">
              <span v-item-tip="{ name: d.name, type: typeByName.get(d.name), variant: d.variant }" class="w-trunc">{{ d.name }}</span>
              <span class="text-right" :class="d.chance == null ? 'w-faint' : 'w-dim'">{{ d.chance == null ? '?' : pct(d.chance) }}</span>
              <span class="text-right"><WPrice :chaos="d.price" :divine="divine" /></span>
            </div>
            <div v-if="!r.drops.length" class="w-faint text-xs">No drop list for this boss yet.</div>
            <div v-else-if="r.drops.length > CARD_DROPS" class="w-faint text-xs">+{{ r.drops.length - CARD_DROPS }} more</div>
            <div v-if="r.drops.length && !r.hasRates" class="w-faint text-xs">Drop chances aren't known yet.</div>
            <!-- Your own runs, once you've logged any. -->
            <template v-if="r.kills">
              <div class="flex justify-between" :class="$style.cardStats"><span class="w-dim">Entry</span>
                <span class="w-down"><template v-if="r.entryMissing.length">?</template><WPrice v-else :chaos="-r.entry" :divine="divine" /></span></div>
              <div class="flex justify-between"><span class="w-dim">Your average drop</span><WPrice :chaos="r.myLoot" :divine="divine" /></div>
              <div v-if="r.ready" class="flex justify-between"><span class="w-dim">Per run</span>
                <span :class="r.profit >= 0 ? 'w-up' : 'w-down'"><WPrice :chaos="r.profit" :divine="divine" /></span></div>
              <div class="w-dim text-xs">{{ r.kills }} kill{{ r.kills === 1 ? '' : 's' }} logged</div>
            </template>
          </div>
        </div>
      </template>
    </DockItem>
    <WPanel ref="panel" :title="config.wmTitle || 'Boss runs'" icon="maven" :updated="prices.snapshot.value?.ts ?? null" :fresh-min="40" :stale-min="180" width="68rem" max-height="80vh" :scroll="false">
      <template #toolbar>
        <WSegmented v-model="config.tier" :options="tierOptions" />
        <WSegmented v-model="config.sort" :options="sortOptions" />
      </template>
      <template v-if="!prices.snapshot.value" #banner>
        <WBanner tone="info">Waiting for poe.ninja prices.</WBanner>
      </template>

      <div :class="$style.layout">
        <!-- ranked list -->
        <div v-if="!prices.snapshot.value" :class="$style.list"><WSkeleton :rows="9" /></div>
        <div v-else :class="$style.list" class="w-scroll">
          <div class="w-group-label">Profitable now</div>
          <WListItem v-for="r in ranked.good" :key="r.boss.id" :active="r.boss.id === sel?.boss.id" @select="config.selected = r.boss.id" @contextmenu="bossMenu($event, r)">
            <span class="flex justify-between gap-2 w-full min-w-0">
              <span class="flex items-center gap-2 min-w-0"><WIcon :src="art(r.boss.entry[0]?.name)" fallback="fas fa-skull" /><span class="w-trunc">{{ r.boss.name }}</span><WChip v-if="r.estimated" title="Uses estimated drop chances, not measured kills">est.</WChip></span>
              <span :class="r.profit >= 0 ? 'w-up' : 'w-down'"><WPrice :chaos="config.sort === 'run' ? r.profit : r.perHour" :divine="divine" />{{ config.sort === 'run' ? '' : '/h' }}</span>
            </span>
            <template #sub>{{ subline(r) }}</template>
          </WListItem>
          <div v-if="!ranked.good.length" class="w-faint text-xs" style="padding: 4px var(--w-pad);">Nothing in profit at these prices.</div>
          <template v-if="ranked.losing.length">
            <div class="w-group-label">Losing money</div>
            <WListItem v-for="r in ranked.losing" :key="r.boss.id" :active="r.boss.id === sel?.boss.id" @select="config.selected = r.boss.id" @contextmenu="bossMenu($event, r)">
              <span class="flex justify-between gap-2 w-full min-w-0">
                <span class="flex items-center gap-2 min-w-0"><WIcon :src="art(r.boss.entry[0]?.name)" fallback="fas fa-skull" /><span class="w-trunc">{{ r.boss.name }}</span><WChip v-if="r.estimated" title="Uses estimated drop chances, not measured kills">est.</WChip></span>
                <span class="w-down"><WPrice :chaos="config.sort === 'run' ? r.profit : r.perHour" :divine="divine" />{{ config.sort === 'run' ? '' : '/h' }}</span>
              </span>
              <template #sub>{{ subline(r) }}</template>
            </WListItem>
          </template>
          <div v-if="ranked.noData.length" class="w-group-label">Needs data</div>
          <WListItem v-for="r in ranked.noData" :key="r.boss.id" :active="r.boss.id === sel?.boss.id" @select="config.selected = r.boss.id" @contextmenu="bossMenu($event, r)">
            <span class="flex justify-between gap-2 w-full min-w-0">
              <span class="flex items-center gap-2 min-w-0"><WIcon :src="art(r.boss.entry[0]?.name)" fallback="fas fa-skull" /><span class="w-trunc w-dim">{{ r.boss.name }}</span></span>
              <span class="w-faint text-xs flex items-center gap-1">entry <WPrice :chaos="r.entryMissing.length ? null : r.entry" :divine="divine" /></span>
            </span>
          </WListItem>
        </div>

        <!-- boss detail -->
        <div v-if="sel" :class="$style.detail">
          <div class="flex items-center gap-2" style="padding: 10px var(--w-pad) 6px;">
            <span :class="$style.bossName" class="grow w-trunc">{{ sel.boss.name }}</span>
            <WChip v-if="sel.boss.source?.kills" :class="sel.boss.source.kills >= 1000 ? 'w-up' : ''">{{ sel.boss.source.kills.toLocaleString() }} community kills</WChip>
            <WChip v-if="sel.kills">{{ sel.kills }} of my kills</WChip>
            <label class="flex items-center gap-1 w-dim text-sm">Run time
              <input :value="formatRunTime(sel.runSeconds)" :class="$style.input" style="width: 4rem;" title="m:ss, or minutes"
                @change="setRunTime(sel.boss.id, ($event.target as HTMLInputElement).value, $event)">
            </label>
          </div>
          <div :class="$style.hero">
            <div><div :class="$style.k">Entry</div><div :class="$style.big"><WPrice :chaos="sel.entryMissing.length ? null : sel.entry" :divine="divine" /></div></div>
            <div><div :class="$style.k">Loot / run</div><div :class="$style.big"><WPrice :chaos="sel.hasRates ? sel.loot : null" :divine="divine" /></div></div>
            <div><div :class="$style.k">Profit / run</div><div :class="[$style.big, sel.profit >= 0 ? 'w-up' : 'w-down']"><WPrice :chaos="sel.ready ? sel.profit : null" :divine="divine" /></div></div>
            <div><div :class="$style.k">Per hour</div><div :class="[$style.big, sel.perHour >= 0 ? 'w-up' : 'w-down']"><WPrice :chaos="sel.ready ? sel.perHour : null" :divine="divine" /></div></div>
          </div>
          <div style="padding: 0 var(--w-pad);">
            <WTabs v-model="tab" :options="[{ value: 'drops', label: 'Drops' }, { value: 'kills', label: 'My kills', count: sel.kills }, { value: 'rates', label: 'Rates & sources' }]" />
          </div>

          <div :class="$style.body">
            <div class="grow min-w-0 w-scroll">
              <!-- drops -->
              <template v-if="tab === 'drops'">
                <WEmpty v-if="!sel.drops.length" :art="{ mechanic: 'maven' }">No drop list for this boss yet. Log a kill or add drops under Rates &amp; sources.</WEmpty>
                <template v-else>
                  <div class="w-row w-row--head" :class="$style.dropGrid"><span title="Count this drop in the loot">On</span><span>Drop</span><span class="text-right">Chance</span><span class="text-right">Price</span><span class="text-right">Per run</span><span>Share</span></div>
                  <template v-for="d in sel.drops" :key="d.name">
                  <div class="w-row" :class="[$style.dropGrid, { [$style.off]: !d.included }]">
                    <input type="checkbox" :checked="d.included" :aria-label="`Count ${d.name}`" @change="toggleDrop(sel.boss.id, d.name, ($event.target as HTMLInputElement).checked, d.tooRare)">
                    <span v-item-tip="{ name: d.name, type: typeByName.get(d.name) }" class="w-trunc flex items-center gap-1">
                      <WIcon :src="art(d.name)" fallback="fas fa-gem" /><span class="w-trunc">{{ d.name }}</span><span v-if="d.qty > 1" class="w-dim">×{{ d.qty }}</span>
                      <WChip v-if="d.tooRare" :title="`Rarer than 1 in ${config.plannedRuns} runs`">rare</WChip>
                    </span>
                    <span class="text-right w-num" :class="d.rateSource === 'community' ? 'w-dim' : d.rateSource === 'none' ? 'w-faint' : d.rateSource === 'estimate' ? '' : 'w-accent'" :style="d.rateSource === 'estimate' ? 'color: var(--w-warn);' : ''" :title="rateTitle(d.rateSource)">{{ d.chance == null ? '?' : (d.rateSource === 'estimate' ? '~' : '') + pct(d.chance) }}</span>
                    <span class="flex items-center justify-end gap-1">
                      <WChip v-if="d.priceMode" clickable :active="d.priceMode === 'custom'" :title="spreadTitle(d)" @click="editing = editing === d.name ? null : d.name">{{ modeLabel(d) }}</WChip>
                      <WChip v-else-if="d.priceSource === 'trade'" :title="`poe.ninja doesn't list this. Price from ${d.listings} instant buyouts on trade.`">trade</WChip>
                      <WPrice :chaos="d.price" :divine="divine" />
                    </span>
                    <span class="text-right"><WPrice :chaos="d.chance == null || d.price == null ? null : d.value" :divine="divine" /></span>
                    <span :class="$style.share"><i :style="{ width: (sel.loot > 0 ? d.value / sel.loot * 100 : 0) + '%' }" /></span>
                  </div>
                  <div v-if="editing === d.name && editingRow" class="flex flex-wrap items-center gap-2 text-sm" :class="$style.editor">
                    <span class="w-accent">{{ editingRow.name }}</span>
                    <span v-if="editingRow.listings != null" class="w-dim">{{ editingRow.listings.toLocaleString() }} unidentified instant buyouts.</span>
                    <span class="flex items-center gap-1 w-dim">poe.ninja <WPrice :chaos="editingRow.spread?.median" :divine="divine" /></span>
                    <WSegmented :model-value="editingRow.priceMode === 'min' ? 'median' : editingRow.priceMode ?? 'median'" :options="modeOptions" @update:model-value="setMode(editingRow.name, $event)" />
                    <label v-if="editingRow.priceMode === 'custom'" class="flex items-center gap-1 w-dim">Price
                      <input type="number" min="0" :class="$style.input" style="width: 5rem;" :value="config.customPrices[editingRow.name] ?? ''" placeholder="chaos"
                        @change="setCustomPrice(editingRow.name, ($event.target as HTMLInputElement).value)">c
                    </label>
                    <WButton size="sm" icon="fas fa-external-link-alt" @click="openUnidSearch(editingRow.name)">Unidentified on trade</WButton>
                  </div>
                  </template>
                  <div v-if="sel.excluded" class="text-xs w-dim" style="padding: 6px var(--w-pad) 0;">{{ sel.excluded }} {{ sel.excluded === 1 ? 'drop' : 'drops' }} left out of the loot<template v-if="config.plannedRuns"> (rarer than 1 in {{ config.plannedRuns }} runs, or switched off)</template>.</div>
                  <div v-if="sel.entryMissing.length" class="text-xs" style="padding: 6px var(--w-pad) 0; color: var(--w-warn);">No price for {{ sel.entryMissing.join(', ') }}. Profit is hidden. <button type="button" class="w-accent hover:underline" @click="config.ownEntry = true">Count the entry as free</button></div>
                  <div class="text-xs w-faint" style="padding: 6px var(--w-pad) 0;">
                    <template v-if="sel.kills >= OWN_RATE_KILLS">Using your own drop rates from {{ sel.kills }} logged kills.</template>
                    <template v-else-if="sel.boss.source">Rates: {{ sel.boss.source.label }}. Your own rates take over after {{ OWN_RATE_KILLS }} logged kills ({{ sel.kills }} so far).</template>
                  </div>
                  <div v-if="sel.estimated" class="text-xs" style="padding: 6px var(--w-pad) 0; color: var(--w-warn);">~ is an estimated chance ({{ ESTIMATE_SOURCE_LABEL }}). Loot and profit are rough.</div>
                  <div v-if="sel.unrated" class="text-xs w-faint" style="padding: 6px var(--w-pad);">? has no known drop rate and counts as 0. Log kills or type a rate under Rates &amp; sources.</div>
                  <div v-if="sel.unpriced" class="text-xs" style="padding: 0 var(--w-pad) 6px; color: var(--w-warn);">{{ sel.unpriced }} {{ sel.unpriced === 1 ? 'drop has' : 'drops have' }} no price yet and count as 0.</div>
                </template>
              </template>

              <!-- my kills -->
              <template v-else-if="tab === 'kills'">
                <div v-if="logging" class="flex flex-col gap-2" style="padding: 8px var(--w-pad);">
                  <div class="w-dim text-sm">Tick what this kill dropped.</div>
                  <div class="flex flex-wrap gap-1">
                    <WChip v-for="d in sel.drops" :key="d.name" v-item-tip="{ name: d.name, type: typeByName.get(d.name), variant: d.variant }" clickable :active="!!logging[d.name]" @click="toggleLogged(d.name, d.variant)">{{ d.name }}</WChip>
                  </div>
                  <div class="relative">
                    <WField v-model="logQuery" icon="fas fa-plus" placeholder="Something else… (search prices)" class="w-full" />
                    <div v-if="logResults.length" class="w-surface absolute left-0 right-0 z-10 mt-1 py-1">
                      <button v-for="item in logResults" :key="item.type + item.name + item.variant" v-item-tip="item" class="w-row w-full text-left" style="grid-template-columns: minmax(0,1fr) auto;" @click="toggleLogged(item.name, item.variant || undefined); logQuery = ''">
                        <span class="w-trunc">{{ item.name }}<span v-if="item.variant" class="w-dim ml-1">{{ item.variant }}</span></span>
                        <WPrice :chaos="item.chaos" :divine="divine" />
                      </button>
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <WButton variant="primary" icon="fas fa-check" @click="saveKill">Save kill</WButton>
                    <WButton variant="ghost" @click="logging = null">Cancel</WButton>
                  </div>
                </div>
                <WEmpty v-else-if="!sel.kills" :art="{ mechanic: 'maven' }">Log each kill's drops. Bosses without public rates use your own kill rates.</WEmpty>
                <template v-else>
                  <div class="flex gap-4" style="padding: 8px var(--w-pad);">
                    <span class="w-dim">My average loot <WPrice :chaos="sel.myLoot" :divine="divine" class="w-accent" /></span>
                    <span v-if="sel.hasRates" class="w-dim">Expected <WPrice :chaos="sel.loot" :divine="divine" /></span>
                  </div>
                  <div v-for="(kill, i) in killsOf(sel.boss.id).slice().reverse()" :key="kill.ts" class="w-row" :class="$style.killGrid"
                    @contextmenu="killMenu($event, sel.boss.id, killsOf(sel.boss.id).length - 1 - i)">
                    <span class="w-dim w-num text-xs">{{ new Date(kill.ts).toLocaleDateString() }}</span>
                    <span class="w-trunc">{{ kill.drops.map(d => d.qty > 1 ? `${d.name} ×${d.qty}` : d.name).join(', ') || 'nothing of note' }}</span>
                    <WPrice :chaos="killValue(kill)" :divine="divine" />
                    <button class="w-icon-btn" title="Delete. You can undo." @click="deleteKill(sel.boss.id, killsOf(sel.boss.id).length - 1 - i)"><i class="fas fa-times" /></button>
                  </div>
                </template>
              </template>

              <!-- rates & sources -->
              <template v-else>
                <div style="padding: 8px var(--w-pad);" class="flex flex-col gap-1 text-sm">
                  <div v-if="sel.boss.source">
                    <span class="w-dim">Built-in rates:</span> {{ sel.boss.source.label }}<template v-if="sel.boss.source.kills">, {{ sel.boss.source.kills.toLocaleString() }} kills</template>.
                    <a :href="sel.boss.source.url" target="_blank" class="w-accent">Open source ↗</a>
                    <div v-if="sel.boss.source.note" style="color: var(--w-warn);">{{ sel.boss.source.note }}</div>
                  </div>
                  <div v-else class="w-dim">No public drop data for this boss. Add its drops below and type rates you trust, or log kills.</div>
                  <div v-if="sel.estimated" style="color: var(--w-warn);">
                    {{ sel.estimated }} {{ sel.estimated === 1 ? 'drop uses' : 'drops use' }} estimated chances, not measured kills: {{ ESTIMATE_SOURCE_LABEL }}.
                    <a v-if="estimateUrl(sel.boss.id)" :href="estimateUrl(sel.boss.id)!" target="_blank" class="w-accent">Open source ↗</a>
                  </div>
                  <div class="w-faint text-xs">Your typed rates win over community rates, then your kill log, then estimates. Prices are from poe.ninja; jewels use unidentified trade listings.</div>
                </div>
                <div class="w-row w-row--head" :class="$style.rateGrid"><span>Drop</span><span>Source</span><span class="text-right">Chance %</span><span /></div>
                <div v-for="d in sel.drops" :key="d.name" class="w-row" :class="$style.rateGrid">
                  <span v-item-tip="{ name: d.name, type: typeByName.get(d.name), variant: d.variant }" class="w-trunc">{{ d.name }}</span>
                  <span class="w-dim text-xs">{{ rateTitle(d.rateSource) }}</span>
                  <input type="number" min="0" max="100" step="0.01" :class="$style.input" class="text-right"
                    :value="d.chance == null ? '' : +(d.chance * 100).toFixed(3)" placeholder="?"
                    @change="setRate(sel.boss.id, d.name, ($event.target as HTMLInputElement).value)">
                  <span class="flex">
                    <button v-if="d.rateSource === 'custom'" class="w-icon-btn" title="Remove my rate" @click="setRate(sel.boss.id, d.name, '')"><i class="fas fa-undo" /></button>
                    <button v-if="isExtraDrop(sel.boss.id, d.name)" class="w-icon-btn" title="Remove this drop. You can undo." @click="removeDrop(sel.boss.id, d.name)"><i class="fas fa-trash" /></button>
                  </span>
                </div>
                <div class="relative" style="padding: 8px var(--w-pad);">
                  <WField v-model="dropQuery" icon="fas fa-plus" placeholder="Add a drop to this boss…" class="w-full" />
                  <div v-if="dropResults.length" class="w-surface absolute left-0 right-0 z-10 mt-1 py-1" style="margin: 0 var(--w-pad);">
                    <button v-for="item in dropResults" :key="item.type + item.name + item.variant" v-item-tip="item" class="w-row w-full text-left" style="grid-template-columns: minmax(0,1fr) auto;" @click="addDrop(sel.boss.id, item.name, item.variant || undefined)">
                      <span class="w-trunc">{{ item.name }}<span v-if="item.variant" class="w-dim ml-1">{{ item.variant }}</span></span>
                      <WPrice :chaos="item.chaos" :divine="divine" />
                    </button>
                  </div>
                </div>
              </template>
            </div>

            <!-- side: luck + entry -->
            <div :class="$style.side">
              <div v-if="lk" :class="$style.box">
                <div :class="$style.k">Luck check</div>
                <div :class="$style.kv">
                  <span class="w-dim">Runs that beat entry</span><span class="w-num">~{{ Math.round(lk.beatEntry * 100) }}%</span>
                  <span class="w-dim">Typical run</span><span :class="lk.medianProfit >= 0 ? 'w-up' : 'w-down'"><WPrice :chaos="lk.medianProfit" :divine="divine" /></span>
                  <template v-if="lk.runsForTop && lk.topShare >= 0.25">
                    <span class="w-dim">Runs for one {{ short(lk.topName) }}</span><span class="w-num">~{{ Math.round(lk.runsForTop) }}</span>
                    <span class="w-dim">Profit without it</span><span :class="lk.profitWithoutTop >= 0 ? 'w-up' : 'w-down'"><WPrice :chaos="lk.profitWithoutTop" :divine="divine" /></span>
                  </template>
                </div>
                <div v-if="lk.topShare >= 0.4" class="text-xs" style="color: var(--w-warn);">Swingy: {{ Math.round(lk.topShare * 100) }}% of the value is one drop. Plan for many runs.</div>
                <div v-else class="text-xs w-up">Steady: no single drop carries most of the value.</div>
              </div>
              <div :class="$style.box">
                <div :class="$style.k">Entry</div>
                <div :class="$style.kv">
                  <template v-for="e in sel.boss.entry" :key="e.name">
                    <span class="flex items-center gap-1 min-w-0"><WIcon :src="art(e.name)" fallback="fas fa-puzzle-piece" /><span class="w-trunc">{{ e.qty > 1 ? `${e.qty}× ` : '' }}{{ e.name }}</span></span>
                    <WPrice :chaos="entryPrice(e.name, e.qty)" :divine="divine" />
                  </template>
                </div>
                <div v-if="config.ownEntry" class="text-xs w-faint">Counted as free (you own them).</div>
              </div>
              <WButton variant="primary" icon="fas fa-plus" @click="startLog">Log a kill</WButton>
            </div>
          </div>
        </div>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { BOSS_RUNS_TYPE } from './widget'
import type { BossRunsWidget } from './widget'

export default {
  widget: {
    type: BOSS_RUNS_TYPE,
    instances: 'multi',
    trNameKey: 'Boss runs'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, nextTick, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WTabs, WSegmented, WField, WButton, WEmpty, WPrice, WChip, WListItem, WIcon, WBanner, WSkeleton, openMenu, toast, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { usePriceIndex } from '../market/price-index'
import { useLeagues } from '@/web/background/Leagues'
import { poeWebApi } from '@/web/Config'
import { BOSSES } from './bosses'
import DockItem from '../dock/DockItem.vue'
import { showWithOverlay } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { arenaBosses as arenaBossIds, useZone } from '../shared/zone'
import { bossesAtLevel, cardDrops, evaluateBoss, formatRunTime, killDropPrice, luck, parseRunTime, priceResolver, tradeWanted, unidentifiedTradeUrl } from './calc'
import type { BossResult, DropRow, KillRecord, PriceMode, RateSource } from './calc'
import { ESTIMATE_SOURCE_LABEL, estimateUrl } from './estimates'
import { useTradePrices } from './use-trade-prices'
import { OWN_RATE_KILLS } from './calc'

const props = defineProps<{
  config: BossRunsWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Boss runs'
  props.config.anchor = popupAnchor()
  props.config.selected = BOSSES[0].id
  props.config.sort = 'hour'
  props.config.tier = 'all'
  props.config.runSeconds = {}
  props.config.rates = {}
  props.config.extraDrops = {}
  props.config.kills = {}
  props.config.ownEntry = false
  props.config.plannedRuns = 0
  props.config.dropToggles = {}
  props.config.priceModes = {}
  props.config.customPrices = {}
  wm.show(props.config.wmId)
}
// Fields added after the first version of this widget.
props.config.plannedRuns ??= 0
props.config.dropToggles ??= {}
props.config.priceModes ??= {}
props.config.customPrices ??= {}

const tierOptions = [{ value: 'all', label: 'All' }, { value: 'uber', label: 'Uber' }, { value: 'pinnacle', label: 'Normal' }]
const sortOptions = [{ value: 'hour', label: 'Per hour' }, { value: 'run', label: 'Per run' }, { value: 'safe', label: 'Safest' }]

const prices = usePriceIndex()
const divine = computed(() => prices.snapshot.value?.divine ?? null)
const tradePrices = useTradePrices()
const px = computed(() => {
  const league = prices.snapshot.value?.league ?? ''
  return priceResolver(prices.snapshot.value?.items ?? [], name => tradePrices.get(league, name))
})

// Trade lookups only while this panel is on screen.
const onScreen = computed(() => props.config.wmWants === 'show' && wm.active.value)
const wantedKey = computed(() => tradeWanted(BOSSES, props.config.selected, props.config, px.value).join('\n'))
watch([onScreen, () => prices.snapshot.value?.league, divine, wantedKey], ([show, league, rate, key]) => {
  // The queries use English names, which the regional trade sites won't match.
  if (!show || !league || !rate || poeWebApi() !== 'www.pathofexile.com') {
    tradePrices.stop()
    return
  }
  tradePrices.request(league, rate, key ? key.split('\n') : [])
}, { immediate: true })

const results = computed(() => BOSSES
  .filter(b => props.config.tier === 'all' || b.tier === props.config.tier)
  .map(b => evaluateBoss(b, props.config, px.value)))

const luckById = computed(() => new Map(results.value.filter(r => r.ready).map(r => [r.boss.id, luck(r)])))

const ranked = computed(() => {
  const withData = results.value.filter(r => r.ready)
  const key = (r: BossResult) => props.config.sort === 'run'
    ? r.profit
    : props.config.sort === 'safe'
      ? (luckById.value.get(r.boss.id)?.beatEntry ?? 0)
      : r.perHour
  withData.sort((a, b) => key(b) - key(a))
  return {
    good: withData.filter(r => r.profit >= 0),
    losing: withData.filter(r => r.profit < 0),
    noData: results.value.filter(r => !r.ready)
  }
})

// Bosses this arena can hold (shared/zone.ts), across every tier.
const zone = useZone()
const arenaBosses = computed(() => {
  const ids = zone.kind === 'boss' ? arenaBossIds(zone.areaId, zone.name) : []
  return bossesAtLevel(BOSSES.filter(b => ids.includes(b.id)), zone.areaLevel).map(b => evaluateBoss(b, props.config, px.value))
})

const CARD_DROPS = 8

// Keeps your pick when it's one of this arena's bosses (normal or uber), else
// the first with a drop list.
// The tier filter must not hide the boss the icon opened.
function openArenaBoss () {
  const here = arenaBosses.value
  if (!here.length) return
  const pick = here.find(r => r.boss.id === props.config.selected) ??
    here.find(r => r.drops.length) ?? here[0]
  props.config.selected = pick.boss.id
  if (props.config.tier !== 'all' && props.config.tier !== pick.boss.tier) props.config.tier = 'all'
  tab.value = 'drops'
}

const sel = computed(() => results.value.find(r => r.boss.id === props.config.selected) ?? results.value[0] ?? null)
const lk = computed(() => sel.value ? luckById.value.get(sel.value.boss.id) ?? null : null)

const tab = shallowRef<'drops' | 'kills' | 'rates'>('drops')
watch(() => props.config.selected, () => { logging.value = null })

function subline (r: BossResult) {
  const l = luckById.value.get(r.boss.id)
  const parts = [formatRunTime(r.runSeconds)]
  if (l) parts.push(`${Math.round(l.beatEntry * 100)}% of runs beat entry`)
  return parts.join(' · ')
}

function pct (chance: number) {
  const p = chance * 100
  return p >= 10 ? `${p.toFixed(1)}%` : `${p.toFixed(2)}%`
}

function rateTitle (src: RateSource) {
  return { custom: 'my rate', community: 'community', mine: 'my kills', estimate: 'estimate', none: 'unknown' }[src]
}

function short (name: string | null) {
  return (name ?? '').replace(/ Support$/, '')
}

function entryPrice (name: string, qty: number) {
  const p = px.value.price(name)
  return p == null ? null : p * qty
}

function setRunTime (id: string, text: string, e: Event) {
  const s = parseRunTime(text)
  if (s) props.config.runSeconds[id] = s
  else (e.target as HTMLInputElement).value = formatRunTime(sel.value!.runSeconds)
}

function setRate (id: string, drop: string, text: string) {
  const n = Number(text)
  const rest = Object.fromEntries(Object.entries(props.config.rates[id] ?? {}).filter(([name]) => name !== drop))
  if (text.trim() !== '' && Number.isFinite(n) && n >= 0) rest[drop] = Math.min(n, 100) / 100
  props.config.rates[id] = rest
}

const dropQuery = shallowRef('')
const dropResults = computed(() => prices.search(dropQuery.value))
function addDrop (id: string, name: string, variant?: string) {
  const list = props.config.extraDrops[id] ?? (props.config.extraDrops[id] = [])
  if (!list.some(d => d.name === name)) list.push({ name, variant })
  dropQuery.value = ''
}

// Rare drops and high-variance prices
const editing = shallowRef<string | null>(null)
const editingRow = computed(() => sel.value?.drops.find(d => d.name === editing.value && d.priceMode) ?? null)
const modeOptions = [{ value: 'unid', label: 'Unidentified' }, { value: 'median', label: 'poe.ninja' }, { value: 'custom', label: 'My price' }]

function modeLabel (d: DropRow) {
  if (d.priceMode === 'unid' && d.priceSource !== 'trade') return tradePrices.pending(d.name) ? '…' : 'ninja'
  return { unid: 'unid', min: 'cheapest', median: 'ninja', custom: 'my price' }[d.priceMode!]
}
function spreadTitle (d: DropRow) {
  const ask = 'Click to choose how to price it.'
  if (d.priceMode === 'unid' && d.listings != null) return `Middle of the cheapest 10 of ${d.listings} unidentified instant buyouts on trade. ${ask}`
  if (d.priceMode === 'unid') return tradePrices.pending(d.name) ? `Looking up unidentified listings on trade. Showing poe.ninja until then. ${ask}` : `No unidentified trade price right now, so this is poe.ninja. ${ask}`
  if (!d.spread) return `No poe.ninja price. ${ask}`
  return `${d.spread.count} poe.ninja ${d.spread.count === 1 ? 'row' : 'rows'}, ${Math.round(d.spread.min)}c to ${Math.round(d.spread.max)}c. ${ask}`
}
function toggleDrop (id: string, name: string, on: boolean, tooRare: boolean) {
  const rest = Object.fromEntries(Object.entries(props.config.dropToggles[id] ?? {}).filter(([n]) => n !== name))
  // Only store a choice that differs from the planned-runs rule.
  if (on === tooRare) rest[name] = on
  props.config.dropToggles[id] = rest
}
function setMode (name: string, mode: string) {
  props.config.priceModes[name] = mode as PriceMode
}
function setCustomPrice (name: string, text: string) {
  const n = Number(text)
  const rest = Object.fromEntries(Object.entries(props.config.customPrices).filter(([k]) => k !== name))
  if (text.trim() !== '' && Number.isFinite(n) && n >= 0) rest[name] = n
  props.config.customPrices = rest
}
function openUnidSearch (name: string) {
  const league = prices.snapshot.value?.league
  if (!league) return
  window.open(unidentifiedTradeUrl(league, name))
}

// Kill logging
const logging = shallowRef<Record<string, { variant?: string, qty: number }> | null>(null)
const logQuery = shallowRef('')
const logResults = computed(() => prices.search(logQuery.value))

function startLog () {
  logging.value = {}
  tab.value = 'kills'
}
function toggleLogged (name: string, variant?: string) {
  if (!logging.value) return
  const next = Object.fromEntries(Object.entries(logging.value).filter(([n]) => n !== name))
  if (!logging.value[name]) next[name] = { variant, qty: 1 }
  logging.value = next
}
const leagues = useLeagues()
function saveKill () {
  if (!logging.value || !sel.value) return
  const id = sel.value.boss.id
  const list = props.config.kills[id] ?? (props.config.kills[id] = [])
  list.push({
    ts: Date.now(),
    drops: Object.entries(logging.value).map(([name, d]) => ({ name, variant: d.variant, qty: d.qty })),
    league: leagues.selectedId.value ?? undefined
  })
  logging.value = null
}
function killsOf (id: string): KillRecord[] {
  return props.config.kills[id] ?? []
}
const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)

// Item art by name, using poe.ninja's category to pick the right namespace.
const typeByName = computed(() => new Map((prices.snapshot.value?.items ?? []).map(i => [i.name, i.type])))
function art (name?: string) {
  if (!name) return undefined
  return ninjaIcon(typeByName.value.get(name) ?? 'Currency', name) ?? undefined
}

// No "are you sure": delete now, offer Undo (P9).
function deleteKill (id: string, index: number) {
  const before = [...(props.config.kills[id] ?? [])]
  props.config.kills[id] = before.filter((_k, i) => i !== index)
  toast('Kill deleted', { anchor: panel.value?.el, undo: () => { props.config.kills[id] = before } })
}

function isExtraDrop (id: string, name: string) {
  return props.config.extraDrops[id]?.some(d => d.name === name) ?? false
}
function removeDrop (id: string, name: string) {
  const before = [...(props.config.extraDrops[id] ?? [])]
  props.config.extraDrops[id] = before.filter(d => d.name !== name)
  toast(`Removed ${name}`, { anchor: panel.value?.el, undo: () => { props.config.extraDrops[id] = before } })
}

function bossMenu (e: MouseEvent, r: BossResult) {
  const open = (t: typeof tab.value) => () => { props.config.selected = r.boss.id; tab.value = t }
  openMenu(e, [
    { label: 'Log a kill', icon: 'fas fa-plus', action: () => { props.config.selected = r.boss.id; nextTick(startLog).catch(() => {}) } },
    { label: 'Drops', icon: 'fas fa-gem', action: open('drops') },
    { label: 'My kills', icon: 'fas fa-skull', action: open('kills') },
    { label: 'Rates & sources', icon: 'fas fa-percent', action: open('rates') },
    ...(r.boss.source ? [{ label: 'Open drop-rate source', icon: 'fas fa-external-link-alt', action: () => { window.open(r.boss.source!.url) } }] : [])
  ])
}

function killMenu (e: MouseEvent, id: string, index: number) {
  openMenu(e, [{ label: 'Delete kill', icon: 'fas fa-trash', danger: true, action: () => deleteKill(id, index) }])
}
function killValue (kill: KillRecord) {
  return kill.drops.reduce((n, d) => n + (killDropPrice(d, px.value, props.config) ?? 0) * d.qty, 0)
}

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [{
  label: 'Log a kill',
  icon: 'fas fa-plus',
  action: () => {
    openArenaBoss()
    showWithOverlay(wm, props.config.wmId)
    // After the watcher that clears the form when the boss changes.
    nextTick(startLog).catch(() => {})
  }
}])
</script>

<style module>
.layout { display: flex; min-height: 0; height: 34rem; }
.list { width: 16rem; flex: none; border-right: 1px solid var(--w-line); padding-bottom: 8px; }
.detail { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bossName { font-family: var(--w-head); font-size: var(--w-fs-xl); letter-spacing: var(--w-head-track); }
.hero {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 0 var(--w-pad) 8px;
}
.k { font-size: var(--w-fs-xs); text-transform: uppercase; letter-spacing: 0.08em; color: var(--w-faint); }
.big { font-family: var(--w-num); font-size: var(--w-fs-xl); font-weight: 500; display: flex; }
.body { display: flex; flex: 1; min-height: 0; }
.side { width: 15rem; flex: none; padding: 10px var(--w-pad); display: flex; flex-direction: column; gap: 10px; }
.box {
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-md);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kv { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; font-size: var(--w-fs-md); align-items: center; }
.dropGrid { grid-template-columns: 16px minmax(0, 1fr) 62px 104px 72px 48px; }
.off { opacity: 0.45; }
.cardStats { margin-top: 4px; }
.cardDrop { display: grid; grid-template-columns: minmax(0, 1fr) 46px 58px; gap: 6px; align-items: center; }
.editor { padding: 8px var(--w-pad); background: var(--w-panel-2); border-bottom: 1px solid var(--w-line); }
.rateGrid { grid-template-columns: minmax(0, 1fr) 80px 80px 22px; }
.killGrid { grid-template-columns: 74px minmax(0, 1fr) 70px 22px; }
.share { height: 6px; background: var(--w-panel-3); border-radius: var(--w-r-sm); overflow: hidden; }
.share i { display: block; height: 100%; background: var(--w-accent); }
.input {
  height: 24px;
  padding: 0 6px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.input:focus { outline: none; border-color: var(--w-accent); }
</style>
