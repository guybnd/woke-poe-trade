// Stacked decks: cards from Client.txt counted into a session on the dock
// card, a big-hit popup, the session saved to Session analytics once it goes
// quiet, and the price check's open-or-sell chip.
import type { Page } from '@playwright/test'
import { test, expect, fixtureText } from './harness'

const TYPE = 'woke-stacked-decks'
const DENSE = '**/poe.ninja/poe1/api/economy/current/dense/overviews*'
// Each line has its own tick counter, as in the game's log.
let tick = 3725546
const card = (name: string) => `2026/11/08 18:04:11 ${tick++} 1186a8a3 [INFO Client 4567] : Card drawn from the deck: <divination>{${name}}`

// The fixture's prices (Divine Orb 180c, The Doctor 900c, Rain of Chaos 0.5c),
// with a Stacked Deck at 3c and The Lover at 1c.
async function routePrices (page: Page) {
  const dense = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
  const currency = dense.currencyOverviews.find((o: { type: string }) => o.type === 'Currency')
  currency.lines.push({ name: 'Stacked Deck', chaos: 3, graph: [0, 0, 0, 0, 0, 0, 0] })
  const cards = dense.itemOverviews.find((o: { type: string }) => o.type === 'DivinationCard')
  cards.lines.push({ name: 'The Lover', chaos: 1, graph: [0, 0, 0, 0, 0, 0, 0] })
  await page.route(DENSE, route => route.fulfill({ json: dense }))
}

// Every config has the tracker (Config.ts); this sets it up.
function tracker (extra: Record<string, unknown> = {}) {
  return (config: { widgets: Array<{ wmType: string }> }) => {
    const w = config.widgets.find(x => x.wmType === TYPE)
    if (!w) throw new Error('No Stacked decks widget in the default config')
    Object.assign(w, { session: null, seenUntil: 0, hitDiv: 1, hitPopup: true, hitSound: false, ...extra })
  }
}

test('cards from the log add up on the dock card, and a big hit pops up', async ({ overlay, page }) => {
  await routePrices(page)
  await overlay.boot({ patch: tracker() })
  const icon = overlay.dockIcon('stacked-decks')
  // Nothing on screen until the first card.
  await expect(icon).toHaveCount(0)

  await overlay.log([card('Rain of Chaos'), card('The Lover')])
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('stacked-decks')
  const stats = icon.locator('[data-deck="stats"]')
  await expect(stats.locator('[data-stat="opened"]')).toHaveText('2')
  // 2 decks at 3c, cards worth 1.5c.
  await expect(stats.locator('[data-stat="spent"]')).toHaveText('6 c', { timeout: 15_000 })
  await expect(stats.locator('[data-stat="got"]')).toHaveText('1.5 c')
  await expect(stats.locator('[data-stat="result"]')).toHaveText('-4.5 c')

  await overlay.log([card('The Doctor')])
  const hit = page.locator('[data-deck="big-hit"]')
  await expect(hit).toContainText('The Doctor')
  await expect(hit).toContainText('5 div')
  await expect(hit).toContainText('Deck 3')
  await overlay.snap('stacked decks big hit')

  await overlay.hoverDockIcon('stacked-decks')
  await expect(stats.locator('[data-stat="opened"]')).toHaveText('3')
  // 901.5c of cards for 9c: +892.5c, about 5 div; without the Doctor, -7.5c.
  await expect(stats.locator('[data-stat="result"]')).toHaveText('+5 div')
  await expect(stats.locator('[data-stat="without-top"]')).toHaveText('-7.5 c')
  await expect(icon.locator('[data-deck="card"]').first()).toContainText('The Doctor')
  await overlay.snap('stacked decks dock card')

  // Saved a moment after the last card.
  await expect.poll(() => overlay.savedWidget(TYPE)?.session?.draws, { timeout: 10_000 }).toEqual(['Rain of Chaos', 'The Lover', 'The Doctor'])

  // New session saves this one and takes the icon away until the next card.
  const newSession = icon.getByRole('button', { name: 'New session' })
  const box = await newSession.boundingBox()
  await overlay.moveMouse(Math.round(box!.x + box!.width / 2), Math.round(box!.y + box!.height / 2))
  await newSession.click()
  await expect(icon).toHaveCount(0)
  await overlay.log([card('Rain of Chaos')])
  await expect(icon).toBeVisible()
  await overlay.hoverDockIcon('stacked-decks')
  await expect(stats.locator('[data-stat="opened"]')).toHaveText('1')
})

test('a quiet session is saved and shows in Session analytics', async ({ overlay, page }) => {
  await routePrices(page)
  const longAgo = Date.now() - 20 * 60_000
  await overlay.boot({
    overlayActive: true,
    patch: tracker({
      seenUntil: longAgo,
      session: { id: 'deck-e2e', league: 'Testleague', startedAt: longAgo - 60_000, lastAt: longAgo, draws: ['The Apothecary', 'Rain of Chaos', 'Rain of Chaos'], deckChaos: 3, divine: 180 }
    }),
    widgets: [{ wmType: 'woke-session-analytics', wmWants: 'show' }]
  })
  // Over 15 minutes since its last card: saved, and the session is cleared.
  await expect.poll(() => overlay.savedWidget(TYPE)?.session, { timeout: 15_000 }).toBeNull()

  const panel = overlay.widget('woke-session-analytics')
  await panel.getByRole('tab', { name: 'Stacked decks' }).click()
  const history = panel.locator('[data-deck="history"]')
  // Saved sessions stay between tests: find this one by its best card.
  const row = history.locator('.w-row').filter({ hasText: 'The Apothecary' })
  // 1801c for 9c: +1792c, about 10 div.
  await expect(row).toContainText('+10 div', { timeout: 15_000 })
  await expect(row).toContainText('3')
  await overlay.snap('stacked decks history')
  await row.click()
  await expect(history.locator('[data-stat="opened"]')).toHaveText('3')
  await expect(history.locator('[data-deck="luck"]')).toContainText('a deck')
  await overlay.snap('stacked decks history session')
})

test('price check of a Stacked Deck says whether to open or sell', async ({ overlay, page }) => {
  await routePrices(page)
  await overlay.boot()
  await overlay.copyItem('items/currency-stacked-deck.txt')
  const chip = overlay.widget('price-check').locator('[data-deck="verdict"]')
  await expect(chip).toBeVisible({ timeout: 15_000 })
  await expect(chip).toContainText('/deck')
  await expect(chip).toContainText(/Open them|Sell them/)
})
