// Search palette: what you typed is kept when it closes, opened or not. An
// empty box lists the last few searches under Recent; Enter or a click puts
// one back, and typing hides them.
import { test, expect } from './harness'
import type { Overlay } from './harness'

const SEARCH_KEY = 'Ctrl + Space'

async function openPalette (overlay: Overlay) {
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })
  // The palette mounts lazily: a key pressed before it's there opens nothing.
  await expect(async () => {
    if (!await box.isVisible()) await overlay.pressHotkey(SEARCH_KEY)
    await expect(box).toBeFocused({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })
  return { panel, box }
}

test('a search typed and closed without opening anything is offered again', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  await overlay.showScreen('screens/map-real-01.png')

  let { panel, box } = await openPalette(overlay)
  for (const q of ['divi', 'tabula ras']) {
    await box.fill(q)
    await box.press('Escape')
    await expect(box).toBeHidden()
    ;({ panel, box } = await openPalette(overlay))
  }

  // Newest first, under Recent, and the box stays empty.
  await expect(box).toHaveValue('')
  const again = panel.locator('button').filter({ hasText: 'Search again' })
  await expect(again).toHaveCount(2)
  await expect(again.nth(0)).toContainText('tabula ras')
  await expect(again.nth(1)).toContainText('divi')
  await overlay.snap('search-recent-queries')

  // The top one is picked: Enter puts it back in the box.
  await box.press('Enter')
  await expect(box).toHaveValue('tabula ras')
  await expect(again).toHaveCount(0)

  // A click on the second puts that back instead.
  await box.fill('')
  await again.nth(1).click()
  await expect(box).toHaveValue('divi')
})

test('a Recent line can be saved to stay on top, or removed with × or Delete', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  await overlay.showScreen('screens/map-real-01.png')

  let { panel, box } = await openPalette(overlay)
  for (const q of ['searcj', 'divi', 'taba']) {
    await box.fill(q)
    await box.press('Escape')
    await expect(box).toBeHidden()
    ;({ panel, box } = await openPalette(overlay))
  }
  const again = panel.locator('button').filter({ hasText: 'Search again' })
  await expect(again).toHaveCount(3)

  // Hover shows the buttons over the row's right edge; Save moves it under Saved.
  const divi = panel.locator('.w-line:has([data-search-remove])').filter({ hasText: 'divi' })
  await expect(divi.locator('[data-search-save]')).toBeHidden()
  await divi.hover()
  await divi.locator('[data-search-save]').click()
  const heads = panel.locator('[data-search-palette] .w-scroll > div')
  await expect(panel.getByText('Saved', { exact: true })).toBeVisible()
  await expect(again.first()).toContainText('divi')
  await panel.locator('.w-line:has([data-search-remove])').filter({ hasText: 'taba' }).hover()
  await overlay.snap('search-recent-saved')

  // × takes the typo away.
  const typo = panel.locator('.w-line:has([data-search-remove])').filter({ hasText: 'searcj' })
  await typo.hover()
  await typo.locator('[data-search-remove]').click()
  await expect(again).toHaveCount(2)
  await expect(box).toBeFocused()

  // Delete takes the picked line away: pick the saved "divi" first.
  const picked = panel.locator('[data-selected]')
  await expect(async () => {
    if (!(await picked.textContent())?.includes('divi')) await box.press('ArrowDown')
    await expect(picked).toContainText('divi', { timeout: 500 })
  }).toPass({ timeout: 5000 })
  await box.press('Delete')
  await expect(again).toHaveCount(1)
  await expect(again.first()).toContainText('taba')
  await expect(heads.filter({ hasText: /^Saved$/ })).toHaveCount(0)

  // Kept after closing.
  await box.press('Escape')
  ;({ panel, box } = await openPalette(overlay))
  await expect(panel.locator('button').filter({ hasText: 'Search again' })).toHaveCount(1)
})
