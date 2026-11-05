// The loot filter editor on a NeverSink filter in a temp filter folder:
// the loot shower preview and the sound/beam/minimap pickers.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, FIXTURES } from './harness'
import type { FakeApp, Overlay } from './harness'

const FILTER = process.env.WOKE_FILTER_FIXTURE ?? path.join(FIXTURES, 'filters', 'neversink-sample.filter')

function filterFolder (): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.copyFileSync(FILTER, path.join(dir, 'NeverSink.filter'))
  return dir
}

const lootFilter = (folder: string) => ({
  wmType: 'woke-loot-filter',
  wmFlags: ['invisible-on-blur'],
  sampleHotkey: 'Alt + F',
  editorHotkey: 'Alt + Shift + F',
  folder,
  sourceName: 'NeverSink.filter'
})

// The editor's hotkey registers once the widget has mounted; on a busy CI
// machine that can take a few seconds.
async function openEditor (overlay: Overlay, fakeApp: FakeApp) {
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
}

test('preview drops a pile of loot through the filter, and compares with NeverSink as it came', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByText(/\d+ of 40 shown/).first()).toBeVisible()
  // Let the labels finish falling.
  await page.waitForTimeout(1500)
  await overlay.snap('loot shower, T16')

  await page.getByRole('button', { name: 'Acts', exact: true }).click()
  await page.getByRole('button', { name: 'Reroll' }).click()
  await expect(page.getByText(/\d+ of 40 shown/).first()).toBeVisible()

  // Compare: two grounds, the same pile.
  await page.getByLabel('Compare with').selectOption('untouched')
  await expect(page.getByText(/\d+ of 40 shown/)).toHaveCount(2)
  await page.getByText('Show hidden').click()
  await page.waitForTimeout(1500)
  await overlay.snap('loot shower compared with NeverSink as it came')
})

test('style editor: NeverSink sound pack, beam and minimap pickers; a pack sound is copied into the filter folder on save', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByRole('button', { name: 'Red beam' }).first().click()
  await page.getByRole('button', { name: 'Large icon', exact: true }).first().click()
  await page.getByRole('button', { name: 'Star icon' }).first().click()
  await page.getByLabel('Alert sound').first().selectOption('2currency.mp3')
  await overlay.snap('style editor with pack sound, beam and star icon')
  await expect.poll(() => fs.existsSync(path.join(folder, '2currency.mp3'))).toBe(true)
  await page.getByRole('button', { name: /^Save/ }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toContain('CustomAlertSound "2currency.mp3" 300')
})

test('rule builder, drag and drop between tiers, and presets end up in the saved filter', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page

  // A rule of your own: rare rings, big and purple.
  await page.getByRole('button', { name: 'New rule' }).click()
  const addClass = page.getByLabel('Add Item class')
  await addClass.fill('Rings')
  await addClass.press('Enter')
  await page.getByLabel('Add a condition').selectOption('Rarity')
  await page.getByRole('button', { name: 'Purple beam' }).click()
  await expect(page.getByText(/Catches \d+ of \d+ test items/)).toBeVisible()
  await overlay.snap('rule builder with a rare rings rule')

  // Drag Chaos Orb from its tier onto another one.
  await page.getByRole('button', { name: /^Currency\s*4$/ }).click()
  await page.getByRole('button', { name: /t3chaos/ }).click()
  await page.getByText('Chaos Orb', { exact: true }).last().dragTo(page.getByRole('button', { name: /t2divine/ }))
  await expect(page.getByText('Moved Chaos Orb to t2divine')).toBeVisible()

  // Presets.
  await page.getByRole('tab', { name: /Presets/ }).click()
  await page.getByRole('switch', { name: 'Show 6-socket items for the vendor' }).click()
  await overlay.snap('presets tab')

  await page.getByRole('button', { name: /^Save/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toContain('$type->woke->rule')
  const text = fs.readFileSync(out, 'utf8')
  expect(text).toMatch(/\$type->woke->rule[^\n]*\n(\t[^\n]*\n)*\tClass == "Rings"/)
  expect(text).toContain('PlayEffect Purple')
  expect(text).toContain('$type->woke->preset $tier->sixsockets')
  // Chaos Orb now listed in t2divine.
  expect(text).toMatch(/\$tier->t2divine[^\n]*\n(\t[^\n]*\n)*\tBaseType == [^\n]*"Chaos Orb"/)
})

test('back from a rule returns to the same pile, by button and by the mouse back button', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Acts', exact: true }).click()
  await page.getByRole('button', { name: 'Reroll' }).click()
  await page.getByRole('button', { name: 'Reroll' }).click()
  const labels = page.locator('[class*="_drop_"]')
  await expect(labels.first()).toBeVisible()
  const ruled = page.locator('[class*="_drop_"]:not([title*="no rule"])')
  const pile = async () => await labels.evaluateAll(els => els.map(e => e.getAttribute('title') + e.textContent).join('|'))
  const before = await pile()
  // Hidden items are on by default, so the whole pile is there.
  expect(await labels.count()).toBe(40)

  const backButton = page.getByText('Back', { exact: true })
  await ruled.first().dispatchEvent('click')
  await expect(backButton).toBeVisible()
  await expect(labels).toHaveCount(0)
  await backButton.click()
  await expect(labels.first()).toBeVisible()
  expect(await pile()).toBe(before)
  await expect(backButton).toHaveCount(0)

  await ruled.first().dispatchEvent('click')
  await expect(backButton).toBeVisible()
  await page.getByRole('tab', { name: 'Rules' }).dispatchEvent('mouseup', { button: 3, bubbles: true })
  await expect(labels.first()).toBeVisible()
  expect(await pile()).toBe(before)
})
