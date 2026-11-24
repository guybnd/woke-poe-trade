// The Forbidden pair finder: a notable's name in Ctrl+Space finds its pair,
// the finder lists the class's notables by ascendancy, a row's hover says what
// it does, and Price runs the two trade searches. The jewel names have the
// item tooltip (tip-audit gate).
import { test, expect } from './harness'

test('a notable found in Ctrl+Space opens the finder on its class, and Price shows the cheapest pair', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot()
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey('Ctrl + Space')
  const search = overlay.widget('woke-search')
  const box = search.getByRole('textbox', { name: 'Search', exact: true })
  // The tree data loads a moment after the palette opens: type again until it's in.
  const result = search.getByRole('button', { name: /Bone Barrier.*Forbidden pair/ })
  await expect(async () => {
    await box.fill('bone barrier')
    await expect(result).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 20_000 })
  await result.click()
  await expect(search.getByText('Both jewels name it')).toBeVisible()
  await search.getByText('Forbidden Flesh', { exact: true }).hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Forbidden Flesh')
  await overlay.snap('forbidden-search')

  await search.getByRole('button', { name: 'Open in the finder' }).click()
  const finder = overlay.widget('woke-forbidden')
  // No PoB build in this test: the finder shows the notable's class.
  await expect(finder.locator('[data-qa="forbidden-class"]')).toBeVisible()
  const groups = finder.locator('[data-qa="forbidden-group"]')
  await expect(groups.first()).toBeVisible()
  await expect(finder.getByText('Necromancer', { exact: true })).toBeVisible()
  await expect(finder.getByText('Only on Forbidden jewels', { exact: true })).toBeVisible()
  const row = finder.locator('[data-qa="forbidden-row"]', { hasText: 'Bone Barrier' })
  // The finder scrolls the row into view as it opens, and a scroll hides a hover: point again until it shows.
  await expect(async () => {
    await overlay.page.mouse.move(0, 0)
    await row.getByText('Bone Barrier', { exact: true }).hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('Witch jewels only', { timeout: 1000 })
  }).toPass({ timeout: 10_000 })

  await row.locator('[data-qa="forbidden-price"]').click()
  const pair = row.locator('[data-qa="forbidden-pair"]')
  await expect(pair).toContainText('Flame')
  await expect(pair).toContainText('Flesh')
  const searches = overlay.app.requests.filter(r => r.url.includes('api/trade/search') && r.body.includes('stat_2460506030'))
  expect(searches.length).toBe(1)
  expect(searches[0].body).toContain('"option":')
  expect(searches[0].body).toContain('Forbidden Flesh')
  await overlay.snap('forbidden-finder')

  // Flesh opens the price check on that jewel, its notable read from the text.
  await row.locator('[data-qa="forbidden-check-flesh"]').click()
  const pc = overlay.widget('price-check')
  await expect(pc.getByText('Forbidden Flesh').first()).toBeVisible()
  await expect(pc.getByText(/Allocates Bone Barrier/).first()).toBeVisible()
  // Its search asks for that notable, not every Forbidden Flesh.
  await expect.poll(() => overlay.app.requests.some(r => r.url.includes('api/trade/search') && r.body.includes('stat_2460506030|') && r.body.includes('Forbidden Flesh'))).toBe(true)
  await overlay.snap('forbidden-price-check')
})
