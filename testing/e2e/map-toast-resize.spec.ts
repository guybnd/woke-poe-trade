// The after-map toast's corner gives its content room; it doesn't magnify it.
import { test, expect } from './harness'

test('dragging the toast corner makes it wider and taller, text the same size', async ({ overlay }) => {
  await overlay.boot({
    overlayActive: true,
    // The default config already has the session story widget.
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
    '2026/11/05 15:04:31 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.',
    // A second map, so the toast has run bars.
    '2026/11/05 15:05:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "MapWorldsStrand" with seed 8',
    '2026/11/05 15:05:01 3727812 cffb065b [INFO Client 25552] : You have entered Strand.'
  ])
  // Apart: the first run is saved when the second map starts, before this leave compares to it.
  // The widget follows the log only once its saved maps load, later under load:
  // lines written before that are read as old, with no toast. Each try leaves
  // one more map until a leave is read live.
  const page = overlay.page
  const toast = page.locator('[data-map-toast]')
  for (let i = 0; i < 4 && !(await toast.isVisible()); i++) {
    const m = 8 + i * 2
    if (i > 0) {
      await overlay.log([
        `2026/11/05 15:${String(m - 1).padStart(2, '0')}:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "MapWorldsStrand" with seed ${10 + i}`,
        `2026/11/05 15:${String(m - 1).padStart(2, '0')}:01 3727812 cffb065b [INFO Client 25552] : You have entered Strand.`
      ])
    }
    await overlay.log([
      `2026/11/05 15:${String(m).padStart(2, '0')}:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1`,
      `2026/11/05 15:${String(m).padStart(2, '0')}:01 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.`
    ])
    await toast.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  }
  await expect(toast).toBeVisible({ timeout: 5000 })
  const time = page.locator('[data-map-toast-time]')
  const fontBefore = await time.evaluate(el => el.getBoundingClientRect().height)
  const before = (await toast.boundingBox())!
  const bars = page.locator('[data-map-toast-bars]')
  // As designed until it is made taller.
  expect((await bars.boundingBox())!.height).toBeCloseTo(40, 0)

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
  // The bars take the new room.
  expect((await bars.boundingBox())!.height).toBeGreaterThan(60)

  // A sideways drag keeps the height to the content.
  const grip2 = (await page.locator('[data-map-toast-grip]').boundingBox())!
  await page.mouse.move(grip2.x + grip2.width / 2, grip2.y + grip2.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip2.x + grip2.width / 2 + 20, grip2.y - 200, { steps: 6 })
  await page.mouse.up()
  expect((await toast.boundingBox())!.height).toBeLessThanOrEqual(before.height + 1)
  expect((await bars.boundingBox())!.height).toBeCloseTo(40, 0)
})
