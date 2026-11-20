// A plain `title` hover shows in the app's own card (title-tip.ts), not the
// browser's grey tooltip, and the title is back on the element once it's done.
import { test, expect } from './harness'

const RELOAD = 'Load the league list again'

test('a title hover shows the app card under the pointer and puts the title back', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [], titleTips: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const page = overlay.page
  const reload = page.getByTitle(RELOAD)
  await expect(reload).toBeVisible()
  const handle = await reload.elementHandle()

  await reload.hover()
  const card = page.getByRole('tooltip')
  await expect(card).toHaveText(RELOAD)
  // The browser's tooltip has nothing to draw while the card is up.
  expect(await handle!.getAttribute('title')).toBeNull()
  await overlay.snap('title card open')

  const box = (await card.boundingBox())!
  const btn = (await handle!.boundingBox())!
  const view = page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(view.width)
  expect(box.y + box.height).toBeLessThanOrEqual(view.height)
  // Sized to the text, not the 300 px help width.
  expect(box.width).toBeLessThan(300)
  expect(box.y).toBeGreaterThan(btn.y)

  await page.mouse.move(5, view.height - 5)
  // Something titled there may show its own card at once; this one is gone.
  await expect(card.filter({ hasText: RELOAD })).toHaveCount(0)
  expect(await handle!.getAttribute('title')).toBe(RELOAD)
})

test('pressing a titled button hides the card until the pointer leaves, and the title comes back', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [], titleTips: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const page = overlay.page
  const reload = page.getByTitle(RELOAD)
  const handle = (await reload.elementHandle())!
  await handle.hover()
  const card = page.getByRole('tooltip')
  await expect(card).toHaveText(RELOAD)
  const btn = (await handle.boundingBox())!
  await page.mouse.click(btn.x + btn.width / 2, btn.y + btn.height / 2)
  await expect(card).toHaveCount(0)
  // A nudge on the same button brings no card back, and no browser tooltip: the title stays off.
  await page.mouse.move(btn.x + btn.width / 2 + 1, btn.y + btn.height / 2)
  await page.waitForTimeout(700)
  await expect(card).toHaveCount(0)
  expect(await handle.getAttribute('title')).toBeNull()
  await page.mouse.move(5, page.viewportSize()!.height - 5)
  expect(await handle.getAttribute('title')).toBe(RELOAD)
})

test('the settings Close button stays put while hovered', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [], titleTips: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const page = overlay.page
  const close = page.locator('[data-w-settings] > header button:has(> .fa-times)')
  await close.hover()
  await expect(page.getByRole('tooltip')).toHaveText('Close')
  await expect(close).toBeVisible()
  await close.click()
  await expect(page.locator('[data-w-settings]')).toBeHidden()
})
