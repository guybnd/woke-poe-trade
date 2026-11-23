// Search palette: each result group shows its top 3 with a "+N more" row, the
// cog sets a group Open, Folded or Off, the chips (Ctrl + Left / Right) show
// one kind of result in full, and Settings > Search holds the same list.
import { test, expect } from './harness'
import type { Overlay } from './harness'

test.describe.configure({ mode: 'parallel' })

const SEARCH_KEY = 'Ctrl + Space'

async function openPalette (overlay: Overlay) {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [] })
  await overlay.showScreen('screens/map-real-01.png')
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })
  // The palette mounts lazily: a key pressed before it's there opens nothing.
  await expect(async () => {
    if (!await box.isVisible()) await overlay.pressHotkey(SEARCH_KEY)
    await expect(box).toBeFocused({ timeout: 1000 })
  }).toPass({ timeout: 15_000 })
  return { panel, box }
}

// The result rows under a heading, up to the next heading.
function groupRows (overlay: Overlay, heading: string) {
  return overlay.page.evaluate((h) => {
    const list = document.querySelector('[data-search-palette] .w-scroll')!
    const out: string[] = []
    let inside = false
    for (const el of Array.from(list.children)) {
      if (el.tagName === 'DIV') inside = el.textContent!.trim() === h
      else if (inside) out.push(el.textContent!.replace(/\s+/g, ' ').trim())
    }
    return out
  }, heading)
}

test('a group shows its top 3, "+N more" opens the rest, and its rows keep their tooltips', async ({ overlay }) => {
  const { panel, box } = await openPalette(overlay)
  // "fire" brings many gems with nowhere-to-get-them cards and passives.
  await expect(async () => {
    await box.fill('fire')
    expect((await groupRows(overlay, 'Passive tree')).length).toBeGreaterThan(0)
  }).toPass({ timeout: 20_000 })

  const tree = await groupRows(overlay, 'Passive tree')
  expect(tree).toHaveLength(4)
  expect(tree[3]).toMatch(/^\+\d+ more\s*Passive tree$/)
  const items = await groupRows(overlay, 'Other items')
  expect(items).toHaveLength(4)
  await overlay.snap('search-groups-folded')

  // Hover: a folded group's rows are item rows like any other.
  const tip = overlay.page.getByRole('tooltip')
  await panel.locator('button[data-item-tip]').filter({ hasText: 'Fire Trap' }).first().hover()
  await expect(tip).toContainText('Fire Trap')

  // Click "+N more": the whole group, with its first new row picked.
  await panel.locator('[data-search-more]').filter({ hasText: 'Passive tree' }).click()
  const opened = await groupRows(overlay, 'Passive tree')
  expect(opened.length).toBeGreaterThan(3)
  expect(opened.some(r => /more/.test(r))).toBe(false)
  await expect(panel.locator('[data-selected]')).toContainText(opened[3].split(' ')[0])
  // Enter on a "+N more" row does the same.
  const more = panel.locator('[data-search-more]').filter({ hasText: 'Other items' })
  await more.click()
  expect((await groupRows(overlay, 'Other items')).length).toBeGreaterThan(3)
  expect(overlay.errors).toEqual([])
})

test('the cog sets a group Open or Off, and an off group is one click away', async ({ overlay }) => {
  const { panel, box } = await openPalette(overlay)
  await expect(async () => {
    await box.fill('fire')
    expect((await groupRows(overlay, 'Passive tree')).length).toBeGreaterThan(0)
  }).toPass({ timeout: 20_000 })

  await panel.getByRole('button', { name: 'What search shows' }).click()
  const list = panel.locator('[data-search-groups-list]')
  await expect(list).toBeVisible()
  await overlay.snap('search-groups-cog')
  await list.locator('[data-group="Passive tree"]').getByRole('button', { name: 'Open', exact: true }).click()
  await list.locator('[data-group="Other items"]').getByRole('button', { name: 'Off', exact: true }).click()
  // Enter closes the list; it never runs the result hidden behind it.
  await box.press('Enter')
  await expect(list).toBeHidden()
  await expect(box).toBeFocused()
  await expect(overlay.widget('woke-search').getByRole('textbox', { name: 'Search', exact: true })).toBeVisible()

  expect((await groupRows(overlay, 'Passive tree')).length).toBeGreaterThan(3)
  expect(await groupRows(overlay, 'Other items')).toEqual([])
  const off = panel.locator('[data-search-more]').filter({ hasText: 'group off' })
  await expect(off).toContainText('Other items')
  await off.click()
  expect((await groupRows(overlay, 'Other items')).length).toBeGreaterThan(3)

  // Saved with the window: kept for the next search.
  await box.fill('ice')
  await box.fill('fire')
  expect(await groupRows(overlay, 'Other items')).toEqual([])
  // Reset puts the defaults back.
  await panel.getByRole('button', { name: 'What search shows' }).click()
  await list.getByRole('button', { name: 'Reset' }).click()
  await list.getByRole('button', { name: 'Done' }).click()
  expect(await groupRows(overlay, 'Other items')).toHaveLength(4)
  expect(overlay.errors).toEqual([])
})

test('chips show one kind of result in full, and Ctrl + Left / Right steps through them', async ({ overlay }) => {
  const { panel, box } = await openPalette(overlay)
  await expect(async () => {
    await box.fill('fire')
    expect((await groupRows(overlay, 'Passive tree')).length).toBeGreaterThan(0)
  }).toPass({ timeout: 20_000 })
  const chips = panel.locator('[data-search-chips] button')
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(chips.first()).toContainText('All')

  // Ctrl + Right from All: the next chip with results.
  await box.press('Control+ArrowRight')
  await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true')
  await box.press('Control+ArrowLeft')
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')
  await box.press('Control+ArrowLeft')
  await expect(chips.last()).toHaveAttribute('aria-pressed', 'true')
  await expect(chips.last()).toContainText('Web')
  expect((await groupRows(overlay, 'Search the web')).length).toBe(2)
  expect(await groupRows(overlay, 'Passive tree')).toEqual([])

  // Facts: every lookup group in full, no "+N more".
  await chips.filter({ hasText: 'Facts' }).click()
  await expect(box).toBeFocused()
  expect((await groupRows(overlay, 'Passive tree')).length).toBeGreaterThan(3)
  await expect(panel.locator('[data-search-more]')).toHaveCount(0)
  expect(await groupRows(overlay, 'Other items')).toEqual([])
  await overlay.snap('search-groups-chip-facts')
  // Items: every item, and a row under a chip keeps its tooltip.
  await chips.filter({ hasText: 'Items' }).click()
  expect((await groupRows(overlay, 'Other items')).length).toBeGreaterThan(3)
  await panel.locator('button[data-item-tip]').filter({ hasText: 'Fire Trap' }).first().hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Fire Trap')

  // A chip with nothing for the new query goes back to All.
  await box.fill('hotkey')
  await chips.filter({ hasText: 'Settings' }).click()
  await expect(chips.filter({ hasText: 'Settings' })).toHaveAttribute('aria-pressed', 'true')
  await box.fill('the coast')
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(chips.filter({ hasText: 'Settings' })).toHaveCount(0)
  // A new search starts on All again.
  await box.press('Escape')
  await overlay.pressHotkey(SEARCH_KEY)
  await box.fill('fire')
  await expect(chips.first()).toHaveAttribute('aria-pressed', 'true')
  expect(overlay.errors).toEqual([])
})

test('Settings > Search holds the same list, found from the search box', async ({ overlay }) => {
  const { panel, box } = await openPalette(overlay)
  await box.fill('what search shows')
  const hit = panel.getByRole('button', { name: /What search shows\s*Setting · Search$/ })
  await expect(hit).toBeVisible()
  await hit.click()
  await box.press('Enter')
  const settings = overlay.widget('settings')
  const list = settings.locator('[data-search-groups-list]')
  await expect(list).toBeVisible()
  await expect(list.getByRole('button', { name: 'Done' })).toHaveCount(0)
  await list.locator('[data-group="Viscera"]').getByRole('button', { name: 'Off', exact: true }).click()
  await expect(list.locator('[data-group="Viscera"]').getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await overlay.snap('search-groups-settings')
  expect(overlay.errors).toEqual([])
})

test('a row far down the list shows its tooltip when hovered, though the list scrolls to it', async ({ overlay }) => {
  const { panel, box } = await openPalette(overlay)
  await expect(async () => {
    await box.fill('fire')
    expect((await groupRows(overlay, 'Where to get gems')).length).toBeGreaterThan(0)
  }).toPass({ timeout: 20_000 })
  // Facts lists every gem card in full, well below the fold.
  await panel.locator('[data-search-chips] button').filter({ hasText: 'Facts' }).click()
  const tip = overlay.page.getByRole('tooltip')
  const gems = panel.locator('button[data-item-tip]').filter({ hasText: /^.?Where to get / })
  expect(await gems.count()).toBeGreaterThan(2)
  for (const i of [0, 2]) {
    const row = gems.nth(i)
    const name = (await row.locator('.w-trunc').first().textContent())!.replace('Where to get ', '').trim()
    await overlay.page.mouse.move(5, 5)
    await expect(tip).toHaveCount(0)
    await row.hover()
    await expect(tip).toContainText(name)
  }
  // A scroll hides the tooltip while the pointer stays on the row (Ctrl+Space
  // scrolling a row into view). Once it stops, the row shows it again.
  const row = gems.nth(0)
  const name = (await row.locator('.w-trunc').first().textContent())!.replace('Where to get ', '').trim()
  await row.hover()
  await expect(tip).toContainText(name)
  const hidden = await row.evaluate(async (el) => {
    let s = el.parentElement
    while (s && s.scrollHeight <= s.clientHeight) s = s.parentElement
    ;(s ?? document).dispatchEvent(new Event('scroll'))
    await new Promise(resolve => setTimeout(resolve, 50))
    return !document.querySelector('[role=tooltip]')
  })
  expect(hidden).toBe(true)
  await expect(tip).toContainText(name)
  // Any other hide is final: after a blur, a scroll doesn't bring it back.
  await overlay.page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(tip).toHaveCount(0)
  await row.evaluate((el) => {
    let s = el.parentElement
    while (s && s.scrollHeight <= s.clientHeight) s = s.parentElement
    ;(s ?? document).dispatchEvent(new Event('scroll'))
  })
  await overlay.page.waitForTimeout(400)
  await expect(tip).toHaveCount(0)
  expect(overlay.errors).toEqual([])
})
