import { describe, it, expect } from 'vitest'
import { TRIAL_DONE_LINES, isTrialFinished, parseLogLine } from '@/web/woke/campaign/log-parse'
import { advanceOnTrial, DEFAULT_ROUTE_OPTIONS } from '@/web/woke/campaign/route-parse'
import { bundledRoute } from '@/web/woke/campaign/route-data'

const say = (who: string, text: string) => `2026/11/14 11:43:07 763686671 cffb06be [INFO Client 16832] ${who}: ${text}`

// Normal and cruel trials, and the line Izaro says on finishing each (Guy's Client.txt).
const TRIALS: Array<[areaId: string, line: string]> = [
  ['1_1_7_1', 'Belief is the strongest metal of them all.'],
  ['1_2_6_2', 'There is a fine line between consideration and hesitation. The former is wisdom, the latter is fear.'],
  ['1_2_5_1', 'Shine boldly so that all might find you when the night falls.'],
  ['1_3_3_1', 'Allow your wisdom to be tempered by the flames of the past.'],
  ['1_3_6', 'An emperor must bear two blades. Hope in the left hand. Surety in the right.'],
  ['1_3_15', 'An emperor must know precisely where he stands.'],
  ['2_6_7_1', 'Belief is the strongest metal of them all.'],
  ['2_7_4', 'Shine boldly so that all might find you when the night falls.'],
  ['2_7_5_2', 'There is a fine line between consideration and hesitation. The former is wisdom, the latter is fear.'],
  ['2_8_5', 'Allow your wisdom to be tempered by the flames of the past.'],
  ['2_9_7', 'An emperor must bear two blades. Hope in the left hand. Surety in the right.'],
  ['2_10_9', 'An emperor must know precisely where he stands.']
]

describe('Izaro trial-finished lines', () => {
  it('knows the six lines, and nothing else he says', () => {
    for (const text of TRIAL_DONE_LINES) expect(isTrialFinished(say('Izaro', text))).toBe(true)
    expect(isTrialFinished(say('Izaro', 'The Goddess is watching.'))).toBe(false)
    expect(isTrialFinished(say('Izaro', 'Justice will prevail.'))).toBe(false)
    expect(isTrialFinished(say('Izaro', 'Belief is the strongest metal of them all. Or is it?'))).toBe(false)
  })

  it('ignores player chat quoting him', () => {
    expect(isTrialFinished(say('#Izaro', TRIAL_DONE_LINES[0]))).toBe(false)
    expect(isTrialFinished(say('@From Izaro', TRIAL_DONE_LINES[0]))).toBe(false)
    expect(isTrialFinished(say('#IMissedIzaro', TRIAL_DONE_LINES[0]))).toBe(false)
    expect(isTrialFinished(say('Merveil', TRIAL_DONE_LINES[0]))).toBe(false)
  })

  it('takes a trailing CR', () => {
    expect(isTrialFinished(say('Izaro', TRIAL_DONE_LINES[1]) + '\r')).toBe(true)
  })

  it('is not an area, zone or level event', () => {
    expect(parseLogLine(say('Izaro', TRIAL_DONE_LINES[0]))).toBeNull()
  })
})

describe('trial step ticks itself off', () => {
  const route = bundledRoute(DEFAULT_ROUTE_OPTIONS)
  const trialSteps = route.steps.filter(s => s.parts.some(p => p.kind === 'trial' && p.text === 'Trial of Ascendancy'))

  it('every trial in the route is one Izaro speaks in', () => {
    const areas = new Set(TRIALS.map(t => t[0]))
    expect(trialSteps.length).toBeGreaterThanOrEqual(12)
    for (const st of trialSteps) expect(areas.has(st.areaBefore), st.areaBefore).toBe(true)
  })

  it('moves past the trial step from the steps leading to it', () => {
    for (const [areaId] of TRIALS) {
      const st = trialSteps.find(s => s.areaBefore === areaId)!
      expect(st, areaId).toBeDefined()
      expect(advanceOnTrial(route, st.index, areaId)).toBe(st.index + 1)
      // Getting to the zone made the step after that current: at or before the trial.
      const there = route.steps.slice(0, st.index).findLastIndex(s => s.areaBefore !== areaId) + 1
      expect(there).toBeLessThanOrEqual(st.index)
      expect(advanceOnTrial(route, there, areaId)).toBe(st.index + 1)
    }
  })

  it('does nothing once the trial step is behind you, or in another zone', () => {
    const st = trialSteps[0]
    expect(advanceOnTrial(route, st.index + 1, st.areaBefore)).toBe(st.index + 1)
    expect(advanceOnTrial(route, st.index, '1_1_town')).toBe(st.index)
  })

  it('leaves the town steps alone when the trial is done on the first visit', () => {
    // Act 1: Lower Prison, back to town to hand in quests, then the trial.
    const st = trialSteps.find(s => s.areaBefore === '1_1_7_1')!
    const first = route.steps.findIndex(s => s.areaAfter === '1_1_7_1') + 1
    expect(route.steps.slice(first, st.index).some(s => s.areaBefore !== '1_1_7_1')).toBe(true)
    expect(advanceOnTrial(route, first, '1_1_7_1')).toBe(first)
  })

  it('does nothing when trials are left out of the route', () => {
    const lean = bundledRoute({ ...DEFAULT_ROUTE_OPTIONS, leagueStart: false })
    expect(lean.steps.some(s => s.parts.some(p => p.text === 'Trial of Ascendancy'))).toBe(false)
    const i = lean.steps.findIndex(s => s.areaAfter === '1_1_7_1') + 1
    expect(advanceOnTrial(lean, i, '1_1_7_1')).toBe(i)
  })
})
