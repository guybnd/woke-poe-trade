// Saved lists (Regex library, Trade searches): the row keys every list has.
// Delete removes a row (Undo brings it back), Ctrl + C copies, F2 renames.
import { test, expect } from './harness'
import type { Overlay } from './harness'

const url = (id: string) => `https://www.pathofexile.com/trade/search/Standard/${id}`
const entry = (id: number, name: string) =>
  ({ id, name, url: url(String(id)), category: 'Boots', tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null })

async function tradeSearches (overlay: Overlay) {
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-trade-searches', wmWants: 'show', wmFlags: [], wmTitle: 'Trade searches', enableHotkeys: false,
      anchor: { pos: 'tl', x: 20, y: 12 },
      entries: [entry(1, 'Fast boots'), entry(2, 'Cheap boots'), entry(3, 'Life boots')]
    }]
  })
  const w = overlay.widget('woke-trade-searches')
  await expect(w.getByText('Cheap boots', { exact: true })).toBeVisible({ timeout: 15_000 })
  return w
}

test('trade searches: Delete removes a row, Undo puts it back where it was', async ({ overlay }) => {
  const w = await tradeSearches(overlay)
  const row = w.locator('button', { hasText: 'Cheap boots' }).first()
  await row.focus()
  await overlay.page.keyboard.press('Delete')
  await expect(w.getByText('Cheap boots', { exact: true })).toHaveCount(0)
  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(w.getByText('Cheap boots', { exact: true })).toBeVisible()
})

test('trade searches: F2 renames a row in place', async ({ overlay }) => {
  const w = await tradeSearches(overlay)
  await w.locator('button', { hasText: 'Life boots' }).first().focus()
  await overlay.page.keyboard.press('F2')
  const field = w.locator('input[data-draft]')
  await expect(field).toBeFocused()
  await field.fill('Life and speed boots')
  await field.press('Enter')
  await expect(w.getByText('Life and speed boots', { exact: true })).toBeVisible()
})

test('regex library: Delete removes a row, Undo brings it back; F2 does nothing yet', async ({ overlay }) => {
  await overlay.boot({
    overlayActive: true,
    patch: c => { c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-regex-library').wmWants = 'show' }
  })
  const library = overlay.widget('woke-regex-library')
  const row = library.locator('button', { hasText: '20% quality' }).first()
  await row.focus()
  await overlay.page.keyboard.press('F2')
  await expect(library.locator('form')).toHaveCount(0)
  await row.focus()
  await overlay.page.keyboard.press('Delete')
  await expect(library.getByText('20% quality', { exact: true })).toHaveCount(0)
  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(library.getByText('20% quality', { exact: true })).toBeVisible()
})
