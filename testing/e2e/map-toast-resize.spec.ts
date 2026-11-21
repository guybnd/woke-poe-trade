// The after-map toast's corner gives its content room; it doesn't magnify it.
import { test, expect } from './harness'

test('dragging the toast corner makes it wider and taller, text the same size', async ({ overlay }) => {
  await overlay.boot({
    overlayActive: true,
    widgets: [{ wmType: 'woke-session-story' }],
    patch: c => {
      const w = c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-session-story')
      w.chipPlace = 'center'
      w.chipSeconds = 0
    }
  })
  await overlay.log([
    '2026/11/05 15:00:34 3725546 1186a8a3 [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1',
    '2026/11/05 15:00:35 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.',
    '2026/11/05 15:01:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "MapWorldsStrand" with seed 7',
    '2026/11/05 15:01:01 3727812 cffb065b [INFO Client 25552] : You have entered Strand.',
    '2026/11/05 15:04:30 3725546 1186a8a3 [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1',
    '2026/11/05 15:04:31 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.'
  ])
  const page = overlay.page
  const toast = page.locator('[data-map-toast]')
  await expect(toast).toBeVisible({ timeout: 5000 })
  const time = page.locator('[data-map-toast-time]')
  const fontBefore = await time.evaluate(el => el.getBoundingClientRect().height)
  const before = (await toast.boundingBox())!

  const grip = (await page.locator('[data-map-toast-grip]').boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + 60, grip.y + 80, { steps: 6 })
  await page.mouse.up()

  const after = (await toast.boundingBox())!
  expect(after.width).toBeGreaterThan(before.width + 80)
  expect(after.height).toBeGreaterThan(before.height + 50)
  // Room, not zoom: the big time is the same size.
  expect(await time.evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(fontBefore, 0)
  await expect(toast).toBeVisible()
})
