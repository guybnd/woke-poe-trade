<template>
  <WPanel size-key="net-worth" :title="config.wmTitle || 'Net worth'" icon="divine" width="44rem" max-height="85vh"
    :hotkey="config.hotkey" :busy="view === 'sales' ? salesReading : view === 'listed' ? pendingReading : status?.running === true" :stale="view === 'sales' ? !!salesError : view === 'listed' ? false : !!status?.error && !!v">
    <template #actions>
      <!-- The read's age is in the footer: beside the title it ran into the game look's plaque. -->
      <WButton v-if="view === 'listed'" size="sm" icon="fas fa-sync-alt" :disabled="pendingReading || !salesLeague" title="Read your Faustus listings: one trade search" @click="refreshListed">Refresh</WButton>
      <WButton v-else-if="view === 'sales'" size="sm" icon="fas fa-sync-alt" :disabled="salesReading" :title="salesReadLine ? `Sales ${salesReadLine}` : undefined" @click="refreshSales">Refresh</WButton>
      <WButton v-else size="sm" icon="fas fa-sync-alt" :disabled="status?.running || showPicker" :title="readLine ? `Stash ${readLine}` : undefined" @click="refresh">Refresh</WButton>
      <WButton v-if="view !== 'sales' && view !== 'listed'" size="sm" variant="ghost" icon="fas fa-layer-group" title="Choose which tabs to read" aria-label="Choose which tabs to read" :disabled="!status?.account || status?.running" @click="picking = true" />
      <WButton size="sm" variant="ghost" icon="fas fa-sliders-h" title="Sections to show" aria-label="Sections to show" @click="openSections" />
    </template>
    <!-- Your stash or your sales (pick C), as window tabs: in the title bar the
         switch ran under the game look's title plaque. -->
    <template #tabs>
      <WTabs v-model="view" :options="VIEW_OPTIONS" />
    </template>
    <template v-if="view === 'sales' && salesError" #banner>
      <WBanner :tone="salesError?.kind === 'rate-limited' ? 'warn' : 'error'">{{ salesErrorLine }}</WBanner>
    </template>
    <template v-else-if="view !== 'sales' && view !== 'listed' && status?.error && !showPicker" #banner>
      <WBanner :tone="status?.error?.kind === 'rate-limited' ? 'warn' : 'error'">{{ errorLine }}</WBanner>
    </template>

    <!-- Listed at Faustus and not sold yet (pending.ts, pick B). -->
    <div v-if="view === 'listed'" :class="$style.body">
      <WEmpty v-if="!salesLeague" icon="fas fa-store">Pick a league under Settings › Game & league.</WEmpty>
      <ListedView v-else :league="salesLeague" :divine="divine" :stale-days="config.staleDays" :auto="config.listedAuto !== false"
        @stale-days="config.staleDays = $event" @auto="config.listedAuto = $event" />
      <div class="w-dim text-xs" :class="$style.foot">
        <span>Listings show as of your last read · sold items drop off by themselves</span>
        <span><template v-if="listedReadLine">Listings {{ listedReadLine }} · </template>poe.ninja · {{ ninjaAge }}</span>
      </div>
    </div>
    <div v-else-if="view === 'sales'" :class="$style.body">
      <WEmpty v-if="!status?.account && !sales.length" icon="fas fa-coins">Sign in under Settings › Game & league, then press Refresh.</WEmpty>
      <SalesView v-else :divine="divine" :range="config.salesRange" @range="config.salesRange = $event" :sort="config.salesSort" @sort="config.salesSort = $event" />
      <div class="w-dim text-xs" :class="$style.foot">
        <span>pathofexile.com sends your last 100 sales; older ones stay here once read</span>
        <span><template v-if="salesReadLine">Sales {{ salesReadLine }} · </template>poe.ninja · {{ ninjaAge }}</span>
      </div>
    </div>
    <div v-else-if="view === 'runs' && v && runLeague" :class="$style.body">
      <RunsView :league="runLeague" :divine="divine" :points="ledger.points" :diffs="ledger.diffs" :lines="v.lines" :tips="tips" :from="runFrom" @clear-from="runFrom = null" />
    </div>
    <TabPicker v-else-if="showPicker" :key="status?.league ?? ''" :can-cancel="!needsPick" :remove-only="status?.skipped ?? 0" :running="status?.running === true" @done="onPicked" />
    <WEmpty v-else-if="!v && !status?.lastReadAt" icon="fas fa-box-open">
      {{ status?.running ? `Stash ${readLine}` : status?.account ? 'Not read yet. Press Refresh.' : 'Sign in under Settings › Game & league, then press Refresh.' }}
    </WEmpty>
    <WEmpty v-else-if="!v" icon="fas fa-hourglass-half">Waiting for poe.ninja prices…</WEmpty>
    <div v-else :class="$style.body">
      <!-- H1: one summary line; the rest folds away under Details -->
      <section :class="$style.summary">
        <span :class="$style.total" class="w-num" :title="totalTitle" data-net-total>{{ div(v.chaos + listedWorth) }}<Coin :chaos="!divine" /></span>
        <span class="w-num" :class="tone(sum?.sinceYesterdayDiv)" :title="todayTip">
          <template v-if="sum?.sinceYesterdayDiv != null">{{ signed(sum.sinceYesterdayDiv) }}<Coin /> today</template><template v-else>— today</template>
        </span>
        <!-- Per hour of play over the window picked under Details. -->
        <span v-if="rateShown.div != null && !(detailsOpen && shown.perHour)" class="w-num" :class="tone(rateShown.div)" :title="rateShown.tip">{{ signed(rateShown.div) }}<Coin :chaos="!divine" />/h <span class="w-dim">{{ rateWindow === 'today' ? 'today' : rateWindow }}</span></span>
        <button v-if="soldToday.count" type="button" class="w-num" :class="$style.soldToday" :title="`${soldToday.count} ${soldToday.count === 1 ? 'sale' : 'sales'} today. Click for the Sales view`" @click="view = 'sales'">Sold {{ div(soldToday.chaos) }}<Coin :chaos="!divine" /> today</button>
        <!-- The box counts your listings in the total or leaves them out
             (remembered; the same switch as Settings). The words open Listed. -->
        <span v-if="listed.count" :class="$style.listedChip" data-listed-chip>
          <input type="checkbox" :checked="countListed"
            :title="countListed ? 'Counted in your total. Click to leave it out' : 'Left out of your total. Click to count it'"
            aria-label="Count Faustus listings in your total" data-count-listed @change="config.countListed = !countListed">
          <button type="button" class="w-num" :class="$style.soldToday" :title="listedTitle" @click="view = 'listed'"><span :class="{ [$style.leftOut]: !countListed }">At Faustus {{ div(listed.worthChaos) }}<Coin :chaos="!divine" /></span><template v-if="listed.stale"> · <span class="w-warn">{{ listed.stale }} stale</span></template></button>
        </span>
        <button v-if="runChip" type="button" class="w-num" :class="[$style.soldToday, tone(runChip.profitChaos)]" :title="`Run ${runChip.name}: ${countLabel(runChip.maps, runChip.fights)}. Click for the Runs view`" data-run-chip @click="view = 'runs'">Run {{ signed(toDiv(runChip.profitChaos)) }}<Coin :chaos="!divine" /></button>
        <WSpark v-if="spark.length > 1 && !(detailsOpen && shown.chart)" :values="spark" :width="90" :height="18" :class="$style.spark" />
        <span v-if="detailsOpen && shown.numbers" :class="$style.holdings" class="w-num text-xs">
          <span :title="inChaos(liquid)"><span :class="$style.caps">Liquid</span> {{ div(liquid) }}<Coin :chaos="!divine" /></span>
          <span v-if="best" class="w-trunc" :title="inChaos(best.chaos)"><span :class="$style.caps">Best</span> <span v-item-tip="lineTip(best, best.count)">{{ best.name }}</span> {{ div(best.chaos) }}<Coin :chaos="!divine" /></span>
          <span v-if="session" :class="tone(session.div)"><span :class="$style.caps">Session</span> {{ signed(session.div) }}<Coin :chaos="!divine" /></span>
        </span>
        <button v-if="anyDetails" type="button" :class="$style.toggle" :aria-expanded="detailsOpen" @click="config.detailsOpen = !detailsOpen">
          Details <i :class="detailsOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />
        </button>
      </section>

      <template v-if="detailsOpen && anyDetails">
        <!-- Two halves: the chart | per hour of play (H), with what each colour
             of the time bar is under it. -->
        <section v-if="shown.chart || shown.perHour" ref="topEl" :class="[$style.halves, { [$style.one]: !(shown.chart && shown.perHour) }]" :style="halvesStyle">
          <section v-if="shown.chart" :class="$style.chartBlock">
            <div v-if="fold.chart" :class="$style.chartHead">
              <button type="button" :class="$style.foldHead" :aria-expanded="false" title="Open the chart" @click="flipFold('chart')"><i class="fas fa-chevron-right" /><span :class="$style.caps">Chart</span></button>
            </div>
            <div v-else :class="$style.chartHead">
              <button type="button" :class="$style.fold" :aria-expanded="true" title="Fold the chart" aria-label="Fold the chart" @click="flipFold('chart')"><i class="fas fa-chevron-down" /></button>
              <TextTabs v-model="chartMode" :options="MODE_OPTIONS" />
              <span v-if="goal" class="text-xs" :class="$style.goalLine">
                {{ goal.name || 'Goal' }}: {{ fmt(goal.div) }}<Coin /> ·
                <template v-if="eta.reached">reached</template>
                <template v-else-if="eta.days != null">about {{ etaText(eta.days) }}</template>
                <template v-else>no ETA yet</template>
              </span>
              <span :class="$style.chartRight">
                <!-- Maps behind the line (pick D): off until switched on. -->
                <button v-if="chartMode === 'total' && farming?.runs.length" type="button" :class="[$style.mapsBtn, { [$style.mapsOn]: mapsOn }]" :aria-pressed="mapsOn"
                  :title="mapsOn ? 'Hide your maps behind the line' : 'Show your maps behind the line'" data-chart-maps @click="config.chartMaps = !mapsOn">Maps</button>
                <TextTabs v-model="range" :options="RANGE_OPTIONS" />
              </span>
            </div>
            <LedgerChart v-if="!fold.chart" ref="chartComp" :series="series" :mode="chartMode as 'total' | 'category'" :goal-div="chartListed ? goal?.div ?? null : goalStashDiv" :height="shown.perHour ? undefined : chartHShown" :class="{ [$style.chartFill]: shown.perHour }" :style="shown.perHour && chartHShown != null ? { minHeight: chartHShown + 'px' } : undefined" :tip-of="(name, count) => tipFor(tips, null, name, count)" :spend-action="chartSpendAction" :sales="chartSales" :listed="chartListed" :maps="chartMaps" :run-from="!liveRun" :run-start-at="liveRun?.startAt ?? null" @spend="onChartSpend" @run="onChartRun" />
            <div v-if="chartMode === 'category' && !fold.chart" :class="$style.legend">
              <span v-for="c in CATEGORIES" :key="c.id"><i :style="{ background: CAT_COLOUR[c.id] }" />{{ c.label }}</span>
            </div>
            <!-- What each mark on the line is (Guy, 2026-11-24). -->
            <div v-if="chartMode === 'total' && !fold.chart && chartLegend.length" :class="$style.legend" data-chart-legend>
              <span v-for="l in chartLegend" :key="l.id" :title="l.tip"><i :class="[$style.key, $style['key-' + l.id]]" />{{ l.label }}</span>
            </div>
            <SplitHandle v-if="!fold.chart" dir="y" @start="startDrag" :style="{ top: '100%' }" title="Drag to change the chart's height · double-click to reset" @move="dragChartH" @end="saveLayout" @reset="resetLayout('chartH')" />
          </section>
          <div v-if="shown.perHour" :class="$style.box">
            <div v-if="fold.perHour" :class="$style.boxHead">
              <button type="button" :class="$style.foldHead" :aria-expanded="false" title="Open Per hour" @click="flipFold('perHour')"><i class="fas fa-chevron-right" /><span :class="$style.caps">Per hour</span></button>
              <b class="w-num" :class="tone(rateShown.div)" :title="rateShown.tip"><template v-if="rateShown.div != null">{{ signed(rateShown.div) }}<Coin :chaos="!divine" />/h</template><template v-else>—</template></b>
            </div>
            <div v-else :class="$style.boxHead">
              <button type="button" :class="$style.fold" :aria-expanded="true" title="Fold Per hour" aria-label="Fold Per hour" @click="flipFold('perHour')"><i class="fas fa-chevron-down" /></button>
              <TextTabs v-model="rateWindow" :options="WINDOW_OPTIONS" />
              <RateTimePick :class="$style.rateTime" />
            </div>
            <div v-if="!fold.perHour" :class="$style.tiles">
              <div><span :class="$style.caps">Per hour</span><b :class="[$style.bigRate, tone(rateShown.div)]" class="w-num" :title="rateShown.tip" data-rate-big><template v-if="rateShown.div != null">{{ signed(rateShown.div) }}<Coin :chaos="!divine" />/h</template><template v-else-if="rateShown.r.hubOnly">No maps</template><template v-else>—</template></b></div>
              <div><span :class="$style.caps">Maps</span><b class="w-num">{{ rateShown.r.maps }}</b></div>
              <div title="The middle map's time: short visits barely move it"><span :class="$style.caps">Median map</span><b class="w-num">{{ rateShown.r.medianMapMs != null ? shortSpan(rateShown.r.medianMapMs) : '—' }}</b></div>
              <div :title="playedTip"><span :class="$style.caps">Played</span><b class="w-num">{{ span(rateShown.r.playMs) }}</b></div>
            </div>
            <!-- Time with no map (crafting, selling) and sales: apart from the rate. -->
            <div v-if="!fold.perHour && hubRow" :class="[$style.tiles, $style.hubTiles]" data-hub-row>
              <div title="Hideout and town time with no map between two stash reads: crafting, trading. Not in the per hour"><span :class="$style.caps">Hideout</span><b class="w-num">{{ span(hubRow.ms) }}</b></div>
              <div :title="hubRow.soldTip"><span :class="$style.caps">Sold</span><b class="w-num" :class="tone(hubRow.soldChaos)">{{ hubRow.soldChaos ? signed(toDiv(hubRow.soldChaos)) : '0' }}<Coin :chaos="!divine" /></b></div>
              <div title="What the stash did in that hideout time: orbs used, sales collected, things bought"><span :class="$style.caps">Stash in hideout</span><b class="w-num" :class="tone(hubRow.hubChaos)">{{ signed(toDiv(hubRow.hubChaos)) }}<Coin :chaos="!divine" /></b></div>
              <div title="The stash's whole change in the window, maps and hideout"><span :class="$style.caps">Net</span><b class="w-num" :class="tone(hubRow.netChaos)">{{ signed(toDiv(hubRow.netChaos)) }}<Coin :chaos="!divine" /></b></div>
            </div>
            <template v-if="splitTotal > 0 && !fold.perHour">
              <div :class="[$style.split, { [$style.splitPick]: splitLabel }]" @mouseleave="pickSplit(null)">
                <span v-for="(x, i) in splitParts" :key="x.id" :class="[$style[x.id], { [$style.segOn]: splitPick === x.id, [$style.segFirst]: i === 0, [$style.segLast]: i === splitParts.length - 1 }]" :style="{ flexGrow: x.ms }" @mouseenter="pickSplit(x.id)" />
                <span v-if="splitLabel" :class="$style.splitLabel" class="w-num" :style="splitLabel.style">{{ splitLabel.text }}</span>
              </div>
              <div :class="[$style.legend, $style.timeLegend]" @mouseleave="pickSplit(null)">
                <span v-for="x in splitParts" :key="x.id" :title="`${x.label}: ${pct(x.ms)}`" @mouseenter="pickSplit(x.id)"><i :class="$style[x.id]" />{{ x.short }} {{ span(x.ms) }}</span>
              </div>
            </template>
          </div>
          <SplitHandle v-if="shown.chart && shown.perHour" dir="x" :style="{ left: topEdge }" title="Drag to resize · double-click to reset" @start="startDrag" @move="dragTopEdge" @end="saveLayout" @reset="resetLayout('half')" />
        </section>

        <section v-if="showChanges || showSide" ref="colsEl" :class="[$style.cols, { [$style.colsFixed]: midFixed }]" :style="{ gridTemplateColumns: colsTemplate, height: midFixed ? midHShown + 'px' : undefined }">
          <div v-if="showChanges" :class="$style.changesCol">
            <div :class="$style.colHead">
              <button type="button" :class="$style.foldHead" :aria-expanded="!fold.changes" :title="fold.changes ? 'Open' : 'Fold'" @click="flipFold('changes')"><i :class="fold.changes ? 'fas fa-chevron-right' : 'fas fa-chevron-down'" /><span :class="$style.caps">{{ session ? `Session · ${duration(session.ms)} · ${session.maps} maps` : 'Since last refresh' }}</span></button>
              <b v-if="session" class="w-num" :class="tone(session.div)" :title="session.tip">{{ signed(session.div) }}<Coin :chaos="!divine" /><template v-if="session.perHour != null"> · {{ fmt(session.perHour) }}<Coin :chaos="!divine" />/h</template></b>
              <span v-if="session && session.spent > 0" :class="$style.spendNote" class="w-num" title="Purchases in this session: left out of its profit">spent {{ div(session.spent) }}<Coin :chaos="!divine" /></span>
            </div>
            <!-- The newest groups; the two latest open, the rest one row each. The
                 list scrolls inside, never stretching the window. -->
            <div v-if="!fold.changes" :class="$style.scrollBox">
              <div :class="$style.scroll">
                <div v-for="(g, i) in groups.slice(0, groupLimit)" :key="g.key" :class="$style.group">
                  <button type="button" :class="$style.groupHead" :aria-expanded="groupOpen(g.key, i)" @click="toggleGroup(g.key, i)">
                    <i :class="groupOpen(g.key, i) ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />
                    <span class="w-trunc">{{ g.title }}<template v-if="!groupOpen(g.key, i)"> · {{ g.lines.length }} {{ g.lines.length === 1 ? 'change' : 'changes' }}</template><span v-if="spendRows(g).some(r => r.spent)" :class="$style.spendChip" title="A purchase: it counts 0 toward profit per hour and the session">purchase</span><span v-if="groupSales(g).sales.length" :class="$style.saleChip" title="Items sold on pathofexile.com in this refresh">sale</span></span>
                    <b class="w-num" :class="tone(g.netChaos)" :title="inChaos(g.netChaos)">{{ signed(toDiv(g.netChaos)) }}<Coin :chaos="!divine" /></b>
                  </button>
                  <template v-if="groupOpen(g.key, i)">
                    <!-- A sale takes the place of its item's removed line (sales.ts). -->
                    <div v-for="s in groupSales(g).sales" :key="'sale' + s.id" :class="$style.feedRow">
                      <img v-if="s.icon" :src="s.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />
                      <span v-item-tip="saleTip(s)" class="w-trunc">Sold {{ saleName(s) }}</span>
                      <span class="w-num" :class="$style.saleNum" :title="saleTitle(s)">{{ salePrice(s) }}<Coin v-if="saleChaosOf(s) != null" :chaos="!divine" /></span>
                    </div>
                    <div v-for="l in groupSales(g).lines.slice(0, 5)" :key="l.dir + l.key" :class="$style.feedRow">
                      <img v-if="l.icon" :src="l.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />
                      <span v-item-tip="tipFor(tips, l.key, l.name, l.count)" class="w-trunc">{{ l.count > 1 ? `${fmt(l.count)} × ` : '' }}{{ l.name }}</span>
                      <span class="w-num" :class="l.dir === 'add' ? 'w-up' : 'w-down'" :title="inChaos(l.chaos)">{{ l.dir === 'add' ? '+' : '−' }}{{ div(l.chaos) }}<Coin :chaos="!divine" /></span>
                    </div>
                    <div v-if="groupSales(g).lines.length > 5" :class="$style.more">+{{ groupSales(g).lines.length - 5 }} more</div>
                    <div v-for="r in spendRows(g)" :key="'spend' + r.at" :class="$style.spendRow">
                      <span class="w-trunc" :title="r.tip">{{ r.text }}</span>
                      <button type="button" :class="$style.spendBtn" @click="setSpendMark(r.at, r.action.mark)">{{ r.action.label }}</button>
                    </div>
                  </template>
                </div>
                <button v-if="groups.length > groupLimit" type="button" :class="$style.clear" class="text-xs" @click="groupLimit += GROUP_STEP">Show older ({{ groups.length - groupLimit }})</button>
              </div>
            </div>
            <div v-if="session && !fold.changes" :class="$style.sessionFoot">
              <span class="w-dim text-xs">Gains are read when you enter your hideout</span>
              <WButton v-if="session.endable" size="sm" @click="endSession">End session</WButton>
            </div>
          </div>
          <div v-if="showSide" :class="$style.sideCol">
            <div v-if="showSold">
              <div :class="$style.sideHead">
                <button type="button" :class="$style.fold" :aria-expanded="!fold.sold" :title="fold.sold ? 'Open Sold' : 'Fold Sold'" :aria-label="fold.sold ? 'Open Sold' : 'Fold Sold'" @click="flipFold('sold')"><i :class="fold.sold ? 'fas fa-chevron-right' : 'fas fa-chevron-down'" /></button>
                <button type="button" :class="$style.soldHead" title="Open the Sales view" @click="view = 'sales'">
                  <span :class="$style.caps">Sold</span>
                  <span class="w-num text-xs w-dim">today <b :class="$style.saleNum">{{ div(soldToday.chaos) }}</b> · 7 days <b :class="$style.saleNum">{{ div(soldWeek.chaos) }}</b><Coin :chaos="!divine" /></span>
                </button>
              </div>
              <div v-for="s in fold.sold ? [] : recentSales" :key="s.id" :class="$style.moveRow">
                <span :class="$style.moveName"><img v-if="s.icon" :src="s.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" /><span v-item-tip="saleTip(s)" class="w-trunc">{{ saleName(s) }}</span><span v-if="marketOf(s) != null" :class="[$style.saleTag, marketTone(s)]">{{ marketText(marketOf(s)) }}</span></span>
                <span class="w-num" :class="$style.saleNum" :title="saleTitle(s)">{{ salePrice(s) }}<Coin v-if="saleChaosOf(s) != null" :chaos="!divine" /> · {{ clockOf(s.at) }}</span>
              </div>
            </div>
            <div v-if="shown.where">
              <button type="button" :class="[$style.foldHead, $style.sideTitle]" :aria-expanded="!fold.where" :title="fold.where ? 'Open' : 'Fold'" @click="flipFold('where')"><i :class="fold.where ? 'fas fa-chevron-right' : 'fas fa-chevron-down'" /><span :class="$style.caps">Where it is</span></button>
              <button v-for="c in fold.where ? [] : cats" :key="c.id" type="button" :class="[$style.catRow, { [$style.catOn]: cat === c.id }]"
                :aria-pressed="cat === c.id" @click="cat = cat === c.id ? 'all' : c.id">
                <span :class="$style.catName"><img v-if="c.icon" :src="c.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />{{ c.label }}</span><i :style="{ width: c.share * 100 + '%' }" /><b class="w-num" :title="inChaos(c.chaos)">{{ div(c.chaos) }}<Coin :chaos="!divine" /></b>
              </button>
            </div>
            <div v-if="showMoves" :class="$style.movesCol">
              <button type="button" :class="[$style.foldHead, $style.sideTitle]" :aria-expanded="!fold.moves" :title="fold.moves ? 'Open' : 'Fold'" @click="flipFold('moves')"><i :class="fold.moves ? 'fas fa-chevron-right' : 'fas fa-chevron-down'" /><span :class="$style.caps">Price moves today</span></button>
              <div v-for="m in fold.moves ? [] : moves.slice(0, 8)" :key="m.key" :class="$style.moveRow">
                <span :class="$style.moveName"><img v-if="m.icon" :src="m.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" /><span v-item-tip="tipFor(tips, m.key, m.name)" class="w-trunc">{{ m.name }}</span></span>
                <span class="w-num" :class="tone(m.change)" :title="inChaos(m.valueChaos)">{{ signedPct(m.change) }} ({{ signed(toDiv(m.valueChaos)) }}<Coin :chaos="!divine" />)</span>
              </div>
              <div v-if="moves.length > 8 && !fold.moves" :class="$style.more" :title="moves.slice(8).map(moveText).join('\n')">+{{ moves.length - 8 }} more</div>
            </div>
          </div>
          <SplitHandle v-for="(e, i) in colEdges" :key="i" dir="x" :style="{ left: e * 100 + '%' }" @start="startDrag" @move="dragCol(i, $event)" @end="saveLayout" @reset="resetLayout('cols')" />
          <SplitHandle v-if="!midAllFolded" dir="y" :style="{ top: '100%' }" title="Drag to change this row's height · double-click to fit" @start="startDrag" @move="dragMidH" @end="saveLayout" @reset="resetLayout('midH')" />
        </section>
      </template>

      <!-- T1: one line with the tab labels in it; when they don't fit it fades
           out at the right, and the chevron (or the fade) opens them all below -->
      <section v-if="shown.tabs" :class="$style.tabLine">
        <button v-if="tabsOverflow" type="button" :class="$style.toggle" :aria-expanded="expanded" @click="config.tabsOpen = !expanded">
          <i :class="expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" /> Tabs
        </button>
        <span v-else :class="$style.caps">Tabs</span>
        <button type="button" :class="[$style.tabLabel, { [$style.tabOn]: !tabs.length }]" :aria-pressed="!tabs.length" title="Every tab" @click="tabs = []">All tabs</button>
        <div :class="$style.stripBox">
          <div ref="strip" :class="[$style.strip, { [$style.fade]: tabsOverflow && !expanded, [$style.ghost]: expanded }]" :aria-hidden="expanded" @scroll="unscroll">
            <button v-for="t in inlineLabels" :key="t.id" type="button" :class="[$style.tabLabel, { [$style.tabOn]: tabs.includes(t.id) }]" :tabindex="expanded ? -1 : undefined"
              :style="t.colour ? { '--tab-colour': t.colour } : undefined" :aria-pressed="tabs.includes(t.id)" :title="t.title" @click="tabs = toggleTab(tabs, t.id)">
              {{ t.name }}<span :class="$style.tabCount">{{ t.count }}</span>
            </button>
          </div>
          <button v-if="tabsOverflow && !expanded" type="button" :class="$style.fadeHit" title="Show every tab" aria-label="Show every tab" @click="config.tabsOpen = true" />
        </div>
        <span v-if="tabs.length" class="w-num text-xs" :class="$style.picked" :title="inChaos(selectedChaos)">{{ tabs.length }} picked · {{ div(selectedChaos) }}<Coin :chaos="!divine" /></span>
        <span class="w-dim text-xs" :class="$style.synced">{{ tabValues.length }} synced</span>
      </section>
      <section v-if="shown.tabs && expanded" :class="$style.tabLabels">
        <button v-for="t in tabLabels" :key="t.id" type="button" :class="[$style.tabLabel, { [$style.tabOn]: tabs.includes(t.id) }]"
          :style="t.colour ? { '--tab-colour': t.colour } : undefined" :aria-pressed="tabs.includes(t.id)" :title="t.title" @click="tabs = toggleTab(tabs, t.id)">
          {{ t.name }}<span :class="$style.tabCount">{{ t.count }}</span>
        </button>
      </section>

      <section :class="$style.chips">
        <WField v-model="query" type="search" icon="fas fa-search" placeholder="Search items" :class="$style.search" />
        <WChip v-if="cat !== 'all'" clickable active :title="`Only ${catLabel}. Click to show every category`" @click="cat = 'all'">{{ catLabel }} ×</WChip>
        <HideChip v-if="divine" :value="hideBelow" :on="config.hideDivOn === true" :idle="floor.limiting === 'chaos'"
          :title="floor.limiting === 'chaos' ? 'The chaos limit is higher, so it is the one hiding rows' : 'Hide rows worth less in total. Scroll the number or click it to type'"
          @on="config.hideDivOn = $event" @value="config.hideBelowDiv = $event" />
        <HideChip chaos :value="hideBelowChaos" :on="config.hideChaosOn === true" :idle="floor.limiting === 'div'"
          :title="floor.limiting === 'div' ? 'The divine limit is higher, so it is the one hiding rows' : 'Hide rows worth less in total. Scroll the number or click it to type'"
          @on="config.hideChaosOn = $event" @value="config.hideBelowChaos = $event" />
      </section>
      <ItemTable :lines="tableLines" :total="v?.chaos" :units="config.tableUnits" :filtered="cat !== 'all' || tabs.length > 0 || !!query.trim() || floor.minChaos > 0" :divine="divine" :changes="changes" :tab-names="tabNames"
        @units="config.tableUnits = $event" @clear="clearFilters" @price="onPrice" @ignore="onIgnore" />

      <div class="w-dim text-xs" :class="$style.foot">
        <span>
          {{ status?.listed ? `${status.chosen} of ${status.listed}` : sum?.tabs }} tabs
          <template v-if="status?.skipped"> · {{ status.skipped }} remove-only skipped</template>
          <template v-if="v.unpriced"> · {{ v.unpriced }} {{ v.unpriced === 1 ? 'item' : 'items' }} unpriced (rares aren't searched)
            <button type="button" :class="$style.clear" :aria-pressed="showUnpriced" title="List them, to set your own price" @click="showUnpriced = !showUnpriced">{{ showUnpriced ? 'hide' : 'show' }}</button></template>
          <template v-if="hiddenByValue"> · {{ hiddenByValue }} hidden by value
            <button type="button" :class="$style.clear" title="Switch the Hide &lt; limits off" @click="showHidden">show</button></template>
          <template v-if="ignoredCount"> · {{ ignoredCount }} ignored
            <button type="button" :class="$style.clear" :aria-pressed="showIgnored" title="List them, to stop ignoring one" @click="showIgnored = !showIgnored">{{ showIgnored ? 'hide' : 'show' }}</button></template>
        </span>
        <span><template v-if="readLine">Stash {{ readLine }} · </template>poe.ninja · {{ ninjaAge }}</span>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// Net worth, pick A1 "Ledger", decluttered (H1 + T1): one summary line with
// the rest under Details, a thin tab line that opens to the labels, and a
// sections flyout to switch parts off.
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { GOTO_TARGETS } from '../tab-bar/goto-targets'
import { usePoeninja } from '@/web/background/Prices'
import { WBanner, WButton, WChip, WEmpty, WField, WPanel, WSpark, WTabs, openMenu, toast, vItemTip } from '../ui'
import { lineTip, tipFor, tipIndex } from './tips'
import { agoPhrase, formatAmount, nowMinute } from '../ui/format'
import { hostRequest } from '../shared/host'
import { FARMING_TYPE, elapsed, requestEndSession } from '../farming/farming'
import { isWidgetTypeOn } from '../modules'
import { useNights } from '../session-story/store'
import { SESSION_STORY_TYPE } from '../session-story/widget'
import { stashGainsBetween } from './gains'
import type { FarmingWidget } from '../farming/farming'
import { CATEGORIES } from './valuation'
import type { Category } from './valuation'
import { change24h, filterLines, selectedFirst, toggleTab, goalEta, groupByRefresh, groupByRuns, liquidChaos, priceMoves, seriesFor } from './ledger'
import type { ChartRange, PriceMove } from './ledger'
import { divine, gainsNow, historyNow, leagueNow, ledger, ratesAt, setIgnored, setMyPrice, setSpendMark, summary, tabValues, valuation, wantPrices } from './store'
import { markAction, resolveSpends } from './spend'
import type { SpendMark } from './spend'
import type { ChangeGroup } from './ledger'
import { SECTIONS, hideBelowChaosOf, hideBelowOf, sectionOn, setSection, valueFloor } from './widget'
import type { NetWorthWidget, ReaderStatus } from './widget'
import { UNREADABLE } from './tab-picker'
import { RATE_WINDOWS, rateTip, shortSpan, span, startOfDay } from './play-time'
import { chartHOf, clampChartH, clampMidH, colWeights, dragCols, dragTop, edges, foldedOf, hasChartH, midHOf, toggleFold, topOf } from './layout'
import type { ColId, FoldId, PanelLayout } from './layout'
import SplitHandle from './SplitHandle.vue'
import TextTabs from './TextTabs.vue'
import RateTimePick from '../shared/RateTimePick.vue'
import { leftOutText, RATE_TIME_WHERE } from '../shared/rate-time'
import { rateTime } from '../shared/rate-time-now'
import { nightRateMs } from '../session-story/night-rate'
import type { RateWindow } from './play-time'
import LedgerChart from './LedgerChart.vue'
import Coin from './Coin.vue'
import ItemTable from './ItemTable.vue'
import HideChip from './HideChip.vue'
import SalesView from './SalesView.vue'
import ListedView from './ListedView.vue'
import { loadPending, pendingDoc, pendingReading, refreshPending } from './pending-store'
import { listedAt, pendingRows, pendingTotals, rowWorth, DEFAULT_STALE_DAYS } from './pending'
import type { ChartMap, ChartSale } from './chart-marks'
import { listedWorth as listedWorthDoc, listedWorthKey } from './pending-glance'
import RunsView from './RunsView.vue'
import { loadRuns, runGlance, runsDoc } from './run-store'
import { countLabel } from './runs'
import { saleTip } from './sale-tip'
import { inRange, marketText, saleChaos, saleName, salesInWindow, totals, withoutSold } from './sales'
import type { Sale } from './sales'
import { loadSales, marketOf, ninjaPriced, rates as saleRates, sales, salesFailed, salesReading, salesReply } from './sales-store'

const TabPicker = defineAsyncComponent(() => import('./TabPicker.vue'))

const props = defineProps<{
  config: NetWorthWidget
  status: ReaderStatus | null
}>()

onMounted(wantPrices)

const v = valuation
const sum = summary
const ninja = usePoeninja()

const CAT_COLOUR: Record<Category, string> = {
  currency: 'var(--w-r-currency)',
  fragments: 'var(--w-r-normal)',
  cards: 'var(--w-r-divination)',
  gear: 'var(--w-r-unique)',
  other: 'var(--w-faint)'
}
const MODE_OPTIONS = [{ value: 'total', label: 'Total' }, { value: 'category', label: 'By category' }]
const RANGE_OPTIONS = [{ value: '3h', label: '3h' }, { value: '24h', label: '24h' }, { value: '7d', label: '7d' }, { value: 'league', label: 'League' }]

// ---------- the tab picker (WOKEPOET-209) ----------
const picking = shallowRef(false)
const picked = shallowRef(false)
const needsPick = computed(() => {
  const s = props.status
  if (!s?.account || s.running || picked.value) return false
  return s.error?.kind === 'pick-tabs' || (!s.lastReadAt && !s.chosen && !s.error)
})
const showPicker = computed(() => picking.value || needsPick.value)
function onPicked () {
  picking.value = false
  picked.value = true
}
watch(() => props.status?.league, () => { picked.value = false; picking.value = false })

// ---------- numbers ----------
const fmt = (n: number) => formatAmount(n)
// The chaos behind a divine figure, for hover titles.
const inChaos = (chaos: number) => `${formatAmount(Math.round(chaos))} chaos`
const unit = computed(() => divine.value ? 'd' : 'c')
const toDiv = (chaos: number) => divine.value ? chaos / divine.value : chaos
const div = (chaos: number) => {
  const d = toDiv(chaos)
  return d >= 100 ? formatAmount(d) : d >= 1 ? d.toFixed(1) : d.toFixed(2)
}
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n) >= 100 ? formatAmount(Math.abs(n)) : Math.abs(n).toFixed(1)}`
const signedPct = (c: number) => `${c > 0 ? '+' : '−'}${Math.abs(c * 100).toFixed(1)}%`
const tone = (n: number | null | undefined) => n == null || n === 0 ? '' : n > 0 ? 'w-up' : 'w-down'
const duration = (ms: number) => {
  const m = Math.round(ms / 60_000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
const moveText = (m: PriceMove) => `${m.name} ${signedPct(m.change)} (${signed(toDiv(m.valueChaos))} ${unit.value})`
const etaText = (days: number) => days < 1 ? `${Math.max(1, Math.round(days * 24))} h` : days < 60 ? `${Math.round(days)} days` : `${Math.round(days / 30)} months`

const liquid = computed(() => v.value ? liquidChaos(v.value) : 0)
// ---------- per hour of play (last 1, 2, 3 hours) ----------
// Moves with each stash read, zone read and the 30 s clock.
const WINDOW_OPTIONS = [{ value: '1h', label: '1h' }, { value: '2h', label: '2h' }, { value: '3h', label: '3h' }, { value: 'today', label: 'Today' }]
const rateWindow = computed<RateWindow>({
  get: () => WINDOW_OPTIONS.some(o => o.value === props.config.rateWindow) ? props.config.rateWindow! : '1h',
  set: (w) => { props.config.rateWindow = w }
})
const rates = computed(() => ratesAt(now.value))
const playedTip = computed(() => rates.value.withOff ? 'All time, AFK and game closed included' : rates.value.withHub ? 'Time in maps, other areas and hideout' : 'Time in maps and other areas')
const rateAmount = (chaos: number) => `${signed(toDiv(chaos))} ${unit.value}`
const rateShown = computed(() => {
  const r = rates.value[rateWindow.value]
  return { r, div: r.perHour == null ? null : toDiv(r.perHour), tip: rateTip(rateWindow.value, r, rates.value.fromLog, rateAmount, rates.value.withHub, rates.value.withOff) }
})
// Hideout time with no map and the window's sales, shown apart from the rate
// (crafting, trading). Sales count at the time they sold.
const rateFrom = computed(() => { const at = rates.value.at; return rateWindow.value === 'today' ? startOfDay(at) : at - (RATE_WINDOWS.find(w => w.id === rateWindow.value)?.ms ?? 3_600_000) })
const hubRow = computed(() => {
  const r = rateShown.value.r
  const sold = totals(salesInWindow(sales.value, rateFrom.value, rates.value.at), saleRates.value)
  if (r.hubOnlyMs < 60_000 && !sold.count) return null
  return {
    ms: r.hubOnlyMs,
    soldChaos: sold.chaos,
    soldTip: `${sold.count} ${sold.count === 1 ? 'sale' : 'sales'} in the window, counted when they sold. Their currency reaches the stash when you collect it`,
    hubChaos: r.hubChaos,
    netChaos: r.chaos
  }
})
// The window's time by kind, for the bar under the numbers.
const splitParts = computed(() => {
  const r = rateShown.value.r
  return [
    { id: 'map', label: 'Maps', short: 'Maps', ms: r.mapMs },
    { id: 'other', label: 'Other areas (campaign, bosses)', short: 'Other', ms: r.otherMs },
    { id: 'hub', label: 'Hideout and town', short: 'Hideout', ms: r.hubMs },
    { id: 'off', label: 'Closed or AFK', short: 'Off', ms: r.offMs }
  ].filter(x => x.ms >= 60_000)
})
const splitTotal = computed(() => splitParts.value.reduce((s, x) => s + x.ms, 0))
// Hovering a colour (or its legend entry) outlines it and puts its share above it.
const splitPick = shallowRef<string | null>(null)
const pickSplit = (id: string | null) => { splitPick.value = id }
const pct = (ms: number) => { const n = ms / splitTotal.value * 100; return n < 1 ? '<1%' : `${Math.round(n)}%` }
const splitLabel = computed(() => {
  const total = splitTotal.value
  let start = 0
  for (const x of splitParts.value) {
    if (x.id === splitPick.value && total > 0) {
      const mid = (start + x.ms / 2) / total
      const style = mid < 0.2 ? { left: '0' } : mid > 0.8 ? { right: '0' } : { left: `${mid * 100}%`, transform: 'translateX(-50%)' }
      return { text: `${x.short} ${pct(x.ms)}`, style }
    }
    start += x.ms
  }
  return null
})
const todayTip = computed(() => {
  const t = rates.value.today
  return t.perHour == null ? "Since yesterday's last read" : `Since yesterday's last read
Per hour today: ${signed(toDiv(t.perHour))} ${unit.value}/h over ${duration(t.playMs)}, ${leftOutText(rateTime())}`
})
const best = computed(() => v.value?.lines[0] ?? null)

// ---------- sections (⚙ flyout, Settings) and what's open ----------
const shown = computed(() => Object.fromEntries(SECTIONS.map(x => [x.id, sectionOn(props.config, x.id)])) as Record<typeof SECTIONS[number]['id'], boolean>)
const detailsOpen = computed(() => props.config.detailsOpen === true)
const tabsOpen = computed(() => props.config.tabsOpen === true)
function openSections (e: MouseEvent) {
  openMenu(e, SECTIONS.map(x => ({
    label: x.label,
    icon: shown.value[x.id] ? 'fas fa-check-square' : 'far fa-square',
    action: () => { setSection(props.config, x.id, !shown.value[x.id]) }
  })))
}
// Details with every section in it off: no toggle, nothing to open.
// Since last refresh beside Where it is and the price moves (layout D).
// Their widths, the chart's height can be dragged;
// a drag shows a draft and saves once, when it ends.
const showMoves = computed(() => shown.value.moves && moves.value.length > 0)
const showSold = computed(() => shown.value.sold && recentSales.value.length > 0)
const showSide = computed(() => shown.value.where || showMoves.value || showSold.value)
const colIds = computed<ColId[]>(() => [
  showChanges.value ? 'changes' : null,
  showSide.value ? 'side' : null
].filter((x): x is ColId => x != null))
// cols: the columns' weights, for the columns shown when the drag began.
const draft = shallowRef<{ cols?: { ids: ColId[], w: number[] }, chartH?: number, half?: number, midH?: number } | null>(null)
let dragBase: { ids: ColId[], cols: number[], chartH: number, top: number, midH: number } | null = null
const chartH = computed(() => draft.value?.chartH ?? chartHOf(props.config.layout))
// Beside Per hour the chart fills its half until a height is dragged.
const chartHShown = computed(() => draft.value?.chartH != null || hasChartH(props.config.layout) || !shown.value.perHour ? chartH.value : undefined)
const chartComp = shallowRef<{ $el?: HTMLElement } | null>(null)
// The halves: the chart's share of the row.
const top = computed(() => draft.value?.half ?? topOf(props.config.layout))
const halvesStyle = computed(() => shown.value.chart && shown.value.perHour ? { gridTemplateColumns: `minmax(0, ${top.value}fr) minmax(0, ${1 - top.value}fr)` } : undefined)
// The handle sits in the gap between the halves (padding var(--w-pad), gap var(--w-s2)).
const topEdge = computed(() => `calc(var(--w-pad) + (100% - 2 * var(--w-pad) - var(--w-s2)) * ${top.value} + var(--w-s2) / 2)`)
const topEl = shallowRef<HTMLElement | null>(null)
// Folded sections show only their title line.
const fold = computed(() => foldedOf(props.config.layout))
function flipFold (id: FoldId) {
  props.config.layout = { ...props.config.layout, folded: toggleFold(props.config.layout?.folded, id) }
}
// The middle row: a dragged height, its lists scrolling inside. Every
// section in it folded: as short as their titles.
const midAllFolded = computed(() => (!showChanges.value || fold.value.changes) &&
  (!showSold.value || fold.value.sold) && (!shown.value.where || fold.value.where) && (!showMoves.value || fold.value.moves))
const midHShown = computed(() => draft.value?.midH ?? midHOf(props.config.layout))
const midFixed = computed(() => midHShown.value != null && !midAllFolded.value)
const sameIds = (a: readonly ColId[], b: readonly ColId[]) => a.length === b.length && a.every((x, i) => x === b[i])
// A column shown or hidden mid-drag (a read landing) drops that drag's widths.
const weights = computed(() => {
  const c = draft.value?.cols
  return c && sameIds(c.ids, colIds.value) ? c.w : colWeights(props.config.layout, colIds.value)
})
const colsTemplate = computed(() => weights.value.map(w => `minmax(0, ${w}fr)`).join(' '))
const colEdges = computed(() => edges(weights.value))
const colsEl = shallowRef<HTMLElement | null>(null)
// What's on screen when a drag begins: a height not saved yet is measured.
function snapshot () {
  const el = chartComp.value?.$el
  // What's drawn: beside Per hour the chart can be taller than its minimum.
  const chartPx = el instanceof HTMLElement && el.clientHeight > 0 ? el.clientHeight : chartHShown.value ?? chartH.value
  return { ids: [...colIds.value], cols: [...weights.value], chartH: chartPx, top: top.value, midH: midHShown.value ?? colsEl.value?.offsetHeight ?? 200 }
}
function startDrag () {
  draft.value = null
  dragBase = snapshot()
}
function base () {
  dragBase ??= snapshot()
  return dragBase
}
function dragCol (i: number, px: number) {
  const b = base()
  if (!sameIds(b.ids, colIds.value)) return
  draft.value = { ...draft.value, cols: { ids: b.ids, w: dragCols(b.cols, i, px, colsEl.value?.clientWidth ?? 0) } }
}
function dragChartH (px: number) {
  draft.value = { ...draft.value, chartH: clampChartH(base().chartH + px) }
}
function dragTopEdge (px: number) {
  const el = topEl.value
  const cs = el ? getComputedStyle(el) : null
  // The grid tracks' width: the row less its padding and the gap.
  const w = el && cs ? el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - (parseFloat(cs.columnGap) || 0) : 0
  draft.value = { ...draft.value, half: dragTop(base().top, px, w) }
}
function dragMidH (px: number) {
  draft.value = { ...draft.value, midH: clampMidH(base().midH + px) }
}
function saveLayout () {
  const d = draft.value
  dragBase = null
  if (!d) return
  const l: PanelLayout = { ...props.config.layout }
  if (d.chartH != null) l.chartH = d.chartH
  if (d.half != null) l.half = Math.round(d.half * 1000) / 1000
  if (d.midH != null) l.midH = d.midH
  const dc = d.cols
  if (dc) {
    const cols = { ...l.cols }
    dc.ids.forEach((id, i) => { cols[id] = Math.round(dc.w[i] * 1000) / 1000 })
    l.cols = cols
  }
  props.config.layout = l
  draft.value = null
}
function resetLayout (part: keyof PanelLayout) {
  // Left unset, each size falls back to its default (layout.ts).
  props.config.layout = { ...props.config.layout, [part]: undefined }
}
const anyDetails = computed(() => shown.value.chart || shown.value.perHour || shown.value.numbers || shown.value.moves || shown.value.changes || shown.value.where || showSold.value)
// Tab labels switched off: a tab pick nothing shows any more is dropped.
watch(() => shown.value.tabs, (on) => { if (!on) tabs.value = [] })
// "Since last refresh" only when it has something.
const showChanges = computed(() => shown.value.changes && (groups.value.length > 0 || !!session.value))

// ---------- chart ----------
const chartMode = shallowRef('total')
const range = shallowRef<string>('7d')
const series = computed(() => seriesFor(ledger.value.points, historyNow.value.days, range.value as ChartRange, Date.now(), divine.value))
// The summary's tiny line: the last 7 days.
const spark = computed(() => seriesFor(ledger.value.points, historyNow.value.days, '7d', Date.now(), divine.value).map(p => p.div))
const goal = computed(() => props.config.goal && props.config.goal.div > 0 ? props.config.goal : null)
// The At Faustus box: counted listings bring the goal closer, so the chart's
// stash line has that much less to go (the line is drawn there too).
const goalStashDiv = computed(() => goal.value ? Math.max(0, goal.value.div - (divine.value ? listedWorth.value / divine.value : 0)) : null)
const eta = computed(() => goalStashDiv.value != null ? goalEta(seriesFor(ledger.value.points, historyNow.value.days, '7d', Date.now(), divine.value), goalStashDiv.value) : { reached: false, days: null })

// ---------- price moves (D3) ----------
// The item tooltip for any item named here: held ones by their table line.
const tips = computed(() => tipIndex(v.value ? [...v.value.lines, ...v.value.unpricedLines, ...v.value.ignoredLines] : []))

// Your own prices don't move with poe.ninja.
const changes = computed(() => new Map((v.value?.lines ?? []).map(l => [l.key, l.mine || l.heldSince != null ? null : change24h(l.graph)])))
const moves = computed(() => priceMoves(v.value?.lines ?? [], k => changes.value.get(k) ?? null).filter(m => Math.abs(toDiv(m.valueChaos)) >= 0.1))

// ---------- what changed (C2, C1) ----------
// The Farming window's running session, if any: its maps come from Client.txt.
// Its module must be on: off, the window isn't there to end it.
const farmingWidget = computed(() => AppConfig().widgets.find(x =>
  x.wmType === FARMING_TYPE && (x as FarmingWidget).session && isWidgetTypeOn(AppConfig(), x.wmType)) as FarmingWidget | undefined)
// Farming is retired (modules.ts), so the session is usually tonight's night
// from Session story: it starts and ends by itself, with its maps as runs.
const nightStore = useNights()
// The night's time (AFK left out) runs to its last log line; past that, at
// most this much more counts, so a long AFK doesn't drag profit per hour down.
const NIGHT_TAIL_MS = 2 * 60_000
interface PanelSession { startedAt: number, maps: number, runs: Array<{ name: string, enteredAt: number, mapMs: number }>, ms: (now: number) => number, endable: boolean }
const farming = computed<PanelSession | null>(() => {
  const s = farmingWidget.value?.session
  if (s) return { startedAt: s.startedAt, maps: s.maps, runs: s.runs ?? [], ms: now => elapsed(s, now), endable: true }
  const n = isWidgetTypeOn(AppConfig(), SESSION_STORY_TYPE) ? nightStore.live.value : null
  if (!n) return null
  // The time the Per hour choice counts (night-rate.ts), as on the night card.
  return { startedAt: n.startedAt, maps: n.maps.length, runs: n.maps, ms: now => nightRateMs(n, rateTime()) + Math.min(Math.max(0, now - n.endedAt), NIGHT_TAIL_MS), endable: false }
})
// The session's clock moves while you sit in the hideout.
const now = shallowRef(Date.now())
const clock = setInterval(() => { now.value = Date.now() }, 30_000)
onUnmounted(() => { clearInterval(clock) })
// The session's total from every refresh in it (gains.ts keeps them all).
const sessionChaos = shallowRef(0)
// Chaos left out as spent on purchases (spend.ts).
const sessionSpent = shallowRef(0)
// Only its start matters here: the night's object is replaced every minute.
let gainsAsk = 0
watch([() => farming.value?.startedAt, () => ledger.value.points[ledger.value.points.length - 1]?.at, leagueNow, gainsNow], async () => {
  const s = farming.value
  const id = leagueNow.value
  const ask = ++gainsAsk
  const g = s && id ? await stashGainsBetween(id, s.startedAt, Date.now()) : null
  if (ask !== gainsAsk) return
  sessionChaos.value = g?.chaos ?? 0
  sessionSpent.value = g?.spent ?? 0
}, { immediate: true })
const session = computed(() => {
  const s = farming.value
  if (!s) return null
  const ms = s.ms(now.value)
  const divVal = toDiv(sessionChaos.value)
  const tip = s.endable ? 'Per hour of the whole session' : `Per hour, ${leftOutText(rateTime())}. ${RATE_TIME_WHERE}`
  return { div: divVal, ms, maps: s.maps, perHour: ms >= 10 * 60_000 ? divVal / (ms / 3_600_000) : null, spent: sessionSpent.value, endable: s.endable, tip }
})
const gainAt = computed(() => new Map(gainsNow.value.map(g => [g.at, g])))
// Every refresh's share of profit (spend.ts), worked out in time order.
const shares = computed(() => resolveSpends(gainsNow.value))
// The chart's purchase switch for a clicked point, and its click (amount in
// the shown unit: divines, or chaos without a rate).
function chartSpendAction (at: number) {
  const x = gainAt.value.get(at)
  return x ? markAction(x, shares.value.get(at)) : null
}
function onChartSpend (at: number, mark: SpendMark | null, amount?: number) {
  // The chart shows each point at its own read's rate: back to chaos at it.
  const g = gainAt.value.get(at)
  const rate = g?.netDivine && g.netChaos ? g.netChaos / g.netDivine : divine.value
  setSpendMark(at, mark, amount == null ? undefined : rate ? amount * rate : amount)
}
// A group's refreshes that are purchases, cancel one, or lost currency, each
// with its switch. Losses where under 1 div of currency left get none here
// (maps eat scarabs every refresh); the chart offers them all.
function spendRows (g: ChangeGroup) {
  const smallCash = divine.value ?? 150
  return g.reads.flatMap(at => {
    const x = gainAt.value.get(at)
    const r = shares.value.get(at)
    const action = x && markAction(x, r)
    if (!x || !action) return []
    if (!x.mark && !x.auto && !r?.back && !(x.cashChaos != null && x.cashChaos <= -smallCash)) return []
    const spent = r?.spent ?? 0
    const when = g.reads.length > 1 ? `${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}: ` : ''
    const text = spent > 0
      ? `${when}Purchase, ${div(spent)} ${unit.value} not counted`
      : r?.back
        ? `${when}Back from a purchase, ${div(r.back)} ${unit.value} not counted`
        : x.netChaos < 0 ? `${when}Counted as a loss` : `${when}Counted as profit`
    return [{ at, action, spent, text, tip: 'Purchases count 0 toward profit per hour, the session and the session story' }]
  })
}
const groups = computed(() => {
  const s = farming.value
  return s ? groupByRuns(ledger.value.diffs, s.runs, s.startedAt) : groupByRefresh(ledger.value.diffs, ledger.value.diffs.length)
})
// The newest 5 groups, "Show older" adds more; the newest 2 open, the rest
// folded to their header unless clicked.
const GROUP_STEP = 5
const groupLimit = shallowRef(GROUP_STEP)
const groupToggled = shallowRef<Record<string, boolean>>({})
const groupOpen = (key: string, i: number) => groupToggled.value[key] ?? i < 2
function toggleGroup (key: string, i: number) {
  groupToggled.value = { ...groupToggled.value, [key]: !groupOpen(key, i) }
}
// A session starting or ending is a different list.
watch(farming, (now, before) => {
  if (!!now === !!before && now?.startedAt === before?.startedAt) return
  groupLimit.value = GROUP_STEP
  groupToggled.value = {}
})
function endSession () {
  const w = farmingWidget.value
  if (w) requestEndSession(w.wmId)
}

// ---------- categories, tabs, filters ----------
const cat = shallowRef<Category | 'all'>('all')
// Picked tabs (multi); none is every tab.
const tabs = shallowRef<string[]>([])
function clearFilters () {
  cat.value = 'all'
  tabs.value = []
  query.value = ''
  props.config.hideDivOn = false
  props.config.hideChaosOn = false
}
const query = shallowRef('')
const hideBelow = computed(() => hideBelowOf(props.config))
const hideBelowChaos = computed(() => hideBelowChaosOf(props.config))
const floor = computed(() => valueFloor(props.config, divine.value))

const cats = computed(() => {
  const val = v.value
  if (!val) return []
  const max = Math.max(1, ...Object.values(val.byCategory))
  // Each category shows its most valuable item's icon.
  return CATEGORIES.map(c => ({ ...c, chaos: val.byCategory[c.id], share: val.byCategory[c.id] / max, icon: val.lines.find(l => l.category === c.id)?.icon ?? '' }))
})

const tabNames = computed(() => new Map(tabValues.value.map(t => [t.id, t.name])))
const catLabel = computed(() => CATEGORIES.find(c => c.id === cat.value)?.label ?? '')
const selectedChaos = computed(() => tabValues.value.filter(t => tabs.value.includes(t.id)).reduce((x, t) => x + t.chaos, 0))
const tabLabels = computed(() => {
  const prev = ledger.value.tabChaos.prev
  return tabValues.value.map(t => {
    if (UNREADABLE.has(t.type)) {
      return { id: t.id, name: t.name, colour: t.colour, count: 'not readable', title: "pathofexile.com sends none of this tab's items" }
    }
    const change = prev[t.id] != null ? toDiv(t.chaos - prev[t.id]) : null
    return {
      id: t.id,
      name: t.name,
      colour: t.colour,
      count: `${div(t.chaos)} ${unit.value}`,
      title: `${t.name}: ${div(t.chaos)} ${unit.value} (${inChaos(t.chaos)})${change != null && Math.abs(change) >= 0.05 ? ` · ${signed(change)} ${unit.value} since the read before` : ''}`
    }
  })
})
// The labels in the tab row: the picked ones first when they don't all fit.
const inlineLabels = computed(() => tabsOverflow.value ? selectedFirst(tabLabels.value, tabs.value) : tabLabels.value)
// Do they fit on the row? Measured on the strip, again when it's resized or the
// labels change. Opened (tabsOpen) only means something when they don't.
const strip = shallowRef<HTMLElement | null>(null)
const tabsOverflow = shallowRef(false)
const expanded = computed(() => tabsOpen.value && tabsOverflow.value)
// A focused label would scroll the row sideways; it stays put.
function unscroll (e: Event) { (e.currentTarget as HTMLElement).scrollLeft = 0 }
function measureTabs () {
  const el = strip.value
  tabsOverflow.value = !!el && el.scrollWidth > el.clientWidth + 1
}
let tabsResize: ResizeObserver | null = null
watch(strip, (el, _, onCleanup) => {
  if (!el || typeof ResizeObserver === 'undefined') return
  // Measured on the next frame: a state change inside the observer's callback
  // resizes the row in the same frame ("ResizeObserver loop" warnings).
  let frame = 0
  tabsResize = new ResizeObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measureTabs)
  })
  tabsResize.observe(el)
  measureTabs()
  onCleanup(() => { cancelAnimationFrame(frame); tabsResize?.disconnect(); tabsResize = null })
}, { flush: 'post' })
watch(tabLabels, () => { nextTick(measureTabs) }, { flush: 'post' })
// The game font arriving later widens the labels without resizing the row.
onMounted(() => { document.fonts?.ready.then(measureTabs).catch(() => {}) })

// Tabs that are gone (tabs chosen again) drop out of the pick.
watch(tabValues, (list) => {
  const ids = new Set(list.map(t => t.id))
  if (tabs.value.some(t => !ids.has(t))) tabs.value = tabs.value.filter(t => ids.has(t))
})

// Unpriced and ignored items, shown dimmed under the rest from the footer.
const showUnpriced = shallowRef(false)
const showIgnored = shallowRef(false)
const tableLines = computed(() => {
  const val = v.value
  if (!val) return []
  const f = { cat: cat.value, tabs: tabs.value, query: query.value, minChaos: floor.value.minChaos }
  const extra = [...(showUnpriced.value ? val.unpricedLines : []), ...(showIgnored.value ? val.ignoredLines : [])]
  return [...filterLines(val.lines, f), ...filterLines(extra, { ...f, minChaos: 0 })]
})
const ignoredCount = computed(() => v.value?.ignoredLines.length ?? 0)
// Rows the value chips hide (the other filters aside).
const hiddenByValue = computed(() => {
  const val = v.value
  if (!val || !floor.value.minChaos) return 0
  const f = { cat: cat.value, tabs: tabs.value, query: query.value, minChaos: 0 }
  return filterLines(val.lines, f).length - filterLines(val.lines, { ...f, minChaos: floor.value.minChaos }).length
})
function showHidden () {
  props.config.hideDivOn = false
  props.config.hideChaosOn = false
}
watch(ignoredCount, (n) => { if (!n) showIgnored.value = false })

// ---------- your prices and ignored items (row menu) ----------
const NOT_READY = 'Not loaded yet. Try again in a moment'
function onPrice (key: string, chaos: number | null) {
  if (!setMyPrice(key, chaos)) toast(NOT_READY)
}
function onIgnore (key: string, name: string, on: boolean) {
  if (!setIgnored(key, on)) { toast(NOT_READY); return }
  toast(on ? `Ignoring ${name}` : `${name} counts again`, { undo: () => { setIgnored(key, !on) } })
}

// ---------- sales (pick A: Sold section, sale lines, chart dots; pick C: the Sales view) ----------
// Labels shared with What's new's Show me (tab-bar/goto.ts).
const VIEW_OPTIONS = (['holdings', 'sales', 'listed', 'runs'] as const).map(value => ({ value, label: GOTO_TARGETS['woke-net-worth'][value] }))
const view = computed<string>({
  get: () => props.config.view === 'sales' || props.config.view === 'runs' || props.config.view === 'listed' ? props.config.view : 'holdings',
  set: (x) => { props.config.view = x === 'sales' || x === 'runs' || x === 'listed' ? x : 'holdings' }
})

// ---------- strategy runs (runs.ts, WOKEPOET-515) ----------
// A chart point's "Start a run from here": the Runs view starts from it.
const runFrom = shallowRef<number | null>(null)
function onChartRun (at: number) {
  runFrom.value = at
  view.value = 'runs'
}
const runLeague = computed(() => props.status?.league ?? leagueNow.value ?? null)
watch(runLeague, (l) => { if (l) loadRuns(l).catch(() => {}) }, { immediate: true })
const liveRun = computed(() => runsDoc.value.live && runsDoc.value.live.league === runLeague.value ? runsDoc.value.live : null)
watch(liveRun, (r) => { if (r) runFrom.value = null })
// The summary line's run number, from the saved glance (run-store.ts).
const runChip = computed(() => {
  const g = runGlance.value
  return liveRun.value && g && g.league === runLeague.value ? g : null
})
const salesLeague = computed(() => props.status?.league ?? leagueNow.value ?? null)
watch(salesLeague, (id) => { loadSales(id).catch(() => {}) }, { immediate: true })
function refreshSales () {
  loadSales(salesLeague.value, 'manual').catch(() => {})
}
function refreshListed () {
  const league = salesLeague.value
  if (!league) return
  refreshPending(league).catch((e) => { toast(`Couldn't read your Faustus listings: ${(e as Error).message}`) })
  // Sales that came in since drop their listings off.
  loadSales(league).catch(() => {})
}
// Your listings count in your net worth (pick E2): at poe.ninja's price where
// it can be trusted, else the ask. The chart and per hour stay the stash's.
watch(salesLeague, (l) => { if (l) loadPending(l).catch(() => {}) }, { immediate: true })
const listedRows = computed(() => {
  const d = pendingDoc.value
  return d && d.league === salesLeague.value ? pendingRows(d, sales.value, saleRates.value, ninjaPriced, now.value, props.config.staleDays) : []
})
const listed = computed(() => pendingTotals(listedRows.value))
// Each listing's worth for the dock card's total (pending-glance.ts), saved
// when it changes.
let savedWorth = ''
watch(listedRows, (rows) => {
  const league = pendingDoc.value?.league
  if (!league || league !== salesLeague.value) return
  const items = rows.map(r => [r.item.id, Math.round(rowWorth(r) * 100) / 100] as [string, number])
  const sig = `${league}|${JSON.stringify(items)}`
  if (sig === savedWorth) return
  savedWorth = sig
  const w = { league, at: Date.now(), items }
  listedWorthDoc.value = w
  hostRequest('doc-put', { collection: 'net-worth', key: listedWorthKey(league), value: w }).catch(() => {})
})
const countListed = computed(() => props.config.countListed !== false)
const listedWorth = computed(() => countListed.value ? listed.value.worthChaos : 0)
const totalTitle = computed(() => {
  const stash = v.value?.chaos ?? 0
  const lines = [`${inChaos(stash + listedWorth.value)}`, `Stash ${div(stash)} ${unit.value} · liquid ${div(liquid.value)} ${unit.value}`]
  if (listedWorth.value) {
    lines.push(`At Faustus ${div(listedWorth.value)} ${unit.value} (${listed.value.count} unsold)`)
    // A sale shows in your trade history only at the next sales read.
    // Sold, not collected yet: Faustus holds it, not the stash (or the list).
    lines.push('A sold listing drops out at the next sales read; its currency counts once you collect it (twice if you collect before that read)')
  }
  return lines.join('\n')
})
const listedTitle = computed(() => {
  const t = listed.value
  const lines = [`${t.count} ${t.count === 1 ? 'listing' : 'listings'} not sold yet, worth about ${div(t.worthChaos)} ${unit.value} (asking ${div(t.askChaos)} ${unit.value})`]
  lines.push(countListed.value ? 'Counted in your total; the chart shows it as a band on top of your stash' : 'Left out of your total (tick the box to count it)')
  if (t.stale) lines.push(`${t.stale} unsold ${props.config.staleDays ?? DEFAULT_STALE_DAYS} days or more`)
  lines.push('Click for the Listed view')
  return lines.join('\n')
})
const listedReadLine = computed(() => {
  if (pendingReading.value) return 'reading…'
  const d = pendingDoc.value
  return d && d.league === salesLeague.value ? `read ${agoPhrase(d.readAt)}` : ''
})
const saleChaosOf = (s: Sale) => saleChaos(s, saleRates.value)
// In divines (chaos without a rate); a currency poe.ninja can't price as sold.
function salePrice (s: Sale) {
  const c = saleChaosOf(s)
  return c == null ? `${fmt(s.price.amount)} ${s.price.currency}` : div(c)
}
const soldToday = computed(() => totals(inRange(sales.value, 'today', now.value), saleRates.value))
const soldWeek = computed(() => totals(inRange(sales.value, '7d', now.value), saleRates.value))
const recentSales = computed(() => sales.value.slice(0, 6))
const clockOf = (at: number) => {
  const d = new Date(at)
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function saleTitle (s: Sale) {
  const vs = marketText(marketOf(s))
  return `${saleName(s)} sold for ${fmt(s.price.amount)} ${s.price.currency} · ${new Date(s.at).toLocaleString()}${vs ? ` · ${vs} against poe.ninja now` : ''}`
}
function marketTone (s: Sale) {
  const x = marketOf(s)
  return x == null || Math.abs(x) < 0.03 ? 'w-dim' : x < 0 ? 'w-down' : 'w-up'
}
// The chart's dots: each sale, named for the hover card.
const chartSales = computed<ChartSale[]>(() => sales.value.map(s => {
  const c = saleChaosOf(s)
  return { at: s.at, text: `${saleName(s)} ${salePrice(s)}${c == null ? '' : ` ${unit.value}`}`, tip: saleTip(s), name: saleName(s), div: c == null ? null : toDiv(c) }
}))
// The chart's Faustus band (pick A), when listings count in your total: what
// each refresh saved, else rebuilt from the listings and sales (listedAt).
const chartListed = computed(() => {
  if (!countListed.value || chartMode.value !== 'total') return undefined
  const s = series.value
  const d = pendingDoc.value
  const doc = d && d.league === salesLeague.value ? d : null
  if (!doc && !s.some(p => p.listedDiv)) return undefined
  const worth = new Map(listedRows.value.map(r => [r.item.id, rowWorth(r)]))
  const rebuilt = listedAt(doc, sales.value, saleRates.value, l => worth.get(l.id) ?? saleChaos(l, saleRates.value) ?? 0, s.map(p => p.at))
  const out = s.map((p, i) => p.listedDiv ?? toDiv(rebuilt[i]))
  return out.some(v => v > 0) ? out : undefined
})
// The legend under the line: only the marks this range shows.
const chartLegend = computed(() => {
  const s = series.value
  if (s.length < 2) return []
  const t0 = s[0].at
  const t1 = s[s.length - 1].at
  const out: Array<{ id: string, label: string, tip: string }> = []
  if (chartListed.value) out.push({ id: 'band', label: 'At Faustus', tip: 'What you have listed at Faustus, on top of your stash' })
  if (chartSales.value.some(x => x.at >= t0 && x.at <= t1)) out.push({ id: 'sale', label: 'Sale', tip: 'Something sold here. Hover the chart there for the items' })
  if (chartMaps.value?.some(m => m.to > t0 && m.from < t1)) out.push({ id: 'maps', label: 'Maps', tip: 'Your maps this session' })
  return out
})
// Your maps behind the line (pick D), each with what the refreshes after it added.
const mapsOn = computed(() => props.config.chartMaps === true)
const chartMaps = computed<ChartMap[] | undefined>(() => {
  const f = farming.value
  if (!mapsOn.value || !f?.runs.length) return undefined
  const gain = new Map(groups.value.map(g => [g.key, g.netChaos]))
  return f.runs.map((r, i) => {
    const g = gain.get(`run:${i}`)
    return { from: r.enteredAt, to: r.enteredAt + r.mapMs, name: `Map ${i + 1} · ${r.name}`, gainDiv: g == null ? null : toDiv(g) }
  })
})
// A group's sales: those after the read before its first, up to its last. Their
// items' removed lines give way to the sale rows.
const readBefore = computed(() => {
  const pts = ledger.value.points
  return new Map(pts.map((p, i) => [p.at, i > 0 ? pts[i - 1].at : null]))
})
const groupSalesOf = computed(() => {
  const out = new Map<string, { sales: Sale[], lines: ChangeGroup['lines'] }>()
  for (const g of groups.value) {
    const first = g.reads[0]
    const last = g.reads[g.reads.length - 1]
    const list = first == null ? [] : salesInWindow(sales.value, readBefore.value.get(first) ?? null, last)
    out.set(g.key, { sales: list, lines: withoutSold(g.lines, list) })
  }
  return out
})
const groupSales = (g: ChangeGroup) => groupSalesOf.value.get(g.key) ?? { sales: [], lines: g.lines }
// A wait that's over isn't shown; the reader off says so.
const salesError = computed(() => {
  const e = salesReply.value?.error ?? salesFailed.value
  return e && !(e.kind === 'rate-limited' && e.retryAt != null && e.retryAt <= nowMinute.value) ? e : null
})
const salesErrorLine = computed(() => {
  const e = salesError.value
  if (!e) return ''
  if (e.kind === 'rate-limited' && e.retryAt) {
    const min = Math.max(1, Math.ceil((e.retryAt - nowMinute.value) / 60_000))
    return `pathofexile.com allows few trade history reads. Try again in ${min} min.`
  }
  return e.message
})
const salesReadLine = computed(() => {
  if (salesReading.value) return 'reading…'
  const at = salesReply.value?.readAt
  return at ? `read ${agoPhrase(at)}` : ''
})

// ---------- header and footer ----------
const readLine = computed(() => {
  const s = props.status
  if (s?.running) return s.progress ? `reading ${s.progress.done}/${s.progress.total}` : 'reading…'
  return s?.lastReadAt ? `read ${agoPhrase(s.lastReadAt)}` : ''
})
const ninjaAge = computed(() => ninja.updatedAt.value ? agoPhrase(ninja.updatedAt.value) : 'loading')

const errorLine = computed(() => {
  const e = props.status?.error
  if (!e) return ''
  if (e.kind === 'rate-limited' && e.retryAt) {
    const min = Math.max(1, Math.ceil((e.retryAt - Date.now()) / 60_000))
    return `Rate-limited by pathofexile.com. Try again in ${min} min.`
  }
  return e.message
})

function refresh () {
  hostRequest('stash-reader-read', null, 15 * 60_000).catch(() => {})
}
// The time bar can unmount under the cursor (window switch): drop its hover
// pick with it. Down here so everything rateShown reads is set up first.
watch(() => splitParts.value.map(x => x.id).join(), () => { splitPick.value = null })
</script>

<style module>
.body { display: flex; flex-direction: column; }
.caps { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); }
.summary { display: flex; align-items: center; gap: var(--w-s3); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; font-size: var(--w-fs-sm); }
.halves { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--w-s2); padding: var(--w-s2) var(--w-pad); border-bottom: 1px solid var(--w-line); align-items: stretch; }
.halves.one { grid-template-columns: minmax(0, 1fr); }
.halves > .chartBlock { padding: var(--w-s2); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); min-width: 0; }
.bigRate { display: block; white-space: nowrap; font-size: calc(18px * var(--w-text-scale, 1)); font-weight: 500; line-height: 1.15; }
.tiles { display: grid; grid-template-columns: 1.3fr repeat(3, minmax(0, 1fr)); gap: var(--w-s3); }
.tiles > div { display: flex; flex-direction: column; justify-content: space-between; gap: 1px; min-width: 0; }
.tiles > div > :first-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tiles b { font-weight: 500; }
.hubTiles { margin-top: var(--w-s2); padding-top: var(--w-s2); border-top: 1px dashed var(--w-line); }
.timeLegend { flex-wrap: nowrap; gap: var(--w-s2); white-space: nowrap; overflow: hidden; }
.timeLegend i { opacity: 1; }
.halves > .chartBlock { display: flex; flex-direction: column; }
.chartFill { flex: 1 1 auto; height: auto !important; min-height: 80px; }
.spark + .holdings { margin-left: 0; }
.holdings { display: inline-flex; gap: var(--w-s3); align-items: baseline; min-width: 0; margin-left: auto; }
.box { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: var(--w-s2); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel-2); }
.rateTime { margin-left: auto; }
.boxHead { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); flex-wrap: wrap; }
.sideCol { display: flex; flex-direction: column; gap: var(--w-s3); }
.movesCol { display: flex; flex-direction: column; gap: 2px; }
.moveRow { display: flex; justify-content: space-between; gap: var(--w-s2); min-width: 0; font-size: var(--w-fs-sm); }
.more { font-size: var(--w-fs-xs); color: var(--w-dim); }
.split { position: relative; display: flex; height: 8px; border: 1px solid var(--w-line); border-radius: 2px; }
.split > span:not(.splitLabel) { flex-basis: 0; position: relative; transition: opacity 0.1s; }
.split > .segFirst { border-top-left-radius: 1px; border-bottom-left-radius: 1px; }
.split > .segLast { border-top-right-radius: 1px; border-bottom-right-radius: 1px; }
.splitPick > span:not(.segOn, .splitLabel) { opacity: 0.45; }
.split > .segOn { z-index: 1; outline: 1px solid var(--w-fg); outline-offset: 1px; }
.splitLabel { position: absolute; bottom: calc(100% + 4px); z-index: 2; padding: 0 5px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); background: var(--w-panel); color: var(--w-fg); font-size: var(--w-fs-xs); white-space: nowrap; pointer-events: none; }
.legend i { display: inline-block; width: 9px; height: 9px; margin-right: 4px; vertical-align: 0; }
.map { background: var(--w-up); }
.other { background: var(--w-info); }
.hub { background: var(--w-gold); }
.off { background: color-mix(in srgb, var(--w-fg) 22%, transparent); }
.total { font-size: calc(20px * var(--w-text-scale, 1)); color: var(--w-fg); line-height: 1.1; }
.spark { margin-left: auto; }
.toggle { display: inline-flex; align-items: center; gap: 5px; color: var(--w-dim); font-size: var(--w-fs-sm); cursor: pointer; padding: 1px 4px; border-radius: var(--w-r-sm); white-space: nowrap; }
.toggle:hover { color: var(--w-fg); background: var(--w-panel-2); }
.toggle i { font-size: calc(9px * var(--w-text-scale, 1)); }
.chartBlock { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 6px var(--w-pad) 8px; border-bottom: 1px solid var(--w-line); }
.chartHead { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); flex-wrap: wrap; }
.goalLine { color: var(--w-up); }
.key { opacity: 1 !important; }
.key-band { background: color-mix(in srgb, var(--w-higher) 45%, transparent); border-top: 1px dashed var(--w-higher); }
.key-sale { width: 2px !important; background: var(--w-accent); }
.key-maps { background: color-mix(in srgb, var(--w-gold) 25%, transparent); }
.chartRight { display: inline-flex; align-items: baseline; gap: 10px; }
.mapsBtn { padding: 0 0 2px; font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-faint); border-bottom: 1px dashed transparent; cursor: pointer; }
.mapsBtn:hover { color: var(--w-fg); }
.mapsOn { color: var(--w-gold); border-bottom-color: var(--w-gold); }
.legend { display: flex; gap: var(--w-s2); flex-wrap: wrap; font-size: var(--w-fs-xs); color: var(--w-dim); }
.legend i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; opacity: .7; }
.cols { position: relative; display: grid; border-bottom: 1px solid var(--w-line); }
/* A dragged height: each column scrolls inside it. */
.colsFixed { grid-template-rows: minmax(0, 1fr); }
.colsFixed > div:not([role=separator]) { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
.colsFixed .scrollBox { overflow-y: auto; overscroll-behavior: contain; }
.colsFixed .scroll { max-height: none; overflow: visible; }
.halves { position: relative; }
.fold { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 14px; color: var(--w-dim); cursor: pointer; }
.fold:hover { color: var(--w-fg); }
.fold i, .foldHead i { font-size: calc(8px * var(--w-text-scale, 1)); }
.foldHead { display: inline-flex; align-items: center; gap: 5px; min-width: 0; text-align: left; cursor: pointer; }
.foldHead:hover .caps, .foldHead:hover i { color: var(--w-fg); }
.foldHead i { width: 9px; color: var(--w-dim); flex: none; }
.foldHead .caps { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sideTitle { margin-bottom: 4px; }
.sideHead { display: flex; align-items: baseline; gap: 2px; }
.sideHead .soldHead { flex: 1 1 auto; min-width: 0; }
.cols > div:not([role=separator]) { padding: var(--w-s2) var(--w-pad); min-width: 0; }
.cols > div:not([role=separator]) + div:not([role=separator]) { border-left: 1px solid var(--w-line); }
.colHead { display: flex; justify-content: space-between; gap: 2px var(--w-s2); flex-wrap: wrap; min-width: 0; margin-bottom: 2px; }
.colHead b { font-weight: 500; font-size: var(--w-fs-sm); }
.group { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }
.groupHead { display: flex; align-items: baseline; gap: 6px; width: 100%; font-size: var(--w-fs-xs); color: var(--w-dim); border-bottom: 1px dashed var(--w-line); text-align: left; cursor: pointer; }
.groupHead:hover { color: var(--w-fg); }
.groupHead > span { flex: 1 1 auto; min-width: 0; }
.groupHead > i { font-size: calc(8px * var(--w-text-scale, 1)); width: 8px; flex: none; }
.changesCol { display: flex; flex-direction: column; }
.scrollBox { flex: 1 1 auto; min-height: 0; }
.scroll { max-height: 320px; overflow-y: auto; overscroll-behavior: contain; padding-right: 2px; }
.spendChip { margin-left: 6px; padding: 0 5px; border: 1px solid var(--w-info); color: var(--w-info); border-radius: 2px; font-size: var(--w-fs-xs); }
.spendRow { display: flex; justify-content: space-between; gap: 6px; align-items: center; font-size: var(--w-fs-xs); color: var(--w-dim); }
.spendBtn { color: var(--w-accent); text-decoration: underline; white-space: nowrap; background: none; border: 0; padding: 0; cursor: pointer; font-size: var(--w-fs-xs); }
.saleChip { margin-left: 6px; padding: 0 5px; border: 1px solid var(--w-gold); color: var(--w-gold); border-radius: 2px; font-size: var(--w-fs-xs); }
.saleNum { color: var(--w-gold); font-weight: 500; }
.soldToday { color: var(--w-gold); cursor: pointer; white-space: nowrap; }
.soldToday:hover { text-decoration: underline; }
.listedChip { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.leftOut { color: var(--w-dim); text-decoration: line-through; }
.soldHead { display: flex; justify-content: space-between; align-items: baseline; gap: var(--w-s2); width: 100%; margin-bottom: 4px; text-align: left; cursor: pointer; }
.soldHead:hover .caps { color: var(--w-fg); }
.spendNote { margin-left: 6px; font-size: var(--w-fs-xs); color: var(--w-info); }
.feedRow { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 6px; align-items: center; font-size: var(--w-fs-sm); }
.icon { width: 16px; height: 16px; object-fit: contain; flex: none; }
.sessionFoot { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); margin-top: var(--w-s2); }
.catName { display: inline-flex; align-items: center; gap: 6px; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.moveName { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
/* A sale's "7% under" and price never wrap: the name is cut short instead. */
.saleTag { flex: none; white-space: nowrap; font-size: var(--w-fs-xs); }
.sideCol .moveRow > :global(.w-num) { flex: none; white-space: nowrap; }
.catRow { display: grid; grid-template-columns: 9.5em minmax(0, 1fr) 5em; gap: 6px; align-items: center; width: 100%; padding: 2px 4px; font-size: var(--w-fs-sm); color: var(--w-fg); text-align: left; border-radius: var(--w-r-sm); cursor: pointer; }
.catRow:hover { background: var(--w-panel-2); }
.catRow i { display: block; height: 8px; min-width: 2px; background: linear-gradient(90deg, color-mix(in srgb, var(--w-gold) 50%, transparent), var(--w-gold)); }
.catRow b { text-align: right; font-weight: 500; }
.catOn { background: var(--w-panel-3); box-shadow: inset 2px 0 var(--w-gold); }
.tabLine { display: flex; align-items: center; gap: var(--w-s2); padding: 4px var(--w-pad); border-bottom: 1px solid var(--w-line); font-size: var(--w-fs-sm); min-width: 0; }
.clear { font-size: var(--w-fs-xs); color: var(--w-dim); text-decoration: underline; cursor: pointer; }
.synced { white-space: nowrap; flex: none; }
.picked { display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; color: var(--w-gold); flex: none; }
.stripBox { position: relative; flex: 1 1 auto; min-width: 0; }
.strip { display: flex; gap: 3px; overflow: hidden; white-space: nowrap; }
.strip.fade { mask-image: linear-gradient(90deg, #000 calc(100% - 56px), transparent); -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 56px), transparent); }
.strip > * { flex: none; }
.ghost { visibility: hidden; }
.fadeHit { position: absolute; top: 0; right: 0; bottom: 0; width: 56px; cursor: pointer; }
.fadeHit:hover { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--w-gold) 18%, transparent)); }
.tabLabels { display: flex; flex-wrap: wrap; gap: 3px; padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); }
.tabLabel { display: inline-flex; align-items: baseline; gap: 5px; padding: 2px 8px; font-size: var(--w-fs-xs); color: var(--w-dim); background: var(--w-panel-2); border: 1px solid var(--w-line); border-top: 3px solid var(--tab-colour, var(--w-line)); border-radius: var(--w-r-sm) var(--w-r-sm) 0 0; cursor: pointer; white-space: nowrap; }
.tabLabel:hover { color: var(--w-fg); }
.tabOn { color: var(--w-fg); background: var(--w-panel-3); box-shadow: 0 0 0 1px var(--w-gold); }
.tabCount { font-family: var(--w-num); color: var(--w-faint); }
.chips { display: flex; gap: var(--w-s1); padding: 6px var(--w-pad); flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--w-line); }
.search { min-width: 150px; flex: 0 1 220px; }
.foot { display: flex; justify-content: space-between; gap: var(--w-s2); padding: 5px var(--w-pad); flex-wrap: wrap; }
</style>
