<template>
  <Widget :config="config" move-handles="none" :inline-edit="false" :readonly="true">
    <!-- The tracker is only this icon and its card, with the overlay open too. -->
    <DockItem :menu="dockMenu" ref="dockRef" id="campaign" title="Campaign" :show="dockShow"
      :badge="dockBadge" :tone="dockTone" :progress="actStep ? actStep.done / actStep.total : null" :readouts="readouts"
      pinnable card-width="24rem" @open-change="cardShown = $event">
      <template #card>
        <div :class="$style.body">
          <div class="flex items-baseline gap-2">
            <span class="w-head-font w-accent w-trunc" :title="s.charName ? `Following ${s.charName}'s level-ups` : undefined">{{ s.zone || 'Waiting for a zone change' }}</span>
            <span v-if="s.level != null" class="ml-auto w-num whitespace-nowrap" :title="xpTitle">Lv {{ s.level }}
              <span v-if="xp" :class="[$style.pill, $style['pill--' + xp.band]]">{{ xpLabel }}</span></span>
          </div>
          <template v-if="current">
            <div :class="$style.actHead"><span>{{ actLabel(current.act) }}</span><span v-if="actStep" class="w-num">{{ actStep.done }} of {{ actStep.total }}</span></div>
            <div v-if="actStep" :class="$style.prog"><i :style="{ width: `${actStep.done / actStep.total * 100}%` }" /></div>
            <div v-for="d in done" :key="d.step.index" class="flex gap-1.5" :class="$style.done">
              <span>✓</span>
              <span class="min-w-0 w-trunc" :class="$style.doneText"><RouteParts :parts="d.step.parts" /></span>
              <span v-if="d.took != null" class="ml-auto w-num whitespace-nowrap" title="How long this step took">{{ formatClock(d.took) }}</span>
            </div>
            <div v-for="(st, i) in shown" :key="st.index" :class="i === 0 ? $style.now : $style.next">
              <div class="flex gap-1.5">
                <span :class="i === 0 ? 'w-accent' : 'w-faint'">{{ i === 0 ? '›' : '·' }}</span>
                <span class="min-w-0"><RouteParts :parts="st.parts" />
                  <span v-if="st.recommendedLevel != null" class="w-num" :class="lowFor(st) ? 'w-down' : 'w-faint'"> · lv {{ st.recommendedLevel }}</span></span>
              </div>
              <div v-for="(sub, j) in (i === 0 ? st.subs : [])" :key="j" :class="$style.sub" class="w-dim"><RouteParts :parts="sub" /></div>
            </div>
          </template>
          <div v-else class="w-dim">Route finished.</div>
          <div v-if="note" :class="$style.callout" class="whitespace-pre-wrap">{{ note }}</div>
          <div v-if="timer" class="flex gap-2 w-num" :class="$style.build">
            <span class="w-dim">Run</span> {{ formatClock(timer.total) }}
            <span v-if="timer.delta != null" :class="timer.delta <= 0 ? 'w-up' : 'w-down'">{{ formatDelta(timer.delta) }}</span>
            <span v-if="timer.paused" style="color: var(--w-warn);">paused</span>
            <span v-if="timer.act" class="ml-auto w-dim">act {{ formatClock(timer.act) }}</span>
          </div>
          <!-- Pinned by a click with the overlay open: the card grows to hold the
               step buttons and the full build. -->
          <CampaignBuild :config="config" :tickable="expanded" :show-tree="expanded" :max-links="expanded ? 2 : 1" />
          <div v-if="expanded" class="flex flex-wrap items-center gap-1" :class="$style.build">
            <button class="w-icon-btn" :class="$style.textBtn" @click="move(-1)"><i class="fas fa-chevron-left text-xs" /> Step back</button>
            <button class="w-icon-btn" :class="$style.textBtn" @click="move(1)">Step done <i class="fas fa-chevron-right text-xs" /></button>
            <button v-if="timerWidget" class="w-icon-btn" :class="[$style.textBtn, { 'w-icon-btn--on': timerWidget.expanded }]" @click="toggleSplits"><i class="fas fa-stopwatch text-xs" /> Splits</button>
            <button v-if="otherChar" class="w-icon-btn" :class="$style.textBtn"
              :title="`Follow ${otherChar.charName} (${otherChar.className}, level ${otherChar.level}) instead`" @click="follow(otherChar)">
              <i class="fas fa-exchange-alt text-xs" /> {{ otherChar.charName }}
            </button>
          </div>
        </div>
      </template>
    </DockItem>
  </Widget>
</template>

<script lang="ts">
import { widgetCampaignSpec } from '../widget-specs'

export default { widget: widgetCampaignSpec }
</script>

<script setup lang="ts">
import { inject, computed, reactive, shallowRef, watch, onUnmounted } from 'vue'
import { Host, MainProcess } from '@/web/background/IPC'
import { AppConfig, saveConfig } from '@/web/Config'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { formatClock } from '../ui/format'
import RouteParts from './RouteParts.vue'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, showWithOverlay, tickWhile } from '../dock/dock'
import { reportProblem } from '../dock/health'
import { pinnedReadouts, pinsTick } from './pins'
import { actFromAreaId, actLabel } from './log-parse'
import CampaignBuild from './CampaignBuild.vue'
import type { LogEvent } from './log-parse'
import { emptyState, markStepStart, migrateCampaign, parseHotkeyTarget, routeAsleepAfter, saveCharacter, shouldSwitch, stepTook, switchCharacter } from './widget'
import type { CampaignWidget } from './widget'
import { actProgress, advanceOnEnter, behind, resyncTo, upcoming, xpState } from './route-parse'
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
  props.config.wmTitle = 'Campaign'
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
// Nothing to open from the tab bar: the icon is the whole tracker.
if (!props.config.wmFlags.includes('menu::skip')) props.config.wmFlags = [...props.config.wmFlags, 'menu::skip']

const s = computed(() => props.config.state)

// ---- route ----

const route = computed(() => bundledRoute(props.config.route))
// Options changed: the step list is different, so find our place again.
watch(() => `${props.config.route.leagueStart}|${props.config.route.library}|${props.config.route.bandit}`, () => {
  // Saved characters' step times are numbered for the old route too. Their
  // step stays: their own area isn't known (the log names no character).
  for (const c of Object.values(props.config.chars ?? {})) c.state.stepStarts = {}
  // The last-level-up snapshot is in old step numbers: no rollback from it.
  lastOwn.charName = ''
  // Asleep, or somewhere the route never goes (a map, a hideout): keep the place.
  if (props.config.state.asleep || !props.config.state.areaId) return
  // Step numbers mean other steps now, so their times are gone.
  props.config.state.stepStarts = {}
  const step = resyncTo(route.value, props.config.state.areaId)
  if (step > 0) props.config.step = step
  remember()
})

const current = computed<RouteStep | undefined>(() => route.value.steps[props.config.step])
const shown = computed(() => upcoming(route.value, props.config.step, Math.max(1, props.config.cardSteps)))
const actStep = computed(() => actProgress(route.value, props.config.step))
// Finished steps above the current one, with how long each took.
const done = computed(() => {
  const starts = s.value.stepStarts ?? {}
  return behind(route.value, props.config.step, Math.min(5, Math.max(0, Math.floor(props.config.cardBehind || 0))))
    .map(step => ({ step, took: stepTook(starts, step.index) }))
})

function setStep (step: number, at: number) {
  props.config.step = step
  props.config.state.stepStarts = markStepStart(props.config.state.stepStarts ?? {}, step, at)
}

function move (by: number) {
  const step = Math.min(route.value.steps.length, Math.max(0, props.config.step + by))
  if (step !== props.config.step) {
    setStep(step, Date.now())
    setTimeout(peekStep, 0)
  }
  saveConfig()
}

// A step changed: the icon grows into the next step for a moment.
function stepChanged (step: number, at: number) {
  setStep(step, at)
  if (caughtUp) setTimeout(peekStep, 0)
}

// The splits panel opens where the card may be, so the card lets go.
function toggleSplits () {
  const w = timerWidget.value
  if (!w) return
  w.expanded = !w.expanded
  if (w.expanded) dockRef.value?.togglePin()
}

function openSettings () {
  const settings = wm.widgets.value.find(w => w.wmType === 'settings')
  if (!settings) return
  // A click on a card doesn't open the overlay, and settings need it.
  Host.sendEvent({ name: 'OVERLAY->MAIN::woke-open-overlay', payload: undefined })
  wm.setFlag(settings.wmId, 'settings::page=Campaign & run timer', true)
  wm.show(settings.wmId)
}

function lowFor (st: RouteStep) {
  return s.value.level != null && st.recommendedLevel != null && s.value.level < st.recommendedLevel
}

function actShort (act: number) {
  return act === 11 ? 'Epilogue' : `A${act}`
}

// The zone you stand in and the step you're on can be in different acts (the
// route goes back to towns), so everything about progress reads the step.
const areaAct = computed(() => actFromAreaId(s.value.areaId))
const dockBadge = computed(() => {
  const act = current.value?.act ?? (areaAct.value === 11 ? 11 : null)
  return act != null ? actShort(act) : null
})

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
const cardShown = shallowRef(false)

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

// ---- dock icon ----

// Campaign areas and towns only, while the route is awake and has steps left
// (the Epilogue still shows it, finished). Maps, hideouts and the lab hide it.
const dockShow = computed(() => !s.value.asleep && areaAct.value != null && (current.value != null || areaAct.value === 11))
// Ticks only while the card is open, or the icon shows a pinned time.
onUnmounted(tickWhile(() => cardShown.value || (dockShow.value && pinsTick(props.config.pins)), () => { now.value = Date.now() }, 1000))
const dockTone = computed(() => {
  const d = timer.value?.delta
  return d == null ? 'accent' : d <= 0 ? 'up' : 'down'
})
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
const expanded = computed(() => dockRef.value?.clickPinned ?? false)

const readouts = computed(() => {
  const w = timerWidget.value
  const run = w?.run ?? null
  return pinnedReadouts({
    pins: props.config.pins,
    run,
    // No run yet can also mean the timer widget hasn't filled itself in.
    cmp: w && run ? comparisonRun(w) : null,
    bosses: w?.subSplits !== false,
    now: now.value,
    delta: timer.value?.delta ?? null,
    actMs: timer.value?.act ?? null,
    level: s.value.level,
    xp: xp.value,
    step: current.value ? current.value.parts.map(p => p.text).join('') : null
  })
})

function peekStep () {
  const step = current.value
  if (!step || !s.value.zone) return
  dockRef.value?.peek(`Next: ${step.parts.map(p => p.text).join('')}`)
}

// ---- Client.txt ----

function apply (ev: LogEvent, at: number): boolean {
  const state = props.config.state
  if (ev.kind === 'area') {
    state.areaId = ev.areaId
    state.areaLevel = ev.areaLevel
    const act = actFromAreaId(ev.areaId)
    if (act != null) state.act = act
    // A new character: back to the start of the route, and follow whoever
    // levels next (unless a name is set in the settings).
    // Twilight Strand: whatever came before was another character's steps.
    if (ev.areaId === '1_1_1' && props.config.step > 3) {
      // The character before keeps its route, step times and gems for when it's back.
      saveCharacter(props.config)
      streak = 0
    }
    if (ev.areaId === '1_1_1') state.stepStarts = {}
    if (ev.areaId === '1_1_1' && props.config.step > 3) {
      props.config.step = 0
      state.charName = ''
      state.className = ''
      state.level = null
      state.gemsGot = []
    }
    state.asleep = routeAsleepAfter(state.asleep ?? false, ev.areaId)
    // A character past the campaign doesn't walk the route by using towns.
    if (!state.asleep) {
      const step = advanceOnEnter(route.value, props.config.step, ev.areaId, routeData)
      if (step !== props.config.step) stepChanged(step, at)
    }
  } else if (ev.kind === 'zone') {
    state.zone = ev.name
  } else if (ev.kind === 'level') {
    // Party members' level-ups are logged too. Follow the character named
    // in the settings, or else the first one seen, the way the run timer does.
    const pinned = props.config.charName.trim()
    const wanted = pinned || state.charName
    if (wanted && wanted !== ev.charName) {
      others.set(ev.charName, { charName: ev.charName, className: ev.className, level: ev.level })
      lastOther.value = ev.charName
      streak = streakName === ev.charName ? streak + 1 : 1
      streakName = ev.charName
      // Each character keeps its own route: switch to the one you're playing.
      if (!pinned && shouldSwitch(state.charName, ev.charName, streak, followedLevelAt, at)) {
        // The zones walked since the followed character last levelled were the
        // other one's: give the followed one back its place from then.
        if (lastOwn.charName === state.charName) {
          props.config.step = lastOwn.step
          state.stepStarts = lastOwn.stepStarts
        }
        takeOver(ev, at)
        return true
      }
      return false
    }
    streak = 0
    followedLevelAt = at
    // The followed name changed (a pin moved in Settings, or the first level-up
    // after a new character's Strand): take that character's own route out.
    if (ev.charName !== state.charName && (state.charName || props.config.chars?.[ev.charName])) {
      takeOver(ev, at)
      return true
    }
    others.delete(ev.charName)
    state.charName = ev.charName
    state.className = ev.className
    state.level = ev.level
    remember()
  }
  return true
}

// Level-ups in a row by one other character, and when the followed one last
// levelled (log time; see shouldSwitch).
let streak = 0
let streakName = ''
// From the last saved line: a restart mid-session isn't taken for a quiet spell.
let followedLevelAt = props.config.state.updatedAt || 0

// The followed character's place at its last level-up: surely its own.
let lastOwn = { charName: '', step: 0, stepStarts: {} as Record<string, number> }
function remember () {
  const st = props.config.state
  lastOwn = { charName: st.charName, step: props.config.step, stepStarts: { ...(st.stepStarts ?? {}) } }
}
remember()

function takeOver (c: SeenChar, at: number) {
  const before = props.config.state
  if (before.charName) others.set(before.charName, { charName: before.charName, className: before.className, level: before.level ?? 0 })
  others.delete(c.charName)
  switchCharacter(props.config, c, resyncTo(route.value, before.areaId))
  lastOther.value = others.size ? [...others.keys()].pop()! : ''
  streak = 0
  followedLevelAt = at
  remember()
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
  // A name set in the settings is a pin; move the pin to the new character.
  if (props.config.charName.trim()) props.config.charName = c.charName
  takeOver(c, Date.now())
  lastOther.value = others.size ? [...others.keys()].pop()! : ''
  saveConfig()
}

// Replayed lines from the start-up read don't peek the next step.
let caughtUp = false

function applyLines (lines: LogLine[]) {
  let changed = false
  let at = 0
  for (const { ev, at: lineAt } of lines) {
    if (ev && apply(ev, lineAt)) { changed = true; at = lineAt }
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
    reportProblem('client-log', tail.path == null ? 'Client.txt not found, so the campaign tracker can\'t follow you. Set its path in Settings → General.' : null)
  }
})

const hotkeys = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  const parsed = parseHotkeyTarget(e.target)
  if (!parsed || parsed.wmId !== props.config.wmId) return
  if (parsed.action === 'card') dockRef.value?.togglePin()
  else if (!props.config.state.asleep) move(parsed.action === 'next' ? 1 : -1)
  saveConfig()
})

onUnmounted(() => {
  hotkeys.abort()
})

// The icon's right-click menu.
const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Next step', icon: 'fas fa-step-forward', action: () => { move(1) } },
  { label: 'Previous step', icon: 'fas fa-step-backward', action: () => { move(-1) } },
  ...(timerWidget.value
    ? [{
        label: 'Splits and past runs',
        icon: 'far fa-clock',
        action: () => {
          const w = timerWidget.value
          if (!w) return
          w.expanded = true
          showWithOverlay(wm, w.wmId)
        }
      }]
    : []),
  { label: 'Choose what stays on screen', icon: 'fas fa-thumbtack', action: openSettings }
])
</script>

<style module>
.pill {
  font-family: var(--w-num);
  font-size: var(--w-fs-xs);
  padding: 0 7px;
  border-radius: var(--w-r-pill);
  line-height: calc(17px * var(--w-text-scale, 1));
}
.pill--safe { color: var(--w-up); background: color-mix(in srgb, var(--w-up) 15%, transparent); }
.pill--edge { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 15%, transparent); }
.pill--penalty { color: var(--w-down); background: color-mix(in srgb, var(--w-down) 16%, transparent); }
.actHead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 4px;
  font-size: var(--w-fs-caps);
  letter-spacing: 0.06em;
  text-transform: var(--w-caps-case);
  color: var(--w-dim);
  font-family: var(--w-caps-face);
}
.prog {
  height: 4px;
  margin-bottom: 3px;
  border-radius: var(--w-r-sm);
  background: var(--w-line);
  overflow: hidden;
}
.prog i { display: block; height: 100%; background: var(--w-accent); }
.textBtn { width: auto; padding: 0 6px; gap: 4px; font-size: var(--w-fs-sm); }
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
.done { color: var(--w-faint); font-size: var(--w-fs-sm); }
.doneText { text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--w-faint) 55%, transparent); }
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
