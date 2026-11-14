// Run timeline: a run's zones, levels and deaths are saved in their own file
// and shown when the run is opened from Past runs.
import { test, expect, logFixture } from './harness'

const RUN_TIMER = { wmType: 'woke-run-timer', wmWants: 'show' as const }
const line = (time: string, text: string) => `2026/11/04 ${time} 1 abc [INFO Client 1] ${text}`

test('a finished run keeps its zones, levels and deaths, and opens from Past runs', async ({ overlay, fakeApp }) => {
  // Caught up from the log on start, so steps are timed by the log's clock.
  await overlay.boot({
    widgets: [{ ...RUN_TIMER, lastLogAt: new Date(2026, 10, 4, 17, 59, 0).getTime() }],
    overlayActive: true,
    logBefore: [
      ...logFixture('client-logs/campaign-act1.txt'),
      line('18:27:00', ': WokeTester has been slain.'),
      line('18:27:01', ': SomeoneElse has been slain.'),
      // A new character on the Twilight Strand puts this run in Past runs.
      '2026/11/04 19:00:00 1 abc [DEBUG Client 1] Generating level 1 area "1_1_1" with seed 9'
    ]
  })
  const timer = () => overlay.savedWidget('woke-run-timer')
  await expect.poll(() => timer()?.history?.length, { timeout: 15_000 }).toBe(1)

  const panel = overlay.widget('woke-run-timer')
  await panel.getByTitle('Splits and past runs').click()
  await panel.getByText('Past runs').click()
  await panel.getByText('WokeTester').first().click()
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
