// Saved lists, step 2: Atlas strategies' row keys (F2 renames in place,
// Delete removes with Undo, Ctrl + C copies the strategy code).
import { test, expect } from './harness'
import type { Overlay } from './harness'

async function atlas (overlay: Overlay) {
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-atlas-strategies', wmTitle: 'Atlas strategies', wmWants: 'show', wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 2, y: 8 }, dataUrl: '', selectedId: null, treeHidden: true, folders: [],
      strategies: ['Alpha', 'Beta', 'Gamma'].map((name, i) =>
        ({ id: i + 1, name, folder: '', league: '', tags: [], treeUrl: '', threads: [], scarabs: '', device: '', regex: '', notes: '' }))
    } as never]
  })
  const w = overlay.widget('woke-atlas-strategies')
  await expect(w.locator('[data-row="s:2"]')).toBeVisible()
  return w
}

test('Atlas strategies: F2 renames in place, Delete removes, Undo brings it back', async ({ overlay }) => {
  const w = await atlas(overlay)
  await w.locator('[data-row="s:2"] button').first().focus()
  await overlay.page.keyboard.press('F2')
  const field = w.locator('input[data-draft]')
  await expect(field).toBeFocused()
  await field.fill('Beta two')
  await field.press('Enter')
  await expect(w.getByText('Beta two', { exact: true })).toBeVisible()

  await w.locator('[data-row="s:3"] button').first().focus()
  await overlay.page.keyboard.press('Delete')
  await expect(w.locator('[data-row="s:3"]')).toHaveCount(0)
  await overlay.page.getByRole('button', { name: 'Undo' }).first().click()
  await expect(w.locator('[data-row="s:3"]')).toBeVisible()
})

test('Atlas strategies: Ctrl + C on a row copies its strategy code', async ({ overlay }) => {
  const w = await atlas(overlay)
  await w.locator('[data-row="s:1"] button').first().focus()
  await overlay.page.keyboard.press('Control+c')
  await expect(overlay.page.getByText('Strategy code copied')).toBeVisible()
})
