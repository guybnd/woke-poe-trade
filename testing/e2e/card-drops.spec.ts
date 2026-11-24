// Where divination cards drop (Divcord data): the card's maps in Ctrl+Space,
// a map's cards by price, and the line on the card's price check. Every map
// chip and card row has its tooltip (tip-audit gate).
import { test, expect } from './harness'
import type { Overlay } from './harness'

test.describe.configure({ mode: 'parallel' })

const SEARCH_KEY = 'Ctrl + Space'

async function openSearch (overlay: Overlay) {
  await overlay.page.setViewportSize({ width: 2560, height: 1440 })
  await overlay.boot()
  await overlay.showScreen('screens/map-real-01.png')
  const panel = overlay.widget('woke-search')
  const box = panel.getByRole('textbox', { name: 'Search', exact: true })
  // The key works once the palette has loaded and listens (its element is
  // there): pressed before, under load, the overlay opened with no palette.
  await panel.waitFor({ state: 'attached', timeout: 15_000 })
  await overlay.pressHotkey(SEARCH_KEY)
  // Prices are saved a moment after they load.
  await expect(async () => {
    await box.fill('the doctor', { timeout: 3000 })
    await expect(panel.getByRole('button', { name: /The Doctor/ }).first()).toBeVisible({ timeout: 500 })
  }).toPass({ timeout: 20_000 })
  return { panel, box }
}

test('a div card says which maps it drops in, and a map chip lists its cards', async ({ overlay }) => {
  const { panel } = await openSearch(overlay)
  await panel.getByRole('button', { name: /The Doctor/ }).first().click()
  const drops = panel.locator('[data-card-drops]')
  await expect(drops).toContainText('Drops in')
  await expect(drops).toContainText('Area level 75+ · 1 in 121k cards')
  const chip = drops.locator('[data-card-drop-map]', { hasText: 'Waste Pool' })
  await expect(chip).toContainText('T8')
  await expect(drops.locator('[data-card-drop-map]', { hasText: 'Burial Chambers' })).toBeVisible()
  // Likeliest map first, each with its share of that map's own cards.
  await expect(drops.locator('[data-card-drop-chance]').first()).toHaveText(/^1 in [\d,]+$/)
  await expect(drops).toContainText('how many of that map\'s own cards it takes')

  await chip.hover()
  const tip = overlay.page.getByRole('tooltip')
  await expect(tip).toContainText('Waste Pool Map')
  await expect(tip).toContainText('Divination cards here')
  await expect(tip).toContainText('The Doctor')
  await overlay.snap('card-drops-search')
})

test('a map name lists the cards that drop there, dearest first', async ({ overlay }) => {
  const { panel, box } = await openSearch(overlay)
  // The drop data loads a moment after the palette opens: type again until it's in.
  const result = panel.getByText(/^Burial Chambers: \d+ cards$/)
  await expect(async () => {
    await box.fill('burial chambers')
    await expect(result).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 20_000 })
  await result.click()
  await expect(panel.getByText('Cards in Burial Chambers (tier 6)')).toBeVisible()
  const doctor = panel.getByText('The Doctor', { exact: true })
  await expect(doctor).toBeVisible()
  // Each card's share of the map's own cards, and what one is worth on average.
  await expect(panel.getByText(/^1 in [\d,]+$/).first()).toBeVisible()
  await expect(panel.getByText(/per card from this map's list/)).toBeVisible()
  await doctor.hover()
  await expect(overlay.page.getByRole('tooltip')).toContainText('Headhunter')
  // The card's own tooltip ends with how rare it is.
  await expect(overlay.page.getByRole('tooltip')).toContainText('Rarity: 1 in 121k cards, by drop weight')
  await overlay.snap('card-drops-map')
})

test('the price check of a div card shows where it drops', async ({ overlay }) => {
  await overlay.boot()
  await overlay.copyItem('items/card-the-doctor.txt')
  const card = overlay.page.getByTestId('instant-ninja-card')
  const drops = card.locator('[data-card-drops]')
  await expect(drops).toContainText('Drops:')
  await expect(drops.locator('[data-card-drop-map]', { hasText: 'Waste Pool' })).toBeVisible()
  // How rare it is among all cards, by drop weight.
  await expect(drops.locator('[data-card-rarity]')).toHaveText('1 in 121k cards')
  await overlay.snap('card-drops-price-check')
})
