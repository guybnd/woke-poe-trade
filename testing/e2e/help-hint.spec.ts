// The "?" holds explanations: its card opens on hover, stays inside the window,
// and can't be left over the game. What goes wrong if missed stays on screen.
import { test, expect } from './harness'

test('a setting\'s hint sits behind a ?, and a warning stays on screen', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [] })
  await overlay.widget('menu').locator('.fa-cog').click()
  const page = overlay.page
  const league = page.locator('[data-setting="Private league"]')
  await expect(league).toBeVisible()
  const text = 'Type its full name, like My League (PL12345). Clear it to go back to the list.'
  await expect(page.getByText(text)).toHaveCount(0)
  await expect(page.locator('[data-setting="Game language"]').getByText('Must match the game')).toBeVisible()

  const q = league.getByRole('img', { name: text })
  await q.hover()
  const card = page.getByRole('tooltip')
  await expect(card).toHaveText(text)
  await overlay.snap('help card open')

  const box = (await card.boundingBox())!
  const view = page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(view.width)
  expect(box.y + box.height).toBeLessThanOrEqual(view.height)

  await page.mouse.move(5, view.height - 5)
  await expect(card).toHaveCount(0)
})

test('the card closes when the game takes focus, even with the mouse still on the ?', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [] })
  await overlay.widget('menu').locator('.fa-cog').click()
  const row = overlay.page.locator('[data-setting="League"]')
  await row.getByRole('img').hover()
  const card = overlay.page.getByRole('tooltip')
  await expect(card).toBeVisible()
  await overlay.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  overlay.app.focusGame(true)
  await expect(card).toHaveCount(0)
})

test('clicking a ? inside a radio label does not pick that radio', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F' }] })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByRole('button', { name: /Loot filter/ }).first().click()
  const overwrite = settings.locator('label', { hasText: 'Overwrite the NeverSink file' })
  await expect(overwrite).toBeVisible()
  await overwrite.getByRole('img').click()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Keeps your in-game filter choice')
  await expect(overwrite.locator('input')).not.toBeChecked()
  await overwrite.locator('input').click()
  await expect(overwrite.locator('input')).toBeChecked()
})
