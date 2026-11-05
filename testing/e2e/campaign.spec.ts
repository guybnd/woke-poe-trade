// Campaign + run timer, driven by a recorded Client.txt.
import { test, expect, logFixture } from './harness'

const CAMPAIGN = { wmType: 'woke-campaign', wmWants: 'show' as const }
const RUN_TIMER = { wmType: 'woke-run-timer', wmWants: 'show' as const }

test('tracker follows zones, act and level from Client.txt while you play', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [CAMPAIGN] })
  // No icon until there's a campaign zone to show it in.
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toBeHidden()

  await overlay.replayLog('client-logs/campaign-act1.txt')
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('campaign')
  await expect(icon).toContainText('The Southern Forest')
  await expect(icon).toContainText('Lv 13')
  await overlay.snap('campaign card in act 2')

  // Saved while the game has focus, so a restart keeps the place.
  await expect.poll(() => overlay.savedWidget('woke-campaign')?.state?.zone).toBe('The Southern Forest')
})

test('tracker sleeps after a map: no icon in towns, and the route stays put', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [CAMPAIGN] })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toBeVisible()
  const step = overlay.savedWidget('woke-campaign').step

  const area = (id: string, level: number) => `2026/11/04 19:00:00 1 abc [DEBUG Client 1] Generating level ${level} area "${id}" with seed 1`
  fakeApp.appendClientLog([area('MapWorldsAbomination', 83)])
  await expect(icon).toBeHidden()
  fakeApp.appendClientLog([area('1_2_town', 13)])
  await expect.poll(() => overlay.savedWidget('woke-campaign')?.state?.areaId).toBe('1_2_town')
  await expect(icon).toBeHidden()
  expect(overlay.savedWidget('woke-campaign').step).toBe(step)

  // A campaign zone wakes it.
  fakeApp.appendClientLog([area('1_2_2', 14)])
  await expect(icon).toBeVisible()
})

test('nothing from the tracker on screen with the overlay open but the icon, and a click pins the card', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [CAMPAIGN], overlayActive: true })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toBeVisible()
  await expect(overlay.widget('woke-campaign')).not.toContainText('The Southern Forest')

  await icon.click()
  await overlay.page.mouse.move(5, 5)
  await overlay.page.waitForTimeout(500)
  await expect(icon).toContainText('Step done')
  await icon.getByRole('button', { name: 'Step back' }).waitFor()

  await icon.locator('span').first().click()
  await overlay.page.mouse.move(5, 5)
  await expect(icon).not.toContainText('Step done')
})

test('pinned values stay on the icon and go when the route sleeps; the menu opens settings', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [{ ...CAMPAIGN, pins: ['level'] }], overlayActive: true })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  const icon = overlay.dockIcon('campaign')
  await expect(icon).toContainText('Lv 13')
  await overlay.snap('pinned level in the icon')

  await icon.click({ button: 'right' })
  await overlay.page.getByRole('menuitem', { name: 'Choose what stays on screen' }).click()
  await expect(overlay.page.getByText('On screen while levelling')).toBeVisible()
  await overlay.page.keyboard.press('Escape')

  fakeApp.appendClientLog(['2026/11/04 19:00:00 1 abc [DEBUG Client 1] Generating level 83 area "MapWorldsAbomination" with seed 1'])
  await expect(icon).toBeHidden()
})

test('run timer splits act 1 when act 2 starts, with the run time on the tracker card', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [CAMPAIGN, RUN_TIMER] })
  await overlay.replayLog('client-logs/campaign-act1.txt')
  await overlay.hoverDockIcon('campaign')
  await expect(overlay.dockIcon('campaign')).toContainText('Run')

  const timer = () => overlay.savedWidget('woke-run-timer')
  await expect.poll(() => timer()?.run?.splits?.map((s: any) => s.act)).toEqual([1])
  const run = timer().run
  expect(run.charName).toBe('WokeTester')
  expect(run.className).toBe('Witch')
  expect(run.level).toBe(13)
  // Bosses reached in act 1 (sub-splits).
  expect(run.marks.map((m: any) => m.id)).toEqual(['brutus', 'merveil'])
})

test('run timer catches up on lines logged while the app was closed, using the log clock', async ({ overlay, fakeApp }) => {
  const lines = logFixture('client-logs/campaign-act1.txt')
  await overlay.boot({
    widgets: [{ ...RUN_TIMER, lastLogAt: new Date(2026, 10, 4, 17, 59, 0).getTime() }],
    logBefore: lines
  })
  const timer = () => overlay.savedWidget('woke-run-timer')
  await expect.poll(() => timer()?.run?.splits?.length, { timeout: 15_000 }).toBe(1)
  // Twilight Strand at 18:00:24, act 2 town at 18:25:31.
  expect(timer().run.splits[0].totalMs).toBe((25 * 60 + 7) * 1000)
  await expect(overlay.widget('woke-run-timer')).toContainText('Act 2')
})

test('a burst of settings saves leaves the newest settings on disk', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [RUN_TIMER] })
  // Zone changes arriving one after another: the run timer saves on each.
  // (The start-up catch-up replays in one batch, so it saves once.)
  const zones = logFixture('client-logs/campaign-act1.txt').filter(l => /Generating level|You have entered|is now level/.test(l))
  for (const line of zones.slice(0, 14)) {
    fakeApp.appendClientLog([line])
    await overlay.page.waitForTimeout(550)
  }
  await expect.poll(() => fakeApp.received.filter(e => e.name === 'CLIENT->MAIN::save-config').length, { timeout: 15_000 }).toBeGreaterThan(5)
  await fakeApp.settled()
  await overlay.page.waitForTimeout(500)
  expect(fakeApp.readConfigText()).toBe(fakeApp.lastSavedContents())
})
