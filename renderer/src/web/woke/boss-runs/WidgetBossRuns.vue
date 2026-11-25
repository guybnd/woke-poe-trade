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
              <span class="text-right" :title="cardPriceTitle(d)"><WPrice :chaos="d.price" :divine="divine" /></span>
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
        <WChip clickable :active="!!config.skipThin" title="Count drops priced from a thin poe.ninja market as 0, so loot and profit are a floor. Entry costs stay as they are."
          @click="config.skipThin = !config.skipThin"><i class="fas fa-exclamation-circle" /> Skip low confidence</WChip>
        <WChip clickable :active="tradeBusy" title="Look up this boss's jewels as unidentified, and drops poe.ninja doesn't list, on trade. One search every 10 seconds, kept for a week."
          @click="searchTrade"><i :class="tradeBusy ? 'fas fa-spinner fa-spin' : 'fas fa-search'" /> Search trade</WChip>
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
              <span :class="r.profit >= 0 ? 'w-up' : 'w-down'"><WPrice :chaos="config.sort === 'run' ? r.profit : r.perHour" :divine="divine" />{{ config.sort === 'run' ? '' : '/h' }}<span v-if="r.varies.length" class="w-faint" data-varies-mark :title="variesTitle(r)">*</span></span>
            </span>
            <template #sub>{{ subline(r) }}</template>
          </WListItem>
          <div v-if="!ranked.good.length" class="w-faint text-xs" style="padding: 4px var(--w-pad);">Nothing in profit at these prices.</div>
          <template v-if="ranked.losing.length">
            <div class="w-group-label">Losing money</div>
            <WListItem v-for="r in ranked.losing" :key="r.boss.id" :active="r.boss.id === sel?.boss.id" @select="config.selected = r.boss.id" @contextmenu="bossMenu($event, r)">
              <span class="flex justify-between gap-2 w-full min-w-0">
                <span class="flex items-center gap-2 min-w-0"><WIcon :src="art(r.boss.entry[0]?.name)" fallback="fas fa-skull" /><span class="w-trunc">{{ r.boss.name }}</span><WChip v-if="r.estimated" title="Uses estimated drop chances, not measured kills">est.</WChip></span>
                <span class="w-down"><WPrice :chaos="config.sort === 'run' ? r.profit : r.perHour" :divine="divine" />{{ config.sort === 'run' ? '' : '/h' }}<span v-if="r.varies.length" class="w-faint" data-varies-mark :title="variesTitle(r)">*</span></span>
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
          <!-- Rolled uniques with no unidentified price count as 0: one click checks them all (Guy, 2026-11-24). -->
          <div v-if="variesNames.length" class="text-xs w-dim" :class="$style.variesNote" data-testid="boss-varies-note">
            * Leaves out {{ variesNames.length }} unidentified {{ variesNames.length === 1 ? 'unique' : 'uniques' }} with no price yet.
            <button type="button" class="w-accent hover:underline" :disabled="variesBusy" @click="checkVaries">{{ variesBusy ? 'Checking…' : 'Check them' }}</button>
            <span class="w-faint">· 1 trade search each</span>
          </div>
        </div>

        <!-- boss detail -->
        <div v-if="sel" :class="$style.detail">
          <div class="flex items-center gap-2" style="padding: 10px var(--w-pad) 6px;">
            <span :class="$style.bossName" class="grow w-trunc">{{ sel.boss.name }}</span>
            <WChip v-if="sel.boss.source?.kills" :class="sel.boss.source.kills >= 1000 ? 'w-up' : ''">{{ sel.boss.source.kills.toLocaleString() }} community kills</WChip>
            <WChip v-if="sel.kills">{{ sel.kills }} of my kills</WChip>
            <label v-if="isNightmare(sel.boss)" class="flex items-center gap-1 w-dim text-sm" title="Uber fragments the boss drops a kill. More with higher Atlas Drops on the map.">Fragments a kill
              <input class="w-input" :value="fragsPerKill" :class="$style.input" style="width: 3rem;" inputmode="decimal"
                @change="setFragsPerKill(($event.target as HTMLInputElement).value, $event)">
            </label>
            <label class="flex items-center gap-1 w-dim text-sm">Run time
              <input class="w-input" :value="formatRunTime(sel.runSeconds)" :class="$style.input" style="width: 4rem;" title="m:ss, or minutes"
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
                  <div class="w-row w-row--head" :class="$style.dropGrid"><span>Drop</span><span class="text-right">Chance</span><span class="text-right">Price</span><span class="text-right">Per run</span><span>Share</span></div>
                  <template v-for="d in sel.drops" :key="d.name">
                  <!-- A shared profit line (ui/line-item.ts): click the price to
                       set yours, hover for ⊘ leave out and ⋯, right-click for
                       the same menu. A left-out drop stays, struck. -->
                  <div class="w-row w-line" :class="[$style.dropGrid, { 'w-line-out': !d.included }]" tabindex="0" data-boss-drop
                    @contextmenu="dropMenu($event, d)" @keydown="lineKeys($event, dropState(d), dropHandlers(d))">
                    <span v-item-tip="{ name: d.name, type: typeByName.get(d.name) }" class="w-trunc flex items-center gap-1">
                      <WIcon :src="art(d.name)" fallback="fas fa-gem" class="w-line-name" /><span class="w-trunc w-line-name">{{ d.name }}</span><span v-if="d.qty > 1" class="w-dim">×{{ d.qty }}</span>
                      <span v-if="!d.included && !d.tooRare" class="w-line-tag">left out</span>
                      <i v-if="dropThin(d)" class="fas fa-exclamation-circle w-faint" :title="d.priceSource === 'thin' ? `${thinTitle(dropThin(d)!)} Counted as 0 (Skip low confidence).` : thinTitle(dropThin(d)!)" />
                      <WChip v-if="d.tooRare" :title="`Rarer than 1 in ${config.plannedRuns} runs`">rare</WChip>
                    </span>
                    <span class="text-right w-num" :class="d.rateSource === 'community' ? 'w-dim' : d.rateSource === 'none' ? 'w-faint' : d.rateSource === 'estimate' ? '' : 'w-accent'" :style="d.rateSource === 'estimate' ? 'color: var(--w-warn);' : ''" :title="rateTitle(d.rateSource)">{{ d.chance == null ? '?' : (d.rateSource === 'estimate' ? '~' : '') + pct(d.chance) }}</span>
                    <span class="flex items-center justify-end gap-1">
                      <WChip v-if="d.priceMode && pricing !== d.name" clickable :active="d.priceMode === 'custom'" :title="spreadTitle(d)" @click="editing = editing === d.name ? null : d.name">{{ modeLabel(d) }}</WChip>
                      <WChip v-else-if="d.priceSource === 'trade' && pricing !== d.name" :title="`poe.ninja doesn't list this. Price from ${d.listings} instant buyouts on trade.`">trade</WChip>
                      <input v-if="pricing === d.name" :ref="focusBox" v-model="priceDraft" type="number" min="0" step="any" class="w-input px-1 rounded text-right" style="width: 4.6rem;"
                        :aria-label="`Your price for one ${d.name}, in chaos`" title="Your price for one, in chaos. Enter keeps it, Esc cancels"
                        @keydown.enter.prevent="savePrice(d)" @keydown.esc.prevent.stop="pricing = null" @blur="savePrice(d)">
                      <WLineNum v-else :mine="d.priceSource === 'custom'" :out="!d.included" :label="`${d.priceSource === 'custom' ? 'Change my' : 'Set my'} price for ${d.name}`" data-boss-price @edit="startPrice(d)"><WPrice :chaos="d.price" :divine="divine" /></WLineNum>
                    </span>
                    <span class="text-right" :class="{ [$style.struck]: !d.included }"><WPrice :chaos="d.chance == null || d.price == null ? null : d.value" :divine="divine" /></span>
                    <span :class="$style.share"><i :style="{ width: (sel.loot > 0 ? d.value / sel.loot * 100 : 0) + '%' }" /></span>
                    <WLineActs :name="d.name" :out="!d.included" :entries="dropEntries(d)" :head="e => itemMenuHead({ name: d.name, type: typeByName.get(d.name) }, e)" @out="leaveDropOut(d, $event)" />
                  </div>
                  <div v-if="editing === d.name && editingRow" class="flex flex-wrap items-center gap-2 text-sm" :class="$style.editor">
                    <span v-item-tip="{ name: editingRow.name, type: typeByName.get(editingRow.name) }" class="w-accent">{{ editingRow.name }}</span>
                    <span v-if="editingRow.listings != null" class="w-dim">{{ editingRow.listings.toLocaleString() }} unidentified instant buyouts.</span>
                    <span class="flex items-center gap-1 w-dim">poe.ninja <WPrice :chaos="editingRow.spread?.median" :divine="divine" /></span>
                    <WSegmented :model-value="editingRow.priceMode === 'min' ? 'median' : editingRow.priceMode ?? 'median'" :options="modeOptions" @update:model-value="setMode(editingRow.name, $event)" />
                    <label v-if="editingRow.priceMode === 'custom'" class="flex items-center gap-1 w-dim">Price
                      <input class="w-input" type="number" min="0" :class="$style.input" style="width: 5rem;" :value="config.customPrices[editingRow.name] ?? ''" placeholder="chaos"
                        @change="setCustomPrice(editingRow.name, ($event.target as HTMLInputElement).value)">c
                    </label>
                    <WButton size="sm" icon="fas fa-external-link-alt" @click="openUnidSearch(editingRow.name)">Unidentified on trade</WButton>
                  </div>
                  </template>
                  <div v-if="sel.excluded" class="text-xs w-dim" style="padding: 6px var(--w-pad) 0;">{{ sel.excluded }} {{ sel.excluded === 1 ? 'drop' : 'drops' }} left out of the loot<template v-if="config.plannedRuns"> (rarer than 1 in {{ config.plannedRuns }} runs, or switched off)</template>.</div>
                  <div v-if="sel.entryMissing.length" class="text-xs" style="padding: 6px var(--w-pad) 0; color: var(--w-warn);">No price for {{ sel.entryMissing.join(', ') }}. Profit is hidden. <button type="button" class="w-accent hover:underline" @click="config.ownEntry = true">Count the entry as free</button></div>
                  <div class="text-xs w-faint flex items-center gap-2" style="padding: 6px var(--w-pad) 0;">
                    <span v-if="sel.kills >= OWN_RATE_KILLS">Using your own drop rates from {{ sel.kills }} logged kills</span>
                    <span v-else-if="sel.boss.source">Rates: {{ sel.boss.source.label }} · {{ sel.kills }} of {{ OWN_RATE_KILLS }} kills</span>
                    <WInfo v-if="(sel.kills < OWN_RATE_KILLS && sel.boss.source) || sel.unrated" :text="[
                      sel.kills < OWN_RATE_KILLS && sel.boss.source ? `Your own rates take over after ${OWN_RATE_KILLS} logged kills.` : '',
                      sel.unrated ? '? has no known drop rate and counts as 0. Log kills or type a rate under Rates & sources.' : ''
                    ].filter(Boolean).join('\n\n')" />
                  </div>
                  <div v-if="sel.estimated" class="text-xs" style="padding: 6px var(--w-pad) 0; color: var(--w-warn);">~ is an estimated chance ({{ estimateLabel(sel.boss) }}). Loot and profit are rough.</div>
                  <div v-if="sel.varies.length" class="text-xs w-dim" style="padding: 6px var(--w-pad) 0;" data-testid="boss-varies-drops">Unidentified {{ sel.varies.join(', ') }}: price depends on the hidden roll, counted as 0 until checked. <button type="button" class="w-accent hover:underline" @click="searchTrade">Check on trade</button></div>
                  <div v-if="sel.unpriced" class="text-xs" style="padding: 0 var(--w-pad) 6px; color: var(--w-warn);">{{ sel.unpriced }} {{ sel.unpriced === 1 ? 'drop has' : 'drops have' }} no price yet and count as 0.</div>
                </template>
              </template>

              <!-- my kills -->
              <template v-else-if="tab === 'kills'">
                <div v-if="logging" class="flex flex-col gap-2" style="padding: 8px var(--w-pad);">
                  <div class="w-dim text-sm">Tick what this kill dropped.<template v-if="isNightmare(sel.boss)"> Click again for 2 or 3 of one.</template></div>
                  <div class="flex flex-wrap gap-1">
                    <WChip v-for="d in sel.drops" :key="d.name" v-item-tip="{ name: d.name, type: typeByName.get(d.name), variant: d.variant }" clickable :active="!!logging[d.name]" @click="toggleLogged(d.name, d.variant)">{{ d.name }}<template v-if="(logging[d.name]?.qty ?? 0) > 1"> ×{{ logging[d.name].qty }}</template></WChip>
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
                <WEmpty v-else-if="!sel.kills" :art="{ mechanic: 'maven' }">Log each kill's drops. <WInfo text="Bosses without public rates use your own kill rates." /></WEmpty>
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
                    {{ sel.estimated }} {{ sel.estimated === 1 ? 'drop uses' : 'drops use' }} estimated chances, not measured kills: {{ estimateLabel(sel.boss) }}.
                    <a v-if="estimateLink(sel.boss)" :href="estimateLink(sel.boss)!" target="_blank" class="w-accent">Open source ↗</a>
                    <div v-if="isNightmare(sel.boss)">{{ fragsPerKill }} fragments a kill, {{ Math.round(FAVOURED_SHARE * 100) }}% of them from the ones this boss favours, the rest spread over the other uber fragments.</div>
                  </div>
                  <div><WInfo text="Your typed rates win over community rates, then your kill log, then estimates. Prices are from poe.ninja; Search trade prices jewels from unidentified trade listings." /></div>
                </div>
                <div class="w-row w-row--head" :class="$style.rateGrid"><span>Drop</span><span>Source</span><span class="text-right">Chance %</span><span /></div>
                <div v-for="d in sel.drops" :key="d.name" class="w-row" :class="$style.rateGrid">
                  <span v-item-tip="{ name: d.name, type: typeByName.get(d.name), variant: d.variant }" class="w-trunc">{{ d.name }}</span>
                  <span class="w-dim text-xs">{{ rateTitle(d.rateSource) }}</span>
                  <input type="number" min="0" max="100" step="0.01" :class="$style.input" class="w-input text-right"
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
                    <span v-item-tip="{ name: e.name, type: typeByName.get(e.name) }" class="flex items-center gap-1 min-w-0"><WIcon :src="art(e.name)" fallback="fas fa-puzzle-piece" /><span class="w-trunc">{{ e.qty > 1 ? `${e.qty}× ` : '' }}{{ e.name }}</span></span>
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
import { widgetBossRunsSpec } from '../widget-specs'
import type { BossRunsWidget } from './widget'

export default { widget: widgetBossRunsSpec }
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, nextTick, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { thinTitle } from '../market/types'
import { WInfo, WPanel, WTabs, WSegmented, WField, WButton, WEmpty, WPrice, WChip, WListItem, WIcon, WBanner, WSkeleton, WLineActs, WLineNum, lineKeys, lineMenu, lineToast, openMenu, toast, vItemTip } from '../ui'
import type { MenuEntry } from '../ui'
import { itemMenuHead } from '../ui/tooltip/item-menu'
import { ninjaIcon } from '../ui/game-icons'
import { usePriceIndex } from '../market/price-index'
import { useLeagues } from '@/web/background/Leagues'
import { poeWebApi } from '@/web/Config'
import { BOSSES } from './bosses'
import type { Boss } from './bosses'
import { DEFAULT_FRAGMENTS_PER_KILL, FAVOURED_SHARE, isNightmare, nightmareBosses } from './nightmare'
import DockItem from '../dock/DockItem.vue'
import { showWithOverlay } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { arenaBosses as arenaBossIds, useZone } from '../shared/zone'
import { bossesAtLevel, cardDrops, evaluateBoss, formatRunTime, killDropPrice, luck, parseRunTime, priceResolver, tradeWanted, unidentifiedTradeUrl } from './calc'
import type { BossResult, DropRow, KillRecord, PriceMode, RateSource } from './calc'
import { ESTIMATE_SOURCE_LABEL, estimateUrl } from './estimates'
import { useTradePrices } from '../shared/unid-prices'
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

const tierOptions = [{ value: 'all', label: 'All' }, { value: 'uber', label: 'Uber' }, { value: 'pinnacle', label: 'Normal' }, { value: 'nightmare', label: 'Nightmare' }]
const sortOptions = [{ value: 'hour', label: 'Per hour' }, { value: 'run', label: 'Per run' }, { value: 'safe', label: 'Safest' }]

const prices = usePriceIndex()
const divine = computed(() => prices.snapshot.value?.divine ?? null)
const tradePrices = useTradePrices()
const px = computed(() => {
  const league = prices.snapshot.value?.league ?? ''
  return priceResolver(prices.snapshot.value?.items ?? [], name => tradePrices.get(league, name))
})
// The thin poe.ninja row a drop is priced from, if that's where its price came from.
// A drop priced from the spread of its variants is thin only when every
// variant is (Skip low confidence leaves thin ones out of that spread).
function dropThin (d: { name: string, variant?: string, priceSource: string | null, priceMode: string | null }) {
  if (d.priceSource !== 'ninja' && d.priceSource !== 'thin') return null
  if (d.priceMode == null) return px.value.thin(d.name, d.variant)
  return px.value.allThin(d.name) ? px.value.thin(d.name) : null
}

// Bosses this arena can hold (shared/zone.ts), across every tier.
const zone = useZone()
const arenaBosses = computed(() => {
  const ids = zone.kind === 'boss' ? arenaBossIds(zone.areaId, zone.name) : []
  return bossesAtLevel(BOSSES.filter(b => ids.includes(b.id)), zone.areaLevel).map(b => evaluateBoss(b, props.config, px.value))
})

// Trade lookups only on a click (Search trade): the opened boss's rolled
// jewels and drops poe.ninja lacks. Until then, and on the icon's card,
// poe.ninja's price stands, or a trade price looked up earlier.
const onScreen = computed(() => props.config.wmWants === 'show' && wm.active.value)
const tradeNames = computed(() => sel.value ? tradeWanted([sel.value.boss], sel.value.boss.id, props.config, px.value) : [])
const tradeBusy = computed(() => tradeNames.value.some(n => tradePrices.pending(n)))
function searchTrade () {
  const league = prices.snapshot.value?.league
  const rate = divine.value
  // The queries use English names, which the regional trade sites won't match.
  if (poeWebApi() !== 'www.pathofexile.com') { toast('Needs the international trade site'); return }
  if (!league || !rate) return
  if (!tradeNames.value.length) { toast('Nothing to look up for this boss'); return }
  tradePrices.request(league, rate, tradeNames.value)
}
watch(onScreen, (show) => { if (!show) tradePrices.stop() })

// Every shown boss's rolled uniques with no unidentified price yet: their
// estimates leave them out until one click checks them all.
const variesNames = computed(() => [...new Set(results.value.flatMap(r => r.varies))])
const variesBusy = computed(() => variesNames.value.some(n => tradePrices.pending(n)))
function variesTitle (r: BossResult) {
  return `Leaves out ${r.varies.join(', ')}: unidentified, no price until checked on trade.`
}
function checkVaries () {
  const league = prices.snapshot.value?.league
  const rate = divine.value
  if (poeWebApi() !== 'www.pathofexile.com') { toast('Needs the international trade site'); return }
  if (!league || !rate) return
  tradePrices.request(league, rate, variesNames.value)
}

// Nightmare (T17) map bosses depend on the fragments-a-kill setting.
const fragsPerKill = computed(() => props.config.nightmareFrags ?? DEFAULT_FRAGMENTS_PER_KILL)
const allBosses = computed(() => [...BOSSES, ...nightmareBosses(fragsPerKill.value)])
function setFragsPerKill (text: string, e: Event) {
  const n = Number(text.trim().replace(',', '.'))
  const rounded = Math.round(n * 10) / 10
  if (Number.isFinite(rounded) && rounded > 0 && rounded <= 20) props.config.nightmareFrags = rounded
  else (e.target as HTMLInputElement).value = String(fragsPerKill.value)
}
function estimateLabel (boss: Boss) {
  return boss.estimateSource?.label ?? ESTIMATE_SOURCE_LABEL
}
function estimateLink (boss: Boss) {
  return boss.estimateSource?.url ?? estimateUrl(boss.id)
}

const results = computed(() => allBosses.value
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
  if (d.priceMode === 'unid' && d.priceSource !== 'trade') return tradePrices.pending(d.name) ? '…' : 'varies'
  return { unid: 'unid', min: 'cheapest', median: 'ninja', custom: 'my price' }[d.priceMode!]
}
function cardPriceTitle (d: DropRow) {
  if (d.priceMode !== 'unid') return undefined
  if (d.priceSource === 'trade') return `Unidentified: middle of the cheapest 10 of ${d.listings} instant buyouts on trade.`
  return 'Depends on the hidden roll. Open Boss runs to check unidentified copies on trade.'
}
function spreadTitle (d: DropRow) {
  const ask = 'Click to choose how to price it.'
  if (d.priceMode === 'unid' && d.listings != null) return `Middle of the cheapest 10 of ${d.listings} unidentified instant buyouts on trade. ${ask}`
  if (d.priceMode === 'unid') return tradePrices.pending(d.name) ? `Looking up unidentified listings on trade. ${ask}` : `Depends on the hidden roll: no price until Search trade checks unidentified listings. poe.ninja's one price for it is a guess. ${ask}`
  if (!d.spread) return `No poe.ninja price. ${ask}`
  return `${d.spread.count} poe.ninja ${d.spread.count === 1 ? 'row' : 'rows'}, ${Math.round(d.spread.min)}c to ${Math.round(d.spread.max)}c. ${ask}`
}
function toggleDrop (id: string, name: string, on: boolean, tooRare: boolean) {
  const rest = Object.fromEntries(Object.entries(props.config.dropToggles[id] ?? {}).filter(([n]) => n !== name))
  // Only store a choice that differs from the planned-runs rule.
  if (on === tooRare) rest[name] = on
  props.config.dropToggles[id] = rest
}
// A drop as a shared profit line (ui/line-item.ts). Leave out is the old
// On box; your price is My price (any drop, not just rolled ones).
function leaveDropOut (d: DropRow, out: boolean) {
  const id = sel.value?.boss.id
  if (!id) return
  toggleDrop(id, d.name, !out, d.tooRare)
  lineToast(out ? 'out' : 'in', d.name, () => { toggleDrop(id, d.name, out, d.tooRare) })
}
// A plain drop keeps no price mode: your price alone wins (calc.ts dropPrice).
// A rolled one (with the price strip) goes to My price, and back to
// poe.ninja's, as the menu says.
function setMyDropPrice (d: DropRow, chaos: number | null) {
  const custom = Object.fromEntries(Object.entries(props.config.customPrices).filter(([k]) => k !== d.name))
  if (chaos != null) custom[d.name] = chaos
  props.config.customPrices = custom
  if (d.priceMode != null) props.config.priceModes = { ...props.config.priceModes, [d.name]: chaos != null ? 'custom' : 'median' }
}
const pricing = shallowRef<string | null>(null)
const priceDraft = shallowRef<string | number>('')
let priceOpened = ''
function startPrice (d: DropRow) {
  priceDraft.value = priceOpened = d.price != null && d.price > 0 ? String(Number(d.price.toPrecision(6))) : ''
  pricing.value = d.name
}
const focusBox = (el: unknown) => { if (el instanceof HTMLInputElement && document.activeElement !== el) { el.focus(); el.select() } }
function savePrice (d: DropRow) {
  if (pricing.value !== d.name) return
  pricing.value = null
  const text = String(priceDraft.value).trim()
  const n = Number(text)
  if (text === priceOpened || text === '' || !Number.isFinite(n) || n < 0) return
  setMyDropPrice(d, n)
}
const dropState = (d: DropRow) => ({ out: !d.included, edited: d.priceSource === 'custom' })
const dropHandlers = (d: DropRow) => ({
  edit: () => { startPrice(d) },
  reset: () => { setMyDropPrice(d, null) },
  out: (on: boolean) => { leaveDropOut(d, on) }
})
const dropEntries = (d: DropRow): MenuEntry[] => lineMenu(dropState(d), dropHandlers(d), { edit: d.priceSource === 'custom' ? 'Change my price…' : 'Set my price…', reset: "Back to poe.ninja's price" })
function dropMenu (e: MouseEvent, d: DropRow) {
  if ((e.target as Element).closest('input')) return
  openMenu(e, dropEntries(d), itemMenuHead({ name: d.name, type: typeByName.value.get(d.name) }, e) ?? undefined)
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
// A Nightmare boss can drop several of one fragment: clicks count 1, 2, 3, then off.
function toggleLogged (name: string, variant?: string) {
  if (!logging.value) return
  const had = logging.value[name]
  const next = Object.fromEntries(Object.entries(logging.value).filter(([n]) => n !== name))
  if (!had) next[name] = { variant, qty: 1 }
  else if (sel.value && isNightmare(sel.value.boss) && had.qty < 3) next[name] = { ...had, qty: had.qty + 1 }
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
.k { font-size: var(--w-fs-caps); text-transform: var(--w-caps-case); letter-spacing: 0.08em; color: var(--w-faint); font-family: var(--w-caps-face); }
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
.dropGrid { grid-template-columns: minmax(0, 1fr) 62px 104px 72px 48px; }
/* Each cell on row 1 by hand: the hover actions share the drop's name cell,
   clear of the price you click. */
.dropGrid > :nth-child(1) { grid-area: 1 / 1; } .dropGrid > :nth-child(2) { grid-area: 1 / 2; } .dropGrid > :nth-child(3) { grid-area: 1 / 3; } .dropGrid > :nth-child(4) { grid-area: 1 / 4; } .dropGrid > :nth-child(5) { grid-area: 1 / 5; }
/* Hovered, the name makes room for them: its ! and chips stay readable. */
.dropGrid:hover > :nth-child(1), .dropGrid:focus-within > :nth-child(1) { padding-right: 3.6em; }
.dropGrid > :global(.w-line-acts) { position: relative; top: auto; transform: none; grid-area: 1 / 1; justify-self: end; }
.struck { text-decoration: line-through; color: var(--w-dim); }
.cardStats { margin-top: 4px; }
.cardDrop { display: grid; grid-template-columns: minmax(0, 1fr) 46px 58px; gap: 6px; align-items: center; }
.editor { padding: 8px var(--w-pad); background: var(--w-panel-2); border-bottom: 1px solid var(--w-line); }
.rateGrid { grid-template-columns: minmax(0, 1fr) 80px 80px 22px; }
.killGrid { grid-template-columns: 74px minmax(0, 1fr) 70px 22px; }
.share { height: 6px; background: var(--w-panel-3); border-radius: var(--w-r-sm); overflow: hidden; }
.share i { display: block; height: 100%; background: var(--w-accent); }
.variesNote { padding: 6px var(--w-pad); }
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
