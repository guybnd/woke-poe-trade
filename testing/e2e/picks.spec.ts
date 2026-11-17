// Picking several rows with Ctrl and Shift: the loot filter's item chips (a
// click toggles one, Shift adds a run) and the Atlas strategies list (a click
// opens one, Ctrl toggles, Shift picks a run from the open one).
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, FIXTURES } from './harness'

test('loot filter chips: a click toggles one, Shift + click adds the run', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.copyFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), path.join(folder, 'NeverSink.filter'))
  await overlay.boot({ widgets: [{ wmType: 'woke-loot-filter', wmFlags: ['invisible-on-blur'], sampleHotkey: 'Alt + F', editorHotkey: 'Alt + Shift + F', folder, sourceName: 'NeverSink.filter' }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+Shift+F')
  await overlay.pressHotkey('Alt + Shift + F')
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByRole('button', { name: /Tier 3/ }).first().click()
  const chips = page.locator('[title^="Click to pick"]')
  await expect(chips.nth(2)).toBeVisible()

  await chips.nth(0).click()
  await expect(page.getByText('1 picked')).toBeVisible()
  await chips.nth(2).click({ modifiers: ['Shift'] })
  await expect(page.getByText('3 picked')).toBeVisible()
  // A plain click unpicks one and keeps the rest.
  await chips.nth(1).click()
  await expect(page.getByText('2 picked')).toBeVisible()
  // Ctrl + click does the same.
  await chips.nth(1).click({ modifiers: ['Control'] })
  await expect(page.getByText('3 picked')).toBeVisible()
})

test('Atlas strategies: a click opens one, Ctrl + click picks more, Shift + click picks a run', async ({ overlay }) => {
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-atlas-strategies',
      wmTitle: 'Atlas strategies',
      wmWants: 'show',
      wmFlags: ['invisible-on-blur'],
      anchor: { pos: 'tl', x: 2, y: 8 },
      dataUrl: '',
      selectedId: null,
      treeHidden: true,
      folders: [],
      strategies: ['A', 'B', 'C', 'D'].map((name, i) =>
        ({ id: i + 1, name, folder: '', league: '', tags: [], treeUrl: '', threads: [], scarabs: '', device: '', regex: '', notes: '' }))
    } as never]
  })
  const atlas = overlay.widget('woke-atlas-strategies')
  const row = (n: number) => atlas.locator(`[data-row="s:${n}"]`)
  const picked = atlas.locator('[data-row][class*="picked"]')
  await expect(row(1)).toBeVisible()

  await row(1).click()
  await expect(picked).toHaveCount(0)
  await row(3).click({ modifiers: ['Shift'] })
  await expect(picked).toHaveCount(3)
  // Shift again counts from the open one, not the last click.
  await row(2).click({ modifiers: ['Shift'] })
  await expect(picked).toHaveCount(2)
  await row(4).click({ modifiers: ['Control'] })
  await expect(picked).toHaveCount(3)
  await row(4).click({ modifiers: ['Control'] })
  await expect(picked).toHaveCount(2)
  // A plain click opens one and drops the picks.
  await row(4).click()
  await expect(picked).toHaveCount(0)
})
