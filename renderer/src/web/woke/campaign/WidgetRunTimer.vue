<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- With the campaign tracker placed, the run time is in its icon. -->
    <DockItem :menu="dockMenu" id="run-timer" title="Run timer" :show="!docked && !!run && !run.finished"
      :badge="delta != null ? formatDelta(delta) : null" :tone="delta == null ? 'accent' : delta <= 0 ? 'up' : 'down'"
      :wm-id="config.wmId" card-width="17rem" @open-change="cardShown = $event">
      <template #card>
        <div v-if="run" class="flex flex-col gap-1" style="padding: 6px var(--w-pad) 8px;">
          <div class="w-head-font w-accent w-trunc">{{ actLabel(run.act) }}<template v-if="run.zone"> · {{ run.zone }}</template></div>
          <div class="flex justify-between w-num"><span class="w-dim">Run</span><span>{{ formatClock(total) }}</span></div>
          <div v-if="current" class="flex justify-between w-num"><span class="w-dim">Act</span>
            <span>{{ formatClock(current.segmentMs ?? 0) }}<span v-if="current.cmpSegmentMs != null" class="w-faint"> / {{ formatClock(current.cmpSegmentMs) }}</span></span></div>
          <div class="flex justify-between w-num"><span class="w-dim">Zone</span><span>{{ formatClock(total - run.zoneSinceMs) }}</span></div>
          <div v-if="delta != null" class="flex justify-between w-num"><span class="w-dim">vs {{ cmpLabel }}</span>
            <span :class="delta <= 0 ? 'w-up' : 'w-down'">{{ formatDelta(delta) }}</span></div>
          <div v-if="run.runningSince == null" class="w-num" style="color: var(--w-warn);">paused</div>
        </div>
      </template>
    </DockItem>
    <div class="flex flex-col items-start gap-1" data-w-panel>
      <!-- HUD strip: with the campaign tracker placed, its card has the run time. -->
      <div v-if="!docked" data-widget-drag :class="$style.strip">
        <template v-if="run">
          <span :class="$style.where" class="w-head-font w-accent w-trunc">
            {{ run.finished ? (isComplete(run) ? 'Campaign done' : 'Run ended') : actLabel(run.act) }}<template v-if="!run.finished && run.zone"> · {{ run.zone }}</template>
          </span>
          <span :class="$style.sep" />
          <span><span :class="$style.k">Run</span> <span :class="$style.time" class="w-num">{{ formatClock(total) }}</span></span>
          <span v-if="current">
            <span :class="$style.k">Act</span> <span class="w-num">{{ formatClock(current.segmentMs ?? 0) }}</span>
            <span v-if="current.cmpSegmentMs != null" class="w-num w-faint"> / {{ formatClock(current.cmpSegmentMs) }}</span>
          </span>
          <span v-if="delta != null" class="w-num" :class="delta <= 0 ? 'w-up' : 'w-down'">{{ formatDelta(delta) }}</span>
          <template v-if="!run.finished">
            <span :class="$style.sep" />
            <span class="w-dim">Zone <span class="w-num" style="color: var(--w-fg);">{{ formatClock(total - run.zoneSinceMs) }}</span></span>
          </template>
          <span v-if="!run.finished && run.runningSince == null" class="w-num" style="color: var(--w-warn);">paused</span>
        </template>
        <span v-else class="w-dim">Campaign timer · starts on the Twilight Strand</span>

        <span v-if="wm.active.value" class="flex items-center gap-0.5">
          <span :class="$style.sep" />
          <button v-if="!run || run.finished" class="w-icon-btn" title="Start a run now" @click="start"><i class="fas fa-play text-xs" /></button>
          <template v-else>
            <button class="w-icon-btn" :title="run.runningSince != null ? 'Pause' : 'Resume'" @click="togglePause">
              <i class="fas text-xs" :class="run.runningSince != null ? 'fa-pause' : 'fa-play'" />
            </button>
            <button class="w-icon-btn" title="End run (in act 10 this counts as finished)" @click="end"><i class="fas fa-flag-checkered text-xs" /></button>
          </template>
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': config.expanded }" title="Splits and past runs" @click="config.expanded = !config.expanded">
            <i class="fas text-xs" :class="config.expanded ? 'fa-chevron-up' : 'fa-list'" />
          </button>
        </span>
      </div>

      <!-- Splits panel -->
      <WPanel v-if="config.expanded" ref="panel" width="21rem" max-height="60vh">
        <template #title>
          <template v-if="run">Run<template v-if="run.charName"> · {{ run.charName }}<span class="w-dim"> ({{ run.className }})</span></template></template>
          <template v-else>Campaign runs</template>
        </template>
        <template v-if="docked" #actions>
          <button v-if="!run || run.finished" class="w-icon-btn" title="Start a run now" @click="start"><i class="fas fa-play text-xs" /></button>
          <template v-else>
            <button class="w-icon-btn" :title="run.runningSince != null ? 'Pause' : 'Resume'" @click="togglePause">
              <i class="fas text-xs" :class="run.runningSince != null ? 'fa-pause' : 'fa-play'" />
            </button>
            <button class="w-icon-btn" title="End run (in act 10 this counts as finished)" @click="end"><i class="fas fa-flag-checkered text-xs" /></button>
          </template>
          <button class="w-icon-btn" title="Close" @click="config.expanded = false"><i class="fas fa-times text-xs" /></button>
        </template>
        <template #tabs>
          <WTabs v-model="tab" :options="[{ value: 'splits', label: 'Splits' }, { value: 'history', label: 'Past runs', count: config.history.length }]" />
        </template>

        <template v-if="tab === 'splits'">
          <div :class="$style.hero">
            <div>
              <div :class="$style.k">Run time</div>
              <div :class="$style.big" class="w-num">{{ formatClock(total) }}</div>
            </div>
            <div class="text-right">
              <div :class="$style.k">vs {{ cmpLabel }}</div>
              <div v-if="delta != null" class="w-num" :class="delta <= 0 ? 'w-up' : 'w-down'" style="font-size: var(--w-fs-xl);">{{ formatDelta(delta) }}</div>
              <div v-else class="w-num w-faint" style="font-size: var(--w-fs-xl);">—</div>
            </div>
          </div>
          <div class="w-row w-row--head" :class="$style.grid">
            <span>Act</span><span class="text-right">Act</span><span class="text-right">Total</span><span class="text-right">±</span>
          </div>
          <template v-for="r in rows" :key="r.act">
            <div class="w-row" :class="[$style.grid, r.state === 'current' && $style.now, r.state === 'todo' && 'w-faint']">
              <span class="w-trunc">
                {{ actLabel(r.act) }}
                <span v-if="r.state === 'current'" class="w-faint">now</span>
                <span v-else-if="r.level != null && r.state === 'done'" class="w-faint">lv {{ r.level }}</span>
              </span>
              <span class="text-right w-num" :class="r.gold ? $style.gold : (r.state === 'done' ? 'w-dim' : '')">
                {{ r.segmentMs != null ? formatClock(r.segmentMs) : '—' }}
              </span>
              <span class="text-right w-num" :class="r.state !== 'done' && 'w-faint'">
                {{ r.totalMs != null ? formatClock(r.totalMs) : (r.cmpTotalMs != null ? formatClock(r.cmpTotalMs) : '—') }}
              </span>
              <span class="text-right w-num" :class="r.deltaMs == null ? 'w-faint' : (r.deltaMs <= 0 ? 'w-up' : 'w-down')">
                {{ r.deltaMs != null ? formatDelta(r.deltaMs) : '—' }}
              </span>
            </div>
            <div v-for="m in (config.subSplits ? r.marks : [])" :key="m.id" class="w-row" :class="[$style.grid, $style.mark, m.totalMs == null && 'w-faint']">
              <span class="w-trunc">{{ m.label }}</span>
              <span />
              <span class="text-right w-num">{{ m.totalMs != null ? formatClock(m.totalMs) : (m.cmpTotalMs != null ? formatClock(m.cmpTotalMs) : '—') }}</span>
              <span class="text-right w-num" :class="m.deltaMs == null ? 'w-faint' : (m.deltaMs <= 0 ? 'w-up' : 'w-down')">
                {{ m.deltaMs != null ? formatDelta(m.deltaMs) : '—' }}
              </span>
            </div>
          </template>
        </template>

        <template v-else>
          <WEmpty v-if="!config.history.length" icon="fas fa-stopwatch">Finished and abandoned runs show here.</WEmpty>
          <template v-else>
            <div class="w-row w-row--head" :class="$style.histGrid">
              <span>Character</span><span class="text-right">Time</span><span class="text-right">Date</span><span />
            </div>
            <div v-for="r in config.history" :key="r.id" class="w-row cursor-pointer" :class="[$style.histGrid, cmp?.id === r.id && $style.now]"
              :title="isComplete(r) ? 'Race against this run' : 'Unfinished runs can\'t be raced'" @click="pickCompare(r)">
              <span class="w-trunc">
                <template v-if="isComplete(r)">{{ r.charName || 'Unknown' }}</template>
                <span v-else class="w-faint">{{ r.charName || 'Unknown' }} · quit in {{ actLabel(r.act) }}</span>
                <span v-if="r.className && isComplete(r)" class="w-faint"> {{ r.className }} {{ r.level ?? '' }}</span>
                <WChip v-if="pb?.id === r.id" :class="$style.pbChip">PB</WChip>
                <WChip v-else-if="cmp?.id === r.id" active>racing</WChip>
              </span>
              <span class="text-right w-num" :class="!isComplete(r) && 'w-faint'">{{ formatClock(runTotal(r) ?? lastSplit(r)) }}</span>
              <span class="text-right w-num w-dim">{{ formatDate(r.startedAt) }}</span>
              <button class="w-icon-btn" title="Delete run. You can undo." @click.stop="removeRun(r.id)"><i class="fas fa-times text-xs" /></button>
            </div>
          </template>
        </template>

        <template #footer>
          <span v-if="pbTotal != null">PB <span class="w-num">{{ formatClock(pbTotal) }}</span></span>
          <span v-if="sob != null">Sum of best <span class="w-num">{{ formatClock(sob) }}</span></span>
          <span v-if="config.compareTo != null && cmp && cmp.id !== pb?.id" class="ml-auto">
            <button class="w-accent hover:underline" @click="config.compareTo = null">Race PB instead</button>
          </span>
        </template>
      </WPanel>
    </div>
  </Widget>
</template>

<script lang="ts">
import { widgetRunTimerSpec } from '../widget-specs'
import type { RunTimerWidget } from './run-timer'

export default { widget: widgetRunTimerSpec }
</script>

<script setup lang="ts">
import { inject, computed, shallowRef, onUnmounted } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { AppConfig, saveConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { formatClock } from '../ui/format'
import { useVisibleClock } from '../shared/visible-clock'
import { WPanel, WTabs, WChip, WEmpty, toast } from '../ui'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { dockIconShowing, hideWhilePlaying, tickWhile } from '../dock/dock'
import { actLabel } from './log-parse'
import {
  applyBossSpeech, applyRunEvent, comparisonRun, endRun, formatDelta, headlineDelta, isComplete,
  migrateRunTimer, parseHotkeyTarget, pauseRun, personalBest, resumeRun, runElapsed, runTotal, splitRows, startRun, sumOfBest
} from './run-timer'
import { CAMPAIGN_TYPE } from './widget'
import type { CampaignWidget } from './widget'
import { isWidgetTypeOn } from '../modules'
import { followGameLog } from '../shared/game-log'
import type { LogLine } from '../shared/game-log'
import type { CampaignRun } from './run-timer'

const props = defineProps<{
  config: RunTimerWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Run timer'
  props.config.anchor = { pos: 'tc', x: 50, y: 1 }
  props.config.autoStart = true
  props.config.charName = ''
  props.config.expanded = false
  props.config.compareTo = null
  props.config.run = null
  props.config.history = []
  wm.show(props.config.wmId)
}
migrateRunTimer(props.config)
hideWhilePlaying(props.config)
if (!props.config.lastLogAt) props.config.lastLogAt = Date.now()

// The campaign tracker shows run time in its strip; then this widget only
// shows the splits panel.
const docked = computed(() => {
  const cfg = AppConfig()
  if (!isWidgetTypeOn(cfg, CAMPAIGN_TYPE)) return false
  const campaign = cfg.widgets.find(w => w.wmType === CAMPAIGN_TYPE) as CampaignWidget | undefined
  if (!campaign) return false
  // Past the campaign: nothing from the timer either. While levelling, it shows
  // on its own only where the campaign icon doesn't (hideouts, maps).
  return campaign.state?.asleep === true || dockIconShowing('campaign')
})

const tab = shallowRef<'splits' | 'history'>('splits')

const now = shallowRef(Date.now())
// Ticks only while the widget is on screen.
useVisibleClock(() => props.config, () => { now.value = Date.now() }, 1000)
const cardShown = shallowRef(false)
onUnmounted(tickWhile(() => cardShown.value, () => { now.value = Date.now() }, 1000))

const run = computed(() => props.config.run)
const total = computed(() => run.value ? runElapsed(run.value, now.value) : 0)
const cmp = computed(() => comparisonRun(props.config))
const pb = computed(() => personalBest(props.config.history))
const pbTotal = computed(() => pb.value ? runTotal(pb.value) : null)
const sob = computed(() => sumOfBest(props.config.history))
const rows = computed(() => splitRows(run.value, cmp.value, props.config.history, now.value))
const current = computed(() => rows.value.find(r => r.state === 'current'))
const delta = computed(() => headlineDelta(rows.value))
const cmpLabel = computed(() => !cmp.value ? 'PB' : cmp.value.id === pb.value?.id ? 'PB' : formatDate(cmp.value.startedAt))

function start () {
  startRun(props.config, Date.now())
  saveConfig()
}
function togglePause () {
  const r = props.config.run
  if (!r) return
  if (r.runningSince != null) pauseRun(r, Date.now())
  else resumeRun(r, Date.now())
  now.value = Date.now()
  saveConfig()
}
function end () {
  endRun(props.config, Date.now())
  saveConfig()
}
function pickCompare (r: CampaignRun) {
  if (!isComplete(r)) return
  props.config.compareTo = r.id === pb.value?.id ? null : r.id
}
const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
// No "are you sure": delete now, offer Undo (P9).
function removeRun (id: number) {
  const before = props.config.history
  const compareBefore = props.config.compareTo
  props.config.history = before.filter(r => r.id !== id)
  if (props.config.compareTo === id) props.config.compareTo = null
  toast('Run deleted', { anchor: panel.value?.el, undo: () => { props.config.history = before; props.config.compareTo = compareBefore } })
}
function lastSplit (r: CampaignRun) {
  return r.splits.length ? r.splits[r.splits.length - 1].totalMs : r.elapsedMs
}
function formatDate (ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function applyLines (lines: LogLine[]) {
  let changed = false
  for (const { ev, at, line } of lines) {
    if (ev ? applyRunEvent(props.config, ev, at) : applyBossSpeech(props.config, line, at)) changed = true
  }
  if (lines.length) props.config.lastLogAt = lines[lines.length - 1].at
  if (changed) {
    now.value = Date.now()
    // Log events arrive while the game has focus, when APT doesn't save config.
    saveConfig()
  }
}

// Splits reached while the app was closed, timed by the log's own clock.
followGameLog({
  since: () => props.config.lastLogAt,
  onLines: (lines) => applyLines(lines)
})

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const parsed = parseHotkeyTarget(e.target)
  if (!parsed || parsed.wmId !== props.config.wmId) return
  if (parsed.action === 'pause') togglePause()
  else props.config.expanded = !props.config.expanded
})

onUnmounted(() => {
  hotkeys.abort()
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => run.value
  ? [
      { label: run.value.runningSince != null ? 'Pause run' : 'Resume run', icon: run.value.runningSince != null ? 'fas fa-pause' : 'fas fa-play', action: togglePause },
      { label: 'End run', icon: 'fas fa-flag-checkered', action: end }
    ]
  : [])
</script>

<style module>
.strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-md);
  box-shadow: var(--w-shadow);
  font-size: var(--w-fs-md);
  white-space: nowrap;
  color: var(--w-fg);
}
.where { font-size: var(--w-fs-lg); max-width: 16rem; }
.sep { width: 1px; align-self: stretch; background: var(--w-line); }
.k {
  font-size: var(--w-fs-caps);
  text-transform: var(--w-caps-case);
  letter-spacing: 0.08em;
  color: var(--w-faint);
  /* No face of its own: the HUD strip is small caps in every theme. */
}
.time { font-size: var(--w-fs-lg); }
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  padding: 8px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
}
.big { font-size: var(--w-fs-xl); font-weight: 500; }
.grid { grid-template-columns: minmax(0, 1fr) 3.6rem 4.4rem 3.6rem; }
.histGrid { grid-template-columns: minmax(0, 1fr) 4.4rem 3.8rem 22px; }
.now { background: var(--w-accent-soft); box-shadow: inset 2px 0 0 var(--w-accent); }
.gold { color: var(--w-warn); }
.mark { min-height: 22px; font-size: var(--w-fs-sm); color: var(--w-dim); }
.mark > span:first-child { padding-left: 14px; }
.pbChip { color: var(--w-warn); margin-left: 4px; }
</style>
