// The price check's side window lists a recipe part's recipe: checking one
// Lost Unity ring shows all five rings, Lost Unity, and the parts' total.
// Nothing searches until a row is clicked.
import { test, expect } from './harness'

test('side window: a Lost Unity ring lists the recipe with prices', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/unique-will-of-uul-netol.txt')
  const page = overlay.page
  const side = page.locator('.w-pc-side')
  await expect(side).toBeVisible({ timeout: 20_000 })
  await expect(side.getByText('Lost Unity recipe')).toBeVisible()
  for (const ring of ['The Will of Xoph', 'The Will of Tul', 'The Will of Esh', 'The Sundered Will']) {
    await expect(side.locator('button[data-item-row]', { hasText: ring })).toBeVisible()
  }
  // The ring being checked is its own row, not a click.
  await expect(side.locator('div[data-item-row]', { hasText: 'The Will of Uul-Netol' })).toBeVisible()
  await expect(side.getByText('Makes', { exact: true })).toBeVisible()
  // 40 + 35 + 30 + 25; The Sundered Will has no poe.ninja price in the fixture,
  // and Lost Unity is 900c at 180c a divine.
  await expect(side.getByText(/Parts\s*130 c/)).toBeVisible()
  await expect(side.getByText('1 unpriced')).toBeVisible()
  await expect(side.getByText(/Makes\s*5 div/)).toBeVisible()

  const result = side.locator('button[data-item-row]', { hasText: 'Lost Unity' })
  await result.click()
  const panel = overlay.widget('price-check')
  await expect(panel.getByText('Lost Unity').first()).toBeVisible()
  // Lost Unity's own check lists the same recipe, with Lost Unity as itself.
  await expect(side.locator('div[data-item-row]', { hasText: 'Lost Unity' })).toBeVisible()
})
