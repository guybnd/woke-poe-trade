// Search palette: "settings" finds the settings window and every page, and a
// setting's name jumps straight to its row. A result's name starts with its
// icon's glyph and a space.
import { test, expect } from './harness'

test.describe.configure({ mode: 'parallel' })

const SEARCH_KEY = 'Ctrl + Space'

test('"settings" lists Open settings and every page, and a page opens', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })
  await expect(box).toBeFocused()

  await box.fill('settings')
  await expect(panel.getByRole('button', { name: /\sOpen settings\s*Settings$/ })).toBeVisible()
  for (const name of ['Game & league', 'Hotkeys', 'Performance', 'About']) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    await expect(panel.getByRole('button', { name: new RegExp('\\s' + escaped + '\\s*Settings page$') })).toBeVisible()
  }
  await overlay.snap('search-settings')

  await panel.getByRole('button', { name: /\sHotkeys\s*Settings page$/ }).dblclick()
  const settings = overlay.widget('settings')
  await expect(settings.getByPlaceholder('Find an action or key')).toBeVisible()
  expect(overlay.errors).toEqual([])
})

test('a setting by name opens its page and flashes its row', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })

  await box.fill('account name')
  const hit = panel.getByRole('button', { name: /\sAccount name\s*Setting · Game & league$/ })
  await expect(hit).toBeVisible()
  await hit.click()
  await expect(panel.getByRole('button', { name: 'Go to the setting' })).toBeVisible()
  await box.press('Enter')

  const row = overlay.widget('settings').locator('[data-setting="Account name"]')
  await expect(row).toBeInViewport()
  await expect(row).toHaveClass(/w-flash/)
  await overlay.snap('search-settings-row')
  expect(overlay.errors).toEqual([])
})
