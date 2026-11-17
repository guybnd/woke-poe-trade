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
