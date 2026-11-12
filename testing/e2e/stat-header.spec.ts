// PoE mode's weapon/armour stat header (Guy's pick F1): the numbers sit at the top of
// the filter well; clicking one picks its filter and opens its row under the header,
// clicking it again unpicks it. Neither spends a search.
import { test, expect } from './harness'

const poe = (config: any) => {
  config.widgets.find((w: { wmType: string }) => w.wmType === 'price-check').wokeWindowStyle = 'poe'
}

test('weapon header: DPS split, click to pick and unpick, no search', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-sword-ele-chaos.txt')
  const win = overlay.page.locator('#price-window')
  const head = win.locator('[data-stat-header]')
  await expect(head).toBeVisible()
  // Total DPS counts chaos: phys + ele + chaos.
  await expect(head.locator('[data-cell="dps"]')).toContainText('DPS')
  await expect(head.locator('[data-cell="chaos"]')).toContainText('chaos')
  await expect(head.locator('[data-cell="phys"]')).toBeVisible()
  // Unpicked property lines are the header now, not tooltip lines.
  await expect(win.locator('.w-poe-line', { hasText: 'Attacks per Second' })).toHaveCount(0)
  await overlay.snap('stat header weapon')

  const searches = () => fakeApp.requests.filter(r => r.url.includes('/api/trade/search')).length
  const before = searches()
  const aps = head.locator('[data-cell="aps"]')
  await aps.click()
  await expect(aps).toHaveClass(/sel/)
  const row = win.locator('.w-poe-row', { hasText: 'Attacks per Second' })
  await expect(row).toBeVisible()
  // Picked by the header: a phys row, hidden by default for its small share.
  await head.locator('[data-cell="phys"]').click()
  await expect(win.locator('.w-poe-row', { hasText: 'Physical DPS' })).toBeVisible()
  await overlay.snap('stat header weapon picked')

  // Again unpicks it; the header keeps its shape.
  await aps.click()
  await expect(aps).not.toHaveClass(/sel/)
  await expect(row).toHaveCount(0)
  await expect(win.locator('.w-poe-line', { hasText: 'Attacks per Second' })).toHaveCount(0)
  expect(searches()).toBe(before)
})

test('armour header: one number per defence', async ({ overlay }) => {
  await overlay.boot({ patch: poe })
  await overlay.copyItem('items/rare-body-armour-ar-ev.txt')
  const head = overlay.page.locator('#price-window [data-stat-header]')
  await expect(head.locator('[data-cell="armour"]')).toBeVisible()
  await expect(head.locator('[data-cell="evasion"]')).toBeVisible()
  await head.locator('[data-cell="evasion"]').click()
  await expect(overlay.page.locator('#price-window .w-poe-row', { hasText: 'Evasion Rating' })).toBeVisible()
  await overlay.snap('stat header armour')
})
