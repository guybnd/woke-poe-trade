// PoB builds' list on the files in the builds folder: the order you set is kept
// in the app (files stay as they are), a new file goes after the ordered ones,
// and renaming a folder renames it on disk.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, FIXTURES } from './harness'

function buildsFolder (files: string[]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-pob-'))
  const xml = fs.readFileSync(path.join(FIXTURES, 'pob', 'Showcase.xml'))
  for (const f of files) {
    fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true })
    fs.writeFileSync(path.join(dir, f), xml)
  }
  return dir
}

test('PoB builds: your order is kept, a new file comes after it, a folder rename moves the folder', async ({ overlay }) => {
  const dir = buildsFolder(['Alpha.xml', 'Bravo.xml', 'Box/Delta.xml'])
  await overlay.boot({
    overlayActive: true,
    widgets: [{
      wmType: 'woke-pob-builds', wmWants: 'show', wmFlags: ['invisible-on-blur'], anchor: { pos: 'tl', x: 5, y: 12 },
      buildsDir: dir, pobExe: '', pinned: [], activeBuild: null, followChars: {}, sortBy: 'manual'
    } as never]
  })
  const w = overlay.widget('woke-pob-builds')
  const names = () => w.locator('[data-row^="s:"]').evaluateAll(els => els.map(e => e.querySelector('.w-trunc')?.textContent?.trim() ?? ''))
  await expect.poll(names).toEqual(['Alpha', 'Bravo', 'Delta'])

  // Bravo above Alpha: kept, and the files don't change.
  await w.locator('[data-row^="s:"]', { hasText: 'Bravo' }).locator('button').first().focus()
  await overlay.page.keyboard.press('Alt+ArrowUp')
  await expect.poll(names).toEqual(['Bravo', 'Alpha', 'Delta'])
  expect(fs.existsSync(path.join(dir, 'Alpha.xml')) && fs.existsSync(path.join(dir, 'Bravo.xml'))).toBe(true)

  // A file saved in PoB since: after the ordered ones.
  fs.copyFileSync(path.join(dir, 'Alpha.xml'), path.join(dir, 'Aardvark.xml'))
  await w.getByTitle('Reload builds folder').click()
  await expect.poll(names).toEqual(['Bravo', 'Alpha', 'Aardvark', 'Delta'])

  // Renaming the folder renames it on disk; its build follows.
  await w.locator('[data-row="f:Box"]').focus()
  await overlay.page.keyboard.press('F2')
  await w.locator('input[data-draft]').fill('Crate')
  await w.locator('input[data-draft]').press('Enter')
  await expect(w.locator('[data-row="f:Crate"]')).toBeVisible()
  await expect.poll(() => fs.existsSync(path.join(dir, 'Crate', 'Delta.xml'))).toBe(true)
  expect(fs.existsSync(path.join(dir, 'Box'))).toBe(false)
})
