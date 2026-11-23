// Net worth from start to finish: the stash reader turned on in Settings, signed in to a fake pathofexile.com, tabs picked, a read, and what
// the stash is worth. Main reads the site itself (stubs/electron.ts `site`).
import fs from 'fs'
import path from 'path'
import { test, expect, FIXTURES } from './harness'

const LIST = fs.readFileSync(path.join(FIXTURES, 'stash/tab-list.json'), 'utf8')
const DUMP = fs.readFileSync(path.join(FIXTURES, 'stash/tab-dump.json'), 'utf8')
// The dump a map later: the Strand Map used up, two more Apothecary cards.
const DUMP_AFTER = (() => {
  const d = JSON.parse(DUMP) as { items: Array<{ typeLine?: string, stackSize?: number }> }
  d.items = d.items.filter(i => i.typeLine !== 'Strand Map').map(i => i.typeLine === 'The Apothecary' ? { ...i, stackSize: (i.stackSize ?? 1) + 2 } : i)
  return JSON.stringify(d)
})()
// Three sales from the trade history: newest first, priced in chaos and divines.
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
const SALES = JSON.stringify({
  result: [
    { time: ago(1), item_id: 's1', price: { amount: 44, currency: 'chaos' }, item: { typeLine: 'Empower Support', baseType: 'Empower Support', frameType: 4, icon: '', properties: [{ name: 'Level', values: [['4', 0]] }, { name: 'Quality', values: [['+20%', 1]] }] } },
    { time: ago(2), item_id: 's2', price: { amount: 1, currency: 'divine' }, item: { typeLine: "Maven's Writ", baseType: "Maven's Writ", frameType: 0, icon: '' } },
    { time: ago(3), item_id: 's3', price: { amount: 2, currency: 'divine' }, item: { name: 'Headhunter', typeLine: 'Leather Belt', baseType: 'Leather Belt', frameType: 3, icon: '' } }
  ]
})

test('the stash reader turns on, reads the picked tabs, and Net worth prices them', async ({ overlay, fakeApp }) => {
  let dump = DUMP
  fakeApp.site.reply = (url) => {
    const u = new URL(url)
    if (u.pathname === '/my-account') return { status: 200, body: '<html><title>View Profile - Path of Exile - Tester#1234</title></html>' }
    if (u.pathname === '/character-window/get-stash-items') return { status: 200, body: u.searchParams.get('tabIndex') === '0' ? LIST : dump }
    if (u.pathname.startsWith('/api/trade/history/')) return { status: 200, body: SALES }
    return null
  }
  try {
    await overlay.page.setViewportSize({ width: 2560, height: 1440 })
    await overlay.boot({ overlayActive: true })
    await overlay.widget('menu').locator('.fa-cog').click()
    const settings = overlay.widget('settings')
    await settings.getByText('All modules', { exact: true }).first().click()

    // Shown to everyone, off, with no experimental rows (no 5 clicks needed).
    const reader = settings.getByRole('switch', { name: 'Net worth' })
    await expect(reader).toBeVisible()
    await expect(reader).toHaveAttribute('aria-checked', 'false')
    await expect(settings.getByRole('button', { name: 'Hide experimental' })).toHaveCount(0)

    // Asks first, then signs in by itself: the site says who you are.
    await reader.click()
    await settings.getByRole('button', { name: 'Turn on' }).click()
    await expect(reader).toHaveAttribute('aria-checked', 'true')
    await expect(settings.getByText('Signed in as Tester#1234')).toBeVisible()
    await overlay.snap('stash reader on')

    await settings.getByTitle('Close').first().click()
    await expect(settings).toBeHidden()

    // The Net worth window asks which tabs to read before the first read.
    await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
    await overlay.page.getByRole('button', { name: /Net worth/ }).first().click()
    // Placed at runtime, so not in the booted config: found by what it shows.
    const picker = overlay.page.locator('[id^="widget-"]').filter({ has: overlay.page.getByText('Tabs to read') })
    await expect(picker).toHaveCount(1)
    const panel = overlay.page.locator(`#${await picker.getAttribute('id')}`)
    await overlay.snap('net worth tab picker')
    // The template picks the currency tab; tick the dump tab too.
    await panel.getByRole('checkbox', { name: /Dump/ }).check()
    await expect(panel.getByText(/2 of 2 tabs/)).toBeVisible()
    await panel.getByRole('button', { name: 'Read these tabs' }).click()

    // The read: Divine and Chaos from the currency tab, Headhunter and the rest
    // from the dump, priced from poe.ninja.
    await expect(panel.getByText('Headhunter').first()).toBeVisible({ timeout: 20_000 })
    // 12 Divine Orbs at 1 div each (poe.ninja's fixture), 340 Chaos at its rate.
    await expect(panel.locator('tr', { hasText: 'Divine Orb' })).toContainText(/12\s*1\.0\s*12\.0/)
    await expect(panel.locator('tr', { hasText: 'Chaos Orb' })).toContainText('340')
    await expect(panel.getByText('Dump', { exact: true }).first()).toBeVisible()
    await overlay.snap('net worth after a read')
    expect(fakeApp.site.requests.some(u => u.includes('tabIndex=1'))).toBe(true)

    // Sections fold to their title line, and the bar under the middle row
    // gives it a height its lists scroll inside. Both are saved.
    const details = panel.getByRole('button', { name: /^Details/ })
    if (await details.getAttribute('aria-expanded') !== 'true') await details.click()
    const bar = panel.getByTitle("Drag to change this row's height · double-click to fit")
    // The bar sits right inside the row it sizes.
    const row = bar.locator('xpath=..')
    const before = (await row.boundingBox())!.height
    await bar.scrollIntoViewIfNeeded()
    const at = (await bar.boundingBox())!
    await overlay.page.mouse.move(at.x + at.width / 2, at.y + at.height / 2)
    await overlay.page.mouse.down()
    await overlay.page.mouse.move(at.x + at.width / 2, at.y + at.height / 2 + 40, { steps: 4 })
    await overlay.page.mouse.up()
    await expect.poll(async () => Math.round((await row.boundingBox())!.height)).toBeGreaterThan(before + 25)
    await overlay.snap('net worth middle row dragged taller')
    // Double-click fits it to what's in it again.
    await bar.dblclick()
    await expect.poll(async () => Math.round((await row.boundingBox())!.height)).toBeLessThan(before + 10)
    // Folded, Where it is keeps its title and drops its rows.
    const where = panel.getByRole('button', { name: 'Where it is' })
    // A category row: a button with its share bar (an <i>) right inside.
    const catRows = panel.locator('button[aria-pressed]:has(> i)')
    await expect(where).toHaveAttribute('aria-expanded', 'true')
    expect(await catRows.count()).toBeGreaterThan(0)
    await where.click()
    await expect(where).toHaveAttribute('aria-expanded', 'false')
    await expect(catRows).toHaveCount(0)
    await overlay.snap('net worth where it is folded')
    await where.click()
    await expect(where).toHaveAttribute('aria-expanded', 'true')

    // Strategy runs (WOKEPOET-515): start one from the last read, read again,
    // and the run shows what came in, its typed costs, and lands in Past runs.
    await panel.getByRole('tab', { name: 'Runs' }).click()
    await panel.getByLabel('Run name').fill('Nightmare maps')
    await panel.getByRole('button', { name: 'Start', exact: true }).click()
    const card = panel.locator('[data-run-card]')
    await expect(card).toContainText('Nightmare maps')
    dump = DUMP_AFTER
    await panel.getByRole('button', { name: 'Refresh' }).click()
    const came = card.getByText('The Apothecary', { exact: false }).first()
    await expect(came).toBeVisible({ timeout: 20_000 })
    await came.hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('The Apothecary')
    await overlay.page.mouse.move(0, 0)
    await panel.getByLabel('Cost item').fill('Strand Map')
    await panel.getByRole('button', { name: 'Per map', exact: true }).click()
    await expect(card.getByLabel('Strand Map per map')).toHaveValue('1')
    await overlay.snap('net worth strategy run')
    await card.getByRole('button', { name: 'Stop' }).click()
    await expect(panel.locator('[data-past-run]').first()).toContainText('Nightmare maps')
    await panel.getByRole('tab', { name: 'Holdings' }).click()

    // The Sales view: a header click sorts the table, a second click flips it.
    // Price compares by value: 44c sorts under 1 div though 44 > 1.
    await panel.getByRole('tab', { name: 'Sales' }).click()
    await panel.getByRole('button', { name: 'Refresh' }).click()
    const rows = panel.locator('tbody tr')
    const names = () => rows.locator('td:first-child').allInnerTexts()
    await expect(rows).toHaveCount(3, { timeout: 10_000 })
    await expect.poll(names).toEqual(['Empower Support 4/20', "Maven's Writ", 'Headhunter'])
    const price = panel.getByRole('button', { name: 'Price', exact: true })
    await price.click()
    await expect.poll(names).toEqual(['Headhunter', "Maven's Writ", 'Empower Support 4/20'])
    await expect(panel.locator('th[aria-sort="descending"]')).toContainText('Price')
    await price.click()
    await expect.poll(names).toEqual(['Empower Support 4/20', "Maven's Writ", 'Headhunter'])
    await expect(panel.locator('th[aria-sort="ascending"]')).toContainText('Price')
    // hover() scrolls the table to the row, and a scroll hides the tooltip:
    // scroll first and let the event pass, then hover (as item-tip.spec does).
    const hh = rows.filter({ hasText: 'Headhunter' }).getByText('Headhunter', { exact: true })
    await hh.scrollIntoViewIfNeeded()
    await overlay.page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await hh.hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('Headhunter')
    await overlay.snap('net worth sales sorted by price')
    await panel.getByRole('button', { name: 'When', exact: true }).click()
    await panel.getByRole('tab', { name: 'Holdings' }).click()

    // Off again, without asking, and the window goes. The fake app lives on
    // for the next test in this worker, so it must find the reader off.
    await overlay.widget('menu').locator('.fa-cog').click()
    await settings.getByText('All modules', { exact: true }).first().click()
    await reader.click()
    await expect(reader).toHaveAttribute('aria-checked', 'false')
    await expect(panel).toHaveCount(0)
  } finally {
    fakeApp.site.reply = null
    fakeApp.site.requests.length = 0
  }
})
