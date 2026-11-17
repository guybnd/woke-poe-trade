// Window keys: Esc closes Settings, and the loot filter editor's Ctrl + Z /
// Ctrl + Y step its changes back and forth while it's up.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, FIXTURES } from './harness'

test('Esc closes Settings', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await expect(settings.getByText('League mechanics', { exact: true }).first()).toBeVisible()
  // Out of the search box (there Esc clears it).
  await settings.getByText('Set once here', { exact: false }).click()
  await overlay.page.keyboard.press('Escape')
  await expect(settings.getByText('League mechanics', { exact: true }).first()).toBeHidden()
})

test('loot filter: Ctrl + Z and Ctrl + Y step a change back and forth', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.copyFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), path.join(folder, 'NeverSink.filter'))
  await overlay.boot({ widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByRole('button', { name: /Tier 1/ }).first().click()
  const slider = page.locator('input[type="range"][min="18"]').first()
  const start = await slider.inputValue()
  await slider.fill('20')
  await slider.dispatchEvent('change')
  await page.waitForTimeout(700)
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.keyboard.press('Control+z')
  await expect(slider).toHaveValue(start)
  await page.keyboard.press('Control+Shift+z')
  await expect(slider).toHaveValue('20')
  await page.keyboard.press('Control+z')
  await expect(slider).toHaveValue(start)
  await page.keyboard.press('Control+y')
  await expect(slider).toHaveValue('20')

  // The window's ? lists its keys.
  await page.getByRole('img', { name: /Keys in this window/ }).first().hover()
  const card = page.getByRole('tooltip')
  await expect(card).toContainText('Undo')
  await expect(card).toContainText('Redo')
  await expect(card).toContainText('Mouse back')
})
