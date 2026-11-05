<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- While you play: one icon (act badge, green while ahead of your best);
         the strip and guide below show only with the overlay open. -->
    <DockItem ref="dockRef" id="campaign" title="Campaign" :show="dockShow"
      :badge="s.act ? actShort(s.act) : null" :tone="dockTone" :wm-id="config.wmId" card-width="24rem"
      @open-change="cardShown = $event">
      <template #card>
        <div :class="$style.body">
          <div class="flex items-baseline gap-2">
            <span class="w-head-font w-accent w-trunc">{{ s.act ? actLabel(s.act) + ' · ' : '' }}{{ s.zone || 'waiting for a zone change' }}</span>
            <span v-if="s.level != null" class="ml-auto w-num whitespace-nowrap">Lv {{ s.level }}
              <span v-if="xp" :class="[$style.pill, $style['pill--' + xp.band]]">{{ xpLabel }}</span></span>
          </div>
          <template v-if="current">
            <div v-for="(st, i) in shown" :key="st.index" :class="i === 0 ? $style.now : $style.next">
              <div class="flex gap-1.5">
                <span :class="i === 0 ? 'w-accent' : 'w-faint'">{{ i === 0 ? '›' : '·' }}</span>
                <span class="min-w-0"><RouteParts :parts="st.parts" />
                  <span v-if="st.recommendedLevel != null" class="w-num" :class="lowFor(st) ? 'w-down' : 'w-faint'"> · lv {{ st.recommendedLevel }}</span></span>
              </div>
              <div v-for="(sub, j) in (i === 0 ? st.subs : [])" :key="j" :class="$style.sub" class="w-dim"><RouteParts :parts="sub" /></div>
            </div>
          </template>
          <div v-else class="w-dim">Route finished. Good luck in maps.</div>
          <div v-if="note" :class="$style.callout" class="whitespace-pre-wrap">{{ note }}</div>
          <div v-if="timer" class="flex gap-2 w-num" :class="$style.build">
            <span class="w-dim">Run</span> {{ formatClock(timer.total) }}
            <span v-if="timer.delta != null" :class="timer.delta <= 0 ? 'w-up' : 'w-down'">{{ formatDelta(timer.delta) }}</span>
            <span v-if="timer.paused" style="color: var(--w-warn);">paused</span>
            <span v-if="timer.act" class="ml-auto w-dim">act {{ formatClock(timer.act) }}</span>
          </div>
          <CampaignBuild :config="config" :show-tree="false" :max-links="1" />
        </div>
      </template>
    </DockItem>
    <div v-if="visible" class="flex flex-col items-start gap-1 min-w-0" data-w-panel>
      <!-- HUD strip: no title bar, so the strip itself is the drag handle. -->
      <div data-widget-drag :class="$style.strip">
        <template v-if="logMissing && !s.updatedAt">
          <span class="w-down"><i class="fas fa-exclamation-triangle text-xs" /> Client.txt not found.</span>
          <span class="w-dim">Set its path in Settings → General.</span>
        </template>
        <template v-else-if="!s.zone">
          <span class="w-dim">Campaign tracker · waiting for a zone change…</span>
        </template>
        <template v-else>
          <span :class="$style.where" class="w-head-font w-accent w-trunc">
            <template v-if="s.act">{{ actShort(s.act) }} · </template>{{ s.zone }}
          </span>
          <template v-if="s.level != null">
            <span :class="$style.sep" />
            <span class="flex items-center gap-1.5" :title="xpTitle">
              <span :class="$style.k">Lv</span> <span class="w-num">{{ s.level }}</span>
              <span v-if="xp" :class="[$style.pill, $style['pill--' + xp.band]]">{{ xpLabel }}</span>
            </span>
            <span v-if="s.charName" class="w-dim w-trunc" :class="$style.char" :title="`Following ${s.charName}'s level-ups`">{{ s.charName }}</span>
            <button v-if="wm.active.value && otherChar" class="w-icon-btn" :class="$style.switch"
              :title="`Follow ${otherChar.charName} (${otherChar.className}, level ${otherChar.level}) instead`"
              @click="follow(otherChar)">
              <i class="fas fa-exchange-alt text-xs" /> {{ otherChar.charName }}
            </button>
          </template>
          <template v-if="timer">
            <span :class="$style.sep" />
            <span><span :class="$style.k">Run</span> <span class="w-num">{{ formatClock(timer.total) }}</span></span>
            <span v-if="timer.delta != null" class="w-num" :class="timer.delta <= 0 ? 'w-up' : 'w-down'">{{ formatDelta(timer.delta) }}</span>
            <span v-if="timer.paused" class="w-num" style="color: var(--w-warn);">paused</span>
          </template>
          <template v-if="!config.cardOpen && current">
            <span :class="$style.sep" />
            <span class="w-trunc" :class="$style.oneLine"><span class="w-accent">›</span> <RouteParts :parts="current.parts" /></span>
          </template>
        </template>

        <span v-if="wm.active.value" class="flex items-center gap-0.5">
          <span :class="$style.sep" />
          <button class="w-icon-btn" title="Back one step" @click="move(-1)"><i class="fas fa-chevron-left text-xs" /></button>
          <button class="w-icon-btn" title="Mark step done" @click="move(1)"><i class="fas fa-chevron-right text-xs" /></button>
          <button class="w-icon-btn" :class="{ 'w-icon-btn--on': config.cardOpen }" title="Show or hide the guide" @click="config.cardOpen = !config.cardOpen">
            <i class="fas fa-route text-xs" />
          </button>
          <button v-if="timerWidget" class="w-icon-btn" :class="{ 'w-icon-btn--on': timerWidget.expanded }" title="Splits and past runs" @click="timerWidget.expanded = !timerWidget.expanded">
            <i class="fas fa-stopwatch text-xs" />
          </button>
        </span>
      </div>

      <!-- Guide card -->
      <div v-if="config.cardOpen && (s.zone || wm.active.value)" :class="$style.card">
        <div :class="$style.cardHead" data-widget-drag>
          <span class="w-head-font">{{ current ? actLabel(current.act) : 'Campaign' }}</span>
          <span v-if="current" class="w-faint ml-auto">{{ left }} step{{ left === 1 ? '' : 's' }} left in act</span>
        </div>
        <div v-if="!current" class="w-dim" :class="$style.body">Route finished. Good luck in maps.</div>
        <div v-else :class="$style.body">
          <div v-for="(st, i) in shown" :key="st.index" :class="i === 0 ? $style.now : $style.next">
            <div class="flex gap-1.5">
              <span :class="i === 0 ? 'w-accent' : 'w-faint'">{{ i === 0 ? '›' : '·' }}</span>
              <span class="min-w-0">
                <RouteParts :parts="st.parts" />
                <span v-if="st.recommendedLevel != null" class="w-num" :class="lowFor(st) ? 'w-down' : 'w-faint'"> · lv {{ st.recommendedLevel }}</span>
              </span>
            </div>
            <div v-for="(sub, j) in (i === 0 ? st.subs : [])" :key="j" :class="$style.sub" class="w-dim">
              <RouteParts :parts="sub" />
            </div>
          </div>
          <div v-if="note" :class="$style.callout" class="whitespace-pre-wrap">{{ note }}</div>

          <CampaignBuild :config="config" :tickable="wm.active.value" />
        </div>
      </div>
    </div>
    <div v-else-if="wm.active.value" data-widget-drag :class="$style.strip" class="w-faint">Campaign tracker · hidden after the campaign</div>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { CAMPAIGN_TYPE } from './widget'

export default {
  widget: {
    type: CAMPAIGN_TYPE,
    instances: 'multi',
    trNameKey: 'Campaign tracker'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { inject, computed, reactive, shallowRef, watch, onUnmounted } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { AppConfig, saveConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { formatClock } from '../ui/format'
import { useVisibleClock } from '../shared/visible-clock'
import RouteParts from './RouteParts.vue'
import DockItem from '../dock/DockItem.vue'
import { hideWhilePlaying, tickWhile } from '../dock/dock'
import { reportProblem } from '../dock/health'
import { actFromAreaId, actLabel } from './log-parse'
import CampaignBuild from './CampaignBuild.vue'
import type { LogEvent } from './log-parse'
import { emptyState, migrateCampaign, parseHotkeyTarget } from './widget'
import type { CampaignWidget } from './widget'
import { advanceOnEnter, resyncTo, stepsLeftInAct, upcoming, xpState } from './route-parse'
import type { RouteStep } from './route-parse'
import { bundledRoute, routeData } from './route-data'
import { followGameLog } from '../shared/game-log'
import type { LogLine } from '../shared/game-log'
import {
  RUN_TIMER_TYPE, comparisonRun, formatDelta, headlineDelta, runElapsed, splitRows
} from './run-timer'
import type { RunTimerWidget } from './run-timer'
import { isWidgetTypeOn } from '../modules'

const props = defineProps<{
  config: CampaignWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Campaign tracker'
  props.config.anchor = { pos: 'tc', x: 50, y: 1 }
  props.config.charName = ''
  props.config.actNotes = {}
  props.config.zoneNotes = []
  props.config.showBuild = true
  props.config.state = emptyState()
  wm.show(props.config.wmId)
}
migrateCampaign(props.config)
hideWhilePlaying(props.config)

const s = computed(() => props.config.state)

// ---- route ----

const route = computed(() => bundledRoute(props.config.route))
// Options changed: the step list is different, so find our place again.
watch(() => `${props.config.route.leagueStart}|${props.config.route.library}|${props.config.route.bandit}`, () => {
  if (props.config.state.areaId) props.config.step = resyncTo(route.value, props.config.state.areaId)
})

const current = computed<RouteStep | undefined>(() => route.value.steps[props.config.step])
const shown = computed(() => upcoming(route.value, props.config.step, Math.max(1, props.config.cardSteps)))
const left = computed(() => stepsLeftInAct(route.value, props.config.step))

function move (by: number) {
  props.config.step = Math.min(route.value.steps.length, Math.max(0, props.config.step + by))
  saveConfig()
}

function lowFor (st: RouteStep) {
  return s.value.level != null && st.recommendedLevel != null && s.value.level < st.recommendedLevel
}

function actShort (act: number) {
  return act === 11 ? 'Epilogue' : `A${act}`
}

// ---- XP band ----

const xp = computed(() => (s.value.level != null && s.value.areaLevel != null && actFromAreaId(s.value.areaId) != null)
  ? xpState(s.value.level, s.value.areaLevel)
  : null)
const xpLabel = computed(() => {
  const x = xp.value
  if (!x) return ''
  const sign = x.diff > 0 ? '+' : x.diff < 0 ? '−' : '±'
  const gap = `${sign}${Math.abs(x.diff)}`
  if (x.band === 'penalty') return `${gap} · ${Math.round(x.multiplier * 100)}% XP`
  if (x.band === 'edge') return `${gap} · edge`
  return `${gap} · full XP`
})
const xpTitle = computed(() => {
  const x = xp.value
  if (!x) return ''
  const where = x.diff > 0 ? 'over-levelled for' : x.diff < 0 ? 'under-levelled for' : 'level with'
  return `You are ${where} this area (area level ${s.value.areaLevel}). No XP penalty within ±${x.safeRange} levels.` +
    (x.band === 'penalty' ? ` You get ${Math.round(x.multiplier * 100)}% XP here.` : '')
})

// ---- personal notes (optional) ----

const note = computed(() => {
  const zone = s.value.zone.toLowerCase()
  const parts: string[] = []
  if (zone) {
    for (const n of props.config.zoneNotes) {
      if (n.zone.trim().toLowerCase() === zone && n.text.trim()) parts.push(n.text)
    }
  }
  if (s.value.act != null) {
    const a = (props.config.actNotes[String(s.value.act)] ?? '').trim()
    if (a) parts.push(a)
  }
  return parts.join('\n\n')
})

// ---- run timer (shown in this strip when the timer widget is placed) ----

const now = shallowRef(Date.now())
// Ticks only while the widget is on screen.
useVisibleClock(() => props.config, () => { now.value = Date.now() }, 1000)
// ...and while the dock card is open.
const cardShown = shallowRef(false)
onUnmounted(tickWhile(() => cardShown.value, () => { now.value = Date.now() }, 1000))

const timerWidget = computed(() => {
  const cfg = AppConfig()
  if (!isWidgetTypeOn(cfg, RUN_TIMER_TYPE)) return undefined
  return cfg.widgets.find(w => w.wmType === RUN_TIMER_TYPE && w.wmWants === 'show') as RunTimerWidget | undefined
})
const timer = computed(() => {
  const w = timerWidget.value
  const run = w?.run
  if (!w || !run) return null
  const rows = splitRows(run, comparisonRun(w), w.history, now.value)
  return {
    total: runElapsed(run, now.value),
    delta: headlineDelta(rows),
    act: rows.find(r => r.state === 'current')?.segmentMs ?? null,
    paused: !run.finished && run.runningSince == null
  }
})

// ---- visibility ----

const campaignDone = computed(() => props.config.step >= route.value.steps.length || s.value.act === 11 ||
  (timerWidget.value?.run?.finished ?? false))
const visible = computed(() => {
  if (!props.config.hideAfterCampaign || !campaignDone.value) return true
  // Still show in campaign zones (e.g. the Epilogue), hide in maps and hideouts.
  return actFromAreaId(s.value.areaId) != null
})

// ---- dock icon ----

// Campaign areas and towns only; maps, hideouts and the lab hide it.
const dockShow = computed(() => visible.value && actFromAreaId(s.value.areaId) != null)
const dockTone = computed(() => {
  const d = timer.value?.delta
  return d == null ? 'accent' : d <= 0 ? 'up' : 'down'
})
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)

function peekStep () {
  const step = current.value
  if (!step || !s.value.zone) return
  dockRef.value?.peek(`${s.value.zone} · ${step.parts.map(p => p.text).join('')}`)
}

// ---- Client.txt ----

function apply (ev: LogEvent): boolean {
  const state = props.config.state
  if (ev.kind === 'area') {
    state.areaId = ev.areaId
    state.areaLevel = ev.areaLevel
    const act = actFromAreaId(ev.areaId)
    if (act != null) state.act = act
    // A new character: back to the start of the route, and follow whoever
    // levels next (unless a name is set in the settings).
    if (ev.areaId === '1_1_1' && props.config.step > 3) {
      props.config.step = 0
      state.charName = ''
      state.className = ''
      state.level = null
      state.gemsGot = []
    }
    props.config.step = advanceOnEnter(route.value, props.config.step, ev.areaId, routeData)
  } else if (ev.kind === 'zone') {
    state.zone = ev.name
    if (caughtUp) setTimeout(peekStep, 0)
  } else if (ev.kind === 'level') {
    // Party members' level-ups are logged too. Follow the character named
    // in the settings, or else the first one seen, the way the run timer does.
    const wanted = props.config.charName.trim() || state.charName
    if (wanted && wanted !== ev.charName) {
      others.set(ev.charName, { charName: ev.charName, className: ev.className, level: ev.level })
      lastOther.value = ev.charName
      return false
    }
    others.delete(ev.charName)
    state.charName = ev.charName
    state.className = ev.className
    state.level = ev.level
  }
  return true
}

// Other characters seen levelling (party members), for the one-click switch.
interface SeenChar { charName: string, className: string, level: number }
const others = reactive(new Map<string, SeenChar>())
const lastOther = shallowRef('')
const otherChar = computed(() => (lastOther.value ? others.get(lastOther.value) : undefined))

function follow (c: SeenChar) {
  const state = props.config.state
  if (state.charName) {
    others.set(state.charName, { charName: state.charName, className: state.className, level: state.level ?? 0 })
  }
  others.delete(c.charName)
  // A name set in the settings is a pin; move the pin to the new character.
  if (props.config.charName.trim()) props.config.charName = c.charName
  state.charName = c.charName
  state.className = c.className
  state.level = c.level
  lastOther.value = others.size ? [...others.keys()].pop()! : ''
  saveConfig()
}

const logMissing = shallowRef(false)
// Replayed lines from the start-up read don't peek the next step.
let caughtUp = false

function applyLines (lines: LogLine[]) {
  let changed = false
  let at = 0
  for (const { ev, at: lineAt } of lines) {
    if (ev && apply(ev)) { changed = true; at = lineAt }
  }
  if (changed) {
    now.value = Date.now()
    props.config.state.updatedAt = at
    // Log events arrive while the game has focus, when APT doesn't save config.
    saveConfig()
  }
}

// Catch up on what happened while the app was closed, then go live.
followGameLog({
  since: () => props.config.state.updatedAt,
  onLines: (lines, live) => { caughtUp = live; applyLines(lines) },
  onTail: (tail) => {
    logMissing.value = tail.path == null
    reportProblem('client-log', logMissing.value ? 'Client.txt not found, so the campaign tracker can\'t follow you. Set its path in Settings → General.' : null)
  }
})

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const parsed = parseHotkeyTarget(e.target)
  if (!parsed || parsed.wmId !== props.config.wmId) return
  if (parsed.action === 'card') props.config.cardOpen = !props.config.cardOpen
  else move(parsed.action === 'next' ? 1 : -1)
  saveConfig()
})

onUnmounted(() => {
  hotkeys.abort()
})
</script>

<style module>
.strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-md);
  box-shadow: var(--w-shadow);
  font-size: var(--w-fs-md);
  white-space: nowrap;
  color: var(--w-fg);
  max-width: 64rem;
}
.where { font-size: var(--w-fs-lg); max-width: 18rem; }
.char { max-width: 9rem; }
.switch { width: auto; padding: 0 6px; gap: 4px; font-size: var(--w-fs-md); }
.oneLine { max-width: 26rem; }
.sep { width: 1px; align-self: stretch; background: var(--w-line); }
.k {
  font-size: var(--w-fs-xs);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--w-faint);
}
.pill {
  font-family: var(--w-num);
  font-size: var(--w-fs-xs);
  padding: 0 7px;
  border-radius: var(--w-r-pill);
  line-height: 17px;
}
.pill--safe { color: var(--w-up); background: color-mix(in srgb, var(--w-up) 15%, transparent); }
.pill--edge { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 15%, transparent); }
.pill--penalty { color: var(--w-down); background: color-mix(in srgb, var(--w-down) 16%, transparent); }
.card {
  width: 24rem;
  max-width: 100%;
  background: var(--w-panel);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-md);
  box-shadow: var(--w-shadow);
  color: var(--w-fg);
  font-size: var(--w-fs-md);
  overflow: hidden;
}
.cardHead {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px var(--w-pad);
  background: var(--w-header-bg);
  border-bottom: 1px solid var(--w-line);
  color: var(--w-accent);
  font-size: var(--w-fs-md);
}
.cardHead :global(.w-faint) { font-size: var(--w-fs-xs); }
.body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px var(--w-pad) 8px;
}
.now {
  margin: 0 calc(-1 * var(--w-pad));
  padding: 3px var(--w-pad);
  background: var(--w-accent-soft);
  box-shadow: inset 2px 0 0 var(--w-accent);
}
.next { color: var(--w-dim); }
.sub { padding-left: 14px; font-size: var(--w-fs-sm); }
.callout {
  margin-top: 4px;
  padding: 4px 8px;
  background: var(--w-accent-soft);
  border-left: 2px solid var(--w-accent);
  border-radius: var(--w-r-sm);
}
.build {
  margin-top: 4px;
  border-top: 1px solid var(--w-line);
  padding-top: 4px;
}
</style>
