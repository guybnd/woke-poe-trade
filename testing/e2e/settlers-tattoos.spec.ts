// Settlers: the Flips Tattoos tab (one row per tribe, 3 of a tribe for 1) and
// League mechanics' Settlers tab, on recorded prices plus Tattoo rows.
import type { Page } from '@playwright/test'
import { test, expect, fixtureText } from './harness'

test.describe.configure({ mode: 'parallel' })

const DENSE = '**/poe.ninja/poe1/api/economy/current/dense/overviews*'
const EXCHANGE = '**/poe.ninja/poe1/api/economy/exchange/current/overview*'

const TATTOOS: Array<[string, number]> = [
  ['Tattoo of the Kitava Blood Drinker', 60],
  ['Tattoo of the Kitava Heart Eater', 10],
  ['Tattoo of the Kitava Makanga', 8],
  ['Tattoo of the Kitava Shaman', 6],
  ['Tattoo of the Kitava Warrior', 4],
  ['Tattoo of the Kitava Rebel', 2],
  // Ngamahu has 4 Tattoos without a price.
  ['Tattoo of the Ngamahu Warrior', 6],
  ['Tattoo of the Ngamahu Woodcarver', 3],
  ['Journey Tattoo of the Body', 50]
]
const RUNEGRAFTS: Array<[string, number]> = [
  ['Runegraft of the Jeweller', 85],
  ['Runegraft of Bellows', 3]
]

async function routePrices (overlay: { page: Page }) {
  const dense = JSON.parse(fixtureText('http/poe.ninja/poe1/api/economy/current/dense/overviews.json'))
  dense.itemOverviews.push(
    { type: 'Tattoo', lines: TATTOOS.map(([name, chaos]) => ({ name, chaos, graph: [] })) },
    { type: 'Runegraft', lines: RUNEGRAFTS.map(([name, chaos]) => ({ name, chaos, graph: [] })) }
  )
  await overlay.page.route(DENSE, route => route.fulfill({ json: dense }))
  // No exchange feed: prices come from the dense overview, with no volume.
  await overlay.page.route(EXCHANGE, route => route.fulfill({ status: 404, body: '' }))
}

test('flips: the Tattoos tab ranks tribes by 3 for 1 and opens a tribe', async ({ overlay }) => {
  await routePrices(overlay)
  await overlay.boot({ overlayActive: true, widgets: [{ wmType: 'woke-scarab-flip', wmWants: 'show' }] })
  const panel = overlay.widget('woke-scarab-flip')
  await panel.getByRole('tab', { name: 'Tattoos', exact: true }).click()

  const verdict = panel.locator('[data-flip-tribes]')
  await expect(verdict).toContainText('Best 3 for 1: Kitava')
  await expect(panel.getByText(/^No one has measured the odds/)).toBeVisible()
  // Kitava averages 15c; 3 Rebels at 2c make (15 - 6) / 3 each.
  const kitava = panel.locator('[data-tribe="Kitava"]')
  await expect(kitava).toContainText('Rebel 2c')
  await expect(kitava).toContainText('+3c')
  // Its 4 unpriced Tattoos count at its cheapest, 3c: (21 / 6 - 9) / 3.
  const ngamahu = panel.locator('[data-tribe="Ngamahu"]')
  await expect(ngamahu).toContainText('4 unpriced')
  await expect(ngamahu).toContainText('−1.8c')
  await overlay.snap('flips-tattoo-tribes')

  await kitava.click()
  await expect(panel.getByText('Kitava Blood Drinker', { exact: true })).toBeVisible()
  await expect(panel.getByText('17%').first()).toBeVisible()
  await overlay.snap('flips-tattoo-tribe-open')
})

test('league mechanics: the Settlers tab lists Tattoos by tribe and Runegrafts', async ({ overlay }) => {
  await routePrices(overlay)
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }], overlayActive: true })
  const widget = overlay.widget('woke-mechanics')
  await overlay.widget('menu').getByRole('button', { name: 'All tools' }).click()
  await overlay.page.getByRole('button', { name: /League mechanics/ }).first().click()
  await widget.getByRole('tablist').getByRole('tab', { name: 'Settlers' }).click()

  // The Best line names it in full; its row drops "Tattoo of the".
  await expect(widget.locator('.w-row').getByText('Kitava Blood Drinker', { exact: true })).toBeVisible()
  await expect(widget.getByText('Runegraft of the Jeweller', { exact: true })).toBeVisible()
  await expect(widget.locator('.w-row').getByText('Journey Tattoo of the Body', { exact: true })).toBeVisible()
  await widget.getByTitle('Show only Ngamahu').click()
  await expect(widget.locator('.w-row').getByText('Ngamahu Warrior', { exact: true })).toBeVisible()
  await expect(widget.locator('.w-row').getByText('Kitava Blood Drinker', { exact: true })).toHaveCount(0)
  await overlay.snap('mechanics-settlers')
})
