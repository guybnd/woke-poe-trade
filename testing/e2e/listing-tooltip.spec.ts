// Hovering a trade listing shows the item as the game does, with its tiers and rolls.
import { readFileSync } from 'fs'
import type { Page } from '@playwright/test'
import { test, expect } from './harness'

const LIMITS = { 'x-rate-limit-rules': 'Ip', 'x-rate-limit-ip': '100:1:0', 'x-rate-limit-ip-state': '1:1:0' }
// A fractured weapon, a crafted body armour and a unique.
const ITEMS: unknown[] = JSON.parse(readFileSync(new URL('../fixtures/trade/listing-tiers.json', import.meta.url), 'utf-8'))

async function fakeTrade (page: Page, items: unknown[] = ITEMS) {
  await page.route('**/api/trade/search/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({ id: 'q', total: items.length, result: items.map((_, i) => `r${i}`) })
  }))
  await page.route('**/api/trade/fetch/**', (route) => route.fulfill({
    contentType: 'application/json',
    headers: LIMITS,
    body: JSON.stringify({
      result: items.map((item, i) => ({
        id: `r${i}`,
        item,
        listing: {
          indexed: new Date().toISOString(),
          fee: 1,
          price: { amount: 30 + i, currency: 'chaos' },
          account: { name: `seller${i}`, lastCharacterName: `char${i}` }
        }
      }))
    })
  }))
}

test('a listing shows tiers, rolls and its numbers on hover', async ({ overlay }) => {
  await fakeTrade(overlay.page)
  await overlay.boot()
  await overlay.copyItem('items/rare-body-armour-es.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(panel.locator('.w-pc-foot')).toBeVisible()

  const tip = overlay.page.getByRole('tooltip')
  const rows = panel.locator('.w-pc-table tbody tr')

  await rows.nth(1).hover()
  await expect(tip).toContainText('Mind Thirst')
  await expect(tip).toContainText('Physical Damage: 158-304')
  await expect(tip).toContainText('Prefix "Chosen"')
  await expect(tip).toContainText('136(120-139)% increased Physical Damage')
  await expect(tip).toContainText('P1')
  await expect(tip).toContainText('84%')
  await expect(tip).toContainText('pDPS 411')
  await expect(tip).toContainText('at 20% quality')
  // The first tooltip grows as its mod groups load: it's placed again, so it
  // stays on screen (it ran off the bottom at 1080p).
  await expect.poll(async () => {
    const b = await tip.boundingBox()
    const vh = overlay.page.viewportSize()!.height
    return b != null && b.y >= 0 && b.y + b.height <= vh
  }).toBe(true)
  await overlay.snap('listing tooltip weapon')
  // Every line that rolls has an underline, filled to its roll.
  await expect(tip.locator('i i')).toHaveCount(5)

  await rows.nth(2).hover()
  await expect(tip).toContainText('Rage Guardian')
  await expect(tip).toContainText('Crafted "of Craft"')
  await expect(tip).toContainText('Energy Shield 255')
  await overlay.snap('listing tooltip armour')

  await rows.nth(3).hover()
  await expect(tip).toContainText('Starforge')
  await expect(tip).toContainText('405(400-450)% increased Physical Damage')
  await overlay.snap('listing tooltip unique')
})

// A rare Large Cluster Jewel, as the trade site lists it.
const notable = (name: string, tier: string) => ({ description: `1 Added Passive Skill is ${name}`, domain: 'explicit', mods: [{ name, tier, magnitudes: [] }] })
const CLUSTER = {
  w: 1, h: 1, league: 'Allflame', identified: true, ilvl: 84,
  name: 'Honour Prism', typeLine: 'Large Cluster Jewel', baseType: 'Large Cluster Jewel', rarity: 'Rare', frameType: 2,
  enchantMods: ['Adds 8 Passive Skills', '2 Added Passive Skills are Jewel Sockets', 'Added Small Passive Skills grant: 12% increased Attack Damage while Dual Wielding'],
  explicitMods: [notable('Insatiable Killer', 'P1'), notable('Combat Rhythm', 'P1'), notable('Heavy Hitter', 'S1')]
}

test('a cluster jewel listing says where each notable sits on hover', async ({ overlay }) => {
  await fakeTrade(overlay.page, [CLUSTER])
  await overlay.boot()
  await overlay.copyItem('items/rare-cluster-large.txt')
  const panel = overlay.widget('price-check')
  await panel.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(panel.locator('.w-pc-foot')).toBeVisible()

  const tip = overlay.page.getByRole('tooltip')
  await panel.locator('.w-pc-table tbody tr').last().hover()
  await expect(tip).toContainText('Honour Prism')
  const line = (name: string) => tip.locator('div', { hasText: `1 Added Passive Skill is ${name}` }).last().locator('[data-cluster-spot]')
  await expect(line('Combat Rhythm')).toHaveText('front · 2 pts')
  await expect(line('Heavy Hitter')).toHaveText('front · 2 pts')
  await expect(line('Insatiable Killer')).toHaveText('back · 5 pts')
  await expect(tip.locator('[data-cluster-spot]')).toHaveCount(3)
  await overlay.snap('listing tooltip cluster spots')
})

// The price check's Size (root font size) grows all of that window, its px
// text too, and the tooltips its rows open: at 125% they're 125% of 100%'s.
// At 1440p, where panels are zoomed, the tooltip still takes the window's size
// and stays on screen.
for (const at of [null, { width: 2560, height: 1440 }] as const) {
  test(`the price check's Size grows its text and its tooltips${at ? ' at 1440p' : ''}`, async ({ overlay }) => {
    if (at) await overlay.page.setViewportSize(at)
    await fakeTrade(overlay.page)
    await overlay.boot({ patch: (c: { fontSize: number }) => { c.fontSize = 20 } })
    await overlay.copyItem('items/rare-body-armour-es.txt')
    const panel = overlay.widget('price-check')
    await panel.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(panel.locator('.w-pc-foot')).toBeVisible()
    const rows = panel.locator('.w-pc-table tbody tr')
    // A listing's first cell is 13px (--w-fs-md) at 100%.
    expect(await rows.nth(1).locator('td').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(13 * 1.25, 2)
    await rows.nth(1).hover()
    const tip = overlay.page.getByRole('tooltip')
    await expect(tip).toContainText('Mind Thirst')
    const panelZoom = await overlay.page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-ui-scale')))
    if (at) expect(panelZoom).toBeGreaterThan(1.2)
    // The price check's own zoom is UI size (100% here), not Panel size.
    expect(await tip.evaluate(el => (el as HTMLElement & { currentCSSZoom: number }).currentCSSZoom)).toBeCloseTo(1.25, 3)
    await expect.poll(async () => {
      const b = await tip.boundingBox()
      const vp = overlay.page.viewportSize()!
      return b != null && b.x >= 0 && b.y >= 0 && b.x + b.width <= vp.width && b.y + b.height <= vp.height
    }).toBe(true)
  })
}
