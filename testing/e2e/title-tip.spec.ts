// A plain `title` hover shows in the app's own card (title-tip.ts), not the
// browser's grey tooltip, and the title is back on the element once it's done.
import { test, expect } from './harness'

const RELOAD = 'Load the league list again'

test('a title hover shows the app card under the pointer and puts the title back', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [] })
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
  await expect(card).toHaveCount(0)
  expect(await handle!.getAttribute('title')).toBe(RELOAD)
})

test('clicking a titled button hides the card and leaves the title on it', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, widgets: [] })
  await overlay.widget('menu').locator('.fa-cog').click()
  const page = overlay.page
  const reload = page.getByTitle(RELOAD)
  await reload.hover()
  await expect(page.getByRole('tooltip')).toHaveText(RELOAD)
  await reload.click()
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(page.getByTitle(RELOAD)).toHaveCount(1)
})
