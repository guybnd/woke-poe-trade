// Net worth from start to finish: the stash reader turned on in Settings, signed in to a fake pathofexile.com, tabs picked, a read, and what
// the stash is worth. Main reads the site itself (stubs/electron.ts `site`).
import fs from 'fs'
import path from 'path'
import { test, expect, FIXTURES } from './harness'
import { NEWS } from '../../renderer/src/web/woke/tab-bar/news'

const area = (id: string, seed = '666232010') => `2026/11/05 20:49:09 18884906 1186a8a3 [DEBUG Client 34092] Generating level 83 area "${id}" with seed ${seed}`

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
  // One long walk: reads, two runs started and stopped (each Stop reads the
  // stash and your Faustus listings), their summaries, past runs. About 35 s
  // alone and over 45 s on a loaded runner, so it gets more than the default.
  test.setTimeout(90_000)
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
    // What's new's Listed line stays unseen: its Show me is checked below.
    // (Pointing at Net worth in All tools reads its first line, Still cheapest.)
    await overlay.boot({ overlayActive: true, whatsNew: ['listed-still-cheapest', 'net-worth-listed'] })
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

    // The shared profit line: click the price to type yours (gold, a pin),
    // leave a row out (it stays, struck, "left out"), Undo, and the Changed
    // chip lists what you changed. Then put it all back.
    const chaosRow = panel.locator('tr[data-nw-row]', { hasText: 'Chaos Orb' })
    await chaosRow.locator('[data-nw-price]').click()
    const priceBox = chaosRow.getByRole('spinbutton')
    await priceBox.fill('0.01')
    await priceBox.press('Enter')
    await expect(chaosRow.locator('[data-nw-price] .fa-thumbtack')).toBeVisible()
    const changed = panel.locator('[data-nw-changed]')
    await expect(changed).toContainText('Changed 1')
    await chaosRow.hover()
    await chaosRow.locator('[data-line-out]').click()
    await expect(chaosRow).toContainText('left out')
    await expect(changed).toContainText('Changed 1')
    await overlay.snap('net worth row left out')
    await overlay.page.getByRole('button', { name: 'Undo' }).last().click()
    await expect(chaosRow).not.toContainText('left out')
    await chaosRow.hover()
    await chaosRow.locator('[data-line-more]').click()
    await overlay.page.getByRole('menuitem', { name: "Back to poe.ninja's price" }).click()
    await expect(chaosRow.locator('[data-nw-price] .fa-thumbtack')).toHaveCount(0)
    await expect(changed).toHaveCount(0)
    await overlay.page.mouse.move(0, 0)
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
    // A category row: a button with its share bar (an <i>) right inside
    // (not a row's leave-out button, which is one too).
    const catRows = panel.locator('button[aria-pressed]:not([data-line-out]):has(> i)')
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
    // Start and Stop read your Faustus listings: one search on your account,
    // newest first. What was listed at Start is from before the run.
    const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
    const searches: string[] = []
    const listing = (id: string, name: string, base: string, at: string, div: number) =>
      ({ id, item: { name, typeLine: base, baseType: base, frameType: 3, icon: '' }, listing: { indexed: at, fee: 100, stash: { name: 'Sell 1', x: 4, y: 2 }, price: { amount: div, currency: 'divine', type: '~price' }, account: { name: 'Tester#1234', lastCharacterName: 'T' } } })
    let listings = [listing('l0', 'Headhunter', 'Leather Belt', ago(48), 9)]
    // Other sellers' Headhunters, for Still cheapest? (a search sorted by price).
    const other = (id: string, div: number) => ({ ...listing(id, 'Headhunter', 'Leather Belt', ago(5), div), listing: { ...listing(id, 'Headhunter', 'Leather Belt', ago(5), div).listing, account: { name: 'Other#1', lastCharacterName: 'O' } } })
    const market = [other('m1', 8), listing('l0', 'Headhunter', 'Leather Belt', ago(48), 9), other('m2', 10)]
    await overlay.page.route('**/api/trade/search/**', (route) => {
      const body = route.request().postData() ?? ''
      searches.push(body)
      const list = body.includes('"price":"asc"') ? market : listings
      return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: `q${searches.length}`, total: list.length, result: list.map(l => l.id) }) })
    })
    await overlay.page.route('**/api/trade/fetch/**', (route) => route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ result: [...listings, ...market.filter(m => m.id.startsWith('m'))].filter(r => route.request().url().split('/fetch/')[1].split('?')[0].split(',').includes(r.id)) })
    }))
    await panel.getByLabel('Run name').fill('Nightmare maps')
    await panel.getByRole('button', { name: 'Start', exact: true }).click()
    const card = panel.locator('[data-run-card]')
    await expect(card).toContainText('Nightmare maps')
    // A boss fight in the run (Client.txt): it counts like a map, so per
    // map becomes per fight. A portal back in is the same fight.
    await overlay.page.waitForTimeout(1100)
    const p2 = (n: number) => String(n).padStart(2, '0')
    const d = new Date()
    const fight = `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} 3725546 1186a8a3 [DEBUG Client 25552] Generating level 85 area "MapWorldsShapersRealm" with seed 4242`
    await overlay.log([fight, fight])
    await overlay.page.waitForTimeout(1100)
    dump = DUMP_AFTER
    await panel.getByRole('button', { name: 'Refresh' }).click()
    await expect(card).toContainText('1 fight', { timeout: 20_000 })
    await expect(card.locator('[data-run-per]')).toContainText(/Per (fight|run)/)
    const came = card.getByText('The Apothecary', { exact: false }).first()
    await expect(came).toBeVisible({ timeout: 20_000 })
    await came.hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('The Apothecary')
    await overlay.page.mouse.move(0, 0)
    // A row's icons each work when clicked: edit opens a named editor under
    // the row, Save changes it, reset puts it back as read.
    const usedRow = card.locator('[data-run-used]').filter({ hasText: 'Strand Map' }).first()
    await usedRow.hover()
    await usedRow.locator('[data-run-edit]').click()
    const editor = usedRow.locator('[data-run-editor]')
    await expect(editor).toBeVisible()
    await expect(editor).toContainText('How many')
    await expect(editor).toContainText('Price each')
    await overlay.snap('net worth run edit row')
    await editor.getByLabel(/how many/).fill('3')
    await editor.locator('[data-run-edit-save]').click()
    await expect(usedRow).toContainText('3 ×')
    await usedRow.hover()
    await usedRow.locator('[data-line-more]').click()
    await overlay.page.getByRole('menuitem', { name: 'Back to as read' }).click()
    await expect(usedRow).not.toContainText('3 ×')
    // A cost by hand, per map (Out column).
    // Typing suggests items with art and price (our own list: the browser's
    // datalist never draws in the overlay); every box is named.
    await card.locator('[data-run-out] [data-run-add]').click()
    await card.getByLabel('Add a cost: item').pressSequentially('Strand')
    const option = card.locator('[data-run-add-option]').filter({ hasText: 'Strand Map' }).first()
    await expect(option).toBeVisible()
    await overlay.snap('net worth run add cost')
    await option.click()
    await expect(card.getByLabel('Add a cost: item')).toHaveValue(/Strand Map/)
    await card.getByLabel('Add a cost: price each').fill('1.5')
    await card.locator('[data-run-add-form]').getByRole('button', { name: 'c', exact: true }).click()
    await card.getByLabel('Add a cost: price each').fill('1')
    await card.locator('[data-run-add-per-map]').click()
    await expect(card.locator('[data-run-cost]')).toContainText('Strand Map')
    // The typed line takes over the read one (same item), so it isn't counted twice.
    await expect(card.locator('[data-run-used]').filter({ hasText: 'Strand Map' })).toHaveCount(0)
    // A long shot: left out, then counted again.
    const cameRow = card.locator('[data-run-came]').first()
    await cameRow.hover()
    await cameRow.locator('[data-line-out]').click()
    await expect(panel.locator('[data-run-left-out]')).toBeVisible()
    await expect(cameRow).toContainText('left out')
    await expect(card.locator('[data-run-changed]')).toContainText('Changed 1')
    await overlay.snap('net worth strategy run')
    await cameRow.locator('[data-line-out]').click()
    await expect(panel.locator('[data-run-left-out]')).toHaveCount(0)
    // Your count on a row.
    await cameRow.hover()
    await cameRow.locator('[data-run-edit]').click()
    await cameRow.getByLabel(/how many/).fill('5')
    await cameRow.getByRole('button', { name: 'Save' }).click()
    await expect(cameRow).toContainText('5 × The Apothecary')
    // The run hotkey: the hovered item is held outside the stash, counted
    // until the stash, a listing or a sale shows it.
    fakeApp.focusGame(true)
    await overlay.copyItem('items/card-the-doctor.txt', 'Alt + H')
    await overlay.pressHotkey(overlay.config.overlayKey)
    const heldRow = card.locator('[data-run-held]')
    await expect(heldRow).toContainText('The Doctor')
    await heldRow.getByText('The Doctor').hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('The Doctor')
    await overlay.page.mouse.move(0, 0)
    // Listed during the run, before Stop.
    listings = [listing('l1', 'Mageblood', 'Heavy Belt', new Date(Date.now() - 1000).toISOString(), 2), ...listings]
    // Stop from the dock card's Run tab (pick Q1): two clicks.
    fakeApp.focusGame(true)
    const runTab = overlay.page.locator('[data-card-run]')
    await expect(async () => {
      await overlay.hoverDockIcon('net-worth')
      await expect(runTab).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    await expect(runTab).toContainText('Nightmare maps')
    await expect(overlay.page.locator('[data-card-run-total]')).toBeVisible()
    // What brought the most in, with its item tooltip.
    await expect(overlay.page.locator('[data-card-run-came]').first()).toContainText('The Apothecary')
    await expect(overlay.page.locator('[data-card-run-came] [data-item-tip]').first()).toBeVisible()
    await overlay.snap('net worth dock card run')
    const stopBtn = overlay.page.locator('[data-card-stop]')
    await stopBtn.click()
    await expect(stopBtn).toContainText('Stop the run?')
    // The confirm lapses after a few seconds: on a slow runner, arm it again.
    await expect(async () => {
      // Once the run has stopped the button is gone: don't wait for it.
      const label = await stopBtn.innerText({ timeout: 1000 }).catch(() => '')
      if (/Stop/.test(label) && !/Stopping/.test(label)) await stopBtn.click()
      await expect(runTab).toHaveCount(0, { timeout: 4000 })
    }).toPass({ timeout: 30_000 })
    // Stop reads the stash one last time, then the run's Summary waits in
    // the window (pick W1): the game's last zone was a boss arena, so it
    // doesn't pop up over the game. Best drops with their item tooltip, map
    // times, spent and kept, tips.
    await overlay.pressHotkey(overlay.config.overlayKey)
    const summary = panel.locator('[data-run-summary]')
    await expect(summary).toBeVisible({ timeout: 45_000 })
    const drop = summary.locator('[data-summary-drop]').filter({ hasText: 'The Apothecary' })
    await expect(drop).toBeVisible()
    await drop.locator('[data-item-tip]').hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('The Apothecary')
    await overlay.page.mouse.move(0, 0)
    // A best drop is the shared line item: your price (gold, pinned), then
    // back to as read from ⋯ (leave out is the same ⊘ as the Runs rows).
    await drop.locator('[data-summary-price]').click()
    const dropBox = drop.getByRole('spinbutton')
    await dropBox.fill('150')
    await dropBox.press('Enter')
    await expect(drop.locator('[data-summary-price] .fa-thumbtack')).toBeVisible()
    await drop.hover()
    await expect(drop.locator('[data-line-out]')).toBeVisible()
    await drop.locator('[data-line-more]').click()
    await overlay.page.getByRole('menuitem', { name: 'Back to as read' }).click()
    await expect(drop.locator('[data-summary-price] .fa-thumbtack')).toHaveCount(0)
    await overlay.page.mouse.move(0, 0)
    await expect(summary.locator('[data-summary-vs]')).toContainText('Your first Nightmare maps run')
    await expect(summary.locator('[data-summary-spend]')).toContainText('Spent')
    await expect(summary.locator('[data-summary-tips]')).toBeVisible()
    await overlay.snap('net worth run summary')
    await panel.locator('[data-run-details-tab]').click()
    await expect(summary).toHaveCount(0)
    await expect(panel.locator('[data-past-run]').first()).toContainText('Nightmare maps')
    expect(searches).toHaveLength(2)
    expect(searches[0]).toContain('Tester#1234')
    expect(searches[0]).toContain('securable')
    const listed = panel.locator('[data-run-listed]')
    await expect(listed).toHaveCount(1)
    await expect(listed).toContainText('Mageblood')
    await expect(panel.locator('[data-run-total]')).toContainText('With Faustus')
    await listed.getByText('Mageblood').hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('Mageblood')
    await overlay.page.mouse.move(0, 0)
    // The next run, started from the dock card (no run going): named like
    // the last one. Then stopped again from the card.
    fakeApp.focusGame(true)
    const startBtn = overlay.page.locator('[data-card-start]')
    await expect(async () => {
      await overlay.moveMouse(5, 500)
      await overlay.hoverDockIcon('net-worth')
      await expect(startBtn).toBeEnabled({ timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    await startBtn.click()
    await expect(overlay.page.locator('[data-card-start-form] input')).toHaveValue('Nightmare maps')
    await overlay.snap('net worth dock card start run')
    await overlay.page.locator('[data-card-start-go]').click()
    await expect(runTab).toContainText('Nightmare maps', { timeout: 20_000 })
    // No second Start while a run goes (it would end this one).
    await expect(startBtn).toHaveCount(0)
    await stopBtn.click()
    await expect(stopBtn).toContainText('Stop the run?')
    await expect(async () => {
      // Once the run has stopped the button is gone: don't wait for it.
      const label = await stopBtn.innerText({ timeout: 1000 }).catch(() => '')
      if (/Stop/.test(label) && !/Stopping/.test(label)) await stopBtn.click()
      await expect(runTab).toHaveCount(0, { timeout: 4000 })
    }).toPass({ timeout: 30_000 })
    // The second run's Summary compares it with the first (same name).
    await overlay.pressHotkey(overlay.config.overlayKey)
    await expect(summary).toBeVisible({ timeout: 45_000 })
    await expect(summary.locator('[data-summary-vs]')).toContainText('1 earlier run')
    // Past runs compared (pick C2): one row a run, By strategy adds up the
    // two Nightmare maps runs. One fight is a small sample (pick S1).
    await panel.getByRole('tab', { name: 'Runs' }).click()
    const pastRuns = panel.locator('[data-past-run]')
    await expect(pastRuns).toHaveCount(2)
    await expect(panel.locator('[data-compare]')).toContainText('Without best drop')
    await panel.locator('[data-by-strategy]').click()
    await expect(pastRuns).toHaveCount(1)
    await expect(pastRuns.first()).toContainText('2 runs')
    await expect(pastRuns.first()).toContainText('small')
    await overlay.snap('net worth runs compared')
    // The kit (pick K1): the name brings last time's per-map cost to Start.
    await panel.getByLabel('Run name').fill('Nightmare maps')
    const kitLine = panel.locator('[data-run-kit-line]')
    await expect(kitLine).toContainText('Strand Map')
    await expect(kitLine).toContainText('typed')
    await kitLine.getByText('Strand Map').hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('Strand Map')
    await overlay.page.mouse.move(0, 0)
    await panel.getByLabel('Run name').fill('')
    // The Listed tab (pending sales): Start's read saved your listings, and
    // Refresh reads them again (one more search). Each row has its tooltip.
    await panel.getByRole('tab', { name: 'Listed' }).click()
    const listedRows = panel.locator('[data-listed-row]')
    // Both runs' Starts read them: Headhunter and Mageblood.
    await expect(listedRows).toHaveCount(2)
    await expect(listedRows.filter({ hasText: 'Headhunter' })).toHaveCount(1)
    const searchesBefore = searches.length
    listings = [listing('l2', "Kaom's Heart", 'Glorious Plate', new Date(Date.now() - 500).toISOString(), 3), ...listings]
    await expect(panel.getByRole('switch', { name: /Auto-refresh in hideout/ })).toHaveAttribute('aria-checked', 'true')
    await panel.getByRole('button', { name: 'Refresh' }).click()
    await expect(listedRows).toHaveCount(3)
    expect(searches).toHaveLength(searchesBefore + 1)
    // Headhunter was listed two days ago, Kaom's Heart just now: newest first.
    await expect(listedRows.first()).toContainText("Kaom's Heart")
    await listedRows.filter({ hasText: 'Headhunter' }).getByText('Headhunter', { exact: true }).hover()
    await expect(overlay.page.getByRole('tooltip')).toContainText('Headhunter')
    await overlay.page.mouse.move(0, 0)
    // Still cheapest? (WOKEPOET-535): the quick rank (the bolt) runs one search
    // by name, instant buyout, cheapest first. One other seller asks less: 2nd.
    const hhCheck = listedRows.filter({ hasText: 'Headhunter' }).locator('[data-listed-check]')
    await listedRows.filter({ hasText: 'Headhunter' }).hover()
    await hhCheck.locator('[data-listed-quick]').click()
    await expect(hhCheck).toContainText('2nd', { timeout: 15_000 })
    expect(searches).toHaveLength(searchesBefore + 2)
    expect(searches.at(-1)).toContain('"name":"Headhunter"')
    await expect(panel.getByText('Undercut 1')).toBeVisible()
    // Rows nobody checked offer a price check; no search went out for them.
    await expect(listedRows.filter({ hasText: "Kaom's Heart" }).locator('[data-listed-check]')).toContainText('Price check')
    // A chip: the head names it and totals its rows (all three are uniques here).
    const head = panel.locator('[data-listed] [data-listed-total]')
    const allAsk = await head.innerText()
    await panel.locator('[data-listed]').getByText(/^Uniques 3$/).click()
    await expect(panel.locator('[data-listed-filtered]')).toHaveText('uniques')
    await expect(head).toHaveText(allAsk)
    await panel.locator('[data-listed]').getByText(/^Uniques 3$/).click()
    await expect(panel.locator('[data-listed-filtered]')).toHaveCount(0)
    // A listing is the shared line item: ⊘ leaves it out of the total (it
    // stays, struck, under a Changed chip), and counts it again.
    const kaom = listedRows.filter({ hasText: "Kaom's Heart" })
    await kaom.hover()
    await kaom.locator('[data-line-out]').click()
    await expect(kaom).toContainText('left out')
    await expect(panel.locator('[data-listed-left-out]')).toHaveText('1 left out')
    await expect(head).not.toHaveText(allAsk)
    await expect(panel.locator('[data-listed-changed]')).toContainText('Changed 1')
    await kaom.hover()
    await kaom.locator('[data-line-out]').click()
    await expect(kaom).not.toContainText('left out')
    await expect(head).toHaveText(allAsk)
    // Price check (R1, and Guy 2026-11-24): the full price check opens on the
    // listing, ranks it from what it loaded, and its foot sets a new price
    // that Listed keeps as a to-do.
    const hhRow = listedRows.filter({ hasText: 'Headhunter' })
    await hhRow.locator('[data-listed-reprice]').click()
    const priceBar = overlay.page.locator('[data-listed-bar]')
    await expect(priceBar).toBeVisible({ timeout: 20_000 })
    await expect(hhRow.locator('[data-listed-reprice]')).toHaveAttribute('title', /in your price check/, { timeout: 15_000 })
    // It names the listed item, with its tooltip, and where it sits at Faustus.
    await expect(priceBar.locator('[data-listed-bar-item]')).toHaveText('Headhunter')
    await expect(priceBar.locator('[data-listed-bar-tab]')).toHaveText('in Sell 1 · col 5, row 3')
    // The suggestions copy the cheapest other ask as its seller priced it.
    await expect(priceBar.locator('[data-listed-bar-match]')).toHaveText('Set 8 div (match cheapest)')
    await expect(priceBar.locator('[data-listed-bar-under]')).toHaveText('Set 7.9 div (under cheapest)')
    await priceBar.getByLabel('Your price', { exact: true }).fill('7')
    await priceBar.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(priceBar.locator('[data-listed-bar-target]')).toContainText('set 7 div')
    await expect(hhRow.locator('[data-listed-target]')).toContainText('7 div')
    // Closed by its own button (Esc would close the whole overlay).
    await overlay.page.locator('#price-window [data-price-close]').click()
    await expect(priceBar).toBeHidden()
    // Closing the price check gives the game focus back (the fake game takes
    // it when told), which hides the overlay: then open it again.
    await expect(panel).toBeHidden()
    fakeApp.focusGame(true)
    await overlay.pressHotkey(overlay.config.overlayKey)
    // (Its outer box measures 0 high after a reshow; its contents show.)
    await expect(panel.getByRole('tab', { name: 'Listed' })).toBeVisible()
    await overlay.snap('net worth listed')

    // Stale after 1 day: Headhunter is. The icon counts it only in your hideout.
    await panel.getByLabel('Stale after days').fill('1')
    const badge = overlay.dockIcon('net-worth').locator('[data-layout-ok^="the badge"]')
    await expect(panel.locator('[data-listed-stale]')).toContainText('1 unsold')
    await expect(badge).toHaveCount(0)
    await overlay.log([area('HideoutFelled', '1')])
    await expect(badge).toHaveText('1')
    // Out again before the hideout's quiet listings refresh (5 s).
    await overlay.log([area('MapWorldsStrand')])
    await expect(badge).toHaveCount(0)
    // What's new › Show me with Listed already up (it looked dead): it now
    // picks and flashes the feature itself, here the Stale chip.
    const news = overlay.dockIcon('whats-new')
    const showMe = async (id: string) => {
      const n = NEWS.find(n => n.id === id)!
      // Two workers share the app's port: its notice can sit over the dock.
      const notice = overlay.page.getByRole('button', { name: 'Dismiss', exact: true })
      if (await notice.isVisible()) await notice.click()
      await news.click()
      await overlay.page.mouse.move(5, 5)
      await news.locator('[data-whats-new-line]').filter({ hasText: n.note.replace(/^New: /, '').slice(1, 30) }).getByRole('button', { name: 'Show me' }).click()
    }
    const stale = panel.locator('[data-goto-spot="stale"]')
    await expect(stale).not.toHaveClass(/\bon\b/)
    await showMe('net-worth-listed')
    await expect(stale).toHaveClass(/\bon\b/)
    await expect(stale).toHaveAttribute('data-goto-flashed', '')
    await expect(listedRows).toHaveCount(1)
    await stale.click()
    await expect(listedRows).toHaveCount(3)
    await overlay.page.unroute('**/api/trade/search/**')
    await overlay.page.unroute('**/api/trade/fetch/**')
    await panel.getByRole('tab', { name: 'Holdings' }).click()
    // The box on At Faustus leaves your listings out of the total and back in.
    const total = panel.locator('[data-net-total]')
    const countBox = panel.locator('[data-count-listed]')
    await expect(countBox).toBeChecked()
    const withListed = await total.innerText()
    await countBox.click()
    await expect(countBox).not.toBeChecked()
    await expect(total).not.toHaveText(withListed)
    await countBox.click()
    await expect(countBox).toBeChecked()
    await expect(total).toHaveText(withListed)
    // The chart puts what's at Faustus on top of the stash as a band (pick
    // A), and only while the listings count in the total.
    const chart = panel.locator('[data-ledger-chart]').first()
    await expect(chart.locator('[data-listed-band]')).toHaveCount(1)
    // A legend under the line names its marks.
    await expect(panel.locator('[data-chart-legend]')).toContainText('At Faustus')
    await overlay.snap('net worth chart with the Faustus band')
    // The list of changes is the shared profit line too: hover shows ⊘ and ⋯
    // over the end of the name, taking no room of its own.
    const feedLine = panel.locator('[data-hold-line]').first()
    await expect(feedLine).toBeVisible()
    await feedLine.hover()
    await expect(feedLine.locator('[data-line-out]')).toBeVisible()
    await expect(feedLine.locator('[data-line-more]')).toBeVisible()
    await overlay.snap('net worth change line hover')
    await panel.locator('tr[data-nw-row]', { hasText: 'Divine Orb' }).hover()
    await overlay.snap('net worth table row hover')
    await overlay.page.mouse.move(0, 0)
    // A click on the line pins its card (what changed, with item tooltips); Esc closes it.
    const box = await chart.boundingBox()
    await chart.click({ position: { x: box!.width - 4, y: box!.height / 2 } })
    await expect(chart.locator('[data-chart-card]')).toContainText('Stash')
    await overlay.page.keyboard.press('Escape')
    await overlay.page.mouse.move(1, 1)
    await expect(chart.locator('[data-chart-card]')).toHaveCount(0)
    await countBox.click()
    await expect(chart.locator('[data-listed-band]')).toHaveCount(0)
    await countBox.click()

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
    // A sale is the shared line item: ⊘ leaves it out of the totals.
    const hhSale = rows.filter({ hasText: 'Headhunter' })
    await hhSale.hover()
    await hhSale.locator('[data-line-out]').click()
    await expect(hhSale).toContainText('left out')
    await expect(panel.locator('[data-sales-left-out]')).toHaveText('1 left out')
    await expect(panel.locator('[data-sales-changed]')).toContainText('Changed 1')
    await hhSale.hover()
    await hhSale.locator('[data-line-out]').click()
    await expect(panel.locator('[data-sales-left-out]')).toHaveCount(0)
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
