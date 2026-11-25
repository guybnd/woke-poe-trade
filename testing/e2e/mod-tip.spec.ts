// Hovering a tiered mod in the price check shows its tiers with the item level
// each needs, its own lit, and the bench craft of the same line (tooltip audit G5/I1).
import { test, expect } from './harness'

test('a mod row shows its tier ladder on hover', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-tiers.txt')
  const panel = overlay.widget('price-check')
  const row = panel.getByRole('button', { name: /total maximum Life/i }).first()
  await expect(row).toBeVisible()
  await row.hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('+170 to maximum Life')
  await expect(tip).toContainText('Prefix · Body Armour')
  const ladder = tip.locator('[data-mod-ladder]')
  await expect(ladder).toContainText('T1')
  await expect(ladder).toContainText('ilvl')
  await expect(tip).toContainText('Item level 84: T2 is the best it can roll')
  await expect(tip).toContainText('Bench:')
  // Leaving the row takes it away.
  await overlay.page.mouse.move(5, 5)
  await expect(tip).toBeHidden()
})
