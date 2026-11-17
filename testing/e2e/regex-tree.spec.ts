// Regex library's list: its folders, and a click on a string searches the stash.
import { test, expect } from './harness'

test('regex library: folders hold their strings; a click on one searches the stash', async ({ overlay, fakeApp }) => {
  await overlay.boot({
    overlayActive: true,
    patch: c => { c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-regex-library').wmWants = 'show' }
  })
  const library = overlay.widget('woke-regex-library')
  await expect(library.getByText('Maps', { exact: true }).first()).toBeVisible()
  // Folders are rows that fold (as in every saved list), open to start.
  await expect(library.locator('[data-row="f:Maps"]')).toHaveAttribute('aria-expanded', 'true')
  await expect(library.getByText('No reflect', { exact: true })).toBeVisible()
  await library.getByText('No reflect', { exact: true }).click()
  await expect.poll(() => fakeApp.game.stashSearches).toEqual(['"!eflec"'])
})

test('regex library: folders Atlas strategies and PoB builds file into stay put', async ({ overlay }) => {
  await overlay.boot({
    overlayActive: true,
    patch: c => {
      const w = c.widgets.find((x: { wmType: string }) => x.wmType === 'woke-regex-library')
      w.wmWants = 'show'
      w.entries = [
        { id: 1, name: 'Strategy string', text: 'abc', category: 'Atlas strategies/Juice', tags: [], notes: '', hotkey: null },
        { id: 2, name: 'Mine', text: 'def', category: 'Mine', tags: [], notes: '', hotkey: null }
      ]
    }
  })
  const library = overlay.widget('woke-regex-library')
  const locked = library.locator('[data-row="f:Atlas strategies"]')
  await expect(locked).toBeVisible()
  // No rename.
  await locked.focus()
  await overlay.page.keyboard.press('F2')
  await expect(library.locator('input[data-draft]')).toHaveCount(0)
  await expect(overlay.page.getByText(/keep their regexes in this folder/)).toBeVisible()
  // Nothing moves into it.
  await library.locator('[data-row="f:Mine"]').dragTo(locked, { targetPosition: { x: 40, y: 12 } })
  await expect(library.locator('[data-row="f:Mine"]')).toBeVisible()
})
