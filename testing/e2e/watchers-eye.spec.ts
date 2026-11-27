// Watcher's Eye finder: an aura typed in Ctrl+Space opens the finder with it
// ticked, its mods list with their ranges, a picked mod can take a minimum,
// and Price check opens the price check on a Watcher's Eye with the picks,
// searching for them. Aura names have the gem tooltip (tip-audit gate).
import { test, expect } from './harness'

test("an aura in Ctrl+Space opens the Watcher's Eye finder, and Price check searches the picked mods", async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot()
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const search = overlay.widget('woke-search')
  const box = search.getByRole('textbox', { name: 'Search', exact: true })
  // The mod list loads a moment after the palette opens: type again until it's in.
  const result = search.getByRole('button', { name: /Grace on Watcher's Eye/ })
  await expect(async () => {
    await box.fill('grace')
    await expect(result).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 20_000 })
  await result.click()
  await expect(search.getByText(/chance to Suppress Spell Damage while affected by Grace/).first()).toBeVisible()
  await overlay.snap('watchers-eye-search')

  await search.getByRole('button', { name: 'Open in the finder' }).click()
  const finder = overlay.widget('woke-watchers-eye')
  // No PoB build in this test: only the aura asked for is ticked.
  await expect(finder.locator('[data-qa="we-source"]')).toContainText('No PoB build')
  const groups = finder.locator('[data-qa="we-group"]')
  await expect(groups).toHaveCount(1)
  await expect(groups.first()).toContainText('Grace')
  await expect(groups.first().locator('[data-qa="we-mod"]')).toHaveCount(5)

  // An aura chip shows the gem's tooltip.
  await finder.locator('[data-qa="we-aura-Hatred"]').hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Hatred')
  await finder.locator('[data-qa="we-aura-Hatred"]').click()
  await expect(groups).toHaveCount(2)

  // A mod row's hover says what it rolls.
  const suppress = finder.locator('[data-qa="we-mod"]', { hasText: 'Suppress Spell Damage' })
  await overlay.page.mouse.move(0, 0)
  await suppress.getByText(/Suppress Spell Damage/).hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Rolls 12 to 15')

  await suppress.click()
  await expect(suppress).toHaveAttribute('aria-checked', 'true')
  await suppress.locator('[data-qa="we-min"]').fill('14')
  await suppress.locator('[data-qa="we-min"]').press('Tab')
  const pen = finder.locator('[data-qa="we-mod"]', { hasText: 'Penetrates (10-15)% Cold Resistance' })
  await pen.click()
  await expect(finder.locator('[data-qa="we-bar"]')).toContainText('2 picked')
  await overlay.snap('watchers-eye-finder')

  // Nothing searched trade until Price check.
  expect(overlay.app.requests.filter(r => r.url.includes('api/trade/search')).length).toBe(0)
  await finder.locator('[data-qa="we-price"]').click()
  const pc = overlay.widget('price-check')
  await expect(pc.getByText("Watcher's Eye").first()).toBeVisible()
  await expect(pc.getByText(/Suppress Spell Damage while affected by Grace/).first()).toBeVisible()
  // Its search names the jewel and asks for both mods.
  await expect.poll(() => overlay.app.requests.some(r => r.url.includes('api/trade/search') &&
    r.body.includes("Watcher's Eye") && r.body.includes('stat_') && (r.body.match(/explicit\.stat_/g) ?? []).length >= 2)).toBe(true)
  await overlay.snap('watchers-eye-price-check')
})
