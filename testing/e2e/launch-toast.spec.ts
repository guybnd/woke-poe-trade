// The note shown when the app hooks onto the game (Guy's pick B, the stone strip, with a version line).
import { test, expect } from './harness'

const attach = (overlay: import('./harness').Overlay) =>
  overlay.app.sendToOverlay({ name: 'MAIN->OVERLAY::overlay-attached', payload: undefined })

test('the launch toast names the overlay key and version, never takes the mouse and leaves on its own', async ({ overlay }) => {
  const { page } = overlay
  await page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ patch: (config) => { config.overlayKey = 'Shift + Space' } })
  const toast = page.locator('[data-woke-launch-toast]')
  attach(overlay)
  await expect(toast).toBeVisible()
  await expect(toast).toContainText('Woke PoE Trade')
  await expect(toast).toContainText('Ready · Shift + Space opens the overlay')
  const version = toast.locator('[data-woke-launch-version]')
  await expect(version).toHaveText(/^v\d/)
  expect(await toast.evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none')
  // Bottom centre, above the skill bar.
  const box = (await toast.locator('div').first().boundingBox())!
  expect(Math.abs(box.x + box.width / 2 - 1280)).toBeLessThan(2)
  expect(box.y).toBeGreaterThan(900)
  expect(box.y + box.height).toBeLessThan(1250)

  // An update found while the note is up shows on the version line.
  overlay.app.sendToOverlay({ name: 'MAIN->CLIENT::updater-state', payload: { state: 'update-downloaded', version: '9.9.9' } })
  await expect(version).toContainText('· Update 9.9.9 installs when you quit')
  await page.waitForTimeout(300)
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
