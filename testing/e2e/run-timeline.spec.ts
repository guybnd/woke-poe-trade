// Run timeline: a run's zones, levels and deaths are saved in their own file
// and shown when the run is opened from Past runs.
import { test, expect, logFixture } from './harness'

// Placed already, with the splits panel open.
const RUN_TIMER = {
  wmType: 'woke-run-timer',
  wmWants: 'show' as const,
  wmFlags: ['invisible-on-blur'],
  anchor: { pos: 'tc', x: 50, y: 1 },
  autoStart: true,
  charName: '',
  expanded: true,
  compareTo: null,
  subSplits: true,
  run: null,
  history: [] as unknown[]
}
const CAMPAIGN = { wmType: 'woke-campaign', wmWants: 'show' as const }
const line = (time: string, text: string) => `2026/11/04 ${time} 1 abc [INFO Client 1] ${text}`

test('a finished run keeps its zones, levels and deaths, and opens from Past runs', async ({ overlay, fakeApp }) => {
  // Caught up from the log on start, so steps are timed by the log's clock.
  await overlay.boot({
    widgets: [{ ...RUN_TIMER, lastLogAt: new Date(2026, 10, 4, 17, 59, 0).getTime() }],
    overlayActive: true,
    logBefore: [
      ...logFixture('client-logs/campaign-act1.txt'),
      line('18:27:00', ': WokeTester has been slain.'),
      line('18:27:01', ': SomeoneElse has been slain.')
    ]
  })
  const timer = () => overlay.savedWidget('woke-run-timer')
  await expect.poll(() => timer()?.run?.splits?.length, { timeout: 15_000 }).toBe(1)
  const panel = overlay.widget('woke-run-timer')
  // Ending the run puts it in Past runs.
  await panel.getByTitle(/^End run/).first().click()
  await expect.poll(() => timer()?.history?.length).toBe(1)

  await panel.getByText('Past runs').click()
  await panel.locator('.w-row', { hasText: 'WokeTester' }).first().click()
  await expect(panel).toContainText('The Coast')
  await expect(panel).toContainText('The Southern Forest')
  await expect(panel).toContainText('Deaths 1')
  await expect(panel).toContainText('Act 2')
  await expect(panel).toContainText('Witch 13')
  // Twilight Strand 18:00:24, Lioneye's Watch next.
  await expect(panel.locator('.w-row', { hasText: 'The Twilight Strand' })).not.toContainText('0:00')
  await overlay.snap('run timeline review')

  await panel.getByRole('button', { name: 'Runs' }).click()
  await expect(panel).toContainText('Character')
})

test('a run saved before timelines is rebuilt from Client.txt when opened', async ({ overlay, fakeApp }) => {
  const at = (h: number, m: number, sec = 0) => new Date(2026, 10, 4, h, m, sec).getTime()
  const old = {
    // Its own id: tests in a worker share the timeline folder.
    id: at(18, 0, 24) + 7, startedAt: at(18, 0, 24), elapsedMs: 40 * 60_000, runningSince: null, act: 2, zone: '', zoneSinceMs: 0,
    charName: 'WokeTester', className: 'Witch', level: 13, splits: [{ act: 1, totalMs: (25 * 60 + 7) * 1000, level: 12 }],
    marks: [], finished: true, endedAt: at(18, 40, 24), townMs: 0, townSinceMs: null
  }
  await overlay.boot({
    widgets: [{ ...RUN_TIMER, autoStart: false, history: [old], lastLogAt: at(23, 0) }],
    overlayActive: true,
    logBefore: logFixture('client-logs/campaign-act1.txt')
  })
  const panel = overlay.widget('woke-run-timer')
  await panel.getByText('Past runs').click()
  await panel.locator('.w-row', { hasText: 'WokeTester' }).first().click()
  await expect(panel).toContainText('The Coast')
  await expect(panel).toContainText('rebuilt')
  // Exact at the split: act 1 took 25:07.
  await expect(panel.locator('.w-row', { hasText: 'Act 1' }).first()).toContainText('25:07')
})

test('finished campaign card steps are saved with the run', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [CAMPAIGN, RUN_TIMER], overlayActive: true })
  // Live lines, a little apart.
  const lines = logFixture('client-logs/campaign-act1.txt').filter(l => /Generating level|You have entered|is now level/.test(l))
  for (const l of lines) {
    fakeApp.appendClientLog([l])
    await overlay.page.waitForTimeout(60)
  }
  const timer = () => overlay.savedWidget('woke-run-timer')
  await expect.poll(() => timer()?.run?.splits?.length, { timeout: 15_000 }).toBe(1)
  const panel = overlay.widget('woke-run-timer')
  await panel.getByTitle(/^End run/).first().click()
  await expect.poll(() => timer()?.history?.length).toBe(1)
  // Away from the campaign icon, whose card would sit over the panel.
  await overlay.page.mouse.move(900, 900)
  await overlay.page.waitForTimeout(500)
  // A notice about the test machine's port can sit over the tabs.
  const dismiss = overlay.page.getByRole('button', { name: 'Dismiss' })
  if (await dismiss.isVisible()) await dismiss.click()

  await panel.getByText('Past runs').click()
  await panel.locator('.w-row', { hasText: 'WokeTester' }).first().click()
  await panel.getByRole('button', { name: 'Steps' }).click()
  await expect(panel.locator('.w-row--head')).toContainText('Step')
  await expect(panel).toContainText('The Coast')
  await overlay.snap('run timeline steps')
})

test('the run you are on has its own live Timeline tab', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [RUN_TIMER], overlayActive: true })
  const lines = logFixture('client-logs/campaign-act1.txt').filter(l => /Generating level|You have entered|is now level/.test(l))
  for (const l of lines) {
    fakeApp.appendClientLog([l])
    await overlay.page.waitForTimeout(40)
  }
  const timer = () => overlay.savedWidget('woke-run-timer')
  await expect.poll(() => timer()?.run?.splits?.length, { timeout: 15_000 }).toBe(1)
  const panel = overlay.widget('woke-run-timer')
  await panel.getByRole('tab', { name: 'Timeline' }).click()
  await expect(panel).toContainText('The Coast')
  await expect(panel).toContainText('The Southern Forest')
  // A zone entered while it's open shows up.
  fakeApp.appendClientLog([
    '2026/11/04 18:40:00 1 abc [DEBUG Client 1] Generating level 14 area "1_2_2" with seed 5',
    '2026/11/04 18:40:01 1 abc [INFO Client 1] : You have entered The Old Fields.'
  ])
  await expect(panel).toContainText('The Old Fields')
  await overlay.snap('current run timeline')
})
