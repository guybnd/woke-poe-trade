// Loot filter rules told apart by numbers (cluster jewels: passives and item
// level): listed by size with the numbers in boxes, editable in the row and
// in the side panel, and the change reaches the saved filter.
import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { test, expect, FIXTURES } from './harness'

function filterFolder (): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  const text = zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz')))
  fs.writeFileSync(path.join(dir, 'NeverSink.filter'), text)
  return dir
}

test('cluster jewel rules read as passives and item level, and a number changed in the row is saved', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByPlaceholder('Filter groups').fill('cluster')
  await page.getByText('Jewels › Cluster', { exact: true }).click()

  // One heading per size; no "Show from" by one number; nothing left as a special.
  for (const size of ['Large Cluster Jewel', 'Medium Cluster Jewel', 'Small Cluster Jewel']) {
    await expect(page.getByText(size, { exact: true }).first()).toBeVisible()
  }
  await expect(page.getByText('Show from')).toHaveCount(0)
  await expect(page.getByText('Special rules')).toHaveCount(0)
  await expect(page.getByText('Everything else').first()).toBeVisible()
  await overlay.snap('cluster jewels by size, numbers first')

  // The "8 or fewer passives, any item level" Large rule: 8 → 6 in its row.
  const box = page.getByRole('spinbutton', { name: 'High large: highest passives', exact: true })
  await expect(box).toHaveValue('8')
  await box.fill('6')
  await box.press('Enter')
  await expect(page.getByRole('spinbutton', { name: 'High large: highest passives', exact: true })).toHaveValue('6')

  // Side panel: the picked rule's numbers, with how each compares.
  await page.locator('[data-tiers="highlarge"]').getByText('Large Cluster Jewel').click()
  await expect(page.getByText('Numbers it checks')).toBeVisible()
  await overlay.snap('cluster rule numbers in the side panel')

  await page.getByRole('button', { name: /^Save/ }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toMatch(/\$tier->highlarge[^\n]*\r?\n\tRarity Normal Magic Rare\r?\n\tEnchantmentPassiveNum <= 6/)
})

test('the Cluster page shows the price rules from poe.ninja, and a picked passive type reaches the saved filter', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByPlaceholder('Filter groups').fill('cluster')
  // One page: the price rules aren't a group of their own any more.
  await expect(page.getByText('Jewels › Cluster jewels by price', { exact: true })).toHaveCount(0)
  await page.getByText('Jewels › Cluster', { exact: true }).click()

  await expect(page.getByText('Worth money', { exact: true })).toBeVisible()
  const top12 = page.getByRole('button', { name: /Top · 12 passives · item level 84\+/ })
  await expect(top12).toContainText('Minion Damage')
  await expect(page.getByRole('button', { name: /Good · 12 passives · item level 84\+/ })).toContainText('Fire Damage')
  await overlay.snap('cluster price rules from poe.ninja')

  // Wand Damage is worth 2c: pin it to the top rule.
  const large = page.locator('details').first()
  await large.locator('summary').click()
  await large.getByRole('button', { name: /^Wand Damage: by price/ }).click()
  await expect(large.getByRole('button', { name: /^Wand Damage: always top/ })).toBeVisible()
  await expect(top12).toContainText('Wand Damage')
  await overlay.snap('cluster passive type picked as always top')

  await page.getByRole('button', { name: /^Save/ }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toMatch(/\$tier->n12_i84_t1[^\n]*(\r?\n\t[^\n]*)*\r?\n\tEnchantmentPassiveNode == "Minion Damage" "Wand Damage"/)
})
