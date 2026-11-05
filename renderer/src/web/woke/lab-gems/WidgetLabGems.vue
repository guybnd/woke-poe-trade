<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- In the lab: the best font gem per colour, inside the lab icon's card. -->
    <DockItem id="lab-gems" into="lab" title="Divine Font, best per colour" :show="inLab" :wm-id="config.wmId">
      <template #card>
        <div style="padding: 2px var(--w-pad) 6px;">
          <div v-for="r in rolls" :key="r.color" class="flex items-center gap-2">
            <span :class="[$style.dot, $style[r.color]]" />
            <span class="w-trunc flex-1">{{ r.top[0]?.name ?? 'no prices yet' }}</span>
            <WPrice v-if="r.top[0]" :chaos="r.top[0].chaos ?? 0" :divine="snapshot?.divine" />
            <span class="w-faint text-xs w-num" title="Expected value of a roll of this colour">EV <WPrice :chaos="r.ev" :divine="snapshot?.divine" /></span>
          </div>
        </div>
      </template>
    </DockItem>
    <WPanel :title="config.wmTitle || 'Lab gems'" icon="lab" :updated="snapshot?.ts ?? null" :fresh-min="40" :stale-min="180" width="30rem">
      <template #tabs>
        <WTabs v-model="config.view" :options="[{ value: 'color', label: 'Colour roll' }, { value: 'specific', label: 'Specific gem' }]" />
      </template>
      <template #toolbar>
        <WSelect v-model="config.gemState" :options="GEM_STATES.map(s => ({ value: s, label: stateLabel(s) }))" title="Gem level / quality" />
        <WSegmented v-if="config.view === 'color'" :model-value="String(config.topN)"
          :options="[{ value: '3', label: 'Top 3' }, { value: '5', label: 'Top 5' }, { value: '8', label: 'Top 8' }]"
          @update:model-value="config.topN = Number($event)" />
        <template v-else>
          <WSelect v-model="config.specificMode" title="Whether the font lets you choose the transfigured version or gives a random one"
            :options="[{ value: 'choose', label: 'I choose the version' }, { value: 'random', label: 'Random version' }]" />
          <WField v-model="config.minProfit" type="number" suffix="c profit min" style="width: 9rem;" />
        </template>
        <WChip clickable :active="!!config.runner" title="Count the lab entry, the gem you insert and your run time"
          @click="config.runner = !config.runner"><i class="fas fa-running" /> Runner</WChip>
      </template>
      <template #meta>
        <template v-if="snapshot">
          <span>{{ snapshot.league }}</span><span class="w-faint">·</span>
          <span>{{ priceCount }} gem prices</span>
        </template>
        <span v-else>Waiting for poe.ninja prices…</span>
      </template>

      <div v-if="config.runner" class="flex flex-wrap gap-2 items-center py-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad); border-bottom: 1px solid var(--w-line);">
        <WSelect :model-value="config.runnerLab ?? 'merciless'" title="Which lab you run"
          :options="[{ value: 'merciless', label: 'Merciless (free entry)' }, { value: 'eternal', label: 'Eternal (Offering)' }]"
          @update:model-value="config.runnerLab = $event === 'eternal' ? 'eternal' : 'merciless'" />
        <WField :model-value="config.runnerGemCost ?? 1" type="number" suffix="c gem in" style="width: 7rem;"
          title="What the gem you put in the font costs" @update:model-value="config.runnerGemCost = Number($event) || 0" />
        <WField :model-value="config.runnerMinutes ?? 6" type="number" suffix="min / run" style="width: 7.5rem;"
          @update:model-value="config.runnerMinutes = Number($event) || 0" />
        <span class="w-dim text-xs">Entry <WPrice :chaos="entryCost" :divine="snapshot?.divine" /></span>
        <span v-if="config.view === 'color' && bestRoll" class="ml-auto w-num" title="Best colour EV minus entry and gem, per run and per hour">
          <span :class="runProfit >= 0 ? 'w-up' : 'w-down'">{{ fmt(runProfit) }}</span> / run
          <template v-if="perHour != null"> · {{ fmt(perHour) }} / h</template>
        </span>
      </div>

      <WSkeleton v-if="!snapshot" :rows="8" />
      <template v-else-if="config.view === 'color'">
        <div class="w-row w-row--head" :class="$style.stateGrid" title="Colour-roll EV for each level / quality you could bring">
          <span>Bring</span><span class="text-right">Red</span><span class="text-right">Green</span><span class="text-right">Blue</span>
        </div>
        <button v-for="row in stateEvs" :key="row.state" class="w-row w-full text-left" :class="[$style.stateGrid, { [$style.current]: row.state === config.gemState }]"
          @click="config.gemState = row.state">
          <span>{{ stateLabel(row.state) }}</span>
          <span v-for="c in (['r', 'g', 'b'] as const)" :key="c" class="text-right w-num" :class="row.state === bestState[c] ? 'w-up' : 'w-dim'"
            :title="row.state === bestState[c] ? 'Best level / quality to bring for this colour' : undefined">{{ fmt(row.ev[c]) }}</span>
        </button>
        <div v-for="(roll, i) in rolls" :key="roll.color" class="pb-1">
          <div class="w-row" :class="$style.poolGrid">
            <span :class="[$style.dot, $style[roll.color]]" />
            <span>{{ COLOR_NAMES[roll.color] }} pool</span>
            <span class="w-faint text-xs whitespace-nowrap">{{ roll.listed }}/{{ roll.poolSize }} priced · each {{ pct(roll.chanceEach) }}</span>
            <span class="w-num text-right" :class="i === 0 ? 'w-up' : ''" title="Expected value of the best of the 3 offered gems">EV {{ fmt(roll.ev) }}</span>
          </div>
          <div v-for="g in roll.top" :key="g.name" class="w-row" :class="$style.gemGrid" @contextmenu="gemMenu($event, g.name)">
            <img v-if="gemIcon(g.name)" :src="gemIcon(g.name)!" :class="$style.icon" alt="" loading="lazy" decoding="async" draggable="false"><span v-else />
            <span class="w-trunc w-rarity-gem"><i v-if="thin.has(g.name)" class="fas fa-exclamation-circle w-faint mr-1" :title="THIN_NOTE" />{{ g.name }}</span>
            <WPrice :chaos="g.chaos ?? 0" :divine="snapshot?.divine" />
          </div>
        </div>
        <div class="w-faint text-xs py-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad);">
          The font shows 3 random transfigured gems of the colour you insert and you take one.
          EV assumes you take the most valuable; unpriced gems count as 0.
        </div>
      </template>

      <template v-else>
        <WEmpty v-if="!picks.length" :art="{ mechanic: 'lab' }">No gems match these filters.</WEmpty>
        <template v-else>
          <div class="w-row w-row--head" :class="$style.pickGrid"><span /><span>Base gem</span><span class="text-right">Base</span><span class="text-right">Value</span><span class="text-right">Profit</span></div>
          <template v-for="p in picks" :key="p.baseName">
            <button class="w-row w-full text-left" :class="$style.pickGrid" @click="toggle(p.baseName)"
              @contextmenu="gemMenu($event, p.baseName)">
              <span :class="[$style.dot, $style[p.color]]" />
              <span :class="$style.named"><img v-if="gemIcon(p.baseName)" :src="gemIcon(p.baseName)!" :class="$style.icon" alt="" loading="lazy" decoding="async" draggable="false"><span v-else :class="$style.icon" /><span class="w-trunc">{{ p.baseName }} <i class="fas text-xs w-faint" :class="expanded === p.baseName ? 'fa-chevron-up' : 'fa-chevron-down'" /></span></span>
              <span class="text-right w-dim" title="Base gem price"><WPrice v-if="p.baseChaos != null" :chaos="p.baseChaos" :divine="snapshot?.divine" /><template v-else>?</template></span>
              <WPrice :chaos="value(p)" :divine="snapshot?.divine" />
              <span class="text-right w-up w-num" :title="config.runner ? 'Profit after the base gem and the lab entry' : 'Profit after buying the base gem'">+<WPrice :chaos="profit(p)" :divine="snapshot?.divine" /></span>
            </button>
            <template v-if="expanded === p.baseName">
              <div v-for="v in p.variants" :key="v.name" class="w-row" :class="$style.gemGrid" @contextmenu="gemMenu($event, v.name)">
                <img v-if="gemIcon(v.name)" :src="gemIcon(v.name)!" :class="$style.icon" alt="" loading="lazy" decoding="async" draggable="false"><span v-else />
                <span class="w-trunc w-rarity-gem"><i v-if="thin.has(v.name)" class="fas fa-exclamation-circle w-faint mr-1" :title="THIN_NOTE" />{{ v.name }}</span>
                <WPrice :chaos="v.chaos" :divine="snapshot?.divine" />
              </div>
            </template>
          </template>
        </template>
      </template>

      <template #footer>
        <span>Maths from GemCheck (MIT) · poe.ninja prices, uncorrupted only</span>
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { LAB_GEMS_TYPE } from './widget'

export default {
  widget: {
    type: LAB_GEMS_TYPE,
    instances: 'multi',
    trNameKey: 'Lab gems'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WTabs, WSelect, WSegmented, WField, WPrice, WEmpty, WChip, WSkeleton, openMenu, toast } from '../ui'
import { copyText } from '../ui/copy'
import { useLeagues } from '@/web/background/Leagues'
import { useMarketCollector } from '../market/collector'
import { latestSnapshots } from '../market/db'
import { formatChaos } from '../ui/format'
import type { Snapshot } from '../market/types'
import { GEM_STATES, colorRolls, evByState, gemPrices, pickProfit, pickValue, specificPicks, thinGems } from './font'
import type { GemColor, GemState, SpecificPick } from './font'
import type { LabGemsWidget } from './widget'
import { gemIcon } from './icons'
import DockItem from '../dock/DockItem.vue'
import { useZone } from '../shared/zone'

const props = defineProps<{
  config: LabGemsWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Lab gems'
  props.config.anchor = popupAnchor()
  props.config.view = 'color'
  props.config.gemState = '20/20'
  props.config.specificMode = 'choose'
  props.config.topN = 5
  props.config.minProfit = 0
  wm.show(props.config.wmId)
}

const zone = useZone()
const inLab = computed(() => zone.kind === 'lab')

const COLOR_NAMES: Record<GemColor, string> = { r: 'Red', g: 'Green', b: 'Blue' }

const collector = useMarketCollector({ poll: true })
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value)

const snapshot = shallowRef<Snapshot | null>(null)
const expanded = shallowRef<string | null>(null)

// A slow read for the previous league must not land after a newer one.
let loadSeq = 0
async function load () {
  const seq = ++loadSeq
  const id = league.value
  if (!id) { snapshot.value = null; return }
  try {
    const [snap] = await latestSnapshots(id, 1)
    if (seq === loadSeq) snapshot.value = snap ?? null
  } catch {
    if (seq === loadSeq) snapshot.value = null
  }
}
watch([league, collector.revision], load, { immediate: true })

const prices = computed(() => snapshot.value ? gemPrices(snapshot.value.items, props.config.gemState) : new Map<string, number>())
const priceCount = computed(() => prices.value.size)
const rolls = computed(() => colorRolls(prices.value, props.config.topN || 5))
const picks = computed(() => {
  const mode = props.config.specificMode
  // Same profit as shown on each row (runner mode takes off the lab entry).
  return specificPicks(prices.value)
    .filter(p => pickValue(p, mode) > 0 && profit(p) >= (props.config.minProfit || 0))
    .sort((a, b) => profit(b) - profit(a))
    .slice(0, 60)
})

const THIN_NOTE = 'Thin market: poe.ninja saw little trade on this gem, so its price may be fake.'
const thin = computed(() => snapshot.value ? thinGems(snapshot.value.items, props.config.gemState) : new Set<string>())

const stateEvs = computed(() => snapshot.value ? evByState(snapshot.value.items) : [])
const bestState = computed(() => {
  const best = { r: '', g: '', b: '' } as Record<GemColor, string>
  for (const c of ['r', 'g', 'b'] as const) {
    let top = -1
    for (const row of stateEvs.value) if (row.ev[c] > top) { top = row.ev[c]; best[c] = row.state }
  }
  return best
})

// Runner mode costs
const entryCost = computed(() => {
  if ((props.config.runnerLab ?? 'merciless') !== 'eternal' || !snapshot.value) return 0
  return snapshot.value.items.find(i => i.name === 'Offering to the Goddess')?.chaos ?? 0
})
const runCost = computed(() => props.config.runner ? entryCost.value + (props.config.runnerGemCost ?? 1) : 0)
const bestRoll = computed(() => rolls.value.length ? Math.max(...rolls.value.map(r => r.ev)) : null)
const runProfit = computed(() => (bestRoll.value ?? 0) - runCost.value)
const perHour = computed(() => {
  const min = props.config.runnerMinutes ?? 6
  return min > 0 ? runProfit.value * 60 / min : null
})

function value (p: SpecificPick) { return pickValue(p, props.config.specificMode) }
function profit (p: SpecificPick) { return pickProfit(p, props.config.specificMode) - (props.config.runner ? entryCost.value : 0) }
function toggle (name: string) { expanded.value = expanded.value === name ? null : name }

function gemMenu (e: MouseEvent, name: string) {
  const icon = gemIcon(name) ?? undefined
  openMenu(e, [
    {
      label: `Copy "${name}"`,
      gameIcon: icon,
      icon: 'far fa-copy',
      keys: 'Ctrl + C',
      action: () => {
        copyText(name).then(ok => { if (ok) toast(`Copied "${name}"`, { ms: 1800 }) })
      }
    }
  ])
}
function fmt (chaos: number) { return formatChaos(chaos, snapshot.value?.divine ?? null) }
function pct (p: number) { return `${(p * 100).toFixed(1)}%` }

function stateLabel (s: GemState) {
  const [level, quality] = s.split('/')
  return `Level ${level}${quality ? ` / ${quality}%` : ' / 0%'}`
}
</script>

<style module>
.poolGrid { grid-template-columns: 10px minmax(0, 1fr) auto 84px; }
.gemGrid { grid-template-columns: 20px minmax(0, 1fr) 76px; padding-left: calc(var(--w-pad) + 18px); }
.icon { width: 20px; height: 20px; object-fit: contain; flex: none; }
.named { display: flex; align-items: center; gap: 6px; min-width: 0; }
.stateGrid { grid-template-columns: minmax(0, 1fr) 64px 64px 64px; }
.current { background: var(--w-accent-soft); }
.pickGrid { grid-template-columns: 10px minmax(0, 1fr) 70px 70px 76px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; flex: none; }
.r { background: var(--w-sock-r); }
.g { background: var(--w-sock-g); }
.b { background: var(--w-sock-b); }
</style>
