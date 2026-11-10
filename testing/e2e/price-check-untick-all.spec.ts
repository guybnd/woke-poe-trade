// The box on the stats header unticks every row and brings the picks back, spending no search.
import { test, expect } from './harness'

test('the stats header box unticks all mods and brings them back, without searching', async ({ overlay, fakeApp }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  const box = panel.locator('[data-all-box]')
  await expect(box).toBeVisible()
  const searches = () => fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length
  const before = searches()
  const ticked = panel.locator('.w-pc-check .fa-check-square')
  const count = await ticked.count()
  expect(count).toBeGreaterThan(0)
  await overlay.snap('untick all box before')

  await box.click()
  await expect(ticked).toHaveCount(0)
  await expect(box.locator('.fa-square')).toBeVisible()
  await overlay.snap('untick all box cleared')

  await box.click()
  await expect(ticked).toHaveCount(count)
  // Neither click searched.
  await overlay.page.waitForTimeout(500)
  expect(searches()).toBe(before)
})
