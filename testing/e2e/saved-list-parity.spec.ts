// Every saved list does the same things the same way (shared/use-saved-tree):
// nested folders that fold, a filter, F2 rename, Delete with Undo, Ctrl and
// Shift picking, Alt + arrows, drag into a folder, a right-click menu. One set
// of checks, run on each list with the same items:
//   A, B, C at the top; Box with D; Box/Inner with E.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, FIXTURES } from './harness'
import type { Locator } from '@playwright/test'
import type { Overlay } from './harness'

interface ListUnderTest {
  name: string
  open: (overlay: Overlay) => Promise<Locator>
}

const SEED: Array<{ id: number, name: string, folder: string }> = [
  { id: 1, name: 'Alpha', folder: '' },
  { id: 2, name: 'Bravo', folder: '' },
  { id: 3, name: 'Charlie', folder: '' },
  { id: 4, name: 'Delta', folder: 'Box' },
  { id: 5, name: 'Echo', folder: 'Box/Inner' }
]

const LISTS: ListUnderTest[] = [
  {
    name: 'Atlas strategies',
    async open (overlay) {
      await overlay.boot({
        overlayActive: true,
        widgets: [{
          wmType: 'woke-atlas-strategies', wmTitle: 'Atlas strategies', wmWants: 'show', wmFlags: ['invisible-on-blur'],
          anchor: { pos: 'tl', x: 2, y: 8 }, dataUrl: '', selectedId: null, treeHidden: true, folders: [],
          strategies: SEED.map(s => ({ ...s, league: '', tags: [], treeUrl: '', threads: [], scarabs: '', device: '', regex: '', notes: '' }))
        } as never]
      })
      return overlay.widget('woke-atlas-strategies')
    }
  },
  {
    name: 'Regex library',
    async open (overlay) {
      await overlay.boot({
        overlayActive: true,
        patch: c => {
          const w = c.widgets.find((x: { wmType: string }) => x.wmType === 'woke-regex-library')
          w.wmWants = 'show'
          w.entries = SEED.map(s => ({ id: s.id, name: s.name, text: s.name.toLowerCase(), category: s.folder, tags: [], notes: '', hotkey: null }))
        }
      })
      return overlay.widget('woke-regex-library')
    }
  },
  {
    name: 'Trade searches',
    async open (overlay) {
      await overlay.boot({
        overlayActive: true,
        widgets: [{
          wmType: 'woke-trade-searches', wmWants: 'show', wmFlags: [], wmTitle: 'Trade searches', enableHotkeys: false,
          anchor: { pos: 'tl', x: 20, y: 12 }, sort: 'manual',
          entries: SEED.map(s => ({ id: s.id, name: s.name, url: `https://www.pathofexile.com/trade/search/Standard/${s.id}`, category: s.folder, tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null }))
        }]
      })
      return overlay.widget('woke-trade-searches')
    }
  },
  {
    // Files on disk: a build is its file; the order is kept in the app.
    name: 'PoB builds',
    async open (overlay) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-pob-'))
      const xml = fs.readFileSync(path.join(FIXTURES, 'pob', 'Showcase.xml'))
      for (const s of SEED) {
        fs.mkdirSync(path.join(dir, s.folder), { recursive: true })
        fs.writeFileSync(path.join(dir, s.folder, `${s.name}.xml`), xml)
      }
      await overlay.boot({
        overlayActive: true,
        widgets: [{
          wmType: 'woke-pob-builds', wmWants: 'show', wmFlags: ['invisible-on-blur'], anchor: { pos: 'tl', x: 5, y: 12 },
          buildsDir: dir, pobExe: '', pinned: [], activeBuild: null, followChars: {}, sortBy: 'manual'
        } as never]
      })
      return overlay.widget('woke-pob-builds')
    }
  }
]

const order = (w: Locator) => w.locator('[data-row]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.row))
const row = (w: Locator, key: string) => w.locator(`[data-row="${key}"]`)
const focusItem = (w: Locator, id: number) => row(w, `s:${id}`).locator('button').first().focus()

for (const list of LISTS) {
  test(`${list.name}: folders, filter, rename, remove, picks, Alt + arrows, drag, menu`, async ({ overlay }) => {
    const w = await list.open(overlay)
    const page = overlay.page
    await expect(row(w, 's:5')).toBeVisible({ timeout: 15_000 })
    expect(await order(w)).toEqual(['s:1', 's:2', 's:3', 'f:Box', 's:4', 'f:Box/Inner', 's:5'])

    // Folders fold and open.
    await row(w, 'f:Box').click()
    await expect(row(w, 'f:Box')).toHaveAttribute('aria-expanded', 'false')
    await expect(row(w, 's:5')).toHaveCount(0)
    await row(w, 'f:Box').click()
    await expect(row(w, 's:5')).toBeVisible()

    // The filter finds an item in a nested folder, with its folders.
    const filter = w.getByPlaceholder(/filter|search/i).first()
    await filter.fill('echo')
    expect(await order(w)).toEqual(['f:Box', 'f:Box/Inner', 's:5'])
    await filter.fill('')

    // F2 renames in place.
    await focusItem(w, 2)
    await page.keyboard.press('F2')
    await w.locator('input[data-draft]').fill('Bravo two')
    await w.locator('input[data-draft]').press('Enter')
    await expect(w.getByText('Bravo two', { exact: true })).toBeVisible()

    // Delete removes, Undo puts it back where it was.
    await focusItem(w, 3)
    await page.keyboard.press('Delete')
    await expect(row(w, 's:3')).toHaveCount(0)
    await page.getByRole('status').filter({ hasText: 'Charlie' }).getByRole('button', { name: 'Undo' }).click()
    await expect(row(w, 's:3')).toBeVisible()
    expect((await order(w)).slice(0, 3)).toEqual(['s:1', 's:2', 's:3'])

    // Ctrl and Shift pick several (a plain click is each list's own: Regex
    // library searches the stash with it).
    const picked = w.locator('[data-row][class*="picked"]')
    await row(w, 's:1').click({ modifiers: ['Control'] })
    await row(w, 's:3').click({ modifiers: ['Shift'] })
    await expect(picked).toHaveCount(3)
    await row(w, 's:2').click({ modifiers: ['Control'] })
    await expect(picked).toHaveCount(2)
    await row(w, 's:1').click({ modifiers: ['Control'] })
    await expect(picked).toHaveCount(0)

    // Alt + Down moves an item past its neighbour.
    await focusItem(w, 1)
    await page.keyboard.press('Alt+ArrowDown')
    expect((await order(w)).slice(0, 3)).toEqual(['s:2', 's:1', 's:3'])

    // Drag an item into a folder.
    await row(w, 's:3').dragTo(row(w, 'f:Box'), { targetPosition: { x: 40, y: 10 } })
    await expect.poll(async () => (await order(w)).indexOf('s:3')).toBeGreaterThan((await order(w)).indexOf('f:Box'))

    // Right-click gives the row's menu.
    await row(w, 's:2').click({ button: 'right' })
    await expect(page.getByRole('menuitem', { name: /Rename/ })).toBeVisible()
    await page.keyboard.press('Escape')
  })
}
