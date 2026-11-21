// Text size changes text, and leaves windows the size they were. The old
// control (root font size) lives on as Price check window size.
import { test, expect } from './harness'

test('Text size grows the text of price check and panels, not their width', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/currency-divine.txt')
  const page = overlay.page
  const panel = page.locator('#price-window')
  await expect(panel).toContainText('Divine Orb')
  const row = page.getByText('178 / 1').first()
  const size = () => row.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
  const before = await size()
  const width = (await panel.boundingBox())!.width
  await page.evaluate(() => {
    localStorage.setItem('woke.textScale', '150')
    window.dispatchEvent(new StorageEvent('storage', { key: 'woke.textScale' }))
  })
  await expect.poll(size).toBeCloseTo(before * 1.5, 1)
  expect((await panel.boundingBox())!.width).toBe(width)
})

test('Settings offers Text size and Price check window size, each doing its job', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('Look & icon row').first().click()
  // The part sizes sit folded under UI size.
  await settings.locator('#woke-size-fine-tune').click()
  const text = settings.locator('#woke-text-scale')
  await expect(text).toBeVisible()
  await expect(settings.getByText('Price check window size')).toBeVisible()
  const remBefore = await overlay.page.evaluate(() => getComputedStyle(document.documentElement).fontSize)

  await text.fill('150')
  await expect.poll(() => overlay.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--w-text-scale'))).toBe('1.5')
  // Text alone: the unit window sizes are measured in stays put.
  expect(await overlay.page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(remBefore)

  await settings.locator('#woke-window-size').fill('20')
  await expect.poll(() => overlay.page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('20px')
  await text.fill('100')
})
