// The Expedition dock card on poe.ninja's real shape: the four currencies are
// type Artifact, and the vendor who speaks in this instance goes on top.
import fs from 'fs'
import { fileURLToPath } from 'url'
import { test, expect } from './harness'

const DENSE = fileURLToPath(new URL('../fixtures/http/poe.ninja/poe1/api/economy/current/dense/overviews.json', import.meta.url))
const FLAT = [0, 0, 0, 0, 0, 0]
const ARTIFACTS = JSON.stringify({
  type: 'Artifact',
  lines: [
    { name: 'Burial Medallion', chaos: 1, graph: [...FLAT, -64.49] },
    { name: 'Astragali', chaos: 0.07292, graph: [...FLAT, 31.25] },
    { name: 'Exotic Coinage', chaos: 7.2, graph: [...FLAT, 78.85] },
    { name: 'Scrap Metal', chaos: 2.94, graph: [...FLAT, 1018] }
  ]
})
// Its name is in the feed, so the chips would be drawn if they were still there.
const SCARAB = JSON.stringify({
  type: 'Scarab',
  lines: [{ name: 'Expedition Scarab of Archaeology', chaos: 0.93, graph: [...FLAT, 1] }]
})
const area = (id: string, seed = '666232010') => `2026/11/05 20:49:09 18884906 1186a8a3 [DEBUG Client 34092] Generating level 83 area "${id}" with seed ${seed}`
const TUJEN = '2026/11/05 20:49:11 18887484 cffb065b [INFO Client 34092] Tujen, the Haggler: Oi! Over here!'

// Under load the card or the prices can land after one hover or the default
// wait, so keep resting the mouse until the card is up.
const SLOW = { timeout: 20_000 }

test('Expedition card: prices, vendor here on top, no scarab chips or arrows', async ({ overlay }) => {
  const recorded = fs.readFileSync(DENSE, 'utf8')
  await overlay.page.route('**/dense/overviews*', (route) => route.fulfill({
    contentType: 'application/json',
    body: recorded.replace(/\[\s*\{"type":"/, () => `[${ARTIFACTS},${SCARAB},{"type":"`)
  }))
  await overlay.boot({ widgets: [{ wmType: 'woke-mechanics' }] })
  const icon = overlay.dockIcon('mechanics')

  // A logbook area: Expedition, but nobody has spoken yet.
  await overlay.log([area('ExpeditionBattlegroundGraves')])
  await expect(icon).toBeVisible(SLOW)
  const card = overlay.page.getByText('Refresh currency, each · week')
  await expect(async () => {
    await overlay.hoverDockIcon('mechanics')
    await expect(card).toBeVisible({ timeout: 2000 })
  }).toPass(SLOW)
  const body = overlay.page.locator('body')
  for (const name of ['Exotic Coinage', 'Scrap Metal', 'Burial Medallion', 'Astragali']) {
    await expect(body).toContainText(name, SLOW)
  }
  await expect(body).not.toContainText('has no prices')
  await expect(body).not.toContainText('Expedition: Archaeology')
  await expect(overlay.page.locator('[title="Next mechanic"]')).toHaveCount(0)
  await overlay.snap('expedition card, nobody has spoken')

  // Tujen speaks: their currency moves to the top.
  await overlay.log([TUJEN])
  await expect(overlay.page.getByText('Tujen is here')).toBeVisible(SLOW)
  await expect(overlay.page.getByText('Tujen is here').locator('..')).toContainText('Exotic Coinage')
  await expect(overlay.page.getByText('Others, each · week')).toBeVisible()
  // Astragali at 0.07c reads as how many a divine buys.
  await expect(body).toContainText('1/2,500')
  await overlay.snap('expedition card, Tujen here')

  // Through a portal to the hideout and back: still them.
  await overlay.moveMouse(1000, 900)
  await overlay.log([area('HideoutFelled', '1')])
  await expect(icon).toHaveCount(0, SLOW)
  await overlay.log([area('ExpeditionBattlegroundGraves')])
  await expect(icon).toBeVisible(SLOW)
  await expect(async () => {
    await overlay.hoverDockIcon('mechanics')
    await expect(overlay.page.getByText('Tujen is here')).toBeVisible({ timeout: 2000 })
  }).toPass(SLOW)

  // A new instance forgets them.
  await overlay.log([area('ExpeditionKaruiWargraves')])
  await expect(overlay.page.getByText('Tujen is here')).toHaveCount(0, SLOW)
})
