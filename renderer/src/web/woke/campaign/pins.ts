// Values the player chose to keep on screen in the campaign icon. Off by
// default; they show only while the icon does (never in maps or hideouts).
import { formatClock } from '../ui/format'
import { SUB_SPLITS, formatDelta, runElapsed } from './run-timer'
import type { CampaignRun } from './run-timer'

export type PinId = 'run' | 'act' | 'delta' | 'boss' | 'zone' | 'level' | 'step' | 'hint'

export const PIN_OPTIONS: Array<{ id: PinId, label: string, needsTimer: boolean, ticks: boolean }> = [
  { id: 'run', label: 'Run time', needsTimer: true, ticks: true },
  { id: 'act', label: 'Act time', needsTimer: true, ticks: true },
  { id: 'delta', label: 'Ahead or behind your best', needsTimer: true, ticks: true },
  { id: 'boss', label: 'Time to next boss, against your best', needsTimer: true, ticks: true },
  { id: 'zone', label: 'Time in this zone', needsTimer: true, ticks: true },
  { id: 'level', label: 'Level and XP penalty', needsTimer: false, ticks: false },
  { id: 'step', label: 'Current step', needsTimer: false, ticks: false },
  { id: 'hint', label: 'Area hint for the current step ("Go ↗")', needsTimer: false, ticks: false }
]

export type ReadoutTone = 'up' | 'down' | 'dim' | null

export interface Readout {
  id: PinId
  text: string
  tone: ReadoutTone
}

export interface PinInputs {
  pins: readonly string[]
  // The run in progress: finished runs have no times to show.
  run: CampaignRun | null
  // The run compared against.
  cmp: CampaignRun | null
  // Boss times are being recorded (the run timer's sub-splits setting).
  bosses: boolean
  now: number
  delta: number | null
  actMs: number | null
  level: number | null
  xp: { diff: number, band: string } | null
  step: string | null
  // The current step's first hint line ("Usually ↗"), if it has one.
  hint?: string | null
}

// The next boss of the current act, and how long your best run still had
// until reaching it (negative: you're past that time). No best: label only.
export function nextBoss (run: CampaignRun, cmp: CampaignRun | null, now: number): { label: string, leftMs: number | null } | null {
  const reached = new Set((run.marks ?? []).map(m => m.id))
  const def = SUB_SPLITS.find(d => d.act === run.act && !reached.has(d.id))
  if (!def) return null
  const best = cmp?.marks?.find(m => m.id === def.id)
  return { label: def.label, leftMs: best ? best.totalMs - runElapsed(run, now) : null }
}

export function pinnedReadouts (input: PinInputs): Readout[] {
  const { run, now } = input
  const out: Readout[] = []
  const add = (id: PinId, text: string, tone: ReadoutTone = null) => { out.push({ id, text, tone }) }
  for (const { id, needsTimer } of PIN_OPTIONS) {
    if (!input.pins.includes(id)) continue
    if (needsTimer && (!run || run.finished)) continue
    if (id === 'run') add(id, formatClock(runElapsed(run!, now)))
    else if (id === 'act') {
      if (input.actMs != null) add(id, `act ${formatClock(input.actMs)}`, 'dim')
    } else if (id === 'delta') {
      if (input.delta != null) add(id, formatDelta(input.delta), input.delta <= 0 ? 'up' : 'down')
    } else if (id === 'boss') {
      const boss = input.bosses ? nextBoss(run!, input.cmp, now) : null
      if (boss) {
        if (boss.leftMs == null) add(id, boss.label, 'dim')
        else if (boss.leftMs >= 0) add(id, `${boss.label} ${formatClock(boss.leftMs)}`, 'dim')
        else add(id, `${boss.label} +${formatClock(-boss.leftMs)}`, 'down')
      }
    } else if (id === 'zone') add(id, `zone ${formatClock(runElapsed(run!, now) - run!.zoneSinceMs)}`, 'dim')
    else if (id === 'level') {
      if (input.level != null) {
        const x = input.xp
        const gap = x ? ` ${x.diff > 0 ? '+' : x.diff < 0 ? '−' : '±'}${Math.abs(x.diff)}` : ''
        add(id, `Lv ${input.level}${gap}`, x?.band === 'penalty' ? 'down' : null)
      }
    } else if (id === 'step' && input.step) add(id, input.step)
    else if (id === 'hint' && input.hint) add(id, input.hint, 'dim')
  }
  return out
}

// Whether any pin needs the clock to keep ticking.
export function pinsTick (pins: readonly string[]): boolean {
  return PIN_OPTIONS.some(o => o.ticks && pins.includes(o.id))
}
