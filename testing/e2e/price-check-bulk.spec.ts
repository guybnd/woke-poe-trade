// Bulk in the price check results: only sellers with 2+ copies at a price. Opening
// a check never fetches extra pages; the Bulk click does, until 10 sellers show.
import { readFileSync } from 'fs'
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
const ITEMS: unknown[] = JSON.parse(readFileSync(new URL('../fixtures/trade/listing-tiers.json', import.meta.url), 'utf-8'))
const TOTAL = 60

// The first 20 listings are one copy each; from 20 on, each seller lists two.
function listing (i: number) {
  const bulk = i >= 20
  const seller = bulk ? `bulk${Math.floor(i / 2)}` : `solo${i}`
  return {
    id: `r${i}`,
    item: ITEMS[0],
    listing: {
      indexed: new Date().toISOString(),
      fee: 1,
      price: { amount: bulk ? 40 + Math.floor(i / 2) : 30 + i, currency: 'chaos' },
      account: { name: seller, lastCharacterName: `${seller}c` }
    }
  }
}

async function fakeTrade (page: Page) {
  const fetches: string[][] = []
  const searches: number[] = []
  await page.route('**/api/trade/search/**', (route) => {
    searches.push(1)
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

// Runs in the default improved view: one row per price, ×2 on a pair.
test('Bulk shows only multi-copy sellers and loads more pages on the click', async ({ overlay }) => {
  const fetches = await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  const foot = panel.locator('.w-pc-foot')
  await expect(foot).toContainText('20 of 60 listings')
  // Opening the check fetched only the usual two pages.
  expect(fetches).toHaveLength(2)

  const bulk = panel.getByRole('button', { name: 'Bulk', exact: true })
  await expect(bulk).toHaveAttribute('aria-pressed', 'false')
  await bulk.click()
  await expect(bulk).toHaveAttribute('aria-pressed', 'true')
  // Two more pages bring ten bulk sellers, then it stops.
  await expect(foot).toContainText('10 bulk sellers in 40 of 60 listings')
  expect(fetches).toHaveLength(4)
  const rows = panel.locator('.w-pc-table tbody tr:not(.w-pc-yours)')
  await expect(rows).toHaveCount(10)
  await expect(rows.first()).toContainText('×2')
  await overlay.snap('price check bulk only')

  // Off shows every listing again, with nothing more fetched.
  await bulk.click()
  await expect(foot).toContainText('40 of 60 listings')
  await expect(foot).not.toContainText('bulk')
  // On again: already enough, so no fetch.
  await bulk.click()
  await expect(foot).toContainText('10 bulk sellers')
  expect(fetches).toHaveLength(4)
  expect(overlay.errors).toEqual([])
})

test('Search bulk: one search, Bulk on, more pages loaded right away', async ({ overlay }) => {
  const fetches = await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search bulk' }).click()
  const foot = panel.locator('.w-pc-foot')
  await expect(foot).toContainText('10 bulk sellers in 40 of 60 listings')
  await expect(panel.getByRole('button', { name: 'Bulk', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(fetches.searches).toHaveLength(1)
  expect(fetches).toHaveLength(4)
  await overlay.snap('price check search bulk')
  expect(overlay.errors).toEqual([])
})
