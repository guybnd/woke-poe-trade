// Price check's Viscera strip: hovering a version shows it can be priced, a
// click swaps the search to it, and a click on yours swaps back. Maven's
// Orrery's copy words its Grim Fate line apart from the table ("Nearby
// Enemies are Scorched" against "Enemies within 3 metres are Scorched"); the
// strip still knows it as yours.
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

async function fakeTrade (page: Page) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: 0, result: [] })
  }))
}

test("Maven's Orrery: hover and click a version to price it, and back", async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/viscera-mavens-orrery.txt')
  const panel = overlay.widget('price-check')
  const strip = panel.locator('[data-woke-viscera]')
  const grim = strip.locator('[data-viscera-tier="Grim Fate"]')
  const uber = strip.locator('[data-viscera-tier="Uber"]')
  // The stat rows the search sends (the strip above lists every version's text).
  const stats = panel.locator('form')
  await expect(grim).toContainText('yours', { timeout: 20_000 })
  await expect(stats).toContainText('Nearby Enemies are Scorched')

  // Hover: Uber reads as a button and lights up; yours doesn't.
  await expect(uber).toHaveAttribute('role', 'button')
  await expect(uber).toHaveAttribute('title', 'Price the Uber version')
  await expect(grim).not.toHaveAttribute('role', 'button')
  const ground = () => uber.evaluate(el => getComputedStyle(el).backgroundColor)
  const before = await ground()
  await uber.hover()
  await expect(uber).toHaveCSS('cursor', 'pointer')
  await expect.poll(ground).not.toBe(before)
  await overlay.snap('orrery uber hovered')

  // Click: the search swaps to Uber's mods.
  await uber.click()
  await expect(uber).toContainText('searched')
  await expect(stats).toContainText('Sacred Wisps')
  await expect(stats).not.toContainText('Scorched')
  await expect(grim).toHaveAttribute('title', 'Back to your version')
  await overlay.snap('orrery uber priced')

  // And back to yours.
  await grim.click()
  await expect(stats).toContainText('Nearby Enemies are Scorched')
  await expect(stats).not.toContainText('Sacred Wisps')
  await expect(uber).not.toContainText('searched')
  await expect(uber).toHaveAttribute('role', 'button')
  expect(overlay.errors).toEqual([])
})
