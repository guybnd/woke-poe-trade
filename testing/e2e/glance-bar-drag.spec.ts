// Session story's glance bar in a map: click-through while you play, dragged
// with the overlay open (no Settings needed), and its spot is remembered.
import { test, expect } from './harness'

const intoMap = [
  '2026/11/05 15:00:34 3725546 1186a8a3 [DEBUG Client 25552] Generating level 60 area "HideoutArenaSearingExarch" with seed 1',
  '2026/11/05 15:00:35 3727812 cffb065b [INFO Client 25552] : You have entered Searing Hideout.',
  '2026/11/05 15:01:00 3725546 1186a8a3 [DEBUG Client 25552] Generating level 83 area "MapWorldsStrand" with seed 7',
  '2026/11/05 15:01:01 3727812 cffb065b [INFO Client 25552] : You have entered Strand.'
]

// The default config already has the session story widget: turn its bar on.
function glanceOn (pos?: { x: number, y: number }) {
  return (c: { widgets: Array<{ wmType: string, glance?: boolean, glancePos?: unknown }> }) => {
    const w = c.widgets.find(w => w.wmType === 'woke-session-story')!
    w.glance = true
    if (pos) w.glancePos = pos
  }
}

test('the glance bar drags with the overlay open and keeps its spot', async ({ overlay }) => {
  // Started below the top, where the overlay's own notices (an update, a
  // config warning) can cover its default spot.
  await overlay.boot({ patch: glanceOn({ x: 0.5, y: 0.3 }) })
  await overlay.log(intoMap)
  const page = overlay.page
  const bar = page.locator('[data-glance-bar]')
  await expect(bar).toBeVisible({ timeout: 15_000 })
  await expect(bar).toContainText('Strand')
  // While you play: click-through, no hover text.
  await expect(bar).not.toHaveAttribute('title', /./)
  expect(await bar.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none')

  // The overlay key alone, no Settings: it takes the mouse.
  await overlay.pressHotkey(overlay.config.overlayKey)
  await expect(bar).toHaveAttribute('title', 'Drag to move')
  await expect(page.locator('[data-glance-drag]')).toBeHidden()
  const before = (await bar.boundingBox())!
  await page.mouse.move(before.x + 10, before.y + before.height / 2)
  // The grip shows on hover.
  await expect(page.locator('[data-glance-drag]')).toBeVisible()
  await page.mouse.down()
  await page.mouse.move(before.x + 10 - 300, before.y + before.height / 2 + 200, { steps: 8 })
  await page.mouse.up()
  const after = (await bar.boundingBox())!
  expect(after.x).toBeLessThan(before.x - 250)
  expect(after.y).toBeGreaterThan(before.y + 150)

  // Saved when the drag ends.
  await expect.poll(() => overlay.savedWidget('woke-session-story')?.glancePos ?? null).not.toBeNull()
  const saved = overlay.savedWidget('woke-session-story').glancePos as { x: number, y: number }
  const vw = page.viewportSize()!.width
  expect(saved.x * vw).toBeCloseTo(after.x + after.width / 2, -1)

  // Next start, next map: it comes up where it was left.
  await overlay.boot({ patch: glanceOn(saved) })
  await overlay.log(intoMap)
  await expect(bar).toBeVisible({ timeout: 15_000 })
  const again = (await bar.boundingBox())!
  expect(Math.abs(again.x - after.x)).toBeLessThan(30)
  expect(Math.abs(again.y - after.y)).toBeLessThan(4)
})
