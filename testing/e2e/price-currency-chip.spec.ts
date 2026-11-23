// The currency chip in the price check results (beside Bulk): All / Chaos / Divine.
// It filters the listings already loaded and never searches; with too few in a
// currency it loads more pages of the same search, as Bulk does.
import { readFileSync } from 'fs'
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
const ITEMS: unknown[] = JSON.parse(readFileSync(new URL('../fixtures/trade/listing-tiers.json', import.meta.url), 'utf-8'))
const TOTAL = 60

// Every fourth listing asks divines; the rest ask chaos.
function listing (i: number) {
  const divine = i % 4 === 3
  return {
    id: `r${i}`,
    item: ITEMS[0],
    listing: {
      indexed: new Date().toISOString(),
      fee: 1,
      price: divine ? { amount: 2 + i / 10, currency: 'divine' } : { amount: 30 + i, currency: 'chaos' },
      account: { name: `s${i}`, lastCharacterName: `s${i}c` }
    }
  }
}

async function fakeTrade (page: Page) {
  const fetches: string[][] = []
  const searches: any[] = []
  await page.route('**/api/trade/search/**', (route) => {
    searches.push(route.request().postDataJSON())
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ id: 'q', total: TOTAL, result: Array.from({ length: TOTAL }, (_, i) => `r${i}`) })
    })
  })
  await page.route('**/api/trade/fetch/**', (route) => {
    const ids = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!).split(',')
    fetches.push(ids)
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ result: ids.map(id => listing(Number(id.slice(1)))) })
    })
  })
  return Object.assign(fetches, { searches })
}

test('currency chip: Chaos, then Divine, filters the loaded listings without a search', async ({ overlay }) => {
  const fetches = await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  const foot = panel.locator('.w-pc-foot')
  await expect(foot).toContainText('20 of 60 listings')
  expect(fetches).toHaveLength(2)

  const chip = panel.locator('[data-currency-chip]')
  const coins = panel.locator('.w-pc-table tbody tr:not(.w-pc-yours) .w-pc-coin')
  await expect(chip).toHaveAttribute('data-step', 'all')
  await expect(chip).toHaveAttribute('title', /^Showing listings in (chaos and divines|every currency)\./)
  const width = (await chip.boundingBox())!.width

  // Hover: the chip says what it does; rows still show the item tooltip.
  await chip.hover()
  await expect(chip).toHaveAttribute('title', /without a new search/)

  // Chaos: 15 of the 20 loaded ask chaos, enough, so nothing more is fetched.
  await chip.click()
  await expect(chip).toHaveAttribute('data-step', 'chaos')
  await expect(chip).toHaveAttribute('data-step', 'chaos')
  await expect(foot).toContainText('15 in chaos · 20 of 60 listings')
  await expect(coins.first()).toHaveAttribute('alt', 'chaos')
  expect(await coins.evaluateAll(els => els.every(el => el.getAttribute('alt') === 'chaos'))).toBe(true)
  expect(fetches).toHaveLength(2)
  expect(Math.abs((await chip.boundingBox())!.width - width)).toBeLessThan(1)

  // Divine: only 5 loaded, so it fetches pages of the same search until 10 show.
  await chip.click()
  await expect(chip).toHaveAttribute('data-step', 'divine')
  await expect(foot).toContainText('10 in divines · 40 of 60 listings')
  expect(fetches).toHaveLength(4)
  expect(await coins.evaluateAll(els => els.every(el => el.getAttribute('alt') === 'divine'))).toBe(true)
  const row = panel.locator('.w-pc-table tbody tr:not(.w-pc-yours)').first()
  await row.hover()
  await expect(overlay.page.getByRole('tooltip')).toBeVisible()
  await overlay.snap('price check divine only')
  // The listed time is coloured by age: these were all listed just now.
  await expect(row.locator('td.w-pc-age')).toHaveClass(/w-pc-age-new/)
  expect(await row.locator('td.w-pc-age').evaluate(el => getComputedStyle(el).color)).not.toBe(await panel.locator('.w-pc-matched').evaluate(el => getComputedStyle(el).color))

  // All again: every listing, no search spent at any step.
  await chip.click()
  await expect(chip).toHaveAttribute('data-step', 'all')
  await expect(foot).toContainText('40 of 60 listings')
  await expect(foot).not.toContainText('divines')
  expect(fetches.searches).toHaveLength(1)
  await expect(chip).toHaveAttribute('aria-label', 'Listing currency: All')

  // A new search starts on All, as Bulk starts off.
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await panel.locator('button.w-icon-btn').filter({ has: overlay.page.locator('.fa-sync-alt') }).click()
  await expect.poll(() => fetches.searches.length).toBe(2)
  await expect(chip).toHaveAttribute('data-step', 'all')
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  expect(overlay.errors).toEqual([])
})

// The trade site's own divine rate can sort every divine listing ahead of cheaper
// chaos ones. Opening the check then keeps fetching pages (never searching) until
// a chaos listing shows, so the cheapest chaos listing makes the table.
test('only divines on the first pages: later pages load until a chaos listing shows', async ({ overlay }) => {
  const fetches: string[][] = []
  const searches: number[] = []
  await overlay.page.route('**/api/trade/search/**', (route) => {
    searches.push(1)
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ id: 'q', total: TOTAL, result: Array.from({ length: TOTAL }, (_, i) => `r${i}`) })
    })
  })
  // r0..r34 ask 2 div and up; from r35 on, chaos from 337c.
  await overlay.page.route('**/api/trade/fetch/**', (route) => {
    const ids = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!).split(',')
    fetches.push(ids)
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({
        result: ids.map(id => {
          const i = Number(id.slice(1))
          const row = listing(i)
          row.listing.price = i < 35 ? { amount: 2 + i / 10, currency: 'divine' } : { amount: 337 + i, currency: 'chaos' }
          return row
        })
      })
    })
  })
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  // Pages of ten until r35..r39 arrive: 40 loaded, one search.
  await expect(panel.locator('.w-pc-foot')).toContainText('40 of 60 listings')
  expect(fetches).toHaveLength(4)
  expect(searches).toHaveLength(1)
  const chip = panel.locator('[data-currency-chip]')
  await chip.click()
  await expect(panel.locator('.w-pc-foot')).toContainText('5 in chaos')
  expect(overlay.errors).toEqual([])
})
