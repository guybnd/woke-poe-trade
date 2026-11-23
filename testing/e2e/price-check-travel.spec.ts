// The travel door on instant buyout rows: hovering anywhere on the row slides
// it out to read "Travel", drawn over the count beside it, so nothing moves.
import { readFileSync } from 'fs'
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
const ITEMS: unknown[] = JSON.parse(readFileSync(new URL('../fixtures/trade/listing-tiers.json', import.meta.url), 'utf-8'))

// A hideout token the app reads as good for an hour.
function token (i: number) {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 3600, n: i })}.x`
}

// r0..r2 are instant buyouts, r3 a stash listing (no door), r4..r16 one seller
// at one price (a ×13 row with a door).
function listing (i: number) {
  const stash = i === 3
  const bulk = i >= 4
  const seller = bulk ? 'bulky' : `solo${i}`
  return {
    id: `r${i}`,
    item: ITEMS[0],
    listing: {
      indexed: new Date().toISOString(),
      ...(stash ? {} : { fee: 1, hideout_token: token(i) }),
      price: { amount: bulk ? 45 : 30 + i, currency: 'chaos' },
      account: { name: seller, lastCharacterName: `${seller}c` }
    }
  }
}

async function fakeTrade (page: Page, total = 17, make = listing) {
  const whispers: Array<{ token: string }> = []
  await page.route('**/api/trade/search/**', route => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total, result: Array.from({ length: total }, (_, i) => `r${i}`) })
  }))
  await page.route('**/api/trade/fetch/**', (route) => {
    const ids = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!).split(',')
    return route.fulfill({
      contentType: 'application/json',
      headers: LIMITS,
      body: JSON.stringify({ result: ids.map(id => make(Number(id.slice(1)))) })
    })
  })
  await page.route('**/api/trade/whisper', (route) => {
    whispers.push(JSON.parse(route.request().postData() ?? '{}'))
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })
  return whispers
}

test('hovering a buyout row slides its door out to "Travel" without moving anything', async ({ overlay }) => {
  const whispers = await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  const rows = panel.locator('.w-pc-table tbody tr:not(.w-pc-yours)')
  const bulkRow = rows.filter({ hasText: '×13' })
  await expect(bulkRow).toHaveCount(1)
  const stashRow = rows.filter({ has: overlay.page.locator('img[src="/images/stash.png"]') })
  await expect(stashRow).toHaveCount(1)
  await expect(stashRow.locator('.w-pc-travel')).toHaveCount(0)

  const door = bulkRow.locator('.w-pc-travel')
  const label = door.locator('.w-pc-travel-label')
  const count = bulkRow.locator('.w-pc-count-n')
  await expect(label).toBeHidden()
  const before = { door: await door.boundingBox(), count: await count.boundingBox(), row: await bulkRow.boundingBox() }

  // Hover the row's price, away from the door.
  await bulkRow.locator('.w-pc-price').hover()
  await expect(label).toBeVisible()
  await expect(label).toHaveText('Travel')
  // Nothing moved: the door keeps its box, the count and the row theirs.
  expect(await door.boundingBox()).toEqual(before.door)
  expect(await count.boundingBox()).toEqual(before.count)
  expect(await bulkRow.boundingBox()).toEqual(before.row)
  // The face stays inside its own cell, over the count, not the next column.
  const face = await door.locator('.w-pc-travel-face').boundingBox()
  const cell = await bulkRow.locator('td').nth(1).boundingBox()
  expect(face!.x + face!.width).toBeLessThanOrEqual(cell!.x + cell!.width)
  expect(face!.width).toBeGreaterThan(before.door!.width)
  // Only the hovered row says Travel.
  await expect(panel.locator('.w-pc-travel-label:visible')).toHaveCount(1)
  await overlay.snap('price check travel on row hover')

  // The face stays inside the zone it covers (door and count).
  const zone = await bulkRow.locator('.w-pc-travel-zone').boundingBox()
  expect(face!.x + face!.width).toBeLessThanOrEqual(zone!.x + zone!.width + 0.5)

  // Clicking the slid-out label travels.
  await bulkRow.locator('.w-pc-price').hover()
  await label.click()
  await expect(bulkRow.locator('.w-pc-travel-note')).toHaveText('Travelling…')
  expect(whispers).toHaveLength(1)
  // It sent the ×13 row's own pass (one of r4..r16).
  const n = JSON.parse(Buffer.from(whispers[0].token.split('.')[1], 'base64url').toString()).n
  expect(n).toBeGreaterThanOrEqual(4)
  expect(overlay.errors).toEqual([])
})

// No row with a count: the face must not cover the Corrupted tag after the door.
test('with no count column, the slid-out door leaves the Corrupted tag clear', async ({ overlay }) => {
  const item = ITEMS[0] as Record<string, unknown>
  await fakeTrade(overlay.page, 3, i => ({
    ...listing(i),
    item: i === 1 ? { ...item, corrupted: true } : item,
    listing: { ...listing(i).listing, fee: 1, hideout_token: token(i), account: { name: `solo${i}`, lastCharacterName: `solo${i}c` } }
  }))
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  const row = panel.locator('.w-pc-table tbody tr:not(.w-pc-yours)').filter({ hasText: 'Corrupted' })
  await expect(row).toHaveCount(1)
  await expect(panel.locator('.w-pc-count-n')).toHaveCount(0)
  const tag = row.locator('.w-pc-tag')
  const before = await tag.boundingBox()
  await row.locator('.w-pc-price').hover()
  await expect(row.locator('.w-pc-travel-label')).toBeVisible()
  expect(await tag.boundingBox()).toEqual(before)
  const face = await row.locator('.w-pc-travel-face').boundingBox()
  expect(face!.x + face!.width).toBeLessThanOrEqual(before!.x)
  expect(overlay.errors).toEqual([])
})
