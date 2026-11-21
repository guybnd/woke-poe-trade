// Ctrl+Space search's Price check button: a Viscera opens the price check as
// a copy of the version its name says, with the version strip ready to switch.
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }

test("a Viscera from search opens its price check: Maven's Orrery", async ({ overlay }) => {
  await overlay.page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: 0, result: [] })
  }))
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [{ wmType: 'woke-market-tracker', wmTitle: 'Market', anchor: { pos: 'tl', x: 40, y: 30 } }] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const search = overlay.widget('woke-search')
  const box = search.getByRole('textbox', { name: 'Search', exact: true })
  const result = search.getByRole('button', { name: /Maven's Orrery/ }).first()
  await expect(async () => {
    await box.fill("maven's orrery")
    await expect(result).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  await result.click()
  const button = search.getByRole('button', { name: 'Price check', exact: true })
  await expect(button).toBeVisible()
  await overlay.snap('search viscera price check button')
  await button.click()

  const check = overlay.widget('price-check')
  const strip = check.locator('[data-woke-viscera]')
  await expect(strip.locator('[data-viscera-tier="Grim Fate"]')).toContainText('yours', { timeout: 20_000 })
  await expect(check.locator('form')).toContainText('Nearby Enemies are Scorched')
  await strip.locator('[data-viscera-tier="Uber"]').click()
  await expect(check.locator('form')).toContainText('Sacred Wisps')
  await overlay.snap('search viscera priced')
  expect(overlay.errors).toEqual([])
})
