// The loot filter editor on a NeverSink filter in a temp filter folder:
// the loot shower preview and the sound/beam/minimap pickers.
import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import { test, expect, FIXTURES } from './harness'
import type { FakeApp, Overlay } from './harness'

// Each test boots its own overlay: the file's tests can spread over workers
// and shards (one file alone otherwise sets how short a shard can be).
test.describe.configure({ mode: 'parallel' })

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
  await page.getByRole('button', { name: /^Beam/ }).first().click()
  await page.getByRole('button', { name: 'Red beam' }).first().click()
  await page.getByRole('button', { name: /^Map icon/ }).first().click()
  await page.getByRole('button', { name: 'Large icon', exact: true }).first().click()
  await page.getByRole('button', { name: 'Star icon' }).first().click()
  await page.getByRole('button', { name: /^Sound/ }).first().click()
  await page.getByLabel('Alert sound').first().selectOption('2currency.mp3')
  await overlay.snap('style editor with pack sound, beam and star icon')
  await expect.poll(() => fs.existsSync(path.join(folder, '2currency.mp3'))).toBe(true)
  await page.getByRole('button', { name: /^Save/ }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toContain('CustomAlertSoundOptional "2currency.mp3" 300')
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
  await page.getByRole('button', { name: /^Beam/ }).last().click()
  await page.getByRole('button', { name: 'Purple beam' }).click()
  await expect(page.getByText(/Catches \d+ of \d+ test items/)).toBeVisible()
  await overlay.snap('rule builder with a rare rings rule')

  // Drag Chaos Orb from its tier onto another one.
  await page.getByRole('button', { name: /^General currency\s*4 tiers$/ }).click()
  await page.getByRole('button', { name: /Tier 3/ }).click()
  await page.getByText('Chaos Orb', { exact: true }).last().dragTo(page.getByRole('button', { name: /Tier 2/ }))
  await expect(page.getByText('Moved Chaos Orb to Tier 2')).toBeVisible()

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

test('look strip: text size and background reach every rule in the saved filter, and the preview follows', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page

  const size = page.getByRole('slider', { name: 'Text size' })
  await expect(size).toBeVisible()
  const divine = page.getByLabel('Preview').getByText('Divine Orb', { exact: true })
  const before = await divine.evaluate(e => parseFloat(getComputedStyle(e).fontSize))
  await size.fill('80')
  await page.getByRole('slider', { name: 'Background' }).fill('50')
  await expect.poll(() => divine.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeLessThan(before)
  await overlay.snap('look strip at 80% size, 50% background')
  // The filter is rebuilt once the slider settles.
  await expect(page.getByText('Unsaved', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Save/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toContain('$tier->t1exalted')
  const text = fs.readFileSync(out, 'utf8')
  // Divine's tier: 45 -> 36, white background at half alpha, sound and beam kept.
  expect(text).toMatch(/\$tier->t1exalted[^\n]*\n(\t[^\n]*\n)*\tSetFontSize 36\b/)
  expect(text).toMatch(/\$tier->t1exalted[^\n]*\n(\t[^\n]*\n)*\tSetBackgroundColor 255 255 255 128\b/)
  expect(text).toMatch(/\$tier->t1exalted[^\n]*\n(\t[^\n]*\n)*\tPlayEffect Red/)
})

test('presets: levelling weapons start from a build type, and a chip keeps or hides one type', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /Presets/ }).click()
  await page.getByRole('switch', { name: 'While levelling, only weapons for' }).click()
  await page.getByRole('button', { name: 'Bow', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bows', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Wands', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Wands', exact: true }).click()
  await expect(page.getByText('Custom. Keeps 2 of 15 weapon types.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Bow', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Wands', exact: true }).scrollIntoViewIfNeeded()
  await overlay.snap('levelling weapons, custom')

  await page.getByRole('button', { name: /^Save/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toContain('$tier->otherweapons')
  const block = fs.readFileSync(out, 'utf8').split(/\r?\n(?=\S)/).find(b => b.includes('$tier->otherweapons '))!
  expect(block).toContain('"Claws"')
  expect(block).not.toContain('"Wands"')
  expect(block).not.toContain('"Bows"')
})

test('rules: add an item by search, move one from its menu, take one off, and the file agrees', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByRole('button', { name: /Tier 1/ }).first().click()

  const add = page.getByPlaceholder('Add an item to this tier')
  await add.fill('chaos')
  await expect(page.getByRole('option', { name: /Chaos Orb.*now in .*Tier 3.*Move here/ })).toBeVisible()
  await overlay.snap('add item search')
  await add.press('Enter')
  await expect(page.getByText('Moved Chaos Orb to Tier 1')).toBeVisible()
  await expect(add).toHaveValue('')

  // Its menu draws each tier, and moving there works.
  await page.getByText('Divine Orb', { exact: true }).last().click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: 'Tier 2' })).toBeVisible()
  await overlay.snap('move to menu')
  await page.getByRole('menuitem', { name: 'Tier 2' }).click()
  await expect(page.getByText('Moved Divine Orb to Tier 2')).toBeVisible()

  await page.getByRole('button', { name: /Tier 1/ }).first().click()
  await page.getByRole('button', { name: 'Take Mirror of Kalandra off this tier' }).click()
  await expect(page.getByText('Took Mirror of Kalandra off Tier 1')).toBeVisible()

  // Unsaved is loud, and Ctrl + S saves it.
  await expect(page.getByText('Unsaved', { exact: true })).toBeVisible()
  await overlay.snap('unsaved footer')
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Unsaved', { exact: true })).toBeHidden()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toMatch(/\$tier->t1exalted[^\n]*\n(\t[^\n]*\n)*\tBaseType == "Chaos Orb"\r?\n/)
  const text = fs.readFileSync(out, 'utf8')
  expect(text).toMatch(/\$tier->t2divine[^\n]*\n(\t[^\n]*\n)*\tBaseType == "Divine Orb"/)
  expect(text).not.toMatch(/Mirror of Kalandra/)
})

test('history: a change shows before and after, a dot resets it, Ctrl + Z and the list undo it', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByRole('button', { name: /Tier 1/ }).first().click()

  // The rule's size slider (the look strip's sliders come first).
  const slider = page.locator('input[type="range"][min="18"]').first()
  const start = await slider.inputValue()
  await slider.fill('20')
  await slider.dispatchEvent('change')
  // The dot on the setting takes it back to the filter's value.
  await page.getByRole('button', { name: 'Reset size' }).click()
  await expect(slider).toHaveValue(start)
  await slider.fill('20')
  await slider.dispatchEvent('change')
  await page.waitForTimeout(700)

  await page.getByRole('tab', { name: /^Changes/ }).click()
  await expect(page.getByText(new RegExp(`Tier 1: font size ${start} → 20`)).first()).toBeVisible()
  await overlay.snap('history')
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click()
  await page.getByRole('tab', { name: 'Rules' }).click()
  await expect(slider).toHaveValue(start)
  await page.keyboard.press('Control+y')
  await expect(slider).toHaveValue('20')
  await page.locator('body').click({ position: { x: 5, y: 5 }, force: true }).catch(() => {})
  await page.keyboard.press('Control+z')
  await expect(slider).toHaveValue(start)
})

test('history: a Loot tab change says what moved and on which item, and opens to every value', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), presets: { currency: { on: true } } }] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Loot/ }).click()
  await page.locator('[data-loot-class="cards"]').click()
  const uniq = page.locator('[data-currency-cat="carduniq"]')
  await uniq.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  const star = uniq.locator('[data-loot-collect]').first()
  const card = (await star.getAttribute('aria-label'))!.replace(/^Collecting /, '')
  await star.click()
  await expect(star).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(700)

  await page.getByRole('tab', { name: /^Changes/ }).click()
  const row = page.locator('[data-history-row]').first()
  await expect(row).toContainText(`${card} · Collecting (at least Normal)`)
  await expect(page.getByText('Changed currency weights')).toHaveCount(0)
  await row.click({ position: { x: 40, y: 10 } })
  await expect(page.locator('[data-history-detail]')).toContainText('Collecting')
  await overlay.snap('history, loot change open')
  await row.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Redo to here' })).toBeVisible()
})

test('rules: pick several chips, move them together, hide them together, and see prices', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByRole('button', { name: /Tier 3/ }).first().click()

  // A price on a priced item, highest first.
  await expect(page.locator('[title^="Click to pick"]').first()).toContainText('c')
  await overlay.snap('chips with prices')

  await page.getByText('Chaos Orb', { exact: true }).last().click()
  await page.getByText('Orb of Alchemy', { exact: true }).last().click()
  await expect(page.getByText('2 picked')).toBeVisible()
  await overlay.snap('bulk bar')

  await page.getByRole('toolbar', { name: 'Picked items' }).getByRole('button', { name: 'Move to' }).click()
  await page.getByRole('menuitem', { name: 'Tier 2' }).click()
  await expect(page.getByText('Moved 2 items to Tier 2')).toBeVisible()

  // Now in Tier 2: hide one by its own rule.
  await page.getByText('Chaos Orb', { exact: true }).last().click()
  await page.getByRole('toolbar', { name: 'Picked items' }).getByRole('button', { name: 'Hide' }).click()
  await expect(page.getByText('Hid 1 item')).toBeVisible()

  // Giving a hidden item its own look leaves it hidden.
  await page.getByText('Chaos Orb', { exact: true }).last().click()
  await page.getByRole('toolbar', { name: 'Picked items' }).getByRole('button', { name: 'Own look' }).click()
  await expect(page.getByText(/Changes here go to the 1 item/)).toBeVisible()
  // The rule's size slider (the look strip's sliders come first).
  const slider = page.locator('input[type="range"][min="18"]').first()
  await slider.fill('30')
  await slider.dispatchEvent('change')

  await page.getByRole('button', { name: /^Save/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toMatch(/\$tier->t2divine[^\n]*\n(\t[^\n]*\n)*\tBaseType == [^\n]*"Orb of Alchemy"/)
  expect(fs.readFileSync(out, 'utf8')).toMatch(/Hide # \$type->woke->own [^\n]*\n(\t[^\n]*\n)*\tBaseType == "Chaos Orb"/)
})

test('rule list: drill down, back up, filter, switch, pin', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  const crumbs = page.getByRole('navigation', { name: /Where you are/ })

  // It opens where the first group lives, and the top lists categories.
  await expect(crumbs).toContainText('Currency')
  await crumbs.getByRole('button', { name: 'All' }).click()
  await expect(page.getByRole('button', { name: /^Uniques/ }).first()).toBeVisible()
  await overlay.snap('rule list categories')

  await page.getByRole('button', { name: /^Currency/ }).first().click()
  await page.getByRole('button', { name: /^League/ }).click()
  await overlay.snap('rule list chapter')
  await page.getByRole('button', { name: /Essence/ }).first().click()
  await expect(page.getByText(/tiers ·/).first()).toContainText('tiers')
  await expect(crumbs).toContainText('League')

  // Backspace goes up a level from the list.
  await page.getByRole('button', { name: /Essence/ }).first().focus()
  await page.keyboard.press('Backspace')
  await expect(crumbs).not.toContainText('League')

  // The filter looks at every level and says where a match lives.
  await page.getByPlaceholder('Filter groups').fill('fossil')
  await expect(page.getByRole('button', { name: /Fossil/ }).first()).toBeVisible()
  await overlay.snap('rule list filter')
  await page.getByPlaceholder('Filter groups').fill('')

  // Endgame hides levelling; Both brings it back.
  await crumbs.getByRole('button', { name: 'All' }).click()
  await expect(page.getByRole('button', { name: /^Levelling/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Both', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Levelling/ })).toBeVisible()

  // A pin shows at the top.
  await page.getByRole('button', { name: /^Divination cards/ }).first().click()
  await page.getByRole('button', { name: /^Pin / }).first().click()
  await crumbs.getByRole('button', { name: 'All' }).click()
  await expect(page.getByText('Pinned')).toBeVisible()

  // Campaign is your choice: nothing flips it back, and search says what it hides.
  const mode = (name: string) => page.getByRole('button', { name, exact: true })
  await mode('Campaign').click()
  await page.getByRole('tab', { name: 'Preview' }).click()
  await page.getByRole('tab', { name: 'Rules' }).click()
  await expect(mode('Campaign')).toHaveAttribute('aria-pressed', 'true')
  await page.getByPlaceholder('Filter groups').fill('fossil')
  await expect(page.getByText(/more outside Campaign/)).toBeVisible()
  await page.getByRole('button', { name: 'Show both' }).click()
  await expect(mode('Both')).toHaveAttribute('aria-pressed', 'true')
  await page.getByPlaceholder('Filter groups').fill('')
})

test('rule list: the keys move one row and keep working after each level', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  const crumbs = page.getByRole('navigation', { name: /Where you are/ })
  const focused = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? '')
  await crumbs.getByRole('button', { name: 'All' }).click()

  const first = page.getByRole('button', { name: /^Currency/ }).first()
  await first.focus()
  await page.keyboard.press('ArrowDown')
  expect(await focused()).toMatch(/^Fragments and map items/)
  await page.keyboard.press('ArrowUp')
  expect(await focused()).toMatch(/^Currency/)

  // In, and the keys still work without touching the mouse.
  await page.keyboard.press('ArrowRight')
  await expect(crumbs).toContainText('Currency')
  await page.keyboard.press('ArrowDown')
  expect(await focused()).not.toBe('')
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON')
  await page.keyboard.press('Backspace')
  await expect(crumbs).not.toContainText('Currency')
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON')
  expect(await focused()).toMatch(/^Currency/)

  // Down from the filter box lands in this list, not elsewhere in the window.
  await page.getByPlaceholder('Filter groups').focus()
  await page.keyboard.press('ArrowDown')
  expect(await focused()).toMatch(/^Currency/)
})

test('rule list: an up row heads every folder, and the mouse back and forward buttons retrace folders', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  const crumbs = page.getByRole('navigation', { name: /Where you are/ })
  const up = page.locator('[data-up]')
  const side = (button: number) => crumbs.dispatchEvent('mouseup', { button, bubbles: true })
  const upIsFirst = () => up.evaluate(el => el.parentElement?.firstElementChild === el)

  // It opens inside Currency with no steps taken: back still goes up, a folder at a time.
  await expect(crumbs).toContainText('Currency')
  await side(3)
  await side(3)
  await expect(page.getByRole('button', { name: /^Uniques/ }).first()).toBeVisible()
  // The top has nothing above it.
  await expect(up).toHaveCount(0)

  await page.getByRole('button', { name: /^Currency/ }).first().click()
  await expect(up).toHaveText('Back to All')
  expect(await upIsFirst()).toBe(true)
  await page.getByRole('button', { name: /^League/ }).click()
  await expect(crumbs).toContainText('League')
  await expect(up).toHaveText('Back to Currency')
  await overlay.snap('rule list up row')
  expect(await upIsFirst()).toBe(true)
  await page.getByRole('button', { name: 'Back to Currency' }).click()
  await expect(crumbs).not.toContainText('League')
  await expect(crumbs).toContainText('Currency')

  // Back retraces your steps: the up row came from League, so back returns there.
  await side(3)
  await expect(crumbs).toContainText('League')
  await side(3)
  await expect(crumbs).not.toContainText('League')
  await side(4)
  await expect(crumbs).toContainText('League')
  await side(3)
  await side(3)
  await expect(page.getByRole('button', { name: /^Uniques/ }).first()).toBeVisible()

  // A search on show is the page you're on: back closes it.
  await page.getByPlaceholder('Filter groups').fill('fossil')
  await expect(page.getByRole('button', { name: /Fossil/ }).first()).toBeVisible()
  await page.getByRole('button', { name: /Fossil/ }).first().dispatchEvent('mouseup', { button: 3, bubbles: true })
  await expect(page.getByPlaceholder('Filter groups')).toHaveValue('')
  await expect(page.getByRole('button', { name: /^Uniques/ }).first()).toBeVisible()
})

test('pasting a copied item into the search box opens its rule card', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Rules' }).click()
  const box = page.getByPlaceholder(/paste one/)
  await box.evaluate((el, text) => {
    const data = new DataTransfer()
    data.setData('text', text)
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, fs.readFileSync(path.join(FIXTURES, 'items', 'currency-divine.txt'), 'utf8'))
  await expect(page.getByText('Filter rule for this item')).toBeVisible()
})

test('search: any item, drawn by the filter; on Preview it lands on the ground, elsewhere it opens its rule', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: 'Preview' }).click()
  const box = page.getByPlaceholder('Find any item, or paste one')
  const options = page.getByRole('listbox').getByRole('option')
  // A unique no rule names: it still comes up, under its own name.
  await box.fill('headhunt')
  await expect(options.filter({ hasText: /^Leather BeltHeadhunter ·/ })).toBeVisible()
  // Gear gets a rarity switch.
  await box.fill('vaal regalia')
  await expect(options.first()).toContainText('Rare ·')
  await page.getByRole('listbox').getByText('Normal', { exact: true }).click()
  await expect(options.first()).toContainText('Normal ·')

  // On Preview, a pick drops on the ground with the pile, marked, and stays through a reroll.
  await box.fill('divine orb')
  await expect(options.first()).toContainText(/currency/i)
  await box.press('Enter')
  await expect(box).toHaveValue('')
  const chip = page.getByTitle('Take Divine Orb off the ground')
  await expect(chip).toBeVisible()
  await expect(page.getByText(/\d+ of 41 shown/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Reroll' }).click()
  await expect(page.getByText(/\d+ of 41 shown/).first()).toBeVisible()
  await page.waitForTimeout(800)
  await overlay.snap('item search on the preview ground')
  await chip.click()
  await expect(page.getByText(/\d+ of 40 shown/).first()).toBeVisible()

  // Elsewhere, a pick opens its rule.
  await page.getByRole('tab', { name: 'Presets' }).click()
  await box.fill('divine orb')
  await box.press('Enter')
  await expect(page.getByRole('tab', { name: 'Rules' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-back-link]')).toHaveText('Presets')
  await expect(box).toHaveValue('')
})

test('Alt + F: a card alone for the hovered item, a key hides it', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/currency-divine.txt', 'Alt + F')
  const page = overlay.page
  await expect(page.getByText('Filter rule for this item')).toBeVisible()
  // The card shows alone: no editor tabs, no other windows.
  await expect(page.getByRole('tab', { name: 'Rules' })).toHaveCount(0)
  await overlay.snap('alt f card')
  const out = path.join(folder, 'NeverSink (woke).filter')

  // Hide it with the card's key; the file gets an own rule for that base.
  await page.getByRole('toolbar', { name: 'Quick fixes' }).getByRole('button', { name: /Hide/ }).click()
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toMatch(/Hide # \$type->woke->own [^\n]*\n(\t[^\n]*\n)*\tBaseType == "Divine Orb"/)
})

test('Alt + F: Whole tier lists its items, picked ones move together, and the look rows switch on and off', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/currency-divine.txt', 'Alt + F')
  const page = overlay.page
  await expect(page.getByText('Filter rule for this item')).toBeVisible()

  await page.getByRole('button', { name: /^Whole tier/ }).click()
  await expect(page.getByText('Items in this tier · 2')).toBeVisible()
  await page.getByText('Mirror of Kalandra', { exact: true }).click()
  await expect(page.getByText('1 picked')).toBeVisible()
  await overlay.snap('alt f whole tier items')
  await page.getByRole('toolbar', { name: 'Picked items' }).getByRole('button', { name: 'Move to' }).click()
  await page.getByRole('menuitem').first().click()
  await expect(page.getByText(/^Moved Mirror of Kalandra to /)).toBeVisible()
  await expect(page.getByText('Items in this tier · 1')).toBeVisible()

  // The beam switch turns it off and back on to what it was.
  const beam = page.getByRole('switch', { name: 'Beam' })
  await expect(beam).toHaveAttribute('aria-checked', 'true')
  await beam.click()
  await expect(beam).toHaveAttribute('aria-checked', 'false')
  await beam.click()
  await expect(beam).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: /^Beam.*Red/ })).toBeVisible()
  // A sound off with nothing before it comes on with a plain default.
  const sound = page.getByRole('switch', { name: 'Sound' })
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: /^Save/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  // Mirror moved; Divine stays with its beam and sound as they were.
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toMatch(/\$tier->t1exalted[^\n]*\n(\t[^\n]*\n)*\tBaseType == "Divine Orb"\r?\n/)
  const text = fs.readFileSync(out, 'utf8')
  expect(text).toMatch(/\$tier->t2divine[^\n]*\n(\t[^\n]*\n)*\tBaseType == [^\n]*"Mirror of Kalandra"/)
  expect(text).toMatch(/\$tier->t1exalted[^\n]*\n(\t[^\n]*\n)*\tPlayAlertSound 6 300\r?\n\tPlayEffect Red\r?\n/)
})

test('Alt + F on a unique: a verdict line, plain value tiers, special rules folded', async ({ overlay, fakeApp }) => {
  // NeverSink's real Strict filter.
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), safetyNet: { on: false, minChaos: 20 } }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/unique-three-step-assault.txt', 'Alt + F')
  const page = overlay.page
  await expect(page.getByText('Filter rule for this item')).toBeVisible()
  await expect(page.getByText('✓ Shows', { exact: true })).toBeVisible()
  await expect(page.getByText('NeverSink: All uniques › Low, hidden from Very strict up.')).toBeVisible()
  await expect(page.getByText('Value tier')).toBeVisible()
  for (const word of ['Top', 'High', 'Mid', 'Low']) await expect(page.getByRole('button', { name: new RegExp(`^${word}`) })).toBeVisible()
  // NeverSink's own tier names stay out of sight until asked for.
  await expect(page.getByText('Exuberimpresence')).toHaveCount(0)
  await page.getByRole('button', { name: /^Special rules/ }).click()
  await expect(page.getByRole('button', { name: /^Shaper and Elder/ })).toBeVisible()
  await page.getByRole('button', { name: /^By strictness/ }).click()
  await expect(page.locator('table').getByText('U+')).toBeVisible()
  await overlay.snap('alt f unique card')
})

test('Alt + F on a unique off the value ladder: its own tier leads, keys 2 and 3 step aside', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), safetyNet: { on: false, minChaos: 20 } }] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/unique-prismweave.txt', 'Alt + F')
  const page = overlay.page
  await expect(page.getByText('NeverSink: All uniques › Early league, hidden from Uber plus up.')).toBeVisible()
  await expect(page.getByText('Early leaguenot a value tier')).toBeVisible()
  await expect(page.getByText('Pick a tier below to move it there.')).toBeVisible()
  const keys = page.getByRole('toolbar', { name: 'Quick fixes' })
  await expect(keys.getByRole('button', { name: /Lower/ })).toBeDisabled()
  await expect(keys.getByRole('button', { name: /Raise/ })).toBeDisabled()
  await overlay.snap('alt f off-ladder card')
})

// Kingmaker comes from a vendor recipe, so the filter's prices skip it: make
// Debeon's Dirge the valuable Despot Axe unique and Kingmaker the trash one.
async function despotAxeWorthIt (overlay: Overlay) {
  const body = fs.readFileSync(path.join(FIXTURES, 'http/poe.ninja/poe1/api/economy/current/dense/overviews.json'), 'utf8')
    .replace(`"name":"Kingmaker","chaos":91,`, `"name":"Kingmaker","chaos":1,`)
    .replace(`"name":"Debeon's Dirge","chaos":1,`, `"name":"Debeon's Dirge","chaos":91,`)
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({ contentType: 'application/json', body }))
}

test('prices: a hidden valuable unique lists what else would show, and Show it does what it says', async ({ overlay, fakeApp }) => {
  // A long walk through the editor: under full-suite load it can outlast the default.
  test.slow()
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), [
    '# NeverSink test',
    'Hide # $type->uniques $tier->hideable',
    '\tRarity Unique',
    '\tBaseType == "Despot Axe"',
    '',
    'Show # $type->uniques $tier->t1',
    '\tRarity Unique',
    '\tBaseType == "Headhunter Belt"',
    ''
  ].join('\r\n'))
  // Reload wherever you are, so a save that typed /itemfilter would show in chat.
  await despotAxeWorthIt(overlay)
  await overlay.boot({ widgets: [{ ...lootFilter(folder), reloadWhenSafe: false }] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Prices/ }).click()
  await page.getByRole('button', { name: /Despot Axe/ }).click()
  await expect(page.getByText('"Show it" will')).toBeVisible()
  await expect(page.getByText('Kingmaker').first()).toBeVisible()
  await expect(page.getByText("Debeon's Dirge").first()).toBeVisible()
  await expect(page.getByText('1 trash')).toBeVisible()
  await expect(page.getByText(/every unique Despot Axe shows/)).toBeVisible()
  await overlay.snap('prices tab, a hidden item opened')

  // The way into its rule, and back.
  await page.getByRole('button', { name: 'Open the rule' }).click()
  await expect(page.getByRole('tab', { name: 'Rules' })).toHaveAttribute('aria-selected', 'true')
  const back = page.locator('[data-back-link]')
  await expect(back).toHaveText(/^Prices/)
  await back.click()
  await expect(page.getByRole('tab', { name: /^Prices/ })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('button', { name: /Despot Axe/ }).click()
  await page.getByRole('button', { name: 'Show it', exact: true }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toMatch(/Show # \$type->woke->own [^\n]*\n(\t[^\n]*\n)*\tBaseType == "Despot Axe"/)

  // It acts in place: the row stays, done, with Undo, and nothing is typed in
  // chat (that would hand focus to the game and close the window).
  const out = () => fs.readFileSync(path.join(folder, 'NeverSink (woke).filter'), 'utf8')
  await expect(page.getByText('shows now')).toBeVisible()
  await expect(page.getByRole('tab', { name: /^Prices/ })).toHaveAttribute('aria-selected', 'true')
  expect(fakeApp.game.chat).toEqual([])
  await overlay.snap('prices tab, Show it done in place')
  await page.getByRole('button', { name: 'Undo for Despot Axe' }).click()
  await expect.poll(out).not.toMatch(/Show # \$type->woke->own [^\n]*\n(\t[^\n]*\n)*\tBaseType == "Despot Axe"/)

  // Undo opens it again; Not for me also stays in place.
  await page.getByRole('button', { name: 'Not for me' }).click()
  await expect(page.getByText('stays hidden till its price doubles')).toBeVisible()
  await page.getByRole('button', { name: 'Undo for Despot Axe' }).click()
  await expect(page.getByRole('button', { name: 'Not for me' })).toBeVisible()
  expect(fakeApp.game.chat).toEqual([])
})

// A notice to find on the dock card, whatever the prices say: a change whose
// rule the filter doesn't have.
const ORPHAN_EDIT = [{ kind: 'visibility', type: 'no-such-group', tier: 't1', visibility: 'Hide', id: 1 }]

test('dock card: its button goes straight to the notice\'s tab, without the overlay key', async ({ overlay, fakeApp }) => {
  test.slow()
  await overlay.boot({ widgets: [{ ...lootFilter(filterFolder()), edits: ORPHAN_EDIT }] })
  const page = overlay.page
  fakeApp.focusGame(true)
  const review = page.getByRole('button', { name: 'Fix it' })
  await expect(async () => {
    await overlay.moveMouse(1000, 900)
    await overlay.hoverDockIcon('loot-filter')
    await expect(review).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 30_000 })
  await overlay.snap('loot filter card with its button')
  const box = (await review.boundingBox())!
  await overlay.moveMouse(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2))
  await review.click()
  await expect(page.getByRole('tab', { name: /^Changes/ })).toHaveAttribute('aria-selected', 'true', { timeout: 5000 })
  await expect.poll(() => fakeApp.game.focused).toBe(false)
  await expect(review).toHaveCount(0)
  fakeApp.focusGame(true) // Tests in a file share the fake game.
})

test('dock icon: a click goes straight to the first notice\'s tab', async ({ overlay, fakeApp }) => {
  test.slow()
  await overlay.boot({ widgets: [{ ...lootFilter(filterFolder()), edits: ORPHAN_EDIT }] })
  const page = overlay.page
  fakeApp.focusGame(true)
  await expect(async () => {
    await overlay.moveMouse(1000, 900)
    await overlay.hoverDockIcon('loot-filter')
    await expect(page.getByRole('button', { name: 'Fix it' })).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 30_000 })
  await overlay.moveMouse(1000, 900)
  await overlay.restAndClickDockIcon('loot-filter')
  await expect(page.getByRole('tab', { name: /^Changes/ })).toHaveAttribute('aria-selected', 'true', { timeout: 5000 })
  await expect.poll(() => fakeApp.game.focused).toBe(false)
  fakeApp.focusGame(true) // Tests in a file share the fake game.
})

test('dock card: click or scroll a strictness, then reload from there', async ({ overlay, fakeApp }) => {
  test.slow()
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.copyFileSync(path.join(FIXTURES, 'filters', 'neversink-sample.filter'), path.join(folder, 'NeverSink.filter'))
  const cache = path.join(fakeApp.opts.userData, 'woke', 'neversink', '8.20.1', 'DEFAULT')
  fs.mkdirSync(cache, { recursive: true })
  const LEVELS = ['0-SOFT', '1-REGULAR', '2-SEMI-STRICT', '3-STRICT', '4-VERY-STRICT', '5-UBER-STRICT', '6-UBER-PLUS-STRICT']
  for (const l of LEVELS) fs.writeFileSync(path.join(cache, `${l}.filter`), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', `${l}.filter.gz`))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), wmFlags: ['invisible-on-blur'], neversink: { on: true, version: '8.20.1', prevVersion: null, style: '', level: 2, latest: null, latestChanges: '', checkedAt: Date.now() } }] })
  const page = overlay.page
  fakeApp.focusGame(true)
  const level = (name: string) => page.getByRole('button', { name, exact: true })
  // The game starts on another filter (a note), so the icon is up while you play;
  // the end of this test shows it going once that's settled. With the overlay
  // open it's there for the picker, never with the strictness on it.
  await overlay.pressHotkey(overlay.config.overlayKey)
  await expect(overlay.dockIcon('loot-filter')).toBeVisible({ timeout: 20_000 })
  await expect(overlay.dockIcon('loot-filter')).not.toContainText('SS')
  await expect(async () => {
    await overlay.moveMouse(1000, 900)
    await overlay.hoverDockIcon('loot-filter')
    await expect(level('Strict')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  const out = path.join(folder, 'NeverSink (woke).filter')
  const saved = () => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''

  // Each map band of auto's ladder sits under the strictness it picks.
  for (const [band, name] of [['Acts', 'Regular'], ['T11-T15', 'Strict'], ['T16+', 'Very strict']]) {
    const b = (await page.getByText(band, { exact: true }).last().boundingBox())!
    const l = (await level(name).boundingBox())!
    expect(Math.abs((b.x + b.width / 2) - (l.x + l.width / 2))).toBeLessThan(3)
  }

  // A click saves, pauses auto and leaves the reload to you.
  await level('Strict').click()
  await expect(level('Strict')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('auto paused')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload now' }).last()).toBeVisible()
  await expect.poll(() => /STRICT/i.test(saved())).toBe(true)
  await overlay.snap('dock card with a level picked')
  expect(fakeApp.game.chat).toEqual([])

  // Scrolling steps at once and saves once, when it stops.
  const before = fs.statSync(out).mtimeMs
  await level('Strict').hover()
  await page.mouse.wheel(0, 100)
  await expect(level('Very strict')).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(100)
  await page.mouse.wheel(0, 100)
  await expect(level('Uber strict')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => fs.statSync(out).mtimeMs, { timeout: 5000 }).toBeGreaterThan(before)
  expect(fakeApp.game.chat).toEqual([])

  await page.getByRole('button', { name: 'Reload now' }).last().click()
  await expect.poll(() => fakeApp.game.chat).toEqual(['/itemfilter NeverSink (woke)'])

  await page.getByRole('button', { name: 'Back to auto' }).click()
  await expect(page.getByRole('button', { name: 'Back to auto' })).toHaveCount(0)

  // Reloaded, back in the game: no Reload left, and never the strictness. (The
  // icon may stay for a note, such as the fake league having no prices.)
  await overlay.moveMouse(1000, 900)
  fakeApp.focusGame(true)
  await expect(overlay.dockIcon('loot-filter').filter({ hasText: 'Reload' })).toHaveCount(0, { timeout: 10_000 })
  await expect(overlay.dockIcon('loot-filter')).not.toContainText('U')
})

test('stack sizes: type a number or drag a line, the bar follows and the file changes', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByPlaceholder('Filter groups').fill('harvest')
  await page.getByRole('button', { name: /Harvest/ }).first().click()
  const scale = page.getByRole('group', { name: 'Stack sizes' })
  await expect(scale.getByRole('slider')).toHaveCount(5)
  await overlay.snap('harvest stack scale')

  // Typing redraws the bar as you go, and takes no click on the row.
  const field = page.getByRole('spinbutton', { name: /Stack size for/ }).first()
  await expect(field).toHaveValue('4000')
  await field.fill('3000')
  await expect(scale.getByRole('slider').first()).toHaveAttribute('aria-valuenow', '3000')
  await field.blur()

  // Esc takes back what you typed. Back to NeverSink's number is no change at all.
  await field.fill('3500')
  await field.press('Escape')
  await expect(field).toHaveValue('3000')
  await expect(scale.getByRole('slider').first()).toHaveAttribute('aria-valuenow', '3000')
  await field.fill('4000')
  await field.blur()
  await expect(page.getByRole('tab', { name: /^Changes/ })).toContainText('0')
  await field.fill('3000')
  await field.blur()
  await expect(page.getByRole('tab', { name: /^Changes/ })).toContainText('1')

  // Dragging stops at its neighbour, and the number follows.
  const line = scale.getByRole('slider').first()
  const box = (await line.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 600, box.y + 4, { steps: 4 })
  await page.mouse.up()
  await expect(field).toHaveValue('501')

  // The Changes tab says what happened.
  await page.getByRole('tab', { name: /^Changes/ }).click()
  await expect(page.getByText(/stacks of 501 or more/).first()).toBeVisible()

  // Gold's piles get the same bar.
  await page.getByRole('tab', { name: 'Rules' }).click()
  await page.getByPlaceholder('Filter groups').fill('gold')
  await page.getByRole('button', { name: /^Gold/ }).first().click()
  await expect(scale.getByRole('slider')).toHaveCount(4)
  await overlay.snap('gold stack scale')

  await page.getByRole('button', { name: /Save \+ reload/ }).click()
  await expect.poll(() => fs.existsSync(path.join(folder, 'NeverSink (woke).filter'))).toBe(true)
  await expect.poll(() => fs.readFileSync(path.join(folder, 'NeverSink (woke).filter'), 'utf8')).toContain('StackSize >= 501')
  // Let the reload finish here, not in the next test.
  await expect.poll(() => fakeApp.game.chat).toEqual(['/itemfilter NeverSink (woke)'])
})

test('a short panel scrolls its columns: nothing runs under the footer', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  const field = page.getByPlaceholder(/add an item/i).first()
  await expect(field).toBeAttached()
  const save = page.getByRole('button', { name: /Save \+ reload/ })
  for (const height of [320, 450, 560]) {
    await field.evaluate((el, h) => { const p = el.closest('.w-surface') as HTMLElement; p.style.height = `${h}px`; p.style.maxHeight = `${h}px` }, height)
    await field.scrollIntoViewIfNeeded()
    const box = (await field.boundingBox())!
    const footer = (await save.boundingBox())!
    expect(box.y + box.height, `height ${height}`).toBeLessThanOrEqual(footer.y)
    const onTop = await field.evaluate((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.right - 6, r.top + r.height / 2) === el })
    expect(onTop, `height ${height}`).toBe(true)
  }

})

test('a save nobody asked to reload waits on the dock icon, and one key sends it once', async ({ overlay, fakeApp }) => {
  test.slow()
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), [
    '# NeverSink test',
    'Hide # $type->uniques $tier->hideable',
    '\tRarity Unique',
    '\tBaseType == "Despot Axe"',
    ''
  ].join('\r\n'))
  await despotAxeWorthIt(overlay)
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Prices/ }).click()
  await page.getByRole('button', { name: /Despot Axe/ }).click()
  await page.getByRole('button', { name: 'Show it', exact: true }).click()
  await expect.poll(() => fs.existsSync(path.join(folder, 'NeverSink (woke).filter'))).toBe(true)
  expect(fakeApp.game.chat).toEqual([])

  // Back in the game: nothing has been typed, and the icon says what's waiting.
  fakeApp.focusGame(true)
  await expect(overlay.dockIcon('loot-filter')).toContainText('Reload')
  await expect(async () => {
    // Off and back on: the card opens on arriving, not on a mouse already there.
    await overlay.moveMouse(1000, 900)
    await overlay.hoverDockIcon('loot-filter')
    await expect(page.getByRole('button', { name: 'Reload now' }).last()).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  await expect(page.getByText('The game still uses your old filter.')).toBeVisible()
  await overlay.snap('reload waiting on the dock card')
  await overlay.moveMouse(1000, 900)
  await page.waitForTimeout(100)
  expect(fakeApp.game.chat).toEqual([])

  await overlay.pressHotkey('Alt + Shift + R')
  await expect.poll(() => fakeApp.game.chat).toEqual(['/itemfilter NeverSink (woke)'])
  await expect(overlay.dockIcon('loot-filter').filter({ hasText: 'Reload' })).toHaveCount(0)
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

  const backButton = page.locator('[data-back-link]', { hasText: 'Preview' })
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

test('ladder: maps read by tier, border rules are marks, a band changes all its tiers', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '6-UBER-PLUS-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByPlaceholder('Filter groups').fill('maps')
  await page.getByRole('button', { name: 'Maps Maps › Normal', exact: true }).click()
  await expect(page.getByText('Black border', { exact: true })).toBeVisible()
  await expect(page.getByText('Hidden below this line')).toBeVisible()
  await expect(page.getByText('T11–13', { exact: true })).toBeVisible()
  await overlay.snap('maps ladder')

  // A band row edits all its tiers at once; Shown flips them all.
  await page.getByText('T11–13', { exact: true }).click()
  await expect(page.getByText(/Changes here go to all 3 tiers/)).toBeVisible()
  await page.getByRole('button', { name: 'Hidden', exact: true }).nth(1).click()
  await expect(page.getByRole('tab', { name: /^Changes/ })).toContainText('3')
  await page.getByRole('button', { name: /Save \+ reload/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toMatch(/^Show[^\n]*\$tier->maps_b_t12/m)
  await expect.poll(() => fakeApp.game.chat).toEqual(['/itemfilter NeverSink (woke)'])
})

test('ladder: show from a tier in one pick, and Maps to hide are plain switches', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByPlaceholder('Filter groups').fill('maps')
  await page.getByRole('button', { name: 'Maps Maps › Normal', exact: true }).click()
  const pick = page.getByLabel('Lowest tier to show')
  await pick.selectOption({ label: 'T16+' })
  await expect(pick).toHaveValue('0')
  // Hiding every tier keeps the ladder (it doesn't turn into switches).
  await pick.selectOption({ label: 'Nothing (hide all)' })
  await expect(pick).toHaveValue('-1')
  await pick.selectOption({ label: 'T16+' })
  await expect(page.getByText('Hidden below this line')).toBeVisible()
  await overlay.snap('maps show from T16')

  await page.getByRole('button', { name: /^Maps to hide/ }).first().click()
  const corrupted = page.getByRole('switch', { name: 'Hide corrupted maps' }).first()
  await expect(corrupted).toHaveAttribute('aria-checked', 'false')
  await corrupted.click()
  await expect(corrupted).toHaveAttribute('aria-checked', 'true')
  await overlay.snap('maps to hide switches')

  await page.getByRole('button', { name: /Save \+ reload/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toMatch(/^Hide[^\n]*\$tier->corruptedmaphider/m)
  const text = fs.readFileSync(out, 'utf8')
  expect(text).toMatch(/^#Hide[^\n]*\$tier->mirroredmaphider/m)
  expect(text).toMatch(/^Show[^\n]*\$type->maps \$tier->maps_a_t16/m)
  expect(text).toMatch(/^Hide[^\n]*\$type->maps \$tier->maps_a_t15/m)
  await expect.poll(() => fakeApp.game.chat).toEqual(['/itemfilter NeverSink (woke)'])
})

test('Alt + F: Show this rule in the editor lands on its tier row', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/currency-divine.txt', 'Alt + F')
  const page = overlay.page
  await page.getByRole('button', { name: /^Rule:/ }).click()
  await page.getByRole('button', { name: 'Show this rule in the editor' }).click()
  await expect(page.getByRole('tab', { name: 'Rules' })).toBeVisible()
  const row = page.locator('[data-tiers~="t1exalted"]').first()
  await expect(row).toBeInViewport()
  await expect(page.getByText('Items in this tier', { exact: false }).first()).toBeVisible()
  await overlay.snap('alt f to editor tier')
})

test('a whole-class rule (tinctures) lists its bases, and one can be hidden on its own', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  // Regular: its item level 82+ tincture rule is on (Uber Plus Strict comments it out).
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByPlaceholder('Filter groups').fill('tinct')
  await page.getByRole('button', { name: /^Endgame tinctures/ }).first().click()
  await page.locator('[data-tiers~="tinc82"]').first().click()
  await expect(page.getByText(/Pick which ones · \d+/)).toBeVisible()
  const chip = page.getByRole('button', { name: /Tincture$/ }).first()
  const base = (await chip.innerText()).trim()
  await chip.click()
  await expect(page.getByText(`Hid ${base}`)).toBeVisible()
  await overlay.snap('tincture picker')
  await page.getByRole('button', { name: /Save \+ reload/ }).click()
  const out = path.join(folder, 'NeverSink (woke).filter')
  await expect.poll(() => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '').toMatch(new RegExp(`^Hide[^\n]*\n(\t[^\n]*\n)*\tBaseType == "${base}"`, 'm'))
  await expect.poll(() => fakeApp.game.chat).toEqual(['/itemfilter NeverSink (woke)'])
})

test('prices: Apply only stages the moves; Save + reload writes them once', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), reloadWhenSafe: false }] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Prices/ }).click()
  const retier = page.getByRole('switch', { name: /Re-tier from poe.ninja prices/ })
  if (await retier.getAttribute('aria-checked') !== 'true') await retier.click()
  const apply = page.getByRole('button', { name: /^Apply \d+$/ })
  await expect(apply).toBeVisible({ timeout: 20_000 })
  await overlay.snap('prices tab apply')
  await apply.click()
  await expect(page.getByText('Unsaved', { exact: true })).toBeVisible()
  await expect(page.getByText(/not saved yet/).first()).toBeVisible()
  const out = path.join(folder, 'NeverSink (woke).filter')
  expect(fs.existsSync(out)).toBe(false)
  await page.getByRole('button', { name: /Save \+ reload/ }).click()
  await expect.poll(() => fs.existsSync(out)).toBe(true)
  await expect(page.getByText('Unsaved', { exact: true })).toBeHidden()
  await expect.poll(() => fakeApp.game.chat).toEqual(['/itemfilter NeverSink (woke)'])
})

// A window made taller than a tab's usual height: the tab's list fills it, no
// blank band under it (Prices drew a few rows, then empty floor). A window
// never resized keeps a short tab short.
// The Build tab's list (a short tab, whatever build is active).
const buildGap = (page: Overlay['page']) => page.locator('[data-filter-build-tab]').evaluate(list => {
  const body = list.parentElement!
  return Math.round(body.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom)
})
const tabGap = (page: Overlay['page'], inTab: string) => page.getByText(inTab, { exact: true }).first().evaluate(el => {
  const list = el.closest('.w-scroll')!
  const body = list.parentElement!
  return Math.round(body.getBoundingClientRect().bottom - list.getBoundingClientRect().bottom)
})
test('prices: a taller window, the list fills it to the bottom', async ({ overlay, fakeApp }) => {
  // 700px fits any test screen and is well over a tab's own 36rem.
  await overlay.boot({ widgets: [{ ...lootFilter(filterFolder()), wokeSizes: { main: { h: 700 } } } as never] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Prices/ }).click()
  await expect(page.getByRole('switch', { name: /Re-tier from poe.ninja prices/ })).toBeVisible()
  await expect.poll(() => tabGap(page, 'Re-tier from poe.ninja prices')).toBeLessThan(4)
  await overlay.snap('prices tab in a tall window')
  await page.getByRole('tab', { name: /^Build/ }).click()
  await expect.poll(() => buildGap(page)).toBeLessThan(4)
})

test('a window never resized keeps a short tab short', async ({ overlay, fakeApp }) => {
  await overlay.boot({ widgets: [lootFilter(filterFolder())] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Build/ }).click()
  await expect(page.locator('[data-filter-build-tab]')).toBeVisible()
  // The build section, the same as on Loot › Levelling.
  await expect(page.locator('[data-filter-build-tab] [data-levelling-build]')).toBeVisible()
  expect(await buildGap(page)).toBeLessThan(4)
  const panel = (await page.locator('[data-w-panel]').filter({ has: page.locator('[data-filter-build-tab]') }).first().boundingBox())!
  expect(panel.height).toBeLessThan(500)
})

test('prices: kept items list under Not moved, unlock in bulk, and both steps undo', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), reloadWhenSafe: false }] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Prices/ }).click()
  const retier = page.getByRole('switch', { name: /Re-tier from poe.ninja prices/ })
  if (await retier.getAttribute('aria-checked') !== 'true') await retier.click()
  const apply = page.getByRole('button', { name: /^Apply \d+$/ })
  await expect(apply).toBeVisible({ timeout: 20_000 })
  const wouldMove = Number((await apply.innerText()).replace(/\D/g, ''))
  const keepAll = page.getByRole('button', { name: 'Keep all where they are' })
  const kept = page.getByRole('button', { name: /^kept by you · \d+$/ })
  // Undo sits in the bar once a step is recorded, and takes back Keep all.
  const undo = page.getByRole('button', { name: /Undo\s*Ctrl/ })
  await keepAll.click()
  await expect(kept).toBeVisible()
  await undo.click()
  await expect(apply).toBeVisible()
  await expect(kept).toBeHidden()
  await keepAll.click()
  await expect(apply).toBeHidden()
  // Every kept item is listed and filterable, not just the first page.
  await kept.click()
  await expect(page.getByText(/^\d+ of \d+ picked$/)).toBeVisible()
  await overlay.snap('prices tab, not moved filtered to kept')
  // A held-back row shows the item's tooltip on hover, like the rows above it.
  await page.getByRole('checkbox', { name: /^Pick (?!every)/ }).first().locator('xpath=..').hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Pick every item under Not moved' }).check()
  const unlock = page.getByRole('button', { name: /Unlock \d+/ })
  expect(Number((await unlock.innerText()).replace(/\D/g, ''))).toBeGreaterThanOrEqual(wouldMove)
  await unlock.click()
  await expect(apply).toBeVisible()
  await expect(kept).toBeHidden()
  // One step for the whole batch: its note's Undo locks them all again.
  const note = page.getByText(/^Prices can move/)
  await expect(note).toBeVisible()
  await note.locator('xpath=..').getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(apply).toBeHidden()
  await expect(kept).toBeVisible()
})

test('prices: a would-move row can go to any tier, not just the one its price says', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), reloadWhenSafe: false }] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Prices/ }).click()
  const retier = page.getByRole('switch', { name: /Re-tier from poe.ninja prices/ })
  if (await retier.getAttribute('aria-checked') !== 'true') await retier.click()
  const apply = page.getByRole('button', { name: /^Apply \d+$/ })
  await expect(apply).toBeVisible({ timeout: 20_000 })
  await page.getByRole('checkbox', { name: /^Move / }).first().locator('xpath=..').click({ button: 'right' })
  await expect(page.getByText(/Move to Tier \d+ · price says/)).toBeVisible()
  await overlay.snap('prices row move to menu')
  const other = page.getByText(/^Move to Tier \d+$/).first()
  const label = (await other.innerText()).trim()
  await other.click()
  await expect(page.getByText(new RegExp(`^Moved .+ to ${label.replace('Move to ', '')}`))).toBeVisible()
  // Your own move: prices leave it there, under Not moved as kept by you.
  await expect(apply).toBeHidden()
  await expect(page.getByRole('button', { name: /^kept by you · 1$/ })).toBeVisible()
})

// The price check's filter chip: its Fix menu goes to the rule or changes it
// there, never in one click; an item the filter shows gets just an icon.
function kaomFilter (hidden: boolean) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), [
    '# NeverSink test',
    'Show # $type->currency $tier->t1',
    '\tBaseType == "Chaos Orb"',
    '',
    `${hidden ? 'Hide' : 'Show'} # $type->uniques $tier->t3`,
    '\tRarity Unique',
    '\tBaseType == "Glorious Plate"',
    ''
  ].join('\r\n'))
  return folder
}
const ownRule = (base: string, vis: 'Show' | 'Hide') => new RegExp(`${vis} # \\$type->woke->own [^\\n]*\\n(\\t[^\\n]*\\n)*\\tBaseType == "${base}"`)

test('price check: a hidden item\'s Fix menu goes to its rule, or shows it', async ({ overlay, fakeApp }) => {
  test.slow()
  const folder = kaomFilter(true)
  await overlay.boot({ widgets: [{ ...lootFilter(folder), reloadWhenSafe: false }] })
  const page = overlay.page
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const pc = overlay.widget('price-check')
  const chip = pc.getByText('Your filter hides this')
  await expect(chip).toBeVisible()

  // Hover: says which rule hides it, and nothing is changed by looking.
  const pill = pc.locator('[title^="Hidden by"]')
  await expect(pill).toHaveAttribute('title', 'Hidden by All uniques › Tier 3.')
  await pill.hover()
  const fix = pc.getByRole('button', { name: /^Fix/ })
  await expect(fix).toHaveAttribute('title', 'Go to its rule, or change it here')
  await fix.hover()
  await overlay.snap('filter chip, hidden item')

  // Clicking Fix only opens the menu: the filter is untouched.
  await fix.click()
  await expect(page.getByRole('menuitem', { name: 'Show it' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Go to rule' })).toBeVisible()
  await overlay.snap('filter chip, Fix menu')
  expect(fs.existsSync(path.join(folder, 'NeverSink (woke).filter'))).toBe(false)

  // Go to rule: the editor, on that rule.
  await page.getByRole('menuitem', { name: 'Go to rule' }).click()
  const editor = overlay.widget('woke-loot-filter')
  await expect(editor.getByRole('tab', { name: 'Rules' })).toHaveAttribute('aria-selected', 'true')
  // On that rule, not the first one in the file.
  await expect(editor.getByText('All uniques').first()).toBeVisible()
  await expect(editor.getByText('Item: Glorious Plate').first()).toBeVisible()
  await overlay.snap('filter chip, Go to rule opened the editor')

  // Show it, from the menu, writes the filter.
  // Back to the game.
  fakeApp.focusGame(true)
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  await expect(chip).toBeVisible()
  await pc.getByRole('button', { name: /^Fix/ }).click()
  await page.getByRole('menuitem', { name: 'Show it' }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toMatch(ownRule('Glorious Plate', 'Show'))
})

test('price check: an item the filter shows gets a quiet icon that can hide it', async ({ overlay }) => {
  test.slow()
  const folder = kaomFilter(false)
  await overlay.boot({ widgets: [{ ...lootFilter(folder), reloadWhenSafe: false }] })
  const page = overlay.page
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const pc = overlay.widget('price-check')
  const icon = pc.getByRole('button', { name: 'Loot filter: go to rule or hide it' })
  await expect(icon).toBeVisible()
  await expect(pc.getByText('Your filter hides this')).toHaveCount(0)
  await expect(icon).toHaveAttribute('title', /^Your filter shows this: /)
  await icon.hover()
  await icon.click()
  await expect(page.getByRole('menuitem', { name: 'Go to rule' })).toBeVisible()
  await overlay.snap('filter icon, shown item menu')
  expect(fs.existsSync(path.join(folder, 'NeverSink (woke).filter'))).toBe(false)
  // A unique: it says it hides every unique on that base.
  await page.getByRole('menuitem', { name: 'Hide every unique Glorious Plate' }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toMatch(ownRule('Glorious Plate', 'Hide'))
})

test('price check: a unique\'s side list shows its drop tier and filter tier in the label\'s look, and opens to its rule', async ({ overlay }) => {
  test.slow()
  const folder = kaomFilter(false)
  await overlay.boot({ widgets: [{ ...lootFilter(folder), reloadWhenSafe: false }] })
  await overlay.copyItem('items/unique-kaoms-heart.txt')
  const pc = overlay.widget('price-check')
  const head = pc.locator('[data-unique-tier-head]')
  await expect(head).toBeVisible()
  await expect(head).toContainText('Tier')
  await expect(head.locator('[data-drop-tier]')).toHaveText('T2')
  await expect(head.locator('[data-filter-tier-chip]')).toContainText('T3')
  if (await head.getAttribute('aria-expanded') !== 'true') await head.click()
  const body = pc.locator('[data-unique-tier]')
  await expect(body.locator('[data-drop-tier-note]')).toContainText('Very rare drop')
  await expect(body).toContainText('Tier 3')
  await expect(body).toContainText('by base')
  await expect(body.getByRole('button', { name: 'Go to rule ›' })).toBeVisible()
  await overlay.snap('unique filter tier, open')
  // A click folds it.
  await head.click()
  await expect(body).toHaveCount(0)
})

test('profiles: copy the filter as a named profile that saves to its own file, and switch back', async ({ overlay, fakeApp }) => {
  const folder = filterFolder()
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  const first = page.getByRole('tab', { name: 'Profile NeverSink', exact: true })
  await expect(first).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 })
  await page.getByRole('button', { name: 'New profile' }).click()
  await expect(page.getByText('Copy of “NeverSink”')).toBeVisible()
  // The menu fades in.
  await page.waitForTimeout(600)
  await overlay.snap('new profile menu')
  await page.getByText('Copy of “NeverSink”').click()
  const name = page.getByLabel('Name of the new profile')
  await name.fill('Bossing')
  await overlay.snap('naming a new profile')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const boss = page.getByRole('tab', { name: 'Profile Bossing', exact: true })
  await expect(boss).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 })
  await expect.poll(() => fs.existsSync(path.join(folder, 'Bossing (woke).filter')), { timeout: 20_000 }).toBe(true)
  await overlay.snap('switched to Bossing')
  await boss.click({ button: 'right' })
  await expect(page.getByText('Rename', { exact: true })).toBeVisible()
  await page.waitForTimeout(600)
  await overlay.snap('profile tab menu')
  await page.keyboard.press('Escape')
  await first.click()
  await expect(first).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 })
  await expect.poll(() => fs.existsSync(path.join(folder, 'NeverSink (woke).filter')), { timeout: 20_000 }).toBe(true)
})

test('Base ranks: drag a base, then the picked set, onto another column', async ({ overlay, fakeApp }) => {
  // A real NeverSink file: the sample has no gear ranks.
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters', 'neversink', '1-REGULAR.filter.gz'))))
  await overlay.boot({ widgets: [lootFilter(folder)] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  // Base ranks is a section of the Equipment tab.
  await page.getByRole('tab', { name: /^Equipment/ }).click()
  await page.locator('[data-equip-class="ranks"]').click()
  const lane = (key: string) => page.locator(`[data-lane="${key}"]`)
  const cards = (key: string) => lane(key).locator('button[draggable="true"]')
  const nameOf = async (key: string, i: number) => (await cards(key).nth(i).getAttribute('aria-label'))!.split(' · ')[0]
  const card = (key: string, name: string) => lane(key).getByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ·`) })

  // One card, no pick: Unranked to Rank 1.
  const one = await nameOf('none', 0)
  await cards('none').first().dragTo(lane('r1'), { targetPosition: { x: 40, y: 12 } })
  await expect(card('r1', one)).toBeVisible()
  await expect(card('none', one)).toHaveCount(0)

  // Two picked: dragging either moves both to Never.
  const a = await nameOf('r2', 0)
  const b = await nameOf('r2', 1)
  await cards('r2').nth(0).click()
  await cards('r2').nth(1).click()
  await expect(page.getByText('2 picked')).toBeVisible()
  await overlay.snap('two bases picked, ready to drag')
  // By hand, to see the columns light up mid-drag.
  await cards('r2').nth(1).hover()
  await page.mouse.down()
  const to = (await lane('never').boundingBox())!
  await page.mouse.move(to.x + 40, to.y + 12, { steps: 8 })
  await page.mouse.move(to.x + 44, to.y + 14)
  await expect(lane('never')).toHaveClass(/laneOver/)
  await overlay.snap('dragging two bases over Never')
  await page.mouse.up()
  for (const n of [a, b]) await expect(card('never', n)).toBeVisible()
  await expect(page.getByText('2 picked')).toHaveCount(0)
  await overlay.snap('dragged to Never')

  // A family folds into one row: drag it to move every base in it, open it to
  // move one.
  const talismans = lane('exotichi').locator('[data-family="talisman"]')
  await expect(talismans).toBeVisible()
  await talismans.click()
  await expect(talismans).toHaveAttribute('aria-expanded', 'true')
  await overlay.snap('talismans opened in Exotic, valuable')
  await talismans.dragTo(lane('exotic'), { targetPosition: { x: 40, y: 12 } })
  await expect(lane('exotic').locator('[data-family="talisman"]')).toBeVisible()
  await expect(lane('exotichi').locator('[data-family="talisman"]')).toHaveCount(0)
  await overlay.snap('talismans moved to Exotic')
})

test('Currency weights: Alt + F on currency shows its step first, a Shows switch, the step ruler and a Price bias', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), presets: { currency: { on: true } } }] })
  const page = overlay.page
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/currency-chaos.txt', 'Alt + F')
  const card = page.locator('[data-currency-card]')
  await expect(card).toBeVisible()
  await expect(page.locator('[data-currency-card-cat]')).toContainText('Orbs')
  // No old tier picker under it: the Loot steps are shared by every section,
  // so it named the item's tier after another one (Guy: "S3 Corpses").
  await expect(page.getByText('Pick a tier below to move it there.')).toHaveCount(0)
  await expect(page.getByText('By strictness')).toHaveCount(0)
  // The ruler names all five steps.
  for (const n of ['Small', 'Normal', 'Decent', 'Big', 'Tink']) await expect(card.locator('[data-currency-card-ruler]')).toContainText(n)
  await overlay.snap('currency card')
  // One Price bias (Guy's F1): this item's by default, in %; it applies on
  // release, and the Steps from line turns This item gold.
  await page.locator('[data-currency-card-mult] [data-bias-range]').fill('150')
  await expect(card.locator('[data-currency-card-item]')).toContainText('150%')
  // Its own bias makes This item Custom (Guy 2026-11-28).
  await expect(card.locator('[data-currency-card-item]')).toContainText('Custom')
  // The dropdown moves the whole section's bias instead.
  await card.locator('[data-currency-card-bias-of]').selectOption('sec')
  await page.locator('[data-currency-card-sec-bias] [data-bias-num]').fill('80')
  await page.locator('[data-currency-card-sec-bias] [data-bias-num]').press('Enter')
  await expect(card.locator('[data-currency-card-section]')).toContainText('80%')
  // The Shows switch hides every pile.
  await card.locator('[data-currency-card-shows]').click()
  await expect(page.locator('[data-currency-card-now]')).toContainText('Hidden')
  await overlay.snap('currency card, off')
  // The whole section from the same card (Guy: Alt+F sets the section or just the item).
  await card.locator('[data-currency-card-shows]').click()
  await card.locator('[data-currency-card-section]').getByRole('button', { name: /^Orbs:/ }).click()
  await page.getByRole('menuitemradio', { name: /^Hide/ }).click()
  // Its bias is on the card's one slider now, so the menu closes on a pick.
  await expect(page.locator('[data-state-chip-menu]')).toHaveCount(0)
  await expect(page.locator('[data-currency-card-now]')).toContainText('Orbs is set to Hide')
  await card.locator('[data-currency-card-item]').getByRole('button', { name: /^Chaos Orb:/ }).click()
  await page.getByRole('menuitemradio', { name: /^Always/ }).click()
  await expect(page.locator('[data-currency-card-now]')).not.toContainText('Hidden')
  await overlay.snap('currency card, section off, item always')
})

test('Currency weights: Go to rule on an Alt + F card opens that item on its own Loot page', async ({ overlay, fakeApp }) => {
  test.slow()
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), presets: { currency: { on: true } } }] })
  const page = overlay.page
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  // Guy 2026-11-28: a gem opened the Currency page (the Loot tab loads late
  // and its focus was already gone). Currency last: it's the page it opens on anyway.
  for (const [file, cls] of [['items/gem-transfigured.txt', 'gems'], ['items/card-the-doctor.txt', 'cards'], ['items/essence-deafening-misery.txt', 'currency']]) {
    // Back in the game: Alt + F works there, not in the editor.
    fakeApp.focusGame(true)
    await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 10_000 }).toContain('Alt+F')
    await overlay.copyItem(file, 'Alt + F')
    await expect(page.locator('[data-currency-card], [data-currency-card-place]')).toBeVisible()
    // A priced item has its row; a section's own rule (Transfigured gems: Always) only its page.
    const name = await page.locator('[data-currency-card]').getAttribute('data-currency-card', { timeout: 500 }).catch(() => null)
    await page.getByRole('button', { name: 'Go to rule ›' }).click()
    await expect(page.locator(`[data-loot-class="${cls}"]`)).toHaveAttribute('aria-pressed', 'true')
    if (name) await expect(page.locator(`[data-currency-item="${name}"]`)).toBeInViewport()
    await overlay.snap(`go to rule, ${cls}`)
  }
})

test('Rare weights: Alt + F on an unidentified rare opens the Score card, and the redesigned tab', async ({ overlay, fakeApp }) => {
  // NeverSink's real Strict filter (its tiered gear and exotic lists).
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), presets: { weights: { on: true } } }] })
  const page = overlay.page
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/rare-unid-gloves.txt', 'Alt + F')
  await expect(page.getByText('Item score')).toBeVisible()
  await expect(page.getByText('Total')).toBeVisible()
  // The answer first, a ruler with the score's needle, one row of ranks, no NeverSink view.
  await expect(page.locator('[data-score-answer]')).toContainText(/Shows|Hidden/)
  await expect(page.locator('[data-score-ruler] [data-score-needle]')).toBeVisible()
  await expect(page.getByRole('button', { name: /NeverSink view/ })).toHaveCount(0)
  await overlay.snap('score card')
  // Hovering the label says what sets its border, background and text.
  await page.locator('[data-score-look]').hover()
  await expect(page.locator('[data-score-look-why]')).toContainText('Background')
  await overlay.snap('score card, why this look')
  // A row's ‹ › changes it for every rare, says so, and undoes.
  const tier = page.locator('[data-score-term="t4"]')
  await tier.hover()
  await tier.locator('[data-score-raise]').click()
  await expect(page.locator('[data-score-changed]')).toContainText('every rare')
  await overlay.snap('score card, a row raised')
  await page.locator('[data-score-changed]').getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('[data-score-changed]')).toHaveCount(0)
  // Clicking a row opens its whole section; raising a tier past the next pushes that one up too.
  await page.locator('[data-score-open="t4"]').click()
  const sec = page.locator('[data-score-section]')
  await expect(sec.locator('[data-score-section-row="t5"]')).toBeVisible()
  for (let i = 0; i < 3; i++) await sec.locator('[data-score-section-row="t4"]').getByRole('button', { name: /^Raise/ }).click()
  await expect(page.locator('[data-score-changed]')).toContainText('Tier 5')
  await overlay.snap('score card, drop tiers open')
  await page.locator('[data-score-changed]').getByRole('button', { name: 'Undo' }).click()
  await page.locator('[data-score-rank="rj"]').click()
  await expect(page.locator('[data-score-rank="rj"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-score-rank-reset]')).toBeVisible()
  await overlay.snap('score card, base set to Don\'t care')

  // Tune opens the Rare weights tab.
  await page.getByRole('button', { name: /Tune/ }).click()
  await expect(page.getByText(/\d+ of \d+ shown/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Line: / })).toBeVisible()
  // Dragging the line only previews; the setting changes on release.
  const line = page.getByRole('button', { name: /^Line: / })
  const before = await line.getAttribute('aria-label')
  const box = (await line.boundingBox())!
  // Grabbed by its label: a step's name can sit over the handle's foot.
  await page.mouse.move(box.x + box.width / 2, box.y + 6)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + 6, { steps: 5 })
  await page.mouse.up()
  await expect(line).not.toHaveAttribute('aria-label', before!)
  await expect(page.getByText('Your ranks')).toBeVisible()
  await page.waitForTimeout(800)
  await overlay.snap('rare weights tab')
  await page.getByRole('button', { name: /Looks/ }).click()
  await overlay.snap('rare weights tab, looks open')
  // Flasks score on the same line: base rank × quality × item level.
  await page.locator('[data-equip-class="flasks"]').click()
  const qs = page.locator('[data-equip-flask="Quicksilver Flask"]')
  await expect(qs).toBeVisible()
  await qs.getByRole('button', { name: /rank:/ }).click()
  await page.getByRole('menuitemradio', { name: /^Don't care/ }).click()
  await expect(qs.getByRole('button', { name: /rank: Don't care/ })).toBeVisible()
  // Flasks have their own line: a Good flask shows at item level 85.
  const ruby = page.locator('[data-equip-flask="Ruby Flask"]')
  await expect(ruby).toContainText('Small')
  await overlay.snap('equipment tab, flasks')
  // Tinctures: the same table, a row per tincture base, each with its icon.
  await page.locator('[data-equip-class="tinctures"]').click()
  const oak = page.locator('[data-equip-flask="Oakbranch Tincture"]')
  await expect(oak).toBeVisible()
  await expect(oak.getByRole('button', { name: /rank: Good/ })).toBeVisible()
  await overlay.snap('equipment tab, tinctures')
  // Base ranks is Equipment's section while Equipment shows; the top tab goes.
  await page.locator('[data-equip-class="ranks"]').click()
  await expect(page.locator('[data-equip-ranks] [data-lane="r1"]')).toBeVisible()
  await expect(page.getByRole('tab', { name: /Base ranks/ })).toHaveCount(0)
  await overlay.snap('equipment tab, base ranks')
  // Special gear (Guy's pick B): our own rules for veiled, temple and league
  // mods, variations, influenced gear and idols, each row at a fixed step.
  await page.locator('[data-equip-class="special"]').click()
  const veiled = page.locator('[data-currency-cat="sgveil"]')
  await expect(veiled).toBeVisible()
  await expect(page.locator('[data-currency-cat="sginfl"]')).toBeVisible()
  await veiled.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  await expect(veiled.locator('[data-currency-item="Fractured with a veiled mod"]')).toContainText('Big')
  await overlay.snap('equipment tab, special gear')
})

test('Rare weights: Alt + F on a utility flask opens the same score card', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), presets: { weights: { on: true } } }] })
  const page = overlay.page
  await expect.poll(() => fakeApp.registeredHotkeys(), { timeout: 20_000 }).toContain('Alt+F')
  await overlay.copyItem('items/magic-flask.txt', 'Alt + F')
  const card = page.locator('[data-score-flask]')
  await expect(card.locator('[data-score-ruler]')).toBeVisible()
  await expect(card.locator('[data-score-term="quality"]')).toContainText('20%')
  await expect(card.locator('[data-score-rank="r1"]')).toHaveAttribute('aria-pressed', 'true')
  await card.locator('[data-score-rank="rj"]').click()
  await expect(card.locator('[data-score-answer]')).toContainText('Hidden')
  await overlay.snap('flask score card')
})

test('Currency weights: categories fold open, an item opens its editor, and the ground pile opens an item', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  fs.writeFileSync(path.join(folder, 'NeverSink.filter'), zlib.gunzipSync(fs.readFileSync(path.join(FIXTURES, 'filters/neversink/3-STRICT.filter.gz'))))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), presets: { currency: { on: true } } }] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await page.getByRole('tab', { name: /^Loot/ }).click()
  // The Loot tab: a rail of classes, Currency first.
  await expect(page.locator('[data-loot-class="currency"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-currency-cat="gold"]')).toHaveCount(0)
  // Gold: its own page, open, with the pile size ruler on top.
  await page.locator('[data-loot-class="gold"]').click()
  await expect(page.locator('[data-currency-item="Gold"]')).toBeVisible()
  await expect(page.locator('[data-currency-cat="orbs"]')).toHaveCount(0)
  await overlay.snap('loot tab, gold')
  // Fragments: priced on the same ladder, folded by boss.
  await page.locator('[data-loot-class="fragments"]').click()
  await expect(page.locator('[data-currency-cat="invites"]')).toBeVisible()
  await expect(page.locator('[data-currency-cat="shaper"]')).toBeVisible()
  await expect(page.locator('[data-currency-cat="orbs"]')).toHaveCount(0)
  await overlay.snap('loot tab, fragments')
  // Divination cards: folded by what the set turns into; a star marks one you collect.
  await page.locator('[data-loot-class="cards"]').click()
  const uniq = page.locator('[data-currency-cat="carduniq"]')
  await expect(uniq).toBeVisible()
  await uniq.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  const star = uniq.locator('[data-loot-collect]').first()
  await star.click()
  await expect(star).toHaveAttribute('aria-pressed', 'true')
  await expect(uniq).toContainText('1 edited')
  await overlay.snap('loot tab, cards')
  await star.click()
  await expect(uniq).not.toContainText('edited')
  // Uniques: bases priced by their best unique; boss-only bases are Always.
  await page.locator('[data-loot-class="uniques"]').click()
  const plain = page.locator('[data-currency-cat="uniqplain"]')
  await expect(plain).toBeVisible()
  await expect(page.locator('[data-currency-cat="uniqboss"] [data-loot-section-mode]').getByRole('button', { name: /: Always/ })).toBeVisible()
  await plain.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  await expect(plain.locator('[data-currency-item]').first()).toBeVisible()
  await overlay.snap('loot tab, uniques')
  // Gems: a row per poe.ninja band (level, quality, corrupted); Exceptional is Always.
  await page.locator('[data-loot-class="gems"]').click()
  const exc = page.locator('[data-currency-cat="gemexc"]')
  await expect(exc.locator('[data-loot-section-mode]').getByRole('button', { name: /: Always/ })).toBeVisible()
  await exc.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  await expect(exc.locator('[data-currency-item="Enlighten Support 4/20c"]')).toBeVisible()
  await overlay.snap('loot tab, gems')
  // Maps: one slider for normal maps; blighted maps are priced below it.
  await page.locator('[data-loot-class="maps"]').click()
  const from = page.getByRole('slider', { name: 'Show maps from tier' })
  await from.fill('14')
  await expect(page.locator('[data-loot-maps]')).toContainText('under tier 14 hide')
  await overlay.snap('loot tab, maps')
  await from.fill('1')
  // Jewels: Abyss and Jewels folds, the unique jewels (set in Uniques), and
  // the cluster price rules, as on the Rules tab's Cluster page.
  await page.locator('[data-loot-class="jewels"]').click()
  const abyss = page.locator('[data-currency-cat="jewabyss"]')
  await expect(abyss).toBeVisible()
  await abyss.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  await expect(abyss.locator('[data-currency-item="Rare abyss jewel, item level 86+"]')).toBeVisible()
  // Jewels start Always: each row at its set look, no price. By price on the
  // header puts every row on the price ladder (Guy 2026-11-28).
  const row86 = abyss.locator('[data-currency-item="Rare abyss jewel, item level 86+"]')
  const head = abyss.locator('[data-loot-section-mode] button').first()
  await expect(head).toContainText('Always')
  await expect(row86).toContainText('Normal')
  await expect(row86.locator('[data-loot-row-on]')).toBeChecked()
  await overlay.snap('loot tab, abyss jewel rows')
  await head.click()
  await page.locator('[data-state-chip-menu]').getByRole('menuitemradio', { name: /By price/ }).click()
  await expect(head).toContainText('By price')
  await expect(row86).toContainText('est.')
  // The menu stays open: pick Always again from it.
  await page.locator('[data-state-chip-menu]').getByRole('menuitemradio', { name: /Always/ }).click()
  await expect(row86).not.toContainText('est.')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-maps-pile] [data-map-drop]').first()).toBeVisible()
  await overlay.snap('loot tab, jewels')
  // Cluster jewels: one section, a fold per size, band rows and money enchant
  // rows on the Loot ruler (WOKEPOET-726). The price rules card is gone.
  await expect(page.locator('[data-loot-jewels]')).not.toContainText('Follow poe.ninja')
  const clus = page.locator('[data-currency-cat="jewclus"]')
  await clus.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  const large = clus.locator('[data-currency-sub="Large Cluster Jewel"]')
  await expect(large).toBeVisible()
  await large.locator('[aria-expanded]').click()
  await expect(clus.locator('[data-currency-item="Large Cluster Jewel, 12 passives, item level 84+"]')).toContainText('12 passives, item level 84+')
  await expect(clus.locator('[data-currency-item="Large Cluster Jewel, 12 passives, item level 84+"]')).not.toContainText('Large Cluster Jewel,')
  await expect(clus.locator('[data-currency-item="Large Cluster Jewel, 12 passives, item level 84+"] [data-loot-row-on]')).toBeChecked()
  await clus.scrollIntoViewIfNeeded()
  await test.info().attach('loot tab, cluster jewels', { body: await clus.screenshot(), contentType: 'image/png' })
  const ujewel = page.locator('[data-unique-jewel]').first()
  if (await ujewel.count()) {
    const name = await ujewel.getAttribute('data-unique-jewel')
    await ujewel.click()
    await expect(page.locator('[data-loot-class="uniques"]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(`[data-currency-item="${name}"]`)).toBeVisible()
  }
  // League items: a fold per mechanic, rows by item level; a mechanic you
  // don't run goes Off in one click.
  await page.locator('[data-loot-class="league"]').click()
  const logs = page.locator('[data-currency-cat="lgexped"]')
  await expect(logs).toBeVisible()
  // Wombgifts have their own section (Guy 2026-11-28), so Alt+F gives them the Loot card.
  await expect(page.locator('[data-currency-cat="lgwomb"]')).toContainText('Wombgifts')
  await logs.locator('[data-loot-section-mode]').getByRole('button').click()
  await page.getByRole('menuitemradio', { name: /^Hide/ }).click()
  await logs.locator('[aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  await expect(logs.locator('[data-currency-item="Logbook, item level 83+"]')).toContainText('Hidden')
  await expect(page.locator('[data-maps-pile] [data-map-drop]').first()).toBeVisible()
  await overlay.snap('loot tab, league')
  await logs.locator('[data-loot-section-mode]').getByRole('button').click()
  await page.getByRole('menuitemradio', { name: /^By price/ }).click()
  // Recipes: each vendor recipe Off or the step it shows at in maps, by
  // default the step its reward's price reaches (By price).
  await page.locator('[data-loot-class="recipes"]').click()
  const six = page.locator('[data-loot-recipe="six"]')
  const byPrice = six.locator('[data-recipe-auto]')
  await expect(byPrice).toHaveAttribute('aria-pressed', 'true')
  await six.getByRole('button', { name: 'Normal' }).click()
  await expect(six.getByRole('button', { name: 'Normal', pressed: true })).toBeVisible()
  await expect(byPrice).toHaveAttribute('aria-pressed', 'false')
  await overlay.snap('loot tab, recipes')
  await byPrice.click()
  await expect(byPrice).toHaveAttribute('aria-pressed', 'true')
  // Levelling: where the Loot looks apply (everywhere by default) and the
  // currency that shows while levelling, each with its item tooltip.
  await page.locator('[data-loot-class="levelling"]').click()
  const gate = page.locator('[data-levelling-gate]')
  await expect(gate.getByRole('button', { name: 'Everywhere', pressed: true })).toBeVisible()
  const wisdom = page.locator('[data-levelling-item="Scroll of Wisdom"]')
  await expect(wisdom).toContainText('Normal')
  await expect(wisdom.getByRole('checkbox')).toBeChecked()
  // The rules below maps as an act timeline, the build section under it.
  await expect(page.locator('[data-levelling-timeline] [data-levelling-rule="Quest-like items"]')).toBeVisible()
  await gate.getByRole('button', { name: 'Maps only' }).click()
  await expect(page.locator('[data-levelling-on]')).toBeDisabled()
  await overlay.snap('loot tab, levelling')
  await gate.getByRole('button', { name: 'Everywhere' }).click()
  // The build template: Bow keeps bows and evasion; a chip turns one on.
  await page.locator('[data-levelling-build]').getByRole('button', { name: 'Bow' }).click()
  const defences = page.locator('[data-levelling-defences]')
  await expect(defences.getByRole('button', { name: 'Evasion', pressed: true })).toBeVisible()
  await expect(defences.getByRole('button', { name: 'Armour', pressed: false })).toBeVisible()
  await defences.getByRole('button', { name: 'Armour' }).click()
  await expect(defences.getByRole('button', { name: 'Armour', pressed: true })).toBeVisible()
  await expect(page.locator('[data-levelling-weapons]').getByRole('button', { name: 'Bows', pressed: true })).toBeVisible()
  await overlay.snap('loot tab, levelling build')
  await page.locator('[data-levelling-build]').getByRole('button', { name: 'Auto (PoB)' }).click()
  await page.locator('[data-loot-class="currency"]').click()
  // All loot is one line until opened (Guy 2026-11-28): its step prices show folded.
  const allOpenBtn = page.locator('[data-loot-all-open]')
  if (await allOpenBtn.getAttribute('aria-expanded') === 'false') {
    await expect(page.locator('[data-loot-all-prices]')).toContainText('Decent')
    await allOpenBtn.click()
  }
  await expect(page.getByRole('group', { name: 'Where each step starts', exact: true })).toBeVisible()
  await expect(page.locator('[data-currency-pile]')).toBeVisible()
  await expect(page.locator('[data-currency-cat="orbs"]')).toBeVisible()
  // Strictness by level name (Guy's H1): one level up, every step's price 25% higher.
  await page.getByRole('slider', { name: 'Strictness' }).fill('3')
  await expect(page.locator('[data-currency-strict-level]')).toHaveText('Strict')
  await expect(page.locator('[data-currency-strict-line]')).toContainText('25% higher')
  // The steps sit on one price ruler; a handle's value is the price after Strictness.
  await expect(page.getByRole('spinbutton', { name: 'Normal from this many chaos', exact: true })).toHaveValue('1.3')
  await expect(page.locator('[data-currency-cat="orbs"] [data-loot-section-mode]').getByRole('button')).toHaveAccessibleName('Orbs: By price')
  await page.waitForTimeout(500)
  await overlay.snap('currency weights tab')

  // A step's Look edits loudness for every category; a category sets its colour.
  await page.getByRole('button', { name: 'Big look and sound', exact: true }).click()
  await expect(page.locator('[data-currency-step-editor]')).toBeVisible()
  await overlay.snap('currency step look editor')
  await page.getByRole('button', { name: 'Big look and sound', exact: true }).click()
  // A category's colour and icon sit inside it, once it's open.
  const oilsHead = page.locator('[data-currency-cat="oils"] [aria-expanded]').first()
  await oilsHead.click({ position: { x: 12, y: 10 } })
  await page.getByRole('combobox', { name: 'Oils map icon shape' }).selectOption('Star')
  await expect(page.getByRole('button', { name: 'Reset Oils colours', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Reset Oils colours', exact: true }).click()
  await oilsHead.click({ position: { x: 12, y: 10 } })

  // A category folds open; an item opens its editor under it.
  await page.locator('[data-currency-cat="orbs"] [aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  // Guy's H1: the ruler is All loot's, its dots turn a step off everywhere;
  // Strictness shows its level's name and one line on what it does.
  await expect(page.locator('[data-currency-all-steps]')).toContainText('All loot')
  await expect(page.locator('[data-currency-step-dot="1"]').first()).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('[data-currency-strict-line]')).toContainText('all pages and sections')
  // A section's own Steps row turns a step off there only, and follows the ruler again on undo.
  const orbSteps = page.locator('[data-currency-cat="orbs"] [data-currency-cat-steps]')
  await orbSteps.getByRole('checkbox', { name: 'Show Normal in Orbs' }).uncheck()
  await expect(page.locator('[data-currency-step="2"]').locator('..')).not.toHaveClass(/off/)
  await orbSteps.getByRole('button', { name: "Orbs steps back to All loot's" }).click()
  await expect(orbSteps).toContainText('as All loot')
  // Own ruler (Guy's A): a section gets a ruler of its own, then goes back to the main one.
  const orbRuler = page.locator('[data-currency-cat="orbs"] [data-currency-own-ruler]')
  await orbRuler.getByRole('button', { name: 'Own ruler' }).click()
  await expect(orbRuler.locator('[data-currency-ruler]')).toBeVisible()
  await expect(page.locator('[data-currency-cat="orbs"]')).toContainText('own ruler')
  await orbRuler.getByRole('button', { name: "Orbs back to All loot's ruler" }).click()
  await expect(orbRuler.locator('[data-currency-ruler]')).toHaveCount(0)
  // The page's own bar (Guy 2026-11-28): follows All loot until it gets its own ruler.
  const pageBar = page.locator('[data-currency-page-ruler]')
  await expect(pageBar).toContainText('as All loot')
  await expect(pageBar.locator('[data-currency-ruler]')).toBeVisible()
  // Typing a price here gives Currency its own ruler, over All loot; undo goes back.
  const pageNormal = pageBar.getByRole('spinbutton', { name: 'Currency: Normal from this many chaos' })
  await pageNormal.fill('9')
  await pageNormal.press('Enter')
  await expect(pageBar).toContainText('its own, over All loot')
  await overlay.snap('loot tab, currency bar under All loot')
  await pageBar.locator('[data-currency-page-undo]').click()
  await expect(pageBar).toContainText('as All loot')
  const alch = page.locator('[data-currency-item="Orb of Alchemy"]')
  await expect(alch).toBeVisible()
  // Every row has the Jewels tick box (Guy 2026-11-28): untick hides this
  // one, tick again follows the section.
  const alchOn = alch.locator('[data-loot-row-on]')
  await expect(alchOn).toBeChecked()
  await alchOn.click()
  await expect(alch).toContainText('Hidden, set by you')
  await alchOn.click()
  await expect(alchOn).toBeChecked()
  await alch.click()
  const editor = page.locator('[data-currency-editor]')
  await expect(editor).toBeVisible()
  await editor.getByRole('button', { name: /: step: Price decides/ }).click()
  await overlay.snap('currency item editor, step menu')
  await page.getByRole('menuitemradio', { name: /^Tink/ }).click()
  await expect(page.locator('[data-currency-cat="orbs"]')).toContainText('1 edited')
  await editor.getByRole('button', { name: /: look: Its step's look/ }).click()
  await page.getByRole('menuitemradio', { name: /^Its own look/ }).click()
  await overlay.snap('currency item editor, own look')
  await editor.getByRole('button', { name: 'Let the price decide again' }).click()
  await expect(page.locator('[data-currency-cat="orbs"]')).not.toContainText('edited')

  // Essences sit in tiers; a whole tier switches off in one pick.
  await page.locator('[data-currency-cat="essences"] [aria-expanded]').first().click({ position: { x: 12, y: 10 } })
  const deaf = page.locator('[data-currency-sub="Deafening"]')
  await expect(deaf).toBeVisible()
  await deaf.getByRole('button').click()
  await deaf.getByRole('combobox').selectOption('0')
  await expect(page.locator('[data-currency-cat="essences"]')).toContainText('edited')
  await overlay.snap('currency essences by tier, Deafening off')
  await deaf.getByRole('combobox').selectOption('auto')
  await expect(page.locator('[data-currency-cat="essences"]').first()).not.toContainText('edited')

  // Every section has one chip: Hide / By price / Always, and a price bias.
  const oils = page.locator('[data-currency-cat="oils"]')
  const oilChip = oils.locator('[data-loot-section-mode]').getByRole('button')
  await oilChip.click()
  await page.getByRole('menuitemradio', { name: /^Hide/ }).click()
  await expect(oils).toContainText(/(^|\D)0 of \d+ show/)
  await overlay.snap('loot tab, oils section chip menu')
  await page.getByRole('menuitemradio', { name: /^By price/ }).click()
  await expect(oils).not.toContainText(/(^|\D)0 of \d+ show/)
  // A penalty: oils count under their price, and the chip says so.
  await page.locator('[data-state-chip-bias] [data-bias-range]').fill('80')
  await expect(oilChip).toHaveAccessibleName(/price bias 80%/)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-state-chip-menu]')).toHaveCount(0)
  await oilChip.click()
  await page.getByRole('button', { name: 'Price bias back to none' }).click()
  await page.keyboard.press('Escape')
  await expect(oilChip).toHaveAccessibleName('Oils: By price')
  // Faint: piles under the line show small and see-through, while it's on.
  await page.getByRole('button', { name: 'Faint settings', exact: true }).click()
  await page.locator('[data-loot-faint]').check()
  await expect(page.locator('[data-loot-faint-until]')).toBeEnabled()
  await overlay.snap('loot tab, faint on')

  // Search opens the categories that match.
  await page.getByRole('searchbox', { name: 'Find an item' }).fill('alc')
  await expect(page.locator('[data-currency-item="Orb of Alchemy"]')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Find an item' }).fill('')

  // A label on the ground opens its item.
  const drop = page.locator('[data-currency-pile] [role="button"]').first()
  const label = await drop.getAttribute('aria-label')
  await drop.click()
  await expect(editor).toBeVisible()
  expect(label).toBeTruthy()
})

// NeverSink retired (Guy's full cut, 2026-11-28): with no filter file at all,
// our own filter loads, strictness works on it, and a save writes our file.
test('our own filter: no file needed, strictness on the Loot tab, saved as our file', async ({ overlay, fakeApp }) => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-filters-'))
  await overlay.boot({ widgets: [{ ...lootFilter(folder), sourceName: '', ownBase: true, reloadWhenSafe: false, presets: { currency: { on: true } } }] })
  await openEditor(overlay, fakeApp)
  const page = overlay.page
  await expect(page.getByText('Saves to Loot filter (woke).filter').first()).toBeVisible()
  await page.getByRole('tab', { name: /^Loot/ }).click()
  await expect(page.locator('[data-loot-strictness]')).toBeVisible()
  await expect(page.locator('[data-loot-strict-maps]')).toBeVisible()
  await expect(page.getByRole('tab', { name: /^NeverSink/ })).toHaveCount(0)
  await page.getByRole('button', { name: /^Save/ }).click()
  await expect.poll(() => fs.existsSync(path.join(folder, 'Loot filter (woke).filter')), { timeout: 20_000 }).toBe(true)
  const text = fs.readFileSync(path.join(folder, 'Loot filter (woke).filter'), 'utf8')
  expect(text).toContain("woke-poe-trade's own loot filter")
  expect(text).toContain('$type->woke->rest')
})
