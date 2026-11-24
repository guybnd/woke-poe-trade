// What's new in the dock (renderer/src/web/woke/dock/WhatsNew.vue): players
// who update see what's new while they play, can open each feature, and
// dismiss each line.
import { test, expect } from './harness'
import { NEWS } from '../../renderer/src/web/woke/tab-bar/news'
import { gotoTargets } from '../../renderer/src/web/woke/tab-bar/goto-targets'
import { NEWS_DEMOS } from '../../renderer/src/web/woke/tab-bar/news-demos'

test('players who update get a What\'s new icon in the dock; a hover lists the lines', async ({ overlay }) => {
  await overlay.boot({ whatsNew: true })
  const icon = overlay.dockIcon('whats-new')
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('whats-new')
  await expect(icon.locator('[data-whats-new-line]')).toHaveCount(NEWS.length)
  await expect(icon).toContainText('Map mods')
  await overlay.snap('what\'s new card in the dock')
})

test('with the overlay open: Show me opens the tool, dismiss takes a line off, the last one takes the icon', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, whatsNew: true })
  const icon = overlay.dockIcon('whats-new')
  await icon.click()
  await overlay.page.mouse.move(5, 5)
  const lines = icon.locator('[data-whats-new-line]')
  await expect(lines).toHaveCount(NEWS.length)

  await lines.filter({ hasText: 'Atlas strategies' }).first().locator('[data-whats-new-dismiss]').click()
  await expect(lines).toHaveCount(NEWS.length - 1)

  await lines.filter({ hasText: 'Planner tab for T17' }).getByRole('button', { name: 'Show me' }).click()
  await expect(lines).toHaveCount(NEWS.length - 2)
  await expect(overlay.page.getByRole('button', { name: 'Map mods', exact: true })).toHaveClass(/open/)

  // Net worth's reader is off: its line still shows, with nothing to show, so no
  // Show me (Guy: show it, or don't offer to). Dismiss all takes the icon.
  await expect(lines.filter({ hasText: 'Net worth' }).first()).toBeVisible()
  await expect(lines.filter({ hasText: 'Net worth' }).getByRole('button', { name: 'Show me' })).toHaveCount(0)
  await icon.locator('[data-whats-new-dismiss-all]').click()
  await expect(icon).toHaveCount(0)
})

test('a fresh install gets no What\'s new icon, even before setup is finished', async ({ overlay }) => {
  await overlay.boot({ firstRun: true, whatsNew: true })
  await overlay.page.waitForTimeout(1000)
  await expect(overlay.dockIcon('whats-new')).toHaveCount(0)
})

// Every line's Show me lands on the tab it names (tab-bar/goto.ts). Net worth's
// lines have none here, since the stash reader is off (tested below with it on).
for (const n of NEWS.filter(n => n.goto && n.wmType !== 'woke-net-worth' && !NEWS_DEMOS[n.id])) {
  test(`Show me on "${n.id}" opens ${n.name} on its tab`, async ({ overlay }) => {
    await overlay.boot({ overlayActive: true, whatsNew: true })
    const icon = overlay.dockIcon('whats-new')
    await icon.click()
    await overlay.page.mouse.move(5, 5)
    const line = icon.locator('[data-whats-new-line]').filter({ hasText: n.note.replace(/^New: /, '').slice(1, 30) })
    await line.getByRole('button', { name: 'Show me' }).click()
    const label = gotoTargets(n.wmType)![n.goto!]
    await expect(overlay.page.getByRole('tab', { name: label, selected: true }).first()).toBeVisible()
  })
}

test('Show me on a switched-off tool turns it on and opens the line\'s tab', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, whatsNew: true, off: ['map-mods'] })
  const icon = overlay.dockIcon('whats-new')
  await icon.click()
  await overlay.page.mouse.move(5, 5)
  await icon.locator('[data-whats-new-line]').filter({ hasText: 'Planner tab for T17' }).getByRole('button', { name: 'Show me' }).click()
  await expect(overlay.page.getByRole('tab', { name: 'Planner', selected: true }).first()).toBeVisible()
})

test('with the stash reader on, each Net worth line\'s Show me opens its tab', async ({ overlay, fakeApp }) => {
  fakeApp.site.reply = (url) => new URL(url).pathname === '/my-account'
    ? { status: 200, body: '<html><title>View Profile - Path of Exile - Tester#1234</title></html>' }
    : null
  await overlay.boot({ overlayActive: true, whatsNew: true })
  await overlay.widget('menu').locator('.fa-cog').click()
  const settings = overlay.widget('settings')
  await settings.getByText('All modules', { exact: true }).first().click()
  await settings.getByRole('switch', { name: 'Net worth' }).click()
  await settings.getByRole('button', { name: 'Turn on' }).click()
  await expect(settings.getByRole('switch', { name: 'Net worth' })).toHaveAttribute('aria-checked', 'true')
  await settings.getByTitle('Close').first().click()
  await expect(settings).toBeHidden()

  const icon = overlay.dockIcon('whats-new')
  for (const n of NEWS.filter(n => n.wmType === 'woke-net-worth' && n.goto)) {
    if (!await icon.locator('[data-whats-new-line]').first().isVisible()) {
      await icon.click()
      await overlay.page.mouse.move(5, 5)
    }
    const line = icon.locator('[data-whats-new-line]').filter({ hasText: n.note.replace(/^New: /, '').slice(1, 30) })
    await line.getByRole('button', { name: 'Show me' }).click()
    const label = gotoTargets(n.wmType)![n.goto!]
    await expect(overlay.page.getByRole('tab', { name: label, selected: true }).first(), n.id).toBeVisible()
  }
})

// Lines with no tab to open run a sample: a price check that shows the
// feature (one exchange search, from the click), or Ctrl+Space with a map typed.
test('Show me on a price check line opens a sample check and flashes the feature', async ({ overlay }) => {
  const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
  const searches: string[] = []
  await overlay.page.route('**/api/trade/exchange/**', (route) => {
    searches.push(route.request().postData() ?? '')
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      item: null,
      listing: {
        indexed: new Date().toISOString(),
        account: { name: `x${i}#1`, lastCharacterName: `x${i}c`, online: { league: 'Testleague' } },
        offers: [{ exchange: { currency: 'chaos', amount: i < 14 ? 170 : 180 + i, whisper: '' }, item: { currency: 'exalted', amount: 1, stock: 5 + i, id: `x${i}`, whisper: '' } }],
        whisper: ''
      }
    }))
    return route.fulfill({ contentType: 'application/json', headers: LIMITS, body: JSON.stringify({ id: 'xq', total: 20, result: Object.fromEntries(rows.map(r => [r.id, r])) }) })
  })
  await overlay.boot({ overlayActive: true, whatsNew: ['price-check-seller-spread'] })
  const icon = overlay.dockIcon('whats-new')
  await icon.click()
  await overlay.page.mouse.move(5, 5)
  await icon.locator('[data-whats-new-line]').getByRole('button', { name: 'Show me' }).click()
  const spread = overlay.widget('price-check').locator('[data-goto-spot="seller-spread"]')
  await expect(spread).toContainText('Sellers ask')
  await expect(spread).toHaveAttribute('data-goto-flashed', '')
  expect(searches.length).toBeGreaterThan(0)
})

test('Show me on the map cards line opens Ctrl+Space with a map typed', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, whatsNew: ['div-card-map-chance'] })
  const icon = overlay.dockIcon('whats-new')
  await icon.click()
  await overlay.page.mouse.move(5, 5)
  await icon.locator('[data-whats-new-line]').getByRole('button', { name: 'Show me' }).click()
  await expect(overlay.widget('woke-search').getByRole('textbox', { name: 'Search', exact: true })).toHaveValue('Strand Map')
})

// A unique's side list: its upgrade, or the other parts of its recipe. Read
// from the item data, so no search runs for it.
for (const [id, shows] of [['price-check-related-upgrades', "Xoph's Nurture"], ['price-check-unique-recipe', 'Lost Unity']] as const) {
  test(`Show me on "${id}" opens a sample check with its side list flashed`, async ({ overlay }) => {
    await overlay.boot({ overlayActive: true, whatsNew: [id] })
    const icon = overlay.dockIcon('whats-new')
    await icon.click()
    await overlay.page.mouse.move(5, 5)
    await icon.locator('[data-whats-new-line]').getByRole('button', { name: 'Show me' }).click()
    const side = overlay.widget('price-check').locator('[data-goto-spot="related"]')
    await expect(side).toContainText(shows)
    await expect(side).toHaveAttribute('data-goto-flashed', '')
  })
}

test('a line with nothing to show has no Show me, only dismiss', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true, whatsNew: ['price-check-ninja-trust'] })
  const icon = overlay.dockIcon('whats-new')
  await icon.click()
  await overlay.page.mouse.move(5, 5)
  const line = icon.locator('[data-whats-new-line]')
  await expect(line).toHaveCount(1)
  await expect(line.getByRole('button', { name: 'Show me' })).toHaveCount(0)
  await expect(line.locator('[data-whats-new-dismiss]')).toBeVisible()
})

