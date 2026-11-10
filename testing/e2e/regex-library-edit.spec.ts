// The Regex library window edits its own list (pick A): pencil and bin on the
// row under the mouse, "New" in the toolbar, and poe.re one click away.
import { test, expect } from './harness'
import type { FakeApp, Overlay } from './harness'

type Entry = { name: string, text: string, category: string, tags: string[] }

async function openLibrary (overlay: Overlay) {
  await overlay.boot({
    overlayActive: true,
    patch: c => { c.widgets.find((w: { wmType: string }) => w.wmType === 'woke-regex-library').wmWants = 'show' }
  })
  return overlay.widget('woke-regex-library')
}

// Save writes the config at once; call fakeApp.clearReceived() before it.
async function savedEntries (overlay: Overlay, fakeApp: FakeApp): Promise<Entry[]> {
  const saved = await fakeApp.waitForReceived('CLIENT->MAIN::save-config')
  const config = JSON.parse(saved.contents as string)
  return config.widgets.find((w: { wmType: string }) => w.wmType === 'woke-regex-library').entries
}

test('a row\'s pencil edits it in place, and the edit is kept', async ({ overlay, fakeApp }) => {
  const library = await openLibrary(overlay)
  const row = library.locator('div', { has: overlay.page.getByText('No reflect', { exact: true }) }).last()
  // The pencil and bin only show on the row under the mouse.
  await expect(row.locator('[data-qa="regex-edit"]')).toBeHidden()
  await row.hover()
  await expect(row.locator('[data-qa="regex-edit"]')).toBeVisible()
  await overlay.snap('pencil and bin on the hovered row')
  await row.locator('[data-qa="regex-edit"]').click()

  const form = library.locator('[data-qa="regex-entry-form"]')
  await expect(form).toBeVisible()
  await expect(form.locator('[data-qa="regex-name"] input')).toHaveValue('No reflect')
  await form.locator('[data-qa="regex-name"] input').fill('No reflect at all')
  await form.locator('[data-qa="regex-text"] input').fill('"!eflec|f ele"')
  await overlay.snap('editing a row in place')
  fakeApp.clearReceived()
  await form.locator('[data-qa="regex-name"] input').press('Enter')

  await expect(form).toHaveCount(0)
  await expect(library.getByText('No reflect at all', { exact: true })).toBeVisible()
  const entries = await savedEntries(overlay, fakeApp)
  const edited = entries.find(e => e.name === 'No reflect at all')
  expect(edited?.text).toBe('"!eflec|f ele"')
  expect(edited?.category).toBe('Maps')
  expect(entries.some(e => e.name === 'No reflect')).toBe(false)
})

test('Cancel leaves the entry as it was', async ({ overlay }) => {
  const library = await openLibrary(overlay)
  const row = library.locator('div', { has: overlay.page.getByText('Unidentified', { exact: true }) }).last()
  await row.hover()
  await row.locator('[data-qa="regex-edit"]').click()
  const form = library.locator('[data-qa="regex-entry-form"]')
  await form.locator('[data-qa="regex-name"] input').fill('Changed my mind')
  await form.locator('[data-qa="regex-cancel"]').click()
  await expect(form).toHaveCount(0)
  await expect(library.getByText('Unidentified', { exact: true })).toBeVisible()
  await expect(library.getByText('Changed my mind')).toHaveCount(0)
})

test('New adds an entry from the window', async ({ overlay, fakeApp }) => {
  const library = await openLibrary(overlay)
  await library.locator('[data-qa="regex-new"]').click()
  const form = library.locator('[data-qa="regex-entry-form"]')
  await expect(form).toBeVisible()
  // Save needs a search string.
  await expect(form.locator('[data-qa="regex-save"]')).toBeDisabled()
  await form.locator('[data-qa="regex-name"] input').fill('Rare rings')
  await form.locator('[data-qa="regex-text"] input').fill('"y: rare.*ring"')
  await form.locator('[data-qa="regex-category"] input').fill('Dump sorting')
  await form.locator('[data-qa="regex-tags"] input').fill('vendor, chaos')
  await overlay.snap('adding a new entry')
  fakeApp.clearReceived()
  await form.locator('[data-qa="regex-save"]').click()

  await expect(form).toHaveCount(0)
  await expect(library.getByText('Rare rings', { exact: true })).toBeVisible()
  const entries = await savedEntries(overlay, fakeApp)
  const added = entries.find(e => e.name === 'Rare rings')
  expect(added).toMatchObject({ text: '"y: rare.*ring"', category: 'Dump sorting', tags: ['vendor', 'chaos'] })
  // Ids stay unique.
  const ids = (entries as Array<Entry & { id: number }>).map(e => e.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('the bin removes a row, and Undo brings it back', async ({ overlay }) => {
  const library = await openLibrary(overlay)
  const name = library.getByText('20% quality', { exact: true })
  const row = library.locator('div', { has: overlay.page.getByText('20% quality', { exact: true }) }).last()
  await row.hover()
  await row.locator('[data-qa="regex-remove"]').click()
  await expect(name).toHaveCount(0)
  await overlay.page.getByRole('button', { name: 'Undo' }).click()
  await expect(library.getByText('20% quality', { exact: true })).toBeVisible()
})

test('"Generate on poe.re" opens the in-app poe.re window', async ({ overlay }) => {
  const library = await openLibrary(overlay)
  const poeRe = overlay.widget('woke-poe-re')
  await expect(poeRe.locator('[data-qa="poe-re-save"]')).toBeHidden()
  await library.locator('[data-qa="regex-poe-re"]').click()
  await expect(poeRe.locator('[data-qa="poe-re-save"]')).toBeVisible()
  await expect(poeRe.locator('webview')).toHaveCount(1)
  await overlay.snap('poe.re window open')
  // Nothing built yet (no page in a plain browser): Save says so instead of saving.
  await poeRe.locator('[data-qa="poe-re-save"]').click()
  await expect(overlay.page.getByText(/Pick something on poe.re first/)).toBeVisible()
  await expect(poeRe.locator('[data-qa="poe-re-save-form"]')).toHaveCount(0)
})
