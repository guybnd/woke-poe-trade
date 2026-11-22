// UI size: one setting that grows panels, the price check and pins together.
import { test, expect } from './harness'

function setUiSize (page: import('@playwright/test').Page, v: number) {
  return page.evaluate((v) => {
    localStorage.setItem('woke.uiSize', String(v))
    window.dispatchEvent(new StorageEvent('storage', { key: 'woke.uiSize' }))
  }, v)
}

test('UI size grows the price check window and the panel zoom together, never the root font', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const page = overlay.page
  const panel = page.locator('#price-window')
  await expect(panel).toContainText('Divine Orb')
  // An exchange item poe.ninja prices waits for a click before searching (WOKEPOET-479).
  await panel.getByTestId('ninja-verdict-live').click()
  const row = page.getByText('178 / 1').first()
  const width = (await panel.boundingBox())!.width
  const rowHeight = (await row.boundingBox())!.height
  const css = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n), name)
  const zoomBefore = parseFloat(await css('--w-ui-scale'))
  const rem = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
  const remBefore = await rem()

  await setUiSize(page, 120)
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(width * 1.15)
  expect(parseFloat(await css('--w-ui-scale'))).toBeCloseTo(zoomBefore * 1.2, 3)
  expect(await css('--w-ui-size')).toBe('1.2')
  // A zoom, not the root font: rem inside zoomed panels would grow twice.
  expect(await rem()).toBe(remBefore)
  expect((await row.boundingBox())!.height).toBeCloseTo(rowHeight * 1.2, 0)

  await setUiSize(page, 100)
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeCloseTo(width, 0)
})

test('The price check palette sizes that window', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const page = overlay.page
  const panel = page.locator('#price-window')
  await expect(panel).toContainText('Divine Orb')
  const width = (await panel.boundingBox())!.width
  await page.locator('[data-price-style] button').first().click()
  const pct = page.locator('[data-price-size-pct]')
  const before = await pct.textContent()
  await page.locator('[data-price-size="bigger"]').click()
  await expect(pct).not.toHaveText(before!)
  await expect.poll(async () => (await panel.boundingBox())!.width).toBeGreaterThan(width)
  await page.locator('[data-price-size="smaller"]').click()
  await expect(pct).toHaveText(before!)
})

test('Settings shows UI size first, with the part sizes folded under it', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Look & icon row').first().click()
  await expect(settings.locator('#woke-ui-size')).toBeVisible()
  await expect(settings.locator('#woke-text-scale')).toHaveCount(0)
  await settings.locator('#woke-size-fine-tune').click()
  for (const id of ['#woke-text-scale', '#woke-ui-scale', '#woke-window-size', '#woke-pin-scale']) {
    await expect(settings.locator(id)).toBeVisible()
  }
  await settings.locator('#woke-ui-size').fill('110')
  await expect.poll(() => overlay.page.evaluate(() => localStorage.getItem('woke.uiSize'))).toBe('110')
  await settings.locator('#woke-ui-size').fill('100')
})
