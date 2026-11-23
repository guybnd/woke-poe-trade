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
  // Settings shows its top 3 under All; its chip shows every page.
  await panel.locator('[data-search-chips] button').filter({ hasText: 'Settings' }).click()
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

test('"check for updates" runs the check and shows the answer on the Install page', async ({ overlay }) => {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  await overlay.showScreen('screens/map-real-01.png')
  await overlay.pressHotkey(SEARCH_KEY)
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })

  await box.fill('check for updates')
  const hit = panel.getByRole('button', { name: /\sCheck for updates\s*Version / })
  await expect(hit).toBeVisible()
  // The command, not also a setting row of the same name.
  await expect(panel.getByRole('button', { name: /Check for updates\s*Setting · / })).toHaveCount(0)
  await hit.click()
  await expect(panel.getByRole('button', { name: 'Check now' })).toBeVisible()
  await box.press('Enter')

  const row = overlay.widget('settings').locator('[data-setting="Check for updates"]')
  await expect(row).toBeInViewport()
  await expect(row.getByRole('status')).toHaveText('9.9.9 available.')
  await expect(row.getByRole('link', { name: 'Download' })).toHaveAttribute('href', 'https://github.com/guybnd/woke-poe-trade/releases/tag/v9.9.9')
  await expect(row.getByRole('button', { name: 'Check now' })).toBeEnabled()
  await overlay.snap('search-check-updates')
  expect(overlay.errors).toEqual([])
})
