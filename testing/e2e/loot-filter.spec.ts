// The loot filter editor on a NeverSink filter in a temp filter folder:
// the loot shower preview and the sound/beam/minimap pickers.
import fs from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
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
  await page.getByRole('button', { name: /^General currency\s*4$/ }).click()
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

  await page.getByRole('button', { name: /^Save/ }).click()
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

  const slider = page.locator('input[type="range"]').first()
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
  const slider = page.locator('input[type="range"]').first()
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
  expect(await focused()).toMatch(/^Scarabs and fragments/)
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
  await overlay.boot({ widgets: [lootFilter(folder)] })
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
  await page.getByText('Back', { exact: true }).click()
  await expect(page.getByRole('tab', { name: /^Prices/ })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('button', { name: /Despot Axe/ }).click()
  await page.getByRole('button', { name: 'Show it', exact: true }).click()
  await expect.poll(() => {
    const out = path.join(folder, 'NeverSink (woke).filter')
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''
  }).toMatch(/Show # \$type->woke->own [^\n]*\n(\t[^\n]*\n)*\tBaseType == "Despot Axe"/)
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
  await expect(async () => {
    await overlay.moveMouse(1000, 900)
    await overlay.hoverDockIcon('loot-filter')
    await expect(level('Strict')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 20_000 })
  const out = path.join(folder, 'NeverSink (woke).filter')
  const saved = () => fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : ''

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

  // The other tabs fit too.
  for (const tab of ['Presets', 'NeverSink']) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click()
    const panel = (await save.boundingBox())!
    const body = await save.evaluate((el) => { const p = el.closest('.w-surface')!; return { bottom: p.getBoundingClientRect().bottom, sh: p.scrollHeight, ch: p.clientHeight } })
    expect(panel.y + panel.height, tab).toBeLessThanOrEqual(body.bottom)
    expect(body.sh, tab).toBeLessThanOrEqual(body.ch + 4)
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
