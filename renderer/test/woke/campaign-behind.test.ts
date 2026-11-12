import { describe, it, expect } from 'vitest'
import { STEP_TIME_CAP_MS, markStepStart, migrateCampaign, stepTook } from '@/web/woke/campaign/widget'
import type { CampaignWidget } from '@/web/woke/campaign/widget'
import { behind } from '@/web/woke/campaign/route-parse'
import type { Route, RouteStep } from '@/web/woke/campaign/route-parse'

function route (n: number): Route {
  const steps = Array.from({ length: n }, (_, index) => ({ index, act: 1, parts: [], subs: [] }) as unknown as RouteStep)
  return { steps } as unknown as Route
}

describe('campaign finished steps', () => {
  it('lists the last few finished steps, oldest first', () => {
    expect(behind(route(10), 5, 2).map(s => s.index)).toEqual([3, 4])
    expect(behind(route(10), 1, 3).map(s => s.index)).toEqual([0])
    expect(behind(route(10), 0, 3)).toEqual([])
    expect(behind(route(10), 5, 0)).toEqual([])
  })

  it('times a step from it becoming current to the next one doing so', () => {
    let starts = markStepStart({}, 3, 1000)
    starts = markStepStart(starts, 4, 4000)
    expect(stepTook(starts, 3)).toBe(3000)
    expect(stepTook(starts, 4)).toBeNull()
    expect(stepTook(starts, 2)).toBeNull()
  })

  it('hides times that are breaks, not steps', () => {
    let starts = markStepStart({}, 3, 1000)
    starts = markStepStart(starts, 4, 1000 + STEP_TIME_CAP_MS + 1)
    expect(stepTook(starts, 3)).toBeNull()
    starts = markStepStart(starts, 5, 1000 + STEP_TIME_CAP_MS + 1)
    expect(stepTook(starts, 4)).toBeNull()
  })

  it('gives no time to steps skipped in one jump', () => {
    let starts = markStepStart({}, 3, 1000)
    starts = markStepStart(starts, 6, 9000)
    expect(stepTook(starts, 3)).toBeNull()
    expect(stepTook(starts, 5)).toBeNull()
  })

  it('forgets later starts after a step back', () => {
    let starts = markStepStart({}, 3, 1000)
    starts = markStepStart(starts, 4, 2000)
    starts = markStepStart(starts, 5, 3000)
    starts = markStepStart(starts, 4, 5000)
    expect(starts).toEqual({ 3: 1000, 4: 5000 })
    expect(stepTook(starts, 3)).toBe(4000)
  })

  it('shows one finished step on widgets placed before the setting existed', () => {
    const w = { state: { gemsGot: [] } } as unknown as CampaignWidget
    migrateCampaign(w)
    expect(w.cardBehind).toBe(1)
    expect(w.state.stepStarts).toEqual({})
  })
})
