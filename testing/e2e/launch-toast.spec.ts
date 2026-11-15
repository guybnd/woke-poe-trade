// The note shown when the app hooks onto the game (pick A, the title plaque).
import { test, expect } from './harness'

const attach = (overlay: import('./harness').Overlay) =>
  overlay.app.sendToOverlay({ name: 'MAIN->OVERLAY::overlay-attached', payload: undefined })

test('the launch toast names the overlay key, never takes the mouse and leaves on its own', async ({ overlay }) => {
  const { page } = overlay
  await page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ patch: (config) => { config.overlayKey = 'Shift + Space' } })
  const toast = page.locator('[data-woke-launch-toast]')
  attach(overlay)
  await expect(toast).toBeVisible()
  await expect(toast).toHaveText('Woke PoE Trade Ready · Shift + Space opens the overlay', { useInnerText: true })
  expect(await toast.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none')
  // Top centre, under the game's buff row.
  const box = (await toast.locator('div').first().boundingBox())!
  expect(Math.abs(box.x + box.width / 2 - 1280)).toBeLessThan(2)
  expect(box.y).toBeGreaterThan(112)
  expect(box.y + box.height).toBeLessThan(360)
  await page.waitForTimeout(400)
  await overlay.snap('launch toast')
  await expect(toast).toHaveCount(0, { timeout: 4000 })
})

test('the launch toast stays off when its setting is off', async ({ overlay }) => {
  const { page } = overlay
  await overlay.boot({ patch: (config) => { config.showAttachNotification = false } })
  attach(overlay)
  await page.waitForTimeout(300)
  await expect(page.locator('[data-woke-launch-toast]')).toHaveCount(0)
})
