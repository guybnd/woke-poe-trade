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
