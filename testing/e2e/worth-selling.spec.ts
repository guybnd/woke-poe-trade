// Net worth's Worth selling: a holding that has been falling all week, held
// for 1 div or more, shows under the table's Falling chip with its item tooltip, and
// Ctrl+Space answers "sell" with the same list. Every row goes through the
// tooltip gate (tip-audit.ts).
import fs from 'fs'
import path from 'path'
import { test, expect, FIXTURES, fixtureText } from './harness'

const LIST = fs.readFileSync(path.join(FIXTURES, 'stash/tab-list.json'), 'utf8')
const DUMP = fs.readFileSync(path.join(FIXTURES, 'stash/tab-dump.json'), 'utf8')
const DENSE = '**/poe.ninja/poe1/api/economy/current/dense/overviews*'

test('a holding falling all week shows under the Falling chip and in Ctrl+Space', async ({ overlay, fakeApp }) => {
  test.setTimeout(60_000)
  // The fixture's prices, with Headhunter (50 div) down 20% today and 40% on the week.
  const dense = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
  for (const o of [...dense.currencyOverviews, ...dense.itemOverviews]) {
    for (const l of o.lines) if (l.name === 'Headhunter') l.graph = [0, -5, -10, -15, -20, -25, -40]
  }
  await overlay.page.route(DENSE, route => route.fulfill({ json: dense }))
  fakeApp.site.reply = (url) => {
    const u = new URL(url)
    if (u.pathname === '/my-account') return { status: 200, body: '<html><title>View Profile - Path of Exile - Tester#1234</title></html>' }
    if (u.pathname === '/character-window/get-stash-items') return { status: 200, body: u.searchParams.get('tabIndex') === '0' ? LIST : DUMP }
    if (u.pathname.startsWith('/api/trade/history/')) return { status: 200, body: JSON.stringify({ result: [] }) }
    return null
  }
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ overlayActive: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('All modules', { exact: true }).first().click()
  // Settled first (as in net-worth.spec): a click while the page is still
  // loading was lost on a loaded runner, so Turn on never showed. The fake
  // app is shared by a worker's tests, so the reader may already be on, its
  // tabs picked (net-worth.spec ran first).
  const reader = settings.getByRole('switch', { name: 'Net worth' })
  await expect(reader).toBeVisible()
  await expect(reader).toHaveAttribute('aria-checked', /true|false/)
  const wasOn = await reader.getAttribute('aria-checked') === 'true'
  if (!wasOn) {
    const turnOn = settings.getByRole('button', { name: 'Turn on' })
    await expect(async () => {
      if (!await turnOn.isVisible()) await reader.click()
      await expect(turnOn).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 20_000 })
    await turnOn.click()
    await expect(reader).toHaveAttribute('aria-checked', 'true')
  }
  await expect(settings.getByText('Signed in as Tester#1234')).toBeVisible()
  await settings.getByTitle('Close').first().click()

  await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
  await overlay.page.getByRole('button', { name: /Net worth/ }).first().click()
  // The tab picker on a first read; the Holdings view when tabs are picked.
  const page = overlay.page
  let panelId = ''
  await expect(async () => {
    for (const id of await page.locator('[id^="widget-"]').evaluateAll(els => els.map(e => e.id))) {
      const w = page.locator(`#${id}`)
      if (await w.getByText('Tabs to read').isVisible() || await w.getByRole('button', { name: 'Refresh' }).isVisible()) { panelId = id; return }
    }
    throw new Error('Net worth window not open yet')
  }).toPass({ timeout: 20_000 })
  const panel = page.locator(`#${panelId}`)
  if (await panel.getByText('Tabs to read').isVisible()) {
    await panel.getByRole('checkbox', { name: /Dump/ }).check()
    await panel.getByRole('button', { name: 'Read these tabs' }).click()
  } else {
    await panel.getByRole('button', { name: 'Refresh' }).click()
  }
  await expect(panel.getByText('Headhunter').first()).toBeVisible({ timeout: 20_000 })

  // The Falling chip on the table: only what's worth selling, with a 7d column.
  const chip = panel.locator('[data-nw-falling]')
  await expect(chip).toHaveText('Falling 1')
  const rows = panel.locator('[data-nw-row]')
  const all = await rows.count()
  expect(all).toBeGreaterThan(1)
  await chip.click()
  // Steady items aren't listed.
  await expect(rows).toHaveCount(1)
  const row = rows.first()
  await expect(row).toContainText('Headhunter')
  await expect(row.locator('[data-nw-week]')).toHaveText('−40.0%')
  await row.locator('[data-item-tip]').first().hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Headhunter')
  await overlay.snap('worth selling')
  await overlay.page.mouse.move(0, 0)
  // Off again: every item, no 7d column.
  await chip.click()
  await expect(rows).toHaveCount(all)
  await expect(panel.locator('[data-nw-week]')).toHaveCount(0)

  // Ctrl+Space reads the list the read saved. With the overlay open, typing
  // opens it.
  const search = overlay.widget('woke-search')
  await search.waitFor({ state: 'attached', timeout: 15_000 })
  const box = search.getByRole('textbox', { name: 'Search', exact: true })
  await overlay.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await overlay.page.keyboard.type('sell', { delay: 60 })
  await expect(box).toHaveValue('sell')
  const answer = search.getByRole('button', { name: /Worth selling: 1 item falling/ }).first()
  await expect(answer).toBeVisible({ timeout: 10_000 })
  await answer.click()
  await expect(search).toContainText('−20% · 7d −40%')
  await overlay.snap('worth selling search')
})
