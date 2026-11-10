// Saved trade searches: the price check's save box and the folder window.
import { test, expect } from './harness'

const url = (id: string, live = false) => `https://www.pathofexile.com/trade/search/Standard/${id}${live ? '/live' : ''}`
const DAY = 86_400_000

test('the save box offers the item as the name and saves into a folder', async ({ overlay }) => {
  await overlay.boot({ widgets: [{ wmType: 'woke-trade-searches' }] })
  await overlay.copyItem('items/rare-ring.txt')
  const panel = overlay.widget('price-check')
  // Its title and icon change once saved, so find it by either icon.
  const save = panel.locator('button').filter({ has: overlay.page.locator('i.fa-bookmark, i.fa-check') }).first()
  await expect(save).toBeVisible({ timeout: 15_000 })
  await save.click()

  const box = overlay.page.locator('form').filter({ has: overlay.page.getByRole('textbox', { name: 'Name' }) })
  await expect(box).toBeVisible()
  const name = box.locator('input').first()
  await expect(name).toBeFocused()
  const proposed = await name.inputValue()
  expect(proposed).not.toBe('Saved search')
  expect(proposed.length).toBeGreaterThan(3)
  await box.locator('input').nth(1).fill('Rings to flip')
  await overlay.snap('save box')
  await name.press('Enter')
  await expect(box).toHaveCount(0)
  await expect(save.locator('i')).toHaveClass(/fa-check/)

  // Saved already: the box says so and keeps the name.
  await expect(save.locator('i')).toHaveClass(/fa-bookmark/, { timeout: 3000 })
  await save.click()
  await expect(box.getByText('Already saved')).toBeVisible()
  await expect(name).toHaveValue(proposed)
  await expect(box.locator('input').nth(1)).toHaveValue('Rings to flip')
})

test('the folder rail: views, folders with icons, sort, drag to move', async ({ overlay }) => {
  const now = Date.now()
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-trade-searches',
      wmWants: 'show',
      wmFlags: [],
      wmTitle: 'Trade searches',
      enableHotkeys: false,
      anchor: { pos: 'tl', x: 20, y: 12 },
      folders: [{ name: 'Boots to flip', icon: 'item:Divine Orb' }, { name: 'Gems', icon: 'mechanic:essence' }],
      entries: [
        { id: 1, name: 'Two-Toned Boots: Fire Resistance, Movement Speed', url: url('a'), category: 'Boots to flip', tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null, lastOpened: now - 60_000, openCount: 7 },
        { id: 2, name: 'Two-Toned Boots: Cold Resistance, Movement Speed', url: url('b'), category: 'Boots to flip', tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null, lastOpened: now - 3 * DAY, openCount: 4 },
        { id: 3, name: 'Mageblood live snipe', url: url('c', true), category: 'Uniques', tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null, pinned: true, lastOpened: now - 2 * 3600_000, openCount: 12 },
        { id: 4, name: 'Spark 21/20', url: url('d'), category: 'Gems', tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null, lastOpened: now - DAY, openCount: 1 },
        { id: 5, name: 'Awakened Multistrike Support 5/20', url: url('e'), category: 'Saved from price check', tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null }
      ]
    }]
  })
  const w = overlay.widget('woke-trade-searches')
  const rail = w.getByRole('navigation', { name: 'Folders' })
  await expect(rail).toBeVisible({ timeout: 15_000 })
  await expect(rail.getByRole('button')).toContainText(['All', 'Pinned', 'Recently opened', 'Live searches', 'Boots to flip', 'Gems', 'Saved from price check', 'Uniques', 'New folder'])
  await overlay.snap('all')

  await rail.getByRole('button', { name: /Boots to flip/ }).click()
  await expect(w.getByRole('button', { name: /Two-Toned Boots/ })).toHaveCount(2)
  await expect(w.getByRole('button', { name: /Spark/ })).toHaveCount(0)
  await overlay.snap('folder')

  // Drag Spark onto Boots to flip.
  await rail.getByRole('button').filter({ hasText: 'All' }).first().click()
  await w.getByRole('button', { name: /Spark/ }).dragTo(rail.getByRole('button', { name: /Boots to flip/ }))
  await rail.getByRole('button', { name: /Boots to flip/ }).click()
  await expect(w.getByRole('button', { name: /Spark/ })).toHaveCount(1)

  // Icon picker from the folder's right-click menu.
  await rail.getByRole('button').filter({ hasText: 'Gems' }).first().click({ button: 'right' })
  await overlay.page.getByRole('menuitem', { name: 'Change icon' }).click()
  await expect(rail.getByRole('group', { name: 'Icon for Gems' })).toBeVisible()
  await overlay.snap('icon picker')
})
