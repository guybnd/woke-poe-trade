// First-run help in the overlay (renderer/src/web/woke/tab-bar/welcome.ts):
// the welcome card on the first open after setup, then the rail's buttons
// named beside them for a few opens.
import { test, expect } from './harness'
import { NEWS } from '../../renderer/src/web/woke/tab-bar/news'

test('first open after setup: the welcome card, then the rail names its buttons', async ({ overlay, fakeApp }) => {
  await overlay.boot({ patch: c => { c.woke.welcome = { due: true, labelOpens: 2 } } })
  const page = overlay.page
  // Nothing while playing.
  await expect(page.locator('[data-welcome-card]')).toHaveCount(0)

  await overlay.pressHotkey(overlay.config.overlayKey)
  const card = page.locator('[data-welcome-card]')
  await expect(card).toBeVisible()
  await expect(card.getByText('Price the item under your cursor')).toBeVisible()
  await expect(card.locator('kbd', { hasText: 'Space' }).first()).toBeVisible()
  // Net worth is off: the card says where to turn it on.
  await expect(card.getByText(/Net worth tracks what your stash is worth/)).toBeVisible()
  await overlay.snap('welcome card beside the rail')
  // Hovering the buttons it points at keeps it up.
  await page.locator('[aria-label="All tools"]').hover()
  await page.waitForTimeout(400)
  await expect(card).toBeVisible()

  await card.getByRole('button', { name: 'Got it' }).click()
  await expect(card).toHaveCount(0)
  await expect.poll(() => fakeApp.readConfig()?.woke?.welcome?.due).toBe(false)
  // The names wait for the next open.
  const labels = page.locator('[data-rail-label]')
  await expect(labels).toHaveCount(0)

  // Two opens with the names, then none.
  for (let i = 0; i < 2; i++) {
    fakeApp.focusGame(true)
    await overlay.pressHotkey(overlay.config.overlayKey)
    await expect(labels).toHaveText(['All tools', 'Settings', /Search/])
    if (i === 0) await overlay.snap('rail buttons named')
  }
  fakeApp.focusGame(true)
  await overlay.pressHotkey(overlay.config.overlayKey)
  await expect(page.locator('[aria-label="All tools"]')).toBeVisible()
  await expect(labels).toHaveCount(0)
  await expect(card).toHaveCount(0)
})

test('opening a tool puts the welcome card away; Net worth opens its switch in Settings', async ({ overlay, fakeApp }) => {
  await overlay.boot({ overlayActive: true, patch: c => { c.woke.welcome = { due: true, labelOpens: 0 } } })
  const page = overlay.page
  const card = page.locator('[data-welcome-card]')
  await expect(card).toBeVisible()
  await card.locator('[data-welcome-net-worth]').click()
  await expect(card).toHaveCount(0)
  await expect(page.locator('[data-stash-reader]')).toBeVisible()
  await expect.poll(() => fakeApp.readConfig()?.woke?.welcome?.due).toBe(false)
})

test('players who updated get no welcome card', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  await expect(overlay.page.locator('[aria-label="All tools"]')).toBeVisible()
  await expect(overlay.page.locator('[data-welcome-card]')).toHaveCount(0)
  await expect(overlay.page.locator('[data-rail-label]')).toHaveCount(0)
})

// ---- What's new (tab-bar/news.ts) ----

test('All tools counts what is new; pointing at a tool clears its seal; Net worth is listed while off', async ({ overlay, fakeApp }) => {
  await overlay.boot({ overlayActive: true, whatsNew: true })
  const page = overlay.page
  const count = page.locator('[data-news-count]')
  const tools = new Set(NEWS.map(n => n.wmType)).size
  await expect(count).toHaveText(String(tools))
  await page.getByRole('button', { name: 'All tools' }).click()
  const row = (name: string) => page.locator('div').filter({ has: page.getByRole('button', { name, exact: true }) }).last()
  await expect(row('Net worth').locator('[data-news-seal]')).toBeVisible()
  await expect(row('Map mods').locator('[data-news-seal]')).toBeVisible()
  await overlay.snap('All tools with new seals')
  await page.getByRole('button', { name: 'Map mods', exact: true }).hover()
  await expect(page.getByText('a Planner tab for T17 maps', { exact: false })).toBeVisible()
  await expect(row('Map mods').locator('[data-news-seal]')).toHaveCount(0)
  await expect(count).toHaveText(String(tools - 1))
  // Net worth, off: its row goes to the switch in Settings, which asks first.
  await page.getByRole('button', { name: 'Net worth', exact: true }).click()
  await expect(page.locator('[data-stash-reader]')).toBeVisible()
  await expect.poll(() => fakeApp.readConfig()?.woke?.seenNews ?? []).toContain('map-mods-t17-planner')
})

test('a fresh install has nothing new', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  await expect(overlay.page.getByRole('button', { name: 'All tools' })).toBeVisible()
  await expect(overlay.page.locator('[data-news-count]')).toHaveCount(0)
})

// ---- Starter pins (tab-bar/tools.ts pickStarterPins) ----

test('a fresh install starts with tools on the rail, loaded only once clicked', async ({ overlay, fakeApp }) => {
  await overlay.boot({ overlayActive: true, patch: c => { c.woke.welcome = { due: true, labelOpens: 0 } } })
  const page = overlay.page
  const starters = page.locator('[data-starter-pin]')
  await expect(starters).toHaveCount(5)
  await expect(page.locator('[data-starter-pin="woke-market-tracker"]')).toBeVisible()
  // Nothing placed yet.
  expect(overlay.config.widgets.some((w: { wmType: string }) => w.wmType === 'woke-market-tracker')).toBe(false)
  await overlay.snap('starter pins on a fresh rail')

  await page.locator('[data-starter-pin="woke-market-tracker"]').click()
  await expect(page.getByRole('button', { name: 'Market', exact: true })).toHaveClass(/open/)
  await expect(starters).toHaveCount(4)
  await expect.poll(() => {
    const c = fakeApp.readConfig()
    const market = c?.widgets.find((w: { wmType: string }) => w.wmType === 'woke-market-tracker')
    const menu = c?.widgets.find((w: { wmType: string }) => w.wmType === 'menu')
    return !!market && menu.pinned.includes(market.wmId) && !menu.starterPins.includes('woke-market-tracker')
  }).toBe(true)
})

test('a starter tool a fresh config already places is pinned at once', async ({ overlay }) => {
  // Leveling picks: Regex library is in the five, and a fresh config places it.
  await overlay.boot({ overlayActive: true, off: ['market', 'map-mods', 'atlas', 'trade', 'scarab-flip', 'trade-searches'], patch: c => { c.woke.welcome = { due: true, labelOpens: 0 } } })
  const page = overlay.page
  await expect(page.locator('[data-starter-pin]')).toHaveCount(4)
  await expect(page.locator('[data-starter-pin="woke-regex-library"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Regex library', exact: true })).toBeVisible()
})

test('players who updated keep their rail as it was', async ({ overlay }) => {
  await overlay.boot({ overlayActive: true })
  await expect(overlay.page.getByRole('button', { name: 'All tools' })).toBeVisible()
  await expect(overlay.page.locator('[data-starter-pin]')).toHaveCount(0)
})
